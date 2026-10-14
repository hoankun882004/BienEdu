import { curriculumGroups, curriculumMeta } from "./data/curriculum.js?v=6.1";
import { getDocumentForTopic } from "./data/document-mappings.js?v=6.1";
import { getKnowledgeSection, knowledgeSections } from "./data/knowledge-slides.js?v=6.1";
import { filterCurriculum, findExerciseType, findTopic } from "./domain/curriculum-filter.js?v=6.1";
import { generatePracticeSet } from "./domain/exercise-generators.js?v=6.1";
import { createFinalExam, countAnswered, gradeFinalExam } from "./domain/exam-engine.js?v=6.1";
import {
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
} from "./domain/learning-progress.js?v=6.1";
import { createLessonSlides, createLessonState, getNextSlide, getPreviousSlide, getSectionPosition, selectLessonSlide } from "./domain/lesson-workspace.js?v=6.1";
import { initializeMotion } from "./motion.js?v=6.1";

const app = document.querySelector("[data-curriculum-app]");
const filterState = { query: "", groupId: "all" };
const knowledgeCounts = Object.fromEntries(Object.entries(knowledgeSections).map(([code, section]) => [code, { knowledge: section.knowledgeSlides.length, examples: section.exampleSlides.length }]));
let progressState = loadLearningProgress();
let confirmExamSubmit = false;

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function routeUrl({ topicId = "", typeCode = "", section = "", item = "", exam = "", question = "" } = {}) {
  const parameters = new URLSearchParams();
  if (topicId) parameters.set("topic", topicId);
  if (typeCode) parameters.set("type", typeCode);
  if (section) parameters.set("section", section);
  if (item) parameters.set("item", item);
  if (exam) parameters.set("exam", exam);
  if (question) parameters.set("question", question);
  const query = parameters.toString();
  return `documents.html${query ? `?${query}` : ""}`;
}

function readRoute() {
  const parameters = new URLSearchParams(location.search);
  return {
    topicId: parameters.get("topic")?.toUpperCase() || "",
    typeCode: parameters.get("type") || "",
    section: ["knowledge", "example", "practice"].includes(parameters.get("section")) ? parameters.get("section") : "knowledge",
    item: Math.max(1, Number(parameters.get("item")) || 1),
    exam: parameters.get("exam") || "",
    question: Math.max(1, Number(parameters.get("question")) || 1)
  };
}

function persist(next) {
  progressState = saveLearningProgress(next);
}

function renderGroupOptions() {
  return `<option value="all">Tất cả nhóm · ${curriculumMeta.topicCount}</option>${curriculumGroups.map((group) => `<option value="${group.id}" ${filterState.groupId === group.id ? "selected" : ""}>${group.id} · ${escapeHtml(group.name)} · ${group.topics.length}</option>`).join("")}`;
}

function renderTopicRow(topic) {
  const source = getDocumentForTopic(topic.id);
  const topicProgress = source ? getTopicProgress(progressState, topic, knowledgeCounts) : null;
  return `<a class="roadmap-topic" href="${routeUrl({ topicId: topic.id })}" data-route>
    <span class="roadmap-topic__code">${topic.id}</span>
    <span class="roadmap-topic__name"><strong>${escapeHtml(topic.title)}</strong><small>${escapeHtml(topic.groupName)}</small></span>
    <span class="roadmap-topic__meta">${topicProgress ? `${topicProgress.completedLessons}/${topicProgress.totalLessons} hoàn thành` : `${topic.exerciseTypes.length} dạng bài`}</span>
    <span class="roadmap-topic__arrow" aria-hidden="true">→</span>
  </a>`;
}

