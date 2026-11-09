import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, openSync, closeSync, fsyncSync, renameSync, unlinkSync, lstatSync, realpathSync } from "node:fs";
import { join, dirname, resolve, relative, isAbsolute } from "node:path";
import { randomBytes } from "node:crypto";
import { digest, localFile } from "./model.mjs";
import { readJsonObjectAfter } from "./runtime-target.mjs";
import { resolveExampleField } from "./runtime-mappings.mjs";
import { fieldBinding, readFieldApproval, assertStoredFieldApproval } from "./field-review.mjs";
import { writeImmutableJson } from "./review-store.mjs";
import { renderMathText } from "../../assets/js/components/markdown-math-renderer.js";

const foundation = "assets/js/data/foundation-lessons.generated.js", calculus = "assets/js/data/calculus-knowledge-details.js";
const allowedFiles = new Set([foundation, calculus]);
export const releaseDependencies = ["assets/js/data/knowledge-content.js", "assets/js/data/example-content.js", "assets/js/data/calculus-lessons.js", "assets/js/components/markdown-math-renderer.js", "assets/js/curriculum.js", "assets/vendor/katex/katex.mjs"];
function replaceJsonStrings(source, start, replacements) {
  let cursor = start;
  const spans = [];
  const whitespace = () => { while (/\s/u.test(source[cursor] ?? "")) cursor++; };
  const string = () => { const begin = cursor++; while (cursor < source.length) { if (source[cursor] === "\\") cursor += 2; else if (source[cursor++] === '"') return { begin, end: cursor, value: JSON.parse(source.slice(begin, cursor)) }; } throw new Error("Unclosed JSON string"); };
  const value = (path) => {
    whitespace();
    if (source[cursor] === '"') { const token = string(), replacement = replacements.get(JSON.stringify(path)); if (replacement) { if (token.value !== replacement.before) throw new Error("Stale JSON field"); spans.push({ ...token, after: JSON.stringify(replacement.after) }); } }
    else if (source[cursor] === "{") {
      cursor++; whitespace(); if (source[cursor] === "}") { cursor++; return; }
      while (true) { whitespace(); if (source[cursor] !== '"') throw new Error("Invalid JSON property"); const key = string().value; whitespace(); if (source[cursor++] !== ":") throw new Error("Invalid JSON colon"); value([...path, key]); whitespace(); const next = source[cursor++]; if (next === "}") break; if (next !== ",") throw new Error("Invalid JSON object"); }
    } else if (source[cursor] === "[") {
      cursor++; whitespace(); if (source[cursor] === "]") { cursor++; return; } let index = 0;
      while (true) { value([...path, index++]); whitespace(); const next = source[cursor++]; if (next === "]") break; if (next !== ",") throw new Error("Invalid JSON array"); }
    } else { const begin = cursor; while (cursor < source.length && !/[\s,}\]]/u.test(source[cursor])) cursor++; if (cursor === begin) throw new Error("Invalid JSON primitive"); JSON.parse(source.slice(begin, cursor)); }
  };
  value([]);
  if (spans.length !== replacements.size) throw new Error("JSON field path did not resolve uniquely");
  let output = source;
  for (const span of spans.sort((a, b) => b.begin-a.begin)) output = output.slice(0, span.begin) + span.after + output.slice(span.end);
  return output;
}
export function safeRuntimeFile(root, file) {
  if (!allowedFiles.has(file)) throw new Error("Unsupported runtime file");
  const target = localFile(root, file), rel = relative(realpathSync(root), realpathSync(target));
  if (lstatSync(target).isSymbolicLink() || !rel || rel.startsWith("..") || isAbsolute(rel)) throw new Error("Runtime path escapes workspace");
  return target;
}

