import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { runSymbolicChecks } from "../scripts/source-first/symbolic.mjs";
import { applyDevelopmentPlan, assertDevelopmentEnvironment, developmentStatus, createDevelopmentPlan, prepareDevelopmentPreview } from "../scripts/source-first/development.mjs";
import { createLocalPlan, executeLocalRelease } from "../scripts/source-first/local-release.mjs";
import { digest } from "../scripts/source-first/model.mjs";
import { developmentFixture, pilotContexts } from "./helpers/development-fixture.mjs";
import { root } from "../scripts/source-first/build.mjs";

const execution = (fixture, plan, extra = {}) => ({ ...fixture, execute: true, development: true, authorize: plan.planHash, env: {}, ...extra });
const setup = (t, options) => { const fixture = developmentFixture(options); t.after(fixture.cleanup); return fixture; };

test("V5.5 symbolic checks prove supported identities on declared domains and retain unsupported/conflicting results", () => {
  const result = runSymbolicChecks([
    { id: "rational", kind: "equivalent", expression: String.raw`\frac{-x^2-1}{(x^2-1)^2}`, expected: String.raw`\frac{-x^2-1}{(x-1)^2(x+1)^2}`, domain: String.raw`x\ne\pm1` },
    { id: "integral", kind: "antiderivative", expression: "x^2", expected: String.raw`\frac{x^3}{3}`, domain: "real" },
    { id: "lost-domain", kind: "equivalent", expression: "x/x", expected: "1", domain: "real" },
    { id: "unsupported", kind: "derivative", expression: String.raw`\mystery{x}`, expected: "1", functionDomain: "real", derivativeDomain: "real" },
    { id: "wrong-root", kind: "derivative", expression: String.raw`\sqrt{4-x^2}`, expected: String.raw`\frac{x}{\sqrt{4-x^2}}`, functionDomain: "[-2;2]", derivativeDomain: "-2<x<2" }
  ]);
  assert.equal(result.version, "1.14.0");
  assert.deepEqual(result.checks.map((entry) => entry.status), ["passed", "passed", "conflict", "unsupported", "conflict"]);
  assert.ok(result.checks.every((entry) => entry.humanApproval === false));
});

test("development plan consolidates three source-bound groups/nine fields with immutable matching preview backups", (t) => {
  const fixture = setup(t), plan = fixture.createPlan();
  assert.equal(plan.eligibleCorrectionIds.length, 3); assert.equal(plan.files.length, 2); assert.equal(plan.files.flatMap((entry) => entry.changes).length, 9);
  assert.deepEqual(plan.excluded, []); assert.equal(plan.formalHumanApproval, false); assert.equal(plan.productionPublication, false);
  const dry = applyDevelopmentPlan(plan, fixture); assert.equal(dry.runtimeWrites, 0);
  for (const entry of plan.files) assert.equal(digest(readFileSync(join(fixture.root, entry.file))), entry.beforeHash);
  assert.equal(existsSync(join(fixture.work, "review-events")), false);
  assert.equal(fixture.createPlan().planHash, plan.planHash);
});

test("development execution is blocked in production/CI and requires explicit batch authorization", (t) => {
  const fixture = setup(t), plan = fixture.createPlan();
  for (const env of [{ NODE_ENV: "production" }, { CI: "true" }, { VERCEL: "1" }, { VERCEL_ENV: "preview" }]) assert.throws(() => assertDevelopmentEnvironment({ ...fixture, development: true, env }), /Development-only/u);
  assert.throws(() => applyDevelopmentPlan(plan, execution(fixture, plan, { development: false })), /Development-only/u);
  assert.throws(() => applyDevelopmentPlan(plan, execution(fixture, plan, { authorize: "wrong" })), /authorization/u);
  assert.equal(developmentStatus(plan, fixture).status, "not-applied-or-rolled-back");
});

test("one development action applies both files, validates real learner loaders, remains idempotent and rolls back exactly", (t) => {
  const fixture = setup(t), plan = fixture.createPlan();
  const applied = applyDevelopmentPlan(plan, execution(fixture, plan));
  assert.equal(applied.status, "locally-applied-unreviewed"); assert.equal(applied.runtimeWrites, 2);
  assert.equal(applied.validation.fields.length, 9); assert.ok(applied.validation.fields.every((entry) => !entry.humanEditorialBadge));
  mkdirSync(join(fixture.root, ".audit/source-first-v5"), { recursive: true });
  writeFileSync(join(fixture.root, ".audit/source-first-v5/development-preview-v5.5.json"), JSON.stringify({ plan, rollbackCommand: `dev-rollback ${plan.planHash}` }));
  const retained = prepareDevelopmentPreview(fixture); assert.equal(retained.plan.planHash, plan.planHash); assert.equal(retained.retainedActivePlan, true);
  assert.equal(applyDevelopmentPlan(plan, execution(fixture, plan)).runtimeWrites, 0);
  assert.equal(existsSync(join(fixture.work, "review-events")), false);
  assert.equal(applyDevelopmentPlan(plan, execution(fixture, plan, { rollback: true })).runtimeWrites, 2);
  for (const entry of plan.files) assert.equal(digest(readFileSync(join(fixture.root, entry.file))), entry.beforeHash);
  assert.equal(applyDevelopmentPlan(plan, execution(fixture, plan, { rollback: true })).runtimeWrites, 0);
  const formal = createLocalPlan(pilotContexts, { root: fixture.root, work: fixture.work });
  assert.ok(formal.blockers.some((entry) => entry.startsWith("human-field-approvals")));
  assert.throws(() => executeLocalRelease(formal, { ...fixture, execute: true, authorization: { confirmed: true, reviewerType: "human", reviewer: "test", action: "release", planHash: formal.planHash } }), /blocked/u);
});

