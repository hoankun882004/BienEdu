import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { renderKnowledgeMarkdown } from "../assets/js/components/markdown-math-renderer.js";
import { curriculumTopics } from "../assets/js/data/curriculum.js";
import { getSubtopicAvailability, getTopicAvailability } from "../assets/js/data/content-registry.js";
import { getDocumentForTopic } from "../assets/js/data/document-mappings.js";
import { getExampleContent } from "../assets/js/data/example-content.js";
import { getKnowledgeContent } from "../assets/js/data/knowledge-content.js";
import {
  EXCLUDED_TOPIC_IDS,
  SOURCE_RELATIVE_PATH,
  assertWritablePilotTopic,
  buildPilotTopic,
  parseLatexDocument
} from "../scripts/latex-pilot/parser.mjs";

const projectFile = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const sourceText = projectFile(SOURCE_RELATIVE_PATH);
const parsed = parseLatexDocument(sourceText);
const pilot = buildPilotTopic(parsed);

function runtimeSnapshot(topicIds) {
  const result = {};
  for (const topicId of topicIds) {
    const topic = curriculumTopics.find((item) => item.id === topicId);
    result[topicId] = Object.fromEntries(topic.exerciseTypes.map((exercise) => [exercise.code, {
      knowledge: getKnowledgeContent(exercise.code),
      examples: getExampleContent(exercise.code)
    }]));
  }
  return createHash("sha256").update(JSON.stringify(result)).digest("hex").toUpperCase();
}

test("native source inspection resolves the real CD20-CD23 document structure", () => {
  assert.equal(parsed.documentClass, "article");
  assert.equal(parsed.lineCount, 1068);
  assert.equal(parsed.sourceSha256, "BD4F99C88A8852A8AB2FD0AF9F07C63491039F1AED0DC0FA1E04F98D0BA5FF99");
  assert.deepEqual(parsed.chapters.map((chapter) => chapter.id), ["CD20", "CD21", "CD22", "CD23"]);
  assert.deepEqual(parsed.topics.filter((topic) => topic.code.startsWith("22.")).map((topic) => topic.code), [
    "22.1", "22.2", "22.3", "22.4", "22.5", "22.6", "22.7", "22.8", "22.9"
  ]);
  assert.ok(parsed.packages.includes("amsmath"));
  assert.ok(parsed.customCommands.includes("\\topic"));
});

test("source inspection reports no unresolved figure or include dependency", () => {
  assert.doesNotMatch(sourceText, /\\(?:input|include|includegraphics)\s*(?:\[[^\]]*\])?\s*\{/u);
  assert.doesNotMatch(sourceText, /\\begin\{(?:tikzpicture|axis)\}/u);
  assert.ok(Object.values(pilot.knowledge).every((reading) => !reading.figures?.length));
});

test("missing-topic detection stays bounded by both registry state and source chapters", () => {
  const sourceTopicIds = new Set(parsed.chapters.map((chapter) => chapter.id));
  const remainingCandidates = curriculumTopics
    .filter((topic) => !EXCLUDED_TOPIC_IDS.has(topic.id))
    .filter((topic) => getTopicAvailability(topic.id).status === "coming-soon")
    .filter((topic) => sourceTopicIds.has(topic.id))
    .map((topic) => topic.id);
  assert.deepEqual(remainingCandidates, ["CD23"]);
});

test("the content-writing guard rejects both protected topics and existing content", () => {
  assert.deepEqual([...EXCLUDED_TOPIC_IDS], ["CD20", "CD21"]);
  assert.throws(() => assertWritablePilotTopic("CD20"), /protected/u);
  assert.throws(() => assertWritablePilotTopic("CD21"), /protected/u);
  assert.throws(() => assertWritablePilotTopic("CD22", { existingKnowledge: true }), /already has learning content/u);
  assert.throws(() => assertWritablePilotTopic("CD23"), /restricted to CD22/u);
});

