import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { build, root, work } from "../scripts/source-first/build.mjs";
import { commands, expandTextScripts, extractNativeElements, extractDelimitedMath } from "../scripts/source-first/tex.mjs";
import { digest, validateItem, validateReviewPatch, applyReview, localFile } from "../scripts/source-first/model.mjs";
import { createReviewServer } from "../scripts/source-first/server.mjs";
import { sourceFormulaToLatex } from "../scripts/latex-pilot/parser.mjs";
import { renderMarkdownMath } from "../assets/js/components/markdown-math-renderer.js";
import { countingConsistency } from "../scripts/source-first/arithmetic.mjs";

const snapshot = existsSync(join(work, "snapshot.json")) ? JSON.parse(readFileSync(join(work, "snapshot.json"), "utf8")) : build();
const sourceItem = snapshot.items.find((item) => item.id === "tex-22.7");
const makePatch = (overrides = {}) => ({
  schemaVersion: "bienedu.math-review-patch.v1", itemId: sourceItem.id,
  sourceSha256: sourceItem.source.sha256, baseHash: digest(sourceItem), before: sourceItem.normalizedLatex,
  after: sourceItem.normalizedLatex, status: "source-verified", reviewer: "Local test editor",
  reason: "Test comparison with exact source offsets", sourceCompared: true, ...overrides
});

test("native scanner preserves raw offsets, comments, command boundaries and nested scripts", () => {
  const source = String.raw`% \topic{99.9}{ignore}
\chaptertitle{CD22}{Title}
\topic{22.7}{T}
\begin{formulabox}P(A\textsuperscript{n+{1}}|B)\end{formulabox}
\topic{22.8}{Other}
\begin{examplebox}No solution\end{examplebox}`;
  const elements = extractNativeElements(source);
  assert.equal(elements.length, 2);
  assert.equal(elements[0].code, "22.7");
  assert.equal(elements[1].kind, "example");
  assert.equal(commands(source, "topic").length, 2);
  assert.equal(commands(String.raw`\topicSuffix{x}`, "topic").length, 0);
  assert.equal(expandTextScripts(String.raw`B\textsubscript{j}+a\textsuperscript{n+{1}}`), String.raw`B_{j}+a^{n+{1}}`);
  for (const element of elements) assert.equal(source.slice(...element.location.offsets), element.rawSource);
  const math = extractDelimitedMath(String.raw`Prose \(\int\frac{x^{n+1}}{n+1}\,dx\), $$a^{b^c}$$ and \$ escaped.`);
  assert.equal(math[0].raw, String.raw`\int\frac{x^{n+1}}{n+1}\,dx`);
  assert.equal(math[0].normalizedLatex, math[0].raw);
  assert.equal(math[1].normalizedLatex, "a^{b^c}");
  assert.equal(math[1].display, true);
});

test("40 source fixtures preserve exact evidence, all document pages, crops and independent review gates", () => {
  assert.equal(snapshot.items.length, 40);
  const checkpoint = JSON.parse(readFileSync(join(root, ".audit/source-first-v5/checkpoint.json"), "utf8"));
  assert.equal(checkpoint.uniqueSourceCount, 5);
  assert.equal(checkpoint.physicalSources.length, 9);
  assert.equal(checkpoint.pdfCoverage.reduce((sum, doc) => sum + doc.pageCount, 0), 243);
  assert.deepEqual(checkpoint.unresolvedAnchors, []);
  assert.ok(snapshot.nativeElements.length > 200);
  assert.equal(snapshot.items.find((item) => item.id === "tex-22.1").conditions[0].normalizedLatex, String.raw`\mathrm{P}(B)>0`);
  assert.match(snapshot.items.find((item) => item.id === "tex-22.1").conditions[0].originalContext, /P\(B\) > 0/u);
  for (const item of snapshot.items) {
    const checks = validateItem(item, { root });
    assert.equal(checks.structure.status, "passed", item.id);
    assert.equal(checks.syntax.status, "passed", item.id);
    assert.equal(checks.fidelity.status, "needs-review", item.id);
    assert.ok(["needs-review", "sample-checked"].includes(checks.consistency.status), item.id);
    assert.equal(item.publication, "unpublished");
  }
});

