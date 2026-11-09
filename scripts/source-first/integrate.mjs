import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { root, work } from "./build.mjs";
import { digest, reviewWorkflow } from "./model.mjs";
import { loadReview } from "./review-store.mjs";
import { classifyRuntimeMappings, mappingStatuses } from "./runtime-mappings.mjs";
import { renderMathText } from "../../assets/js/components/markdown-math-renderer.js";

export function integrateRuntime({ persist = true, workDirectory = work, replayImporter = false } = {}) {
  const snapshot = JSON.parse(readFileSync(join(work, "snapshot.json"), "utf8"));
  const items = snapshot.items.map((item) => loadReview(item, { root, work: workDirectory }).item);
  const mappings = classifyRuntimeMappings(items);
  const counts = Object.fromEntries(mappingStatuses.map((status) => [status, mappings.filter((row) => row.classification === status).length]));
  const origins = [...new Set(mappings.flatMap((row) => row.usages.map((usage) => usage.origin)))];
  const runtimeFileHashes = Object.fromEntries(origins.map((file) => [file, digest(readFileSync(join(root, file)))]));
  const corrections = JSON.parse(readFileSync(join(root, "scripts/source-first/corrections-v53.json"), "utf8")).corrections;
  let importerReplay = null;
  if (replayImporter) {
    const result = spawnSync("python", ["-X", "utf8", join(root, "scripts/import-foundation-documents.py"), "--review-candidates"], { encoding: "utf8", windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
    if (result.status !== 0) throw new Error(result.stderr);
    importerReplay = JSON.parse(result.stdout);
    if (persist) writeFileSync(join(work, "foundation-candidates-v53.json"), JSON.stringify(importerReplay, null, 2) + "\n");
  }
  const proposed = mappings.flatMap((row) => row.proposedChanges);
  const renderErrors = proposed.filter((usage) => /math-render-error|katex-error/u.test(Array.isArray(usage.after) ? usage.after.map(renderMathText).join("") : renderMathText(usage.after)));
  if (renderErrors.length) throw new Error("Staged runtime correction does not render");
  const report = { schemaVersion: "bienedu.runtime-integration.v5.3", snapshotHash: digest(snapshot), runtimeFileHashes,
    counts: { ...counts, benchmarkItems: items.length, mappedSourceItems: mappings.filter((row) => row.usages.length && !row.issues.length).length,
      legitimateRuntimeUsages: mappings.reduce((sum, row) => sum + row.usages.length, 0), confirmedVisibleDefects: corrections.length,
      stagedFieldChanges: proposed.length, stagedMathematicalFieldChanges: proposed.filter((usage) => !usage.targetId.endsWith(":title")).length,
      humanSourceApprovals: items.filter((item) => reviewWorkflow(item).humanSourceVerified).length, humanMathematicalApprovals: items.filter((item) => reviewWorkflow(item).editorialApproved).length,
      approvedChanges: 0, publishedCorrections: 0, blockedSourceItems: items.length },
    mappings, corrections, renderErrors: renderErrors.length, importerReplay: importerReplay ? { candidateCount: importerReplay.candidates.length, runtimeWrites: importerReplay.runtimeWrites, digest: digest(importerReplay) } : { status: "not-rerun; use existing targeted replay evidence" },
    preserved: { runtimeWrites: 0, sourceWrites: 0, progressWrites: 0, exercisesChanged: 0 },
    releaseCapability: "dry-run only: no publication authority; exact-target human approval required; no atomic multi-source publisher implemented",
    remainingVisibleDefects: corrections.map((entry) => ({ id: entry.id, runtimeStatus: "unchanged; correction staged", humanReview: "pending" })),
    candidateNormalization: "source-bound exact field/hash corrections; no global math substitutions",
    referenceEvidence: ".audit/source-first-v5/verification-v5.1.json", existingReviewQueue: ".audit/source-first-v5/verification-v5.1.json#reviewEntities" };
  if (persist) {
    const directory = join(root, ".audit/source-first-v5");
    writeFileSync(join(directory, "runtime-mappings-v5.3.json"), JSON.stringify(report, null, 2) + "\n");
    const checkpointPath = join(directory, "checkpoint.json"), checkpoint = JSON.parse(readFileSync(checkpointPath, "utf8"));
    checkpoint.integrationV53 = { report: ".audit/source-first-v5/runtime-mappings-v5.3.json", counts: report.counts, runtimeWrites: 0 };
    writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2) + "\n");
  }
  return report;
}

if (process.argv[1]?.endsWith("integrate.mjs")) console.log(JSON.stringify(integrateRuntime({ replayImporter: true }).counts, null, 2));
