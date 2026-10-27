import { curriculumMeta, curriculumTopics } from "./curriculum.js";
import { approvedMathContent } from "./approved-math-content.js?v=13.1";
import { getCalculusSourcePractice } from "./calculus-source-practice.js?v=11.2";
import { getDocumentForTopic } from "./document-mappings.js?v=12.1";
import { getExampleContent } from "./example-content.js?v=8.6";
import { getKnowledgeContent } from "./knowledge-content.js?v=14.0";
import { buildActivePracticeSet } from "../domain/practice-bank.js?v=15.0";

export const CONTENT_STATUS = Object.freeze({
  AVAILABLE: "available",
  PARTIAL: "partial",
  COMING_SOON: "coming-soon",
  NEEDS_REVIEW: "needs-review"
});

const calculusTopics = new Set(["CD12", "CD13", "CD14"]);
const PRACTICE_SEED = "PRACTICE_V15";

function hasImmutableSourceApproval(code) {
  const record = approvedMathContent[code];
  return Boolean(
    record?.verification?.status === "verified"
    && record.verification.reviewer
    && record.verification.reviewedAt
    && record.verification.sourceHash === record.source?.sha256
    && record.verification.formulasChecked === true
    && record.verification.boundariesChecked === true
  );
}

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

  const verification = reading.reviewStatus === "verified" || hasImmutableSourceApproval(code)
    ? "verified"
    : "needs-review";
  const readingPages = reading.pages ?? [reading];
  const units = readingPages.map((page, index) => {
    return Object.freeze({
      // These legacy IDs are intentionally retained so existing localStorage progress is not reset.
      id: `${code}-knowledge-${index + 1}`,
      title: page?.title ?? reading?.title ?? null,
      source: sourceReference(document, page?.sourcePages ?? [document?.exercisePages?.[code]].filter(Boolean)),
      verification
    });
  });

  return Object.freeze({
    status: CONTENT_STATUS.AVAILABLE,
    verification,
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
  const verification = units.every((unit) => unit.verification === "verified") ? "verified" : "needs-review";
  const sourceCoverage = "complete";

  return Object.freeze({
    status: CONTENT_STATUS.AVAILABLE,
    verification,
    units: Object.freeze(units),
    count: units.length,
    origin: "verified-source",
    sourceCoverage,
    coverageNote: null
  });
}

function createPracticeSection(code, topicId) {
  const sourceExercises = calculusTopics.has(topicId) ? getCalculusSourcePractice(code) : [];
  const activeQuestions = buildActivePracticeSet(code, PRACTICE_SEED);
  const sourceUnits = Object.freeze(sourceExercises.map((exercise) => Object.freeze({
    id: exercise.id,
    sourceBlockId: exercise.sourceBlockId,
    sourcePages: exercise.sourcePages,
    type: exercise.type,
    answerKeyStatus: exercise.answerKeyStatus,
    automatedGrading: exercise.automatedGrading,
    verification: exercise.verification,
    readyStatus: exercise.readyStatus,
    detailedSolutionStatus: exercise.detailedSolutionStatus
  })));
  const needsReviewCount = sourceExercises.filter((exercise) => exercise.readyStatus !== "ready-self-check").length;
  const sourceCoverage = calculusTopics.has(topicId) ? "complete" : "not-applicable";
  return Object.freeze({
    status: activeQuestions.length ? CONTENT_STATUS.AVAILABLE : CONTENT_STATUS.COMING_SOON,
    verification: activeQuestions.length ? "validated" : "needs-review",
    count: activeQuestions.length,
    units: Object.freeze(activeQuestions.map((question) => Object.freeze({
      id: question.id,
      gradeId: question.gradeId,
      topicId: question.topicId,
      subtopicId: question.subtopicId,
      origin: question.origin,
      sourceDocumentId: question.sourceDocumentId,
      sourcePages: question.sourcePages ?? [],
      patternId: question.patternId,
      blueprintId: question.blueprintId,
      automatedGrading: question.automatedGrading,
      verificationStatus: question.verificationStatus,
      contentVersion: question.contentVersion
    }))),
    sourceUnits,
    sourceCount: sourceUnits.length,
    sourceAnswerKeyCount: sourceExercises.filter((exercise) => exercise.answerKey).length,
    sourceAutoGradableCount: activeQuestions.filter((question) => question.origin === "pdf" && question.automatedGrading).length,
    readySourceCount: activeQuestions.filter((question) => question.origin === "pdf").length,
    readyGeneratedCount: activeQuestions.filter((question) => question.origin === "generated").length,
    needsReviewCount,
    origin: activeQuestions.some((question) => question.origin === "pdf") ? "source-first-ready-bank" : activeQuestions.length ? "verified-generated-bank" : "review-bank-only",
    sourceCoverage,
    coverageNote: activeQuestions.length
      ? `Active set contains ${activeQuestions.length} ready question(s), capped at 10.`
      : "No question is published until an exact-type blueprint, verified answer and complete solution are available."
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
  const sourceCoverage = sections.knowledge.count > 0 && sections.examples.count > 0
    ? "complete"
    : sections.knowledge.count > 0 || sections.examples.count > 0
      ? "partial"
      : "none";
  const verificationStatus = Object.values(sections).some((section) => section.verification === "needs-review")
    || sections.practice.needsReviewCount > 0
    ? "needs-review"
    : "verified";

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
  const coverageValues = Object.values(subtopics).map((item) => item.sourceCoverage);
  const sourceCoverage = coverageValues.every((value) => value === "complete")
    ? "complete"
    : coverageValues.some((value) => value !== "none")
      ? "partial"
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
