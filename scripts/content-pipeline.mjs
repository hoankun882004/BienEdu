import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { curriculumMeta, curriculumTopics } from "../assets/js/data/curriculum.js";
import { documentSources } from "../assets/js/data/document-mappings.js";
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

  for (const source of documentSources) {
    const assetPath = join(projectRoot, source.filePath);
    if (!existsSync(assetPath)) errors.push(`Missing published source asset: ${source.filePath}`);
    else if (sha256(assetPath) !== source.sourceSha256) errors.push(`Hash mismatch for ${source.filePath}`);
    const original = inventory.documents.find((document) => document.sha256 === source.sourceSha256);
    if (!original) warnings.push(`No original PDF with the registered hash was found in 39 chuyên đề for ${source.id}.`);
    if (original?.pageCount !== null && original?.pageCount !== source.pageCount) errors.push(`Page count mismatch for ${source.id}: expected ${source.pageCount}, scanned ${original.pageCount}.`);
  }
  return { errors, warnings, allSubtopics };
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
    "- CD12-CD14: all Knowledge blocks are represented; one verified worked example and three validated practice items per subtopic are currently structured. The additional source examples/self-practice bank remain explicitly recorded as partial source coverage.",
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
    "| Topic | Declared subtopics | Available subtopics | Knowledge slides | Example slides | Source | Source coverage | Status | Missing / review |",
    "| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- |"
  ];

  for (const topic of curriculumTopics) {
    const record = learningContentRegistry.topics[topic.id];
    const subtopics = Object.values(record.subtopics);
    const available = subtopics.filter((item) => item.status === CONTENT_STATUS.AVAILABLE);
    const knowledge = subtopics.reduce((total, item) => total + (item.sections.knowledge.count ?? 0), 0);
    const examples = subtopics.reduce((total, item) => total + (item.sections.examples.count ?? 0), 0);
    const missing = topic.exerciseTypes.length - available.length;
    const source = documentSources.find((item) => item.id === record.documentId);
    const note = record.sourceCoverage === "partial"
      ? "Additional PDF examples/self-practice remain to be structured"
      : missing
        ? `${missing} subtopics have no verified imported lesson`
        : "None";
    lines.push(`| ${topic.id} | ${topic.exerciseTypes.length} | ${available.length} | ${knowledge} | ${examples} | ${source?.id ?? "—"} | ${record.sourceCoverage} | ${record.status} | ${note} |`);
  }

  lines.push("", "## Validation", "");
  if (!validation.errors.length) lines.push("- No registry errors.");
  else lines.push(...validation.errors.map((error) => `- ERROR: ${error}`));
  if (!validation.warnings.length) lines.push("- No source warnings.");
  else lines.push(...validation.warnings.map((warning) => `- WARNING: ${warning}`));
  lines.push("", "## Manual review queue", "", "- CD12-CD14: transcribe and verify the remaining second worked example and source self-practice items before changing source coverage from partial to complete.", "- New or changed PDFs: review `.audit/content-import-proposals.json`; never replace a verified stable unit solely from an automatic match.", "");
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
  writeFileSync(coveragePath, coverageReport(inventory, validation), "utf8");
  console.log(`Coverage report: ${relative(projectRoot, coveragePath)}`);
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
