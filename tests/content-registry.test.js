import test from "node:test";
import assert from "node:assert/strict";

import { curriculumTopics, exerciseTypes } from "../assets/js/data/curriculum.js";
import {
  CONTENT_STATUS,
  getAvailabilitySummary,
  getSubtopicAvailability,
  getTopicAvailability,
  learningContentRegistry
} from "../assets/js/data/content-registry.js";

test("content registry covers every declared topic and subtopic without a second curriculum model", () => {
  assert.equal(Object.keys(learningContentRegistry.topics).length, 39);
  assert.equal(
    Object.values(learningContentRegistry.topics).flatMap((topic) => Object.values(topic.subtopics)).length,
    347
  );
  assert.deepEqual(Object.keys(learningContentRegistry.topics), curriculumTopics.map((topic) => topic.id));
  assert.deepEqual(
    Object.values(learningContentRegistry.topics).flatMap((topic) => Object.keys(topic.subtopics)),
    exerciseTypes.map((exercise) => exercise.code)
  );
});

test("availability is derived from verified content instead of topic number", () => {
  const summary = getAvailabilitySummary();
  assert.equal(summary.topics.available, 2);
  assert.equal(summary.topics.partial, 3);
  assert.equal(summary.topics["coming-soon"], 34);
  assert.equal(getTopicAvailability("CD12").status, CONTENT_STATUS.PARTIAL);
  assert.equal(getTopicAvailability("CD20").status, CONTENT_STATUS.AVAILABLE);
  assert.equal(getTopicAvailability("CD22").status, CONTENT_STATUS.COMING_SOON);
  assert.equal(getTopicAvailability("CD01").status, CONTENT_STATUS.COMING_SOON);
});

test("section availability and source coverage remain independent", () => {
  const calculus = getSubtopicAvailability("12.1");
  const probability = getSubtopicAvailability("20.1");
  const unavailable = getSubtopicAvailability("1.1");

  assert.equal(calculus.sections.knowledge.status, CONTENT_STATUS.AVAILABLE);
  assert.equal(calculus.sections.examples.status, CONTENT_STATUS.AVAILABLE);
  assert.equal(calculus.sections.practice.status, CONTENT_STATUS.AVAILABLE);
  assert.equal(calculus.sourceCoverage, "complete");
  assert.equal(calculus.sections.practice.sourceCount, 10);
  assert.equal(calculus.sections.practice.sourceAnswerKeyCount, 10);
  assert.equal(calculus.sections.practice.sourceAutoGradableCount, 0);
  assert.equal(calculus.sections.practice.readySourceCount, 10);
  assert.equal(calculus.sections.practice.readyGeneratedCount, 0);
  assert.equal(calculus.sections.practice.count, 10);
  assert.equal(probability.sections.practice.readyGeneratedCount, 3);
  assert.equal(probability.sourceCoverage, "complete");
  assert.equal(unavailable.sections.knowledge.status, CONTENT_STATUS.COMING_SOON);
});

test("source completeness and mathematical verification are reported independently", () => {
  const verified = getSubtopicAvailability("12.1");
  const review = getSubtopicAvailability("12.3");

  assert.equal(verified.sourceCoverage, "complete");
  assert.equal(verified.verificationStatus, "verified");
  assert.equal(review.sourceCoverage, "complete");
  assert.equal(review.verificationStatus, "needs-review");
  assert.equal(review.sections.practice.needsReviewCount, 10);
  assert.equal(review.sections.practice.count, 0);
  assert.equal(review.sections.practice.status, CONTENT_STATUS.COMING_SOON);
});

test("imported slides have stable unique IDs and verified source references", () => {
  const ids = [];
  for (const topic of Object.values(learningContentRegistry.topics)) {
    for (const subtopic of Object.values(topic.subtopics)) {
      for (const sectionName of ["knowledge", "examples"]) {
        for (const unit of subtopic.sections[sectionName].units) {
          ids.push(unit.id);
          assert.ok(unit.source.documentId);
          assert.ok(unit.source.pages.length > 0);
          assert.equal(unit.verification, "verified");
        }
      }
    }
  }
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes("12.1-knowledge-1"));
  assert.ok(ids.includes("12.1-knowledge-2"));
});
