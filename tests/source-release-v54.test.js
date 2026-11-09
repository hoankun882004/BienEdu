import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, mkdtempSync, rmSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { root, work } from "../scripts/source-first/build.mjs";
import { digest } from "../scripts/source-first/model.mjs";
import { classifyRuntimeMappings } from "../scripts/source-first/runtime-mappings.mjs";
import { compareMathematics, mathematicalStructure, pilotConsistencyEvidence } from "../scripts/source-first/comparison.mjs";
import { fieldBinding, readFieldApproval, saveFieldReview } from "../scripts/source-first/field-review.mjs";
import { createLocalPlan, executeLocalRelease, previewRuntimeFile, releaseDependencies, localReleaseState } from "../scripts/source-first/local-release.mjs";
import { readJsonObjectAfter } from "../scripts/source-first/runtime-target.mjs";
import { humanVerificationStatus } from "../assets/js/components/markdown-math-renderer.js";
import { spawnSync } from "node:child_process";
import { historicalMappings,restoreHistoricalFixture } from "./helpers/historical-pilot.mjs";

const snapshot = JSON.parse(readFileSync(join(work, "snapshot.json"), "utf8"));
const mappings = historicalMappings(snapshot.items);
const contexts = snapshot.items.flatMap((item) => mappings.find((row) => row.itemId === item.id).proposedChanges.map((usage) => ({ item, usage })));
const foundation = "assets/js/data/foundation-lessons.generated.js", calculus = "assets/js/data/calculus-knowledge-details.js";
const identity = "V5.4 ISOLATED SYNTHETIC FIXTURE — not a real human approval";
const actualRuntimeBaseline=digest(readFileSync(join(root,foundation)));
function fixture(t) {
  const directory = mkdtempSync(join(work, "test-v54-")), reviewWork = join(directory, "review");
  t.after(() => { const rel = relative(resolve(work), resolve(directory)); assert.ok(rel && !rel.startsWith("..")); rmSync(directory, { recursive: true, force: true }); });
  for (const file of new Set([foundation, calculus, ...releaseDependencies, "scripts/source-first/corrections-v53.json", ...contexts.map(({ item }) => item.source.file)])) {
    const target = join(directory, file); mkdirSync(dirname(target), { recursive: true }); copyFileSync(join(root, file), target);
  }
  restoreHistoricalFixture(directory);
  return { root: directory, work: reviewWork };
}
function patch(context, options, extra = {}) {
  const binding = fieldBinding(context.item, context.usage, options), current = readFieldApproval(binding, options);
  return { schemaVersion: "bienedu.math-field-review.v1", binding, parentHash: current.parentHash, sourceVerified: true, mathematicalApproved: true,
    reviewerType: "human", reviewer: identity, reason: "Isolated regression fixture only; never stored in real review history", exportedAt: "2026-11-05T17:00:00.000Z", ...extra };
}
function approvedPlan(options, file = foundation) {
  for (const context of contexts.filter(({ usage }) => usage.origin === file)) saveFieldReview(context.item, context.usage, patch(context, options), identity, options);
  const plan = createLocalPlan(contexts, { ...options, file }); assert.deepEqual(plan.blockers, []); return plan;
}
const authorization = (plan, rollback = false) => ({ confirmed: true, reviewerType: "human", reviewer: identity, planHash: plan.planHash, action: rollback ? "rollback" : "release" });

test("V5.4 comparison separates supported native matches, guarded defects and unproven PDF transcriptions", () => {
  const rows = compareMathematics(snapshot.items, mappings, { root });
  assert.equal(rows.length, 40);
  assert.equal(rows.filter((row) => row.classification === "MACHINE_MATCHED").length, 5);
  assert.equal(rows.filter((row) => row.classification === "CONFIRMED_CONVERSION_DEFECT").length, 3);
  assert.equal(rows.filter((row) => row.classification === "AMBIGUOUS").length, 32);
  assert.ok(rows.every((row, index) => !index || rows[index-1].priority <= row.priority));
  assert.ok(rows.filter((row) => row.classification === "MACHINE_MATCHED").every((row) => row.source.kind === "tex" && row.conditions.every((condition) => condition.preserved)));
  assert.ok(rows.every((row) => row.humanApproval === "not-inferred"));
  const changed = structuredClone(snapshot.items.find((item) => item.id === "tex-22.7")); changed.normalizedLatex = String.raw`\mathrm{P}(A)=\frac{1}{2}`;
  assert.equal(compareMathematics([changed], mappings, { root })[0].classification, "AMBIGUOUS");
});

