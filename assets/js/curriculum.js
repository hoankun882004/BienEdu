import { getCurriculumForGrade } from "./data/curriculum-by-grade.js?v=8.2";
import { getDocumentForTopic } from "./data/document-mappings.js?v=8.2";
import { getExampleContent } from "./data/example-content.js?v=8.2";
import { getKnowledgeContent } from "./data/knowledge-content.js?v=8.2";
import { getKnowledgeSection, knowledgeSections } from "./data/knowledge-slides.js?v=8.2";
import { hasGradeContent } from "./data/grade-catalog.js?v=8.2";
import { renderGradeEmptyState } from "./components/grade-empty-state.js?v=8.2";
import { filterCurriculum, findExerciseType, findTopic } from "./domain/curriculum-filter.js?v=8.2";
import { generatePracticeSet } from "./domain/exercise-generators.js?v=8.2";
import { createFinalExam, countAnswered, gradeFinalExam } from "./domain/exam-engine.js?v=8.2";
import {
  createLearningProgress,
  getLessonProgress,
  getTopicProgress,
  loadLearningProgress,
  markExampleViewed,
  markKnowledgeViewed,
  recordPracticeAnswer,
  resetExam,
  saveExamAnswer,
  saveLearningProgress,
  submitExam
} from "./domain/learning-progress.js?v=8.2";
import { createLessonSlides, createLessonState, getSectionPosition, selectLessonSlide } from "./domain/lesson-workspace.js?v=8.2";
import { initializeMotion, prefersReducedMotion } from "./motion.js?v=8.2";

const PRACTICE_SEED = "PRACTICE_V1";
const FINAL_EXAM_ID = "final";
const LESSON_SECTION_IDS = new Set(["knowledge", "example", "practice"]);
const app = document.querySelector("[data-curriculum-app]");
const currentGradeId = document.body.dataset.grade ?? null;
const { groups: curriculumGroups, meta: curriculumMeta } = getCurriculumForGrade(currentGradeId);
const filterState = { query: "", groupId: "all" };
const knowledgeCounts = Object.fromEntries(
  Object.entries(knowledgeSections).map(([code, section]) => [code, {
    knowledge: getKnowledgeContent(code) ? 1 : section.knowledgeSlides.length,
    examples: getExampleContent(code)?.length ?? section.exampleSlides.length
  }])
);
let progressState = currentGradeId
  ? loadLearningProgress(globalThis.localStorage, currentGradeId)
  : createLearningProgress();
let confirmExamSubmit = false;
let lessonTransitionLock = false;
let lastRenderedRoute = null;

