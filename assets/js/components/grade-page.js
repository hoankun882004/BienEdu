import { getGrade, hasGradeContent } from "../data/grade-catalog.js?v=8.3";
import { getCourseForGrade } from "../data/course-by-grade.js?v=8.3";
import { getHomeForGrade } from "../data/home-by-grade.js?v=8.3";
import { buildGradeAwareUrl } from "../domain/grade-context.js?v=8.2";
import { renderGradeEmptyState } from "./grade-empty-state.js?v=8.2";

const home = {
  titleLine: document.querySelector("[data-home-grade-title]"),
  subtitleLine: document.querySelector("[data-home-grade-subtitle]"),
  description: document.querySelector("[data-home-grade-description]"),
  actions: document.querySelector("[data-home-grade-actions]"),
  gradeOverview: document.querySelector("[data-home-grade-empty]"),
  overviewEyebrow: document.querySelector("[data-home-overview-eyebrow]"),
  overviewNumber: document.querySelector("[data-home-overview-number]"),
  overviewTitle: document.querySelector("[data-home-overview-title]"),
  overviewDescription: document.querySelector("[data-home-overview-description]"),
  grade12Sections: [...document.querySelectorAll("[data-grade-12-only]")]
};
const grade12HomeActions = home.actions?.innerHTML ?? "";

function applyHomeGrade(gradeId) {
  const grade = getGrade(gradeId);
  if (!grade || !home.titleLine) return;
  const isGrade12 = grade.id === "12";
  const gradeHome = getHomeForGrade(grade.id);

  home.titleLine.textContent = `Học Toán ${grade.id}`;
  home.subtitleLine.textContent = isGrade12 ? "theo từng phần" : gradeHome.subtitle;
  home.description.textContent = isGrade12
    ? "Ôn lại phần chưa chắc, luyện theo chuyên đề rồi tự kiểm tra bằng lời giải rõ ràng."
    : gradeHome.description;
  home.actions.innerHTML = isGrade12
    ? grade12HomeActions
    : `<a class="button" href="${buildGradeAwareUrl("course.html", grade.id)}">Xem khóa học Toán ${grade.id}</a><button class="text-button" type="button" data-grade-open>Đổi khối lớp</button>`;
  if (gradeHome) {
    home.overviewEyebrow.textContent = `Lộ trình dành cho lớp ${grade.id}`;
    home.overviewNumber.textContent = grade.id.padStart(2, "0");
    home.overviewTitle.textContent = gradeHome.overviewTitle;
    home.overviewDescription.textContent = gradeHome.overviewDescription;
  }
  home.gradeOverview.hidden = isGrade12;
  home.grade12Sections.forEach((section) => { section.hidden = !isGrade12; });
  document.body.classList.toggle("has-updating-grade", !isGrade12);
}

function updatePageMetadata(page, gradeId) {
  const pageNames = { home: "Học Toán", course: "Khóa học Toán", documents: "Lộ trình Toán", quiz: "Kiểm tra Toán" };
  if (pageNames[page]) document.title = `${pageNames[page]} ${gradeId} · BienEdu`;
}

function applyCourseGrade(gradeId) {
  const course = getCourseForGrade(gradeId);
  if (!course) return;

  const title = document.querySelector("[data-course-title]");
  const description = document.querySelector("[data-course-description]");
  const audience = document.querySelector("[data-course-audience]");
  const audienceItems = document.querySelectorAll("[data-course-audience-item]");
  const curriculumLink = document.querySelector("[data-course-curriculum-link]");
  const courseImage = document.querySelector("[data-course-image]");

  if (title) title.textContent = `Khóa học Toán ${gradeId}`;
  if (description) description.textContent = course.heroDescription;
  if (audience) audience.textContent = course.audience;
  audienceItems.forEach((item, index) => {
    item.textContent = course.audienceItems[index] ?? "";
  });
  Object.entries(course.goals).forEach(([goal, copy]) => {
    const element = document.querySelector(`[data-course-goal="${goal}"]`);
    if (element) element.textContent = copy;
  });
  if (curriculumLink) curriculumLink.href = buildGradeAwareUrl("documents.html", gradeId);
  if (courseImage) courseImage.alt = `Sổ ghi chép và bài luyện tập môn Toán ${gradeId}`;

  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) metaDescription.content = `Tổng quan khóa học Toán ${gradeId} BienEdu: ${course.heroDescription}`;
}

export function applyGradePage(page, gradeId) {
  const grade = getGrade(gradeId);
  if (!grade) return;
  document.body.dataset.grade = grade.id;
  updatePageMetadata(page, grade.id);

  if (page === "home") {
    applyHomeGrade(grade.id);
    return;
  }

  if (page === "course") {
    applyCourseGrade(grade.id);
    return;
  }

  if (page === "quiz" && !hasGradeContent(grade.id, page)) {
    document.querySelector("main")?.replaceChildren();
    document.querySelector("main")?.insertAdjacentHTML("afterbegin", renderGradeEmptyState(page, grade.id));
  }
}
