import { readFileSync } from "node:fs";
import { join } from "node:path";
import { digest, reviewWorkflow, validateItem, sourceIdentityHash } from "./model.mjs";
import { renderKnowledgeMarkdown } from "../../assets/js/components/markdown-math-renderer.js";
import { readRuntimeTarget, runtimeFile } from "./runtime-target.mjs";
import { expressionKey, resolveFormulaFields } from "./runtime-mappings.mjs";
import { benchmarkFixtures } from "./fixtures.mjs";

export const publicationBindings = Object.freeze(Object.fromEntries(["22.1", "22.2", "22.4", "22.5", "22.7"].map((code) => [`tex-${code}`, Object.freeze({ code, fieldId: `knowledge:${code}:native-formula`, formulaLabel: "Công thức", expressionKey: expressionKey(benchmarkFixtures.find((item) => item.id === `tex-${code}`).latex), file: "assets/js/data/latex-pilot.generated.js" })])));

export function publicationDryRun(items, { root, bindings = publicationBindings, expectedRuntimeHash = null, staleItemIds = [], basePlan = null, runtimeMappings = [] } = {}) {
  if (basePlan) { const { planHash, ...body } = basePlan; if (digest(body) !== planHash || basePlan.schemaVersion !== "bienedu.publication-dry-run.v5.2") throw new Error("Invalid base plan/version/hash"); }
  const runtime = readRuntimeTarget(root);
  const runtimeHash = runtime.hash;
  const dependencyFiles = ["assets/js/data/knowledge-content.js", "assets/js/components/markdown-math-renderer.js", "assets/js/curriculum.js", "assets/vendor/katex/katex.mjs"];
  const dependencies = dependencyFiles.map((file) => { try { return { file, hash: digest(readFileSync(join(root, file))) }; } catch { return { file, hash: null }; } });
  const dependenciesValid = dependencies.every((entry) => entry.hash) && readFileSync(join(root, dependencyFiles[0]), "utf8").includes("...latexPilotKnowledgeContent");
  const changes = [];
  for (const item of items) {
    const binding = bindings[item.id];
    const mapping = runtimeMappings.find((row) => row.itemId === item.id);
    const review = reviewWorkflow(item);
    const checks = validateItem(item, { root });
    const blockers = [];
    if (!binding && !mapping?.usages.length) blockers.push("no-approved-runtime-binding");
    // A benchmark-expression review cannot approve changes to entire prompts,
    // solutions or companion conditions. These exact diffs are reviewable, but
    // remain blocked until field-scoped human evidence can be applied safely.
    if (!binding && mapping?.usages.length) blockers.push("exact-target-human-review-required", "atomic-multi-source-publication-unavailable");
    if (mapping?.issues.length) blockers.push("ambiguous-runtime-mapping");
    if (["CD20", "CD21"].includes(item.topicId)) blockers.push("protected-topic");
    if (item.topicId === "CD23") blockers.push("CD23-unpublished");
    if (!review.humanSourceVerified) blockers.push("human-source-verification-required");
    if (!review.editorialApproved) blockers.push("human-mathematical-approval-required");
    if (!review.versionBound) blockers.push("version-bound-human-review-required");
    if (!item.audit?.length || item.review?.status !== "source-verified") blockers.push("approved-review-patch-required");
    if (checks.syntax.status !== "passed") blockers.push("invalid-latex");
    if (checks.structure.status !== "passed") blockers.push("invalid-source-or-structure");
    if (checks.consistency.status === "failed" || item.sourceConflict === true || ["confirmed-error", "needs-correction", "unresolved-ambiguity"].includes(item.review?.status)) blockers.push("unresolved-source-conflict");
    if (staleItemIds.includes(item.id)) blockers.push("stale-review-history");
    if (expectedRuntimeHash && expectedRuntimeHash !== runtimeHash) blockers.push("stale-runtime-base");
    if (basePlan && basePlan.runtimeHash !== runtimeHash) blockers.push("stale-runtime-base");
    if (!dependenciesValid) blockers.push("runtime-dependency-invalid");
    if (basePlan && JSON.stringify(basePlan.dependencies) !== JSON.stringify(dependencies)) blockers.push("stale-runtime-dependencies");
    const current = binding ? runtime.knowledge[binding.code] : null;
    if (binding && current?.sourceDocumentId !== item.source.documentId) blockers.push("source-identity-mismatch");
    if (binding && (runtime.metadata.sourceDocumentId !== item.source.documentId || runtime.metadata.topicId !== item.topicId)) blockers.push("runtime-source-identity-mismatch");
    if (binding && (JSON.stringify(binding) !== JSON.stringify(publicationBindings[item.id]) || item.sectionId !== binding.code || !/^22\./u.test(binding.code) || binding.file !== runtimeFile)) blockers.push("content-identity-mismatch");
    let resolved = null;
    if (binding && current) {
      try { resolved = resolveFormulaFields(current, { formulaLabel: binding.formulaLabel, expressionKey: binding.expressionKey }); }
      catch {
        blockers.push("runtime-expression-structure-mismatch");
        // Diagnostics only: expose a unique named field's changed value while
        // refusing to authorize it. Never fall back to a positional identity.
        const named = current.formulae?.map((formula, index) => ({ formula, index })).filter(({ formula }) => formula.label === binding.formulaLabel) ?? [];
        if (named.length === 1) resolved = { before: named[0].formula.value, path: ["formulae", named[0].index, "value"] };
      }
    }
    const target = binding ? { ...binding, field: resolved?.path ?? null, pathPolicy: "resolved from semantic identity for this runtime version only" }
      : mapping?.usages.length && !mapping.issues.length ? { mappingId: item.id, proposalHash: mapping.proposalHash, usages: mapping.usages } : null;
    const before = resolved?.before ?? null;
    if (binding && before == null) blockers.push("runtime-field-missing");
    if (binding && current?.contentVersion !== "latex-pilot-v5") blockers.push("runtime-content-version-mismatch");
    if (binding && runtime.metadata.sourceSha256 !== item.source.sha256) blockers.push("runtime-source-hash-mismatch");
    const baseChange = basePlan?.changes.find((change) => change.itemId === item.id);
    if (basePlan && (!baseChange || baseChange.itemHash !== digest(item))) blockers.push("stale-reviewed-item");
    const approvalEvidence = { source: item.review?.sourceVerification ?? null, editorial: item.review?.editorialApproval ?? null,
      versionBound: review.versionBound, patchHashes: (item.audit ?? []).map((event) => event.patchHash) };
    let recordPreview = null;
    if (!blockers.length) {
      const proposed = simulateChange(current, { field: resolved.path, before, after: item.normalizedLatex });
      proposed.contentVersion = `${current.contentVersion}.review-${digest({ item: digest(item), target: digest(current) }).slice(0, 12).toLowerCase()}`;
      proposed.sourceSha256 = item.source.sha256;
      const approval = (evidence) => ({ status: "completed", reviewerType: "human", reviewer: evidence.reviewer, reviewedAt: evidence.reviewedAt, sourceHash: item.source.sha256 });
      // A formula approval cannot certify the untouched prose/Examples of the
      // whole lesson. Keep field-scoped evidence; invalidate any lesson badge.
      delete proposed.humanVerification;
      proposed.formulae[resolved.path[1]].humanVerification = { scope: binding.fieldId, contentVersion: proposed.contentVersion, reviewedLatex: item.normalizedLatex,
        reviewedItemHash: digest(item), source: approval(approvalEvidence.source), editorial: approval(approvalEvidence.editorial) };
      const html = renderKnowledgeMarkdown({ slide: { reading: proposed }, exercise: { code: binding.code, title: proposed.title }, position: { current: 1, total: 1 } });
      if (/math-render-error|katex-error/u.test(html)) blockers.push("runtime-record-render-failed");
      else recordPreview = { before: current, after: proposed, rollback: current, integrationStatus: "dry-run-preview-only", verificationScope: "formula-field-only; no whole-lesson badge" };
    }
    changes.push({ itemId: item.id, code: item.sectionId, target, before, after: item.normalizedLatex,
      mappingClassification: mapping?.classification ?? null, runtimeDiffs: mapping?.usages ?? [], runtimeProposalHash: mapping?.proposalHash ?? null,
      sourceHash: item.source.sha256, reviewedContentHash: digest({ normalizedLatex: item.normalizedLatex, conditions: item.conditions ?? [] }),
      itemHash: digest(item), itemVersion: item.contentVersion, sourceIdentityHash: sourceIdentityHash(item), source: item.source,
      targetRecordHash: current ? digest(current) : null, targetVersion: current?.contentVersion ?? null, hasContentChange: before !== item.normalizedLatex,
      approvalEvidence, validation: checks, dependencyChecks: { passed: dependenciesValid }, conflictChecks: { unresolved: blockers.includes("unresolved-source-conflict"), reviewStatus: item.review?.status }, recordPreview,
      eligibleForPreview: blockers.length === 0, blockers, rollback: resolved ? { before: item.normalizedLatex, after: before, field: resolved.path } : null });
  }
  const plan = { schemaVersion: "bienedu.publication-dry-run.v5.2", mode: "dry-run-only", runtimeFile, runtimeHash, dependencies,
    publicationAuthority: "not-granted", runtimeWrites: 0, changes,
    eligibleCount: changes.filter((change) => change.eligibleForPreview).length,
    blockedCount: changes.filter((change) => !change.eligibleForPreview).length };
  return { ...plan, planHash: digest(plan) };
}

// Testable reversible previews only. This function never writes a runtime file.
export function simulateChange(record, { field, before, after }) {
  const copy = structuredClone(record);
  let target = copy;
  for (const part of field.slice(0, -1)) { target = target?.[part]; if (!target) throw new Error("Unknown runtime field"); }
  const last = field.at(-1);
  if (target[last] === after) return copy;
  if (target[last] !== before) throw new Error("Stale runtime value");
  target[last] = after;
  return copy;
}
