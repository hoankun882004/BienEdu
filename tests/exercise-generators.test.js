import test from "node:test";
import assert from "node:assert/strict";
import { evaluateCalculation, generatePracticeSet, supportedPracticeTopics, validateGeneratedQuestion } from "../assets/js/domain/exercise-generators.js";

test("all 25 mapped subtopics generate exactly three valid questions", () => {
  assert.equal(supportedPracticeTopics.length, 25);
  for (const code of supportedPracticeTopics) {
    const questions = generatePracticeSet(code, "TEST_V1");
    assert.equal(questions.length, 3, code);
    for (const question of questions) {
      assert.equal(validateGeneratedQuestion(question), true, question.id);
      assert.equal(question.options.length, 4);
      assert.equal(new Set(question.options).size, 4);
      assert.equal(evaluateCalculation(question.calculation), question.correctAnswer);
      assert.ok(question.solution.length > 20);
      assert.equal(question.sourceTopic, code);
    }
  }
});

test("generation is deterministic for a seed", () => {
  assert.deepEqual(generatePracticeSet("21.8", "same-seed"), generatePracticeSet("21.8", "same-seed"));
});
