export const LEGACY_LEARNING_STORAGE_KEY = "bienedu.learning.v2";
export const LEARNING_STORAGE_PREFIX = "bienedu:progress:v2:grade";
export const LEARNING_STORAGE_VERSION = 2;

export function getLearningStorageKey(gradeId = "12") {
  return `${LEARNING_STORAGE_PREFIX}${gradeId}`;
}

export const LEARNING_STORAGE_KEY = getLearningStorageKey("12");

function createLessonProgress() {
  return { viewedKnowledge: [], viewedExamples: [], practiceAnswers: {} };
}

export function createLearningProgress() {
  return { version: LEARNING_STORAGE_VERSION, lessons: {}, exams: {} };
}

function normalize(progress) {
  if (progress?.version !== LEARNING_STORAGE_VERSION) return createLearningProgress();
  return {
    ...createLearningProgress(),
    ...progress,
    lessons: { ...(progress.lessons ?? {}) },
    exams: { ...(progress.exams ?? {}) }
  };
}

function readStoredProgress(storage, key) {
  try {
    return JSON.parse(storage?.getItem(key) || "null");
  } catch {
    return null;
  }
}

export function loadLearningProgress(storage = globalThis.localStorage, gradeId = "12") {
  const storageKey = getLearningStorageKey(gradeId);
  const storedProgress = readStoredProgress(storage, storageKey);
  if (storedProgress) return normalize(storedProgress);

  if (String(gradeId) === "12") {
    const legacyProgress = readStoredProgress(storage, LEGACY_LEARNING_STORAGE_KEY);
    if (legacyProgress?.version === LEARNING_STORAGE_VERSION) {
      return saveLearningProgress(legacyProgress, storage, gradeId);
    }
  }
  return createLearningProgress();
}

export function saveLearningProgress(progress, storage = globalThis.localStorage, gradeId = "12") {
  const normalized = normalize(progress);
  try {
    storage?.setItem(getLearningStorageKey(gradeId), JSON.stringify(normalized));
  } catch {
    // Storage can be unavailable in private browsing or restricted embeds.
  }
  return normalized;
}

function lesson(progress, code) {
  const current = progress.lessons[code] ?? {};
  return {
    ...createLessonProgress(),
    ...current,
    viewedKnowledge: [...(current.viewedKnowledge ?? [])],
    viewedExamples: [...(current.viewedExamples ?? [])],
    practiceAnswers: { ...(current.practiceAnswers ?? {}) }
  };
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
    viewedExamples: [...new Set([...current.viewedExamples, slideId])]
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

export function getLessonProgress(
  progress,
  code,
  knowledgeCount,
  exampleCount = 0,
  practiceCount = 3,
  materialStatus = "available"
) {
  const current = lesson(normalize(progress), code);
  const viewed = Math.min(new Set(current.viewedKnowledge).size, knowledgeCount);
  const examplesViewed = Math.min(new Set(current.viewedExamples).size, exampleCount);
  const answered = Math.min(Object.keys(current.practiceAnswers).length, practiceCount);
  const total = knowledgeCount + exampleCount + practiceCount;
  const completed = viewed + examplesViewed + answered;
  const availableContentComplete = knowledgeCount > 0
    && viewed === knowledgeCount
    && examplesViewed === exampleCount
    && answered === practiceCount;
  const isMaterialComplete = materialStatus === "available";

  return {
    viewed,
    examplesViewed,
    answered,
    completed,
    total,
    percent: total ? Math.round(completed / total * 100) : 0,
    availableContentComplete,
    isMaterialComplete,
    isComplete: availableContentComplete && isMaterialComplete
  };
}

export function getTopicProgress(progress, topic, knowledgeCounts) {
  const applicableExercises = topic.exerciseTypes.filter((item) => {
    const counts = knowledgeCounts[item.code];
    if (!counts) return false;
    return counts.available ?? ((counts.knowledge ?? 0) + (counts.examples ?? 0) + (counts.practice ?? 3) > 0);
  });
  const lessons = applicableExercises.map((item) => {
    const counts = knowledgeCounts[item.code] ?? {};
    return getLessonProgress(
      progress,
      item.code,
      counts.knowledge ?? 0,
      counts.examples ?? 0,
      counts.practice ?? 3,
      counts.materialStatus ?? "available"
    );
  });
  const completedLessons = lessons.filter((item) => item.isComplete).length;
  const availableLessons = lessons.length;
  const materialComplete = availableLessons === topic.exerciseTypes.length
    && lessons.every((item) => item.isMaterialComplete);
  return {
    completedLessons,
    availableLessons,
    declaredLessons: topic.exerciseTypes.length,
    totalLessons: availableLessons,
    percent: availableLessons ? Math.round(completedLessons / availableLessons * 100) : 0,
    materialComplete,
    isComplete: materialComplete && availableLessons > 0 && completedLessons === availableLessons
  };
}

export function saveExamAnswer(progress, topicId, questionIndex, selectedIndex) {
  const next = normalize(progress);
  const current = next.exams[topicId] ?? { answers: {}, submitted: false };
  if (current.submitted) return next;
  next.exams[topicId] = {
    ...current,
    answers: { ...current.answers, [questionIndex]: selectedIndex }
  };
  return next;
}

export function submitExam(progress, topicId, result) {
  const next = normalize(progress);
  const current = next.exams[topicId] ?? { answers: {} };
  next.exams[topicId] = {
    ...current,
    submitted: true,
    result,
    submittedAt: new Date().toISOString()
  };
  return next;
}

export function resetExam(progress, topicId) {
  const next = normalize(progress);
  delete next.exams[topicId];
  return next;
}