function resetRouteScroll() {
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function routeUrl({ topicId = "", typeCode = "", section = "", item = "", exam = "", question = "" } = {}) {
  const parameters = new URLSearchParams();
  if (currentGradeId) parameters.set("grade", currentGradeId);
  if (topicId) parameters.set("topic", topicId);
  if (typeCode) parameters.set("type", typeCode);
  if (section) parameters.set("section", section);
  if (item) parameters.set("item", item);
  if (exam) parameters.set("exam", exam);
  if (question) parameters.set("question", question);
  const query = parameters.toString();
  return `documents.html${query ? `?${query}` : ""}`;
}

function readRoute(url = location.href) {
  const parameters = new URL(url, location.href).searchParams;
  const requestedSection = parameters.get("section");
  return {
    topicId: parameters.get("topic")?.toUpperCase() || "",
    typeCode: parameters.get("type") || "",
    section: LESSON_SECTION_IDS.has(requestedSection) ? requestedSection : "knowledge",
    item: Math.max(1, Number(parameters.get("item")) || 1),
    exam: parameters.get("exam") || "",
    question: Math.max(1, Number(parameters.get("question")) || 1)
  };
}

function persist(next) {
  progressState = saveLearningProgress(next, globalThis.localStorage, currentGradeId ?? "12");
}

function sentenceCase(value) {
  const lower = String(value).toLocaleLowerCase("vi");
  return lower.charAt(0).toLocaleUpperCase("vi") + lower.slice(1);
}

function renderGroupOptions() {
  return `<option value="all" ${filterState.groupId === "all" ? "selected" : ""}>Tất cả nhóm kiến thức</option>${curriculumGroups.map((group) => `<option value="${group.id}" ${filterState.groupId === group.id ? "selected" : ""}>${group.id} · ${escapeHtml(sentenceCase(group.name))} (${group.topics.length})</option>`).join("")}`;
}

function renderTopicRow(topic) {
  const source = getDocumentForTopic(topic.id);
  const topicProgress = source ? getTopicProgress(progressState, topic, knowledgeCounts) : null;
  return `<a class="roadmap-topic ${source ? "is-ready" : "is-pending"}" href="${routeUrl({ topicId: topic.id })}" data-route>
    <span class="roadmap-topic__code">${topic.id}</span>
    <span class="roadmap-topic__name"><strong>${escapeHtml(topic.title)}</strong><small>${escapeHtml(topic.groupName)}</small></span>
    <span class="roadmap-topic__state">${source ? "Bài học sẵn sàng" : "Đang bổ sung"}</span>
    <span class="roadmap-topic__meta">${topicProgress ? `${topicProgress.completedLessons}/${topicProgress.totalLessons} hoàn thành` : `${topic.exerciseTypes.length} dạng bài`}</span>
    <span class="roadmap-topic__arrow" aria-hidden="true">→</span>
  </a>`;
}

function renderCatalog() {
  const topics = filterCurriculum(curriculumGroups, filterState);
  document.body.classList.remove("learning-mode");
  app.innerHTML = `<section class="roadmap-view" aria-labelledby="roadmap-title">
    <header class="roadmap-intro"><p class="roadmap-intro__eyebrow">Chương trình Toán 12</p><h1 id="roadmap-title">Lộ trình Toán 12</h1><p>Danh mục có đủ ${curriculumMeta.topicCount} chuyên đề từ catalog gốc. CD20–CD21 hiện đã có bài đọc, ví dụ và bài luyện tập.</p></header>
    <div class="roadmap-toolbar" data-ui>
      <label class="roadmap-field roadmap-field--group"><span>Nhóm kiến thức</span><select data-curriculum-group>${renderGroupOptions()}</select><small>${curriculumMeta.groupCount} nhóm trong chương trình</small></label>
      <label class="roadmap-field roadmap-field--search"><span>Tìm chuyên đề</span><input type="search" data-curriculum-search value="${escapeHtml(filterState.query)}" placeholder="Mã, chuyên đề hoặc dạng bài" autocomplete="off"></label>
      <button class="text-button roadmap-clear" type="button" data-clear-filters ${!filterState.query && filterState.groupId === "all" ? "hidden" : ""}>Xóa lọc</button>
      <p class="roadmap-status" data-curriculum-status aria-live="polite"><span>Đang hiển thị</span> <strong>${topics.length} chuyên đề</strong></p>
    </div>
    <div class="roadmap-list">${topics.length ? topics.map(renderTopicRow).join("") : `<section class="roadmap-empty"><h2>Không tìm thấy chuyên đề</h2><p>Thử từ khóa khác hoặc xóa bộ lọc.</p></section>`}</div>
  </section>`;
  initializeMotion();
}

function renderTopicDetail(topic) {
  const source = getDocumentForTopic(topic.id);
  const supported = Boolean(source && topic.exerciseTypes.every((item) => getKnowledgeSection(item.code)));
  const topicProgress = supported ? getTopicProgress(progressState, topic, knowledgeCounts) : null;
  document.body.classList.remove("learning-mode");
  app.innerHTML = `<section class="topic-detail" aria-labelledby="topic-detail-title">
    <a class="back-link" href="documents.html" data-route>← Lộ trình</a>
    <header class="topic-detail__header"><span>${topic.id}</span><div><h1 id="topic-detail-title">${escapeHtml(topic.title)}</h1><p>${topic.exerciseTypes.length} dạng bài${source ? ` · Tài liệu trang ${source.printedPageStart}–${source.printedPageEnd}` : ""}</p></div></header>
    ${topicProgress ? `<div class="topic-progress"><div><span>Tiến độ chuyên đề</span><strong>${topicProgress.completedLessons}/${topicProgress.totalLessons} bài</strong></div><progress value="${topicProgress.completedLessons}" max="${topicProgress.totalLessons}">${topicProgress.percent}%</progress></div>` : ""}
    <nav class="type-list" aria-label="Các dạng bài của ${escapeHtml(topic.title)}">
      ${topic.exerciseTypes.map((exercise) => {
        const section = getKnowledgeSection(exercise.code);
        const lessonProgress = section ? getLessonProgress(progressState, exercise.code, getKnowledgeContent(exercise.code) ? 1 : section.knowledgeSlides.length, getExampleContent(exercise.code)?.length ?? section.exampleSlides.length) : null;
        return `<a href="${routeUrl({ topicId: topic.id, typeCode: exercise.code, section: "knowledge", item: 1 })}" data-route class="${lessonProgress?.isComplete ? "is-complete" : ""} ${section ? "is-ready" : "is-pending"}">
          <span>${escapeHtml(exercise.code)}</span><strong>${escapeHtml(exercise.title)}</strong>
          <small>${lessonProgress ? (lessonProgress.isComplete ? "✓ Hoàn thành" : `${lessonProgress.percent}% · Kiến thức + Bài tập`) : "Bài học đang được biên soạn"}</small><b aria-hidden="true">→</b>
        </a>`;
      }).join("")}
    </nav>
    ${supported ? `<section class="final-exam-card ${topicProgress.isComplete ? "is-unlocked" : "is-locked"}">
      <div><p>Bài kiểm tra cuối chuyên đề</p><h2>20 câu · Bao quát ${topic.exerciseTypes.length} dạng</h2><span>${topicProgress.isComplete ? "Bạn đã mở khóa bài kiểm tra." : `Hoàn thành ${topicProgress.totalLessons - topicProgress.completedLessons} bài còn lại để mở khóa.`}</span></div>
      ${topicProgress.isComplete ? `<a class="button button--small" href="${routeUrl({ topicId: topic.id, exam: FINAL_EXAM_ID, question: 1 })}" data-route>Bắt đầu kiểm tra →</a>` : `<span class="exam-lock" aria-label="Đang khóa">🔒</span>`}
    </section>` : ""}
  </section>`;
  initializeMotion();
}

function renderUnavailable(topic, exercise) {
  document.body.classList.remove("learning-mode");
  app.innerHTML = `<section class="topic-detail lesson-unavailable"><a class="back-link" href="${routeUrl({ topicId: topic.id })}" data-route>← ${topic.id}</a><h1>${escapeHtml(exercise.title)}</h1><p>Nội dung chi tiết đang được bổ sung.</p></section>`;
}

function renderSourceSlide(slide, position, topic, exercise) {
  const isExample = slide.kind === "example";
  const pager = !isExample && position.total > 1 ? `<nav class="source-slide-pager" aria-label="Chọn trang kiến thức">
    ${Array.from({ length: position.total }, (_item, index) => `<a href="${routeUrl({ topicId: topic.id, typeCode: exercise.code, section: "knowledge", item: index + 1 })}" data-route aria-current="${position.current === index + 1 ? "page" : "false"}">${index + 1}</a>`).join("")}
  </nav>` : "";
  return `<section class="knowledge-stage ${isExample ? "example-stage" : ""}" aria-labelledby="lesson-content-title">
    <header><div><p class="lesson-kicker">${isExample ? "Ví dụ" : "Kiến thức"} · ${position.current}/${position.total}</p><h2 id="lesson-content-title">${isExample ? "Ví dụ từ tài liệu" : "Nội dung chính"}</h2></div><span>Nguồn · Trang ${slide.sourcePages.join("–")}</span></header>
    <div class="knowledge-stage__canvas"><img src="${slide.src}" alt="${isExample ? "Ví dụ" : "Kiến thức"} ${escapeHtml(slide.title)}, phần ${position.current}" draggable="false"></div>${pager}
  </section>`;
}

function renderKnowledgeReading(slide, exercise) {
  const reading = slide.reading;
  const readMinutes = Math.max(2, Math.ceil((reading.lead.length + reading.formulae.reduce((total, item) => total + item.detail.length, 0) + reading.points.reduce((total, item) => total + item.text.length, 0)) / 550));
  return `<article class="knowledge-reader" aria-labelledby="lesson-content-title">
    <header class="knowledge-reader__bar">
      <p><span aria-hidden="true">¶</span> Bài đọc trọng tâm</p>
      <div><span>${readMinutes} phút đọc</span><span>Nguồn · Trang ${slide.sourcePages.join("–")}</span></div>
    </header>
    <div class="knowledge-reader__content">
      <section class="knowledge-reader__lead">
        <p class="lesson-kicker">${escapeHtml(exercise.code)} · Kiến thức cốt lõi</p>
        <h2 id="lesson-content-title">${escapeHtml(exercise.title)}</h2>
        <p>${escapeHtml(reading.lead)}</p>
      </section>
      <section class="knowledge-reader__formulae" aria-labelledby="formula-title">
        <h3 id="formula-title">Công thức & nguyên tắc</h3>
        <dl>${reading.formulae.map((item) => `<div><dt>${escapeHtml(item.label)}</dt><dd><strong>${escapeHtml(item.value)}</strong><span>${escapeHtml(item.detail)}</span></dd></div>`).join("")}</dl>
      </section>
      <section class="knowledge-reader__points" aria-labelledby="points-title">
        <h3 id="points-title">Cách hiểu nhanh</h3>
        <ol>${reading.points.map((item) => `<li><span>${escapeHtml(item.label)}</span><p>${escapeHtml(item.text)}</p></li>`).join("")}</ol>
      </section>
      <aside class="knowledge-reader__note knowledge-reader__note--${reading.note.tone}" aria-label="${escapeHtml(reading.note.label)}">
        <span aria-hidden="true">${reading.note.tone === "warning" ? "!" : "✓"}</span>
        <p><strong>${escapeHtml(reading.note.label)}</strong>${escapeHtml(reading.note.text)}</p>
      </aside>
    </div>
  </article>`;
}

function renderExampleReading(slide, position, exercise) {
  const example = slide.workedExample;
  return `<article class="example-reader" aria-labelledby="lesson-content-title">
    <header class="example-reader__bar">
      <p><span aria-hidden="true">ƒ</span> Ví dụ minh họa</p>
      <div><span>Ví dụ ${position.current}/${position.total}</span><span>Nguồn · Trang ${example.sourcePages.join("–")}</span></div>
    </header>
    <div class="example-reader__content">
      <header class="example-reader__intro">
        <p class="lesson-kicker">${escapeHtml(exercise.code)} · Áp dụng từng bước</p>
        <h2 id="lesson-content-title">${escapeHtml(example.title)}</h2>
        <div class="example-reader__question" aria-label="Đề bài">
          <span aria-hidden="true"><b>?</b><small>Đề bài</small></span>
          <p>${escapeHtml(example.prompt)}</p>
        </div>
      </header>
      <div class="example-reader__columns">
        <div class="example-reader__track">
          <section class="example-reader__analysis" aria-labelledby="analysis-title">
            <h3 id="analysis-title">Phân tích đề</h3>
            <ul>${example.analysis.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          </section>
          <section class="example-reader__result" aria-label="Đáp số">
            <span>Đáp số</span><strong>${escapeHtml(example.answer)}</strong>
          </section>
        </div>
        <div class="example-reader__track">
          <section class="example-reader__solution" aria-labelledby="solution-title">
            <h3 id="solution-title">Lời giải từng bước</h3>
            <ol>${example.steps.map((step, index) => `<li><span>${String(index + 1).padStart(2, "0")}</span><div><p>${escapeHtml(step.label)}</p><strong>${escapeHtml(step.expression)}</strong><small>${escapeHtml(step.text)}</small></div></li>`).join("")}</ol>
          </section>
          <aside class="example-reader__takeaway" aria-label="Điểm cần nhớ"><span aria-hidden="true">→</span><b>Điểm cần nhớ</b><p>${escapeHtml(example.takeaway)}</p></aside>
        </div>
      </div>
    </div>
  </article>`;
}

function renderPractice(slide, answer) {
  const question = slide.question;
  const answered = Boolean(answer);
  const feedback = answered ? `<div class="practice-feedback ${answer.correct ? "is-correct" : "is-wrong"}" role="status"><strong>${answer.correct ? "Chính xác" : "Chưa đúng"}</strong><p>Đáp án đúng: ${escapeHtml(question.options[question.correctIndex])}</p><div><b>Lời giải</b><p>${escapeHtml(question.solution)}</p></div></div>` : "";
  return `<section class="practice-stage" aria-labelledby="lesson-content-title">
    <header><p class="lesson-kicker">Bài ${slide.index + 1} · Trắc nghiệm</p><h2 id="lesson-content-title">${escapeHtml(question.prompt)}</h2></header>
    <div class="practice-options" role="group" aria-label="Các phương án">
      ${question.options.map((option, index) => `<button type="button" data-practice-answer="${index}" ${answered ? "disabled" : ""} class="${answered && index === question.correctIndex ? "is-correct" : ""} ${answered && index === answer.selectedIndex && !answer.correct ? "is-wrong" : ""}"><span>${String.fromCharCode(65 + index)}</span>${escapeHtml(option)}</button>`).join("")}
    </div>${feedback}
  </section>`;
}

function createLessonView(topic, exercise, route) {
  const knowledge = getKnowledgeSection(exercise.code);
  const reading = getKnowledgeContent(exercise.code);
  const examples = getExampleContent(exercise.code);
  const knowledgeSlideCount = reading ? 1 : knowledge.knowledgeSlides.length;
  const exampleSlideCount = examples?.length ?? knowledge.exampleSlides.length;
  const questions = generatePracticeSet(exercise.code, PRACTICE_SEED);
  const slides = createLessonSlides({ topic, exercise, knowledgeSection: knowledge, reading, examples, questions });
  const state = createLessonState(slides, route.section, route.item);
  const active = slides[state.currentIndex];

  if (active.kind === "knowledge") persist(markKnowledgeViewed(progressState, exercise.code, active.id));
  if (active.kind === "example") persist(markExampleViewed(progressState, exercise.code, active.id));

  const lessonProgress = getLessonProgress(
    progressState,
    exercise.code,
    knowledgeSlideCount,
    exampleSlideCount,
    questions.length
  );
  const position = getSectionPosition(slides, state.currentIndex);
  const storedLesson = progressState.lessons[exercise.code] ?? { practiceAnswers: {} };
  const answer = active.kind === "practice" ? storedLesson.practiceAnswers[active.question.id] : null;

  return {
    topic,
    exercise,
    slides,
    state,
    active,
    answer,
    position,
    lessonProgress,
    counts: { knowledge: knowledgeSlideCount, example: exampleSlideCount, practice: questions.length }
  };
}

function lessonProgressMarkup(view) {
  const { lessonProgress } = view;
  return `<span><b>Tiến độ bài học</b><strong>${lessonProgress.percent}%</strong></span>
    <progress value="${lessonProgress.completed}" max="${lessonProgress.total}">${lessonProgress.percent}%</progress>
    <small>${lessonProgress.completed}/${lessonProgress.total} nội dung</small>`;
}

function phaseButtonMarkup(view, section, label, completed, total) {
  return `<button type="button" data-section="${section}" aria-current="${view.active.section === section ? "step" : "false"}">
    <span>${label}</span><small>${completed}/${total}</small>
  </button>`;
}

function phaseNavigationMarkup(view) {
  const { counts, lessonProgress } = view;
  return `${phaseButtonMarkup(view, "knowledge", "Kiến thức", lessonProgress.viewed, counts.knowledge)}
    ${phaseButtonMarkup(view, "example", "Ví dụ", lessonProgress.examplesViewed, counts.example)}
    ${phaseButtonMarkup(view, "practice", "Bài tập", lessonProgress.answered, counts.practice)}`;
}

function lessonSidebarMarkup(view) {
  const { active, counts, lessonProgress, topic } = view;
  return `<p>Nội dung buổi học</p><ol>
    <li><button type="button" data-section="knowledge" aria-current="${active.section === "knowledge" ? "step" : "false"}" class="${lessonProgress.viewed === counts.knowledge ? "is-completed" : ""}"><span>${lessonProgress.viewed === counts.knowledge ? "✓" : "1"}</span><b>Kiến thức<small>${lessonProgress.viewed}/${counts.knowledge} bài đọc</small></b></button></li>
    <li><button type="button" data-section="example" aria-current="${active.section === "example" ? "step" : "false"}" class="${lessonProgress.examplesViewed === counts.example ? "is-completed" : ""}"><span>${lessonProgress.examplesViewed === counts.example ? "✓" : "2"}</span><b>Ví dụ<small>${lessonProgress.examplesViewed}/${counts.example} ví dụ</small></b></button></li>
    <li><button type="button" data-section="practice" aria-current="${active.section === "practice" ? "step" : "false"}" class="${lessonProgress.answered === counts.practice ? "is-completed" : ""}"><span>${lessonProgress.answered === counts.practice ? "✓" : "3"}</span><b>Bài tập<small>${lessonProgress.answered}/${counts.practice} câu</small></b></button></li>
  </ol><a href="${routeUrl({ topicId: topic.id })}" data-route>← ${topic.id}</a>`;
}

function lessonStageMarkup(view) {
  const { active, answer, position, topic, exercise } = view;
  if (active.kind === "practice") return renderPractice(active, answer);
  if (active.kind === "knowledge" && active.reading) return renderKnowledgeReading(active, exercise);
  if (active.kind === "example" && active.workedExample) return renderExampleReading(active, position, exercise);
  return renderSourceSlide(active, position, topic, exercise);
}

function lessonNavigationMarkup(view) {
  const { active, position, state, topic, exercise } = view;
  const positionLabel = active.section === "practice"
    ? `Bài ${position.current} / ${position.total}`
    : `${position.current} / ${position.total}`;
  const nextControl = active.section === "practice" && position.current === position.total
    ? `<a class="nav-button nav-button--primary" href="${routeUrl({ topicId: topic.id })}" data-route>Hoàn thành →</a>`
    : active.section === "knowledge" && position.current === position.total
      ? `<a class="nav-button nav-button--primary" href="${routeUrl({ topicId: topic.id, typeCode: exercise.code, section: "example", item: 1 })}" data-route>Xem ví dụ →</a>`
      : `<button type="button" data-slide-index="${state.currentIndex + 1}">${active.section === "example" && position.current === position.total ? "Làm bài tập →" : active.section === "practice" ? "Câu tiếp theo →" : "Tiếp theo →"}</button>`;

  return `<button type="button" data-slide-index="${state.currentIndex - 1}" ${state.currentIndex === 0 ? "disabled" : ""}>← Trước</button>
    <p><strong>${positionLabel}</strong><span>${active.label}</span></p>${nextControl}`;
}

function updateLessonWorkspace(view, { announce = false } = {}) {
  const workspace = app.querySelector(`.learning-workspace[data-topic="${view.topic.id}"][data-type="${view.exercise.code}"]`);
  if (!workspace) return false;

  workspace.querySelector("[data-lesson-progress]").innerHTML = lessonProgressMarkup(view);
  workspace.querySelector("[data-phase-navigation]").innerHTML = phaseNavigationMarkup(view);
  workspace.querySelector("[data-lesson-sidebar]").innerHTML = lessonSidebarMarkup(view);
  workspace.querySelector("[data-lesson-stage]").innerHTML = lessonStageMarkup(view);
  workspace.querySelector("[data-lesson-navigation]").innerHTML = lessonNavigationMarkup(view);
  workspace.dataset.section = view.active.section;
  workspace.dataset.item = String(view.position.current);

  if (announce) {
    workspace.querySelector("[data-lesson-announcer]").textContent = `Đã chuyển sang ${view.active.label} ${view.position.current} trên ${view.position.total}.`;
  }
  return true;
}

function renderWorkspace(topic, exercise, route, options = {}) {
  const knowledge = getKnowledgeSection(exercise.code);
  if (!knowledge) return renderUnavailable(topic, exercise);
  const view = createLessonView(topic, exercise, route);
  document.body.classList.add("learning-mode");

  if (updateLessonWorkspace(view, options)) return;

  app.innerHTML = `<article class="learning-workspace" aria-labelledby="lesson-title" data-topic="${topic.id}" data-type="${exercise.code}" data-section="${view.active.section}" data-item="${view.position.current}">
    <header class="workspace-top"><div class="workspace-heading"><a href="${routeUrl({ topicId: topic.id })}" data-route aria-label="Quay lại ${topic.id}">←</a><div><h1 id="lesson-title">${escapeHtml(exercise.title)}</h1><p>${topic.id} · ${escapeHtml(topic.title)}</p></div></div>
      <div class="lesson-progress" data-lesson-progress>${lessonProgressMarkup(view)}</div>
    </header>
    <nav class="workspace-phase-nav" data-phase-navigation aria-label="Các phần của bài học">${phaseNavigationMarkup(view)}</nav>
    <div class="workspace-frame"><nav class="lesson-sidebar" data-lesson-sidebar aria-label="Nội dung bài học">${lessonSidebarMarkup(view)}</nav>
      <main class="lesson-content lesson-stage" tabindex="-1" data-lesson-content data-lesson-stage>${lessonStageMarkup(view)}</main>
    </div>
    <footer class="lesson-navigation" data-lesson-navigation>${lessonNavigationMarkup(view)}</footer>
    <p class="sr-only" aria-live="polite" aria-atomic="true" data-lesson-announcer></p>
  </article>`;
}

function examQuestionMarkup(question, selected, submitted) {
  const result = submitted ? selected === question.correctIndex : null;
  return `<section class="exam-question"><p class="lesson-kicker">Dạng ${escapeHtml(question.sourceTopic)}</p><h2>${escapeHtml(question.prompt)}</h2><div class="practice-options">
    ${question.options.map((option, index) => `<button type="button" data-exam-answer="${index}" ${submitted ? "disabled" : ""} class="${selected === index ? "is-selected" : ""} ${submitted && index === question.correctIndex ? "is-correct" : ""} ${submitted && selected === index && !result ? "is-wrong" : ""}"><span>${String.fromCharCode(65 + index)}</span>${escapeHtml(option)}</button>`).join("")}
    </div>${submitted ? `<div class="practice-feedback ${result ? "is-correct" : "is-wrong"}"><strong>${result ? "Chính xác" : "Cần xem lại"}</strong><p>Đáp án đúng: ${escapeHtml(question.options[question.correctIndex])}</p><div><b>Lời giải chi tiết</b><p>${escapeHtml(question.solution)}</p><a href="${routeUrl({ topicId: question.sourceTopic.startsWith("20.") ? "CD20" : "CD21", typeCode: question.sourceTopic, section: "knowledge", item: 1 })}" data-route>Ôn lại dạng ${question.sourceTopic} →</a></div></div>` : ""}</section>`;
}

function renderFinalExam(topic, route) {
  const topicProgress = getTopicProgress(progressState, topic, knowledgeCounts);
  if (!topicProgress.isComplete) {
    renderTopicDetail(topic);
    return false;
  }
  const questions = createFinalExam(topic.id);
  const index = Math.min(route.question - 1, questions.length - 1);
  const exam = progressState.exams[topic.id] || { answers: {}, submitted: false };
  const answered = countAnswered(questions, exam.answers);
  const question = questions[index];
  const selected = Object.hasOwn(exam.answers, index) ? Number(exam.answers[index]) : null;
  const result = exam.submitted ? (exam.result || gradeFinalExam(questions, exam.answers)) : null;
  document.body.classList.add("learning-mode");
  app.innerHTML = `<article class="learning-workspace exam-workspace" data-topic="${topic.id}">
    <header class="workspace-top"><div class="workspace-heading"><a href="${routeUrl({ topicId: topic.id })}" data-route>←</a><div><h1>Kiểm tra cuối chuyên đề</h1><p>${topic.id} · ${escapeHtml(topic.title)}</p></div></div><div class="lesson-progress"><span><b>${exam.submitted ? "Kết quả" : "Đã trả lời"}</b><strong>${exam.submitted ? `${result.score}/${result.total}` : `${answered}/20`}</strong></span><progress value="${exam.submitted ? result.score : answered}" max="20"></progress><small>${exam.submitted ? `${result.percent}% chính xác` : "Cần trả lời đủ 20 câu"}</small></div></header>
    <div class="exam-frame"><aside class="exam-navigator"><p>${exam.submitted ? "Xem lại bài" : "Danh sách câu"}</p><div>${questions.map((_item, questionIndex) => `<a href="${routeUrl({ topicId: topic.id, exam: FINAL_EXAM_ID, question: questionIndex + 1 })}" data-route class="${questionIndex === index ? "is-current" : ""} ${Object.hasOwn(exam.answers, questionIndex) ? "is-answered" : ""}">${questionIndex + 1}</a>`).join("")}</div>${exam.submitted ? `<button type="button" class="text-button" data-action="reset-exam">Làm lại bài</button>` : ""}</aside>
      <main class="lesson-content exam-content" tabindex="-1" data-lesson-content>${exam.submitted && index === 0 ? `<div class="exam-result"><span>${result.percent}%</span><div><p>Kết quả</p><h2>${result.score}/${result.total} câu đúng</h2><small>Xem từng câu để đọc lời giải và ôn lại bài cần cải thiện.</small></div></div>` : ""}${examQuestionMarkup(question, selected, exam.submitted)}</main></div>
    <footer class="lesson-navigation"><a class="nav-button ${index === 0 ? "is-disabled" : ""}" href="${routeUrl({ topicId: topic.id, exam: FINAL_EXAM_ID, question: Math.max(1, index) })}" data-route>← Trước</a><p><strong>${index + 1} / 20</strong><span>${exam.submitted ? "Xem lời giải" : "Bài kiểm tra"}</span></p>${index < 19 ? `<a class="nav-button nav-button--primary" href="${routeUrl({ topicId: topic.id, exam: FINAL_EXAM_ID, question: index + 2 })}" data-route>Tiếp theo →</a>` : exam.submitted ? `<a class="nav-button nav-button--primary" href="${routeUrl({ topicId: topic.id })}" data-route>Về chuyên đề</a>` : `<button type="button" data-action="request-submit" ${answered < 20 ? "disabled" : ""}>Nộp bài</button>`}</footer>
    ${confirmExamSubmit ? `<div class="exam-confirm" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><div><p class="lesson-kicker">Xác nhận</p><h2 id="confirm-title">Nộp bài kiểm tra?</h2><p>Sau khi nộp, bạn sẽ xem điểm và lời giải chi tiết.</p><div><button type="button" data-action="cancel-submit">Xem lại</button><button type="button" data-action="confirm-submit">Nộp bài</button></div></div></div>` : ""}
  </article>`;
  return true;
}

function setGradeSwitchLocked(locked) {
  const switcher = document.querySelector(".grade-switcher");
  if (!switcher) return;
  switcher.disabled = locked;
  switcher.setAttribute("aria-disabled", String(locked));
  switcher.title = locked ? "Hoàn thành hoặc nộp bài kiểm tra trước khi đổi lớp." : "Đổi khối lớp";
}

function renderRoute({ scrollToTop = false, announce = false } = {}) {
  if (!app) return;
  const route = readRoute();

  if (!currentGradeId) {
    document.body.classList.remove("learning-mode");
    app.innerHTML = "";
    lastRenderedRoute = route;
    return;
  }

  if (!hasGradeContent(currentGradeId, "curriculum")) {
    document.body.classList.remove("learning-mode");
    setGradeSwitchLocked(false);
    app.innerHTML = renderGradeEmptyState("documents", currentGradeId);
    lastRenderedRoute = route;
    if (scrollToTop) resetRouteScroll();
    return;
  }

  const topic = route.topicId ? findTopic(curriculumGroups, route.topicId) : null;
  const exercise = topic && route.typeCode ? findExerciseType(curriculumGroups, topic.id, route.typeCode) : null;

  if (topic && route.exam === FINAL_EXAM_ID) {
    const examIsActive = renderFinalExam(topic, route);
    const exam = progressState.exams[topic.id];
    setGradeSwitchLocked(Boolean(examIsActive && !exam?.submitted));
  } else if (topic && exercise) {
    setGradeSwitchLocked(false);
    renderWorkspace(topic, exercise, route, { announce });
  } else if (topic) {
    setGradeSwitchLocked(false);
    renderTopicDetail(topic);
  } else {
    setGradeSwitchLocked(false);
    renderCatalog();
  }

  lastRenderedRoute = route;
  if (scrollToTop) resetRouteScroll();
}

function isSameLessonRoute(left, right) {
  return Boolean(
    left?.topicId &&
    right?.topicId &&
    left.topicId === right.topicId &&
    left.typeCode &&
    left.typeCode === right.typeCode &&
    !left.exam &&
    !right.exam
  );
}

function waitForTransition(milliseconds) {
  if (prefersReducedMotion()) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function getLessonViewportOffset() {
  const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 0;
  const phaseHeight = app.querySelector(".workspace-phase-nav")?.getBoundingClientRect().height ?? 0;
  return headerHeight + phaseHeight + 12;
}

function revealLessonStage(stage) {
  if (!stage) return;
  const offset = getLessonViewportOffset();
  const stageTop = stage.getBoundingClientRect().top;
  const isStartVisible = stageTop >= offset - 8 && stageTop <= Math.min(innerHeight * 0.52, offset + 180);
  if (isStartVisible) return;

  const targetTop = Math.max(0, scrollY + stageTop - offset);
  window.scrollTo({ top: targetTop, left: 0, behavior: "instant" });
}

async function transitionLessonRoute(href, { replace = false, updateHistory = true } = {}) {
  if (lessonTransitionLock) return;
  lessonTransitionLock = true;

  try {
    const stage = app.querySelector("[data-lesson-stage]");
    if (stage) {
      stage.style.minHeight = `${Math.ceil(stage.getBoundingClientRect().height)}px`;
      stage.classList.add("is-leaving");
    }

    await waitForTransition(110);
    if (updateHistory) {
      if (replace) history.replaceState(null, "", href);
      else history.pushState(null, "", href);
    }

    renderRoute({ announce: true });
    const nextStage = app.querySelector("[data-lesson-stage]");
    revealLessonStage(nextStage);
    nextStage?.classList.remove("is-leaving");
    nextStage?.classList.add("is-entering");

    requestAnimationFrame(() => requestAnimationFrame(() => nextStage?.classList.remove("is-entering")));
    await waitForTransition(210);
    if (nextStage) nextStage.style.minHeight = "";
  } finally {
    lessonTransitionLock = false;
  }
}

function navigate(href, { replace = false } = {}) {
  confirmExamSubmit = false;
  const currentRoute = lastRenderedRoute ?? readRoute();
  const nextRoute = readRoute(href);
  if (isSameLessonRoute(currentRoute, nextRoute)) {
    transitionLessonRoute(href, { replace });
    return;
  }

  if (replace) history.replaceState(null, "", href); else history.pushState(null, "", href);
  renderRoute({ scrollToTop: true });
}

function handleSearchInput(event) {
  if (!event.target.matches("[data-curriculum-search]")) return;

  filterState.query = event.target.value;
  renderCatalog();

  const input = document.querySelector("[data-curriculum-search]");
  input?.focus();
  input?.setSelectionRange(filterState.query.length, filterState.query.length);
}

function handleSelectionChange(event) {
  if (event.target.matches("[data-curriculum-group]")) {
    filterState.groupId = event.target.value;
    renderCatalog();
    return;
  }

  if (event.target.matches("[data-section-select]")) {
    const route = readRoute();
    navigate(routeUrl({
      topicId: route.topicId,
      typeCode: route.typeCode,
      section: event.target.value,
      item: 1
    }));
  }
}

function createSlidesForRoute(route) {
  return createLessonSlides({
    topic: findTopic(curriculumGroups, route.topicId),
    exercise: findExerciseType(curriculumGroups, route.topicId, route.typeCode),
    knowledgeSection: getKnowledgeSection(route.typeCode),
    reading: getKnowledgeContent(route.typeCode),
    examples: getExampleContent(route.typeCode),
    questions: generatePracticeSet(route.typeCode, PRACTICE_SEED)
  });
}

function handleSlideNavigation(slideButton) {
  const route = readRoute();
  const slides = createSlidesForRoute(route);
  const currentState = createLessonState(slides, route.section, route.item);
  const targetState = selectLessonSlide(currentState, Number(slideButton.dataset.slideIndex), slides.length);
  const activeSlide = slides[targetState.currentIndex];
  const position = getSectionPosition(slides, targetState.currentIndex);

  navigate(routeUrl({
    topicId: route.topicId,
    typeCode: route.typeCode,
    section: activeSlide.section,
    item: position.current
  }));
}

function handlePracticeAnswer(practiceButton) {
  const route = readRoute();
  const question = generatePracticeSet(route.typeCode, PRACTICE_SEED)[route.item - 1];
  const nextProgress = recordPracticeAnswer(
    progressState,
    route.typeCode,
    question.id,
    Number(practiceButton.dataset.practiceAnswer),
    question.correctIndex
  );
  persist(nextProgress);
  renderRoute();
}

function handleExamAnswer(examButton) {
  const route = readRoute();
  persist(saveExamAnswer(
    progressState,
    route.topicId,
    route.question - 1,
    Number(examButton.dataset.examAnswer)
  ));
  renderRoute();
}

function handleExamAction(action) {
  if (action === "request-submit" || action === "cancel-submit") {
    confirmExamSubmit = action === "request-submit";
    renderRoute();
    return;
  }

  const route = readRoute();
  if (action === "confirm-submit") {
    const questions = createFinalExam(route.topicId);
    const exam = progressState.exams[route.topicId];
    persist(submitExam(progressState, route.topicId, gradeFinalExam(questions, exam.answers)));
    confirmExamSubmit = false;
    navigate(routeUrl({ topicId: route.topicId, exam: FINAL_EXAM_ID, question: 1 }), { replace: true });
  }

  if (action === "reset-exam") {
    persist(resetExam(progressState, route.topicId));
    navigate(routeUrl({ topicId: route.topicId, exam: FINAL_EXAM_ID, question: 1 }), { replace: true });
  }
}

function handleAppClick(event) {
  if (lessonTransitionLock) {
    if (event.target.closest("[data-route], [data-section], [data-slide-index]")) event.preventDefault();
    return;
  }

  const routeLink = event.target.closest("[data-route]");
  if (routeLink && !routeLink.classList.contains("is-disabled")) {
    event.preventDefault();
    navigate(routeLink.href);
    return;
  }

  if (event.target.closest("[data-clear-filters]")) {
    filterState.query = "";
    filterState.groupId = "all";
    renderCatalog();
    return;
  }

  const sectionButton = event.target.closest("button[data-section]");
  if (sectionButton) {
    const route = readRoute();
    navigate(routeUrl({
      topicId: route.topicId,
      typeCode: route.typeCode,
      section: sectionButton.dataset.section,
      item: 1
    }));
    return;
  }

  const slideButton = event.target.closest("[data-slide-index]");
  if (slideButton) {
    handleSlideNavigation(slideButton);
    return;
  }

  const practiceButton = event.target.closest("[data-practice-answer]");
  if (practiceButton) {
    handlePracticeAnswer(practiceButton);
    return;
  }

  const examButton = event.target.closest("[data-exam-answer]");
  if (examButton) {
    handleExamAnswer(examButton);
    return;
  }

  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action) handleExamAction(action);
}

function handleHistoryNavigation() {
  confirmExamSubmit = false;
  const nextRoute = readRoute();
  if (isSameLessonRoute(lastRenderedRoute, nextRoute)) {
    transitionLessonRoute(location.href, { updateHistory: false });
    return;
  }
  renderRoute({ scrollToTop: true });
}

function initializeCurriculumApp() {
  if (!app) return;
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  app.addEventListener("input", handleSearchInput);
  app.addEventListener("change", handleSelectionChange);
  app.addEventListener("click", handleAppClick);
  addEventListener("popstate", handleHistoryNavigation);
  renderRoute({ scrollToTop: true });
}

initializeCurriculumApp();
