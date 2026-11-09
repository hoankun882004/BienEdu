import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { digest } from './model.mjs';
import { documentSources, nativeDocumentSources } from '../../assets/js/data/document-mappings.js';
import { knowledgeContent } from '../../assets/js/data/knowledge-content.js';
import { exampleContent } from '../../assets/js/data/example-content.js';
import { adaptTex, adaptPdfBlock, adaptLegacyField, adaptPdfCorrection } from './canonical-adapters.mjs';
import { commands } from './tex.mjs';
import { serializeCanonical } from '../../assets/js/components/canonical-math.js';
import { mathContentMarkup } from '../../assets/js/components/canonical-math-renderer.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file) => readFileSync(join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));
const output = '.audit/source-first-v5/canonical-v5.7';
const save = (file, value) => writeFileSync(join(root, output, file), typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export function buildCanonical() {
  mkdirSync(join(root, output), { recursive: true });
  // Projection of the existing registry, not a new source/review database.
  const checkpoint = json('.audit/source-first-v5/checkpoint.json');
  const physical = checkpoint.physicalSources.filter((source) => !source.file.startsWith('assets/'));
  const sources = physical.map((source) => {
    const mapped = [...documentSources, ...nativeDocumentSources].find((entry) => entry.sourceSha256 === source.sha256);
    if (!mapped || digest(readFileSync(join(root, source.file))) !== source.sha256) throw new Error(`Unmapped/stale source ${source.file}`);
    return { sourceId: mapped.id, path: source.file, sourceType: source.kind, sha256: source.sha256,
      registryReference: `assets/js/data/document-mappings.js#${mapped.id}`, runtimePath: mapped.filePath ?? null };
  });
  const extracted = spawnSync('python', ['-X', 'utf8', join(root, 'scripts/source-first/canonical-pdf.py')], {
    input: JSON.stringify(sources.filter((source) => source.sourceType === 'pdf')), encoding: 'utf8', windowsHide: true, timeout: 60000, maxBuffer: 40 * 1024 * 1024 });
  if (extracted.status !== 0) throw new Error(extracted.stderr || extracted.error?.message);
  const pdfs = JSON.parse(extracted.stdout), records = [], inventory = [];
  for (const source of sources) {
    const identity = { sourceId: source.sourceId, sourceHash: source.sha256 };
    if (source.sourceType === 'tex') {
      const text = read(source.path), adapted = adaptTex(text, identity);
      records.push(...adapted.records);
      const sections = commands(text, 'topic').filter((call) => /^\d+\.\d+$/u.test(call.args[0]?.value ?? '')).map((call) => ({ sectionId: call.args[0].value, title: call.args[1]?.value, offset: call.start }));
      inventory.push({ ...source, sections, topics: [...new Set(sections.map((section) => `CD${section.sectionId.split('.')[0].padStart(2, '0')}`))],
        examples: adapted.records.filter((entry) => entry.kind === 'example').map((entry) => ({ id: entry.id, location: entry.location })),
        exercises: adapted.records.filter((entry) => entry.kind === 'exercise').map((entry) => entry.id),
        solutions: adapted.records.filter((entry) => entry.kind === 'solution').map((entry) => entry.id),
        unsupportedMacros: adapted.unsupportedMacros, limitation: 'Custom prose/layout retained as source context. Native dialect math is a candidate, not human approval.' });
    } else {
      const document = pdfs.find((entry) => entry.sourceId === source.sourceId);
      const sections = [...new Map(document.headings.map((heading) => [heading.sectionId, heading])).values()];
      inventory.push({ ...source, pageCount: document.pageCount, sections,
        topics: [...new Set(sections.map((section) => `CD${section.sectionId.split('.')[0].padStart(2, '0')}`))],
        examples: document.examples, exercises: document.exercises, solutions: document.solutions, limitation: document.limitation });
      for (const [index, block] of document.blocks.entries()) records.push(adaptPdfBlock({ text: block.text,
        location: { page: block.page, bbox: [block.x0, block.y0, block.x1, block.y1] } }, identity, { id: `block:${index}` }));
    }
  }
  const parent = json('.audit/source-first-v5/development-preview-v5.5.json').plan;
  const child = json('.audit/source-first-v5/development-preview-v5.6.json').plan;
  const corrections = json('scripts/source-first/corrections-v56.json').corrections;
  const pilots = parent.files.flatMap((file) => file.changes.map((change) => adaptLegacyField(change.after, {
    recordId: change.recordId, fieldId: change.fieldId, sourceId: change.source.documentId, sourceHash: change.source.sha256, location: change.source.location }))).concat(
    corrections.flatMap((correction) => correction.fields.map((field) => adaptPdfCorrection(correction, readFileSync(join(root, correction.sourceFile)), field.field))));
  const topics = Array.from({ length: 39 }, (_, index) => {
    const number = index + 1, topicId = `CD${String(number).padStart(2, '0')}`;
    const sourceIds = inventory.filter((entry) => entry.topics.includes(topicId)).map((entry) => entry.sourceId);
    const knowledge = Object.keys(knowledgeContent).filter((code) => code.startsWith(`${number}.`));
    const examples = Object.entries(exampleContent).filter(([code]) => code.startsWith(`${number}.`));
    return { topicId, sourceIds, knowledgeSections: knowledge.length, examples: examples.reduce((total, [, list]) => total + list.length, 0),
      status: topicId === 'CD23' ? 'IMPORT_BLOCKED' : !sourceIds.length ? 'SOURCE_MISSING' : knowledge.length || examples.length ? 'LEGACY_SUPPORTED' : 'PARTIALLY_COMPATIBLE',
      protected: ['CD20', 'CD21'].includes(topicId), publicationChanged: false };
  });
  const overlaps = inventory.flatMap((source, index) => inventory.slice(index + 1).flatMap((other) => {
    const sections = source.sections.map((entry) => entry.sectionId).filter((code) => other.sections.some((entry) => entry.sectionId === code));
    return sections.length ? [{ sourceIds: [source.sourceId, other.sourceId], sections, relationship: 'nominal-overlap-only', merged: false }] : [];
  }));
  const countMath = (record) => (record.content.segments ?? [record.content]).filter((node) => node.type === 'math').length;
  const report = { schemaVersion: 'bienedu.canonical-integration.v5.7', sourceRegistry: 'existing source-first registry projection', inventory, overlaps, topics,
    recordCount: records.length, mathNodes: records.reduce((sum, record) => sum + countMath(record), 0), pilotFields: pilots.length,
    unresolvedNodes: records.reduce((sum, record) => sum + (record.content.segments ?? [record.content]).filter((node) => node.type === 'unresolved').length, 0),
    previousPlans: { v55: parent.planHash, v56: child.planHash, v56Runtime: child.files.map((file) => ({ file: file.file, state: digest(readFileSync(join(root, file.file))) === file.beforeHash ? 'before' : 'other' })) },
    publication: 'none', runtimeDataWrites: 0 };
  save('inventory.json', report); save('records.json', records); save('pilots.json', pilots);
  save('serialization.sha256', digest(serializeCanonical({ records, pilots })) + '\n');
  const previewRecords = [...pilots, ...records.filter((entry) => entry.sourceId.includes('native')).slice(0, 8), ...records.filter((entry) => entry.content.type === 'unresolved').slice(0, 4)];
  save('preview.html', `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Canonical Math v1 — preview</title><link rel="stylesheet" href="../../../assets/vendor/katex/katex.min.css"><link rel="stylesheet" href="../../../assets/canonical-math.css"><style>body{font-family:system-ui;margin:24px;color:#142039;background:#f5f7fa}main{max-width:1000px;margin:auto}article{padding:20px;margin:16px 0;background:white;border:1px solid #ccd5e0;min-width:0}pre{white-space:pre-wrap;overflow-wrap:anywhere}small{overflow-wrap:anywhere}.math-render-error{color:#774900} .math-markdown__display{overflow:auto}</style><main><h1>Canonical Math Format v1</h1><p>Preview only. Source fidelity and human mathematical approval are separate from rendering.</p>${previewRecords.map((entry) => `<article><h2>${escape(entry.legacyId)}</h2><small>${escape(entry.sourceId)} · ${escape(entry.sourceHash)} · ${escape(JSON.stringify(entry.location))}</small><h3>Original / existing representation</h3><pre>${escape(entry.original)}</pre><h3>Canonical</h3><pre>${escape(JSON.stringify(entry.content, null, 2))}</pre><h3>KaTeX</h3>${mathContentMarkup(entry.content)}<p>${escape(entry.integrationStatus)} · sourceVerified: false</p></article>`).join('')}</main></html>`);
  console.log(JSON.stringify({ sources: inventory.map((entry) => ({ id: entry.sourceId, topics: entry.topics, sections: entry.sections.length })), records: records.length, pilotFields: pilots.length, mathNodes: report.mathNodes, unresolved: report.unresolvedNodes }));
  return report;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) buildCanonical();
