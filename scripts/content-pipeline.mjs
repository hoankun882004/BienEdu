import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { curriculumMeta, curriculumTopics } from "../assets/js/data/curriculum.js";
import { calculusSourceExamples } from "../assets/js/data/calculus-source-examples.js";
import { calculusSourcePractice } from "../assets/js/data/calculus-source-practice.js";
import { approvedMathContent } from "../assets/js/data/approved-math-content.js";
import { documentSources } from "../assets/js/data/document-mappings.js";
import { getExampleContent } from "../assets/js/data/example-content.js";
import { getKnowledgeContent } from "../assets/js/data/knowledge-content.js";
import { knowledgePdfMappings } from "../assets/js/data/knowledge-pdf-mappings.js";
import {
  buildActivePracticeSet,
  getExerciseCoverageRows,
  MAX_ACTIVE_QUESTIONS
} from "../assets/js/domain/practice-bank.js";
import {
  CONTENT_STATUS,
  getAvailabilitySummary,
  learningContentRegistry
} from "../assets/js/data/content-registry.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const auditDirectory = join(projectRoot, ".audit");
const inventoryPath = join(auditDirectory, "content-inventory.json");
const proposalsPath = join(auditDirectory, "content-import-proposals.json");
const coveragePath = join(auditDirectory, "content-coverage.md");
const sourceManifestPath = join(auditDirectory, "v11-2-source-manifest.json");
const v14TraceabilityPath = join(auditDirectory, "v14-source-traceability.json");
const v14AuditPath = join(auditDirectory, "v14-source-fidelity-audit.md");
const v15ExerciseCoverageJsonPath = join(auditDirectory, "v15-exercise-coverage.json");
const v15ExerciseCoverageMarkdownPath = join(auditDirectory, "v15-exercise-coverage.md");
const pdfMappingReviewPath = join(auditDirectory, "pdf-mapping-review.md");
const sourceDirectory = join(projectRoot, "39 chuyên đề");
const command = process.argv[2] ?? "validate";

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase();
}

function findPdfToText() {
  const candidates = [
    process.env.PDFTOTEXT_PATH,
    "C:\\Program Files\\Git\\mingw64\\bin\\pdftotext.exe",
    "pdftotext"
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (candidate.includes("\\") && !existsSync(candidate)) continue;
    const result = spawnSync(candidate, ["-v"], { encoding: "utf8", windowsHide: true });
    if (!result.error) return candidate;
  }
  return null;
}

function listPdfs(directory) {
  if (!existsSync(directory)) return [];
  const paths = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...listPdfs(path));
    else if (entry.isFile() && entry.name.toLocaleLowerCase("vi").endsWith(".pdf")) paths.push(path);
  }
  return paths.sort((left, right) => left.localeCompare(right, "vi"));
}

function extractText(path, tool) {
  if (!tool) return { text: "", pageCount: null, extraction: "unavailable" };
  const result = spawnSync(tool, ["-layout", "-enc", "UTF-8", path, "-"], {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true
  });
  if (result.error || result.status !== 0) {
    return { text: "", pageCount: null, extraction: "failed", error: result.error?.message ?? result.stderr?.trim() };
  }
  const pages = result.stdout.split("\f");
  if (!pages.at(-1)?.trim()) pages.pop();
  return { text: result.stdout, pageCount: pages.length, extraction: "ok" };
}

function extractHeadingCandidates(text) {
  const candidates = [];
  const seen = new Set();
  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.replace(/\s+/gu, " ").trim();
    const sourceCode = line.match(/^CD(\d{1,2})[-–](\d{1,2})\s*[–-]?\s*(.+)$/iu);
    const dottedCode = line.match(/^(\d{1,2}\.\d{1,2})\s+([^.…]{3,120})$/u);
    const chapterCode = line.match(/^CD(\d{1,2})\s+(.{3,120})$/iu);
    let item = null;
    if (sourceCode) item = { code: `${Number(sourceCode[1])}.${Number(sourceCode[2])}`, title: sourceCode[3].trim(), kind: "subtopic" };
    else if (dottedCode) item = { code: dottedCode[1], title: dottedCode[2].trim(), kind: "subtopic" };
    else if (chapterCode) item = { code: `CD${String(Number(chapterCode[1])).padStart(2, "0")}`, title: chapterCode[2].trim(), kind: "topic" };
    if (!item) continue;
    const key = `${item.kind}:${item.code}:${item.title}`.toLocaleLowerCase("vi");
    if (!seen.has(key)) {
      seen.add(key);
      candidates.push(item);
    }
  }
  return candidates;
}

function readPreviousInventory() {
  if (!existsSync(inventoryPath)) return new Map();
  try {
    const parsed = JSON.parse(readFileSync(inventoryPath, "utf8"));
    return new Map((parsed.documents ?? []).map((document) => [document.relativePath, document]));
  } catch {
    return new Map();
  }
}

