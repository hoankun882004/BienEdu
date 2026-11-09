import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { root, work } from "../scripts/source-first/build.mjs";
import { digest } from "../scripts/source-first/model.mjs";
import { classifyRuntimeMappings, loadMappingRuntime, expressionKey, resolveFormulaFields, resolveExampleField } from "../scripts/source-first/runtime-mappings.mjs";
import { publicationDryRun, publicationBindings, simulateChange } from "../scripts/source-first/publication.mjs";
import { normalizeBoundSourceField } from "../scripts/math-pdf/normalize.mjs";
import { renderMathText } from "../assets/js/components/markdown-math-renderer.js";
import { createReviewServer } from "../scripts/source-first/server.mjs";

const snapshot = JSON.parse(readFileSync(join(work, "snapshot.json"), "utf8"));
const corrections = JSON.parse(readFileSync(join(root, "scripts/source-first/corrections-v53.json"), "utf8")).corrections;
const mappings = classifyRuntimeMappings(snapshot.items);
const row = (id) => mappings.find((entry) => entry.itemId === id);

test("V5.3 classifies every source item and records every legitimate usage without inventing targets", () => {
  assert.equal(mappings.length, 40);
  const counts = Object.fromEntries([...new Set(mappings.map((entry) => entry.classification))].map((key) => [key, mappings.filter((entry) => entry.classification === key).length]));
  assert.deepEqual(counts, { AMBIGUOUS_MAPPING: 6, EXACT_RUNTIME_MAPPING: 15, MULTIPLE_VALID_TARGETS: 19 });
  const usages = mappings.flatMap((entry) => entry.usages);
  assert.equal(usages.length, 64);
  assert.equal(new Set(usages.map((entry) => entry.targetId)).size, 64);
  const parent=JSON.parse(readFileSync(join(root,".audit/source-first-v5/development-preview-v5.5.json"),"utf8")).plan;
  const applied=parent.files.every((file)=>digest(readFileSync(join(root,file.file)))===file.afterHash);
  assert.equal(mappings.flatMap((entry) => entry.proposedChanges).length, applied?0:9);
  for (const entry of mappings) { assert.ok(entry.reason); assert.equal(entry.proposalHash, digest(entry.proposalContent)); }
  for (const usage of usages) { assert.ok(usage.recordId && usage.sourceHash && usage.contentVersion && usage.selector.fieldId); assert.equal(usage.beforeHash, digest(usage.before)); }
});

test("protected cross-edition expressions and the positional legacy example fail closed", () => {
  const ambiguous = mappings.filter((entry) => entry.classification === "AMBIGUOUS_MAPPING");
  assert.equal(ambiguous.filter((entry) => entry.source.kind === "tex").length, 5);
  assert.equal(ambiguous.filter((entry) => entry.protectedTopic).length, 6);
  for (const entry of ambiguous) { assert.equal(entry.usages.length, 0); assert.ok(entry.candidates.length); }
  assert.match(row("pdf-counting-source").reason, /stable|ID/iu);
  const plan = publicationDryRun(snapshot.items, { root, runtimeMappings: mappings });
  assert.equal(plan.runtimeWrites, 0); assert.equal(plan.eligibleCount, 0); assert.equal(plan.blockedCount, 40);
  assert.equal(plan.changes.filter((entry) => entry.target).length, 34);
  for (const entry of plan.changes.filter((entry) => !publicationBindings[entry.itemId] && entry.target)) assert.ok(entry.blockers.includes("exact-target-human-review-required"));
});

test("semantic formula identity survives reordering and rejects ambiguous or changed structures", () => {
  const runtime = loadMappingRuntime(), record = structuredClone(runtime.native.knowledge["22.7"]);
  const selector = publicationBindings["tex-22.7"];
  assert.equal("field" in selector, false, "no permanent positional binding");
  const original = resolveFormulaFields(record, selector);
  record.formulae.unshift({ label: "unrelated", value: "1+1" });
  const moved = resolveFormulaFields(record, selector);
  assert.equal(moved.before, original.before); assert.notDeepEqual(moved.path, original.path);
  record.formulae.push(structuredClone(moved.formula));
  assert.throws(() => resolveFormulaFields(record, selector), /Ambiguous/u);
  assert.notEqual(expressionKey(String.raw`\frac{a+b}{c}`), expressionKey(String.raw`a+\frac{b}{c}`));
  assert.notEqual(expressionKey(String.raw`\sqrt{a+b}`), expressionKey(String.raw`\sqrt{a}+b`));
});

test("source-hash and stable Example identity mismatch cannot become an approved mapping", () => {
  const changed = structuredClone(snapshot.items.find((entry) => entry.id === "pdf-root-domain"));
  changed.source.sha256 = "0".repeat(64);
  assert.equal(classifyRuntimeMappings([changed])[0].classification, "AMBIGUOUS_MAPPING");
  const runtime = loadMappingRuntime();
  runtime.foundation.examples["1.3"].find((entry) => entry.id === "1.3-source-example-4").sourceBlockId = "wrong";
  assert.equal(classifyRuntimeMappings(snapshot.items.filter((entry) => entry.id === "pdf-root-domain"), { runtime })[0].classification, "AMBIGUOUS_MAPPING");
  const solution = { steps: [{ label: "Lời giải từ tài liệu", expression: "one" }, { label: "unrelated", expression: "two" }] };
  assert.equal(resolveExampleField(solution, "source-solution.expression").before, "one");
  solution.steps.reverse(); assert.equal(resolveExampleField(solution, "source-solution.expression").before, "one");
  solution.steps.push(solution.steps[1]); assert.throws(() => resolveExampleField(solution, "source-solution.expression"), /Ambiguous/u);
});

