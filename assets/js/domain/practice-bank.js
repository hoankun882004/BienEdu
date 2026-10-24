import { getCalculusSourcePractice } from "../data/calculus-source-practice.js?v=15.0";
import { exerciseBlueprints, getExerciseBlueprint } from "../data/exercise-blueprints.js?v=15.0";
import { evaluateCalculation, generatePracticeSet, supportedPracticeTopics } from "./exercise-generators.js?v=15.0";

export const MAX_ACTIVE_QUESTIONS = 10;
export const PRACTICE_CONTENT_VERSION = "15.0";

function gcd(left, right) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function reducedFraction(numerator, denominator) {
  const divisor = gcd(numerator, denominator);
  const top = numerator / divisor;
  const bottom = denominator / divisor;
  return bottom === 1 ? String(top) : `${top}/${bottom}`;
}

function recursiveFactorial(value) {
  return value <= 1 ? 1 : value * recursiveFactorial(value - 1);
}

function chooseByRecursion(total, selected) {
  if (selected < 0 || selected > total) return 0;
  if (selected === 0 || selected === total) return 1;
  return chooseByRecursion(total - 1, selected - 1) + chooseByRecursion(total - 1, selected);
}

function integerPowerModulo(base, exponent, modulus) {
  let result = 1;
  for (let index = 0; index < exponent; index += 1) result = (result * base) % modulus;
  return String((result + modulus) % modulus);
}

function countResidues(limit, modulus, residue) {
  let count = 0;
  for (let value = 1; value <= limit; value += 1) {
    if (value % modulus === residue) count += 1;
  }
  return count;
}

export function independentlyEvaluateCalculation(calculation, blueprint = null) {
  const input = calculation?.input ?? {};
  switch (calculation?.kind) {
    case "sum": return String(input.values.reduce((sum, value) => sum + value, 0));
    case "product": return String(input.values.reduce((product, value) => product * value, 1));
    case "factorial": return String(recursiveFactorial(input.n));
    case "repeatedPermutation": return String(recursiveFactorial(input.n) / input.repeats.reduce((product, value) => product * recursiveFactorial(value), 1));
    case "roundPermutation": return String(recursiveFactorial(input.n - 1));
    case "arrangement": return String(recursiveFactorial(input.n) / recursiveFactorial(input.n - input.k));
    case "power": return String(Array.from({ length: input.exponent }).reduce((product) => product * input.base, 1));
    case "combination": return String(chooseByRecursion(input.n, input.k));
    case "adjacent": return String(2 * recursiveFactorial(input.n - 1));
    case "notAdjacent": return String(recursiveFactorial(input.n) - 2 * recursiveFactorial(input.n - 1));
    case "gapArrange": return String(recursiveFactorial(input.first) * chooseByRecursion(input.first + 1, input.second) * recursiveFactorial(input.second));
    case "combinationProduct": return String(chooseByRecursion(input.a, input.i) * chooseByRecursion(input.b, input.k - input.i));
    case "combinationRangeSum": return String(input.values.reduce((sum, value) => sum + chooseByRecursion(input.a, value) * chooseByRecursion(input.b, input.k - value), 0));
    case "bothTypes": return String(chooseByRecursion(input.a + input.b, input.k) - chooseByRecursion(input.a, input.k) - chooseByRecursion(input.b, input.k));
    case "starsBarsZero": return String(chooseByRecursion(input.n + input.m - 1, input.m - 1));
    case "starsBarsPositive": return String(chooseByRecursion(input.n - 1, input.m - 1));
    case "labeledGroups": return String(recursiveFactorial(input.n) / input.sizes.reduce((product, value) => product * recursiveFactorial(value), 1));
    case "unlabeledEqualGroups": return String(chooseByRecursion(input.n, input.n / 2) / 2);
    case "pairings": return String(recursiveFactorial(2 * input.m) / ((2 ** input.m) * recursiveFactorial(input.m)));
    case "complementPower": return String((input.totalBase ** input.n) - (input.excludedBase ** input.n));
    case "subsetSpecial": return String((2 ** input.n) - (2 ** (input.n - input.special)));
    case "unionCount2": return String(input.a + input.b - input.intersection);
    case "unionCount3": return String(input.a + input.b + input.c - input.ab - input.ac - input.bc + input.abc);
    case "unionDivisible": return String(Array.from({ length: input.limit }, (_item, index) => index + 1).filter((value) => value % input.a === 0 || value % input.b === 0).length);
    case "cellSelection": return String(chooseByRecursion(input.rows, input.k) * chooseByRecursion(input.columns, input.k) * recursiveFactorial(input.k));
    case "rectangles": return String(chooseByRecursion(input.horizontal, 2) * chooseByRecursion(input.vertical, 2));
    case "diagonals": return String(chooseByRecursion(input.n, 2) - input.n);
    case "trianglesExcluding": return String(chooseByRecursion(input.n, 3) - chooseByRecursion(input.m, 3));
    case "residueCount": return String(countResidues(input.limit, input.modulus, input.residue));
    case "complementResidue": return String((input.modulus - input.residue) % input.modulus);
    case "modPower": return integerPowerModulo(input.base, input.exponent, input.modulus);
    case "modExpression": return String(((input.a * input.b + input.c) % input.modulus + input.modulus) % input.modulus);
    case "teamLeader": return String(input.n * chooseByRecursion(input.n - 1, input.members));
    case "probability": return reducedFraction(input.favorable, input.total);
    case "probabilityComplement": return reducedFraction(input.total - input.favorable, input.total);
    case "probabilityAtLeastOne": return reducedFraction((input.total ** input.n) - (input.excluded ** input.n), input.total ** input.n);
    case "probabilityProduct": return reducedFraction(input.numerators.reduce((product, value) => product * value, 1), input.denominators.reduce((product, value) => product * value, 1));
    case "percentUnion": return `${input.a + input.b - input.intersection}%`;
    case "percentExactlyOne": return `${input.a + input.b - 2 * input.intersection}%`;
    case "identity": {
      if (blueprint?.verificationStrategy !== "reviewed-identity-or-independent-enumeration") return null;
      return String(input.value);
    }
    default: return null;
  }
}

