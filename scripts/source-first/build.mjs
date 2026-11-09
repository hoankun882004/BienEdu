import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import * as katex from "../../assets/vendor/katex/katex.mjs";
import { documentSources, nativeDocumentSources } from "../../assets/js/data/document-mappings.js";
import { sourceFormulaToLatex, SOURCE_RELATIVE_PATH } from "../latex-pilot/parser.mjs";
import { validateLatexExpression } from "../../assets/js/components/markdown-math-renderer.js";
import { commands, extractNativeElements } from "./tex.mjs";
import { benchmarkFixtures } from "./fixtures.mjs";
import { SCHEMA, digest, validateItem } from "./model.mjs";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const work = join(root, ".content-work/source-first-v5");
const read = (path) => readFileSync(join(root, path));
const json = (path, value) => { const bytes=JSON.stringify(value,null,2)+"\n";if(existsSync(path)&&readFileSync(path,"utf8")===bytes)return;mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, bytes, "utf8"); };
const lineAt = (text, offset) => text.slice(0, offset).split("\n").length;

function physicalSources() {
  return ["39 chuyên đề", "assets/documents", "file tài liệu latex"].flatMap((directory) => readdirSync(join(root, directory), { withFileTypes: true }).filter((entry) => entry.isFile() && /\.(?:pdf|tex)$/iu.test(entry.name)).map((entry) => {
    const file = `${directory}/${entry.name}`;
    return { file, bytes: read(file).length, sha256: digest(read(file)), kind: file.endsWith(".tex") ? "tex" : "pdf" };
  }));
}

function sourceMathML(expression) {
  if (!expression || !validateLatexExpression(expression).valid) return null;
  return katex.renderToString(expression, { output: "mathml", strict: "ignore", trust: false })
    .replace(/<annotation[\s\S]*?<\/annotation>/gu, "").replace(/\s+/gu, "");
}