function scanDocuments() {
  const tool = findPdfToText();
  const previous = readPreviousInventory();
  const documents = listPdfs(sourceDirectory).map((path) => {
    const hash = sha256(path);
    const relativePath = relative(projectRoot, path).replaceAll("\\", "/");
    let extraction = extractText(path, tool);
    let extractionPath = path;
    if (extraction.extraction !== "ok") {
      const mirroredSource = documentSources.find((source) => source.sourceSha256 === hash);
      const mirroredPath = mirroredSource ? join(projectRoot, mirroredSource.filePath) : null;
      if (mirroredPath && existsSync(mirroredPath)) {
        extraction = extractText(mirroredPath, tool);
        extractionPath = mirroredPath;
      }
    }
    const prior = previous.get(relativePath);
    return {
      relativePath,
      fileName: basename(path),
      size: statSync(path).size,
      sha256: hash,
      change: !prior ? "new" : prior.sha256 === hash ? "unchanged" : "changed",
      pageCount: extraction.pageCount,
      extraction: extraction.extraction,
      extractionPath: extraction.extraction === "ok" ? relative(projectRoot, extractionPath).replaceAll("\\", "/") : null,
      textCharacterCount: extraction.text.length,
      headingCandidates: extractHeadingCandidates(extraction.text)
    };
  });
  return {
    schemaVersion: 1,
    sourceDirectory: relative(projectRoot, sourceDirectory).replaceAll("\\", "/"),
    scannedAt: new Date().toISOString(),
    extractor: tool ?? null,
    documents
  };
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function findCurriculumMatch(code) {
  if (code.startsWith("CD")) return curriculumTopics.find((topic) => topic.id === code) ?? null;
  for (const topic of curriculumTopics) {
    const exercise = topic.exerciseTypes.find((item) => item.code === code);
    if (exercise) return { topicId: topic.id, ...exercise };
  }
  return null;
}

function buildImportProposals(inventory) {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    policy: "proposal-only: verified content is never overwritten automatically",
    documents: inventory.documents.map((document) => {
      const registered = documentSources.find((source) => source.sourceSha256 === document.sha256);
      const candidates = document.headingCandidates.map((heading) => ({
        ...heading,
        curriculumMatch: findCurriculumMatch(heading.code)
      })).filter((item) => item.curriculumMatch);
      return {
        relativePath: document.relativePath,
        sha256: document.sha256,
        change: document.change,
        registeredDocumentId: registered?.id ?? null,
        action: registered ? "preserve-verified-content" : "manual-review-required",
        affectedTopics: registered ? Object.keys(registered.topics) : [...new Set(candidates.map((item) => item.curriculumMatch.topicId ?? item.curriculumMatch.id))],
        candidates,
        conflict: registered && document.change === "changed"
          ? "The source hash changed; keep the current verified lesson until a reviewer approves replacements."
          : null
      };
    })
  };
}

function validateRegistry(inventory) {
  const errors = [];
  const warnings = [];
  const allSubtopics = Object.values(learningContentRegistry.topics).flatMap((topic) => Object.values(topic.subtopics));
  if (Object.keys(learningContentRegistry.topics).length !== curriculumMeta.topicCount) errors.push("Registry does not contain all 39 curriculum topics.");
  if (allSubtopics.length !== curriculumMeta.exerciseTypeCount) errors.push("Registry does not contain all 347 curriculum subtopics.");

  const ids = [];
  for (const subtopic of allSubtopics) {
    for (const sectionName of ["knowledge", "examples"]) {
      const section = subtopic.sections[sectionName];
      for (const unit of section.units) {
        ids.push(unit.id);
        if (!unit.source?.documentId || !unit.source.pages.length) errors.push(`${unit.id} is missing a verified PDF source reference.`);
      }
    }
    if (subtopic.status === CONTENT_STATUS.AVAILABLE) {
      for (const [name, section] of Object.entries(subtopic.sections)) {
        if (section.status !== CONTENT_STATUS.AVAILABLE || !section.count) errors.push(`${subtopic.code}.${name} is marked available without usable content.`);
      }
    }
  }
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicateIds.length) errors.push(`Duplicate stable content IDs: ${duplicateIds.join(", ")}`);

  const sourceExamples = Object.values(calculusSourceExamples).flat();
  const sourcePractice = Object.values(calculusSourcePractice).flat();
  if (Object.keys(calculusSourceExamples).length !== 26) errors.push("Source worked examples do not cover all 26 CD12-CD14 subtopics.");
  if (sourceExamples.length !== 52) errors.push(`Expected 52 source worked examples, found ${sourceExamples.length}.`);
  if (Object.keys(calculusSourcePractice).length !== 26) errors.push("Source self-practice does not cover all 26 CD12-CD14 subtopics.");
  if (sourcePractice.length !== 260) errors.push(`Expected 260 source self-practice items, found ${sourcePractice.length}.`);
  for (const [code, examples] of Object.entries(calculusSourceExamples)) {
    if (examples.length !== 2) errors.push(`${code} must account for exactly two source worked examples.`);
  }
  for (const [code, exercises] of Object.entries(calculusSourcePractice)) {
    if (exercises.length !== 10) errors.push(`${code} must account for exactly ten source self-practice items.`);
  }
  const sourceIds = [...sourceExamples, ...sourcePractice].map((item) => item.sourceBlockId);
  const duplicateSourceIds = [...new Set(sourceIds.filter((id, index) => sourceIds.indexOf(id) !== index))];
  if (sourceIds.some((id) => !id)) errors.push("A CD12-CD14 source item is missing sourceBlockId.");
  if (duplicateSourceIds.length) errors.push(`Duplicate source block IDs: ${duplicateSourceIds.join(", ")}`);
  for (const exercise of sourcePractice) {
    if (!exercise.answerKey) errors.push(`${exercise.id} is missing its source answer key.`);
    if (exercise.automatedGrading !== "unsupported") errors.push(`${exercise.id} must not be auto-graded without a symbolic equivalence validator.`);
    if (!exercise.sourcePages.length || exercise.sourcePages.some((page) => page < 1 || page > 49)) errors.push(`${exercise.id} has an invalid source page reference.`);
  }
  const conflicts = sourcePractice.filter((exercise) => exercise.verification === "source-conflict");
  if (conflicts.length) warnings.push(`${conflicts.length} source answer keys are preserved but marked needs-review; none are auto-graded.`);

  for (const source of documentSources) {
    const assetPath = join(projectRoot, source.filePath);
    if (!existsSync(assetPath)) errors.push(`Missing published source asset: ${source.filePath}`);
    else if (sha256(assetPath) !== source.sourceSha256) errors.push(`Hash mismatch for ${source.filePath}`);
    const original = inventory.documents.find((document) => document.sha256 === source.sourceSha256);
    if (!original) warnings.push(`No original PDF with the registered hash was found in 39 chuyên đề for ${source.id}.`);
    if (original?.pageCount !== null && original?.pageCount !== source.pageCount) errors.push(`Page count mismatch for ${source.id}: expected ${source.pageCount}, scanned ${original.pageCount}.`);
  }

  const requiredPdfTopics = new Set(["CD12", "CD13", "CD14", "CD20", "CD21"]);
  const requiredPdfCodes = curriculumTopics
    .filter((topic) => requiredPdfTopics.has(topic.id))
    .flatMap((topic) => topic.exerciseTypes.map((exercise) => exercise.code));
  if (Object.keys(knowledgePdfMappings).length !== requiredPdfCodes.length) {
    errors.push(`Expected ${requiredPdfCodes.length} verified Knowledge PDF mappings, found ${Object.keys(knowledgePdfMappings).length}.`);
  }
  for (const code of requiredPdfCodes) {
    const mapping = knowledgePdfMappings[code];
    if (!mapping) {
      errors.push(`${code} has no Knowledge PDF mapping.`);
      continue;
    }
    const source = documentSources.find((item) => item.id === mapping.documentId);
    if (!mapping.verified || mapping.precision !== "exact-region") errors.push(`${code} is not an exact verified PDF mapping.`);
    if (!source || source.sourceSha256 !== mapping.sourceSha256) errors.push(`${code} references an unknown or changed source PDF.`);
    if (mapping.startPage !== mapping.regions[0]?.page || mapping.endPage !== mapping.regions.at(-1)?.page) {
      errors.push(`${code} page boundaries do not match its rendered regions.`);
    }
    for (const [index, region] of mapping.regions.entries()) {
      if (region.page < 1 || region.page > mapping.pageCount) errors.push(`${region.id} uses an invalid PDF page.`);
      if (region.x < 0 || region.y < 0 || region.width <= 0 || region.height <= 0 || region.x + region.width > 1.0001 || region.y + region.height > 1.0001) {
        errors.push(`${region.id} has invalid normalized crop coordinates.`);
      }
      if (index && region.page !== mapping.regions[index - 1].page + 1) errors.push(`${code} has a non-contiguous page sequence.`);
    }
  }
  for (const code of Object.keys(knowledgePdfMappings)) {
    if (!requiredPdfCodes.includes(code)) warnings.push(`${code} has a PDF mapping outside the currently audited topic set.`);
  }

  for (const code of requiredPdfCodes.filter((item) => /^(?:12|13|14)\./.test(item))) {
    const reading = getKnowledgeContent(code);
    const notation = (reading?.formulae ?? [])
      .flatMap((formula) => [formula.value, ...(formula.expressions ?? [])])
      .join(" ");
    if (/(?:\\(?:sec|csc)\b|\b(?:sec|csc)\s*[²^])/i.test(notation)) {
      errors.push(`${code} contains sec/csc although the registered CD12–CD14 source uses fractional sin/cos notation.`);
    }
  }

  for (const [code, record] of Object.entries(approvedMathContent)) {
    if (record.verification?.status !== "verified") continue;
    if (!record.verification.reviewer || !record.verification.reviewedAt) errors.push(`${code} is verified without reviewer evidence.`);
    if (record.verification.sourceHash !== record.source?.sha256) errors.push(`${code} verified source hash does not match its record.`);
    if (record.verification.formulasChecked !== true || record.verification.boundariesChecked !== true) {
      errors.push(`${code} is verified without formula and boundary checks.`);
    }
  }
  return { errors, warnings, allSubtopics };
}

