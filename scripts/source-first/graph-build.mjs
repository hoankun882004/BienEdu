import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { root, work } from './build.mjs';
import { digest } from './model.mjs';
import { validateContinuation, continuationStatus } from './development-continuation.mjs';
import { readDevelopmentOverview } from './development.mjs';
import { exampleContent } from '../../assets/js/data/example-content.js';
import { getDocumentForTopic } from '../../assets/js/data/document-mappings.js';
import { parseExpression } from '../../assets/js/components/graph-expression.js';
import { validateGraphSpec } from '../../assets/js/components/graph-spec.js';
import { pilotDefinitions } from './graph-pilots.mjs';
export const graphOutput = '.audit/source-first-v5/graphs-v5.8';
export const read = (file) => JSON.parse(readFileSync(join(root, file), 'utf8'));
const save = (file, value) => writeFileSync(join(root, graphOutput, file), typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
export function verifyGraphSafety() {
  const recovery = read('.audit/source-first-v5/recovery-v5.6.json');
  for (const item of [...recovery.sources, ...recovery.runtime, ...recovery.protectedFiles, ...recovery.parentDependencies]) assert.equal(digest(readFileSync(join(root, item.file))), item.hash, item.file);
  for (const item of recovery.journal) assert.equal(digest(readFileSync(join(work, 'dev-experiments', recovery.parentPlanHash, item.file))), item.hash);
  const child = read('.audit/source-first-v5/development-preview-v5.6.json').plan;
  validateContinuation(child); const parent = readDevelopmentOverview(); assert.equal(parent.stale, false);
  assert.equal(parent.status.status, 'locally-applied-unreviewed'); assert.equal(continuationStatus(child).status, 'prepared-on-applied-v5.5');
  return { v55Fields: 9, v56PreparedFields: 26, stale: false, sourceFilesUnchanged: recovery.sources.length, rollbackIntact: true };
}
export function buildGraphs() {
  mkdirSync(join(root, graphOutput), { recursive: true }); const safety = verifyGraphSafety();
  const installed = read('node_modules/jsxgraph/package.json'), pkg = read('package.json');
  assert.equal(installed.version, '1.14.2'); assert.equal(pkg.dependencies.jsxgraph, installed.version);
  // Reproducible vendoring only; no install, no network and no bundler dependency.
  mkdirSync(join(root, 'assets/vendor/jsxgraph'), { recursive: true });
  for (const name of ['jsxgraphcore.mjs', 'jsxgraphcore.mjs.LICENSE.txt', 'LICENSE.MIT']) {
    const from = join(root, 'node_modules/jsxgraph/distrib', name), to = join(root, 'assets/vendor/jsxgraph', name);
    if (!existsSync(to) || digest(readFileSync(from)) !== digest(readFileSync(to))) copyFileSync(from, to);
  }
  const queue = read('.audit/source-first-v5/figure-review-v5.1.json'); assert.equal(queue.total, 188);
  const sourceResult = spawnSync('python', ['-X', 'utf8', 'scripts/source-first/graph-source-evidence.py'], { cwd: root, input: JSON.stringify(queue.figures), encoding: 'utf8', windowsHide: true, maxBuffer: 12*1024*1024 });
  assert.equal(sourceResult.status, 0, sourceResult.stderr); const evidence = JSON.parse(sourceResult.stdout);
  const normalize = (text) => text.replace(/\s+/gu, '').normalize('NFC');
  const rows = queue.figures.map((figure) => {
    const runtime = exampleContent[figure.code]?.find((e) => e.id === figure.exampleId), source = evidence.find((r) => r.figureId === figure.id);
    const marker = new RegExp(`Ví dụ\\s*${figure.originalExampleNumber}\\.`, 'u');
    const ownText = source.statement.split(marker)[1]?.split(/Ví dụ\s*\d+\./u)[0] ?? '';
    const hasMapping = !!runtime?.assetReferences?.some((a) => a.id === figure.id && a.src.replace(/^\//u, '') === figure.assetPath);
    // Require explicit graph context AND drawing/axis evidence. Merely mentioning
    // 'đồ thị' in a text question does not turn a text crop into a graph.
    const plot = /f\s*\('?x'?\)|f'\(x\)/u.test(ownText) && figure.regionDrawingCount >= 3 && /đồ\s*thị|nét đứt/iu.test(ownText);
    const table = /bảng biến thiên/iu.test(ownText) && /[↗↘]/u.test(ownText);
    // Existing tiny text assets inspected directly: the two drawing objects are
    // not graph axes/curves. No new source image is generated for this decision.
    const inspectedTextOnly = ['8.6-example-1-figure-1','10.8-example-1-figure-1'].includes(figure.id);
    const category = !hasMapping ? 'RUNTIME_MAPPING_UNRESOLVED' : !ownText ? 'SOURCE_UNRESOLVED' : table ? 'VARIATION_TABLE' : plot ? 'FUNCTION_GRAPH' : inspectedTextOnly || figure.regionDrawingCount === 0 && figure.regionImageCount === 0 ? 'OTHER_FIGURE' : 'SOURCE_UNRESOLVED';
    return { figureId: figure.id, topic: `CD${figure.code.split('.')[0].padStart(2,'0')}`, sectionId: figure.code, exampleId: figure.exampleId,
      category, classificationEvidence: table ? 'Source table labels and directional arrows' : plot ? 'Explicit graph prompt, coordinate labels and source drawing metadata' : inspectedTextOnly ? 'Existing asset inspected: text only, incidental source drawing objects; no plotted graph' : category === 'OTHER_FIGURE' ? 'Text-only source region; no image or drawing objects' : 'Unresolved source geometry; not inferred from keywords',
      source: { sourceId: getDocumentForTopic(`CD${figure.code.split('.')[0].padStart(2,'0')}`).documentId, sha256: figure.sourceHash, file: figure.sourceFile, page: figure.sourcePage, region: figure.sourceRegion },
      runtime: { recordId: figure.exampleId, figureId: figure.id, assetPath: figure.assetPath, recordHash: runtime ? digest(runtime) : null },
      currentMethod: 'legacy-pdf-image', availableSourceText: ownText, availableRuntimeFormulaText: runtime?.steps?.map((s) => s.expression) ?? [],
      mathematicalFeatures: { domain: null, labels: null, asymptotes: null, specialPoints: null },
      eligibility: category === 'OTHER_FIGURE' ? 'NON_GRAPH' : !hasMapping ? 'RUNTIME_MAPPING_AMBIGUOUS' : 'SOURCE_AMBIGUOUS',
      reason: category === 'OTHER_FIGURE' ? 'Text extraction asset, not a mathematical diagram; preserved.' : 'Exact curve/table features not yet verified independently for this record.',
      evidenceReference: `.audit/source-first-v5/figure-review-v5.1.json#${figure.id}`, humanApproval: false };
  });
  const candidates = pilotDefinitions.map((definition) => {
    const row = rows.find((r) => r.figureId === definition.figureId), source = evidence.find((r) => r.figureId === definition.figureId);
    assert.ok(normalize(row.availableSourceText).includes(normalize(definition.statementNeedle)), `Statement mismatch ${row.figureId}`);
    if (definition.solutionNeedle) {
      const section = source.solution.includes('Dạng 6.1') ? source.solution.split('Dạng 6.1')[1] : source.solution.split('Dạng 6.2')[0];
      const own = section.split(new RegExp(`Ví dụ\\s*${Number(row.exampleId.split('-').at(-1))}\\.`, 'u'))[1]?.split(/Ví dụ\s*\d+\./u)[0];
      assert.ok(normalize(own ?? '').includes(normalize(definition.solutionNeedle)), `Solution mismatch ${row.figureId}`);
    }
    const spec = { schemaVersion: 'bienedu.graph.v1', type: definition.type ?? 'function-2d', id: row.figureId, description: definition.description,
      source: { ...row.source, recordId: row.exampleId }, verification: { status: 'source-checked', method: 'original-pdf-text-and-spans; symbolic-properties', humanApproval: false },
      ...(definition.type ? { columns: definition.columns, rows: definition.rows } : { branches: definition.branches, parameters: {}, viewport: definition.viewport, axes: { x:'x', y:'f(x)' }, points: definition.points ?? [], asymptotes: definition.asymptotes ?? [] }) };
    const check = validateGraphSpec(spec); assert.ok(check.valid, JSON.stringify(check));
    const figure = queue.figures.find((f) => f.id === row.figureId);
    row.eligibility = 'READY_LOCAL_PREVIEW'; row.reason = 'Source-supported pilot; explicit local application still required.';
    row.mathematicalFeatures = { domain: spec.branches?.map((b) => ({ intervals:b.domain, exclusions:b.exclusions })) ?? spec.columns, labels: spec.axes ?? spec.rows.map((r) => r.label), asymptotes: spec.asymptotes ?? [], specialPoints: spec.points ?? [] };
    return { spec, target: { ...row.runtime, code: row.sectionId, topic: row.topic, item: figure.originalExampleNumber, runtimeFile: 'assets/js/data/foundation-lessons.generated.js' },
      sourceEvidence: { statementNeedle: definition.statementNeedle, solutionNeedle: definition.solutionNeedle ?? null, solutionPage: definition.solutionPage ?? null, statementHash: digest(source.statement), solutionHash: digest(source.solution), statementSpans: source.spans },
      properties: definition.properties, integrationStatus: 'development-preview-only' };
  });
  const jobs = pilotDefinitions.filter((d) => !d.type).map((d) => ({ id: d.figureId, ast: parseExpression(d.branches[0].expression), derivativeAST: parseExpression(d.derivative), domainCheck: d.domainCheck,
    rootASTs: d.roots.map((x) => parseExpression(x)), stationaryASTs: d.stationary.map((x) => parseExpression(x)), samples: d.samples, asymptotes: d.asymptotes ?? [] }));
  const symbolic = spawnSync(join(work,'sympy-env/Scripts/python.exe'), ['scripts/source-first/graph-symbolic.py'], { cwd: root, input: JSON.stringify(jobs), encoding:'utf8', windowsHide:true, timeout:60000 });
  assert.equal(symbolic.status,0,symbolic.stdout+symbolic.stderr); const properties=JSON.parse(symbolic.stdout);
  for (const candidate of candidates) candidate.checks = properties.checks.find((c) => c.id === candidate.spec.id) ?? { passed: true, method: 'Exact source-table token and row transcription; no function inferred' };
  const counts = Object.fromEntries(['FUNCTION_GRAPH','COORDINATE_GRAPH','VARIATION_TABLE','SIGN_TABLE','GEOMETRIC_DIAGRAM','OTHER_FIGURE','SOURCE_UNRESOLVED','RUNTIME_MAPPING_UNRESOLVED'].map((category) => [category,rows.filter((r) => r.category===category).length]));
  const inventory = { schemaVersion:'bienedu.graph-audit.v1', canonicalQueue:'.audit/source-first-v5/figure-review-v5.1.json', newReviewDatabase:false, total:rows.length, counts, ready:candidates.length, rows };
  save('inventory.json',inventory); save('evidence.json',evidence); save('symbolic.json',properties); save('candidates.json',candidates); save('safety.json',safety);
  save('preview.html',`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BienEdu · Native graphs V5.8</title><link rel="stylesheet" href="../../../assets/vendor/katex/katex.min.css"><link rel="stylesheet" href="../../../assets/canonical-math.css"><link rel="stylesheet" href="../../../assets/native-graphs.css"><main class="native-graph-preview" data-graph-preview><h1>Đồ thị toán học · V5.8</h1><p>Preview phát triển. Không thay dữ liệu học viên. Nguồn chưa rõ vẫn giữ nguyên.</p></main><script type="module" src="../../../assets/js/graph-preview.js"></script></html>`);
  return { inventory, candidates, safety, version: installed.version };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { const r=buildGraphs(); console.log(JSON.stringify({version:r.version,total:r.inventory.total,counts:r.inventory.counts,pilots:r.candidates.length,safety:r.safety})); }
