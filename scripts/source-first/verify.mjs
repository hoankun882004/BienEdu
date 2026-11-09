import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import * as katex from "../../assets/vendor/katex/katex.mjs";
import { root, work } from "./build.mjs";
import { digest, validateItem, reviewWorkflow } from "./model.mjs";
import { loadReview } from "./review-store.mjs";
import { publicationDryRun } from "./publication.mjs";
import { benchmarkFixtures } from "./fixtures.mjs";
import { parseLatexDocument, buildPilotTopic, SOURCE_RELATIVE_PATH } from "../latex-pilot/parser.mjs";
import { knowledgeContent, getKnowledgeContent } from "../../assets/js/data/knowledge-content.js";
import { exampleContent, getExampleContent } from "../../assets/js/data/example-content.js";
import { calculusSourcePractice } from "../../assets/js/data/calculus-source-practice.js";
import { approvedMathContent } from "../../assets/js/data/approved-math-content.js";
import { curriculumTopics } from "../../assets/js/data/curriculum.js";
import { getDocumentForTopic } from "../../assets/js/data/document-mappings.js";
import { renderKnowledgeMarkdown, renderMathText, validateLatexExpression } from "../../assets/js/components/markdown-math-renderer.js";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const write = (name, value) => writeFileSync(join(root, ".audit/source-first-v5", name), JSON.stringify(value, null, 2) + "\n", "utf8");
const mathML = (value) => validateLatexExpression(value).valid ? katex.renderToString(value, { output: "mathml", strict: "ignore", trust: false }).replace(/<annotation[\s\S]*?<\/annotation>/gu, "").replace(/\s+/gu, "") : null;
const shape = (value) => Object.fromEntries(["mfrac", "msup", "msub", "msubsup", "msqrt", "mroot"].map((tag) => [tag, (value?.match(new RegExp(`<${tag}(?:>|\\s)`, "gu")) ?? []).length]));

