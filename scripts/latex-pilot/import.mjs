import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { curriculumTopics } from "../../assets/js/data/curriculum.js";
import { getExampleContent } from "../../assets/js/data/example-content.js";
import { getKnowledgeContent } from "../../assets/js/data/knowledge-content.js";
import {
  EXCLUDED_TOPIC_IDS,
  PILOT_TOPIC_ID,
  SOURCE_RELATIVE_PATH,
  assertWritablePilotTopic,
  buildPilotTopic,
  parseLatexDocument,
  pilotToMarkdown
} from "./parser.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..", "..");
const sourcePath = resolve(projectRoot, SOURCE_RELATIVE_PATH);
const generatedModulePath = resolve(projectRoot, "assets/js/data/latex-pilot.generated.js");
const stagingDirectory = resolve(projectRoot, "docs/content/staging");
const stagingJsonPath = resolve(stagingDirectory, "latex-pilot-cd22.json");
const stagingMarkdownPath = resolve(stagingDirectory, "latex-pilot-cd22.md");

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function contentHash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").toUpperCase();
}

function protectedContentSnapshot() {
  const knowledge = {};
  const examples = {};
  for (const topicId of EXCLUDED_TOPIC_IDS) {
    const topic = curriculumTopics.find((item) => item.id === topicId);
    knowledge[topicId] = Object.fromEntries(topic.exerciseTypes.map((exercise) => [exercise.code, getKnowledgeContent(exercise.code)]));
    examples[topicId] = Object.fromEntries(topic.exerciseTypes.map((exercise) => [exercise.code, getExampleContent(exercise.code)]));
  }
  return Object.freeze({
    knowledge: contentHash(knowledge),
    examples: contentHash(examples)
  });
}

function assertRegistryMapping(document, topicId) {
  const registryTopic = curriculumTopics.find((topic) => topic.id === topicId);
  if (!registryTopic) throw new Error(`${topicId} does not exist in the curriculum registry.`);
  const sourceTopics = document.topics.filter((topic) => topic.code.startsWith(`${topicId.slice(2)}.`));
  const expectedCodes = registryTopic.exerciseTypes.map((exercise) => exercise.code);
  const sourceCodes = sourceTopics.map((topic) => topic.code);
  if (JSON.stringify(expectedCodes) !== JSON.stringify(sourceCodes)) {
    throw new Error(`${topicId} source sections do not match the curriculum registry.`);
  }
  for (const exercise of registryTopic.exerciseTypes) {
    const sourceTopic = sourceTopics.find((topic) => topic.code === exercise.code);
    const comparableTitle = (value) => value.normalize("NFC").replace(/[–—-]/gu, "-").replace(/\s+/gu, " ").trim().toLocaleLowerCase("vi");
    if (comparableTitle(sourceTopic.title) !== comparableTitle(exercise.title)) {
      throw new Error(`${exercise.code} title mismatch: "${sourceTopic.title}" versus "${exercise.title}".`);
    }
  }
}

function assertEligibleTarget(document, topicId) {
  const existingKnowledge = curriculumTopics
    .find((topic) => topic.id === topicId)
    ?.exerciseTypes.some((exercise) => Boolean(getKnowledgeContent(exercise.code)));
  const existingExamples = curriculumTopics
    .find((topic) => topic.id === topicId)
    ?.exerciseTypes.some((exercise) => Boolean(getExampleContent(exercise.code)));
  const existingPilot = curriculumTopics
    .find((topic) => topic.id === topicId)
    ?.exerciseTypes.every((exercise) => getKnowledgeContent(exercise.code)?.conversionStatus === "native-latex-pilot");
  if (!existingPilot) assertWritablePilotTopic(topicId, { existingKnowledge, existingExamples });
  assertRegistryMapping(document, topicId);
}

