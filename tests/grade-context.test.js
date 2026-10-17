import test from "node:test";
import assert from "node:assert/strict";
import { getCurriculumForGrade } from "../assets/js/data/curriculum-by-grade.js";
import { getQuizForGrade } from "../assets/js/data/quiz-by-grade.js";
import { getCourseForGrade } from "../assets/js/data/course-by-grade.js";
import { hasGradeContent } from "../assets/js/data/grade-catalog.js";
import { getGradeCatalog } from "../assets/js/domain/grade-context.js";
import {
  SELECTED_GRADE_STORAGE_KEY,
  buildGradeAwareUrl,
  getSelectedGrade,
  isGradeEntryUrl,
  resolveCurrentGrade,
  setSelectedGrade
} from "../assets/js/domain/grade-context.js";

function createStorage(entries = []) {
  const values = new Map(entries);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    values
  };
}

test("Grades 9 to 12 have tailored course pages while only Grade 12 exposes curriculum and quiz data", () => {
  const catalog = getGradeCatalog();
  assert.deepEqual(catalog.map(({ id, status }) => ({ id, status })), [
    { id: "9", status: "updating" },
    { id: "10", status: "updating" },
    { id: "11", status: "updating" },
    { id: "12", status: "active" }
  ]);
  for (const gradeId of ["9", "10", "11", "12"]) {
    assert.equal(hasGradeContent(gradeId, "course"), true);
    assert.match(getCourseForGrade(gradeId).audience, new RegExp(`lớp ${gradeId}`));
    assert.equal(getCourseForGrade(gradeId).audienceItems.length, 3);
  }
  assert.match(getCourseForGrade("9").heroDescription, /lớp 10/);
  assert.match(getCourseForGrade("10").heroDescription, /nền tảng Toán THPT/);
  assert.match(getCourseForGrade("11").heroDescription, /lớp 12/);
  assert.equal(getCurriculumForGrade("9").groups.length, 0);
  assert.equal(getCurriculumForGrade("10").groups.length, 0);
  assert.equal(getCurriculumForGrade("11").groups.length, 0);
  assert.ok(getCurriculumForGrade("12").groups.length > 0);
  assert.equal(getQuizForGrade("10").length, 0);
  assert.equal(getQuizForGrade("9").length, 0);
  assert.ok(getQuizForGrade("12").length > 0);
});

test("grade selection persists and an explicit URL takes priority", () => {
  const storage = createStorage();
  assert.equal(resolveCurrentGrade({ url: "https://bienedu.test/", storage }).gradeId, null);
  assert.equal(setSelectedGrade("11", storage), "11");
  assert.equal(getSelectedGrade(storage), "11");

  const resolved = resolveCurrentGrade({ url: "https://bienedu.test/course.html?grade=12", storage });
  assert.deepEqual(resolved, { gradeId: "12", source: "url" });
  assert.equal(storage.values.get(SELECTED_GRADE_STORAGE_KEY), "12");
});

test("the root URL remains the grade entry screen even when a grade was stored", () => {
  const storage = createStorage([[SELECTED_GRADE_STORAGE_KEY, "12"]]);
  assert.equal(isGradeEntryUrl("https://bienedu.test/"), true);
  assert.equal(isGradeEntryUrl("https://bienedu.test/index.html"), true);
  assert.equal(isGradeEntryUrl("https://bienedu.test/?grade=12"), false);
  assert.equal(resolveCurrentGrade({ url: "https://bienedu.test/", storage }).gradeId, "12");
});

test("legacy Grade 12 learning links remain compatible", () => {
  const storage = createStorage();
  const resolved = resolveCurrentGrade({
    url: "https://bienedu.test/documents.html?topic=CD20&type=20.1&section=example&item=2",
    storage
  });
  assert.deepEqual(resolved, { gradeId: "12", source: "legacy-route" });
});

test("grade-aware links preserve Grade 12 routes and strip them for unavailable grades", () => {
  const href = "documents.html?topic=CD20&type=20.1&section=practice&item=2";
  assert.equal(
    buildGradeAwareUrl(href, "12", "https://bienedu.test/"),
    "/documents.html?topic=CD20&type=20.1&section=practice&item=2&grade=12"
  );
  assert.equal(
    buildGradeAwareUrl(href, "10", "https://bienedu.test/"),
    "/documents.html?grade=10"
  );
});
