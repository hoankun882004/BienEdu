import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, openSync, closeSync, fsyncSync, renameSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { root as projectRoot, work as projectWork } from "./build.mjs";
import { digest, localFile, validateItem, sourceIdentityHash } from "./model.mjs";
import { classifyRuntimeMappings, loadMappingRuntime } from "./runtime-mappings.mjs";
import { compareMathematics } from "./comparison.mjs";
import { createLocalPlan, previewRuntimeFile, safeRuntimeFile, releaseDependencies } from "./local-release.mjs";
import { writeImmutableJson, loadReview } from "./review-store.mjs";
import { runSymbolicChecks, pilotSymbolicJobs } from "./symbolic.mjs";
import { renderMathText } from "../../assets/js/components/markdown-math-renderer.js";

export const devDependencies = [...releaseDependencies, ".content-work/source-first-v5/snapshot.json", "scripts/source-first/corrections-v53.json", "scripts/source-first/symbolic-check.py", "scripts/source-first/symbolic.mjs", "scripts/source-first/development.mjs", "scripts/source-first/validate-dev-runtime.mjs", "scripts/source-first/dev-browser-check.mjs", "scripts/source-first/local-release.mjs"];
const read = (root, file) => JSON.parse(readFileSync(localFile(root, file), "utf8"));
const planDirectory = (work, hash) => { if (!/^[A-F0-9]{64}$/u.test(hash)) throw new Error("Invalid development plan hash"); return join(work, "dev-plans", hash); };
const backupPath = (work, hash, file) => join(planDirectory(work, hash), `${digest(file)}.json`);

export function assertDevelopmentEnvironment({ root, development, env = process.env }) {
  if (development !== true || !existsSync(join(root, ".git")) || ![undefined, "", "development"].includes(env.NODE_ENV)
    || ["CI", "VERCEL", "VERCEL_ENV", "NETLIFY", "CF_PAGES", "GITHUB_ACTIONS"].some((key) => Boolean(env[key]))) throw new Error("Development-only execution requires --development, a local Git workspace and no production/CI environment");
}