function allFiniteIntegers(value) {
  if (Array.isArray(value)) return value.every(allFiniteIntegers);
  if (value && typeof value === "object") return Object.values(value).every(allFiniteIntegers);
  return typeof value !== "number" || (Number.isFinite(value) && Number.isInteger(value));
}

export function validateCalculationParameters(calculation) {
  const input = calculation?.input ?? {};
  if (!calculation?.kind || !allFiniteIntegers(input)) return false;
  const values = Object.values(input).flat(Infinity).filter((value) => typeof value === "number");
  if (values.some((value) => Math.abs(value) > 100000)) return false;
  if (["probability", "probabilityComplement"].includes(calculation.kind)) {
    return input.total > 0 && input.favorable >= 0 && input.favorable <= input.total;
  }
  if (calculation.kind === "probabilityAtLeastOne") {
    return input.total > 0 && input.excluded >= 0 && input.excluded <= input.total && input.n > 0;
  }
  if (calculation.kind === "probabilityProduct") {
    return input.numerators.length === input.denominators.length
      && input.denominators.every((value) => value > 0)
      && input.numerators.every((value, index) => value >= 0 && value <= input.denominators[index]);
  }
  if (["combination", "arrangement"].includes(calculation.kind)) return input.n >= 0 && input.k >= 0 && input.k <= input.n;
  if (["modPower", "modExpression", "residueCount", "complementResidue"].includes(calculation.kind)) return input.modulus > 0;
  if (["percentUnion", "percentExactlyOne"].includes(calculation.kind)) {
    return input.a >= 0 && input.b >= 0 && input.intersection >= 0
      && input.intersection <= Math.min(input.a, input.b)
      && input.a + input.b - input.intersection <= 100;
  }
  return values.every((value) => value >= 0) || calculation.kind === "identity";
}

function canonicalTermKey(term) {
  return `${term.kind}:${term.power ?? ""}`;
}

function normalizeTerms(terms) {
  const totals = new Map();
  for (const term of terms) {
    if (Math.abs(term.coefficient) < 1e-10) continue;
    const key = canonicalTermKey(term);
    totals.set(key, (totals.get(key) ?? 0) + term.coefficient);
  }
  return [...totals.entries()]
    .filter(([, coefficient]) => Math.abs(coefficient) >= 1e-10)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, coefficient]) => ({ key, coefficient }));
}

function derivativeTerms(candidateTerms) {
  const result = [];
  for (const term of candidateTerms) {
    switch (term.kind) {
      case "power":
        if (term.power !== 0) result.push({ kind: term.power === 1 ? "constant" : "power", coefficient: term.coefficient * term.power, ...(term.power === 1 ? {} : { power: term.power - 1 }) });
        break;
      case "lnAbs": result.push({ kind: "reciprocal", coefficient: term.coefficient }); break;
      case "sin": result.push({ kind: "cos", coefficient: term.coefficient }); break;
      case "cos": result.push({ kind: "sin", coefficient: -term.coefficient }); break;
      case "exp": result.push({ kind: "exp", coefficient: term.coefficient }); break;
      case "arctan": result.push({ kind: "reciprocalQuadratic", coefficient: term.coefficient }); break;
      case "constant": break;
      default: return null;
    }
  }
  return result;
}

