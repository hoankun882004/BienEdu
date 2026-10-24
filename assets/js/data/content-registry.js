import { curriculumMeta, curriculumTopics } from "./curriculum.js";
import { getCalculusSourcePractice } from "./calculus-source-practice.js?v=11.2";
import { getDocumentForTopic } from "./document-mappings.js?v=12.1";
import { getExampleContent } from "./example-content.js?v=8.6";
import { getKnowledgeContent } from "./knowledge-content.js?v=14.0";
import { supportedPracticeTopics } from "../domain/exercise-generators.js?v=8.6";

export const CONTENT_STATUS = Object.freeze({
  AVAILABLE: "available",
  PARTIAL: "partial",
  COMING_SOON: "coming-soon",
  NEEDS_REVIEW: "needs-review"
});

const practiceCodes = new Set(supportedPracticeTopics);
const calculusTopics = new Set(["CD12", "CD13", "CD14"]);

function sourceReference(document, pages = []) {
  if (!document) return null;
  return Object.freeze({
    documentId: document.documentId,
    filePath: document.filePath,
    pages: Object.freeze([...new Set(pages)].sort((left, right) => left - right)),
    verification: document.verification?.status ?? "verified"
  });
}

function createKnowledgeSection(code, document) {
  const reading = getKnowledgeContent(code);
  if (!reading) return Object.freeze({
    status: CONTENT_STATUS.COMING_SOON,
    units: Object.freeze([])
  });

  const readingPages = reading.pages ?? [reading];
  const units = readingPages.map((page, index) => {
    return Object.freeze({
      // These legacy IDs are intentionally retained so existing localStorage progress is not reset.
      id: `${code}-knowledge-${index + 1}`,
      title: page?.title ?? reading?.title ?? null,
      source: sourceReference(document, page?.sourcePages ?? [document?.exercisePages?.[code]].filter(Boolean)),
      verification: "verified"
    });
  });

  return Object.freeze({
    status: CONTENT_STATUS.AVAILABLE,
    verification: "verified",
    units: Object.freeze(units),
    count: units.length,
    origin: "verified-markdown"
  });
}

function createExampleSection(code, topicId, document) {
  const examples = getExampleContent(code) ?? [];
  if (!examples.length) return Object.freeze({ status: CONTENT_STATUS.COMING_SOON, units: Object.freeze([]) });

  const units = examples.map((example, index) => Object.freeze({
    id: example.id ?? `${code}-example-${index + 1}`,
    title: example.title,
    source: sourceReference(document, example.sourcePages ?? []),
    sourceBlockId: example.sourceBlockId ?? null,
    origin: example.origin ?? "verified-source",
    verification: example.verification ?? "verified"
  }));
  const sourceCoverage = "complete";

  return Object.freeze({
    status: CONTENT_STATUS.AVAILABLE,
    verification: "verified",
    units: Object.freeze(units),
    count: units.length,
    origin: "verified-source",
    sourceCoverage,
    coverageNote: null
  });
}

function createPracticeSection(code, topicId) {
  if (!practiceCodes.has(code)) return Object.freeze({ status: CONTENT_STATUS.COMING_SOON, units: Object.freeze([]) });
  const sourceExercises = calculusTopics.has(topicId) ? getCalculusSourcePractice(code) : [];
  const sourceUnits = Object.freeze(sourceExercises.map((exercise) => Object.freeze({
    id: exercise.id,
    sourceBlockId: exercise.sourceBlockId,
    sourcePages: exercise.sourcePages,
    type: exercise.type,
    answerKeyStatus: exercise.answerKeyStatus,
    automatedGrading: exercise.automatedGrading,
    verification: exercise.verification
  })));
  const needsReviewCount = sourceExercises.filter((exercise) => exercise.verification !== "verified").length;
  const sourceCoverage = calculusTopics.has(topicId) ? "complete" : "not-applicable";
  return Object.freeze({
    status: CONTENT_STATUS.AVAILABLE,
    verification: "validated",
    count: 3,
    units: Object.freeze([]),
    sourceUnits,
    sourceCount: sourceUnits.length,
    sourceAnswerKeyCount: sourceExercises.filter((exercise) => exercise.answerKey).length,
    sourceAutoGradableCount: sourceExercises.filter((exercise) => exercise.automatedGrading === "supported").length,
    needsReviewCount,
    origin: sourceUnits.length ? "generated-practice-and-verified-source-bank" : "generated-practice",
    sourceCoverage,
    coverageNote: sourceUnits.length
      ? "Ten PDF self-practice questions are available for self-check; generated auto-graded practice remains separate."
      : "Generated practice is intentionally separate from the PDF examples."
  });
}