test("later-file failure leaves explicit partial state that can resume or roll back with the same backup plan", (t) => {
  const fixture = setup(t), plan = fixture.createPlan();
  const failure = () => { throw new Error("isolated later-file failure"); };
  assert.throws(() => applyDevelopmentPlan(plan, execution(fixture, plan, { beforeFile: (_, index) => { if (index === 1) failure(); } })), /Recovery: resume/u);
  assert.match(developmentStatus(plan, fixture).status, /partial/u);
  assert.equal(applyDevelopmentPlan(plan, execution(fixture, plan)).status, "locally-applied-unreviewed");
  applyDevelopmentPlan(plan, execution(fixture, plan, { rollback: true }));
  assert.throws(() => applyDevelopmentPlan(plan, execution(fixture, plan, { beforeFile: (_, index) => { if (index === 1) failure(); } })), /partial/u);
  const rollback = applyDevelopmentPlan(plan, execution(fixture, plan, { rollback: true })); assert.equal(rollback.runtimeWrites, 1);
  assert.equal(rollback.status, "not-applied-or-rolled-back");
});

test("unknown runtime edits, forged manifests and damaged backups fail without overwriting unrelated content", (t) => {
  const fixture = setup(t), plan = fixture.createPlan(), entry = plan.files[0], target = join(fixture.root, entry.file), before = readFileSync(target);
  assert.throws(() => applyDevelopmentPlan({ ...plan, planHash: "wrong" }, fixture), /manifest hash/u);
  writeFileSync(target, Buffer.concat([before, Buffer.from("\n// unrelated edit")]));
  assert.throws(() => applyDevelopmentPlan(plan, execution(fixture, plan)), /unknown runtime/u); assert.ok(readFileSync(target, "utf8").endsWith("// unrelated edit"));
  writeFileSync(target, before);
  const backup = join(fixture.work, "dev-plans", plan.planHash, `${digest(entry.file)}.json`); writeFileSync(backup, JSON.stringify({ file: entry.file, before: "corrupt", after: "corrupt" }));
  assert.throws(() => applyDevelopmentPlan(plan, execution(fixture, plan)), /backup/u); assert.deepEqual(readFileSync(target), before);
});

test("unsupported source bindings are excluded rather than given fake approvals or guessed replacements", (t) => {
  const fixture = setup(t), contexts = structuredClone(pilotContexts);
  contexts.filter(({ usage }) => usage.recordId === "1.2-source-example-5").forEach(({ item }) => { item.source.sha256 = "0".repeat(64); });
  const plan = createDevelopmentPlan({ ...fixture, contexts });
  assert.equal(plan.eligibleCorrectionIds.length, 2); assert.equal(plan.files.flatMap((entry) => entry.changes).length, 5);
  assert.equal(plan.excluded[0].classification, "CONFLICT"); assert.equal(plan.formalHumanApproval, false);
});

test("source/crop hash and runtime dependency changes invalidate prepared batches", (t) => {
  const fixture = setup(t), plan = fixture.createPlan();
  const dependency = join(fixture.root, plan.dependencies[0].file), before = readFileSync(dependency); writeFileSync(dependency, "changed dependency");
  assert.throws(() => applyDevelopmentPlan(plan, execution(fixture, plan)), /dependency hash/u); writeFileSync(dependency, before);
  writeFileSync(join(fixture.root, plan.crops[0].file), "changed crop"); assert.throws(() => applyDevelopmentPlan(plan, execution(fixture, plan)), /crop\/dependency/u);
});

test("actual project retains its authorized V5.5 state and the existing fraction queue is never overwritten", () => {
  const report = JSON.parse(readFileSync(join(root, ".audit/source-first-v5/development-preview-v5.5.json"), "utf8"));
  assert.equal(report.summary.eligibleFields, 9); assert.equal(report.bulkFractionPreparation.count, 180); assert.equal(report.bulkFractionPreparation.newQueueCreated, false);
  const recovered = JSON.parse(readFileSync(join(root, ".audit/source-first-v5/recovery-v5.5.json"), "utf8"));
  for (const [file, hash] of Object.entries(recovered.runtimeHashes)) {
    const planFile=report.plan.files.find((entry)=>entry.file===file);
    assert.ok([hash,planFile?.afterHash].includes(digest(readFileSync(join(root,file)))),"Only original or explicitly authorized V5.5 bytes");
  }
});
