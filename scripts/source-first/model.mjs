import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";
import { validateLatexExpression } from "../../assets/js/components/markdown-math-renderer.js";
import { countingConsistency } from "./arithmetic.mjs";
import { extractNativeElements } from "./tex.mjs";

export const SCHEMA = "bienedu.source-first.v1";
export const digest = (value) => createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest("hex").toUpperCase();
export const reviewedContentHash = (item) => digest({ normalizedLatex: item.normalizedLatex, conditions: item.conditions ?? [] });
export const sourceIdentityHash = (item) => digest({ id: item.id, topicId: item.topicId, sectionId: item.sectionId, kind: item.kind, source: item.source });

export function reviewWorkflow(item) {
  const matches = (approval) => approval?.status === "completed" && approval.reviewerType === "human"
    && typeof approval.reviewer === "string" && Boolean(approval.reviewer.trim())
    && Number.isFinite(Date.parse(approval.reviewedAt)) && approval.sourceHash === item.source.sha256
    && approval.contentHash === reviewedContentHash(item)
    && (!approval.contentVersion || approval.contentVersion === item.contentVersion)
    && (!approval.sourceIdentityHash || approval.sourceIdentityHash === sourceIdentityHash(item));
  const humanSourceVerified = matches(item.review?.sourceVerification);
  const editorialApproved = humanSourceVerified && matches(item.review?.editorialApproval);
  const versionBound = Boolean(item.contentVersion) && humanSourceVerified && editorialApproved && [item.review.sourceVerification, item.review.editorialApproval].every((approval) => approval.contentVersion === item.contentVersion && approval.sourceIdentityHash === sourceIdentityHash(item));
  return { machineChecksPassed: item.checks?.syntax.status === "passed" && item.checks?.structure.status === "passed", humanSourceVerified, editorialApproved, versionBound };
}

export function localFile(root, path) {
  const target = resolve(root, path);
  const rel = relative(root, target);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) throw new Error("Path escapes workspace");
  return target;
}

export function validateItem(item, { root } = {}) {
  const validation = item.normalizedLatex == null ? null : validateLatexExpression(item.normalizedLatex);
  const syntax = item.normalizedLatex == null
    ? { status: "needs-review", issues: ["No confirmed LaTeX candidate"] }
    : { status: validation.valid ? "passed" : "failed", issues: validation.valid ? [] : [validation.error] };
  for (const condition of item.conditions ?? []) {
    const check = validateLatexExpression(condition.normalizedLatex);
    if (!check.valid) { syntax.status = "failed"; syntax.issues.push(check.error); }
  }
  const structureIssues = [];
  if (!item.id || !item.topicId || !item.sectionId || !item.source?.file || !item.source.sha256 || !item.originalExpression?.trim()) structureIssues.push("Missing identity/source/raw expression");
  if (item.topicId !== `CD${String(item.sectionId).split(".")[0].padStart(2, "0")}`) structureIssues.push("Topic/section mismatch");
  if (!["knowledge", "methodology", "note", "example", "solution", "exercise"].includes(item.kind)) structureIssues.push("Unknown content kind");
  const location = item.source?.location;
  if (item.source?.kind === "tex" && (!location?.offsets || !location?.lines)) structureIssues.push("Missing TeX location");
  if (item.source?.kind === "pdf" && (!location?.page || !location?.bbox || !item.assetReferences?.length)) structureIssues.push("Missing PDF region/crop");
  if (root) {
    try {
      const source = readFileSync(localFile(root, item.source.file));
      if (digest(source) !== item.source.sha256) structureIssues.push("Source checksum changed");
      if (item.source.kind === "tex") {
        const [start, end] = location.offsets;
        const text = source.toString("utf8");
        if (text.slice(start, end) !== item.originalExpression) structureIssues.push("Raw source slice differs");
        if (!extractNativeElements(text).some((element) => element.sectionId === item.sectionId && start >= element.start && end <= element.end)) structureIssues.push("Expression crossed its source section boundary");
      }
      for (const asset of item.assetReferences ?? []) {
        if (digest(readFileSync(localFile(root, asset.path))) !== asset.sha256) structureIssues.push("Crop checksum changed");
      }
    } catch (error) { structureIssues.push(error.message); }
  }
  // Independent source and mathematical review are never inferred from parsing.
  return {
    syntax,
    structure: { status: structureIssues.length ? "failed" : "passed", issues: structureIssues },
    fidelity: { status: reviewWorkflow(item).humanSourceVerified ? "human-attested" : "needs-review", reviewer: item.review?.sourceVerification?.reviewer ?? null },
    consistency: countingConsistency(item) ?? { status: "needs-review", issues: item.consistencyNotes ?? ["No independent mathematical sign-off"] }
  };
}