function validateV15ExerciseCoverage(rows) {
  const errors = [];
  if (rows.length !== 51) errors.push(`Expected 51 V15 exercise coverage rows, found ${rows.length}.`);
  for (const row of rows) {
    if (row.totalReadyQuestions > MAX_ACTIVE_QUESTIONS) errors.push(`${row.subtopicId} exceeds the ${MAX_ACTIVE_QUESTIONS}-question cap.`);
    if (row.readySourceQuestions + row.readyGeneratedQuestions !== row.totalReadyQuestions) errors.push(`${row.subtopicId} has inconsistent ready counts.`);
    if (row.pendingVerification < 0) errors.push(`${row.subtopicId} has a negative pending-verification count.`);
    const active = buildActivePracticeSet(row.subtopicId);
    for (const question of active) {
      if (question.subtopicId !== row.subtopicId || question.sourceTopic !== row.subtopicId) errors.push(`${question.id} is assigned to the wrong subtopic.`);
      if (question.gradeId !== "12" || question.topicId !== `CD${row.subtopicId.split(".")[0]}`) errors.push(`${question.id} is missing its grade/topic identity.`);
      if (!question.blueprintId || !question.sourceDocumentId || !question.patternId) errors.push(`${question.id} has incomplete provenance metadata.`);
      if (!question.solutionSteps?.length) errors.push(`${question.id} has no complete solution steps.`);
      if (!['verified', 'programmatically-verified'].includes(question.verificationStatus)) errors.push(`${question.id} is active without an accepted verification status.`);
    }
  }
  const firstCalculus = rows.find((row) => row.subtopicId === "12.1");
  if (!firstCalculus || firstCalculus.readySourceQuestions !== 10 || firstCalculus.readyGeneratedQuestions !== 0 || firstCalculus.totalReadyQuestions !== 10) {
    errors.push("12.1 must publish exactly ten verified PDF-source exercises and stop before generation.");
  }
  for (const row of rows.filter((item) => /^(?:20|21)\./u.test(item.subtopicId))) {
    if (row.readyGeneratedQuestions !== 3 || row.totalReadyQuestions !== 3) errors.push(`${row.subtopicId} must publish its three independently verified generated questions.`);
  }
  for (const row of rows.filter((item) => /^(?:12|13|14)\./u.test(item.subtopicId) && item.subtopicId !== "12.1")) {
    if (row.totalReadyQuestions !== 0 || row.pendingVerification !== 10 || row.exactTypeValidationStatus !== "needs-review") {
      errors.push(`${row.subtopicId} must remain unpublished until its source solutions and exact-type blueprint are verified.`);
    }
  }
  return errors;
}