export function createDevelopmentPlan({ root = projectRoot, work = projectWork, contexts = null, persist = true } = {}) {
  const registry = read(root, "scripts/source-first/corrections-v53.json").corrections;
  let comparisons = [];
  if (!contexts) {
    const snapshot = read(root, ".content-work/source-first-v5/snapshot.json");
    const loaded = snapshot.items.map((item) => loadReview(item, { root, work }));
    const items = loaded.map((entry) => entry.item), mappings = classifyRuntimeMappings(items, { runtime: loadMappingRuntime(root) });
    comparisons = compareMathematics(items, mappings, { root }).map((row) => ({ ...row, classification: row.classification === "MACHINE_MATCHED" ? "SOURCE_EXACT" : row.classification }));
    contexts = loaded.flatMap(({ item, staleReview }) => staleReview ? [] : mappings.find((row) => row.itemId === item.id).issues.length ? [] : mappings.find((row) => row.itemId === item.id).proposedChanges.map((usage) => ({ item, usage })));
  }
  const symbolicJobs = pilotSymbolicJobs(registry), symbolic = runSymbolicChecks(symbolicJobs);
  const replay = spawnSync("python", ["-X", "utf8", join(projectRoot, "scripts/import-foundation-documents.py"), "--review-candidates"], { encoding: "utf8", windowsHide: true, timeout: 20000, maxBuffer: 8*1024*1024 });
  const replayed = replay.status === 0 ? JSON.parse(replay.stdout) : null;
  const eligible = [], excluded = [];
  for (const correction of registry) {
    const candidates = contexts.filter(({ usage }) => usage.correctionId === correction.id);
    const reasons = [];
    if (candidates.length !== correction.fields.length || new Set(candidates.map(({ usage }) => usage.selector.fieldId)).size !== correction.fields.length) reasons.push("Incomplete/ambiguous changed-field mapping");
    for (const { item, usage } of candidates) {
      const field = correction.fields.find((field) => field.field === usage.selector.fieldId);
      if (!field || field.before !== usage.before || field.after !== usage.after || correction.sourceHash !== item.source.sha256 || correction.recordId !== usage.recordId || ["CD20", "CD21", "CD23"].includes(item.topicId)) reasons.push("Source/record/field binding conflict");
      if (validateItem(item, { root }).structure.status !== "passed") reasons.push("Original source/crop provenance invalid");
    }
    if (correction.recordId !== "knowledge:14.1") {
      const check = symbolic.checks.find((check) => check.id === correction.id);
      if (check?.status !== "passed") reasons.push(check?.status === "conflict" ? "Mathematical conflict in supported identity/domain/result checks" : "Supported symbolic identity/domain/result checks unavailable or unsupported");
      const record = replayed?.candidates.find((entry) => entry.record.id === correction.recordId)?.record;
      if (!record || correction.fields.some((field) => field.field === "source-solution.expression" ? record.steps.filter((step) => step.expression === field.after).length !== 1 : record[field.field] !== field.after)) reasons.push("Deterministic source re-import differs");
    } else {
      const item = candidates[0]?.item;
      // Source-bound p.34 text evidence supplements the preserved original crop;
      // it is not a generic OCR grouping inference.
      const result = item ? spawnSync("python", ["-X", "utf8", "-c", "import fitz,sys;d=fitz.open(sys.argv[1]);print(d[33].get_text())", localFile(root, item.source.file)], { encoding: "utf8", windowsHide: true, timeout: 10000 }) : null;
      if (result?.status !== 0 || !result.stdout.replace(/\s/gu, "").includes("a<b")) reasons.push("Source-printed bound order not independently located on p.34");
    }
    if (reasons.length) excluded.push({ correctionId: correction.id, classification: reasons.some((reason) => /conflict|differs|invalid/iu.test(reason)) ? "CONFLICT" : "AMBIGUOUS", reasons: [...new Set(reasons)] });
    else eligible.push(...candidates);
  }
  const preview = createLocalPlan(eligible, { root, work, readFormalReviews: false });
  const dependencies = devDependencies.map((file) => ({ file, hash: digest(readFileSync(localFile(root, file))) }));
  const sources = [...new Map(eligible.map(({ item }) => [item.source.file, { file: item.source.file, hash: item.source.sha256 }])).values()];
  const crops = [...new Map(eligible.flatMap(({ item }) => item.assetReferences.map((asset) => [asset.path, { file: asset.path, hash: asset.sha256 }]))).values()];
  const body = { schemaVersion: "bienedu.development-batch.v5.5", mode: "local-development-experiment", formalHumanApproval: false, productionPublication: false,
    files: preview.files.map((entry) => ({ ...entry, changes: entry.changes.map(({ approvalEventHash, ...change }) => change) })), dependencies, sources, crops,
    symbolicJobs, symbolic, pdfReplayHash: replayed ? digest(replayed) : null, excluded, eligibleCorrectionIds: [...new Set(eligible.map(({ usage }) => usage.correctionId))],
    classifications: comparisons.map((row) => ({ itemId: row.itemId, classification: excluded.find((entry) => registry.find((record) => record.id === entry.correctionId)?.benchmarkItemId === row.itemId)?.classification ?? row.classification, evidence: row })),
    rollbackPolicy: "Same immutable plan; file-level atomic replacements; resume apply or rollback known after-states after partial failure; no multi-file atomicity" };
  const plan = { ...body, planHash: digest(body) };
  if (persist) {
    for (const entry of plan.files) {
      const before = readFileSync(safeRuntimeFile(root, entry.file), "utf8"), after = previewRuntimeFile(before, entry.file, entry.changes);
      if (digest(before) !== entry.beforeHash || digest(after) !== entry.afterHash) throw new Error("Stale preview while saving immutable backups");
      writeImmutableJson(backupPath(work, plan.planHash, entry.file), { file: entry.file, before, after });
    }
    writeImmutableJson(join(planDirectory(work, plan.planHash), "manifest.json"), plan);
  }
  return plan;
}