function renderCatalog() {
  const topics = filterCurriculum(curriculumGroups, filterState);
  document.body.classList.remove("learning-mode");
  app.innerHTML = `<section class="roadmap-view" aria-labelledby="roadmap-title">
    <header class="roadmap-intro"><p class="roadmap-intro__eyebrow">Chương trình Toán 12</p><h1 id="roadmap-title">Lộ trình Toán 12</h1><p>Chọn chuyên đề, học kiến thức trọng tâm và luyện tập ngay.</p></header>
    <div class="roadmap-toolbar" data-ui>
      <label class="roadmap-field roadmap-field--group"><span>Nhóm kiến thức</span><select data-curriculum-group>${renderGroupOptions()}</select></label>
      <label class="roadmap-field roadmap-field--search"><span>Tìm chuyên đề</span><input type="search" data-curriculum-search value="${escapeHtml(filterState.query)}" placeholder="Mã, chuyên đề hoặc dạng bài" autocomplete="off"></label>
      <button class="text-button roadmap-clear" type="button" data-clear-filters ${!filterState.query && filterState.groupId === "all" ? "hidden" : ""}>Xóa lọc</button>
      <p class="roadmap-status" data-curriculum-status aria-live="polite">${topics.length} chuyên đề</p>
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
        const lessonProgress = section ? getLessonProgress(progressState, exercise.code, section.knowledgeSlides.length, section.exampleSlides.length) : null;
        return `<a href="${routeUrl({ topicId: topic.id, typeCode: exercise.code, section: "knowledge", item: 1 })}" data-route class="${lessonProgress?.isComplete ? "is-complete" : ""}">
          <span>${escapeHtml(exercise.code)}</span><strong>${escapeHtml(exercise.title)}</strong>
          <small>${lessonProgress ? (lessonProgress.isComplete ? "✓ Hoàn thành" : `${lessonProgress.percent}% · Kiến thức + Bài tập`) : "Đang bổ sung"}</small><b aria-hidden="true">→</b>
        </a>`;
      }).join("")}
    </nav>
    ${supported ? `<section class="final-exam-card ${topicProgress.isComplete ? "is-unlocked" : "is-locked"}">
      <div><p>Bài kiểm tra cuối chuyên đề</p><h2>20 câu · Bao quát ${topic.exerciseTypes.length} dạng</h2><span>${topicProgress.isComplete ? "Bạn đã mở khóa bài kiểm tra." : `Hoàn thành ${topicProgress.totalLessons - topicProgress.completedLessons} bài còn lại để mở khóa.`}</span></div>
      ${topicProgress.isComplete ? `<a class="button button--small" href="${routeUrl({ topicId: topic.id, exam: "final", question: 1 })}" data-route>Bắt đầu kiểm tra →</a>` : `<span class="exam-lock" aria-label="Đang khóa">🔒</span>`}
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

function renderWorkspace(topic, exercise, route) {
  const knowledge = getKnowledgeSection(exercise.code);
  if (!knowledge) return renderUnavailable(topic, exercise);
  const questions = generatePracticeSet(exercise.code, "PRACTICE_V1");
  const slides = createLessonSlides({ topic, exercise, knowledgeSection: knowledge, questions });
  const state = createLessonState(slides, route.section, route.item);
  const active = slides[state.currentIndex];
  if (active.kind === "knowledge") {
    persist(markKnowledgeViewed(progressState, exercise.code, active.id));
  }
  if (active.kind === "example") {
    persist(markExampleViewed(progressState, exercise.code, active.id));
  }
  const lessonProgress = getLessonProgress(progressState, exercise.code, knowledge.knowledgeSlides.length, knowledge.exampleSlides.length, questions.length);
  const position = getSectionPosition(slides, state.currentIndex);
  const storedLesson = progressState.lessons[exercise.code] || { practiceAnswers: {} };
  const answer = active.kind === "practice" ? storedLesson.practiceAnswers[active.question.id] : null;
  document.body.classList.add("learning-mode");
  app.innerHTML = `<article class="learning-workspace" aria-labelledby="lesson-title" data-topic="${topic.id}" data-type="${exercise.code}">
    <header class="workspace-top"><div class="workspace-heading"><a href="${routeUrl({ topicId: topic.id })}" data-route aria-label="Quay lại ${topic.id}">←</a><div><h1 id="lesson-title">${escapeHtml(exercise.title)}</h1><p>${topic.id} · ${escapeHtml(topic.title)}</p></div></div>
      <div class="lesson-progress"><span><b>Tiến độ bài học</b><strong>${lessonProgress.percent}%</strong></span><progress value="${lessonProgress.completed}" max="${lessonProgress.total}">${lessonProgress.percent}%</progress><small>${lessonProgress.completed}/${lessonProgress.total} nội dung</small></div>
    </header>
    <div class="workspace-mobile-nav"><label><span>Nội dung</span><select data-section-select><option value="knowledge" ${active.section === "knowledge" ? "selected" : ""}>Kiến thức (${knowledge.knowledgeSlides.length})</option><option value="example" ${active.section === "example" ? "selected" : ""}>Ví dụ (${knowledge.exampleSlides.length})</option><option value="practice" ${active.section === "practice" ? "selected" : ""}>Bài tập (3)</option></select></label></div>
    <div class="workspace-frame"><nav class="lesson-sidebar" aria-label="Nội dung bài học"><p>Nội dung buổi học</p><ol>
      <li><button type="button" data-section="knowledge" aria-current="${active.section === "knowledge" ? "step" : "false"}" class="${lessonProgress.viewed === knowledge.knowledgeSlides.length ? "is-completed" : ""}"><span>${lessonProgress.viewed === knowledge.knowledgeSlides.length ? "✓" : "1"}</span><b>Kiến thức<small>${lessonProgress.viewed}/${knowledge.knowledgeSlides.length} phần</small></b></button></li>
      <li><button type="button" data-section="example" aria-current="${active.section === "example" ? "step" : "false"}" class="${lessonProgress.examplesViewed === knowledge.exampleSlides.length ? "is-completed" : ""}"><span>${lessonProgress.examplesViewed === knowledge.exampleSlides.length ? "✓" : "2"}</span><b>Ví dụ<small>${lessonProgress.examplesViewed}/${knowledge.exampleSlides.length} ví dụ</small></b></button></li>
      <li><button type="button" data-section="practice" aria-current="${active.section === "practice" ? "step" : "false"}" class="${lessonProgress.answered === questions.length ? "is-completed" : ""}"><span>${lessonProgress.answered === questions.length ? "✓" : "3"}</span><b>Bài tập<small>${lessonProgress.answered}/${questions.length} câu</small></b></button></li>
    </ol><a href="${routeUrl({ topicId: topic.id })}" data-route>← ${topic.id}</a></nav>
      <main class="lesson-content" tabindex="-1" data-lesson-content>${active.kind === "practice" ? renderPractice(active, answer) : renderSourceSlide(active, position, topic, exercise)}</main>
    </div>
    <footer class="lesson-navigation">
      <button type="button" data-slide-index="${state.currentIndex - 1}" ${state.currentIndex === 0 || active.section === "knowledge" ? "disabled" : ""}>← Trước</button>
      <p><strong>${active.section === "practice" ? `Bài ${position.current} / ${position.total}` : `${position.current} / ${position.total}`}</strong><span>${active.label}</span></p>
      ${active.section === "practice" && position.current === position.total
        ? `<a class="nav-button nav-button--primary" href="${routeUrl({ topicId: topic.id })}" data-route>Hoàn thành →</a>`
        : active.section === "knowledge"
          ? `<a class="nav-button nav-button--primary" href="${routeUrl({ topicId: topic.id, typeCode: exercise.code, section: "example", item: 1 })}" data-route>Xem ví dụ →</a>`
          : `<button type="button" data-slide-index="${state.currentIndex + 1}">${active.section === "example" && position.current === position.total ? "Làm bài tập →" : "Tiếp theo →"}</button>`}
    </footer>
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
  if (!topicProgress.isComplete) return renderTopicDetail(topic);
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
    <div class="exam-frame"><aside class="exam-navigator"><p>${exam.submitted ? "Xem lại bài" : "Danh sách câu"}</p><div>${questions.map((_item, questionIndex) => `<a href="${routeUrl({ topicId: topic.id, exam: "final", question: questionIndex + 1 })}" data-route class="${questionIndex === index ? "is-current" : ""} ${Object.hasOwn(exam.answers, questionIndex) ? "is-answered" : ""}">${questionIndex + 1}</a>`).join("")}</div>${exam.submitted ? `<button type="button" class="text-button" data-action="reset-exam">Làm lại bài</button>` : ""}</aside>
      <main class="lesson-content exam-content" tabindex="-1" data-lesson-content>${exam.submitted && index === 0 ? `<div class="exam-result"><span>${result.percent}%</span><div><p>Kết quả</p><h2>${result.score}/${result.total} câu đúng</h2><small>Xem từng câu để đọc lời giải và ôn lại bài cần cải thiện.</small></div></div>` : ""}${examQuestionMarkup(question, selected, exam.submitted)}</main></div>
    <footer class="lesson-navigation"><a class="nav-button ${index === 0 ? "is-disabled" : ""}" href="${routeUrl({ topicId: topic.id, exam: "final", question: Math.max(1, index) })}" data-route>← Trước</a><p><strong>${index + 1} / 20</strong><span>${exam.submitted ? "Xem lời giải" : "Bài kiểm tra"}</span></p>${index < 19 ? `<a class="nav-button nav-button--primary" href="${routeUrl({ topicId: topic.id, exam: "final", question: index + 2 })}" data-route>Tiếp theo →</a>` : exam.submitted ? `<a class="nav-button nav-button--primary" href="${routeUrl({ topicId: topic.id })}" data-route>Về chuyên đề</a>` : `<button type="button" data-action="request-submit" ${answered < 20 ? "disabled" : ""}>Nộp bài</button>`}</footer>
    ${confirmExamSubmit ? `<div class="exam-confirm" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><div><p class="lesson-kicker">Xác nhận</p><h2 id="confirm-title">Nộp bài kiểm tra?</h2><p>Sau khi nộp, bạn sẽ xem điểm và lời giải chi tiết.</p><div><button type="button" data-action="cancel-submit">Xem lại</button><button type="button" data-action="confirm-submit">Nộp bài</button></div></div></div>` : ""}
  </article>`;
}

function renderRoute() {
  if (!app) return;
  const route = readRoute();
  const topic = route.topicId ? findTopic(curriculumGroups, route.topicId) : null;
  const exercise = topic && route.typeCode ? findExerciseType(curriculumGroups, topic.id, route.typeCode) : null;
  if (topic && route.exam === "final") renderFinalExam(topic, route);
  else if (topic && exercise) renderWorkspace(topic, exercise, route);
  else if (topic) renderTopicDetail(topic);
  else renderCatalog();
}

function navigate(href, replace = false) {
  confirmExamSubmit = false;
  if (replace) history.replaceState(null, "", href); else history.pushState(null, "", href);
  renderRoute();
}

app?.addEventListener("input", (event) => {
  if (!event.target.matches("[data-curriculum-search]")) return;
  filterState.query = event.target.value; renderCatalog();
  const input = document.querySelector("[data-curriculum-search]"); input?.focus(); input?.setSelectionRange(filterState.query.length, filterState.query.length);
});

app?.addEventListener("change", (event) => {
  if (event.target.matches("[data-curriculum-group]")) { filterState.groupId = event.target.value; renderCatalog(); }
  if (event.target.matches("[data-section-select]")) {
    const route = readRoute(); navigate(routeUrl({ topicId: route.topicId, typeCode: route.typeCode, section: event.target.value, item: 1 }));
  }
});

app?.addEventListener("click", (event) => {
  const routeLink = event.target.closest("[data-route]");
  if (routeLink && !routeLink.classList.contains("is-disabled")) { event.preventDefault(); navigate(routeLink.href); return; }
  if (event.target.closest("[data-clear-filters]")) { filterState.query = ""; filterState.groupId = "all"; renderCatalog(); return; }
  const sectionButton = event.target.closest("[data-section]");
  if (sectionButton) { const route = readRoute(); navigate(routeUrl({ topicId: route.topicId, typeCode: route.typeCode, section: sectionButton.dataset.section, item: 1 })); return; }
  const slideButton = event.target.closest("[data-slide-index]");
  if (slideButton) {
    const route = readRoute(); const topic = findTopic(curriculumGroups, route.topicId); const exercise = findExerciseType(curriculumGroups, route.topicId, route.typeCode); const knowledge = getKnowledgeSection(route.typeCode); const slides = createLessonSlides({ topic, exercise, knowledgeSection: knowledge, questions: generatePracticeSet(route.typeCode, "PRACTICE_V1") });
    const target = selectLessonSlide(createLessonState(slides, route.section, route.item), Number(slideButton.dataset.slideIndex), slides.length); const active = slides[target.currentIndex]; const position = getSectionPosition(slides, target.currentIndex);
    navigate(routeUrl({ topicId: route.topicId, typeCode: route.typeCode, section: active.section, item: position.current })); return;
  }
  const practiceButton = event.target.closest("[data-practice-answer]");
  if (practiceButton) { const route = readRoute(); const question = generatePracticeSet(route.typeCode, "PRACTICE_V1")[route.item - 1]; persist(recordPracticeAnswer(progressState, route.typeCode, question.id, Number(practiceButton.dataset.practiceAnswer), question.correctIndex)); renderRoute(); return; }
  const examButton = event.target.closest("[data-exam-answer]");
  if (examButton) { const route = readRoute(); persist(saveExamAnswer(progressState, route.topicId, route.question - 1, Number(examButton.dataset.examAnswer))); renderRoute(); return; }
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "request-submit") { confirmExamSubmit = true; renderRoute(); }
  if (action === "cancel-submit") { confirmExamSubmit = false; renderRoute(); }
  if (action === "confirm-submit") { const route = readRoute(); const questions = createFinalExam(route.topicId); const exam = progressState.exams[route.topicId]; persist(submitExam(progressState, route.topicId, gradeFinalExam(questions, exam.answers))); confirmExamSubmit = false; navigate(routeUrl({ topicId: route.topicId, exam: "final", question: 1 }), true); }
  if (action === "reset-exam") { const route = readRoute(); persist(resetExam(progressState, route.topicId)); navigate(routeUrl({ topicId: route.topicId, exam: "final", question: 1 }), true); }
});

addEventListener("popstate", () => { confirmExamSubmit = false; renderRoute(); });
renderRoute();
