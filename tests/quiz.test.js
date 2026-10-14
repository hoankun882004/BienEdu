import test from "node:test";
import assert from "node:assert/strict";
import { quizQuestions } from "../assets/js/data/quiz-data.js";
import { createQuizState, answerQuestion, scoreQuiz, toggleHint, unansweredIndexes } from "../assets/js/domain/quiz-engine.js";

test("quiz dataset contains ten four-option questions with one valid key", () => {
  assert.equal(quizQuestions.length, 10);
  for (const question of quizQuestions) {
    assert.equal(question.options.length, 4);
    assert.ok(Number.isInteger(question.correctIndex));
    assert.ok(question.correctIndex >= 0 && question.correctIndex < 4);
    assert.ok(question.explanation.length > 10);
    assert.ok(question.hint.length > 10);
  }
});

test("quiz engine records answers and scores a perfect submission", () => {
  let state = createQuizState(quizQuestions.length);
  quizQuestions.forEach((question, index) => {
    state = answerQuestion(state, index, question.correctIndex);
  });
  assert.deepEqual(unansweredIndexes(state.answers), []);
  assert.equal(scoreQuiz(quizQuestions, state.answers).correct, 10);
});

test("quiz engine reports unanswered questions", () => {
  const state = createQuizState(3);
  assert.deepEqual(unansweredIndexes(state.answers), [0, 1, 2]);
});

test("quiz hints are closed by default and retain independent state", () => {
  let state = createQuizState(3);
  assert.deepEqual(state.hintVisibility, [false, false, false]);
  state = toggleHint(state, 0);
  assert.deepEqual(state.hintVisibility, [true, false, false]);
  state = toggleHint(state, 1);
  assert.deepEqual(state.hintVisibility, [true, true, false]);
  state = toggleHint(state, 0);
  assert.deepEqual(state.hintVisibility, [false, true, false]);
});

test("opening a hint does not change answers or score and restart resets hints", () => {
  let state = createQuizState(quizQuestions.length);
  state = toggleHint(state, 2);
  state = answerQuestion(state, 0, quizQuestions[0].correctIndex);
  assert.equal(state.answers[0], quizQuestions[0].correctIndex);
  assert.equal(scoreQuiz(quizQuestions, state.answers).correct, 1);
  const restarted = createQuizState(quizQuestions.length);
  assert.equal(restarted.phase, "intro");
  assert.ok(restarted.hintVisibility.every((isOpen) => !isOpen));
});
