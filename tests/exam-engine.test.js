import test from "node:test";
import assert from "node:assert/strict";
import { createFinalExam, finalExamBlueprints, gradeFinalExam } from "../assets/js/domain/exam-engine.js";

test("final exams contain 20 questions and cover every required subtopic", () => {
  assert.deepEqual(Object.keys(finalExamBlueprints), ["CD12", "CD13", "CD14", "CD20", "CD21"]);
  for (const [topicId, blueprint] of Object.entries(finalExamBlueprints)) {
    const exam = createFinalExam(topicId);
    assert.equal(exam.length, 20);
    assert.deepEqual(new Set(exam.map((question) => question.sourceTopic)), new Set(blueprint));
  }
});

test("grading returns a deterministic score and per-question review", () => {
  const exam = createFinalExam("CD20");
  const perfect = Object.fromEntries(exam.map((question, index) => [index, question.correctIndex]));
  assert.equal(gradeFinalExam(exam, perfect).score, 20);
  perfect[0] = (exam[0].correctIndex + 1) % 4;
  const result = gradeFinalExam(exam, perfect);
  assert.equal(result.score, 19);
  assert.equal(result.details.length, 20);
});
