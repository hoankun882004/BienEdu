import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { normalizeMath, validateMath, parseRichText, canonicalRecord, serializeCanonical, validateContent } from '../assets/js/components/canonical-math.js';
import { mathContentMarkup } from '../assets/js/components/canonical-math-renderer.js';
import { adaptTex, adaptPdfBlock, adaptLegacyField } from '../scripts/source-first/canonical-adapters.mjs';
import { digest } from '../scripts/source-first/model.mjs';
import { continuationStatus, validateContinuation } from '../scripts/source-first/development-continuation.mjs';

const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
const identity = { sourceId: 'independent-source', sourceHash: 'A'.repeat(64) };
const positive = [String.raw`\frac{x}{x^2-1}`, String.raw`\frac{1}{\frac{2}{3}}`, 'x^{-3/2}', String.raw`\sqrt{x^2+1}`,
  String.raw`\sqrt[3]{x}`, String.raw`\log_2 x`, String.raw`f'(2)=-\frac{5}{9}`, String.raw`\int_a^b f(x)\,dx`,
  String.raw`\lim_{x\to0}\frac{\sin x}{x}`, String.raw`x\ne\pm1`, String.raw`D=(-\infty;\frac{3}{2}]`,
  String.raw`\begin{cases}x&x>0\\-x&x\le0\end{cases}`, String.raw`\begin{aligned}a&=b\\c&=d\end{aligned}`,
  String.raw`\left|x\right|`, String.raw`\binom{n}{k}`, String.raw`P(A\mid B)=\frac{P(A\cap B)}{P(B)},\quad P(B)>0`];
for (const latex of positive) test(`canonical math preserves ${latex}`, () => {
  assert.equal(validateMath(latex).valid, true);
  assert.equal(normalizeMath(normalizeMath(latex)), latex);
  assert.match(mathContentMarkup({ type: 'math', latex, display: false }), /<math/);
});

test('invalid expressions fail visibly without untrusted HTML injection', () => {
  for (const latex of [String.raw`\intP`, String.raw`\frac{x}{}`, String.raw`\frac{\sqrt{x}}{}`, String.raw`\frac{x}`,
    String.raw`\sqrt{}`, String.raw`\sqrt[]{x}`, String.raw`\unknown x`, '{x', '$x$', String.raw`\href{javascript:alert(1)}{x}`, String.raw`\def\a{\a}\a`]) {
    assert.equal(validateMath(latex).valid, false, latex);
  }
  assert.equal(validateContent({ type: 'rich-text', segments: [{ type: 'html', value: '<img>' }] }).valid, false);
  const html = mathContentMarkup(parseRichText('<img src=x onerror=alert(1)> \\(\\intP\\)'));
  assert.ok(!html.includes('<img')); assert.match(html, /math-render-error/);
});

test('mixed Vietnamese math boundaries, environments and malformed delimiters', () => {
  const content = parseRichText(String.raw`Cho \(f(x)=\frac{x}{x^2-1}\), với $x\ne\pm1$. \[y'=1\]`);
  assert.equal(content.segments.filter((node) => node.type === 'math').length, 3);
  assert.equal(content.segments.at(-1).display, true);
  for (const input of [String.raw`x \(y`, String.raw`x \) y`, '$x']) assert.ok(parseRichText(input).segments.some((node) => node.type === 'unresolved'));
  for (const env of ['equation', 'equation*', 'align', 'align*', 'gather', 'gather*']) {
    assert.equal(parseRichText(`\\begin{${env}}x=1\\end{${env}}`).segments[0].type, 'math');
  }
  assert.equal(parseRichText(String.raw`Giá \$5`).segments.length, 1);
});

test('bounded explicit native macros; unsupported document commands remain separate', () => {
  const text = String.raw`\newcommand{\RR}{\mathbb{R}}
\newcommand{\sq}[1]{#1^{2}}
\begin{document}Cho $x\in\RR$, $\sq{x}$.\end{document}`;
  const adapted = adaptTex(text, identity);
  assert.ok(adapted.records[0].content.segments.some((node) => node.latex === String.raw`x\in\mathbb{R}`));
  assert.ok(adapted.records[0].content.segments.some((node) => node.latex === 'x^{2}'));
  assert.equal(validateMath('\\loop', { macros: { '\\loop': { args: 0, body: '\\loop' } } }).valid, false);
  assert.equal(validateMath('\\unknown').valid, false);
});

