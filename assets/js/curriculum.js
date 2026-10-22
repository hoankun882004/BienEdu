import { getCurriculumForGrade } from "./data/curriculum-by-grade.js?v=8.2";
import { getCalculusSourcePractice } from "./data/calculus-source-practice.js?v=11.2";
import { getDocumentForTopic } from "./data/document-mappings.js?v=12.1";
import { getKnowledgePdfMapping } from "./data/knowledge-pdf-mappings.js?v=12.1";
import {
  CONTENT_STATUS,
  getAvailabilitySummary,
  getSubtopicAvailability,
  getTopicAvailability,
  learningContentRegistry
} from "./data/content-registry.js?v=11.1";
import { getExampleContent } from "./data/example-content.js?v=8.6";
import { getKnowledgeContent } from "./data/knowledge-content.js?v=8.9";
import { getKnowledgeSection } from "./data/knowledge-slides.js?v=8.6";
import { hasGradeContent } from "./data/grade-catalog.js?v=8.2";
import { renderGradeEmptyState } from "./components/grade-empty-state.js?v=8.2";
import { renderKnowledgeSlide } from "./components/knowledge-slide-renderer.js?v=12.0";
import {
  destroyKnowledgePdfViewer,
  mountKnowledgePdfViewer,
  renderKnowledgePdfViewer
} from "./components/pdf-knowledge-viewer.js?v=12.1";
import { filterCurriculum, findExerciseType, findTopic } from "./domain/curriculum-filter.js?v=8.2";
import { generatePracticeSet } from "./domain/exercise-generators.js?v=8.6";
import { createFinalExam, countAnswered, gradeFinalExam } from "./domain/exam-engine.js?v=8.6";
import {
  createLearningProgress,
  getLessonProgress,
  getTopicProgress,
  loadLearningProgress,
  markExampleViewed,
  markKnowledgePdfSegmentViewed,
  markKnowledgeViewed,
  recordPracticeAnswer,
  resetExam,
  saveExamAnswer,
  saveLearningProgress,
  submitExam
} from "./domain/learning-progress.js?v=8.2";
import { createLessonSlides, createLessonState, getSectionPosition, selectLessonSlide } from "./domain/lesson-workspace.js?v=8.6";
import { initializeMotion, prefersReducedMotion } from "./motion.js?v=8.2";

const PRACTICE_SEED = "PRACTICE_V1";
const FINAL_EXAM_ID = "final";
const LESSON_SECTION_IDS = new Set(["knowledge", "example", "practice"]);
const app = document.querySelector("[data-curriculum-app]");
const currentGradeId = document.body.dataset.grade ?? null;
const { groups: curriculumGroups, meta: curriculumMeta } = getCurriculumForGrade(currentGradeId);
const filterState = { query: "", groupId: "all" };
const availabilitySummary = getAvailabilitySummary();
const knowledgeCounts = Object.fromEntries(
  Object.values(learningContentRegistry.topics).flatMap((topic) =>
    Object.values(topic.subtopics).map((subtopic) => {
      const pdfMapping = getKnowledgePdfMapping(subtopic.code);
      return [subtopic.code, {
      knowledge: pdfMapping?.verified ? 1 : (subtopic.sections.knowledge.count ?? 0),
      examples: subtopic.sections.examples.count ?? 0,
      practice: subtopic.sections.practice.count ?? 0,
      available: subtopic.status !== CONTENT_STATUS.COMING_SOON,
      materialStatus: subtopic.status,
      validUnitIds: {
        knowledge: subtopic.sections.knowledge.units.map((unit) => unit.id),
        knowledgePdfSegments: pdfMapping?.regions.map((region) => region.id) ?? null,
        examples: subtopic.sections.examples.units.map((unit) => unit.id),
        practice: subtopic.sections.practice.count ? generatePracticeSet(subtopic.code, PRACTICE_SEED).map((question) => question.id) : []
      }
    }];
    })
  )
);
let progressState = currentGradeId
  ? loadLearningProgress(globalThis.localStorage, currentGradeId)
  : createLearningProgress();
let confirmExamSubmit = false;
let lessonTransitionLock = false;
let lastRenderedRoute = null;
const presentationState = { active: false, previousFocus: null };

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

function hasStructuredLessons(topic) {
  return topic.exerciseTypes.every((item) => {
    const record = getSubtopicAvailability(item.code);
    return record?.sections.knowledge.status === CONTENT_STATUS.AVAILABLE;
  });
}

function statusPresentation(status) {
  if (status === CONTENT_STATUS.AVAILABLE) return { className: "is-ready", label: "Bài học sẵn sàng" };
  if (status === CONTENT_STATUS.PARTIAL) return { className: "is-partial", label: "Có nội dung một phần" };
  if (status === CONTENT_STATUS.NEEDS_REVIEW) return { className: "is-review", label: "Đang kiểm tra nguồn" };
  return { className: "is-pending", label: "Đang bổ sung" };
}