export function build() {
  mkdirSync(work, { recursive: true });
  const discovered = physicalSources();
  // This 40-case benchmark is a hash-bound historical cohort, not the live
  // directory inventory. New independent sources belong to the V6 inventory;
  // adding a PDF must not mutate the snapshot used by V5.5/V5.6 rollback.
  const previousSnapshot=join(work,"snapshot.json");
  const cohort=existsSync(previousSnapshot)?JSON.parse(readFileSync(previousSnapshot,"utf8")).sources:null;
  const physical=cohort?cohort.map((source)=>{
    const actual=discovered.find((entry)=>entry.file===source.file);
    if(!actual||actual.sha256!==source.sha256||actual.bytes!==source.bytes)throw new Error(`Historical source changed: ${source.file}`);
    return actual;
  }):discovered.filter((entry)=>[...documentSources,...nativeDocumentSources].some((source)=>source.sourceSha256===entry.sha256));
  const sources = physical.filter((item, index) => physical.findIndex((other) => other.sha256 === item.sha256) === index);
  const texText = read(SOURCE_RELATIVE_PATH).toString("utf8");
  const elements = extractNativeElements(texText);
  const python = spawnSync("python", ["-X", "utf8", join(root, "scripts/source-first/pdf-extract.py")], {
    input: JSON.stringify({ documents: documentSources, fixtures: benchmarkFixtures.filter((item) => item.sourceKind === "pdf") }),
    encoding: "utf8", windowsHide: true, maxBuffer: 32 * 1024 * 1024
  });
  if (python.status !== 0) throw new Error(python.stderr || python.stdout);
  const extracted = JSON.parse(python.stdout);
  const historyDirectory = join(root, ".content-work/runs");
  const historicalRuns = existsSync(historyDirectory) ? readdirSync(historyDirectory).flatMap((name) => {
    const path = join(historyDirectory, name, "run.json");
    if (!existsSync(path)) return [];
    const run = JSON.parse(readFileSync(path, "utf8"));
    return [{ run: relative(root, path).replaceAll("\\", "/"), provider: run.provider, subtopic: run.subtopic, sourceSha256: run.sourceSha256, pages: run.pages, flags: run.flags ?? [] }];
  }) : [];
  json(join(root, ".audit/source-first-v5/tool-comparison.json"), {
    nativeTex: { executed: true, method: "exact-offset scanner and balanced macro source adapter", benchmarkItems: 10, publication: "none" },
    pdfLayout: { executed: true, method: "PyMuPDF + existing block_text replay", version: extracted.tools.pymupdfVersion, benchmarkItems: 30, recognition: "not-inferred; reference transcriptions remain candidates" },
    marker: { executedFresh: false, historicalReplay: historicalRuns, limitation: "Existing local evidence only; no 40-item model accuracy score" },
    mineru: { installed: extracted.tools.mineruInstalled, executed: false, reason: "Not installed locally; no model download justified by this prototype", documentation: "https://github.com/opendatalab/MinerU" },
    docling: { installed: extracted.tools.doclingInstalled, executed: false, reason: "Not installed; formula enrichment requires additional model execution", documentation: "https://docling-project.github.io/docling/usage/enrichments/" },
    mathpix: { executed: false, reason: "No explicit authorization for external document processing and charges" }
  });
  const items = [];
  const benchmark = [];
  for (const fixture of benchmarkFixtures) {
    let source, originalExpression, rawContext, assets = [], legacyCandidate, selectorValid = true;
    if (fixture.sourceKind === "tex") {
      const element = elements.filter((item) => item.code === fixture.code && item.environment === "formulabox")[fixture.formula];
      if (!element) throw new Error(`Missing source formula ${fixture.id}`);
      const bold = commands(element.rawSource, "textbf")[0]?.args[0];
      if (!bold) throw new Error(`Missing native formula expression ${fixture.id}`);
      const start = element.start + bold.start + 1;
      const end = element.start + bold.end - 1;
      originalExpression = texText.slice(start, end);
      rawContext = element.rawSource;
      source = { kind: "tex", file: SOURCE_RELATIVE_PATH, documentId: "cd20-cd23-native-latex", sha256: digest(read(SOURCE_RELATIVE_PATH)), location: { offsets: [start, end], lines: [lineAt(texText, start), lineAt(texText, end)] } };
      legacyCandidate = sourceFormulaToLatex(originalExpression);
    } else {
      const result = extracted.items.find((item) => item.id === fixture.id);
      const document = documentSources.find((item) => item.id === fixture.documentId);
      originalExpression = result.rawSource;
      rawContext = originalExpression;
      source = { kind: "pdf", file: document.filePath, documentId: fixture.documentId, sha256: digest(read(document.filePath)), location: result.location };
      assets = [{ path: result.cropPath, sha256: result.cropSha256, kind: "source-crop", page: fixture.page }];
      selectorValid = result.anchorMatched;
      legacyCandidate = result.existingPipelineCandidate;
      json(join(work, "geometry", `${fixture.id}.json`), result);
    }
    const item = {
      schemaVersion: SCHEMA, id: fixture.id, topicId: `CD${fixture.code.split(".")[0].padStart(2, "0")}`, sectionId: fixture.code,
      kind: fixture.kind ?? "knowledge", source, originalExpression, rawContext,
      conditions: fixture.conditionsLatex ? [{ normalizedLatex: fixture.conditionsLatex, originalContext: rawContext }] : [],
      relationships: { sectionId: fixture.code, originalExampleNumber: ({ "pdf-geometric-point": 1, "pdf-simultaneous-constraints": 8, "pdf-graph-associated": 2, "pdf-area-piecewise": 1, "pdf-root-domain": 4, "pdf-rational-domain": 5, "pdf-log-product": 5, "pdf-powers-condition": 5 })[fixture.id] ?? null, inferredSolution: false },
      normalizedLatex: selectorValid ? (fixture.sourceKind === "tex" ? legacyCandidate : fixture.latex) : null,
      conversionMethod: fixture.sourceKind === "tex" ? "native-tex/balanced-macros-and-source-dialect" : "pdf-layout/region-transcription-candidate",
      extractionStatus: "extracted", review: { status: "needs-review", reviewer: null }, publication: "unpublished",
      assetReferences: assets, contentVersion: "source-first-v5.1", audit: [],
      consistencyNotes: fixture.categories?.includes("systems-of-equations") ? ["Source has simultaneous constraints without a system brace; no brace is inferred"] : ["Reference transcription requires editor comparison with source; no mathematical approval inferred"],
      categories: fixture.categories ?? ["native-formula"], selectorValid
    };
    item.checks = validateItem(item, { root });
    item.renderingStatus = item.checks.syntax.status === "passed" ? "render-valid" : "needs-review";
    items.push(item);
    const legacySyntax = fixture.sourceKind === "tex" ? validateLatexExpression(legacyCandidate).valid : null;
    benchmark.push({
      itemId: item.id, source: item.source, categories: item.categories,
      originalExpression, referenceCandidate: fixture.latex, referenceStatus: "needs-human-review",
      nativeOrLayoutCandidate: item.normalizedLatex, syntaxValid: item.checks.syntax.status === "passed", selectorValid,
      legacyCandidate, legacySyntaxValid: legacySyntax,
      legacyStructureComparison: fixture.sourceKind === "tex" ? (sourceMathML(legacyCandidate) === sourceMathML(fixture.latex) ? "matches-reference-structure" : "differs-from-reference") : "requires-crop-review",
      sourceComparison: fixture.sourceKind === "tex" ? "exact-source-offset-retained" : "original-crop-and-layout-retained",
      mathematicalCorrectness: "needs-human-review",
      confirmedRegression: fixture.correction ? { ...fixture.correction, after: item.normalizedLatex, source: item.source, scope: "staging-only; human review still pending" } : fixture.id === "tex-20.4" ? { before: String.raw`\mathrm{A}(n,k)=\frac{n!}{(n-k)}!`, after: String.raw`\mathrm{A}(n,k)=\frac{n!}{(n-k)!}`, cause: "postfix factorial was emitted outside the denominator", sourceLine: source.location.lines?.[0] } : null
    });
  }
  const snapshot = { schemaVersion: SCHEMA, sources: physical, nativeElements: elements, items };
  // Generated snapshots are reproducible; editor review records live separately.
  json(join(work, "snapshot.json"), snapshot);
  json(join(root, ".audit/source-first-v5/benchmark.json"), { schemaVersion: SCHEMA, fixtureCount: benchmark.length, items: benchmark });
  const checkpoint = {
    schemaVersion: SCHEMA, date: "2026-11-05", snapshotSha256: digest(snapshot),
    physicalSources: physical.map((source) => ({ ...source, mappedTopicIds: [...documentSources, ...nativeDocumentSources].filter((doc) => doc.sourceSha256 === source.sha256).flatMap((doc) => Object.keys(doc.topics)), sourceTopicIds: source.kind === "tex" ? [...new Set(elements.map((element) => element.topicId))] : null })), uniqueSourceCount: sources.length,
    cohortPolicy:"Frozen 40-case benchmark; full live directory inventory is release-v6/inventory.json",
    discoveredOutsideCohort:discovered.filter((entry)=>!physical.some((source)=>source.file===entry.file)),
    pdfCoverage: extracted.coverage, nativeElementCount: elements.length,
    benchmarkItems: items.length, syntaxValid: items.filter((item) => item.checks.syntax.status === "passed").length,
    structuralFailures: items.filter((item) => item.checks.structure.status === "failed").map((item) => item.id),
    unresolvedAnchors: items.filter((item) => !item.selectorValid).map((item) => item.id),
    humanReviewQueue: items.map((item) => item.id), nativeBlocksAwaitingReview: elements.map((item) => item.id),
    protectedTopics: ["CD20", "CD21"], runtimeWrites: 0,
    externalTools: { mineru: "not-installed; not-benchmarked", docling: "not-installed; formula enrichment needs model; not-benchmarked", mathpix: "not-authorized; not-run", marker: "historical-local-runs-only" }
  };
  const previousCheckpoint = join(root, ".audit/source-first-v5/checkpoint.json");
  if (existsSync(previousCheckpoint)) {
    const previous = JSON.parse(readFileSync(previousCheckpoint, "utf8"));
    if (previous.snapshotSha256 === checkpoint.snapshotSha256 && previous.verificationV51) checkpoint.verificationV51 = previous.verificationV51;
    if (previous.snapshotSha256 === checkpoint.snapshotSha256 && previous.verificationV52) checkpoint.verificationV52 = previous.verificationV52;
    if (previous.snapshotSha256 === checkpoint.snapshotSha256 && previous.integrationV53) checkpoint.integrationV53 = previous.integrationV53;
    if (previous.snapshotSha256 === checkpoint.snapshotSha256 && previous.verificationV54) checkpoint.verificationV54 = previous.verificationV54;
    if (previous.snapshotSha256 === checkpoint.snapshotSha256 && previous.developmentV55) checkpoint.developmentV55 = previous.developmentV55;
    if (previous.snapshotSha256 === checkpoint.snapshotSha256 && previous.developmentV56) checkpoint.developmentV56 = previous.developmentV56;
  }
  json(join(root, ".audit/source-first-v5/checkpoint.json"), checkpoint);
  console.log(JSON.stringify({ benchmarkItems: checkpoint.benchmarkItems, syntaxValid: checkpoint.syntaxValid, nativeElements: checkpoint.nativeElementCount, anchorFailures: checkpoint.unresolvedAnchors, structureFailures: checkpoint.structuralFailures }, null, 2));
  return snapshot;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) build();
