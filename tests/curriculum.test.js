import test from "node:test";
import assert from "node:assert/strict";
import { curriculumGroups, curriculumMeta, curriculumTopics, exerciseTypes } from "../assets/js/data/curriculum.js";
import { filterCurriculum, findExerciseType, normalizeVietnamese } from "../assets/js/domain/curriculum-filter.js";

test("curriculum preserves 13 groups, 39 topics and the finalized PDF overlay", () => {
  assert.equal(curriculumGroups.length, 13);
  assert.equal(curriculumTopics.length, 39);
  assert.equal(exerciseTypes.length, 361);
  assert.equal(curriculumMeta.groupCount, 13);
  assert.equal(curriculumMeta.topicCount, 39);
  assert.equal(curriculumMeta.exerciseTypeCount, 361);
});

test("topic and short-code identifiers are complete and unique", () => {
  const expectedTopicIds = "CD01 CD02 CD03 CD04 CD05 CD06 CD07 CD08 CD09 CD10 CD11 CD12 CD13 CD14 CD15 CD16 CD17 CD18 CD19 CD20 CD21 CD22 CD23 CD24 CD25 CD26 CD27 CD28 CD29 CD30 CD31 CD32 CD33 CD34 CD35 CD36 CD37 CD38 CD39".split(" ");
  assert.deepEqual(curriculumTopics.map((topic) => topic.id), expectedTopicIds);
  assert.equal(new Set(exerciseTypes.map((exercise) => exercise.id)).size, 361);
  assert.ok(curriculumTopics.every((topic) => topic.title && topic.exerciseTypes.length));
  assert.ok(exerciseTypes.every((exercise) => exercise.title && exercise.code));
});

test("exercise identifiers remain strings instead of floating-point values", () => {
  const exercise = exerciseTypes.find((item) => item.id === "CD01-10");
  assert.equal(exercise.code, "1.10");
});

test("search is case-insensitive and accent-insensitive", () => {
  assert.equal(normalizeVietnamese("ĐẠO HÀM"), "dao ham");
  const byTopic = filterCurriculum(curriculumGroups, { query: "dao ham va ung dung co ban" });
  assert.ok(byTopic.some((topic) => topic.id === "CD01"));
  const byExercise = filterCurriculum(curriculumGroups, { query: "ham da thuc" });
  assert.ok(byExercise.some((topic) => topic.id === "CD01"));
});

test("group filtering keeps only topics in the selected group", () => {
  const groupA = filterCurriculum(curriculumGroups, { groupId: "A" });
  assert.ok(groupA.length > 0);
  assert.ok(groupA.every((topic) => topic.groupId === "A"));
});

test("topic exercise lookup accepts both source id and short code", () => {
  assert.equal(findExerciseType(curriculumGroups, "CD20", "20.1")?.title, "Quy tắc cộng");
  assert.equal(findExerciseType(curriculumGroups, "CD20", "CD20-01")?.code, "20.1");
  assert.equal(findExerciseType(curriculumGroups, "CD99", "99.1"), null);
});