export function verifyBatch() {
  const snapshot = readJson(join(work, "snapshot.json"));
  const loaded = snapshot.items.map((item) => loadReview(item, { work, root }));
  const rows = loaded.map(({ item, staleReview }) => {
    const checks = validateItem(item, { root });
    const reference = benchmarkFixtures.find((fixture) => fixture.id === item.id);
    const actual = mathML(item.normalizedLatex ?? "");
    const expected = mathML(reference.latex);
    const warnings = [];
    if (actual !== expected) warnings.push(item.id === "tex-20.4" ? "source-period-ellipsis-vs-reference-cdots" : "reference-structure-difference");
    if (item.source.kind === "pdf") warnings.push("pdf-layout-needs-human-comparison");
    if (staleReview) warnings.push("stale-review-history");
    const html = renderMathText(`\\(${item.normalizedLatex}\\)`);
    return { itemId: item.id, source: item.source, originalExpression: item.originalExpression, normalizedLatex: item.normalizedLatex,
      sourceConditions: item.conditions ?? [], checks, referenceShape: shape(expected), renderedShape: shape(actual),
      referenceStructure: actual === expected ? "matches" : "differs", renderErrors: /math-render-error|katex-error/u.test(html),
      review: reviewWorkflow(item), warnings, humanDecision: reviewWorkflow(item).humanSourceVerified ? "completed" : "pending" };
  });

  const tex = readFileSync(join(root, SOURCE_RELATIVE_PATH), "utf8");
  const pilot = buildPilotTopic(parseLatexDocument(tex));
  const cd22 = Object.entries(pilot.knowledge).flatMap(([code, sourceReading]) => {
    const runtime = getKnowledgeContent(code);
    const fields = ["lead", "formulae", "points", "note"];
    const knowledgeHtml = renderKnowledgeMarkdown({ slide: { reading: runtime }, exercise: { code, title: runtime.title }, position: { current: 1, total: 1 } });
    return [{ id: `${code}-knowledge`, lines: runtime.sourceLines, sourceAdapterMatches: fields.every((field) => JSON.stringify(runtime[field]) === JSON.stringify(sourceReading[field])), renderErrors: /math-render-error|katex-error/u.test(knowledgeHtml), humanReview: "pending" },
      ...getExampleContent(code).map((example, index) => ({ id: example.id, lines: example.sourceLines, sourceAdapterMatches: example.prompt === pilot.examples[code][index].prompt, renderErrors: /math-render-error|katex-error/u.test(renderMathText(example.prompt)), humanReview: "pending" }))];
  });
  const medicalArithmetic = { prevalence: .01, sensitivity: .95, specificity: .90,
    falsePositiveRate: 1 - .90, positiveProbability: .01 * .95 + .99 * .10, posterior: .01 * .95 / (.01 * .95 + .99 * .10),
    matchesPrintedRoundedPercent: (.01 * .95 / (.01 * .95 + .99 * .10) * 100).toFixed(2) === "8.76",
    sourceLines: [740, 750], status: "machine-arithmetic-checked", humanEditorialApproval: "pending",
    unstatedConditions: [{ code: "22.5", issue: "positive conditioning-event probability not explicitly printed in the formula box" }, { code: "22.7", issue: "P(+) > 0 not explicitly printed; do not add theory without editorial approval" }] };

  const figures = Object.entries(exampleContent).flatMap(([code, examples]) => examples.flatMap((example) => (example.assetReferences ?? []).map((asset) => {
    const topicId = `CD${code.split(".")[0].padStart(2, "0")}`;
    const document = getDocumentForTopic(topicId);
    const path = join(root, asset.src.replace(/^\//u, ""));
    return { id: asset.id, code, exampleId: example.id, originalExampleNumber: example.originalExampleNumber, sourceFile: document.filePath, sourceHash: document.sourceSha256,
      sourcePage: asset.sourcePage, sourceRegion: asset.sourceRegion, statementPage: example.statementSourcePage, solutionPage: example.solutionSourcePage,
      assetPath: asset.src.replace(/^\//u, ""), assetHash: existsSync(path) ? digest(readFileSync(path)) : null, humanSourceVerification: "pending" };
  })));
  const result = spawnSync("python", ["-X", "utf8", join(root, "scripts/source-first/source-view.py")], { input: JSON.stringify({ mode: "figures", figures }), encoding: "utf8", windowsHide: true, maxBuffer: 10 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr);
  const geometry = JSON.parse(result.stdout);
  for (const figure of figures) Object.assign(figure, geometry.find((row) => row.id === figure.id));
  const visualFindings = {
    "1.10-example-10-figure-1": "Agent visual inspection: crop contains the derivative-data question as text, no diagram visible. Figure classification needs editorial review; asset retained.",
    "2.3-example-1-figure-1": "Agent visual inspection: variation table has critical point 1, derivative signs minus/zero/plus, minimum -1. Crop also includes the next question heading.",
    "2.3-example-2-figure-1": "Agent visual inspection: variation table has critical point 1, derivative signs plus/zero/minus, maximum 3. Crop also includes the next question heading.",
    "2.3-example-3-figure-1": "Agent visual inspection: critical points -1 and 1, derivative signs plus/zero/minus/zero/plus, extrema 2 and -2. Crop also includes the next question heading.",
    "2.3-example-4-figure-1": "Agent visual inspection: stationary point 0 with plus/zero/plus derivative signs, function remains increasing. Crop also includes the next question heading.",
    "2.3-example-5-figure-1": "Agent visual inspection: critical points -1, 0, 1 and alternating derivative signs; function values 0, 1, 0. Source association visible.",
    "2.3-example-6-figure-1": "Agent visual inspection: critical points -1, 0, 1; extrema 2, 1, 2. Crop also includes the next question heading.",
    "2.3-example-7-figure-1": "Agent visual inspection: excluded point 0 uses a double vertical separator; derivative is negative on each side. Crop also includes the next question heading."
  };
  for (const figure of figures) if (visualFindings[figure.id]) figure.agentVisualObservation = visualFindings[figure.id];
  write("figure-review-v5.1.json", { figures, total: figures.length, machineAssociationMatches: figures.filter((item) => item.exampleNumberFoundInRegion).length, missingAssets: figures.filter((item) => !item.assetHash).length, pendingHumanReviews: figures.length,
    agentVisualInspections: Object.keys(visualFindings).length, humanApprovalsInferred: false,
    visualBatchIds: figures.filter((item) => ["1.10", "2.3", "2.4", "2.5"].includes(item.code)).slice(0, 8).map((item) => item.id) });

  // Canonical runtime-record identities merge overlapping facets. Unmapped source
  // expressions stay separate; no overlap is guessed from similar-looking text.
  const entities = new Map();
  const add = (key, facet, id) => { if (!entities.has(key)) entities.set(key, { key, facets: [], references: [] }); const row = entities.get(key); if (!row.facets.includes(facet)) row.facets.push(facet); if (!row.references.includes(id)) row.references.push(id); };
  for (const code of Object.keys(knowledgeContent)) add(`knowledge:${code}`, "historical-knowledge", `${code}-knowledge`);
  for (const [code, examples] of Object.entries(exampleContent)) for (const [index, example] of examples.entries()) add(`example:${example.id ?? `${code}-example-${index + 1}`}`, "historical-example", example.id ?? `${code}-example-${index + 1}`);
  for (const item of snapshot.items) {
    const example = item.relationships.originalExampleNumber ? getExampleContent(item.sectionId)?.find((entry) => entry.originalExampleNumber === item.relationships.originalExampleNumber) : null;
    add(["knowledge", "methodology", "note"].includes(item.kind) ? `knowledge:${item.sectionId}` : example ? `example:${example.id}` : `source-item:${item.id}`, "benchmark", item.id);
  }
  for (const figure of figures) add(`example:${figure.exampleId}`, "figure", figure.id);
  const conflicts = Object.values(calculusSourcePractice).flat().filter((item) => item.answerKeyStatus === "needs-review");
  for (const conflict of conflicts) add(`exercise:${conflict.id}`, "answer-conflict", conflict.id);
  const previous = readJson(join(root, ".audit/math-content-v5-checkpoint.json"));
  const legacyFractions = previous.textIssues.filter((row) => row.rule === "plain-fraction-candidate");
  for (const issue of legacyFractions) {
    const exampleKey = [...entities.keys()].find((key) => key.startsWith("example:") && (issue.id === key.slice(8) || issue.id.startsWith(`${key.slice(8)}-step-`)));
    const code = issue.id.match(/^\d+\.\d+/u)?.[0];
    add(exampleKey ?? (issue.id.includes("knowledge") ? `knowledge:${code}` : `unmapped-issue:${issue.id}:${issue.field}`), "fraction-candidate", `${issue.id}:${issue.field}`);
  }
  const sourceTopics = new Set([...snapshot.sources.flatMap((source) => {
    const document = previous.sourceInventory.find((item) => item.actualSha256 === source.sha256);
    return document?.topicIds ?? [];
  }), ...snapshot.nativeElements.map((item) => item.topicId)]);
  const plan = publicationDryRun(loaded.map((entry) => entry.item), { root, staleItemIds: loaded.filter((entry) => entry.staleReview).map((entry) => entry.item.id) });
  write("release-dry-run.json", plan);
  const report = { schemaVersion: "bienedu.source-verification.v5.1", snapshotHash: digest(snapshot),
    counts: { uniqueTrackedReviewRecords: entities.size, benchmarkExpressions: rows.length, machineCheckedExpressions: rows.filter((row) => row.checks.syntax.status === "passed" && row.checks.structure.status === "passed" && !row.renderErrors).length,
      humanSourceVerified: rows.filter((row) => row.review.humanSourceVerified).length, mathematicalEditorialApprovals: rows.filter((row) => row.review.editorialApproved).length,
      pendingBenchmarkSourceReviews: rows.filter((row) => !row.review.humanSourceVerified).length, pendingFigures: figures.length,
      missingSourceTopics: curriculumTopics.filter((topic) => !sourceTopics.has(topic.id)).map((topic) => topic.id),
      approvedButUnpublished: rows.filter((row) => row.review.editorialApproved).length, newlyPublished: 0,
      existingRuntimeKnowledgeRecords: Object.keys(knowledgeContent).length, existingRuntimeExampleRecords: Object.values(exampleContent).flat().length,
      legacyImmutableApprovalRecords: Object.keys(approvedMathContent).length, fractionCandidates: legacyFractions.length, calculusAnswerConflicts: conflicts.length, cd22UnitsCompared: cd22.length,
      correctedConversionDefects: benchmarkFixtures.filter((item) => item.correction).length },
    identityPolicy: "one canonical runtime record; issue/figure/benchmark facets overlap; unmapped source items remain distinct; native raw-block queue excluded from this entity total",
    benchmark: rows, cd22, medicalArithmetic, reviewEntities: [...entities.values()], conflictIds: conflicts.map((item) => item.id),
    stagingCorrections: benchmarkFixtures.filter((item) => item.correction).map((fixture) => ({ itemId: fixture.id, ...fixture.correction, after: fixture.latex,
      source: snapshot.items.find((item) => item.id === fixture.id).source, mathematicalApproval: "pending", published: false })),
    legacyApprovals: Object.entries(approvedMathContent).map(([id, record]) => ({ id, reviewer: record.verification.reviewer, countedAsHumanApproval: false, reason: "legacy agent review retained; no explicit human attestation" })),
    publication: { mode: plan.mode, eligibleCount: plan.eligibleCount, runtimeWrites: 0 }, externalOCR: "not-required-for-this-source-evidence-batch" };
  write("verification-v5.1.json", report);
  const checkpointPath = join(root, ".audit/source-first-v5/checkpoint.json");
  const checkpoint = readJson(checkpointPath);
  checkpoint.verificationV51 = { counts: report.counts, report: ".audit/source-first-v5/verification-v5.1.json", humanApprovalsInferred: false };
  writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(report.counts, null, 2));
  if (rows.some((row) => row.checks.syntax.status !== "passed" || row.checks.structure.status !== "passed" || row.renderErrors) || cd22.some((row) => !row.sourceAdapterMatches || row.renderErrors) || figures.some((row) => !row.sourceHashMatches || !row.assetHash || !row.validPage || !row.validRegion)) throw new Error("Source verification machine checks failed; inspect the retained report");
  return report;
}

if (process.argv[1]?.endsWith("verify.mjs")) verifyBatch();
