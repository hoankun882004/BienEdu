import test from "node:test";
import assert from "node:assert/strict";
import { curriculumGroups } from "../assets/js/data/curriculum.js";
import { exampleContent } from "../assets/js/data/example-content.js";
import { knowledgeSections } from "../assets/js/data/knowledge-slides.js";
import { findTopic } from "../assets/js/domain/curriculum-filter.js";
import { createLearningProgress, getLessonProgress, getTopicProgress, markExampleViewed, markKnowledgeViewed, recordPracticeAnswer, LEARNING_STORAGE_KEY, LEARNING_STORAGE_VERSION } from "../assets/js/domain/learning-progress.js";

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

test("final exams unlock only after every subtopic is complete", () => {
  let state = createLearningProgress();
  const counts = Object.fromEntries(Object.entries(knowledgeSections).map(([code]) => [code, { knowledge: 1, examples: exampleContent[code].length }]));
  for (const topicId of ["CD20", "CD21"]) {
    const topic = findTopic(curriculumGroups, topicId);
    assert.equal(getTopicProgress(state, topic, counts).isComplete, false);
    for (const exercise of topic.exerciseTypes) {
      state = markKnowledgeViewed(state, exercise.code, knowledgeSections[exercise.code].knowledgeSlides[0].id);
      for (let index = 0; index < exampleContent[exercise.code].length; index += 1) state = markExampleViewed(state, exercise.code, `${exercise.code}-example-${index + 1}`);
      for (let index = 1; index <= 3; index += 1) state = recordPracticeAnswer(state, exercise.code, `${exercise.code}-q${index}`, 0, 0);
    }
    assert.equal(getTopicProgress(state, topic, counts).isComplete, true);
  }
});

test("V6.1 uses a new incompatible storage namespace", () => {
  assert.equal(LEARNING_STORAGE_VERSION, 2);
  assert.equal(LEARNING_STORAGE_KEY, "bienedu.learning.v2");
});