function evaluateCanonicalTerms(terms, x) {
  return terms.reduce((sum, term) => {
    switch (term.kind) {
      case "power": return sum + term.coefficient * (x ** term.power);
      case "lnAbs": return sum + term.coefficient * Math.log(Math.abs(x));
      case "sin": return sum + term.coefficient * Math.sin(x);
      case "cos": return sum + term.coefficient * Math.cos(x);
      case "exp": return sum + term.coefficient * Math.exp(x);
      case "arctan": return sum + term.coefficient * Math.atan(x);
      case "constant": return sum + term.coefficient;
      default: return Number.NaN;
    }
  }, 0);
}

export function verifyAntiderivativeSpec(specification) {
  if (!specification?.integrand?.length || !specification?.candidate?.length) return false;
  const derivative = derivativeTerms(specification.candidate);
  if (!derivative) return false;
  const expected = normalizeTerms(specification.integrand);
  const actual = normalizeTerms(derivative);
  if (expected.length !== actual.length) return false;
  if (!expected.every((term, index) => term.key === actual[index].key && Math.abs(term.coefficient - actual[index].coefficient) < 1e-9)) return false;
  if (specification.condition) {
    const actualValue = evaluateCanonicalTerms(specification.candidate, specification.condition.x);
    if (!Number.isFinite(actualValue) || Math.abs(actualValue - specification.condition.value) >= 1e-9) return false;
  }
  return true;
}

function normalizedSignature(value) {
  return String(value).normalize("NFKC").toLocaleLowerCase("vi").replace(/[\s.,;:!?()[\]{}|]/gu, "");
}

function solutionStepsFromText(solution) {
  return String(solution).split(/(?<=[.!?])\s+/u).map((step) => step.trim()).filter(Boolean);
}

export function validateSourceQuestion(exercise, blueprint = getExerciseBlueprint(exercise?.id?.split("-source-")[0])) {
  const errors = [];
  if (!blueprint || blueprint.status !== "verified") errors.push("blueprint-not-verified");
  if (!blueprint?.allowedOrigins.includes("pdf")) errors.push("origin-not-allowed");
  if (exercise?.readyStatus !== "ready-self-check") errors.push("not-ready");
  if (exercise?.verification !== "verified" || exercise?.answerKeyStatus !== "verified") errors.push("source-answer-not-verified");
  if (exercise?.detailedSolutionStatus !== "derived-verified" || exercise?.solutionSteps?.length < 2) errors.push("solution-incomplete");
  if (!verifyAntiderivativeSpec(exercise?.verificationSpec)) errors.push("independent-verification-failed");
  if (!exercise?.prompt?.trim() || !exercise?.answerKey?.trim()) errors.push("content-incomplete");
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function validateGeneratedCandidate(question, blueprint = getExerciseBlueprint(question?.sourceTopic), existingQuestions = []) {
  const errors = [];
  const expectedPattern = `${question?.sourceTopic}.generated.${question?.patternIndex ?? 0}`;
  if (!blueprint || blueprint.status !== "verified" || !blueprint.generationAllowed) errors.push("blueprint-not-approved");
  if (question?.sourceTopic !== blueprint?.subtopicId) errors.push("subtopic-mismatch");
  if (!blueprint?.allowedOrigins.includes("generated")) errors.push("origin-not-allowed");
  if (!blueprint?.problemPatterns.includes(expectedPattern)) errors.push("pattern-not-approved");
  if (!blueprint?.allowedCalculationKinds.includes(question?.calculation?.kind)) errors.push("calculation-out-of-scope");
  if (!validateCalculationParameters(question?.calculation)) errors.push("invalid-parameters");
  let independentAnswer = null;
  try { independentAnswer = independentlyEvaluateCalculation(question?.calculation, blueprint); } catch { independentAnswer = null; }
  if (independentAnswer === null || independentAnswer !== question?.correctAnswer) errors.push("answer-verification-failed");
  if (evaluateCalculation(question?.calculation) !== question?.correctAnswer) errors.push("generator-answer-mismatch");
  if (question?.type !== "multiple-choice" || question?.options?.length !== 4 || new Set(question?.options).size !== 4) errors.push("invalid-options");
  if (question?.options?.filter((option) => option === question?.correctAnswer).length !== 1) errors.push("correct-option-not-unique");
  if (!question?.prompt?.trim() || !question?.solution?.trim()) errors.push("content-incomplete");
  const signature = normalizedSignature(question?.prompt);
  if (existingQuestions.some((item) => normalizedSignature(item.prompt) === signature)) errors.push("duplicate-question");
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), independentAnswer });
}

