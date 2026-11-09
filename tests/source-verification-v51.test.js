import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { root, work } from "../scripts/source-first/build.mjs";
import { digest, reviewedContentHash, applyReview, reviewWorkflow, validateReviewPatch, sourceIdentityHash } from "../scripts/source-first/model.mjs";
import { saveReviewPatch, loadReview } from "../scripts/source-first/review-store.mjs";
import { publicationDryRun, simulateChange } from "../scripts/source-first/publication.mjs";
import { verifyBatch } from "../scripts/source-first/verify.mjs";
import { humanVerificationStatus, reviewContentSnapshot, renderKnowledgeMarkdown } from "../assets/js/components/markdown-math-renderer.js";
import { getKnowledgeContent } from "../assets/js/data/knowledge-content.js";
import { benchmarkFixtures } from "../scripts/source-first/fixtures.mjs";

const snapshot = JSON.parse(readFileSync(join(work, "snapshot.json"), "utf8"));
const base = snapshot.items.find((item) => item.id === "tex-22.7");
function patchFor(item, { editorial = false, after = item.normalizedLatex, ...extra } = {}) {
  return { schemaVersion: "bienedu.math-review-patch.v3", itemId: item.id, baseHash: digest(item), sourceSha256: item.source.sha256,
    itemVersion: item.contentVersion, sourceIdentityHash: sourceIdentityHash(item), originalExpressionHash: digest(item.originalExpression),
    before: item.normalizedLatex, after, status: "source-verified", reviewer: "Fixture source editor (test only)", reviewerType: "human", reason: "Synthetic unit-test attestation; never applied to real review storage",
    sourceCompared: true, humanSourceConfirmed: true, reviewedContentHash: reviewedContentHash({ ...item, normalizedLatex: after }), exportedAt: "2026-11-05T03:00:00.000Z",
    editorialApproval: { confirmed: editorial, reviewerType: "human", reviewer: "Fixture math editor (test only)" }, ...extra };
}

test("V5.1 compares every benchmark item and retains separate human and editorial queues", () => {
  const report = verifyBatch();
  assert.equal(report.benchmark.length, 40);
  assert.equal(report.counts.machineCheckedExpressions, 40);
  assert.equal(report.counts.humanSourceVerified, 0);
  assert.equal(report.counts.mathematicalEditorialApprovals, 0);
  assert.equal(report.medicalArithmetic.matchesPrintedRoundedPercent, true);
  assert.ok(report.cd22.every((unit) => unit.sourceAdapterMatches && !unit.renderErrors));
  assert.equal(report.counts.calculusAnswerConflicts, 9);
  assert.equal(report.reviewEntities.filter((entity) => entity.facets.includes("figure")).length, 188);
  assert.equal(new Set(report.reviewEntities.map((entity) => entity.key)).size, report.counts.uniqueTrackedReviewRecords);
  assert.ok(report.counts.uniqueTrackedReviewRecords < 181 + 1313 + 40 + 180 + 188 + 18 + 9);
});

test("explicit human source verification does not automatically grant mathematical approval", () => {
  const sourceOnly = applyReview(base, patchFor(base), "Fixture source editor (test only)", root);
  assert.equal(reviewWorkflow(sourceOnly).humanSourceVerified, true);
  assert.equal(reviewWorkflow(sourceOnly).editorialApproved, false);
  assert.throws(() => applyReview(sourceOnly, patchFor(sourceOnly, { editorial: false, status: "confirmed-error" }), "Fixture source editor (test only)", root), /immutable/u);
  const approved = applyReview(sourceOnly, patchFor(sourceOnly, { editorial: true }), "Fixture source editor (test only)", root);
  assert.equal(reviewWorkflow(approved).editorialApproved, true);
  assert.equal(approved.publication, "unpublished");
  const changed = { ...approved, normalizedLatex: approved.normalizedLatex + "+1" };
  assert.equal(reviewWorkflow(changed).humanSourceVerified, false);
});

test("V2 rejects absent attestation, wrong reviewer type, stale condition hashes and invalid editorial identities", () => {
  for (const patch of [patchFor(base, { humanSourceConfirmed: false }), patchFor(base, { reviewerType: "automated" }), patchFor(base, { reviewedContentHash: "stale" }), patchFor(base, { editorialApproval: { confirmed: true, reviewerType: "human", reviewer: "" } })]) {
    assert.throws(() => validateReviewPatch(base, patch, { root }));
  }
  const legacy = applyReview(base, { ...patchFor(base), schemaVersion: "bienedu.math-review-patch.v1" }, "Fixture source editor (test only)", root);
  assert.equal(reviewWorkflow(legacy).humanSourceVerified, false);
  const explicitlyReviewed = applyReview(legacy, patchFor(legacy, { editorial: true }), "Fixture source editor (test only)", root);
  assert.equal(reviewWorkflow(explicitlyReviewed).humanSourceVerified, true);
  assert.equal(reviewWorkflow(explicitlyReviewed).editorialApproved, true);
});