function deriveStatus(sections) {
  const statuses = Object.values(sections).map((section) => section.status);
  if (statuses.includes(CONTENT_STATUS.NEEDS_REVIEW)) return CONTENT_STATUS.NEEDS_REVIEW;
  if (statuses.every((status) => status === CONTENT_STATUS.AVAILABLE)) return CONTENT_STATUS.AVAILABLE;
  if (statuses.every((status) => status === CONTENT_STATUS.COMING_SOON)) return CONTENT_STATUS.COMING_SOON;
  return CONTENT_STATUS.PARTIAL;
}

function createSubtopicRecord(topic, exercise, document) {
  const sections = Object.freeze({
    knowledge: createKnowledgeSection(exercise.code, document),
    examples: createExampleSection(exercise.code, topic.id, document),
    practice: createPracticeSection(exercise.code, topic.id)
  });
  const status = deriveStatus(sections);
  const sourceCoverage = status === CONTENT_STATUS.AVAILABLE
      ? "complete"
      : "none";
  const verificationStatus = sections.practice.needsReviewCount > 0 ? "needs-review" : "verified";

  return Object.freeze({
    id: exercise.id,
    code: exercise.code,
    title: exercise.title,
    status,
    sourceCoverage,
    verificationStatus,
    sections
  });
}

function createTopicRecord(topic) {
  const document = getDocumentForTopic(topic.id);
  const subtopics = Object.freeze(Object.fromEntries(
    topic.exerciseTypes.map((exercise) => [exercise.code, createSubtopicRecord(topic, exercise, document)])
  ));
  const statuses = Object.values(subtopics).map((item) => item.status);
  const status = statuses.includes(CONTENT_STATUS.NEEDS_REVIEW)
    ? CONTENT_STATUS.NEEDS_REVIEW
    : statuses.every((item) => item === CONTENT_STATUS.AVAILABLE)
      ? CONTENT_STATUS.AVAILABLE
      : statuses.every((item) => item === CONTENT_STATUS.COMING_SOON)
        ? CONTENT_STATUS.COMING_SOON
        : CONTENT_STATUS.PARTIAL;
  const sourceCoverage = status === CONTENT_STATUS.AVAILABLE
      ? "complete"
      : "none";
  const verificationStatus = Object.values(subtopics).some((item) => item.verificationStatus === "needs-review")
    ? "needs-review"
    : status === CONTENT_STATUS.COMING_SOON
      ? "not-reviewed"
      : "verified";

  return Object.freeze({
    id: topic.id,
    title: topic.title,
    status,
    sourceCoverage,
    verificationStatus,
    documentId: document?.documentId ?? null,
    subtopics
  });
}

const topics = Object.freeze(Object.fromEntries(curriculumTopics.map((topic) => [topic.id, createTopicRecord(topic)])));

export const learningContentRegistry = Object.freeze({
  grade: "12",
  curriculum: Object.freeze({
    topicCount: curriculumMeta.topicCount,
    subtopicCount: curriculumMeta.exerciseTypeCount,
    sourceSha256: curriculumMeta.sourceSha256
  }),
  topics
});

export function getTopicAvailability(topicId) {
  return learningContentRegistry.topics[topicId] ?? null;
}

export function getSubtopicAvailability(code) {
  for (const topic of Object.values(learningContentRegistry.topics)) {
    if (topic.subtopics[code]) return topic.subtopics[code];
  }
  return null;
}

export function getAvailabilitySummary() {
  const topicValues = Object.values(learningContentRegistry.topics);
  const subtopicValues = topicValues.flatMap((topic) => Object.values(topic.subtopics));
  const count = (items, status) => items.filter((item) => item.status === status).length;
  return Object.freeze({
    topics: Object.freeze(Object.fromEntries(Object.values(CONTENT_STATUS).map((status) => [status, count(topicValues, status)]))),
    subtopics: Object.freeze(Object.fromEntries(Object.values(CONTENT_STATUS).map((status) => [status, count(subtopicValues, status)])))
  });
}
