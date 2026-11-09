import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, rmSync, mkdirSync, copyFileSync, readdirSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { root, work } from "../scripts/source-first/build.mjs";
import { applyReview, digest, reviewWorkflow, reviewedContentHash, sourceIdentityHash, validateReviewPatch } from "../scripts/source-first/model.mjs";
import { saveReviewPatch, loadReview } from "../scripts/source-first/review-store.mjs";
import { publicationDryRun, publicationBindings, simulateChange } from "../scripts/source-first/publication.mjs";
import { readGeneratedObject, readRuntimeTarget, runtimeFile } from "../scripts/source-first/runtime-target.mjs";
import { prepareReviewBatch } from "../scripts/source-first/prepare.mjs";
import { humanVerificationStatus, renderKnowledgeMarkdown } from "../assets/js/components/markdown-math-renderer.js";
import { createReviewServer } from "../scripts/source-first/server.mjs";

const snapshot = JSON.parse(readFileSync(join(work, "snapshot.json"), "utf8"));
const base = snapshot.items.find((item) => item.id === "tex-22.7");
const identity = "V5.2 synthetic test editor — not a real approval";
function patch(item, extra = {}) {
  const after = extra.after ?? item.normalizedLatex;
  return { schemaVersion: "bienedu.math-review-patch.v3", itemId: item.id, itemVersion: item.contentVersion, sourceIdentityHash: sourceIdentityHash(item),
    originalExpressionHash: digest(item.originalExpression), sourceSha256: item.source.sha256, baseHash: digest(item), before: item.normalizedLatex, after,
    status: "source-verified", reviewer: identity, reviewerType: "human", humanSourceConfirmed: true, sourceCompared: true,
    reason: "Synthetic fixture only, never applied to real staging", exportedAt: "2026-11-05T11:00:00.000Z",
    reviewedContentHash: reviewedContentHash({ ...item, normalizedLatex: after }), editorialApproval: { confirmed: true, reviewerType: "human", reviewer: identity }, ...extra };
}
const approved = () => applyReview(base, patch(base, { after: base.normalizedLatex + String.raw`\,` }), identity, root);
function temporary(t) {
  const directory = mkdtempSync(join(work, "test-v52-"));
  t.after(() => { const rel = relative(resolve(work), resolve(directory)); assert.ok(rel && !rel.startsWith("..")); rmSync(directory, { recursive: true, force: true }); });
  return directory;
}
function fixtureRoot(t) {
  const directory = temporary(t);
  for (const file of [runtimeFile, base.source.file, "assets/js/data/knowledge-content.js", "assets/js/components/markdown-math-renderer.js", "assets/js/curriculum.js", "assets/vendor/katex/katex.mjs"]) {
    const target = join(directory, file); mkdirSync(dirname(target), { recursive: true }); copyFileSync(join(root, file), target);
  }
  return directory;
}

test("V5.2 prepares existing entities and source evidence without creating approvals or a second queue", () => {
  const report = prepareReviewBatch({ persist: false });
  assert.equal(report.items.length, 40);
  assert.equal(report.counts.machineCheckedExpressions, 40, JSON.stringify(report.items.filter((item) => item.checks.syntax.status !== "passed" || item.checks.structure.status !== "passed" || !item.candidateRenderValid).map((item) => ({ id: item.itemId, checks: item.checks, candidateRenderValid: item.candidateRenderValid }))));
  assert.equal(report.counts.uniqueTrackedReviewRecords, 1512);
  assert.equal(report.counts.recognizedRuntimeTargets, 34);
  assert.equal(report.counts.unmappedRuntimeTargets, 6);
  assert.equal(report.counts.humanSourceVerified, 0);
  assert.equal(report.publication.eligiblePreviews, 0);
  assert.equal(report.figurePreparation.priorities.length, 188);
  assert.equal(report.figurePreparation.nextVisualBatchIds.length, 8);
  assert.ok(report.items.find((item) => item.itemId === "tex-22.7").editorialQuestions.length);
  assert.equal(report.cd22Regression.medicalArithmetic.matchesPrintedRoundedPercent, true);
});

test("V3 binds the review to version, source identity and untouched original expression", () => {
  for (const extra of [{ itemVersion: "stale" }, { itemVersion: "" }, { sourceIdentityHash: "stale" }, { originalExpressionHash: "stale" }, { sourceSha256: "stale" }]) assert.throws(() => validateReviewPatch(base, patch(base, extra), { root }));
  const item = approved();
  assert.equal(reviewWorkflow(item).versionBound, true);
  assert.equal(reviewWorkflow({ ...item, contentVersion: "changed" }).humanSourceVerified, false);
  assert.equal(reviewWorkflow({ ...item, id: "different" }).humanSourceVerified, false);
  assert.equal(item.originalExpression, base.originalExpression);
});

