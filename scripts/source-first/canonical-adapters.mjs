import { commands, groupAt, extractNativeElements } from './tex.mjs';
import { sourceFormulaToLatex } from '../latex-pilot/parser.mjs';
import { canonicalRecord, parseRichText, mathNode } from '../../assets/js/components/canonical-math.js';
import { digest } from './model.mjs';

export function adaptPdfCorrection(correction, sourceBytes, fieldName) {
  if (digest(sourceBytes) !== correction.sourceHash || !correction.sourceDocumentId || !correction.evidenceHash || !correction.regions?.length) throw new Error('Missing or stale PDF correction evidence');
  const fields = correction.fields.filter((field) => field.field === fieldName);
  if (fields.length !== 1) throw new Error('Ambiguous correction field');
  const field = fields[0];
  return canonicalRecord({ id: `${correction.recordId}:${fieldName}`, recordId: correction.recordId, fieldId: fieldName,
    sourceId: correction.sourceDocumentId, sourceHash: correction.sourceHash, location: correction.regions,
    original: field.before, proposedText: field.after, evidenceReference: `scripts/source-first/corrections-v56.json#${correction.id}`,
    evidenceHash: correction.evidenceHash, conversionOrigin: 'source-backed-pdf-correction-registry',
    integrationStatus: 'prepared-not-applied', sourceVerified: false, content: parseRichText(field.after) });
}

export function readMathMacros(source) {
  const macros = {}, unsupported = [];
  for (const call of commands(source, 'newcommand')) {
    const name = call.args[0]?.value;
    if (!/^\\[A-Za-z]+$/u.test(name ?? '')) continue;
    let cursor = call.args[0].end;
    while (/\s/u.test(source[cursor] ?? '')) cursor++;
    const parameter = source.slice(cursor).match(/^\[([0-3])\]/u);
    const args = parameter ? Number(parameter[1]) : 0;
    if (parameter) cursor += parameter[0].length;
    while (/\s/u.test(source[cursor] ?? '')) cursor++;
    try {
      const body = groupAt(source, cursor).value;
      if (/\\(?:begin|end|document|section|subsection|addcontentsline|phantomsection|color|input|include|def|write)\b/u.test(body)) unsupported.push({ name, reason: 'Document/layout macro, not a mathematical macro' });
      else if (Object.hasOwn(macros, name)) unsupported.push({ name, reason: 'Duplicate macro' });
      else macros[name] = { args, body };
    } catch (error) { unsupported.push({ name, reason: error.message }); }
  }
  return { macros, unsupported };
}

export function adaptTex(source, identity) {
  const { macros, unsupported } = readMathMacros(source);
  const elements = extractNativeElements(source);
  const records = elements.map((element) => {
    let content = parseRichText(element.rawSource, { macros, sourceId: identity.sourceId });
    let origin = 'native-explicit-math';
    // Existing source dialect uses textbf/textsubscript instead of math delimiters.
    // Reuse its parser, but retain its candidate status (not source approval).
    if (element.environment === 'formulabox' && !content.segments.some((node) => node.type === 'math')) {
      const bold = commands(element.rawSource, 'textbf')[0]?.args[0];
      if (bold) {
        const original = bold.value;
        const node = mathNode(sourceFormulaToLatex(original), true, { macros });
        content = { type: 'rich-text', segments: [
          { type: 'text', value: element.rawSource.slice(0, bold.start + 1) }, node,
          { type: 'text', value: element.rawSource.slice(bold.end - 1) }
        ] };
        origin = 'existing-native-dialect-candidate';
      }
    }
    return canonicalRecord({ id: element.id, ...identity, location: element.location,
      topicId: element.topicId, sectionId: element.sectionId, kind: element.kind,
      original: element.rawSource, conversionOrigin: origin, sourceVerified: false,
      integrationStatus: ['CD20', 'CD21', 'CD23'].includes(element.topicId) ? 'IMPORT_BLOCKED' : 'preview-only', content });
  });
  // Generic native documents need not use BienEdu's custom topic environment.
  const documentStart = commands(source, 'begin').find((call) => call.args[0]?.value === 'document');
  const documentEnd = commands(source, 'end').find((call) => call.args[0]?.value === 'document');
  const start = documentStart?.end ?? 0, end = documentEnd?.start ?? source.length;
  if (!records.length) records.push(canonicalRecord({ id: 'document-body', ...identity,
    location: { offsets: [start, end], lines: [source.slice(0, start).split('\n').length, source.slice(0, end).split('\n').length] }, original: source.slice(start, end),
    conversionOrigin: 'native-explicit-math', integrationStatus: 'preview-only',
    content: parseRichText(source.slice(start, end), { macros, sourceId: identity.sourceId }) }));
  return { records, macros, unsupportedMacros: unsupported };
}

export function adaptPdfBlock(block, identity, { id, verifiedMath = null, evidence = null } = {}) {
  // Delimiters in a PDF text layer are not evidence that fraction/root structure
  // survived extraction. Only explicit, hash-bound correction evidence is eligible.
  const sourceMatched = evidence?.sourceHash === identity.sourceHash && evidence?.sourceId === identity.sourceId
    && evidence?.original === block.text && evidence?.latex === verifiedMath && evidence?.location
    && JSON.stringify(evidence.location) === JSON.stringify(block.location);
  const content = sourceMatched ? mathNode(verifiedMath, Boolean(evidence.display))
    : { type: 'unresolved', original: block.text, reason: 'PDF mathematical structure requires source evidence' };
  return canonicalRecord({ id, ...identity, location: block.location, original: block.text,
    conversionOrigin: sourceMatched ? 'existing-source-evidence' : 'pdf-text-layer',
    evidenceReference: sourceMatched ? evidence.reference : null, sourceVerified: false,
    integrationStatus: sourceMatched ? 'preview-only' : 'SOURCE_AMBIGUOUS', content });
}

export function adaptLegacyField(value, { recordId, fieldId, sourceId, sourceHash, location }) {
  return canonicalRecord({ id: `${recordId}:${fieldId}`, sourceId, sourceHash, location,
    recordId, fieldId, original: value, conversionOrigin: 'legacy-explicit-delimiters',
    integrationStatus: 'LEGACY_SUPPORTED', sourceVerified: false, content: parseRichText(value) });
}
