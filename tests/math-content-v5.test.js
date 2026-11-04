import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import {
  renderKnowledgeMarkdown,
  renderMarkdownInline,
  renderMarkdownMath,
  validateLatexExpression
} from "../assets/js/components/markdown-math-renderer.js";
import { curriculumGroups } from "../assets/js/data/curriculum.js";
import { getSubtopicAvailability } from "../assets/js/data/content-registry.js";
import { getDocumentForTopic } from "../assets/js/data/document-mappings.js";
import { getExampleContent } from "../assets/js/data/example-content.js";
import { getKnowledgeContent } from "../assets/js/data/knowledge-content.js";
import { buildActivePracticeSet } from "../assets/js/domain/practice-bank.js";
import { findExerciseType, findTopic } from "../assets/js/domain/curriculum-filter.js";
import {
  createLessonSlides,
  createLessonState,
  getNextSlide,
  getSectionPosition
} from "../assets/js/domain/lesson-workspace.js";

const projectFile = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("CD22.7 preserves the verified source formula as structured LaTeX", () => {
  const reading = getKnowledgeContent("22.7");
  const formula = reading.formulae[0];

  assert.equal(
    formula.value,
    String.raw`\mathrm{P}(\text{bệnh}\mid +) = \frac{\mathrm{P}(\text{bệnh})\mathrm{P}(+\mid \text{bệnh})}{\mathrm{P}(+)}`
  );
  assert.equal(formula.renderAsMath, true);
  assert.deepEqual(reading.sourceLines, [739, 755]);
  assert.equal(reading.verificationGates.sourceFidelity, "verified");
  assert.equal(reading.verificationGates.mathematicalReview, "needs-review");
  assert.equal(validateLatexExpression(formula.value).valid, true);
});

test("CD22.7 renders display and inline probability notation without red fallback", () => {
  const reading = getKnowledgeContent("22.7");
  const html = renderKnowledgeMarkdown({
    slide: { reading },
    position: { current: 1, total: 1 },
    exercise: { code: "22.7", title: "Bài toán y tế – xét nghiệm" }
  });

  assert.match(html, /class="katex-display"/u);
  assert.match(html, /mfrac/u);
  assert.match(html, /data-verification="source-verified"/u);
  assert.match(html, /Đã đối chiếu nguồn/u);
  assert.doesNotMatch(html, /Điểm [12]|math-render-error|katex-error/u);

  const inline = renderMarkdownInline(reading.lead);
  assert.ok((inline.match(/class="katex"/gu) ?? []).length >= 3);
  assert.doesNotMatch(inline, /math-render-error|katex-error/u);
});

test("the centralized renderer preserves fractions, powers, indices, Greek symbols and conditions", () => {
  const expressions = [
    String.raw`\frac{x^{n+1}}{n+1}+C`,
    String.raw`a_i^2+\alpha+\beta`,
    String.raw`x\in I,\quad n\ge 0`,
    String.raw`\sqrt{x^2+y^2}`
  ];

  for (const expression of expressions) {
    assert.equal(validateLatexExpression(expression).valid, true, expression);
    const html = renderMarkdownMath(`$$${expression}$$`);
    assert.match(html, /class="katex-display"/u);
    assert.doesNotMatch(html, /math-render-error|katex-error/u);
  }
});

test("CD22 source provenance and review gates remain truthful", () => {
  const source = getDocumentForTopic("CD22");
  const availability = getSubtopicAvailability("22.7");

  assert.equal(source.sourceSha256, "BD4F99C88A8852A8AB2FD0AF9F07C63491039F1AED0DC0FA1E04F98D0BA5FF99");
  assert.deepEqual(source.exerciseLines["22.7"], [739, 755]);
  assert.equal(availability.verificationStatus, "needs-review");
  assert.equal(availability.sections.knowledge.units[0].source.verification, "verified");
  assert.equal(availability.sections.knowledge.verification, "needs-review");
  assert.equal(availability.sections.examples.units[0].verification, "source-verified");
  assert.equal(availability.sections.practice.status, "coming-soon");
});

test("CD22.7 navigation moves from Knowledge to its exact source Example", () => {
  const topic = findTopic(curriculumGroups, "CD22");
  const exercise = findExerciseType(curriculumGroups, "CD22", "22.7");
  const slides = createLessonSlides({
    topic,
    exercise,
    contentRecord: getSubtopicAvailability("22.7"),
    reading: getKnowledgeContent("22.7"),
    examples: getExampleContent("22.7"),
    questions: buildActivePracticeSet("22.7")
  });

  assert.deepEqual(slides.map((slide) => slide.section), ["knowledge", "example"]);
  assert.equal(slides[0].id, "22.7-knowledge-1");
  assert.equal(slides[1].id, "22.7-native-example-1");
  let state = createLessonState(slides, "knowledge", 1);
  assert.deepEqual(getSectionPosition(slides, state.currentIndex), { section: "knowledge", current: 1, total: 1 });
  state = getNextSlide(state, slides.length);
  assert.deepEqual(getSectionPosition(slides, state.currentIndex), { section: "example", current: 1, total: 1 });
});

test("practice publication remains conservative and existing verified practice stays intact", () => {
  assert.deepEqual(buildActivePracticeSet("22.7"), []);
  assert.deepEqual(buildActivePracticeSet("12.2"), []);
  assert.deepEqual(buildActivePracticeSet("12.4"), []);
  assert.equal(buildActivePracticeSet("12.1").length, 10);
  assert.ok(buildActivePracticeSet("12.1").every((question) => question.origin === "pdf"));
});

test("the V5 checkpoint records zero parse failures and no missing referenced figure", () => {
  const checkpoint = JSON.parse(projectFile(".audit/math-content-v5-checkpoint.json"));
  assert.equal(checkpoint.schemaVersion, "bienedu.math-content-audit.v5");
  assert.equal(checkpoint.formulaFailures.length, 0);
  assert.equal(checkpoint.renderingFailures.length, 0);
  assert.equal(checkpoint.counts.formulasRenderedAsMath, checkpoint.counts.formulasValid);
  assert.equal(checkpoint.counts.renderingFailures, 0);
  assert.equal(checkpoint.counts.figuresMissing, 0);
  assert.equal(checkpoint.correctionLog[0].sourceFidelity, "verified");
  assert.equal(checkpoint.correctionLog[0].mathematicalReview, "needs-review");
  for (const source of checkpoint.sourceInventory) {
    assert.equal(source.checksumMatches, true, source.path);
    assert.equal(existsSync(new URL(`../${source.path}`, import.meta.url)), true, source.path);
  }
});