test("exact source normalization is idempotent, guarded and produces reversible field-only previews", () => {
  for (const correction of corrections) for (const field of correction.fields) {
    const input = { recordId: correction.recordId, sourceHash: correction.sourceHash, field: field.field, value: field.before };
    const result = normalizeBoundSourceField(input, corrections);
    assert.equal(result.value, field.after); assert.equal(result.humanApprovalRequired, true);
    assert.equal(normalizeBoundSourceField({ ...input, value: result.value }, corrections).changed, false);
    assert.throws(() => normalizeBoundSourceField({ ...input, sourceHash: "wrong" }, corrections), /hash/u);
    assert.throws(() => normalizeBoundSourceField({ ...input, value: "unrecognized source text" }, corrections), /version/u);
    assert.doesNotMatch(renderMathText(result.value), /math-render-error|katex-error/u);
    const before = { field: field.before, unrelated: { progress: 7, exercise: "unchanged" } };
    const after = simulateChange(before, { field: ["field"], before: field.before, after: field.after });
    assert.deepEqual(after.unrelated, before.unrelated);
    assert.deepEqual(simulateChange(after, { field: ["field"], before: field.after, after: field.before }), before);
  }
  assert.match(renderMathText(corrections[0].fields.find((entry) => entry.field === "answer").after), /<mfrac>/u);
  assert.match(renderMathText(corrections[1].fields.find((entry) => entry.field === "answer").after), /<msqrt>/u);
  assert.match(row("pdf-area-absolute").usages.find((entry)=>entry.selector.fieldId==="formula:area-with-Ox.detail").after, /a<b/u);
});

test("targeted original-PDF replay preserves corrected grouping, source regions and stable IDs deterministically", () => {
  const runtimeFile = join(root, "assets/js/data/foundation-lessons.generated.js"), before = digest(readFileSync(runtimeFile));
  const replay = () => { const result = spawnSync("python", ["-X", "utf8", "scripts/import-foundation-documents.py", "--review-candidates"], { cwd: root, encoding: "utf8", windowsHide: true }); assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout); };
  const first = replay(); assert.deepEqual(replay(), first);
  assert.equal(first.runtimeWrites, 0); assert.equal(first.candidates.length, 2);
  for (const candidate of first.candidates) {
    const correction = corrections.find((entry) => entry.recordId === candidate.record.id);
    assert.ok(candidate.sourceRegions.length >= 2);
    assert.equal(candidate.record.prompt, correction.fields.find((entry) => entry.field === "prompt").after);
    assert.equal(candidate.record.answer, correction.fields.find((entry) => entry.field === "answer").after);
    assert.ok(candidate.record.originalExtractedFields);
  }
  const blocked = spawnSync("python", ["-X", "utf8", "scripts/import-foundation-documents.py"], { cwd: root, encoding: "utf8", windowsHide: true });
  assert.notEqual(blocked.status, 0); assert.match(blocked.stderr, /blocked/u);
  assert.equal(digest(readFileSync(runtimeFile)), before);
});

test("CD22.7 retains native Bayes notation; no invented conditions or numerical correction", () => {
  const medical = row("tex-22.7");
  assert.equal(medical.classification, "EXACT_RUNTIME_MAPPING"); assert.equal(medical.proposedChanges.length, 0);
  assert.match(medical.usages[0].before, /\\frac.*\\mid/u);
  assert.equal(medical.conditions.length, 0);
  assert.match(row("pdf-exponent-warning").usages[0].before, /Không/u);
});

test("existing Studio exposes source statement and solution pages and rejects arbitrary page requests", async (t) => {
  const server = createReviewServer(); await new Promise((done) => server.listen(0, "127.0.0.1", done));
  t.after(async () => { server.closeAllConnections(); await new Promise((done) => server.close(done)); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const html = await (await fetch(origin)).text(), token = html.match(/name="review-session" content="([a-f0-9]+)"/u)[1];
  const request = (suffix) => fetch(`${origin}${suffix}`, { headers: { "x-review-token": token } });
  const data = await (await request("/api/items")).json();
  const preparation = data.items.find((entry) => entry.id === "pdf-root-domain").preparation;
  assert.deepEqual(preparation.supportPages.sort((a, b) => a-b), [5, 66]);
  const parent=JSON.parse(readFileSync(join(root,".audit/source-first-v5/development-preview-v5.5.json"),"utf8")).plan;
  const applied=parent.files.every((file)=>digest(readFileSync(join(root,file.file)))===file.afterHash);
  assert.equal(preparation.runtimeUsages.filter((entry) => entry.changed).length, applied?0:4);
  assert.equal((await request("/api/context?id=pdf-root-domain&page=5")).status, 200);
  assert.equal((await request("/api/context?id=pdf-root-domain&page=6")).status, 403);
  assert.equal((await fetch(`${origin}/api/context?id=pdf-root-domain&page=5`)).status, 403);
});