function v15ExerciseCoverageReport(rows) {
  const totals = rows.reduce((summary, row) => ({
    sourceFound: summary.sourceFound + row.sourceQuestionsFound,
    readySource: summary.readySource + row.readySourceQuestions,
    readyGenerated: summary.readyGenerated + row.readyGeneratedQuestions,
    totalReady: summary.totalReady + row.totalReadyQuestions,
    pending: summary.pending + row.pendingVerification
  }), { sourceFound: 0, readySource: 0, readyGenerated: 0, totalReady: 0, pending: 0 });
  const lines = [
    "# BienEdu V15 — Exercise coverage",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Active-bank policy: source first, exact subtopic only, independently verified answer, complete solution, maximum ${MAX_ACTIVE_QUESTIONS} questions per subtopic.`,
    "",
    `Totals: ${totals.sourceFound} source exercises found; ${totals.readySource} ready source; ${totals.readyGenerated} ready generated; ${totals.totalReady} ready overall; ${totals.pending} pending verification.`,
    "",
    "| Subtopic | Source found | Ready source | Ready generated | Total ready | Pending verification | Exact-type status |",
    "| --- | ---: | ---: | ---: | ---: | ---: | --- |",
    ...rows.map((row) => `| ${row.subtopicId} | ${row.sourceQuestionsFound} | ${row.readySourceQuestions} | ${row.readyGeneratedQuestions} | ${row.totalReadyQuestions} | ${row.pendingVerification} | ${row.exactTypeValidationStatus} |`),
    ""
  ];
  return `${lines.join("\n")}\n`;
}

function topicSourceMetrics(topicId) {
  const record = learningContentRegistry.topics[topicId];
  const subtopics = Object.values(record.subtopics);
  const codePrefix = topicId.slice(2);
  const sourceExamples = Object.entries(calculusSourceExamples)
    .filter(([code]) => code.startsWith(`${codePrefix}.`))
    .flatMap(([, examples]) => examples);
  const sourcePractice = Object.entries(calculusSourcePractice)
    .filter(([code]) => code.startsWith(`${codePrefix}.`))
    .flatMap(([, exercises]) => exercises);
  return {
    knowledgeUnits: subtopics.reduce((total, item) => total + (item.sections.knowledge.count ?? 0), 0),
    displayedExamples: subtopics.reduce((total, item) => total + (item.sections.examples.count ?? 0), 0),
    sourceExamples: sourceExamples.length,
    sourcePractice: sourcePractice.length,
    answerKeys: sourcePractice.filter((item) => item.answerKey).length,
    autoGradable: sourcePractice.filter((item) => item.automatedGrading === "supported").length,
    needsReview: sourcePractice.filter((item) => item.verification !== "verified").length
  };
}

function buildSourceManifest() {
  const auditedTopicIds = ["CD12", "CD13", "CD14", "CD20", "CD21"];
  const knowledgeUnits = auditedTopicIds.flatMap((topicId) =>
    Object.values(learningContentRegistry.topics[topicId].subtopics).flatMap((subtopic) => {
      const reading = getKnowledgeContent(subtopic.code);
      const readingPages = reading?.pages ?? (reading ? [reading] : []);
      return subtopic.sections.knowledge.units.map((unit, pageIndex) => {
        const page = readingPages[pageIndex] ?? reading;
        const common = {
          topicId,
          code: subtopic.code,
          destinationSection: "knowledge",
          destinationSlideId: unit.id,
          sourceDocumentId: unit.source.documentId,
          sourcePages: unit.source.pages,
          status: "imported-and-verified"
        };
        const blocks = [{
          ...common,
          id: `${unit.id}-lead`,
          kind: "knowledge-introduction",
          heading: unit.title
        }];
        (page?.formulae ?? []).forEach((formula, index) => blocks.push({
          ...common,
          id: `${unit.id}-formula-${String(index + 1).padStart(2, "0")}`,
          kind: "formula-or-property",
          heading: formula.label
        }));
        (page?.points ?? []).forEach((point, index) => blocks.push({
          ...common,
          id: `${unit.id}-method-${String(index + 1).padStart(2, "0")}`,
          kind: "method-or-recognition-tip",
          heading: point.label
        }));
        if (page?.note) blocks.push({
          ...common,
          id: `${unit.id}-note`,
          kind: page.note.tone === "warning" ? "warning" : "note",
          heading: page.note.label
        });
        return blocks;
      });
    })
  ).flat();
  const workedExamples = Object.entries(calculusSourceExamples).flatMap(([code, examples]) => examples.map((example) => ({
    id: example.sourceBlockId,
    runtimeId: example.id,
    kind: "worked-example",
    topicId: `CD${code.split(".")[0]}`,
    code,
    title: example.title,
    sourceDocumentId: "cd12-cd14-calculus",
    sourcePages: example.sourcePages,
    destinationSection: "examples",
    destinationSlideId: example.id,
    status: "imported-and-verified"
  })));
  const selfPractice = Object.entries(calculusSourcePractice).flatMap(([code, exercises]) => exercises.map((exercise) => ({
    id: exercise.sourceBlockId,
    runtimeId: exercise.id,
    kind: "self-practice",
    topicId: `CD${code.split(".")[0]}`,
    code,
    questionNumber: exercise.number,
    sourceDocumentId: "cd12-cd14-calculus",
    sourcePages: exercise.sourcePages,
    destinationSection: "practice-source-bank",
    destinationSlideId: exercise.id,
    answerKeyStatus: exercise.answerKeyStatus,
    automatedGrading: exercise.automatedGrading,
    verification: exercise.verification,
    status: exercise.verification === "verified" ? "imported-and-verified" : "imported-needs-review"
  })));
  const probabilityExamples = ["CD20", "CD21"].flatMap((topicId) =>
    Object.values(learningContentRegistry.topics[topicId].subtopics).flatMap((subtopic) =>
      (getExampleContent(subtopic.code) ?? []).map((example, index) => {
        const destinationSlideId = subtopic.sections.examples.units[index]?.id ?? `${subtopic.code}-example-${index + 1}`;
        return {
        id: destinationSlideId,
        kind: "worked-example",
        topicId,
        code: subtopic.code,
        title: example.title,
        sourceDocumentId: learningContentRegistry.topics[topicId].documentId,
        sourcePages: example.sourcePages,
        destinationSection: "examples",
        destinationSlideId,
        status: "imported-and-verified"
      }})
    )
  );
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    documents: documentSources.map((document) => ({
      id: document.id,
      filePath: document.filePath,
      pageCount: document.pageCount,
      sha256: document.sourceSha256,
      auditedTopics: Object.keys(document.topics)
    })),
    summary: {
      knowledgeSlides: auditedTopicIds.reduce((total, topicId) => total + Object.values(learningContentRegistry.topics[topicId].subtopics).reduce((sum, subtopic) => sum + subtopic.sections.knowledge.count, 0), 0),
      knowledgeSourceBlocks: knowledgeUnits.length,
      calculusWorkedExamples: workedExamples.length,
      cd20Cd21WorkedExamples: probabilityExamples.length,
      selfPractice: selfPractice.length,
      answerKeys: selfPractice.filter((item) => item.answerKeyStatus).length,
      needsReview: selfPractice.filter((item) => item.verification !== "verified").length,
      excludedWithReason: 1,
      verifiedKnowledgePdfMappings: Object.keys(knowledgePdfMappings).length,
      verifiedKnowledgePdfRegions: Object.values(knowledgePdfMappings).reduce((total, mapping) => total + mapping.regions.length, 0)
    },
    knowledgePdfMappings: Object.values(knowledgePdfMappings).map((mapping) => ({
      topicId: mapping.topicId,
      subtopicId: mapping.subtopicId,
      documentId: mapping.documentId,
      startPage: mapping.startPage,
      endPage: mapping.endPage,
      precision: mapping.precision,
      verified: mapping.verified,
      regions: mapping.regions
    })),
    blocks: [...knowledgeUnits, ...workedExamples, ...probabilityExamples, ...selfPractice, {
      id: "cd12-cd14-formula-summary-page",
      kind: "summary",
      topicId: null,
      sourcePages: [49],
      status: "excluded-with-reason",
      reason: "The final formula summary duplicates formulas already represented in the per-subtopic Knowledge lessons."
    }]
  };
}

function runtimeFormulaExpressions(reading) {
  const pages = reading?.pages ?? (reading ? [reading] : []);
  return pages.flatMap((page) => (page.formulae ?? []).flatMap((formula) => formula.expressions ?? [formula.value]));
}

function hasImmutableSourceApproval(code) {
  const record = approvedMathContent[code];
  return Boolean(
    record?.verification?.status === "verified"
    && record.verification.reviewer
    && record.verification.reviewedAt
    && record.verification.sourceHash === record.source?.sha256
    && record.verification.formulasChecked === true
    && record.verification.boundariesChecked === true
  );
}

function buildV14Traceability() {
  const codes = Object.keys(knowledgePdfMappings);
  const subtopics = codes.map((code) => {
    const mapping = knowledgePdfMappings[code];
    const reading = getKnowledgeContent(code);
    const pages = reading?.pages ?? (reading ? [reading] : []);
    const approved = approvedMathContent[code] ?? null;
    const verified = hasImmutableSourceApproval(code);
    const blocks = pages.flatMap((page, pageIndex) => {
      const sourcePages = page.sourcePages?.length ? page.sourcePages : mapping.regions.map((region) => region.page);
      const common = {
        documentId: mapping.documentId,
        sourcePages,
        topicId: mapping.topicId,
        subtopicId: code,
        destinationSection: "knowledge",
        destinationSlideId: learningContentRegistry.topics[mapping.topicId].subtopics[code].sections.knowledge.units[pageIndex]?.id ?? `${code}-knowledge-${pageIndex + 1}`,
        status: verified ? "verified" : "needs-review"
      };
      return [
        { ...common, id: `${code}-knowledge-${pageIndex + 1}-lead`, kind: "definition-or-explanation", sourceHeading: "Kiến thức trọng tâm" },
        ...(page.formulae ?? []).map((formula, index) => ({ ...common, id: `${code}-knowledge-${pageIndex + 1}-formula-${String(index + 1).padStart(2, "0")}`, kind: "formula-or-property", sourceHeading: formula.label })),
        ...(page.points ?? []).map((point, index) => ({ ...common, id: `${code}-knowledge-${pageIndex + 1}-method-${String(index + 1).padStart(2, "0")}`, kind: "method", sourceHeading: point.label })),
        ...(page.note ? [{ ...common, id: `${code}-knowledge-${pageIndex + 1}-note`, kind: "note-or-warning", sourceHeading: page.note.label }] : [])
      ];
    });
    return {
      topicId: mapping.topicId,
      subtopicId: code,
      sourceDocumentId: mapping.documentId,
      sourcePages: [...new Set(mapping.regions.map((region) => region.page))],
      sourceRegionIds: mapping.regions.map((region) => region.id),
      destinationKnowledgeSlides: learningContentRegistry.topics[mapping.topicId].subtopics[code].sections.knowledge.units.map((unit) => unit.id),
      runtimeFormulaExpressions: runtimeFormulaExpressions(reading).length,
      approvedSourceBlocks: approved?.blocks?.length ?? 0,
      verification: verified ? "verified" : "needs-review",
      reviewEvidence: verified ? {
        reviewer: approved.verification.reviewer,
        reviewedAt: approved.verification.reviewedAt,
        sourceHash: approved.verification.sourceHash
      } : null,
      blocks
    };
  });
  const verifiedSubtopics = subtopics.filter((item) => item.verification === "verified");
  const needsReviewSubtopics = subtopics.filter((item) => item.verification === "needs-review");
  return {
    schemaVersion: "bienedu.source-fidelity.v14",
    generatedAt: new Date().toISOString(),
    allowedStatuses: ["verified", "needs-review", "not-imported", "extraction-error", "excluded-with-reason"],
    documents: documentSources.map((document) => ({
      id: document.id,
      filePath: document.filePath,
      pageCount: document.pageCount,
      sha256: document.sourceSha256,
      topics: Object.keys(document.topics)
    })),
    summary: {
      sourcePagesInspected: documentSources.reduce((total, document) => total + document.pageCount, 0),
      mappedSubtopics: subtopics.length,
      verifiedSubtopics: verifiedSubtopics.length,
      needsReviewSubtopics: needsReviewSubtopics.length,
      runtimeFormulaExpressions: subtopics.reduce((total, item) => total + item.runtimeFormulaExpressions, 0),
      verifiedRuntimeFormulaExpressions: verifiedSubtopics.reduce((total, item) => total + item.runtimeFormulaExpressions, 0),
      traceabilityBlocks: subtopics.reduce((total, item) => total + item.blocks.length, 0)
    },
    subtopics,
    exclusions: [{
      id: "cd12-cd14-formula-summary-page",
      documentId: "cd12-cd14-calculus",
      sourcePages: [49],
      status: "excluded-with-reason",
      reason: "Trang 49 là bảng công thức tổng hợp lặp lại các công thức đã được ánh xạ vào các bài CD12–CD14; trang vẫn được kiểm kê và đối chiếu, không tạo lesson ID mới."
    }],
    unsupportedFilenameClaims: [
      { topicId: "CD22", documentId: "cd20-cd21-theory", status: "not-imported", reason: "PDF 18 trang kết thúc ở CD21.8 và không có trang bài học CD22." },
      { topicId: "CD23", documentId: "cd20-cd21-theory", status: "not-imported", reason: "PDF 18 trang kết thúc ở CD21.8 và không có trang bài học CD23." }
    ]
  };
}

function validateV14Traceability(traceability) {
  const errors = [];
  const statuses = new Set(traceability.allowedStatuses);
  const blockIds = traceability.subtopics.flatMap((subtopic) => subtopic.blocks.map((block) => block.id));
  const duplicates = [...new Set(blockIds.filter((id, index) => blockIds.indexOf(id) !== index))];
  if (duplicates.length) errors.push(`Duplicate V14 traceability block IDs: ${duplicates.join(", ")}`);
  for (const subtopic of traceability.subtopics) {
    if (!statuses.has(subtopic.verification)) errors.push(`${subtopic.subtopicId} has invalid V14 verification status.`);
    if (!subtopic.sourcePages.length || !subtopic.sourceRegionIds.length) errors.push(`${subtopic.subtopicId} is missing source traceability.`);
    if (!subtopic.destinationKnowledgeSlides.length) errors.push(`${subtopic.subtopicId} is missing a runtime Knowledge destination.`);
    if (subtopic.verification === "verified" && !subtopic.reviewEvidence) errors.push(`${subtopic.subtopicId} is verified without review evidence.`);
    for (const block of subtopic.blocks) if (!statuses.has(block.status)) errors.push(`${block.id} has invalid status ${block.status}.`);
  }
  return errors;
}

function v14AuditReport(traceability) {
  const verifiedCodes = traceability.subtopics.filter((item) => item.verification === "verified").map((item) => item.subtopicId);
  const pendingCodes = traceability.subtopics.filter((item) => item.verification === "needs-review").map((item) => item.subtopicId);
  const perTopic = ["CD12", "CD13", "CD14", "CD20", "CD21"].map((topicId) => {
    const rows = traceability.subtopics.filter((item) => item.topicId === topicId);
    return `| ${topicId} | ${rows.length} | ${rows.filter((item) => item.verification === "verified").length} | ${rows.filter((item) => item.verification === "needs-review").length} | ${rows.reduce((sum, item) => sum + item.runtimeFormulaExpressions, 0)} |`;
  });
  return `# BIENEDU V14 — Kiểm toán độ trung thành nguồn\n\nGenerated: ${traceability.generatedAt}\n\n## Kết luận kiểm toán\n\n- Đã mở và kiểm tra đủ 67/67 trang của hai PDF bằng text/geometry extraction và bộ ảnh page review.\n- Đã lập traceability cho ${traceability.summary.mappedSubtopics} bài có nguồn, ${traceability.summary.traceabilityBlocks} block Knowledge và ${traceability.summary.runtimeFormulaExpressions} biểu thức công thức đang render.\n- Chỉ ${traceability.summary.verifiedSubtopics}/${traceability.summary.mappedSubtopics} bài hiện có immutable review record đủ reviewer, source hash, formula check và boundary check: ${verifiedCodes.join(", ") || "không có"}.\n- ${traceability.summary.needsReviewSubtopics} bài còn lại không được V14 tự động nâng thành verified: ${pendingCodes.join(", ")}.\n- Vì còn hàng đợi review, báo cáo này không tuyên bố migration V14 đã hoàn tất toàn bộ.\n\n## 1. PDF đã kiểm tra\n\n| Tài liệu | Trang | SHA-256 | Phạm vi xác nhận |\n| --- | ---: | --- | --- |\n${traceability.documents.map((document) => `| ${document.filePath} | ${document.pageCount} | \`${document.sha256}\` | ${document.topics.join(", ")} |`).join("\n")}\n\n## 2. Trang nguồn đã xem\n\n- C12-CD13-CD14.pdf: trang 1–49; nội dung bài học ở trang 3–48, trang 49 là bảng tổng hợp được ghi nhận bằng trạng thái excluded-with-reason.\n- PDF tổ hợp–xác suất: trang 1–18; bài học thực tế dừng ở CD21.8, không có bài CD22/CD23.\n\n## 3. Chủ đề và bài đã audit\n\n| Chủ đề | Bài có mapping | Verified V14 | Needs review | Biểu thức runtime |\n| --- | ---: | ---: | ---: | ---: |\n${perTopic.join("\n")}\n\n## 4. Công thức đối chiếu\n\n- Inventory runtime: ${traceability.summary.runtimeFormulaExpressions} biểu thức.\n- Có immutable source approval: ${traceability.summary.verifiedRuntimeFormulaExpressions} biểu thức thuộc ${verifiedCodes.join(", ")}.\n- 12.1 đã khôi phục bảng nguyên hàm, hàng $\\int 1\\,dx=x+C$, dạng $1/\\cos^2x$, $1/\\sin^2x$ và các điều kiện $n\\ne-1$, $a>0$, $a\\ne1$.\n- Các biểu thức thuộc bài chưa approved vẫn ở trạng thái needs-review dù KaTeX có thể parse thành công.\n\n## 5. Công thức đã sửa\n\n- 12.1: bỏ hai thay thế ký hiệu sec²/csc²; khôi phục đúng hai dạng phân thức lượng giác nguồn.\n- 12.1: khôi phục hàng nguyên hàm của 1 và toàn bộ bảng bốn cột bị Marker làm mất.\n- 12.1: sửa các phân số, số mũ và delimiter hỏng trong ví dụ, bài tự luyện và đáp số; 23 correction có provenance.\n\n## 6. Công thức bị thiếu đã khôi phục\n\n- $\\int 1\\,dx=x+C$.\n- Toàn bộ hàng của bảng công thức trang 3 trong immutable review record 12.1.\n\n## 7. Thay đổi ký hiệu đã hoàn nguyên\n\n- $\\sec^2x$ → $1/\\cos^2x$.\n- $\\csc^2x$ → $1/\\sin^2x$.\n- Rule kiểm tra chỉ áp dụng cho document CD12–CD14; không cấm sec/csc ở tài liệu tương lai có bằng chứng nguồn.\n\n## 8. Điều kiện đã khôi phục\n\n- $n\\ne-1$.\n- $a>0$, $a\\ne1$ cho $a^x$.\n- $a>0$ cho $\\int dx/(a^2+x^2)$.\n- Điều kiện từng bài tự luyện 12.1 được giữ cùng biểu thức liên quan.\n\n## 9. Định nghĩa và giải thích\n\n- Định nghĩa nguyên hàm và mệnh đề các nguyên hàm chỉ sai khác hằng số ở 12.1 đã trở về câu nguồn.\n- Các bài chưa có immutable review record vẫn phải đối chiếu nguyên văn prose; không được xem nhãn verified cũ là bằng chứng V14.\n\n## 10. Ví dụ có lời giải\n\n- Immutable record 12.1 giữ Ví dụ 1, Ví dụ 2 và phép kiểm tra đạo hàm.\n- Immutable record 20.2 giữ ba ví dụ nguồn và hình sơ đồ trang 6.\n- Các example object còn lại có mapping và source pages nhưng prose dựng lại vẫn nằm trong hàng đợi review V14.\n\n## 11. Hạng mục còn phải review\n\n- ${traceability.summary.needsReviewSubtopics} subtopic chưa có immutable source approval.\n- 9 đáp số tự luyện calculus có xung đột hoặc mơ hồ đã biết; giữ nguyên đáp số nguồn, không auto-grade.\n- Không publish record Marker/PyMuPDF còn formula flag hoặc thiếu reviewer evidence.\n\n## 12. Coverage theo chủ đề\n\nBảng ở mục 3 là trạng thái source-fidelity. Coverage cấu trúc và trạng thái runtime tiếp tục được báo cáo riêng trong \`.audit/content-coverage.md\`.\n\n## 13. Tệp thay đổi chính\n\n- \`assets/js/data/calculus-knowledge-details.js\`\n- \`assets/content/approved/cd12-cd14-calculus/12.1/\`\n- \`assets/js/data/approved-math-content.js\`\n- \`scripts/math-pdf/normalize.mjs\`\n- \`scripts/content-pipeline.mjs\`\n- Các test Knowledge, LaTeX và PDF pipeline liên quan.\n\n## 14. KaTeX\n\nChạy \`npm.cmd run test:latex\`. Mọi raw LaTeX trong immutable approved records phải parse strict; số lượng parse được báo bởi test, không thay cho source review.\n\n## 15. Playwright\n\nChạy \`npm.cmd run test:v13\` sau mỗi đợt publish để kiểm tra 12.1, 12.4, 13.1, 14.1, 20.1, 20.2, 20.17, 21.1 và 21.8 trên mobile/desktop.\n\n## 16. Regression\n\nChạy \`npm.cmd run verify\` và \`git diff --check\`. Progress ID, direct links và navigation phải giữ nguyên.\n\n## 17. Quy trình nhập PDF tương lai\n\n\`\`\`powershell\nnpm.cmd run content:scan\nnpm.cmd run content:math:doctor\nnpm.cmd run content:math:extract -- --subtopic 12.1 --provider marker --disable-ocr\nnpm.cmd run content:math:validate -- --subtopic 12.1\nnpm.cmd run content:math:correct -- --subtopic 12.1 --corrections content/review/<document>/<code>.corrections.json\nnpm.cmd run content:math:approve -- --subtopic 12.1 --reviewer "Tên người review" --source-verified --formulas-verified --boundaries-verified\nnpm.cmd run content:math:publish -- --subtopic 12.1\nnpm.cmd run content:validate\nnpm.cmd run verify\n\`\`\`\n\nKhông dùng \`--replace-review\` với record verified. Nội dung mới chỉ được publish sau khi source hash, ranh giới và toàn bộ công thức đã được đối chiếu.\n`;
}

function pdfMappingReviewReport() {
  const mappings = Object.values(knowledgePdfMappings);
  const lines = [
    "# BienEdu Knowledge PDF mapping review",
    "",
    "Generated from the checked-in verified mapping. Coordinates use normalized top-left PDF page space.",
    "",
    `- Verified subtopics: ${mappings.length}.`,
    `- Verified page regions: ${mappings.reduce((total, mapping) => total + mapping.regions.length, 0)}.`,
    "- Precision: exact heading-to-next-heading region boundaries.",
    "- CD14.9 ends on original page 48; page 49 is a document-wide formula summary and remains excluded.",
    "- The CD20–CD23-named source ends at CD21.8; no CD22/CD23 lesson mapping is claimed.",
    "",
    "| Topic | Subtopic | Document | Start | End | Regions | Status |",
    "| --- | --- | --- | ---: | ---: | --- | --- |"
  ];
  for (const mapping of mappings) {
    const regions = mapping.regions
      .map((region) => `p${region.page} [${region.x.toFixed(3)}, ${region.y.toFixed(3)}, ${region.width.toFixed(3)}, ${region.height.toFixed(3)}]`)
      .join("<br>");
    lines.push(`| ${mapping.topicId} | ${mapping.subtopicId} | ${mapping.documentId} | ${mapping.startPage} | ${mapping.endPage} | ${regions} | verified exact-region |`);
  }
  return `${lines.join("\n")}\n`;
}

function validateSourceManifest(manifest) {
  const errors = [];
  const ids = manifest.blocks.map((block) => block.id);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicateIds.length) errors.push(`Duplicate manifest block IDs: ${duplicateIds.join(", ")}`);
  for (const block of manifest.blocks) {
    if (!block.sourcePages?.length) errors.push(`${block.id} has no source page.`);
    if (block.status !== "excluded-with-reason" && (!block.destinationSection || !block.destinationSlideId)) {
      errors.push(`${block.id} has no runtime destination.`);
    }
  }
  return errors;
}