// Source editing is deliberately limited to two known storage formats. Never
// evaluate JavaScript, infer array IDs, or replace text outside a named record.
export function previewRuntimeFile(source, file, changes) {
  if (!allowedFiles.has(file)) throw new Error("Unsupported runtime adapter");
  if (file === foundation) {
    const marker = "const examples = ", examples = readJsonObjectAfter(source, marker);
    const replacements = new Map();
    for (const change of changes) {
      const code = change.recordId.split("-")[0];
      const records = examples[code]?.filter((entry) => entry.id === change.recordId && entry.sourceBlockId === change.sourceBlockId) ?? [];
      if (records.length !== 1) throw new Error("Stable Example/source block mismatch");
      const record = records[0];
      if (change.binding && digest(record) !== change.binding.recordHash) throw new Error("Runtime record version/hash mismatch");
      const result = resolveExampleField(record, change.fieldId);
      if (result.before !== change.before) throw new Error("Stale semantic field value");
      const path = [code, examples[code].indexOf(record), ...result.path], key = JSON.stringify(path);
      if (replacements.has(key)) throw new Error("Duplicate semantic field");
      replacements.set(key, { before: change.before, after: change.after });
    }
    const offset = source.indexOf(marker) + marker.length;
    // Replace only resolved string-token spans; preserve numeric spellings,
    // whitespace, figures, other examples and all surrounding JavaScript bytes.
    return replaceJsonStrings(source, offset, replacements);
  }
  let output = source;
  for (const change of changes) {
    if (change.recordId !== "knowledge:14.1" || change.fieldId !== "formula:area-with-Ox.detail") throw new Error("Unsupported curated field");
    const marker = '  "14.1": {', start = output.indexOf(marker), end = output.indexOf('\n  "14.2": {', start);
    if (start < 0 || end < 0 || output.indexOf(marker, start + marker.length) >= 0) throw new Error("Ambiguous curated record boundary");
    const block = output.slice(start, end), lines = block.split("\n");
    const matching = lines.map((line, index) => ({ line, index })).filter(({ line }) => line.includes(`label: ${JSON.stringify(change.formulaLabel)}`));
    const oldLiteral = `detail: ${JSON.stringify(change.before)}`;
    if (matching.length !== 1 || matching[0].line.split(oldLiteral).length !== 2 || !matching[0].line.trim().startsWith("{ label:")) throw new Error("Ambiguous curated formula/detail");
    lines[matching[0].index] = matching[0].line.replace(oldLiteral, `detail: ${JSON.stringify(change.after)}`);
    output = output.slice(0, start) + lines.join("\n") + output.slice(end);
  }
  return output;
}

export function createLocalPlan(contexts, { root, work, file = null, readFormalReviews = true }) {
  if (file && !allowedFiles.has(file)) throw new Error("Unsupported release file");
  const groups = new Map();
  for (const { item, usage } of contexts.filter(({ usage }) => usage.changed && (!file || usage.origin === file))) {
    if (!usage.correctionSource || ["CD20", "CD21", "CD23"].includes(item.topicId)) throw new Error("Protected or unbound correction");
    const binding = fieldBinding(item, usage, { root }), review = readFormalReviews ? readFieldApproval(binding, { work }) : { mathematicalApproved: false, sourceVerified: false };
    const change = { binding, recordId: usage.recordId, fieldId: usage.selector.fieldId, sourceBlockId: usage.sourceBlockId,
      formulaLabel: usage.selector.formulaLabel ?? null, before: usage.before, after: usage.after, source: item.source,
      correctionId: usage.correctionId, approvalEventHash: review.mathematicalApproved && review.sourceVerified ? review.eventHash : null };
    if (!groups.has(usage.origin)) groups.set(usage.origin, []);
    groups.get(usage.origin).push(change);
  }
  const files = [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([file, changes]) => {
    changes.sort((a, b) => a.binding.targetId.localeCompare(b.binding.targetId));
    const bytes = readFileSync(safeRuntimeFile(root, file)), after = previewRuntimeFile(bytes.toString("utf8"), file, changes);
    return { file, beforeHash: digest(bytes), afterHash: digest(after), changes };
  });
  const blockers = [];
  if (!files.length) blockers.push("no-changed-pilot-fields");
  if (files.length > 1) blockers.push("multi-file-atomicity-unavailable; select one --file per transaction");
  for (const entry of files) for (const change of entry.changes) {
    if (!change.approvalEventHash) blockers.push(`human-field-approvals-required:${change.binding.targetId}`);
    if (digest(readFileSync(localFile(root, change.source.file))) !== change.source.sha256) blockers.push("source-hash-mismatch");
    if (/math-render-error|katex-error/u.test(renderMathText(change.after))) blockers.push("candidate-render-failed");
  }
  const dependencies = releaseDependencies.map((file) => ({ file, hash: digest(readFileSync(localFile(root, file))) }));
  const body = { schemaVersion: "bienedu.local-release.v5.4", mode: "dry-run", files, dependencies, blockers, authorization: "not-granted", runtimeWrites: 0 };
  return { ...body, planHash: digest(body) };
}