test("structural evidence distinguishes fractions, radical scope, exponents and printed conditions", () => {
  for (const [left, right] of [[String.raw`\frac{a+b}{c}`, String.raw`a+\frac{b}{c}`], [String.raw`\sqrt{a+b}`, String.raw`\sqrt{a}+b`], ["x^{2}", "x_{2}"], [String.raw`x,\quad x>0`, "x"]]) assert.notEqual(mathematicalStructure(left).hash, mathematicalStructure(right).hash);
  assert.equal(mathematicalStructure(String.raw`\frac{x}{x^2-1}`).shapes.mfrac, 1);
  assert.equal(mathematicalStructure(String.raw`\unsupported{x}`), null);
  const evidence = pilotConsistencyEvidence(); assert.ok([...evidence.rational, ...evidence.radical].every((entry) => entry.matches)); assert.equal(evidence.domain.endpointDerivativeClaimed, false);
});

test("field decisions are immutable, separately attested, idempotent and reject stale source/version/conditions/parents", (t) => {
  const options = fixture(t), context = contexts[0], binding = fieldBinding(context.item, context.usage, options);
  assert.equal(readFieldApproval(binding, options).sourceVerified, false);
  const sourceOnly = patch(context, options, { mathematicalApproved: false });
  const first = saveFieldReview(context.item, context.usage, sourceOnly, identity, options);
  assert.equal(first.sourceVerified, true); assert.equal(first.mathematicalApproved, false);
  assert.equal(saveFieldReview(context.item, context.usage, sourceOnly, identity, options).eventCount, 1);
  for (const key of ["sourceHash", "itemVersion", "conditionsHash", "beforeHash", "afterHash"]) {
    const invalid = patch(context, options); invalid.binding[key] = "wrong"; assert.throws(() => saveFieldReview(context.item, context.usage, invalid, identity, options), /Stale/u);
  }
  assert.throws(() => saveFieldReview(context.item, context.usage, patch(context, options, { reviewerType: "agent" }), identity, options), /human/u);
  assert.throws(() => saveFieldReview(context.item, context.usage, patch(context, options, { sourceVerified: false }), identity, options), /decisions/u);
  assert.throws(() => saveFieldReview(context.item, context.usage, patch(context, options, { parentHash: null }), identity, options), /parent/u);
  const approved = saveFieldReview(context.item, context.usage, patch(context, options), identity, options);
  assert.equal(approved.mathematicalApproved, true); assert.equal(approved.eventCount, 2);
  assert.equal(readFieldApproval({ ...binding, contentVersion: "different" }, options).stale, true);
});

test("dry-run requires all nine real field approvals, rejects missing approval and blocks multi-file transactions", (t) => {
  const options = fixture(t), plan = createLocalPlan(contexts, options);
  assert.equal(plan.files.length, 2); assert.equal(plan.files.flatMap((entry) => entry.changes).length, 9);
  assert.equal(plan.blockers.filter((entry) => entry.startsWith("human-field")).length, 9);
  assert.match(plan.blockers[0], /multi-file/u);
  assert.equal(executeLocalRelease(plan, options).runtimeWrites, 0);
  assert.throws(() => executeLocalRelease({ ...plan, planHash: "forged" }, options), /hash/u);
  assert.throws(() => executeLocalRelease(plan, { ...options, execute: true }), /authorization/u);
  assert.throws(() => executeLocalRelease(plan, { ...options, execute: true, authorization: authorization(plan) }), /manifest/u);
});