function coverageReport(inventory, validation) {
  const summary = getAvailabilitySummary();
  const mappedCodes = Object.keys(knowledgePdfMappings);
  const v14VerifiedCodes = mappedCodes.filter(hasImmutableSourceApproval);
  const lines = [
    "# BienEdu content coverage",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Audit summary",
    "",
    `- Curriculum: ${curriculumMeta.topicCount} topics / ${curriculumMeta.exerciseTypeCount} subtopics.`,
    `- Source PDFs discovered: ${inventory.documents.length}.`,
    `- Topic availability: ${summary.topics.available} available, ${summary.topics.partial} partial, ${summary.topics["coming-soon"]} coming soon, ${summary.topics["needs-review"]} needs review.`,
    "- CD12-CD14: all 26 Knowledge lessons, 52 source worked examples, 260 source self-practice items and 260 answer keys are accounted for. V15 publishes only the 10 fully solved and independently verified 12.1 source exercises; the other 250 remain outside the active bank.",
    "- Source completeness and mathematical verification are independent: pending exercises are retained for review but never graded or displayed as ready practice.",
    "- CD20-CD21: all headings, theory blocks and worked examples in the 18-page file are represented. The file contains no CD22/CD23 lesson pages despite its filename/cover wording.",
    `- V14 source-fidelity: ${v14VerifiedCodes.length}/${mappedCodes.length} mapped subtopics have immutable block-level source approval (${v14VerifiedCodes.join(", ") || "none"}); the remaining ${mappedCodes.length - v14VerifiedCodes.length} stay needs-review and are not silently promoted by coverage counts.`,
    "",
    "## Source documents",
    "",
    "| File | Pages | SHA-256 | Change | Registered coverage |",
    "| --- | ---: | --- | --- | --- |",
    ...inventory.documents.map((document) => {
      const source = documentSources.find((item) => item.sourceSha256 === document.sha256);
      return `| ${document.fileName} | ${document.pageCount ?? "?"} | \`${document.sha256}\` | ${document.change} | ${source ? Object.keys(source.topics).join(", ") : "manual review"} |`;
    }),
    "",
    "## Topic coverage",
    "",
    "| Topic | Subtopics | Available | Knowledge | Displayed examples | Source examples | Source practice | Answer keys | Auto-graded source | Needs review | Source coverage | Runtime |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |"
  ];

  for (const topic of curriculumTopics) {
    const record = learningContentRegistry.topics[topic.id];
    const subtopics = Object.values(record.subtopics);
    const available = subtopics.filter((item) => item.status === CONTENT_STATUS.AVAILABLE);
    const knowledge = subtopics.reduce((total, item) => total + (item.sections.knowledge.count ?? 0), 0);
    const examples = subtopics.reduce((total, item) => total + (item.sections.examples.count ?? 0), 0);
    const metrics = ["CD12", "CD13", "CD14"].includes(topic.id)
      ? topicSourceMetrics(topic.id)
      : { sourceExamples: examples, sourcePractice: 0, answerKeys: 0, autoGradable: 0, needsReview: 0 };
    lines.push(`| ${topic.id} | ${topic.exerciseTypes.length} | ${available.length} | ${knowledge} | ${examples} | ${metrics.sourceExamples} | ${metrics.sourcePractice} | ${metrics.answerKeys} | ${metrics.autoGradable} | ${metrics.needsReview} | ${record.sourceCoverage} | ${record.status} |`);
  }

  lines.push("", "## Validation", "");
  if (!validation.errors.length) lines.push("- No registry errors.");
  else lines.push(...validation.errors.map((error) => `- ERROR: ${error}`));
  if (!validation.warnings.length) lines.push("- No source warnings.");
  else lines.push(...validation.warnings.map((warning) => `- WARNING: ${warning}`));
  const reviewItems = Object.values(calculusSourcePractice).flat().filter((item) => item.verification !== "verified");
  lines.push("", "## Manual review queue", "", ...reviewItems.map((item) => `- ${item.id}: ${item.auditNote}`), "- New or changed PDFs: review `.audit/content-import-proposals.json`; never replace a verified stable unit solely from an automatic match.", "");
  return `${lines.join("\n")}\n`;
}