function sourceStatusMarkup(record) {
  if (!record || record.sourceCoverage === "none") return "";
  const isReview = record.verificationStatus === "needs-review";
  const coverageLabel = record.sourceCoverage === "complete" ? "Nguồn đã kiểm kê đủ" : "Nguồn chưa nhập đủ";
  const verificationLabel = isReview ? "Có đáp số cần rà soát" : "Nội dung đã xác minh";
  return `<span class="source-status${isReview ? " is-review" : ""}"><span>${coverageLabel}</span><span>${verificationLabel}</span></span>`;
}

function sourcePageHref(source, page = source.pageStart) {
  return `${source.filePath}#page=${page}`;
}

function getPrintedSourcePage(source, pdfPage) {
  return pdfPage - (source.pageStart - source.printedPageStart);
}

function renderGroupOptions() {
  return `<option value="all" ${filterState.groupId === "all" ? "selected" : ""}>Tất cả nhóm kiến thức</option>${curriculumGroups.map((group) => `<option value="${group.id}" ${filterState.groupId === group.id ? "selected" : ""}>${group.id} · ${escapeHtml(sentenceCase(group.name))} (${group.topics.length})</option>`).join("")}`;
}

function renderTopicRow(topic) {
  const availability = getTopicAvailability(topic.id);
  const presentation = statusPresentation(availability?.status);
  const topicProgress = availability?.status !== CONTENT_STATUS.COMING_SOON
    ? getTopicProgress(progressState, topic, knowledgeCounts)
    : null;
  return `<a class="roadmap-topic ${presentation.className}" href="${routeUrl({ topicId: topic.id })}" data-route>
    <span class="roadmap-topic__code">${topic.id}</span>
    <span class="roadmap-topic__name"><strong>${escapeHtml(topic.title)}</strong><small>${escapeHtml(topic.groupName)}</small></span>
    <span class="roadmap-topic__state">${presentation.label}</span>
    <span class="roadmap-topic__meta">${topicProgress ? `${topicProgress.completedLessons}/${topicProgress.availableLessons} bài khả dụng` : `${topic.exerciseTypes.length} dạng bài`}</span>
    <span class="roadmap-topic__arrow" aria-hidden="true">→</span>
  </a>`;
}