export function validateReviewPatch(item, patch, { root } = {}) {
  if (!["bienedu.math-review-patch.v1", "bienedu.math-review-patch.v2", "bienedu.math-review-patch.v3"].includes(patch.schemaVersion) || patch.itemId !== item.id) throw new Error("Patch identity mismatch");
  if (patch.baseHash !== digest(item) || patch.sourceSha256 !== item.source.sha256 || patch.before !== item.normalizedLatex) throw new Error("Stale patch/source; rebuild and review again");
  if (!["confirmed-error", "source-verified", "needs-correction", "unresolved-ambiguity"].includes(patch.status)) throw new Error("Invalid review status");
  if (["needs-correction", "unresolved-ambiguity"].includes(patch.status) && patch.schemaVersion !== "bienedu.math-review-patch.v3") throw new Error("New decision types require V3 version-bound patches");
  if (typeof patch.reviewer !== "string" || !patch.reviewer.trim() || typeof patch.reason !== "string" || !patch.reason.trim()) throw new Error("Reviewer and reason are required");
  if (typeof patch.after !== "string" || patch.after.length > 20000) throw new Error("Invalid expression");
  if (patch.status === "source-verified" && (patch.sourceCompared !== true || !validateLatexExpression(patch.after).valid)) throw new Error("Source comparison and valid LaTeX required");
  if (patch.schemaVersion === "bienedu.math-review-patch.v3") {
    if (typeof patch.itemVersion !== "string" || !patch.itemVersion.trim() || patch.itemVersion !== item.contentVersion || patch.sourceIdentityHash !== sourceIdentityHash(item) || patch.originalExpressionHash !== digest(item.originalExpression)) throw new Error("Review version or exact source identity mismatch");
    if (!Number.isFinite(Date.parse(patch.exportedAt))) throw new Error("Review export timestamp required");
    if (patch.status !== "source-verified" && patch.editorialApproval?.confirmed === true) throw new Error("Unresolved decisions cannot carry mathematical approval");
    if (patch.status === "unresolved-ambiguity" && patch.after !== patch.before) throw new Error("Ambiguity must preserve the candidate; use needs-correction for edits");
  }
  if (["bienedu.math-review-patch.v2", "bienedu.math-review-patch.v3"].includes(patch.schemaVersion) && patch.status === "source-verified") {
    if (patch.reviewerType !== "human" || patch.humanSourceConfirmed !== true || !Number.isFinite(Date.parse(patch.exportedAt))) throw new Error("Explicit human source attestation required");
    if (patch.reviewedContentHash !== reviewedContentHash({ ...item, normalizedLatex: patch.after })) throw new Error("Review content hash mismatch");
    if (patch.editorialApproval?.confirmed === true && (patch.editorialApproval.reviewerType !== "human" || !patch.editorialApproval.reviewer?.trim())) throw new Error("Explicit human mathematical editor required");
  }
  if (patch.status === "source-verified" && countingConsistency({ ...item, normalizedLatex: patch.after })?.status === "failed") throw new Error("Known mathematical consistency check failed");
  const checks = validateItem(item, { root });
  if (checks.structure.status !== "passed") throw new Error(`Invalid provenance: ${checks.structure.issues.join("; ")}`);
  return true;
}

export function applyReview(item, patch, reviewer, root) {
  validateReviewPatch(item, patch, { root });
  if (!reviewer?.trim() || reviewer !== patch.reviewer) throw new Error("CLI reviewer must match the exported editor identity");
  const versioned = patch.schemaVersion === "bienedu.math-review-patch.v3";
  const state = reviewWorkflow(item);
  const editorialAmbiguity = versioned && state.humanSourceVerified && !state.editorialApproved && patch.status === "unresolved-ambiguity" && patch.after === item.normalizedLatex;
  if ((item.review?.status === "source-verified" || state.humanSourceVerified) && !(editorialAmbiguity || patch.status === "source-verified" && patch.after === item.normalizedLatex && ((versioned && !state.versionBound) || (patch.schemaVersion === "bienedu.math-review-patch.v2" && patch.editorialApproval?.confirmed === true && !state.editorialApproved)))) throw new Error("Source-verified expression is immutable; only an unchanged editorial decision can follow");
  const human = ["bienedu.math-review-patch.v2", "bienedu.math-review-patch.v3"].includes(patch.schemaVersion) && patch.status === "source-verified";
  const approval = (name) => ({ status: "completed", reviewer: name, reviewerType: "human", reviewedAt: patch.exportedAt, sourceHash: item.source.sha256, contentHash: reviewedContentHash({ ...item, normalizedLatex: patch.after }),
    ...(versioned ? { contentVersion: item.contentVersion, sourceIdentityHash: sourceIdentityHash(item) } : {}) });
  const retainSourceApproval = reviewWorkflow(item).humanSourceVerified && (!versioned || item.review.sourceVerification.contentVersion === item.contentVersion && item.review.sourceVerification.sourceIdentityHash === sourceIdentityHash(item));
  const updated = {
    ...item,
    normalizedLatex: patch.after,
    review: { status: patch.status, reviewer, reason: patch.reason, sourceCompared: patch.sourceCompared === true,
      sourceVerification: human ? (retainSourceApproval ? item.review.sourceVerification : approval(reviewer)) : editorialAmbiguity ? item.review.sourceVerification : { status: "pending" },
      editorialApproval: human && patch.editorialApproval?.confirmed === true ? approval(patch.editorialApproval.reviewer) : { status: "pending" } },
    publication: "unpublished",
    audit: [...(item.audit ?? []), { before: patch.before, after: patch.after, status: patch.status, reviewer, reason: patch.reason, sourceSha256: patch.sourceSha256, patchHash: digest(patch),
      ...(versioned ? { schemaVersion: patch.schemaVersion, contentVersion: patch.itemVersion, sourceIdentityHash: patch.sourceIdentityHash, originalExpressionHash: patch.originalExpressionHash, exportedAt: patch.exportedAt } : {}) }]
  };
  updated.checks = validateItem(updated, { root });
  updated.renderingStatus = updated.checks.syntax.status === "passed" ? "render-valid" : "needs-review";
  return updated;
}
