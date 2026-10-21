import { curriculumMeta, curriculumTopics } from "./curriculum.js";
import { getDocumentForTopic } from "./document-mappings.js?v=11.1";
import { getExampleContent } from "./example-content.js?v=8.6";
import { getKnowledgeContent } from "./knowledge-content.js?v=8.9";
import { getKnowledgeSection } from "./knowledge-slides.js?v=8.6";
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
  const section = getKnowledgeSection(code);
  const reading = getKnowledgeContent(code);
  if (!section || !reading) return Object.freeze({ status: CONTENT_STATUS.COMING_SOON, units: Object.freeze([]) });

  const readingPages = reading.pages ?? [reading];
  const fallbackPages = section.knowledgeSlides.flatMap((slide) => slide.sourcePages ?? []);
  const units = readingPages.map((page, index) => {
    const sourceSlide = section.knowledgeSlides[Math.min(index, section.knowledgeSlides.length - 1)];
    return Object.freeze({
      // These legacy IDs are intentionally retained so existing localStorage progress is not reset.
      id: `${code}-knowledge-${index + 1}`,
      title: page.title ?? reading.title ?? null,
      source: sourceReference(document, page.sourcePages ?? sourceSlide?.sourcePages ?? fallbackPages),
      verification: "verified"
    });
  });

  return Object.freeze({
    status: CONTENT_STATUS.AVAILABLE,
    verification: "verified",
    units: Object.freeze(units),
    count: units.length,
    origin: "verified-source"
  });
}

function createExampleSection(code, topicId, document) {
  const examples = getExampleContent(code) ?? [];
  if (!examples.length) return Object.freeze({ status: CONTENT_STATUS.COMING_SOON, units: Object.freeze([]) });

  const units = examples.map((example, index) => Object.freeze({
    id: `${code}-example-${index + 1}`,
    title: example.title,
    source: sourceReference(document, example.sourcePages ?? []),
    verification: "verified"
  }));
  const sourceCoverage = calculusTopics.has(topicId) ? "partial" : "complete";

  return Object.freeze({
    status: CONTENT_STATUS.AVAILABLE,
    verification: "verified",
    units: Object.freeze(units),
    count: units.length,
    origin: "verified-source",
    sourceCoverage,
    coverageNote: sourceCoverage === "partial"
      ? "The source contains a second worked example for this lesson; the current structured lesson retains one fully verified example."
      : null
  });
}

function createPracticeSection(code, topicId) {
  if (!practiceCodes.has(code)) return Object.freeze({ status: CONTENT_STATUS.COMING_SOON, units: Object.freeze([]) });
  const sourceCoverage = calculusTopics.has(topicId) ? "partial" : "not-applicable";
  return Object.freeze({
    status: CONTENT_STATUS.AVAILABLE,
    verification: "validated",
    count: 3,
    units: Object.freeze([]),
    origin: "generated-practice",
    sourceCoverage,
    coverageNote: sourceCoverage === "partial"
      ? "Three validated practice questions are available; the ten-item PDF self-practice bank is not fully transcribed."
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
  const sourceCoverage = calculusTopics.has(topic.id) && status === CONTENT_STATUS.AVAILABLE
    ? "partial"
    : status === CONTENT_STATUS.AVAILABLE
      ? "complete"
      : "none";

  return Object.freeze({
    id: exercise.id,
    code: exercise.code,
    title: exercise.title,
    status,
    sourceCoverage,
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
  const sourceCoverage = calculusTopics.has(topic.id) && status === CONTENT_STATUS.AVAILABLE
    ? "partial"
    : status === CONTENT_STATUS.AVAILABLE
      ? "complete"
      : "none";

  return Object.freeze({
    id: topic.id,
    title: topic.title,
    status,
    sourceCoverage,
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
