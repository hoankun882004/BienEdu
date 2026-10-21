import test from "node:test";
import assert from "node:assert/strict";
import { curriculumGroups } from "../assets/js/data/curriculum.js";
import { exampleContent } from "../assets/js/data/example-content.js";
import { knowledgeContent } from "../assets/js/data/knowledge-content.js";
import { knowledgeSections } from "../assets/js/data/knowledge-slides.js";
import { findTopic } from "../assets/js/domain/curriculum-filter.js";
import {
  createLearningProgress,
  getLessonProgress,
  getLearningStorageKey,
  getTopicProgress,
  loadLearningProgress,
  markExampleViewed,
  markKnowledgeViewed,
  recordPracticeAnswer,
  LEGACY_LEARNING_STORAGE_KEY,
  LEARNING_STORAGE_KEY,
  LEARNING_STORAGE_VERSION
} from "../assets/js/domain/learning-progress.js";

test("invalid or outdated saved data falls back to a clean progress state", () => {
  const invalidJsonStorage = { getItem: () => "not-json" };
  const outdatedStorage = { getItem: () => JSON.stringify({ version: 1, lessons: { stale: true } }) };

  assert.deepEqual(loadLearningProgress(invalidJsonStorage), createLearningProgress());
  assert.deepEqual(loadLearningProgress(outdatedStorage), createLearningProgress());
});

test("opening a lesson cannot complete it", () => {
  let state = createLearningProgress();
  state = markKnowledgeViewed(state, "20.1", "20.1-knowledge-1");
  let lesson = getLessonProgress(state, "20.1", 1, 2);
  assert.equal(lesson.isComplete, false);
  state = recordPracticeAnswer(state, "20.1", "q1", 0, 0);
  lesson = getLessonProgress(state, "20.1", 1, 2);
  assert.equal(lesson.isComplete, false);
});

test("knowledge and practice cannot complete a lesson while examples are incomplete", () => {
  let state = createLearningProgress();
  state = markKnowledgeViewed(state, "20.1", "20.1-knowledge-1");
  for (let index = 1; index <= 3; index += 1) state = recordPracticeAnswer(state, "20.1", `q${index}`, 0, index === 1 ? 0 : 1);
  assert.equal(getLessonProgress(state, "20.1", 1, 2).isComplete, false);
  state = markExampleViewed(state, "20.1", "20.1-example-1");
  assert.equal(getLessonProgress(state, "20.1", 1, 2).percent, 83);
  state = markExampleViewed(state, "20.1", "20.1-example-2");
  assert.equal(getLessonProgress(state, "20.1", 1, 2).isComplete, true);
  const locked = recordPracticeAnswer(state, "20.1", "q1", 1, 1);
  assert.equal(locked.lessons["20.1"].practiceAnswers.q1.selectedIndex, 0);
});

test("finishing available units is distinct from completing partially imported material", () => {
  let state = createLearningProgress();
  state = markKnowledgeViewed(state, "future.1", "future.1-knowledge-source-a");
  state = recordPracticeAnswer(state, "future.1", "future.1-q1", 0, 0);

  const lesson = getLessonProgress(state, "future.1", 1, 0, 1, "partial");
  assert.equal(lesson.availableContentComplete, true);
  assert.equal(lesson.isMaterialComplete, false);
  assert.equal(lesson.isComplete, false);

  const topic = { exerciseTypes: [{ code: "future.1" }, { code: "future.2" }] };
  const progress = getTopicProgress(state, topic, {
    "future.1": { knowledge: 1, examples: 0, practice: 1, available: true, materialStatus: "partial" }
  });
  assert.equal(progress.availableLessons, 1);
  assert.equal(progress.declaredLessons, 2);
  assert.equal(progress.materialComplete, false);
  assert.equal(progress.isComplete, false);
});

test("progress counts only stable IDs that still exist in the current lesson", () => {
  let state = createLearningProgress();
  state = markKnowledgeViewed(state, "12.1", "12.1-knowledge-1");
  state = markKnowledgeViewed(state, "12.1", "removed-knowledge-id");
  state = markExampleViewed(state, "12.1", "12.1-example-1");
  state = markExampleViewed(state, "12.1", "removed-example-id");
  state = recordPracticeAnswer(state, "12.1", "12.1-practice-1", 0, 0);
  state = recordPracticeAnswer(state, "12.1", "removed-practice-id", 0, 0);

  const lesson = getLessonProgress(state, "12.1", 2, 3, 3, "available", {
    knowledge: ["12.1-knowledge-1", "12.1-knowledge-2"],
    examples: ["12.1-example-1", "12.1-source-example-2", "12.1-source-example-3"],
    practice: ["12.1-practice-1", "12.1-practice-2", "12.1-practice-3"]
  });

  assert.equal(lesson.viewed, 1);
  assert.equal(lesson.examplesViewed, 1);
  assert.equal(lesson.answered, 1);
  assert.equal(lesson.percent, 38);
});

test("final exams unlock only after every subtopic is complete", () => {
  let state = createLearningProgress();
  const counts = Object.fromEntries(Object.entries(knowledgeSections).map(([code]) => [code, { knowledge: knowledgeContent[code].pages?.length ?? 1, examples: exampleContent[code].length }]));
  for (const topicId of ["CD12", "CD13", "CD14", "CD20", "CD21"]) {
    const topic = findTopic(curriculumGroups, topicId);
    assert.equal(getTopicProgress(state, topic, counts).isComplete, false);
    for (const exercise of topic.exerciseTypes) {
      for (let index = 0; index < counts[exercise.code].knowledge; index += 1) state = markKnowledgeViewed(state, exercise.code, `${exercise.code}-knowledge-${index + 1}`);
      for (let index = 0; index < exampleContent[exercise.code].length; index += 1) state = markExampleViewed(state, exercise.code, `${exercise.code}-example-${index + 1}`);
      for (let index = 1; index <= 3; index += 1) state = recordPracticeAnswer(state, exercise.code, `${exercise.code}-q${index}`, 0, 0);
    }
    assert.equal(getTopicProgress(state, topic, counts).isComplete, true);
  }
});

test("progress uses a separate namespace for every grade", () => {
  assert.equal(LEARNING_STORAGE_VERSION, 2);
  assert.equal(LEARNING_STORAGE_KEY, "bienedu:progress:v2:grade12");
  assert.equal(getLearningStorageKey("9"), "bienedu:progress:v2:grade9");
  assert.equal(getLearningStorageKey("10"), "bienedu:progress:v2:grade10");
  assert.equal(getLearningStorageKey("11"), "bienedu:progress:v2:grade11");
});

test("legacy Grade 12 progress is migrated without leaking into other grades", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  const legacy = markKnowledgeViewed(createLearningProgress(), "20.1", "20.1-knowledge-1");
  values.set(LEGACY_LEARNING_STORAGE_KEY, JSON.stringify(legacy));

  const grade12 = loadLearningProgress(storage, "12");
  const grade10 = loadLearningProgress(storage, "10");

  assert.deepEqual(grade12.lessons["20.1"].viewedKnowledge, ["20.1-knowledge-1"]);
  assert.deepEqual(grade10, createLearningProgress());
  assert.ok(values.has(getLearningStorageKey("12")));
  assert.ok(values.has(LEGACY_LEARNING_STORAGE_KEY));
});