test("needs correction and unresolved ambiguity remain separate unapproved decisions", () => {
  for (const status of ["needs-correction", "unresolved-ambiguity"]) {
    const decision = patch(base, { status, humanSourceConfirmed: false, editorialApproval: { confirmed: false } });
    const item = applyReview(base, decision, identity, root);
    assert.equal(item.review.status, status);
    assert.equal(reviewWorkflow(item).humanSourceVerified, false);
    assert.equal(reviewWorkflow(item).editorialApproved, false);
    assert.ok(publicationDryRun([item], { root }).changes[0].blockers.includes("unresolved-source-conflict"));
  }
  assert.throws(() => validateReviewPatch(base, patch(base, { status: "unresolved-ambiguity", editorialApproval: { confirmed: false }, after: "1+1" }), { root }), /preserve/u);
  assert.throws(() => validateReviewPatch(base, patch(base, { status: "needs-correction" }), { root }), /cannot carry/u);
  const sourceOnly = applyReview(base, patch(base, { editorialApproval: { confirmed: false } }), identity, root);
  const unresolved = applyReview(sourceOnly, patch(sourceOnly, { status: "unresolved-ambiguity", editorialApproval: { confirmed: false }, humanSourceConfirmed: false }), identity, root);
  assert.equal(reviewWorkflow(unresolved).humanSourceVerified, true, "editorial ambiguity does not erase a valid historical source comparison");
  assert.equal(reviewWorkflow(unresolved).editorialApproved, false);
  assert.equal(unresolved.normalizedLatex, sourceOnly.normalizedLatex);
  assert.throws(() => applyReview(unresolved, patch(unresolved, { after: "1+1" }), identity, root), /immutable/u);
  assert.equal(reviewWorkflow(applyReview(unresolved, patch(unresolved), identity, root)).versionBound, true);
});

test("review events are complete atomic files, idempotent and ignore interrupted temporary files", (t) => {
  const directory = temporary(t), options = { root, work: directory };
  const decision = patch(base, { status: "unresolved-ambiguity", editorialApproval: { confirmed: false } });
  const item = saveReviewPatch(base, decision, identity, options);
  const events = join(directory, "review-events", base.id);
  const file = join(events, `${digest(decision)}.json`), bytes = readFileSync(file);
  assert.deepEqual(readdirSync(events), [`${digest(decision)}.json`]);
  writeFileSync(join(events, ".interrupted.tmp"), "{incomplete");
  assert.equal(loadReview(base, options).eventCount, 1);
  assert.equal(digest(saveReviewPatch(base, decision, identity, options)), digest(item));
  assert.deepEqual(readFileSync(file), bytes);
  assert.throws(() => saveReviewPatch(base, patch(base), identity, options), /Stale/u);
});

test("legacy event history remains readable and requires an explicit version-bound follow-up for release", (t) => {
  const directory = temporary(t), options = { root, work: directory };
  const oldPatch = patch(base, { schemaVersion: "bienedu.math-review-patch.v2" });
  const legacy = saveReviewPatch(base, oldPatch, identity, options);
  assert.equal(reviewWorkflow(legacy).editorialApproved, true);
  assert.equal(reviewWorkflow(legacy).versionBound, false);
  assert.equal(publicationDryRun([legacy], { root }).eligibleCount, 0);
  saveReviewPatch(base, patch(legacy), identity, options);
  const loaded = loadReview(base, options);
  assert.equal(loaded.eventCount, 2);
  assert.equal(loaded.staleReview, false);
  assert.equal(reviewWorkflow(loaded.item).versionBound, true);
});