test("approved single-file publication is atomic, preserves unrelated bytes/content/progress and rolls back exactly", (t) => {
  const options = fixture(t), plan = approvedPlan(options), target = join(options.root, foundation), before = readFileSync(target);
  const dry = executeLocalRelease(plan, options); assert.equal(dry.runtimeWrites, 0); assert.deepEqual(readFileSync(target), before);
  const result = executeLocalRelease(plan, { ...options, execute: true, authorization: authorization(plan) });
  assert.equal(result.mode, "released"); assert.equal(result.runtimeWrites, 1);
  assert.equal(localReleaseState(options).activeCorrectionIds.length, 2);
  const after = readFileSync(target, "utf8"), oldSource = before.toString("utf8");
  assert.equal(digest(after), plan.files[0].afterHash);
  assert.match(after, /149\.0/u, "untouched figure-coordinate numeric spelling retained");
  const oldExamples = readJsonObjectAfter(oldSource, "const examples = "), examples = readJsonObjectAfter(after, "const examples = ");
  assert.deepEqual(examples["1.1"], oldExamples["1.1"]);
  assert.equal(examples["1.2"].find((entry) => entry.id === "1.2-source-example-5").sourceBlockId, "1.2-worked-example-5");
  const replay = spawnSync("python", ["-X", "utf8", "scripts/import-foundation-documents.py", "--review-candidates"], { cwd: root, encoding: "utf8", windowsHide: true });
  assert.equal(replay.status, 0, replay.stderr);
  for (const { record } of JSON.parse(replay.stdout).candidates) {
    const published = examples[record.id.split("-")[0]].find((entry) => entry.id === record.id);
    for (const field of ["title", "prompt", "answer"]) assert.equal(published[field], record[field]);
    assert.deepEqual(published.steps, record.steps);
  }
  assert.equal(humanVerificationStatus(examples["1.2"][0]).mathematical, false, "no unrelated whole-record human badge");
  assert.equal(executeLocalRelease(plan, { ...options, execute: true, authorization: authorization(plan) }).runtimeWrites, 0);
  assert.equal(executeLocalRelease(plan, { ...options, execute: true, authorization: authorization(plan, true), rollback: true }).mode, "rolled-back");
  assert.deepEqual(readFileSync(target), before);
  assert.equal(localReleaseState(options).activeCorrectionIds.length, 0);
  assert.equal(executeLocalRelease(plan, { ...options, execute: true, authorization: authorization(plan, true), rollback: true }).runtimeWrites, 0);
  assert.throws(() => executeLocalRelease(plan, { ...options, execute: true, authorization: authorization(plan) }), /Rolled-back/u);
  assert.equal(existsSync(join(options.work, "student-progress")), false);
});

test("curated Knowledge detail adapter changes only its approved string and retains all other source bytes", (t) => {
  const options = fixture(t), plan = approvedPlan(options, calculus), target = join(options.root, calculus), before = readFileSync(target, "utf8");
  executeLocalRelease(plan, { ...options, execute: true, authorization: authorization(plan) });
  const change = plan.files[0].changes[0], after = readFileSync(target, "utf8");
  assert.equal(after.replace(JSON.stringify(change.after), JSON.stringify(change.before)), before);
  assert.ok(after.includes("a<b"));
  executeLocalRelease(plan, { ...options, execute: true, authorization: authorization(plan, true), rollback: true }); assert.equal(readFileSync(target, "utf8"), before);
});

test("stale runtime, source mismatch and superseded human decisions block publication", (t) => {
  const options = fixture(t), plan = approvedPlan(options), target = join(options.root, foundation), before = readFileSync(target);
  writeFileSync(target, Buffer.concat([before, Buffer.from("\n// outside edit")]));
  assert.throws(() => executeLocalRelease(plan, { ...options, execute: true, authorization: authorization(plan) }), /Stale runtime/u);
  writeFileSync(target, before);
  const dependency = join(options.root, "assets/js/data/calculus-lessons.js"), dependencyBefore = readFileSync(dependency);
  writeFileSync(dependency, Buffer.concat([dependencyBefore, Buffer.from("\n// changed loader fixture")]));
  assert.throws(() => executeLocalRelease(plan, { ...options, execute: true, authorization: authorization(plan) }), /dependency version/u);
  writeFileSync(dependency, dependencyBefore);
  const context = contexts.find(({ usage }) => usage.origin === foundation);
  saveFieldReview(context.item, context.usage, patch(context, options, { mathematicalApproved: false }), identity, options);
  assert.throws(() => executeLocalRelease(plan, { ...options, execute: true, authorization: authorization(plan) }), /superseded/u);
  const fresh = approvedPlan(options), sourcePath = join(options.root, fresh.files[0].changes[0].source.file); writeFileSync(sourcePath, "changed original source fixture");
  assert.throws(() => executeLocalRelease(fresh, { ...options, execute: true, authorization: authorization(fresh) }), /Source hash/u);
});