function validatePlan(plan, { root, work, symbolic = true }) {
  const { planHash, ...body } = plan;
  if (plan.schemaVersion !== "bienedu.development-batch.v5.5" || digest(body) !== planHash || plan.mode !== "local-development-experiment" || plan.formalHumanApproval !== false || plan.productionPublication !== false) throw new Error("Invalid development manifest hash/mode");
  if (!plan.files.length || new Set(plan.files.map((entry) => entry.file)).size !== plan.files.length) throw new Error("Empty/duplicate development file batch");
  if (JSON.stringify(plan.dependencies.map((entry) => entry.file)) !== JSON.stringify(devDependencies)) throw new Error("Development dependency set mismatch");
  for (const entry of [...plan.dependencies, ...plan.sources, ...plan.crops]) if (digest(readFileSync(localFile(root, entry.file))) !== entry.hash) throw new Error("Stale development source/crop/dependency hash");
  const registry = read(root, "scripts/source-first/corrections-v53.json").corrections;
  if (digest(plan.symbolicJobs) !== digest(pilotSymbolicJobs(registry)) || symbolic && digest(runSymbolicChecks(plan.symbolicJobs)) !== digest(plan.symbolic)) throw new Error("Symbolic evidence changed or unsupported");
  const snapshot = read(root, ".content-work/source-first-v5/snapshot.json"), targets = new Set();
  for (const entry of plan.files) {
    safeRuntimeFile(root, entry.file);
    const backup = JSON.parse(readFileSync(backupPath(work, plan.planHash, entry.file), "utf8"));
    if (backup.file !== entry.file || digest(backup.before) !== entry.beforeHash || digest(backup.after) !== entry.afterHash || previewRuntimeFile(backup.before, entry.file, entry.changes) !== backup.after) throw new Error("Development backup/preview mismatch");
    for (const change of entry.changes) {
      const correction = registry.find((record) => record.id === change.correctionId && record.recordId === change.recordId);
      const sourceItem = snapshot.items.find((item) => item.id === correction?.benchmarkItemId);
      const field = correction?.fields.find((field) => field.field === change.fieldId);
      if (!field || !sourceItem || digest(sourceItem.source) !== digest(change.source) || change.binding.sourceIdentityHash !== sourceIdentityHash(sourceItem) || change.binding.itemVersion !== sourceItem.contentVersion
        || field.before !== change.before || field.after !== change.after || correction.sourceHash !== change.source.sha256
        || change.binding.origin !== entry.file || change.binding.originHash !== entry.beforeHash || change.binding.beforeHash !== digest(change.before) || change.binding.afterHash !== digest(change.after)
        || change.binding.recordId !== change.recordId || change.binding.fieldId !== change.fieldId || ["CD20", "CD21", "CD23"].includes(change.binding.topicId)
        || !plan.sources.some((source) => source.file === change.source.file && source.hash === change.source.sha256) || targets.has(change.binding.targetId)) throw new Error("Unbound/duplicate/protected development field");
      targets.add(change.binding.targetId);
      for (const asset of sourceItem.assetReferences) if (!plan.crops.some((entry) => entry.file === asset.path && entry.hash === asset.sha256)) throw new Error("Missing original source crop evidence");
      if (change.recordId !== "knowledge:14.1" && plan.symbolic.checks.find((check) => check.id === change.correctionId)?.status !== "passed") throw new Error("Unsupported mathematical correction");
    }
  }
  const changes = plan.files.flatMap((entry) => entry.changes), actualIds = [...new Set(changes.map((entry) => entry.correctionId))].sort();
  if (JSON.stringify(actualIds) !== JSON.stringify([...plan.eligibleCorrectionIds].sort()) || actualIds.some((id) => changes.filter((entry) => entry.correctionId === id).length !== registry.find((entry) => entry.id === id)?.fields.length)) throw new Error("Incomplete correction group in development batch");
  return plan;
}

