import test from "node:test";
import assert from "node:assert/strict";
import {
  getPracticePapersForGrade,
  hasPracticePapers,
  practicePapersByGrade
} from "../assets/js/data/practice-papers.js";

test("practice-paper collections are intentionally empty for Grades 9 to 12", () => {
  assert.deepEqual(Object.keys(practicePapersByGrade), ["9", "10", "11", "12"]);

  for (const gradeId of Object.keys(practicePapersByGrade)) {
    const papers = getPracticePapersForGrade(gradeId);
    assert.deepEqual(papers, []);
    assert.equal(Object.isFrozen(papers), true);
    assert.equal(hasPracticePapers(gradeId), false);
  }
});

test("unknown grades fall back to the same immutable empty collection", () => {
  const first = getPracticePapersForGrade("8");
  const second = getPracticePapersForGrade(null);
  assert.strictEqual(first, second);
  assert.equal(Object.isFrozen(first), true);
});