function validateManifest(plan, { root, work }) {
  const { planHash, ...body } = plan;
  if (plan.schemaVersion !== "bienedu.local-release.v5.4" || digest(body) !== planHash || plan.mode !== "dry-run" || plan.files?.length !== 1 || plan.blockers?.length) throw new Error("Invalid/blocked local release manifest");
  const entry = plan.files[0]; safeRuntimeFile(root, entry.file);
  if (JSON.stringify(plan.dependencies?.map((entry) => entry.file)) !== JSON.stringify(releaseDependencies)
    || plan.dependencies.some((entry) => digest(readFileSync(localFile(root, entry.file))) !== entry.hash)) throw new Error("Stale runtime loader/renderer dependency version");
  const registry = JSON.parse(readFileSync(join(root, "scripts/source-first/corrections-v53.json"), "utf8")).corrections;
  const seen = new Set();
  for (const change of entry.changes) {
    if (seen.has(change.binding.targetId)) throw new Error("Duplicate field in manifest"); seen.add(change.binding.targetId);
    const correction = registry.find((record) => record.id === change.correctionId && record.recordId === change.recordId
      && (record.sourceBlockId === change.sourceBlockId || record.recordId === "knowledge:14.1" && change.sourceBlockId === null));
    const exact = correction?.fields.find((field) => field.field === change.fieldId && field.before === change.before && field.after === change.after);
    if (!exact || correction.sourceHash !== change.source.sha256 || correction.sourceDocumentId !== change.source.documentId
      || change.binding.origin !== entry.file || change.binding.originHash !== entry.beforeHash || change.binding.recordId !== change.recordId || change.binding.fieldId !== change.fieldId
      || change.binding.sourceHash !== change.source.sha256 || change.binding.sourceFile !== change.source.file
      || change.binding.beforeHash !== digest(change.before) || change.binding.afterHash !== digest(change.after)
      || ["CD20", "CD21", "CD23"].includes(change.binding.topicId)) throw new Error("Unbound/protected release field");
    if (digest(readFileSync(localFile(root, change.source.file))) !== change.source.sha256) throw new Error("Source hash mismatch");
    assertStoredFieldApproval(change.binding, change.approvalEventHash, { work });
  }
  return entry;
}