test("dry-run contains exact evidence and reversible integration preview without certifying the whole lesson", () => {
  const plan = publicationDryRun([approved()], { root });
  assert.equal(plan.eligibleCount, 1);
  const change = plan.changes[0], preview = change.recordPreview;
  assert.ok(plan.planHash && plan.dependencies.every((entry) => entry.hash));
  assert.equal(change.approvalEvidence.source.reviewer, identity);
  assert.equal(change.validation.syntax.status, "passed");
  assert.equal(preview.after.formulae[0].value, change.after);
  assert.equal(preview.after.formulae[0].humanVerification.source.reviewer, identity);
  assert.equal(humanVerificationStatus(preview.after).mathematical, false, "one formula review is not whole-lesson approval");
  assert.equal(preview.after.note.text, preview.before.note.text);
  assert.notEqual(preview.after.contentVersion, preview.before.contentVersion);
  assert.deepEqual(preview.rollback, preview.before);
  assert.deepEqual(simulateChange(simulateChange(preview.before, { field: change.target.field, before: change.before, after: change.after }), change.rollback), preview.before);
  assert.doesNotMatch(renderKnowledgeMarkdown({ slide: { reading: preview.after }, exercise: { code: "22.7", title: preview.after.title }, position: { current: 1, total: 1 } }), /math-render-error|katex-error|<small>Đã kiểm duyệt/u);
  assert.equal(publicationDryRun([approved()], { root }).planHash, plan.planHash);
});

test("runtime previews reread disk and reject stale plans, dependencies and target versions", (t) => {
  const directory = fixtureRoot(t), item = approved();
  const plan = publicationDryRun([item], { root: directory });
  assert.equal(plan.eligibleCount, 1);
  const runtime = readRuntimeTarget(directory);
  runtime.knowledge["22.7"].formulae[0].value = "2+2";
  const emit = () => writeFileSync(join(directory, runtimeFile), `const deepFreeze=v=>v;\nexport const latexPilotMetadata = deepFreeze(${JSON.stringify(runtime.metadata)});\nexport const latexPilotKnowledgeContent = deepFreeze(${JSON.stringify(runtime.knowledge)});\n`);
  emit();
  assert.equal(publicationDryRun([item], { root: directory }).changes[0].before, "2+2");
  assert.ok(publicationDryRun([item], { root: directory, basePlan: plan }).changes[0].blockers.includes("stale-runtime-base"));
  runtime.knowledge["22.7"].contentVersion = "unknown-version"; emit();
  assert.ok(publicationDryRun([item], { root: directory }).changes[0].blockers.includes("runtime-content-version-mismatch"));
  runtime.metadata.sourceDocumentId = "different-source"; emit();
  assert.ok(publicationDryRun([item], { root: directory }).changes[0].blockers.includes("runtime-source-identity-mismatch"));
  writeFileSync(join(directory, "assets/js/curriculum.js"), "// changed fixture dependency");
  assert.ok(publicationDryRun([item], { root: directory, basePlan: plan }).changes[0].blockers.includes("stale-runtime-dependencies"));
  assert.throws(() => publicationDryRun([item], { root: directory, basePlan: { ...plan, eligibleCount: 999 } }), /base plan/u);
});

test("only canonical field targets are recognized; generated-data parsing does not execute code", () => {
  const binding = publicationBindings[base.id];
  for (const target of [{ ...binding, code: "22.1" }, { ...binding, field: ["note", "text"] }, { ...binding, file: "other.js" }]) assert.equal(publicationDryRun([approved()], { root, bindings: { [base.id]: target } }).eligibleCount, 0);
  assert.deepEqual(readGeneratedObject('export const value = deepFreeze({"math":"\\\\frac{1}{2}","text":"} and \\\"quoted\\\""});\nglobalThis.notExecuted=true;', "value"), { math: String.raw`\frac{1}{2}`, text: '} and "quoted"' });
  assert.equal(globalThis.notExecuted, undefined);
  assert.throws(() => readGeneratedObject("export const value = deepFreeze({oops});", "value"));
});

test("read-only refresh observes a real saved fixture decision without creating real review events", async (t) => {
  const directory = temporary(t);
  const server = createReviewServer({ reviewWork: directory });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { server.closeAllConnections(); await new Promise((done) => server.close(done)); });
  const html = await (await fetch(origin)).text();
  const token = html.match(/name="review-session" content="([a-f0-9]+)"/u)[1];
  const get = async () => (await (await fetch(`${origin}/api/items`, { headers: { "x-review-token": token } })).json()).items.find((item) => item.id === base.id);
  const before = await get();
  const decision = patch(base, { status: "unresolved-ambiguity", editorialApproval: { confirmed: false } });
  saveReviewPatch(base, decision, identity, { root, work: directory });
  const after = await get();
  assert.notEqual(after.baseHash, before.baseHash);
  assert.equal(after.review.status, "unresolved-ambiguity");
  assert.equal(after.workflow.humanSourceVerified, false);
  assert.equal((await fetch(`${origin}/api/items`, { method: "POST" })).status, 405);
});