export function prepareDevelopmentPreview(options = {}) {
  const root = options.root ?? projectRoot, work = options.work ?? projectWork;
  const latest = join(root, ".audit/source-first-v5/development-preview-v5.5.json");
  if (existsSync(latest)) {
    const previous = JSON.parse(readFileSync(latest, "utf8"));
    const status = developmentStatus(previous.plan, { root, work });
    // Never lose the rollback pointer by preparing an empty plan after a local
    // application, or by silently rebasing over an interrupted/unknown edit.
    if (status.status !== "not-applied-or-rolled-back") {
      validatePlan(previous.plan, { root, work });
      const retained = { ...previous, status, retainedActivePlan: true };
      writeFileSync(latest, JSON.stringify(retained, null, 2) + "\n");
      return retained;
    }
  }
  const plan = createDevelopmentPlan({ ...options, root, work });
  const previous = read(root, ".audit/math-content-v5-checkpoint.json"), entities = read(root, ".audit/source-first-v5/verification-v5.1.json").reviewEntities;
  const fractions = previous.textIssues.filter((entry) => entry.rule === "plain-fraction-candidate").map((entry) => {
    const reference = `${entry.id}:${entry.field}`, entity = entities.find((entity) => entity.references.includes(reference));
    const change = plan.files.flatMap((file) => file.changes).find((change) => change.recordId === entry.id && change.fieldId === entry.field);
    return { reference, existingEntityKey: entity?.key ?? null, classification: change ? "CONFIRMED_CONVERSION_DEFECT" : "AMBIGUOUS", eligibleForThisPilot: Boolean(change), reason: change ? "Exact existing pilot field; no extra write target" : "No uniquely source-bound replacement for this existing flag; preserve uncertainty" };
  });
  const report = { schemaVersion: "bienedu.development-preview.v5.5", plan, status: developmentStatus(plan, { root, work }),
    summary: { eligibleCorrections: plan.eligibleCorrectionIds.length, eligibleFields: plan.files.reduce((sum, entry) => sum+entry.changes.length, 0), files: plan.files.length, excludedCorrections: plan.excluded.length,
      classifications: Object.fromEntries(["SOURCE_EXACT", "VERIFIED_BY_SUPPORTED_CHECKS", "CONFIRMED_CONVERSION_DEFECT", "AMBIGUOUS", "CONFLICT"].map((classification) => [classification, plan.classifications.filter((row) => row.classification === classification).length])) },
    formalHumanApproval: false, productionPublication: false, bulkFractionPreparation: { source: ".audit/math-content-v5-checkpoint.json#textIssues", count: fractions.length, entries: fractions, newQueueCreated: false },
    applyCommand: `npm.cmd run content:dev:apply -- --development --execute --authorize ${plan.planHash}`,
    rollbackCommand: `npm.cmd run content:dev:rollback -- --development --execute --authorize ${plan.planHash}`,
    immutablePlan: `.content-work/source-first-v5/dev-plans/${plan.planHash}/manifest.json`,
    rollbackLocation: `.content-work/source-first-v5/dev-plans/${plan.planHash}/`, limitation: "Machine-supported local experiment; no formal human review or production publication." };
  writeFileSync(join(root, ".audit/source-first-v5/development-preview-v5.5.json"), JSON.stringify(report, null, 2) + "\n");
  const escape = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>BienEdu · Bản xem trước local V5.5</title><link rel="stylesheet" href="../../assets/styles.css"><link rel="stylesheet" href="../../assets/vendor/katex/katex.min.css"><style>body{padding:24px;max-width:1200px;margin:auto;background:#f4f7fb;color:#10213d}section{background:white;padding:20px;margin:16px 0;border:1px solid #d4deec}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}.preview-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}.preview-columns>div{min-width:0;overflow-x:auto}h1{font-size:28px}@media(max-width:700px){.preview-columns{grid-template-columns:1fr}body{padding:12px}}</style><h1>Biển Edu · Thử bản sửa local</h1><p><strong>CHƯA ÁP DỤNG — KHÔNG PHẢI PHÊ DUYỆT HAY PHÁT HÀNH PRODUCTION</strong></p><p>${report.summary.eligibleCorrections} bản sửa · ${report.summary.eligibleFields} trường · ${report.summary.files} file</p><pre>${escape(report.applyCommand)}</pre>${plan.files.map((file) => `<h2>${escape(file.file)}</h2><pre>Before: ${file.beforeHash}\nAfter: ${file.afterHash}</pre>${file.changes.map((change) => `<section><h3>${escape(change.recordId)} · ${escape(change.fieldId)}</h3><p>Nguồn: ${escape(change.source.file)} · SHA ${change.source.sha256}</p><div class="preview-columns"><div><h4>Hiện có</h4>${renderMathText(change.before)}<pre>${escape(change.before)}</pre></div><div><h4>Đề xuất local</h4>${renderMathText(change.after)}<pre>${escape(change.after)}</pre></div></div></section>`).join("")}`).join("")}<h2>Kiểm tra toán học được hỗ trợ</h2><pre>${escape(JSON.stringify(plan.symbolic, null, 2))}</pre><h2>Hoàn tác</h2><pre>${escape(report.rollbackCommand)}\n${escape(report.rollbackLocation)}</pre></html>`;
  writeFileSync(join(root, ".audit/source-first-v5/development-preview-v5.5.html"), html);
  return report;
}

export function readDevelopmentOverview({ root = projectRoot, work = projectWork } = {}) {
  const path = join(root, ".audit/source-first-v5/development-preview-v5.5.json");
  if (!existsSync(path)) return { prepared: false, command: "npm.cmd run content:dev:preview" };
  const report = JSON.parse(readFileSync(path, "utf8"));
  const stale = report.plan.dependencies.some((entry) => !existsSync(localFile(root, entry.file)) || digest(readFileSync(localFile(root, entry.file))) !== entry.hash);
  const status = developmentStatus(report.plan, { root, work });
  return { prepared: true, stale, summary: report.summary, status, symbolic: report.plan.symbolic,
    files: report.plan.files.map((file) => ({ ...file, changes: file.changes.map((change) => ({ ...change, current: status.files.find((entry) => entry.file === file.file)?.state === "after" ? change.after : status.files.find((entry) => entry.file === file.file)?.state === "before" ? change.before : null })) })),
    excluded: report.plan.excluded, applyCommand: report.applyCommand, rollbackCommand: report.rollbackCommand, formalHumanApproval: false, productionPublication: false };
}

function validateLearner(plan, root, phase) {
  const result = spawnSync(process.execPath, [join(projectRoot, "scripts/source-first/validate-dev-runtime.mjs")], { input: JSON.stringify({ root, changes: plan.files.flatMap((entry) => entry.changes), phase }), encoding: "utf8", windowsHide: true, timeout: 20000, maxBuffer: 4*1024*1024 });
  if (result.status !== 0) throw new Error(`Post-application learner validation failed: ${result.stderr}`);
  return JSON.parse(result.stdout);
}

export function developmentStatus(plan, { root, work }) {
  const files = plan.files.map((entry) => { const hash = digest(readFileSync(safeRuntimeFile(root, entry.file))); return { file: entry.file, state: hash === entry.beforeHash ? "before" : hash === entry.afterHash ? "after" : "conflict" }; });
  return { planHash: plan.planHash, mode: "local-development-experiment", formalHumanApproval: false, productionPublication: false, files,
    status: files.some((entry) => entry.state === "conflict") ? "conflict" : files.every((entry) => entry.state === "after") ? "locally-applied-unreviewed" : files.every((entry) => entry.state === "before") ? "not-applied-or-rolled-back" : "partial-application; resume or rollback same plan" };
}

export function applyDevelopmentPlan(plan, { root = projectRoot, work = projectWork, execute = false, authorize = null, development = false, env = process.env, rollback = false, beforeFile = null } = {}) {
  if (execute) {
    assertDevelopmentEnvironment({ root, development, env });
    if (authorize !== plan.planHash) throw new Error("Explicit exact development manifest hash authorization required");
  }
  validatePlan(plan, { root, work });
  const initial = developmentStatus(plan, { root, work });
  if (!execute) return { ...initial, dryRun: true, runtimeWrites: 0 };
  if (initial.status === "conflict") throw new Error("Stale/unknown runtime edit; no local changes written");
  const lock = join(work, ".local-release.lock"), descriptor = openSync(lock, "wx");
  const journal = join(work, "dev-experiments", plan.planHash); mkdirSync(journal, { recursive: true });
  let writes = 0;
  try {
    const event = { planHash: plan.planHash, mode: "local-development-experiment", action: rollback ? "rollback" : "apply", executedAt: new Date().toISOString(), humanEditorialApproval: false };
    writeImmutableJson(join(journal, `${Date.now()}-${randomBytes(6).toString("hex")}-intent.json`), event);
    for (const [index, entry] of (rollback ? [...plan.files].reverse() : plan.files).entries()) {
      const target = safeRuntimeFile(root, entry.file), desired = rollback ? entry.beforeHash : entry.afterHash, expected = rollback ? entry.afterHash : entry.beforeHash;
      if (digest(readFileSync(target)) === desired) continue;
      if (beforeFile) beforeFile(entry, index);
      validatePlan(plan, { root, work, symbolic: false });
      if (digest(readFileSync(target)) !== expected) throw new Error("Concurrent development runtime edit; stopped without overwriting it");
      const backup = JSON.parse(readFileSync(backupPath(work, plan.planHash, entry.file), "utf8")), temporary = join(dirname(target), `.bienedu-dev-${randomBytes(8).toString("hex")}.tmp`);
      try {
        const handle = openSync(temporary, "wx");
        try { writeFileSync(handle, rollback ? backup.before : backup.after, "utf8"); fsyncSync(handle); } finally { closeSync(handle); }
        if (digest(readFileSync(target)) !== expected) throw new Error("Concurrent edit before atomic development replacement");
        renameSync(temporary, target); writes++;
      } finally { if (existsSync(temporary)) unlinkSync(temporary); }
    }
    const validation = validateLearner(plan, root, rollback ? "before" : "after");
    const state = developmentStatus(plan, { root, work });
    writeImmutableJson(join(journal, `${Date.now()}-${randomBytes(6).toString("hex")}-validated.json`), { ...event, state, validation, runtimeWrites: writes });
    return { ...state, runtimeWrites: writes, validation, dryRun: false };
  } catch (error) {
    const state = developmentStatus(plan, { root, work });
    writeImmutableJson(join(journal, `${Date.now()}-${randomBytes(6).toString("hex")}-interrupted.json`), { planHash: plan.planHash, state, runtimeWrites: writes, error: error.message });
    throw new Error(`${error.message}. Recovery: resume dev-apply or dev-rollback with the SAME manifest/hash; backups preserved. State=${state.status}`);
  } finally { closeSync(descriptor); unlinkSync(lock); }
}
