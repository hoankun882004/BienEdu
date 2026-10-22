import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { curriculumMeta, curriculumTopics } from "../assets/js/data/curriculum.js";
import { calculusSourceExamples } from "../assets/js/data/calculus-source-examples.js";
import { calculusSourcePractice } from "../assets/js/data/calculus-source-practice.js";
import { documentSources } from "../assets/js/data/document-mappings.js";
import { getExampleContent } from "../assets/js/data/example-content.js";
import { getKnowledgeContent } from "../assets/js/data/knowledge-content.js";
import { knowledgePdfMappings } from "../assets/js/data/knowledge-pdf-mappings.js";
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
  return { errors, warnings, allSubtopics };
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
    "- CD12-CD14: all 26 Knowledge lessons, 52 source worked examples, 260 source self-practice items and 260 answer keys are accounted for. Source exercises are self-check only and remain separate from the three generated auto-graded questions per subtopic.",
    "- Source completeness and mathematical verification are independent: nine answer keys are imported but explicitly marked needs-review because the printed answer conflicts with direct calculation or is ambiguous.",
    "- CD20-CD21: all headings, theory blocks and worked examples in the 18-page file are represented. The file contains no CD22/CD23 lesson pages despite its filename/cover wording.",
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
  validation.errors.push(...validateSourceManifest(sourceManifest));
  writeJson(sourceManifestPath, sourceManifest);
  writeFileSync(coveragePath, coverageReport(inventory, validation), "utf8");
  writeFileSync(pdfMappingReviewPath, pdfMappingReviewReport(), "utf8");
  console.log(`Coverage report: ${relative(projectRoot, coveragePath)}`);
  console.log(`Source manifest: ${relative(projectRoot, sourceManifestPath)}`);
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