function readySourceQuestion(exercise, blueprint) {
  const validation = validateSourceQuestion(exercise, blueprint);
  if (!validation.valid) return null;
  return Object.freeze({
    id: exercise.id,
    gradeId: "12",
    topicId: `CD${blueprint.subtopicId.split(".")[0]}`,
    subtopicId: blueprint.subtopicId,
    sourceTopic: blueprint.subtopicId,
    type: "self-check",
    origin: "pdf",
    sourceDocumentId: blueprint.sourceDocumentId,
    sourcePages: exercise.sourcePages,
    sourceBlockId: exercise.sourceBlockId,
    patternId: `${blueprint.subtopicId}.source.${exercise.number}`,
    blueprintId: `${blueprint.subtopicId}.v${blueprint.version}`,
    prompt: exercise.prompt,
    correctAnswer: exercise.answerKey,
    solution: exercise.solutionSteps.join(" "),
    solutionSteps: exercise.solutionSteps,
    solutionOrigin: exercise.solutionOrigin,
    automatedGrading: false,
    verificationStatus: "verified",
    verificationStrategy: blueprint.verificationStrategy,
    contentVersion: PRACTICE_CONTENT_VERSION
  });
}

function readyGeneratedQuestion(question, blueprint, patternIndex, existingQuestions) {
  const candidate = { ...question, patternIndex };
  const validation = validateGeneratedCandidate(candidate, blueprint, existingQuestions);
  if (!validation.valid) return null;
  return Object.freeze({
    ...question,
    gradeId: "12",
    topicId: `CD${blueprint.subtopicId.split(".")[0]}`,
    subtopicId: blueprint.subtopicId,
    origin: "generated",
    sourceDocumentId: blueprint.sourceDocumentId,
    patternId: `${blueprint.subtopicId}.generated.${patternIndex}`,
    blueprintId: `${blueprint.subtopicId}.v${blueprint.version}`,
    solutionSteps: Object.freeze(solutionStepsFromText(question.solution)),
    automatedGrading: true,
    verificationStatus: "programmatically-verified",
    verificationStrategy: blueprint.verificationStrategy,
    contentVersion: PRACTICE_CONTENT_VERSION
  });
}

export function buildActivePracticeSet(subtopicId, seed = "PRACTICE_V15") {
  const blueprint = getExerciseBlueprint(subtopicId);
  if (!blueprint || blueprint.status !== "verified") return Object.freeze([]);
  const active = [];
  for (const exercise of getCalculusSourcePractice(subtopicId)) {
    const ready = readySourceQuestion(exercise, blueprint);
    if (ready && !active.some((item) => normalizedSignature(item.prompt) === normalizedSignature(ready.prompt))) active.push(ready);
    if (active.length === MAX_ACTIVE_QUESTIONS) return Object.freeze(active);
  }
  if (!blueprint.generationAllowed) return Object.freeze(active);
  for (const [index, question] of generatePracticeSet(subtopicId, seed).entries()) {
    const ready = readyGeneratedQuestion(question, blueprint, index + 1, active);
    if (ready) active.push(ready);
    if (active.length === MAX_ACTIVE_QUESTIONS) break;
  }
  return Object.freeze(active);
}

export function getExerciseCoverageRows(seed = "PRACTICE_V15") {
  return Object.freeze(supportedPracticeTopics.map((subtopicId) => {
    const blueprint = exerciseBlueprints[subtopicId] ?? null;
    const sourceQuestions = getCalculusSourcePractice(subtopicId);
    const active = buildActivePracticeSet(subtopicId, seed);
    const readySource = active.filter((question) => question.origin === "pdf").length;
    const readyGenerated = active.filter((question) => question.origin === "generated").length;
    return Object.freeze({
      subtopicId,
      sourceQuestionsFound: sourceQuestions.length,
      readySourceQuestions: readySource,
      readyGeneratedQuestions: readyGenerated,
      totalReadyQuestions: active.length,
      pendingVerification: sourceQuestions.length - readySource,
      exactTypeValidationStatus: blueprint?.status === "verified" ? "verified" : "needs-review"
    });
  }));
}