test("immutable review events support later unchanged editorial approval and idempotent reapplication", (t) => {
  const tempWork = mkdtempSync(join(work, "test-events-"));
  t.after(() => rmSync(tempWork, { recursive: true, force: true }));
  const options = { root, work: tempWork };
  const first = patchFor(base);
  const sourceOnly = saveReviewPatch(base, first, first.reviewer, options);
  assert.equal(digest(saveReviewPatch(base, first, first.reviewer, options)), digest(sourceOnly));
  assert.throws(() => saveReviewPatch(base, first, "Different fixture identity", options), /reviewer/u);
  const second = patchFor(sourceOnly, { editorial: true });
  saveReviewPatch(base, second, second.reviewer, options);
  const loaded = loadReview(base, options);
  assert.equal(loaded.eventCount, 2);
  assert.equal(loaded.staleReview, false);
  assert.equal(reviewWorkflow(loaded.item).editorialApproved, true);
  assert.equal(existsSync(join(work, "reviews", `${base.id}.json`)), false, "tests never create real human approvals");
});

test("release preview blocks actual pending content and produces an exact reversible change for approved fixtures only", () => {
  const hashBefore = digest(readFileSync(join(root, "assets/js/data/latex-pilot.generated.js")));
  const pending = publicationDryRun(snapshot.items, { root });
  assert.equal(pending.eligibleCount, 0);
  assert.equal(pending.mode, "dry-run-only");
  const approved = applyReview(base, patchFor(base, { editorial: true, after: base.normalizedLatex + String.raw`\,` }), "Fixture source editor (test only)", root);
  const plan = publicationDryRun([approved], { root });
  assert.equal(plan.eligibleCount, 1);
  const change = plan.changes[0];
  const before = getKnowledgeContent("22.7");
  const after = simulateChange(before, { field: change.target.field, before: change.before, after: change.after });
  assert.deepEqual(simulateChange(after, { field: change.target.field, before: change.before, after: change.after }), after);
  assert.deepEqual(simulateChange(after, change.rollback), before);
  assert.equal(publicationDryRun([approved], { root, expectedRuntimeHash: "stale" }).eligibleCount, 0);
  assert.equal(publicationDryRun([{ ...approved, sourceConflict: true }], { root }).eligibleCount, 0);
  assert.equal(publicationDryRun([approved], { root, staleItemIds: [approved.id] }).eligibleCount, 0);
  assert.equal(digest(readFileSync(join(root, "assets/js/data/latex-pilot.generated.js"))), hashBefore);
});

test("protected CD20/CD21, unknown bindings and CD23 cannot become eligible release candidates", () => {
  for (const item of snapshot.items.filter((item) => ["CD20", "CD21"].includes(item.topicId))) {
    assert.ok(publicationDryRun([item], { root }).changes[0].blockers.includes("protected-topic"));
  }
  assert.equal(publicationDryRun([{ ...base, topicId: "CD23", sectionId: "23.1" }], { root }).eligibleCount, 0);
});

test("student verification badges require human records bound to the exact reviewed content", () => {
  const value = { ...getKnowledgeContent("22.7"), sourceSha256: base.source.sha256, contentVersion: "fixture-v51" };
  assert.deepEqual(humanVerificationStatus(value), { source: false, mathematical: false });
  const evidence = { status: "completed", reviewerType: "human", reviewer: "Fixture editor", reviewedAt: "2026-11-05T03:00:00Z", sourceHash: base.source.sha256 };
  value.humanVerification = { source: evidence, contentVersion: value.contentVersion, reviewedContent: reviewContentSnapshot(value) };
  assert.equal(humanVerificationStatus(value).source, true);
  assert.equal(humanVerificationStatus(value).mathematical, false);
  value.humanVerification.editorial = evidence;
  assert.equal(humanVerificationStatus(value).mathematical, true);
  assert.match(renderKnowledgeMarkdown({ slide: { reading: value }, exercise: { code: "22.7", title: value.title }, position: { current: 1, total: 1 } }), /Đã kiểm duyệt/u);
  value.formulae = [{ ...value.formulae[0], value: "1+1=3" }];
  assert.equal(humanVerificationStatus(value).mathematical, false);
});

test("source warnings retain their wording rather than inventing a universal mathematical inequality", () => {
  const fixture = benchmarkFixtures.find((item) => item.id === "pdf-exponent-warning");
  const item = snapshot.items.find((item) => item.id === fixture.id);
  assert.match(item.originalExpression, /Không biến/u);
  assert.equal(item.normalizedLatex, fixture.latex);
  assert.match(item.normalizedLatex, /\\text\{Không biến \}/u);
  assert.doesNotMatch(item.normalizedLatex, /\\ne\b/u);
  assert.equal(2 ** 1 + 2 ** 1, 2 ** (1 + 1), "the old universal inequality has a concrete counterexample");
  assert.equal(validateReviewPatch(item, patchFor(item), { root }), true);
  assert.equal(reviewWorkflow(item).humanSourceVerified, false);
});
