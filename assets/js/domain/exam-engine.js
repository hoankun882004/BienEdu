import { generatePracticeSet } from "./exercise-generators.js?v=8.6";

export const finalExamBlueprints = Object.freeze({
  CD12: [
    "12.1", "12.2", "12.3", "12.4", "12.5", "12.6", "12.7", "12.8", "12.9", "12.1",
    "12.2", "12.3", "12.4", "12.5", "12.6", "12.7", "12.8", "12.9", "12.1", "12.5"
  ],
  CD13: [
    "13.1", "13.2", "13.3", "13.4", "13.5", "13.6", "13.7", "13.8", "13.1", "13.2",
    "13.3", "13.4", "13.5", "13.6", "13.7", "13.8", "13.1", "13.2", "13.3", "13.4"
  ],
  CD14: [
    "14.1", "14.2", "14.3", "14.4", "14.5", "14.6", "14.7", "14.8", "14.9", "14.1",
    "14.2", "14.3", "14.4", "14.5", "14.6", "14.7", "14.8", "14.9", "14.1", "14.5"
  ],
  CD20: [
    "20.1", "20.2", "20.3", "20.4", "20.5", "20.6", "20.7", "20.8", "20.9", "20.10",
    "20.11", "20.12", "20.13", "20.14", "20.15", "20.16", "20.17", "20.1", "20.5", "20.7"
  ],
  CD21: [
    "21.1", "21.2", "21.3", "21.4", "21.5", "21.6", "21.7", "21.8", "21.1", "21.2",
    "21.3", "21.4", "21.5", "21.6", "21.7", "21.8", "21.2", "21.6", "21.7", "21.8"
  ]
});

export function createFinalExam(topicId) {
  const blueprint = finalExamBlueprints[topicId] || [];
  const occurrences = {};
  return blueprint.map((code, index) => {
    occurrences[code] = (occurrences[code] ?? 0) + 1;
    const examSeed = `${topicId}_FINAL_V1_${occurrences[code]}`;
    const set = generatePracticeSet(code, examSeed);
    const source = set[(occurrences[code] - 1) % set.length];
    return { ...source, id: `${topicId}-final-${index + 1}`, examIndex: index };
  });
}

export function gradeFinalExam(questions, answers) {
  const details = questions.map((question, index) => ({
    questionId: question.id,
    sourceTopic: question.sourceTopic,
    selectedIndex: Number(answers[index]),
    correctIndex: question.correctIndex,
    correct: Number(answers[index]) === question.correctIndex
  }));
  const score = details.filter((item) => item.correct).length;
  const percent = questions.length ? Math.round(score / questions.length * 100) : 0;
  return { score, total: questions.length, percent, details };
}

export function countAnswered(questions, answers) {
  return questions.reduce((count, _question, index) => count + (Object.hasOwn(answers, index) ? 1 : 0), 0);
}
