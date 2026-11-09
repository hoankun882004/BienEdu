import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { root, work } from "./build.mjs";
import { digest, validateItem, reviewWorkflow, sourceIdentityHash } from "./model.mjs";
import { loadReview } from "./review-store.mjs";
import { publicationDryRun, publicationBindings } from "./publication.mjs";
import { renderMarkdownMath } from "../../assets/js/components/markdown-math-renderer.js";
import { integrateRuntime } from "./integrate.mjs";
import { compareMathematics, pilotConsistencyEvidence } from "./comparison.mjs";
import { fieldBinding, readFieldApproval } from "./field-review.mjs";
import { createLocalPlan, localReleaseState } from "./local-release.mjs";

const read = (name) => JSON.parse(readFileSync(join(root, ".audit/source-first-v5", name), "utf8"));

export function prepareReviewBatch({ persist = true, workDirectory = work } = {}) {
  const snapshot = JSON.parse(readFileSync(join(work, "snapshot.json"), "utf8"));
  const baseline = read("verification-v5.1.json");
  if (baseline.snapshotHash !== digest(snapshot)) throw new Error("V5.1 evidence is stale; run the existing targeted source verifier before preparation");
  const figures = read("figure-review-v5.1.json");
  const loaded = snapshot.items.map((item) => loadReview(item, { work: workDirectory, root }));
  const integration = integrateRuntime({ persist, workDirectory });
  const comparisons = compareMathematics(loaded.map((entry) => entry.item), integration.mappings, { root });
  const fieldContexts = loaded.flatMap(({ item }) => integration.mappings.find((entry) => entry.itemId === item.id).proposedChanges.map((usage) => ({ item, usage })));
  const localPlan = createLocalPlan(fieldContexts, { root, work: workDirectory });
  const release = publicationDryRun(loaded.map((entry) => entry.item), { root, runtimeMappings: integration.mappings, staleItemIds: loaded.filter((entry) => entry.staleReview).map((entry) => entry.item.id) });
  const items = loaded.map(({ item, staleReview, eventCount }) => {
    const previous = baseline.benchmark.find((entry) => entry.itemId === item.id);
    if (!previous || previous.source.sha256 !== item.source.sha256) throw new Error(`Missing previous evidence: ${item.id}`);
    const checks = validateItem(item, { root });
    const html = renderMarkdownMath(`$$${item.normalizedLatex ?? ""}$$`);
    const change = release.changes.find((entry) => entry.itemId === item.id);
    const mapping = integration.mappings.find((entry) => entry.itemId === item.id);
    const questions = baseline.medicalArithmetic.unstatedConditions.filter((entry) => entry.code === item.sectionId);
    return { itemId: item.id, itemHash: digest(item), itemVersion: item.contentVersion, sourceIdentityHash: sourceIdentityHash(item),
      source: item.source, originalExpression: item.originalExpression, normalizedLatex: item.normalizedLatex, explicitConditions: item.conditions,
      previousComparison: previous.normalizedLatex === item.normalizedLatex ? previous.referenceStructure : "changed-candidate-needs-comparison",
      checks, candidateRenderValid: !/math-render-error|katex-error/u.test(html), sourceWarnings: previous.warnings,
      editorialQuestions: questions, humanChecklist: ["Compare exact symbols and grouping", "Compare all conditions with full source context", "Confirm the target and current learner rendering"],
      runtimeTarget: change.target, learnerRoute: publicationBindings[item.id] ? `documents.html?grade=12&topic=${item.topicId}&type=${item.sectionId}&section=knowledge&item=1` : null,
      runtimeBefore: change.before, targetVersion: change.targetVersion, releaseBlockers: change.blockers,
      runtimeMapping: mapping, runtimeUsages: mapping.usages, runtimeProposalHash: mapping.proposalHash,
      automaticComparison: comparisons.find((entry) => entry.itemId === item.id),
      fieldReviews: mapping.proposedChanges.map((usage) => readFieldApproval(fieldBinding(item, usage, { root }), { work: workDirectory })),
      supportPages: [...new Set([item.source.location.page, ...mapping.usages.flatMap((usage) => usage.correctionSource?.sourcePages ?? [])].filter(Number.isInteger))],
      workflow: reviewWorkflow(item), reviewDecision: item.review.status, reviewEventCount: eventCount, staleReview,
      evidenceReusedFrom: ".audit/source-first-v5/verification-v5.1.json" };
  });
  const priorities = figures.figures.map((figure) => {
    const numbers = [...(figure.sourceRegionText ?? "").normalize("NFC").matchAll(/Ví\s*dụ\s*(\d+)\./gu)].map((match) => Number(match[1]));
    const neighboringExamples = [...new Set(numbers.filter((number) => number !== figure.originalExampleNumber))];
    return { figureId: figure.id, neighboringExamples, reasons: [
      ...(neighboringExamples.length ? ["neighboring-example-in-crop"] : []),
      ...(figure.regionDrawingCount === 0 && figure.regionImageCount === 0 ? ["possible-text-only-asset"] : []),
      ...(!figure.exampleNumberFoundInRegion ? ["source-association-needs-review"] : [])
    ], humanDecision: figure.humanFigureReview, priorAgentObservation: figure.agentVisualObservation ?? null };
  });
  const nextVisualBatchIds = figures.figures.filter((figure) => !figures.visualBatchIds.includes(figure.id) && ["2.3", "2.4"].includes(figure.code)).slice(0, 8).map((figure) => figure.id);
  const observationsFile = join(root, ".audit/source-first-v5/figure-inspections-v5.2.json");
  const observations = existsSync(observationsFile) ? JSON.parse(readFileSync(observationsFile, "utf8")).observations : [];
  const currentObservations = observations.filter((observation) => {
    const figure = figures.figures.find((entry) => entry.id === observation.figureId);
    return figure && observation.sourceHash === figure.sourceHash && observation.assetHash === figure.assetHash
      && digest(readFileSync(join(root, figure.sourceFile))) === observation.sourceHash && digest(readFileSync(join(root, figure.assetPath))) === observation.assetHash;
  });
  const counts = { ...baseline.counts,
    benchmarkPrepared: items.length, machineCheckedExpressions: items.filter((item) => item.checks.syntax.status === "passed" && item.checks.structure.status === "passed" && item.candidateRenderValid).length,
    humanSourceVerified: items.filter((item) => item.workflow.humanSourceVerified).length, mathematicalEditorialApprovals: items.filter((item) => item.workflow.editorialApproved).length,
    pendingBenchmarkSourceReviews: items.filter((item) => !item.workflow.humanSourceVerified).length,
    needsCorrectionDecisions: items.filter((item) => ["needs-correction", "confirmed-error"].includes(item.reviewDecision)).length,
    unresolvedAmbiguityDecisions: items.filter((item) => item.reviewDecision === "unresolved-ambiguity").length,
    recognizedRuntimeTargets: items.filter((item) => item.runtimeTarget).length, unmappedRuntimeTargets: items.filter((item) => !item.runtimeTarget).length,
    approvedButUnpublished: items.filter((item) => item.workflow.editorialApproved).length, newlyPublished: 0, newlyCorrectedImporterDefects: 0,
    newAgentFigureInspections: currentObservations.length, totalDistinctAgentFigureInspections: new Set([...figures.visualBatchIds, ...currentObservations.map((entry) => entry.figureId)]).size };
  const report = { schemaVersion: "bienedu.review-preparation.v5.2", snapshotHash: digest(snapshot), counts, items,
    identityPolicy: baseline.identityPolicy, existingReviewEntityReport: ".audit/source-first-v5/verification-v5.1.json",
    figurePreparation: { sourceReport: ".audit/source-first-v5/figure-review-v5.1.json", priorities, nextVisualBatchIds,
      previousAgentVisualInspections: figures.agentVisualInspections, humanApprovals: 0 },
    agentFigureObservations: { evidence: ".audit/source-first-v5/figure-inspections-v5.2.json", observations: currentObservations, staleObservationCount: observations.length - currentObservations.length, humanApprovalsInferred: false },
    cd22Regression: { existingReport: ".audit/source-first-v5/verification-v5.1.json", medicalArithmetic: baseline.medicalArithmetic, editorialStatus: "pending" },
    publication: { mode: release.mode, planHash: release.planHash, eligiblePreviews: release.eligibleCount, blocked: release.blockedCount, runtimeWrites: 0,
      integrationStatus: release.eligibleCount ? "approved previews ready; actual publication not authorized" : "blocked; runtime unchanged" } };
  if (persist) {
    const directory = join(root, ".audit/source-first-v5");
    writeFileSync(join(directory, "review-preparation-v5.2.json"), JSON.stringify(report, null, 2) + "\n");
    writeFileSync(join(directory, "release-dry-run.json"), JSON.stringify(release, null, 2) + "\n");
    const comparisonCounts = Object.fromEntries(["MACHINE_MATCHED", "CONFIRMED_CONVERSION_DEFECT", "AMBIGUOUS"].map((status) => [status, comparisons.filter((entry) => entry.classification === status).length]));
    const releaseState = localReleaseState({ root, work: workDirectory });
    writeFileSync(join(directory, "comparison-v5.4.json"), JSON.stringify({ schemaVersion: "bienedu.comparison.v5.4", snapshotHash: digest(snapshot), counts: comparisonCounts, items: comparisons, pilotConsistency: pilotConsistencyEvidence(), humanApprovalsInferred: false }, null, 2) + "\n");
    writeFileSync(join(directory, "local-release-v5.4.json"), JSON.stringify(localPlan, null, 2) + "\n");
    const checkpoint = read("checkpoint.json");
    checkpoint.verificationV52 = { counts, report: ".audit/source-first-v5/review-preparation-v5.2.json", humanApprovalsInferred: false };
    checkpoint.verificationV54 = { comparisons: comparisonCounts, pilotFieldChanges: fieldContexts.length, humanFieldApprovals: items.flatMap((entry) => entry.fieldReviews).filter((entry) => entry.mathematicalApproved).length, publishedCorrections: releaseState.activeCorrectionIds.length, localPlanHash: localPlan.planHash, releaseState };
    writeFileSync(join(directory, "checkpoint.json"), JSON.stringify(checkpoint, null, 2) + "\n");
  }
  return report;
}

if (process.argv[1]?.endsWith("prepare.mjs")) console.log(JSON.stringify(prepareReviewBatch().counts, null, 2));