test("source-specific quotient normalization keeps denominator factorial and chained equality", () => {
  const output = sourceFormulaToLatex("A(n,k) = n!/(n - k)! = n(n - 1)...(n - k + 1)");
  assert.match(output, /\\frac\{n!\}\{\(n - k\)!\}/u);
  assert.doesNotMatch(output, /\\frac\{n!\}\{\(n - k\)\}!/u);
  assert.match(output, /= n\(n - 1\)/u);
  const cardinality = sourceFormulaToLatex("P(A) = |A|/|Ω|");
  assert.doesNotMatch(cardinality, /\\mid/u);
  assert.match(sourceFormulaToLatex("P(A|B) = P(A ∩ B)/P(B)"), /\\mid/u);
  assert.equal(countingConsistency({ id: "tex-20.4", normalizedLatex: String.raw`A(n,k)=\frac{n!}{(n-k)!}` }).status, "sample-checked");
  assert.equal(countingConsistency({ id: "tex-20.4", normalizedLatex: String.raw`A(n,k)=\frac{n!}{(n-k)}!` }).status, "failed");
});

test("math tables keep inline conditional bars inside one mathematical cell", () => {
  const html = renderMarkdownMath(String.raw`| Công thức | Điều kiện |
| --- | --- |
| \(P(A|B)\) | \(P(B)>0\) |`);
  assert.equal((html.match(/<td>/gu) ?? []).length, 2);
  assert.equal((html.match(/class="katex"/gu) ?? []).length, 2);
  assert.doesNotMatch(html, /math-render-error|katex-error/u);
});

test("review patches reject stale data, invalid math, missing comparison and unknown decisions", () => {
  assert.equal(validateReviewPatch(sourceItem, makePatch(), { root }), true);
  for (const patch of [makePatch({ baseHash: "stale" }), makePatch({ sourceSha256: "stale" }), makePatch({ before: "changed" }), makePatch({ after: String.raw`\intP` }), makePatch({ sourceCompared: false }), makePatch({ reviewer: "" }), makePatch({ status: "published" })]) {
    assert.throws(() => validateReviewPatch(sourceItem, patch, { root }));
  }
});

test("an editor decision updates only staging and keeps mathematical approval separate", () => {
  const result = applyReview(sourceItem, makePatch(), "Local test editor", root);
  assert.equal(result.review.status, "source-verified");
  assert.equal(result.checks.fidelity.status, "needs-review");
  assert.equal(result.checks.consistency.status, "needs-review");
  assert.equal(result.publication, "unpublished");
  assert.equal(result.audit.length, 1);
  assert.throws(() => applyReview(sourceItem, makePatch(), "different editor", root));
  assert.throws(() => applyReview(result, makePatch(), "Local test editor", root));
  assert.throws(() => localFile(root, "../outside"));
});

test("read-only local server enforces host, origin, session token and immutable HTTP actions", async () => {
  const server = createReviewServer();
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const html = await (await fetch(origin)).text();
    const token = html.match(/name="review-session" content="([a-f0-9]+)"/u)?.[1];
    assert.ok(token);
    assert.equal((await fetch(`${origin}/api/items`)).status, 403);
    assert.equal((await fetch(`${origin}/api/items`, { headers: { "x-review-token": token } })).status, 200);
    assert.equal((await fetch(`${origin}/api/items`, { headers: { "x-review-token": token, origin: "https://remote.invalid" } })).status, 403);
    assert.equal((await fetch(`${origin}/api/items`, { headers: { host: "rebound.invalid" } })).status, 403);
    assert.equal((await fetch(`${origin}/api/items`, { method: "POST", body: "{}" })).status, 405);
    assert.equal((await fetch(`${origin}/api/crop?id=pdf-log-bases`, { headers: { "x-review-token": token } })).status, 200);
    assert.equal((await fetch(`${origin}/package.json`)).status, 404);
  } finally { server.closeAllConnections(); await new Promise((done) => server.close(done)); }
});

test("rebuilding staging is deterministic and preserves approved runtime records", () => {
  const runtimePaths = ["assets/js/data/approved-math-content.js", "assets/js/data/knowledge-content.js", "assets/js/data/example-content.js", "assets/js/data/latex-pilot.generated.js"];
  const before = runtimePaths.map((path) => digest(readFileSync(join(root, path))));
  const beforeSnapshot = digest(readFileSync(join(work, "snapshot.json")));
  build();
  assert.equal(digest(readFileSync(join(work, "snapshot.json"))), beforeSnapshot);
  assert.deepEqual(runtimePaths.map((path) => digest(readFileSync(join(root, path)))), before);
});
