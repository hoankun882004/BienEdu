export const LEARNING_STORAGE_KEY = "bienedu.learning.v2";
export const LEARNING_STORAGE_VERSION = 2;

export function createLearningProgress() {
  return { version: LEARNING_STORAGE_VERSION, lessons: {}, exams: {} };
}

function normalize(progress) {
  return progress?.version === LEARNING_STORAGE_VERSION
    ? { ...createLearningProgress(), ...progress, lessons: { ...progress.lessons }, exams: { ...progress.exams } }
    : createLearningProgress();
}

export function loadLearningProgress(storage = globalThis.localStorage) {
  try {
    return normalize(JSON.parse(storage?.getItem(LEARNING_STORAGE_KEY) || "null"));
  } catch {
    return createLearningProgress();
  }
}

export function saveLearningProgress(progress, storage = globalThis.localStorage) {
  const normalized = normalize(progress);
  try { storage?.setItem(LEARNING_STORAGE_KEY, JSON.stringify(normalized)); } catch { /* Storage may be disabled. */ }
  return normalized;
}

function lesson(progress, code) {
  return progress.lessons[code] || { viewedKnowledge: [], viewedExamples: [], practiceAnswers: {} };
}

export function markKnowledgeViewed(progress, code, slideId) {
  const next = normalize(progress);
  const current = lesson(next, code);
  next.lessons[code] = {
    ...current,
    viewedKnowledge: [...new Set([...current.viewedKnowledge, slideId])]
  };
  return next;
}

export function markExampleViewed(progress, code, slideId) {
  const next = normalize(progress);
  const current = lesson(next, code);
  next.lessons[code] = {
    ...current,
    viewedExamples: [...new Set([...(current.viewedExamples || []), slideId])]
  };
  return next;
}

export function recordPracticeAnswer(progress, code, questionId, selectedIndex, correctIndex) {
  const next = normalize(progress);
  const current = lesson(next, code);
  if (current.practiceAnswers[questionId]) return next;
  next.lessons[code] = {
    ...current,
    practiceAnswers: {
      ...current.practiceAnswers,
      [questionId]: { selectedIndex, correctIndex, correct: selectedIndex === correctIndex }
    }
  };
  return next;
}

export function getLessonProgress(progress, code, knowledgeCount, exampleCount = 0, practiceCount = 3) {
  const current = lesson(normalize(progress), code);
  const viewed = Math.min(new Set(current.viewedKnowledge).size, knowledgeCount);
  const examplesViewed = Math.min(new Set(current.viewedExamples || []).size, exampleCount);
  const answered = Math.min(Object.keys(current.practiceAnswers).length, practiceCount);
  const total = knowledgeCount + exampleCount + practiceCount;
  const completed = viewed + examplesViewed + answered;
  return {
    viewed,
    examplesViewed,
    answered,
    completed,
    total,
    percent: total ? Math.round(completed / total * 100) : 0,
    isComplete: knowledgeCount > 0 && viewed === knowledgeCount && examplesViewed === exampleCount && answered === practiceCount
  };
}

export function getTopicProgress(progress, topic, knowledgeCounts) {
  const lessons = topic.exerciseTypes.map((item) => {
    const counts = knowledgeCounts[item.code] || {};
    return getLessonProgress(progress, item.code, counts.knowledge || 0, counts.examples || 0);
  });
  const completedLessons = lessons.filter((item) => item.isComplete).length;
  return {
    completedLessons,
    totalLessons: lessons.length,
    percent: lessons.length ? Math.round(completedLessons / lessons.length * 100) : 0,
    isComplete: lessons.length > 0 && completedLessons === lessons.length
  };
}

export function saveExamAnswer(progress, topicId, questionIndex, selectedIndex) {
  const next = normalize(progress);
  const current = next.exams[topicId] || { answers: {}, submitted: false };
  if (current.submitted) return next;
  next.exams[topicId] = { ...current, answers: { ...current.answers, [questionIndex]: selectedIndex } };
  return next;
}

export function submitExam(progress, topicId, result) {
  const next = normalize(progress);
  const current = next.exams[topicId] || { answers: {} };
  next.exams[topicId] = { ...current, submitted: true, result, submittedAt: new Date().toISOString() };
  return next;
}

export function resetExam(progress, topicId) {
  const next = normalize(progress);
  delete next.exams[topicId];
  return next;
}