function generatedSections(pilot) {
  return Object.freeze(Object.fromEntries(Object.entries(pilot.knowledge).map(([code, reading]) => {
    const examples = pilot.examples[code] ?? [];
    return [code, Object.freeze({
      sourceId: pilot.sourceDocumentId,
      startsAt: reading.sourceSection,
      endsBefore: null,
      knowledgeSlides: Object.freeze([Object.freeze({
        id: `${code}-knowledge-1`,
        src: null,
        crops: Object.freeze([]),
        sourcePages: Object.freeze([]),
        sourceLines: reading.sourceLines
      })]),
      exampleSlides: Object.freeze(examples.map((example) => Object.freeze({
        id: example.id,
        src: null,
        crops: Object.freeze([]),
        sourcePages: Object.freeze([]),
        sourceLines: example.sourceLines
      }))),
      slides: Object.freeze([Object.freeze({
        id: `${code}-knowledge-1`,
        src: null,
        crops: Object.freeze([]),
        sourcePages: Object.freeze([]),
        sourceLines: reading.sourceLines
      })])
    })];
  })));
}

function generatedModule(pilot) {
  const metadata = {
    schemaVersion: "bienedu.native-latex-pilot.v1",
    topicId: pilot.topicId,
    sourceDocumentId: pilot.sourceDocumentId,
    sourceSha256: pilot.sourceSha256,
    importedAt: "2026-11-03",
    protection: {
      excludedTopicIds: [...EXCLUDED_TOPIC_IDS],
      overwriteExistingContent: false
    }
  };
  return `// Generated by scripts/latex-pilot/import.mjs from the hash-locked native LaTeX source.\n// Do not edit this file by hand; rerun npm run content:latex:pilot.\n\nfunction deepFreeze(value) {\n  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;\n  Object.values(value).forEach(deepFreeze);\n  return Object.freeze(value);\n}\n\nexport const latexPilotMetadata = deepFreeze(${JSON.stringify(metadata, null, 2)});\n\nexport const latexPilotKnowledgeContent = deepFreeze(${JSON.stringify(pilot.knowledge, null, 2)});\n\nexport const latexPilotExampleContent = deepFreeze(${JSON.stringify(pilot.examples, null, 2)});\n\nexport const latexPilotKnowledgeSections = deepFreeze(${JSON.stringify(generatedSections(pilot), null, 2)});\n`;
}

function main() {
  const protectedBefore = protectedContentSnapshot();
  const sourceText = readFileSync(sourcePath, "utf8");
  const document = parseLatexDocument(sourceText);
  assertEligibleTarget(document, PILOT_TOPIC_ID);
  const pilot = buildPilotTopic(document, PILOT_TOPIC_ID);
  const validationIssues = Object.values(pilot.validations).flatMap((result) => result.issues);
  if (validationIssues.length) {
    throw new Error(`Pilot contains ${validationIssues.length} invalid KaTeX expression(s); refusing publication.`);
  }
  if (Object.keys(pilot.knowledge).some((code) => /^(?:20|21)\./u.test(code))) {
    throw new Error("Protected CD20/CD21 content reached the write set.");
  }

  mkdirSync(dirname(generatedModulePath), { recursive: true });
  mkdirSync(stagingDirectory, { recursive: true });
  writeFileSync(generatedModulePath, generatedModule(pilot), "utf8");
  writeFileSync(stagingJsonPath, stableJson({
    schemaVersion: "bienedu.native-latex-pilot.v1",
    source: {
      path: SOURCE_RELATIVE_PATH,
      sha256: document.sourceSha256,
      lineCount: document.lineCount,
      documentClass: document.documentClass,
      title: document.title,
      packages: document.packages,
      customCommands: document.customCommands
    },
    topicId: pilot.topicId,
    knowledge: pilot.knowledge,
    examples: pilot.examples,
    validations: pilot.validations
  }), "utf8");
  writeFileSync(stagingMarkdownPath, pilotToMarkdown(pilot), "utf8");

  const protectedAfter = protectedContentSnapshot();
  if (JSON.stringify(protectedBefore) !== JSON.stringify(protectedAfter)) {
    throw new Error("Protected CD20/CD21 runtime content changed during the pilot import.");
  }
  const formulaCount = Object.values(pilot.validations).reduce((total, result) => total + result.expressionCount, 0);
  const exampleCount = Object.values(pilot.examples).reduce((total, examples) => total + examples.length, 0);
  console.log(`Native LaTeX pilot generated ${Object.keys(pilot.knowledge).length} CD22 lessons, ${formulaCount} KaTeX expressions and ${exampleCount} source examples.`);
  console.log(`Protected snapshots: knowledge ${protectedAfter.knowledge}; examples ${protectedAfter.examples}.`);
}

main();
