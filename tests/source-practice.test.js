import test from "node:test";
import assert from "node:assert/strict";

import { calculusSourcePractice, getCalculusSourcePractice } from "../assets/js/data/calculus-source-practice.js";
import { generatePracticeSet } from "../assets/js/domain/exercise-generators.js";

const sets = Object.entries(calculusSourcePractice);
const exercises = sets.flatMap(([, items]) => items);

test("the CD12-CD14 source bank accounts for ten exercises per subtopic", () => {
  assert.equal(sets.length, 26);
  assert.equal(exercises.length, 260);
  assert.ok(sets.every(([, items]) => items.length === 10));
  assert.equal(new Set(exercises.map((exercise) => exercise.id)).size, 260);
  assert.equal(new Set(exercises.map((exercise) => exercise.sourceBlockId)).size, 260);
});

test("every source exercise keeps provenance and a non-automated answer key", () => {
  for (const exercise of exercises) {
    assert.match(exercise.id, /^(12|13|14)\.\d-source-exercise-\d{2}$/u);
    assert.ok(exercise.prompt.length >= 8, exercise.id);
    assert.ok(exercise.answerKey.length >= 1, exercise.id);
    assert.ok(["short-answer", "essay"].includes(exercise.type), exercise.id);
    assert.ok(exercise.sourcePages.length >= 1, exercise.id);
    assert.ok(exercise.sourcePages.every((page) => Number.isInteger(page) && page >= 1 && page <= 49), exercise.id);
    assert.equal(exercise.automatedGrading, "unsupported", exercise.id);
    assert.equal(exercise.detailedSolutionStatus, "not-provided", exercise.id);
  }
});

test("source-answer conflicts remain visible and are never auto-graded", () => {
  const reviewItems = exercises.filter((exercise) => exercise.verification === "source-conflict");
  assert.equal(reviewItems.length, 9);
  assert.ok(reviewItems.every((exercise) => exercise.answerKeyStatus === "needs-review"));
  assert.ok(reviewItems.every((exercise) => exercise.auditNote?.length > 20));
});

test("source practice is separate from deterministic generated practice", () => {
  for (const code of Object.keys(calculusSourcePractice)) {
    const generated = generatePracticeSet(code, "source-separation-check");
    const source = getCalculusSourcePractice(code);
    assert.equal(generated.length, 3, code);
    assert.equal(source.length, 10, code);
    assert.ok(generated.every((question) => !source.some((exercise) => exercise.id === question.id)), code);
  }
});
