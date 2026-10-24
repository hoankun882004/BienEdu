import test from "node:test";
import assert from "node:assert/strict";

import { getCalculusSourcePractice } from "../assets/js/data/calculus-source-practice.js";
import { exerciseBlueprints } from "../assets/js/data/exercise-blueprints.js";
import { generatePracticeSet } from "../assets/js/domain/exercise-generators.js";
import {
  buildActivePracticeSet,
  getExerciseCoverageRows,
  independentlyEvaluateCalculation,
  MAX_ACTIVE_QUESTIONS,
  validateCalculationParameters,
  validateGeneratedCandidate,
  validateSourceQuestion,
  verifyAntiderivativeSpec
} from "../assets/js/domain/practice-bank.js";

test("all 51 generator-supported subtopics have explicit exact-type blueprints", () => {
  assert.equal(Object.keys(exerciseBlueprints).length, 51);
  for (const [code, blueprint] of Object.entries(exerciseBlueprints)) {
    assert.equal(blueprint.subtopicId, code);
    assert.ok(blueprint.sourceDocumentId);
    assert.ok(blueprint.verificationStrategy);
    assert.equal(typeof blueprint.allowedParameters, "object");
    assert.ok(Array.isArray(blueprint.excludedSkills));
  }
});

test("the active bank is source-first, exact-subtopic and never exceeds ten", () => {
  for (const row of getExerciseCoverageRows()) {
    const active = buildActivePracticeSet(row.subtopicId);
    assert.ok(active.length <= MAX_ACTIVE_QUESTIONS, row.subtopicId);
    assert.ok(active.every((question) => question.subtopicId === row.subtopicId), row.subtopicId);
    assert.ok(active.every((question) => question.sourceTopic === row.subtopicId), row.subtopicId);
    assert.ok(active.every((question) => question.gradeId === "12" && question.topicId === `CD${row.subtopicId.split(".")[0]}`), row.subtopicId);
    assert.ok(active.every((question) => question.blueprintId && question.patternId && question.sourceDocumentId), row.subtopicId);
    assert.equal(new Set(active.map((question) => question.id)).size, active.length, row.subtopicId);
    assert.ok(active.every((question) => question.solutionSteps.length > 0), row.subtopicId);
  }
});

test("12.1 uses exactly ten verified source exercises and does not generate extras", () => {
  const active = buildActivePracticeSet("12.1");
  assert.equal(active.length, 10);
  assert.ok(active.every((question) => question.origin === "pdf"));
  assert.ok(active.every((question) => question.automatedGrading === false));
  assert.ok(active.every((question) => question.verificationStatus === "verified"));
});

test("unverified calculus banks remain honestly unavailable", () => {
  for (const code of ["12.2", "12.4", "13.1", "14.9"]) assert.deepEqual(buildActivePracticeSet(code), []);
});

test("CD20-CD21 publish only independently verified generated questions", () => {
  for (const row of getExerciseCoverageRows().filter((item) => /^(?:20|21)\./u.test(item.subtopicId))) {
    const active = buildActivePracticeSet(row.subtopicId);
    assert.equal(active.length, 3, row.subtopicId);
    assert.ok(active.every((question) => question.origin === "generated"), row.subtopicId);
    assert.ok(active.every((question) => question.verificationStatus === "programmatically-verified"), row.subtopicId);
    assert.ok(active.every((question) => question.options.filter((option) => option === question.correctAnswer).length === 1), row.subtopicId);
  }
});

test("independent evaluators cover exact counting and probability arithmetic", () => {
  assert.equal(independentlyEvaluateCalculation({ kind: "combination", input: { n: 8, k: 3 } }), "56");
  assert.equal(independentlyEvaluateCalculation({ kind: "unionDivisible", input: { limit: 30, a: 2, b: 3 } }), "20");
  assert.equal(independentlyEvaluateCalculation({ kind: "probability", input: { favorable: 6, total: 18 } }), "1/3");
  assert.equal(independentlyEvaluateCalculation({ kind: "probabilityAtLeastOne", input: { total: 2, excluded: 1, n: 3 } }), "7/8");
});

test("generated candidates fail closed for wrong answers, invalid domains and out-of-scope skills", () => {
  const blueprint = exerciseBlueprints["20.1"];
  const original = generatePracticeSet("20.1", "PRACTICE_V15")[0];
  const candidate = { ...original, patternIndex: 1 };
  assert.equal(validateGeneratedCandidate(candidate, blueprint).valid, true);

  const wrongAnswer = { ...candidate, correctAnswer: "999" };
  assert.ok(validateGeneratedCandidate(wrongAnswer, blueprint).errors.includes("answer-verification-failed"));

  const invalidDomain = { ...candidate, calculation: { kind: "sum", input: { values: [3, -5] } } };
  assert.ok(validateGeneratedCandidate(invalidDomain, blueprint).errors.includes("invalid-parameters"));

  const outOfScope = { ...candidate, calculation: { kind: "factorial", input: { n: 3 } }, correctAnswer: "6" };
  assert.ok(validateGeneratedCandidate(outOfScope, blueprint).errors.includes("calculation-out-of-scope"));

  assert.ok(validateGeneratedCandidate(candidate, blueprint, [{ prompt: candidate.prompt }]).errors.includes("duplicate-question"));
});

test("calculus source validation rejects a mathematically wrong antiderivative", () => {
  const source = getCalculusSourcePractice("12.1")[0];
  assert.equal(validateSourceQuestion(source, exerciseBlueprints["12.1"]).valid, true);
  const wrongSpec = {
    ...source.verificationSpec,
    candidate: source.verificationSpec.candidate.map((term, index) => index ? term : { ...term, coefficient: term.coefficient + 1 })
  };
  assert.equal(verifyAntiderivativeSpec(wrongSpec), false);
  assert.equal(validateSourceQuestion({ ...source, verificationSpec: wrongSpec }, exerciseBlueprints["12.1"]).valid, false);
});

test("source prompts remain the transcribed PDF wording", () => {
  assert.deepEqual(getCalculusSourcePractice("12.1").map((exercise) => exercise.prompt), [
    "Tính ∫(5x⁴−6x+1)dx.",
    "Tính ∫(1/√x+x²)dx với x>0.",
    "Tính ∫(3/x−2sinx)dx với x>0.",
    "Tính ∫(4cosx+1/(1+x²))dx.",
    "Kiểm tra F(x)=x⁴−3x²+7 có phải nguyên hàm của f(x)=4x³−6x không.",
    "Tính ∫(7x⁶−1/x+4)dx với x>0.",
    "Tính ∫(1−3/x²+2cosx)dx với x≠0.",
    "Tính ∫(2/(1+x²)−5eˣ)dx.",
    "Tính ∫(x^(−3)+sinx−1)dx.",
    "Tìm một nguyên hàm F của f(x)=2x−1/x trên (0,+∞) thỏa F(1)=3."
  ]);
});

test("parameter validation rejects unsafe or impossible inputs", () => {
  assert.equal(validateCalculationParameters({ kind: "combination", input: { n: 3, k: 5 } }), false);
  assert.equal(validateCalculationParameters({ kind: "probability", input: { favorable: 5, total: 4 } }), false);
  assert.equal(validateCalculationParameters({ kind: "modPower", input: { base: 2, exponent: 3, modulus: 0 } }), false);
  assert.equal(validateCalculationParameters({ kind: "sum", input: { values: [1, 100001] } }), false);
});