test('independent identities and deterministic serialization; no cross-source repair', () => {
  const block = { text: 'f(x)=x x2-1', location: { page: 1, bbox: [0, 0, 100, 100] } };
  const pdf = adaptPdfBlock(block, identity, { id: '20.1' });
  assert.equal(pdf.content.type, 'unresolved'); assert.equal(pdf.content.original, block.text);
  const other = adaptPdfBlock(block, { ...identity, sourceId: 'different-pdf' }, { id: '20.1' });
  assert.notEqual(pdf.id, other.id);
  assert.equal(serializeCanonical(JSON.parse(serializeCanonical(pdf))), serializeCanonical(pdf));
  assert.throws(() => canonicalRecord({ id: 'missing', content: { type: 'text', value: 'x' } }), /source/);
  const forged = adaptPdfBlock(block, identity, { id: '20.1', verifiedMath: 'x', evidence: { sourceHash: 'B'.repeat(64) } });
  assert.equal(forged.content.type, 'unresolved');
});

test('V5.5 nine applied fields and V5.6 26 prepared fields retain exact math and conditions', () => {
  const parent = read('.audit/source-first-v5/development-preview-v5.5.json').plan;
  const child = read('.audit/source-first-v5/development-preview-v5.6.json').plan;
  const fields = parent.files.flatMap((file) => file.changes).concat(child.files.flatMap((file) => file.changes));
  assert.equal(fields.length, 35);
  for (const field of fields) {
    const record = adaptLegacyField(field.after, { ...identity, recordId: field.recordId, fieldId: field.fieldId, location: { page: 1 } });
    assert.equal(record.recordId, field.recordId); assert.equal(record.original, field.after);
    assert.ok(!record.content.segments.some((node) => node.type === 'unresolved'), field.fieldId);
  }
  for (const entry of parent.files) assert.equal(digest(readFileSync(entry.file)), entry.afterHash);
  for (const entry of [...child.dependencies, ...child.sources]) assert.equal(digest(readFileSync(entry.file)), entry.hash);
  assert.equal(continuationStatus(child).status, 'prepared-on-applied-v5.5');
  validateContinuation(child);
});

test('inventory keeps five independent sources and 39 honest topic statuses', () => {
  const report = read('.audit/source-first-v5/canonical-v5.7/inventory.json');
  assert.equal(report.inventory.length, 5); assert.equal(report.topics.length, 39);
  assert.deepEqual(report.inventory.find((entry) => entry.sourceId === 'cd12-cd14-calculus').topics, ['CD12', 'CD13', 'CD14']);
  assert.deepEqual(report.inventory.find((entry) => entry.sourceId === 'cd20-cd21-theory').topics, ['CD20', 'CD21']);
  assert.deepEqual(report.inventory.find((entry) => entry.sourceType === 'tex').topics, ['CD20', 'CD21', 'CD22', 'CD23']);
  assert.equal(report.topics.filter((entry) => entry.status === 'SOURCE_MISSING').length, 21);
  assert.equal(report.topics.find((entry) => entry.topicId === 'CD23').status, 'IMPORT_BLOCKED');
});

test('multiline inline math and TeX comments preserve command boundaries', () => {
  assert.equal(normalizeMath('\\text{hello%comment\nworld}'), '\\text{helloworld}');
  assert.equal(normalizeMath('\\int\n P(x)dx'), '\\int  P(x)dx');
  assert.match(mathContentMarkup({ type: 'math', latex: 'x+\ny', display: false }), /class="katex"/);
  assert.equal(validateMath(String.raw`\text{50\%}`).valid, true);
  const native = adaptTex(String.raw`\newcommand{\hidden}{$x$}\begin{document}$y$\end{document}`, identity);
  assert.equal(native.records[0].content.segments.filter((node) => node.type === 'math').length, 1);
  assert.equal(native.records[0].original, '$y$');
});

test('generated crop replacement is atomic and deterministic without rewriting originals', () => {
  const result = spawnSync('python', ['-X', 'utf8', 'scripts/source-first/artifact-race-check.py'], { encoding: 'utf8', windowsHide: true, timeout: 20000 });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.oldWriteWindowInvalidHash, true);
  assert.equal(report.atomicDestinationIntactUntilReplace, true);
  assert.equal(report.unchangedReplayDoesNotRewrite, true);
  assert.equal(report.realEvidenceWrites, 0);
});