function renderCatalog() {
  const topics = filterCurriculum(curriculumGroups, filterState);
  document.body.classList.remove("learning-mode");
  app.innerHTML = `<section class="roadmap-view" aria-labelledby="roadmap-title">
    <header class="roadmap-intro"><p class="roadmap-intro__eyebrow">Chương trình Toán 12</p><h1 id="roadmap-title">Lộ trình Toán 12</h1><p>Đủ ${curriculumMeta.topicCount} chuyên đề và ${curriculumMeta.exerciseTypeCount} dạng bài từ catalog gốc. Hiện có ${availabilitySummary.topics.available} chuyên đề với bài học đã kiểm chứng; các mục còn lại hiển thị đúng trạng thái cập nhật.</p></header>
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
  const availability = getTopicAvailability(topic.id);
  const supported = availability?.status !== CONTENT_STATUS.COMING_SOON
    && Object.values(availability.subtopics).some((item) => item.sections.knowledge.count);
  const presentation = statusPresentation(availability?.status);
  const topicProgress = supported ? getTopicProgress(progressState, topic, knowledgeCounts) : null;
  document.body.classList.remove("learning-mode");
  app.innerHTML = `<section class="topic-detail" aria-labelledby="topic-detail-title">
    <a class="back-link" href="documents.html" data-route>← Lộ trình</a>
    <header class="topic-detail__header"><span>${topic.id}</span><div><h1 id="topic-detail-title">${escapeHtml(topic.title)}</h1><p>${topic.exerciseTypes.length} dạng bài${source ? ` · Tài liệu trang ${source.printedPageStart}–${source.printedPageEnd}` : ""}</p><small class="topic-availability ${presentation.className}">${presentation.label}</small>${sourceStatusMarkup(availability)}</div></header>
    ${topicProgress ? `<div class="topic-progress"><div><span>Tiến độ nội dung khả dụng</span><strong>${topicProgress.completedLessons}/${topicProgress.availableLessons} bài</strong></div><progress value="${topicProgress.completedLessons}" max="${Math.max(topicProgress.availableLessons, 1)}">${topicProgress.percent}%</progress></div>` : ""}
    ${source && !supported ? `<section class="topic-source-card" aria-labelledby="topic-source-title">
      <div><p>Tài liệu nguồn đã tải lên</p><h2 id="topic-source-title">${escapeHtml(source.fileName)}</h2><span>PDF ${source.pageCount} trang · Phần ${topic.id} ở trang in ${source.printedPageStart}–${source.printedPageEnd}</span></div>
      <a class="button button--small" href="${sourcePageHref(source)}" target="_blank" rel="noopener noreferrer">Mở tài liệu PDF →</a>
    </section>` : ""}
    <nav class="type-list" aria-label="Các dạng bài của ${escapeHtml(topic.title)}">
      ${topic.exerciseTypes.map((exercise) => {
        const section = getKnowledgeSection(exercise.code);
        const content = getSubtopicAvailability(exercise.code);
        const sourcePage = source?.exercisePages[exercise.code];
        const counts = knowledgeCounts[exercise.code] ?? {};
        const isAvailable = Boolean(section && content?.sections.knowledge.count);
        const lessonProgress = isAvailable ? getLessonProgress(progressState, exercise.code, counts.knowledge, counts.examples, counts.practice, content.status) : null;
        const href = isAvailable
          ? routeUrl({ topicId: topic.id, typeCode: exercise.code, section: "knowledge", item: 1 })
          : routeUrl({ topicId: topic.id, typeCode: exercise.code, section: "knowledge", item: 1 });
        const linkAttributes = "data-route";
        const subtopicPresentation = statusPresentation(content?.status);
        const stateLabel = lessonProgress
          ? (lessonProgress.isComplete ? "✓ Hoàn thành" : `${lessonProgress.percent}% · ${subtopicPresentation.label}`)
          : sourcePage
            ? `Nguồn trang ${getPrintedSourcePage(source, sourcePage)} · ${subtopicPresentation.label}`
            : subtopicPresentation.label;
        return `<a href="${href}" ${linkAttributes} class="${lessonProgress?.isComplete ? "is-complete" : ""} ${subtopicPresentation.className}">
          <span>${escapeHtml(exercise.code)}</span><strong>${escapeHtml(exercise.title)}</strong>
          <small>${stateLabel}</small><b aria-hidden="true">→</b>
        </a>`;
      }).join("")}
    </nav>
    ${availability?.status === CONTENT_STATUS.AVAILABLE ? `<section class="final-exam-card ${topicProgress.isComplete ? "is-unlocked" : "is-locked"}">
      <div><p>Bài kiểm tra cuối chuyên đề</p><h2>20 câu · Bao quát ${topic.exerciseTypes.length} dạng</h2><span>${topicProgress.isComplete ? "Bạn đã mở khóa bài kiểm tra." : `Hoàn thành ${topicProgress.totalLessons - topicProgress.completedLessons} bài còn lại để mở khóa.`}</span></div>
      ${topicProgress.isComplete ? `<a class="button button--small" href="${routeUrl({ topicId: topic.id, exam: FINAL_EXAM_ID, question: 1 })}" data-route>Bắt đầu kiểm tra →</a>` : `<span class="exam-lock" aria-label="Đang khóa">🔒</span>`}
    </section>` : ""}
  </section>`;
  initializeMotion();
}

function renderUnavailable(topic, exercise) {
  document.body.classList.remove("learning-mode");
  const availability = getSubtopicAvailability(exercise.code);
  const presentation = statusPresentation(availability?.status);
  app.innerHTML = `<section class="topic-detail lesson-unavailable" aria-labelledby="unavailable-title">
    <a class="back-link" href="${routeUrl({ topicId: topic.id })}" data-route>← ${topic.id}</a>
    <p class="lesson-kicker">${escapeHtml(exercise.code)} · Toán 12</p>
    <h1 id="unavailable-title">${escapeHtml(exercise.title)}</h1>
    <span class="topic-availability ${presentation.className}">${presentation.label}</span>
    <div class="lesson-unavailable__message"><h2>Tài liệu kiến thức đang được cập nhật.</h2><p>BienEdu chưa có mapping PDF đã kiểm chứng cho dạng này. Tiến độ của bạn không bị tính cho nội dung chưa có nguồn chính xác.</p></div>
    <div class="lesson-unavailable__actions"><a class="button" href="${routeUrl({ topicId: topic.id })}" data-route>Quay lại chuyên đề</a><a class="text-button" href="documents.html?grade=12" data-route>Chọn chuyên đề khác →</a></div>
  </section>`;
  initializeMotion();
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

function sourceBadgeMarkup(topic, pages) {
  const source = getDocumentForTopic(topic.id);
  if (!source || !pages?.length) return "";
  const firstPage = pages[0];
  return `<a class="source-reference" href="${sourcePageHref(source, firstPage)}" target="_blank" rel="noopener noreferrer">Nguồn · Trang ${pages.join("–")} · Xem PDF gốc</a>`;
}

function renderKnowledgeReading(slide, position, exercise, topic) {
  return renderKnowledgeSlide({
    slide,
    position,
    exercise,
    sourceMarkup: sourceBadgeMarkup(topic, slide.sourcePages)
  });
}

function renderExampleReading(slide, position, exercise, topic) {
  const example = slide.workedExample;
  return `<article class="example-reader" aria-labelledby="lesson-content-title">
    <header class="example-reader__bar">
      <p><span aria-hidden="true">ƒ</span> Ví dụ minh họa</p>
      <div><span>Ví dụ ${position.current}/${position.total}</span>${sourceBadgeMarkup(topic, example.sourcePages)}</div>
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

function renderSourcePractice(slide, topic) {
  const exercise = slide.sourceExercise;
  const review = exercise.verification !== "verified";
  return `<article class="source-practice-stage${review ? " is-review" : ""}" aria-labelledby="lesson-content-title">
    <header>
      <div><p class="lesson-kicker">Bài nguồn ${exercise.number} · ${exercise.type === "essay" ? "Tự luận" : "Trả lời ngắn"}</p><h2 id="lesson-content-title">${escapeHtml(exercise.prompt)}</h2></div>
      ${sourceBadgeMarkup(topic, exercise.sourcePages)}
    </header>
    <section class="source-practice-stage__status" aria-label="Trạng thái chấm bài">
      <span aria-hidden="true">${review ? "!" : "✓"}</span>
      <div><strong>${review ? "Đáp số nguồn cần rà soát" : "Có đáp số trong tài liệu"}</strong><p>Bài này không tham gia chấm điểm tự động; bài luyện sinh thuật toán vẫn được giữ riêng.</p></div>
    </section>
    <details class="source-practice-stage__answer">
      <summary>Xem đáp số nguồn</summary>
      <div><strong>Đáp số</strong><p>${escapeHtml(exercise.answerKey)}</p>${exercise.auditNote ? `<aside><b>Ghi chú kiểm toán</b><p>${escapeHtml(exercise.auditNote)}</p></aside>` : ""}</div>
    </details>
  </article>`;
}

function createLessonView(topic, exercise, route) {
  const knowledge = getKnowledgeSection(exercise.code);
  const knowledgePdfMapping = getKnowledgePdfMapping(exercise.code);
  const contentRecord = getSubtopicAvailability(exercise.code);
  const reading = getKnowledgeContent(exercise.code);
  const examples = getExampleContent(exercise.code);
  const knowledgeSlideCount = knowledgePdfMapping?.verified ? 1 : (contentRecord?.sections.knowledge.count ?? 0);
  const exampleSlideCount = contentRecord?.sections.examples.count ?? 0;
  const questions = contentRecord?.sections.practice.status === CONTENT_STATUS.AVAILABLE
    ? generatePracticeSet(exercise.code, PRACTICE_SEED)
    : [];
  const sourceExercises = getCalculusSourcePractice(exercise.code);
  const slides = createLessonSlides({ topic, exercise, knowledgeSection: knowledge, knowledgePdfMapping, contentRecord, reading, examples, questions, sourceExercises });
  const state = createLessonState(slides, route.section, route.item);
  const active = slides[state.currentIndex];

  if (active.kind === "knowledge") persist(markKnowledgeViewed(progressState, exercise.code, active.id));
  if (active.kind === "example") persist(markExampleViewed(progressState, exercise.code, active.id));

  const lessonProgress = getLessonProgress(
    progressState,
    exercise.code,
    knowledgeSlideCount,
    exampleSlideCount,
    questions.length,
    contentRecord?.status ?? CONTENT_STATUS.COMING_SOON,
    {
      knowledge: contentRecord?.sections.knowledge.units.map((unit) => unit.id) ?? [],
      knowledgePdfSegments: knowledgePdfMapping?.regions.map((region) => region.id) ?? null,
      examples: contentRecord?.sections.examples.units.map((unit) => unit.id) ?? [],
      practice: questions.map((question) => question.id)
    }
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
    counts: {
      knowledge: knowledgeSlideCount,
      knowledgePdfSegments: knowledgePdfMapping?.regions.length ?? 0,
      example: exampleSlideCount,
      practice: questions.length,
      sourcePractice: sourceExercises.length
    },
    contentRecord,
    knowledgePdfMapping,
    viewedPdfSegments: progressState.lessons[exercise.code]?.knowledgePdfProgress?.viewedSegments ?? []
  };
}

function lessonProgressMarkup(view) {
  const { lessonProgress, contentRecord } = view;
  const sourceLabel = contentRecord.sourceCoverage === "complete" ? "Nguồn đủ" : "Nguồn chưa đủ";
  const verificationLabel = contentRecord.verificationStatus === "needs-review" ? "Có đáp số cần rà soát" : "Đã xác minh";
  return `<span><b>Tiến độ bài học</b><strong>${lessonProgress.percent}%</strong></span>
    <progress value="${lessonProgress.completed}" max="${lessonProgress.total}">${lessonProgress.percent}%</progress>
    <small>${lessonProgress.completed}/${lessonProgress.total} nội dung khả dụng · ${sourceLabel} · ${verificationLabel}</small>`;
}

function phaseButtonMarkup(view, section, label, completed, total) {
  return `<button type="button" data-section="${section}" aria-current="${view.active.section === section ? "step" : "false"}" ${total ? "" : "disabled"}>
    <span>${label}</span><small>${total ? `${completed}/${total}` : "Đang cập nhật"}</small>
  </button>`;
}

function phaseNavigationMarkup(view) {
  const { counts, lessonProgress } = view;
  const knowledgeCompleted = counts.knowledgePdfSegments ? lessonProgress.viewedPdfSegments : lessonProgress.viewed;
  const knowledgeTotal = counts.knowledgePdfSegments || counts.knowledge;
  return `${phaseButtonMarkup(view, "knowledge", "Kiến thức", knowledgeCompleted, knowledgeTotal)}
    ${phaseButtonMarkup(view, "example", "Ví dụ", lessonProgress.examplesViewed, counts.example)}
    ${phaseButtonMarkup(view, "practice", "Bài tập", lessonProgress.answered, counts.practice)}`;
}

function lessonSidebarMarkup(view) {
  const { active, counts, lessonProgress, topic } = view;
  const pdfProgress = counts.knowledgePdfSegments
    ? `${lessonProgress.viewedPdfSegments}/${counts.knowledgePdfSegments} vùng PDF`
    : `${lessonProgress.viewed}/${counts.knowledge} bài đọc`;
  return `<p>Nội dung buổi học</p><ol>
    <li><button type="button" data-section="knowledge" aria-current="${active.section === "knowledge" ? "step" : "false"}" class="${counts.knowledge && lessonProgress.viewed === counts.knowledge ? "is-completed" : ""}" ${counts.knowledge ? "" : "disabled"}><span>${counts.knowledge && lessonProgress.viewed === counts.knowledge ? "✓" : "1"}</span><b>Kiến thức<small>${counts.knowledge ? pdfProgress : "Đang cập nhật"}</small></b></button></li>
    <li><button type="button" data-section="example" aria-current="${active.section === "example" ? "step" : "false"}" class="${counts.example && lessonProgress.examplesViewed === counts.example ? "is-completed" : ""}" ${counts.example ? "" : "disabled"}><span>${counts.example && lessonProgress.examplesViewed === counts.example ? "✓" : "2"}</span><b>Ví dụ<small>${counts.example ? `${lessonProgress.examplesViewed}/${counts.example} ví dụ` : "Đang cập nhật"}</small></b></button></li>
    <li><button type="button" data-section="practice" aria-current="${active.section === "practice" ? "step" : "false"}" class="${counts.practice && lessonProgress.answered === counts.practice ? "is-completed" : ""}" ${counts.practice ? "" : "disabled"}><span>${counts.practice && lessonProgress.answered === counts.practice ? "✓" : "3"}</span><b>Bài tập<small>${counts.practice ? `${lessonProgress.answered}/${counts.practice} câu chấm · ${counts.sourcePractice} bài nguồn` : "Đang cập nhật"}</small></b></button></li>
  </ol><a href="${routeUrl({ topicId: topic.id })}" data-route>← ${topic.id}</a>`;
}

function presentationToolbarMarkup(view) {
  const { exercise, position, active } = view;
  const modeLabel = active.kind === "knowledge-pdf" ? "PDF gốc" : "Kiến thức";
  return `<header class="knowledge-presentation-toolbar" aria-label="Thanh công cụ trình chiếu">
    <div class="knowledge-presentation-toolbar__brand"><strong>BIENEDU</strong><span>${escapeHtml(exercise.code)} · ${escapeHtml(exercise.title)}</span></div>
    <p><span>${modeLabel}</span><strong>${String(position.current).padStart(2, "0")} / ${String(position.total).padStart(2, "0")}</strong></p>
    <button type="button" data-action="exit-presentation" aria-label="Thoát trình chiếu"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 8l8 8M16 8l-8 8"/></svg><span>Thoát</span></button>
  </header>`;
}

function lessonStageMarkup(view) {
  const { active, answer, position, topic, exercise } = view;
  if (active.kind === "practice") return renderPractice(active, answer);
  if (active.kind === "source-practice") return renderSourcePractice(active, topic);
  if (active.kind === "knowledge-pdf") return renderKnowledgePdfViewer({
    mapping: view.knowledgePdfMapping,
    exercise,
    viewedSegments: view.viewedPdfSegments
  });
  if (active.kind === "knowledge" && active.reading) return renderKnowledgeReading(active, position, exercise, topic);
  if (active.kind === "example" && active.workedExample) return renderExampleReading(active, position, exercise, topic);
  return renderSourceSlide(active, position, topic, exercise);
}

function lessonNavigationMarkup(view) {
  const { active, position, state, topic, exercise, slides } = view;
  const positionLabel = active.kind === "source-practice"
    ? `Bài nguồn ${active.sourceIndex + 1} / ${view.counts.sourcePractice}`
    : active.section === "practice"
      ? `Bài ${position.current} / ${view.counts.practice}`
    : `${position.current} / ${position.total}`;
  const pagePicker = active.section === "knowledge" && position.total > 1
    ? `<nav class="lesson-page-picker" aria-label="Chọn slide kiến thức">${Array.from({ length: position.total }, (_item, index) => `<a href="${routeUrl({ topicId: topic.id, typeCode: exercise.code, section: "knowledge", item: index + 1 })}" data-route aria-label="Slide ${index + 1}" aria-current="${position.current === index + 1 ? "page" : "false"}">${index + 1}</a>`).join("")}</nav>`
    : "";
  const positionControl = `<div class="lesson-navigation__position"><p><strong>${positionLabel}</strong><span>${active.label}</span></p>${pagePicker}</div>`;

  if (presentationState.active && active.section === "knowledge") {
    const knowledgeSlides = slides.filter((slide) => slide.section === "knowledge");
    const currentKnowledgeIndex = knowledgeSlides.findIndex((slide) => slide.id === active.id);
    const previousSlide = knowledgeSlides[currentKnowledgeIndex - 1];
    const nextSlide = knowledgeSlides[currentKnowledgeIndex + 1];
    const previousIndex = previousSlide ? slides.findIndex((slide) => slide.id === previousSlide.id) : -1;
    const nextIndex = nextSlide ? slides.findIndex((slide) => slide.id === nextSlide.id) : -1;
    return `<button type="button" data-slide-index="${previousIndex}" aria-keyshortcuts="ArrowLeft" ${previousSlide ? "" : "disabled"}>← Trước</button>
      ${positionControl}
      <button class="nav-button nav-button--primary" type="button" data-slide-index="${nextIndex}" aria-keyshortcuts="ArrowRight Space" ${nextSlide ? "" : "disabled"}>Tiếp theo →</button>`;
  }

  const nextSlide = slides[state.currentIndex + 1] ?? null;
  let nextControl = `<a class="nav-button nav-button--primary" href="${routeUrl({ topicId: topic.id })}" data-route aria-keyshortcuts="ArrowRight">Hoàn thành →</a>`;
  if (nextSlide) {
    const nextLabel = nextSlide.section === "example"
      ? "Xem ví dụ →"
      : nextSlide.kind === "source-practice"
        ? (active.kind === "source-practice" ? "Bài nguồn tiếp theo →" : "Xem bài từ PDF →")
        : nextSlide.section === "practice"
          ? (active.section === "practice" ? "Câu tiếp theo →" : "Làm bài tập →")
        : "Tiếp theo →";
    nextControl = `<button class="nav-button nav-button--primary" type="button" data-slide-index="${state.currentIndex + 1}" aria-keyshortcuts="ArrowRight">${nextLabel}</button>`;
  }

  return `<button type="button" data-slide-index="${state.currentIndex - 1}" aria-keyshortcuts="ArrowLeft" ${state.currentIndex === 0 ? "disabled" : ""}>← Trước</button>
    ${positionControl}${nextControl}`;
}

function updateLessonProgressChrome(workspace, view) {
  workspace.querySelector("[data-lesson-progress]").innerHTML = lessonProgressMarkup(view);
  workspace.querySelector("[data-phase-navigation]").innerHTML = phaseNavigationMarkup(view);
  workspace.querySelector("[data-lesson-sidebar]").innerHTML = lessonSidebarMarkup(view);
}

function activateKnowledgePdfViewer(workspace, view) {
  if (view.active.kind !== "knowledge-pdf") {
    destroyKnowledgePdfViewer();
    return;
  }
  mountKnowledgePdfViewer({
    root: workspace,
    mapping: view.knowledgePdfMapping,
    viewedSegments: view.viewedPdfSegments,
    onSegmentViewed(segmentId, validSegmentIds) {
      persist(markKnowledgePdfSegmentViewed(
        progressState,
        view.exercise.code,
        segmentId,
        validSegmentIds
      ));
      const refreshedView = createLessonView(view.topic, view.exercise, readRoute());
      updateLessonProgressChrome(workspace, refreshedView);
    }
  });
}

function updateLessonWorkspace(view, { announce = false } = {}) {
  const workspace = app.querySelector(`.learning-workspace[data-topic="${view.topic.id}"][data-type="${view.exercise.code}"]`);
  if (!workspace) return false;

  destroyKnowledgePdfViewer();
  updateLessonProgressChrome(workspace, view);
  workspace.querySelector("[data-lesson-stage]").innerHTML = lessonStageMarkup(view);
  workspace.querySelector("[data-lesson-navigation]").innerHTML = lessonNavigationMarkup(view);
  workspace.querySelector("[data-presentation-toolbar]").innerHTML = presentationToolbarMarkup(view);
  workspace.dataset.section = view.active.section;
  workspace.dataset.item = String(view.position.current);
  activateKnowledgePdfViewer(workspace, view);

  if (announce) {
    workspace.querySelector("[data-lesson-announcer]").textContent = `Đã chuyển sang ${view.active.label} ${view.position.current} trên ${view.position.total}.`;
  }
  return true;
}

function renderWorkspace(topic, exercise, route, options = {}) {
  const knowledge = getKnowledgeSection(exercise.code);
  if (!knowledge && !getKnowledgePdfMapping(exercise.code)) return renderUnavailable(topic, exercise);
  const view = createLessonView(topic, exercise, route);
  document.body.classList.add("learning-mode");

  if (updateLessonWorkspace(view, options)) return;

  app.innerHTML = `<article class="learning-workspace" aria-labelledby="lesson-title" data-topic="${topic.id}" data-type="${exercise.code}" data-section="${view.active.section}" data-item="${view.position.current}">
    <div data-presentation-toolbar>${presentationToolbarMarkup(view)}</div>
    <header class="workspace-top"><div class="workspace-heading"><a href="${routeUrl({ topicId: topic.id })}" data-route aria-label="Quay lại ${topic.id}">←</a><div><h1 id="lesson-title">${escapeHtml(exercise.title)}</h1><p>${topic.id} · ${escapeHtml(topic.title)}</p></div></div>
      <div class="lesson-progress" data-lesson-progress>${lessonProgressMarkup(view)}</div>
    </header>
    <nav class="workspace-phase-nav" data-phase-navigation aria-label="Các phần của bài học">${phaseNavigationMarkup(view)}</nav>
    <div class="workspace-frame"><nav class="lesson-sidebar" data-lesson-sidebar aria-label="Nội dung bài học">${lessonSidebarMarkup(view)}</nav>
      <main class="lesson-content lesson-stage" tabindex="-1" data-lesson-content data-lesson-stage>${lessonStageMarkup(view)}</main>
    </div>
    <footer class="lesson-navigation" data-lesson-navigation aria-label="Điều hướng bài học bằng nút hoặc phím mũi tên trái và phải">${lessonNavigationMarkup(view)}</footer>
    <p class="sr-only" aria-live="polite" aria-atomic="true" data-lesson-announcer></p>
  </article>`;
  activateKnowledgePdfViewer(app.querySelector(".learning-workspace"), view);
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
    <footer class="lesson-navigation" data-lesson-navigation aria-label="Điều hướng câu hỏi bằng nút hoặc phím mũi tên trái và phải"><a class="nav-button ${index === 0 ? "is-disabled" : ""}" href="${routeUrl({ topicId: topic.id, exam: FINAL_EXAM_ID, question: Math.max(1, index) })}" data-route aria-keyshortcuts="ArrowLeft" ${index === 0 ? 'aria-disabled="true" tabindex="-1"' : ""}>← Trước</a><p><strong>${index + 1} / 20</strong><span>${exam.submitted ? "Xem lời giải" : "Bài kiểm tra"}</span></p>${index < 19 ? `<a class="nav-button nav-button--primary" href="${routeUrl({ topicId: topic.id, exam: FINAL_EXAM_ID, question: index + 2 })}" data-route aria-keyshortcuts="ArrowRight">Tiếp theo →</a>` : exam.submitted ? `<a class="nav-button nav-button--primary" href="${routeUrl({ topicId: topic.id })}" data-route>Về chuyên đề</a>` : `<button type="button" data-action="request-submit" ${answered < 20 ? "disabled" : ""}>Nộp bài</button>`}</footer>
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

  if (presentationState.active && (route.section !== "knowledge" || !route.typeCode || route.exam)) {
    void exitPresentation();
  }
  destroyKnowledgePdfViewer();

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

function deactivatePresentation({ restoreFocus = true } = {}) {
  const workspace = app.querySelector(".learning-workspace");
  presentationState.active = false;
  document.body.classList.remove("presentation-mode");
  workspace?.classList.remove("is-presenting");
  workspace?.removeAttribute("data-fullscreen-fallback");
  if (restoreFocus && presentationState.previousFocus instanceof HTMLElement && presentationState.previousFocus.isConnected) {
    presentationState.previousFocus.focus({ preventScroll: true });
  }
  presentationState.previousFocus = null;
}

async function enterPresentation(trigger) {
  const workspace = app.querySelector('.learning-workspace[data-section="knowledge"]');
  if (!workspace || presentationState.active) return;

  presentationState.active = true;
  presentationState.previousFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;
  document.body.classList.add("presentation-mode");
  workspace.classList.add("is-presenting");
  const route = readRoute();
  const topic = findTopic(curriculumGroups, route.topicId);
  const exercise = topic ? findExerciseType(curriculumGroups, topic.id, route.typeCode) : null;
  if (topic && exercise) updateLessonWorkspace(createLessonView(topic, exercise, route));
  workspace.querySelector('[data-action="exit-presentation"]')?.focus({ preventScroll: true });

  if (typeof workspace.requestFullscreen === "function" && !document.fullscreenElement) {
    try {
      await workspace.requestFullscreen();
    } catch {
      workspace.dataset.fullscreenFallback = "true";
    }
  } else {
    workspace.dataset.fullscreenFallback = "true";
  }
}

async function exitPresentation({ fullscreenAlreadyExited = false } = {}) {
  if (!presentationState.active) return;
  deactivatePresentation({ restoreFocus: false });
  if (!fullscreenAlreadyExited && document.fullscreenElement && typeof document.exitFullscreen === "function") {
    try {
      await document.exitFullscreen();
    } catch {
      // The fixed expanded layout has already been removed, so no recovery is required.
    }
  }
  app.querySelector('[data-action="enter-presentation"]')?.focus({ preventScroll: true });
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
  const contentRecord = getSubtopicAvailability(route.typeCode);
  return createLessonSlides({
    topic: findTopic(curriculumGroups, route.topicId),
    exercise: findExerciseType(curriculumGroups, route.topicId, route.typeCode),
    knowledgeSection: getKnowledgeSection(route.typeCode),
    knowledgePdfMapping: getKnowledgePdfMapping(route.typeCode),
    contentRecord,
    reading: getKnowledgeContent(route.typeCode),
    examples: getExampleContent(route.typeCode),
    questions: contentRecord?.sections.practice.status === CONTENT_STATUS.AVAILABLE
      ? generatePracticeSet(route.typeCode, PRACTICE_SEED)
      : [],
    sourceExercises: getCalculusSourcePractice(route.typeCode)
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

function getAdjacentLessonUrl(direction) {
  const route = readRoute();
  if (!route.topicId) return null;

  if (route.exam === FINAL_EXAM_ID) {
    const targetQuestion = route.question + direction;
    return targetQuestion >= 1 && targetQuestion <= 20
      ? routeUrl({ topicId: route.topicId, exam: FINAL_EXAM_ID, question: targetQuestion })
      : null;
  }

  if (!route.typeCode) return null;

  const slides = createSlidesForRoute(route);
  const currentState = createLessonState(slides, route.section, route.item);
  if (presentationState.active) {
    const knowledgeSlides = slides.filter((slide) => slide.section === "knowledge");
    const currentSlide = slides[currentState.currentIndex];
    const currentKnowledgeIndex = knowledgeSlides.findIndex((slide) => slide.id === currentSlide.id);
    const targetSlide = knowledgeSlides[currentKnowledgeIndex + direction];
    if (!targetSlide) return null;
    return routeUrl({
      topicId: route.topicId,
      typeCode: route.typeCode,
      section: "knowledge",
      item: knowledgeSlides.findIndex((slide) => slide.id === targetSlide.id) + 1
    });
  }
  const targetIndex = currentState.currentIndex + direction;

  if (targetIndex < 0) return null;
  if (targetIndex >= slides.length) return direction > 0 ? routeUrl({ topicId: route.topicId }) : null;

  const activeSlide = slides[targetIndex];
  const position = getSectionPosition(slides, targetIndex);
  return routeUrl({
    topicId: route.topicId,
    typeCode: route.typeCode,
    section: activeSlide.section,
    item: position.current
  });
}

function isTypingTarget(target) {
  return target instanceof Element && Boolean(target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="listbox"], [role="menu"], [role="slider"], [role="spinbutton"], [role="tablist"], [role="grid"], [data-practice-answer], [data-exam-answer]'));
}

function isSpaceControl(target) {
  return target instanceof Element && Boolean(target.closest('button, a, summary, input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="textbox"]'));
}

function handleLessonKeyboardNavigation(event) {
  if (presentationState.active && event.key === "Escape") {
    event.preventDefault();
    void exitPresentation();
    return;
  }

  const isSpace = event.key === " " || event.key === "Spacebar";
  if (!["ArrowLeft", "ArrowRight"].includes(event.key) && !(presentationState.active && isSpace)) return;
  if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (lessonTransitionLock || isTypingTarget(event.target) || (isSpace && isSpaceControl(event.target))) return;
  if (!app.querySelector(".learning-workspace [data-lesson-navigation]")) return;

  if (presentationState.active && app.querySelector("[data-pdf-viewer]")) {
    const action = event.key === "ArrowLeft" ? "previous" : "next";
    const control = app.querySelector(`[data-pdf-action="${action}"]`);
    if (!control?.disabled) {
      event.preventDefault();
      control.click();
    }
    return;
  }

  const href = getAdjacentLessonUrl(event.key === "ArrowLeft" ? -1 : 1);
  if (!href) return;
  event.preventDefault();
  navigate(href);
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
  if (action === "enter-presentation") {
    void enterPresentation(event.target.closest("[data-action]"));
    return;
  }
  if (action === "exit-presentation") {
    void exitPresentation();
    return;
  }
  if (action) handleExamAction(action);
}

function handleFullscreenChange() {
  if (presentationState.active && !document.fullscreenElement) {
    void exitPresentation({ fullscreenAlreadyExited: true });
  }
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
  addEventListener("keydown", handleLessonKeyboardNavigation);
  addEventListener("popstate", handleHistoryNavigation);
  document.addEventListener("fullscreenchange", handleFullscreenChange);
  renderRoute({ scrollToTop: true });
}

initializeCurriculumApp();