// Local same-filesystem single-file transaction. A durable immutable intent and
// backup precede the one atomic rename. Crashes after rename can be reconciled
// from hashes/intent on retry. Cooperative writers share the workspace lock.
export function executeLocalRelease(plan, { root, work, execute = false, authorization = null, rollback = false, beforeCommit = null } = {}) {
  const { planHash, ...body } = plan;
  if (plan.schemaVersion !== "bienedu.local-release.v5.4" || digest(body) !== planHash || plan.mode !== "dry-run") throw new Error("Invalid local release plan hash/schema");
  if (!execute) return { mode: "dry-run", planHash: plan.planHash, runtimeWrites: 0, blockers: plan.blockers };
  if (authorization?.confirmed !== true || authorization.reviewerType !== "human" || !authorization.reviewer?.trim()
    || authorization.planHash !== plan.planHash || authorization.action !== (rollback ? "rollback" : "release")) throw new Error("Explicit plan-bound human publication authorization required");
  const entry = validateManifest(plan, { root, work }), target = safeRuntimeFile(root, entry.file);
  const directory = join(work, "release-events", plan.planHash); mkdirSync(directory, { recursive: true });
  const lock = join(work, ".local-release.lock"), descriptor = openSync(lock, "wx");
  const backup = join(directory, "before.json"), intent = join(directory, "intent.json"), receipt = join(directory, rollback ? "rollback.json" : "applied.json");
  let temporary = null;
  try {
    let current = readFileSync(target), currentHash = digest(current);
    if (rollback && !existsSync(intent)) throw new Error("No release intent to roll back");
    if (!rollback && existsSync(join(directory, "rollback.json"))) throw new Error("Rolled-back manifest cannot be reused; review a new version");
    if (existsSync(intent)) {
      const stored = JSON.parse(readFileSync(intent, "utf8"));
      if (stored.planHash !== plan.planHash || digest(stored.manifest) !== digest(plan)) throw new Error("Release intent mismatch");
    }
    const expected = rollback ? entry.afterHash : entry.beforeHash, desired = rollback ? entry.beforeHash : entry.afterHash;
    if (currentHash === desired && existsSync(intent)) {
      const saved = JSON.parse(readFileSync(backup, "utf8"));
      if (digest(saved.content) !== entry.beforeHash) throw new Error("Backup hash mismatch");
      writeImmutableJson(receipt, { planHash: plan.planHash, action: rollback ? "rollback" : "release", contentHash: desired });
      return { mode: "already-applied", planHash: plan.planHash, runtimeWrites: 0 };
    }
    if (currentHash !== expected) throw new Error("Stale runtime hash; no write");
    let next;
    if (rollback) {
      const saved = JSON.parse(readFileSync(backup, "utf8"));
      if (digest(saved.content) !== entry.beforeHash) throw new Error("Backup hash mismatch");
      next = saved.content;
    } else {
      next = previewRuntimeFile(current.toString("utf8"), entry.file, entry.changes);
      if (digest(next) !== entry.afterHash) throw new Error("Runtime preview hash mismatch");
      writeImmutableJson(backup, { content: current.toString("utf8"), hash: currentHash });
      writeImmutableJson(intent, { planHash: plan.planHash, manifest: plan, authorization });
    }
    temporary = join(dirname(target), `.bienedu-${plan.planHash.slice(0, 12)}-${randomBytes(6).toString("hex")}.tmp`);
    const handle = openSync(temporary, "wx");
    try { writeFileSync(handle, next, "utf8"); fsyncSync(handle); } finally { closeSync(handle); }
    if (beforeCommit) beforeCommit(); // failure injection for isolated fixtures
    validateManifest(plan, { root, work });
    if (digest(readFileSync(target)) !== expected) throw new Error("Concurrent runtime edit; no replacement");
    renameSync(temporary, target); temporary = null;
    writeImmutableJson(receipt, { planHash: plan.planHash, action: rollback ? "rollback" : "release", contentHash: desired });
    return { mode: rollback ? "rolled-back" : "released", planHash: plan.planHash, runtimeWrites: 1, file: entry.file };
  } finally {
    if (temporary && existsSync(temporary)) unlinkSync(temporary);
    closeSync(descriptor); unlinkSync(lock);
  }
}

export function localReleaseState({ root, work }) {
  const directory = join(work, "release-events"), transactions = [];
  for (const name of existsSync(directory) ? readdirSync(directory).filter((name) => /^[A-F0-9]{64}$/u.test(name)) : []) {
    try {
      const intent = JSON.parse(readFileSync(join(directory, name, "intent.json"), "utf8"));
      if (intent.planHash !== name) throw new Error("Intent identity mismatch");
      const entry = validateManifest(intent.manifest, { root, work });
      if (intent.authorization?.confirmed !== true || intent.authorization.reviewerType !== "human" || !intent.authorization.reviewer?.trim() || intent.authorization.planHash !== name || intent.authorization.action !== "release") throw new Error("Missing publication authorization evidence");
      const hash = digest(readFileSync(safeRuntimeFile(root, entry.file)));
      const receiptValid = (file, action, hash) => { const path = join(directory, name, file); if (!existsSync(path)) return false; const receipt = JSON.parse(readFileSync(path, "utf8")); if (receipt.planHash !== name || receipt.action !== action || receipt.contentHash !== hash) throw new Error("Invalid publication receipt"); return true; };
      const active = hash === entry.afterHash && receiptValid("applied.json", "release", entry.afterHash);
      transactions.push({ planHash: name, file: entry.file, status: active ? "active-local-release" : hash === entry.beforeHash && receiptValid("rollback.json", "rollback", entry.beforeHash) ? "rolled-back" : "pending-or-stale",
        correctionIds: [...new Set(entry.changes.map((change) => change.correctionId))] });
    } catch (error) { transactions.push({ planHash: name, status: "invalid-evidence", reason: error.message }); }
  }
  return { transactions, activeCorrectionIds: [...new Set(transactions.filter((entry) => entry.status === "active-local-release").flatMap((entry) => entry.correctionIds))],
    realHumanApprovalsInferred: false };
}
