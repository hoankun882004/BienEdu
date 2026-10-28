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
  getTopicKnowledgeProgressKey,
  preserveTopicKnowledgeProgress,
  preserveVerifiedPdfProgress,
  recordPracticeAnswer,
  recordPracticeReview,
  LEGACY_LEARNING_STORAGE_KEY,
  LEARNING_STORAGE_KEY,
  LEARNING_STORAGE_VERSION
} from "../assets/js/domain/learning-progress.js";
import { buildActivePracticeSet } from "../assets/js/domain/practice-bank.js";

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

test("reviewing a verified self-check exercise counts once without inventing a grade", () => {
  let state = createLearningProgress();
  state = recordPracticeReview(state, "12.1", "12.1-source-exercise-01");
  state = recordPracticeReview(state, "12.1", "12.1-source-exercise-01");
  const answer = state.lessons["12.1"].practiceAnswers["12.1-source-exercise-01"];
  assert.deepEqual(answer, { mode: "self-check", reviewed: true, correct: null });
  assert.equal(Object.keys(state.lessons["12.1"].practiceAnswers).length, 1);
});

test("native Markdown preserves completed legacy PDF progress without requiring the old viewer", () => {
  const state = createLearningProgress();
  const segments = ["20.2-pdf-1", "20.2-pdf-2", "20.2-pdf-3"];
  state.lessons["20.2"] = {
    viewedKnowledge: [],
    viewedExamples: [],
    practiceAnswers: {},
    knowledgePdfProgress: { viewedSegments: segments, completed: true }
  };
  const migrated = preserveVerifiedPdfProgress(state, [{ code: "20.2", targetKnowledgeIds: ["20.2-knowledge-1", "20.2-knowledge-2"], pdfSegmentIds: segments }]);
  assert.deepEqual(migrated.lessons["20.2"].viewedKnowledge, ["20.2-knowledge-1", "20.2-knowledge-2"]);
  assert.deepEqual(migrated.lessons["20.2"].knowledgePdfProgress.viewedSegments, segments);
  assert.equal(migrated.lessons["20.2"].knowledgePdfProgress.completed, true);
});

test("topic Knowledge migration preserves partial legacy reading without duplicating type progress", () => {
  let state = createLearningProgress();
  state = markKnowledgeViewed(state, "1.1", "1.1-knowledge-1");
  const targetKey = getTopicKnowledgeProgressKey("CD01");
  const migrated = preserveTopicKnowledgeProgress(state, [{
    targetKey,
    targetIds: ["CD01-topic-knowledge-1", "CD01-topic-knowledge-2"],
    legacyGroups: [
      { code: "1.1", ids: ["1.1-knowledge-1", "1.1-knowledge-2"] },
      { code: "1.2", ids: ["1.2-knowledge-1", "1.2-knowledge-2"] }
    ]
  }]);

  assert.deepEqual(migrated.lessons[targetKey].viewedKnowledge, ["CD01-topic-knowledge-1"]);
  assert.deepEqual(migrated.lessons["1.1"].viewedKnowledge, ["1.1-knowledge-1"]);
});

test("a problem-type lesson can complete without redundant general Knowledge", () => {
  let state = createLearningProgress();
  state = markExampleViewed(state, "1.1", "1.1-example-1");
  state = recordPracticeAnswer(state, "1.1", "1.1-practice-1", 0, 0);
  const lesson = getLessonProgress(state, "1.1", 0, 1, 1, "available", {
    knowledge: [], examples: ["1.1-example-1"], practice: ["1.1-practice-1"]
  });
  assert.equal(lesson.total, 2);
  assert.equal(lesson.isComplete, true);
});

test("final exams unlock only for topics whose every subtopic has ready content", () => {
  let state = createLearningProgress();
  const counts = Object.fromEntries(Object.entries(knowledgeSections).map(([code]) => {
    const practice = buildActivePracticeSet(code);
    return [code, {
      knowledge: knowledgeContent[code].pages?.length ?? 1,
      examples: exampleContent[code].length,
      practice: practice.length,
      available: practice.length > 0,
      materialStatus: practice.length > 0 ? "available" : "partial"
    }];
  }));
  for (const topicId of ["CD20", "CD21"]) {
    const topic = findTopic(curriculumGroups, topicId);
    assert.equal(getTopicProgress(state, topic, counts).isComplete, false);
    for (const exercise of topic.exerciseTypes) {
      for (let index = 0; index < counts[exercise.code].knowledge; index += 1) state = markKnowledgeViewed(state, exercise.code, `${exercise.code}-knowledge-${index + 1}`);
      for (let index = 0; index < exampleContent[exercise.code].length; index += 1) state = markExampleViewed(state, exercise.code, `${exercise.code}-example-${index + 1}`);
      for (const question of buildActivePracticeSet(exercise.code)) state = recordPracticeAnswer(state, exercise.code, question.id, 0, 0);
    }
    assert.equal(getTopicProgress(state, topic, counts).isComplete, true);
  }
  for (const topicId of ["CD12", "CD13", "CD14"]) {
    assert.equal(getTopicProgress(state, findTopic(curriculumGroups, topicId), counts).isComplete, false);
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