if (!existsSync(auditDirectory)) throw new Error(`Missing audit directory: ${auditDirectory}`);

const inventory = scanDocuments();

if (command === "scan") {
  writeJson(inventoryPath, inventory);
  console.log(`Scanned ${inventory.documents.length} PDF(s). Inventory: ${relative(projectRoot, inventoryPath)}`);
} else if (command === "import") {
  writeJson(inventoryPath, inventory);
  const proposals = buildImportProposals(inventory);
  writeJson(proposalsPath, proposals);
  console.log(`Prepared ${proposals.documents.length} safe import proposal(s). No verified lesson data was overwritten.`);
  console.log(`Review: ${relative(projectRoot, proposalsPath)}`);
} else if (command === "validate") {
  writeJson(inventoryPath, inventory);
  const validation = validateRegistry(inventory);
  const sourceManifest = buildSourceManifest();
  const v14Traceability = buildV14Traceability();
  const v15ExerciseCoverage = getExerciseCoverageRows();
  validation.errors.push(...validateSourceManifest(sourceManifest));
  validation.errors.push(...validateV14Traceability(v14Traceability));
  validation.errors.push(...validateV15ExerciseCoverage(v15ExerciseCoverage));
  writeJson(sourceManifestPath, sourceManifest);
  writeJson(v14TraceabilityPath, v14Traceability);
  writeFileSync(v14AuditPath, v14AuditReport(v14Traceability), "utf8");
  writeJson(v15ExerciseCoverageJsonPath, {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    maximumActiveQuestions: MAX_ACTIVE_QUESTIONS,
    rows: v15ExerciseCoverage
  });
  writeFileSync(v15ExerciseCoverageMarkdownPath, v15ExerciseCoverageReport(v15ExerciseCoverage), "utf8");
  writeFileSync(coveragePath, coverageReport(inventory, validation), "utf8");
  writeFileSync(pdfMappingReviewPath, pdfMappingReviewReport(), "utf8");
  console.log(`Coverage report: ${relative(projectRoot, coveragePath)}`);
  console.log(`Source manifest: ${relative(projectRoot, sourceManifestPath)}`);
  console.log(`V14 traceability: ${relative(projectRoot, v14TraceabilityPath)}`);
  console.log(`V14 source-fidelity audit: ${relative(projectRoot, v14AuditPath)}`);
  console.log(`V15 exercise coverage: ${relative(projectRoot, v15ExerciseCoverageMarkdownPath)}`);
  console.log(`PDF mapping review: ${relative(projectRoot, pdfMappingReviewPath)}`);
  for (const warning of validation.warnings) console.warn(`WARNING: ${warning}`);
  if (validation.errors.length) {
    for (const error of validation.errors) console.error(`ERROR: ${error}`);
    process.exitCode = 1;
  } else {
    console.log("Content registry validation passed.");
  }
} else {
  console.error(`Unknown command "${command}". Use scan, import or validate.`);
  process.exitCode = 1;
}
