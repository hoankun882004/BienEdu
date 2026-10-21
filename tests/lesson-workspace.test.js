import test from "node:test";
import assert from "node:assert/strict";
import { curriculumGroups } from "../assets/js/data/curriculum.js";
import { getExampleContent } from "../assets/js/data/example-content.js";
import { getKnowledgeContent } from "../assets/js/data/knowledge-content.js";
import { getKnowledgeSection } from "../assets/js/data/knowledge-slides.js";
import { generatePracticeSet } from "../assets/js/domain/exercise-generators.js";
import { findExerciseType, findTopic } from "../assets/js/domain/curriculum-filter.js";
import { createLessonSlides, createLessonState, getNextSlide, getPreviousSlide, getSectionPosition } from "../assets/js/domain/lesson-workspace.js";

test("a lesson contains exactly knowledge, example and practice sections", () => {
  const topic = findTopic(curriculumGroups, "CD20");
  const exercise = findExerciseType(curriculumGroups, "CD20", "20.1");
  const slides = createLessonSlides({ topic, exercise, knowledgeSection: getKnowledgeSection("20.1"), reading: getKnowledgeContent("20.1"), examples: getExampleContent("20.1"), questions: generatePracticeSet("20.1") });
  assert.equal(slides.length, 6);
  assert.deepEqual([...new Set(slides.map((slide) => slide.section))], ["knowledge", "example", "practice"]);
  assert.equal(slides.some((slide) => ["preview", "assessment"].includes(slide.kind)), false);
});

test("workspace navigation flows from knowledge to examples to practice", () => {
  const topic = findTopic(curriculumGroups, "CD20");
  const exercise = findExerciseType(curriculumGroups, "CD20", "20.8");
  const slides = createLessonSlides({ topic, exercise, knowledgeSection: getKnowledgeSection("20.8"), reading: getKnowledgeContent("20.8"), examples: getExampleContent("20.8"), questions: generatePracticeSet("20.8") });
  let state = createLessonState(slides, "knowledge", 1);
  assert.deepEqual(getSectionPosition(slides, state.currentIndex), { section: "knowledge", current: 1, total: 1 });
  state = getNextSlide(state, slides.length);
  assert.deepEqual(getSectionPosition(slides, state.currentIndex), { section: "example", current: 1, total: 1 });
  state = getNextSlide(state, slides.length);
  assert.deepEqual(getSectionPosition(slides, state.currentIndex), { section: "practice", current: 1, total: 3 });
  state = getPreviousSlide(state, slides.length);
  assert.deepEqual(getSectionPosition(slides, state.currentIndex), { section: "example", current: 1, total: 1 });
});

test("a long text lesson keeps two numbered knowledge pages before its example", () => {
  const topic = findTopic(curriculumGroups, "CD12");
  const exercise = findExerciseType(curriculumGroups, "CD12", "12.1");
  const slides = createLessonSlides({ topic, exercise, knowledgeSection: getKnowledgeSection("12.1"), reading: getKnowledgeContent("12.1"), examples: getExampleContent("12.1"), questions: generatePracticeSet("12.1") });
  assert.equal(slides.filter((slide) => slide.section === "knowledge").length, 2);
  assert.deepEqual(slides.filter((slide) => slide.section === "knowledge").map((slide) => slide.id), ["12.1-knowledge-1", "12.1-knowledge-2"]);
  assert.deepEqual(slides.filter((slide) => slide.section === "knowledge").map((slide) => slide.sourcePages), [[3], [3, 4]]);
  assert.equal(slides[2].section, "example");
});

test("a topic without mapped content gets a truthful unavailable state", () => {
  const topic = findTopic(curriculumGroups, "CD01");
  const exercise = findExerciseType(curriculumGroups, "CD01", "1.1");
  const slides = createLessonSlides({ topic, exercise, knowledgeSection: null });
  assert.equal(slides.length, 1);
  assert.equal(slides[0].kind, "unavailable");
});