test("CD22 pilot maps every registry section without inventing a worked solution", () => {
  const expectedCodes = curriculumTopics.find((topic) => topic.id === "CD22").exerciseTypes.map((exercise) => exercise.code);
  assert.deepEqual(Object.keys(pilot.knowledge), expectedCodes);
  assert.deepEqual(Object.keys(pilot.examples), expectedCodes);
  assert.equal(Object.values(pilot.examples).flat().length, 9);
  assert.ok(Object.values(pilot.examples).flat().every((example) => (
    example.origin === "native-latex-source"
      && example.steps.length === 0
      && example.answer === null
      && example.sourceLines.length === 2
  )));
  const validation = Object.values(pilot.validations);
  assert.equal(validation.reduce((sum, item) => sum + item.expressionCount, 0), 6);
  assert.equal(validation.reduce((sum, item) => sum + item.issues.length, 0), 0);
});

test("runtime publishes CD22 through the existing registry and preserves line provenance", () => {
  const mapping = getDocumentForTopic("CD22");
  assert.equal(mapping.sourceKind, "native-latex");
  assert.deepEqual(Object.keys(mapping.exerciseLines), Object.keys(pilot.knowledge));
  assert.equal(getTopicAvailability("CD22").status, "partial");
  for (const code of Object.keys(pilot.knowledge)) {
    const availability = getSubtopicAvailability(code);
    assert.equal(availability.sections.knowledge.status, "available");
    assert.equal(availability.sections.examples.status, "available");
    assert.equal(availability.sections.practice.status, "coming-soon");
    assert.equal(availability.sections.knowledge.units[0].source.sourceKind, "native-latex");
    assert.equal(availability.sections.knowledge.units[0].source.lines.length, 2);
  }
});

test("native conditional-probability notation renders with KaTeX and source-aware review status", () => {
  const bayes = renderKnowledgeMarkdown({
    slide: { reading: getKnowledgeContent("22.5") },
    position: { current: 1, total: 1 },
    exercise: { code: "22.5", title: "Công thức Bayes" }
  });
  const medical = renderKnowledgeMarkdown({
    slide: { reading: getKnowledgeContent("22.7") },
    position: { current: 1, total: 1 },
    exercise: { code: "22.7", title: "Bài toán y tế – xét nghiệm" }
  });
  assert.match(bayes, /class="katex-display"/u);
  assert.match(bayes, /\\frac/u);
  assert.match(medical, /class="katex-display"/u);
  assert.match(medical, /mfrac/u);
  assert.match(medical, /Đã đối chiếu nguồn/u);
  assert.doesNotMatch(medical, /Điểm [12]/u);
  assert.doesNotMatch(`${bayes}${medical}`, /math-render-error|katex-error/u);
});

test("native probability labels preserve symbolic Unicode subscripts outside text mode", () => {
  const reading = getKnowledgeContent("22.5");
  const html = renderKnowledgeMarkdown({
    slide: { reading },
    position: { current: 1, total: 1 },
    exercise: { code: "22.5", title: "Công thức Bayes" }
  });
  assert.match(html, /\\mathrm\{P\}\(B_\{j\}\\mid A\)/u);
  assert.doesNotMatch(html, /\\text\{B_\{j\}\}|math-render-error|katex-error/u);
});

test("CD20 and CD21 retain their hash-locked runtime content and legacy IDs", () => {
  assert.equal(runtimeSnapshot(["CD20", "CD21"]), "1B2045924453E31F5ADA62644B290C6A8BC07BFD7164D57EB6887E3B914C070B");
  assert.equal(getSubtopicAvailability("20.1").sections.knowledge.units[0].id, "20.1-knowledge-1");
  assert.equal(getSubtopicAvailability("21.8").sections.examples.units[0].id, "21.8-example-1");
});

test("the controlled pilot import is deterministic and idempotent", () => {
  const generatedPath = new URL("../assets/js/data/latex-pilot.generated.js", import.meta.url);
  const before = createHash("sha256").update(readFileSync(generatedPath)).digest("hex");
  const run = spawnSync(process.execPath, ["scripts/latex-pilot/import.mjs"], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const after = createHash("sha256").update(readFileSync(generatedPath)).digest("hex");
  assert.equal(after, before);
});