test("failure before the atomic rename leaves runtime intact; retry recovers the durable intent", (t) => {
  const options = fixture(t), plan = approvedPlan(options), target = join(options.root, foundation), before = readFileSync(target);
  assert.throws(() => executeLocalRelease(plan, { ...options, execute: true, authorization: authorization(plan), beforeCommit: () => { throw new Error("fixture crash"); } }), /fixture crash/u);
  assert.deepEqual(readFileSync(target), before); assert.equal(existsSync(join(options.work, ".local-release.lock")), false);
  assert.equal(readdirSync(dirname(target)).filter((file) => file.endsWith(".tmp")).length, 0);
  assert.equal(executeLocalRelease(plan, { ...options, execute: true, authorization: authorization(plan) }).mode, "released");
});

test("an edit during the transaction is not overwritten; corrupted backups prevent rollback", (t) => {
  const options = fixture(t), plan = approvedPlan(options), target = join(options.root, foundation), before = readFileSync(target);
  const concurrent = Buffer.concat([before, Buffer.from("\n// concurrent fixture writer")]);
  assert.throws(() => executeLocalRelease(plan, { ...options, execute: true, authorization: authorization(plan), beforeCommit: () => writeFileSync(target, concurrent) }), /Concurrent/u);
  assert.deepEqual(readFileSync(target), concurrent);
  writeFileSync(target, before);
  executeLocalRelease(plan, { ...options, execute: true, authorization: authorization(plan) });
  const backup = join(options.work, "release-events", plan.planHash, "before.json"); writeFileSync(backup, JSON.stringify({ content: "corrupt" }));
  assert.throws(() => executeLocalRelease(plan, { ...options, execute: true, authorization: authorization(plan, true), rollback: true }), /Backup hash/u);
  assert.equal(digest(readFileSync(target)), plan.files[0].afterHash);
});

test("a post-replacement interrupted state is reconciled from the immutable intent and backup", (t) => {
  const options = fixture(t), plan = approvedPlan(options), target = join(options.root, foundation);
  const after = previewRuntimeFile(readFileSync(target, "utf8"), foundation, plan.files[0].changes);
  assert.throws(() => executeLocalRelease(plan, { ...options, execute: true, authorization: authorization(plan), beforeCommit: () => writeFileSync(target, after) }), /Concurrent/u);
  assert.equal(existsSync(join(options.work, "release-events", plan.planHash, "applied.json")), false);
  const recovered = executeLocalRelease(plan, { ...options, execute: true, authorization: authorization(plan) });
  assert.equal(recovered.mode, "already-applied"); assert.equal(recovered.runtimeWrites, 0);
  assert.equal(digest(readFileSync(target)), plan.files[0].afterHash);
  assert.equal(existsSync(join(options.work, "release-events", plan.planHash, "applied.json")), true);
});

test("protected topics, unsupported fields and forged after values cannot be released", (t) => {
  const options = fixture(t), context = structuredClone(contexts[0]); context.item.topicId = "CD20";
  assert.throws(() => createLocalPlan([context], options), /Protected/u);
  assert.throws(() => previewRuntimeFile("", "assets/js/curriculum.js", []), /Unsupported/u);
  const plan = approvedPlan(options), forged = structuredClone(plan); forged.files[0].changes[0].after = "forged";
  const { planHash, ...body } = forged; forged.planHash = digest(body);
  assert.throws(() => executeLocalRelease(forged, { ...options, execute: true, authorization: authorization(forged) }), /Unbound/u);
  const unchangedRuntime = digest(readFileSync(join(root, foundation)));
  assert.equal(unchangedRuntime, actualRuntimeBaseline);
});
