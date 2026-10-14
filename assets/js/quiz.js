import { quizQuestions } from "./data/quiz-data.js";
import { answerQuestion, createQuizState, scoreQuiz, toggleHint, unansweredIndexes } from "./domain/quiz-engine.js";
import { initializeMotion } from "./motion.js";

const root = document.querySelector("[data-quiz-root]");
let state = createQuizState(quizQuestions.length);

function setState(nextState) {
  state = nextState;
  render();
}

function quizIntro() {
  return `
    <section class="quiz-intro" data-ui>
      <div>
        <p class="quiz-intro__lead" data-reveal>10 câu hỏi. Một lượt làm rõ bạn đang vững phần nào và cần ôn lại phần nào.</p>
        <ul>
          <li data-reveal>Chọn một đáp án cho mỗi câu.</li>
          <li data-reveal>Xem lại toàn bộ trước khi nộp.</li>
          <li data-reveal>Nhận điểm, đáp án và lời giải ngay trên thiết bị.</li>
        </ul>
      </div>
      <button class="button" type="button" data-action="start" data-reveal>Bắt đầu làm bài</button>
    </section>`;
}

function questionNavigation() {
  return `
    <nav class="question-map" aria-label="Trạng thái câu hỏi">
      ${quizQuestions.map((question, index) => `
        <button type="button" class="${index === state.currentIndex ? "is-current" : ""} ${state.answers[index] !== null ? "is-answered" : ""}" data-question-index="${index}" aria-label="Câu ${index + 1}${state.answers[index] !== null ? ", đã trả lời" : ", chưa trả lời"}">${index + 1}</button>
      `).join("")}
    </nav>`;
}

function quizQuestion() {
  const question = quizQuestions[state.currentIndex];
  const answered = state.answers.filter((answer) => answer !== null).length;
  const percent = Math.round((answered / quizQuestions.length) * 100);
  const hintIsOpen = state.hintVisibility[state.currentIndex];
  return `
    <section class="quiz-workspace" data-ui>
      <aside>
        <p>Đã trả lời <strong>${answered}/${quizQuestions.length}</strong></p>
        <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" aria-label="Tiến độ bài kiểm tra"><span style="--progress:${percent}%"></span></div>
        ${questionNavigation()}
        <button class="text-button" type="button" data-action="review">Xem lại bài</button>
      </aside>
      <div class="question-panel">
        <p class="question-topic">${question.topic}</p>
        <h2>Câu ${state.currentIndex + 1}</h2>
        <p class="question-prompt">${question.prompt}</p>
        <fieldset>
          <legend class="sr-only">Chọn một đáp án</legend>
          ${question.options.map((option, index) => `
            <label class="answer-option ${state.answers[state.currentIndex] === index ? "is-selected" : ""}">
              <input type="radio" name="answer" value="${index}" ${state.answers[state.currentIndex] === index ? "checked" : ""}>
              <span aria-hidden="true">${String.fromCharCode(65 + index)}</span>
              <b>${option}</b>
            </label>
          `).join("")}
        </fieldset>
        <div class="question-hint">
          <button class="text-button question-hint__toggle" type="button" data-action="toggle-hint" aria-expanded="${hintIsOpen}" aria-controls="hint-question-${question.id}">${hintIsOpen ? "Ẩn gợi ý ↑" : "? Gợi ý"}</button>
          ${hintIsOpen ? `<div class="question-hint__content" id="hint-question-${question.id}" role="note"><strong>Gợi ý</strong><p>${question.hint}</p></div>` : ""}
        </div>
        <div class="quiz-controls">
          <button class="button button--secondary" type="button" data-action="previous" ${state.currentIndex === 0 ? "disabled" : ""}>Câu trước</button>
          ${state.currentIndex < quizQuestions.length - 1
            ? '<button class="button" type="button" data-action="next">Câu tiếp</button>'
            : '<button class="button" type="button" data-action="review">Xem lại</button>'}
        </div>
      </div>
    </section>`;
}

function quizReview() {
  const missing = unansweredIndexes(state.answers);
  return `
    <section class="quiz-review" data-ui>
      <div class="quiz-review__summary">
        <h2>Xem lại bài</h2>
        <p>${missing.length ? `Còn ${missing.length} câu chưa trả lời. Bạn vẫn có thể quay lại bổ sung trước khi nộp.` : "Bạn đã trả lời đủ 10 câu. Hãy kiểm tra lần cuối trước khi nộp."}</p>
        ${missing.length ? `<div class="quiz-warning" role="alert">Chưa trả lời: ${missing.map((index) => `câu ${index + 1}`).join(", ")}.</div>` : ""}
      </div>
      <ol class="review-list">
        ${quizQuestions.map((question, index) => `
          <li>
            <button type="button" data-question-index="${index}">
              <span>Câu ${index + 1}</span>
              <b>${state.answers[index] === null ? "Chưa trả lời" : `Đã chọn ${String.fromCharCode(65 + state.answers[index])}`}</b>
            </button>
          </li>
        `).join("")}
      </ol>
      <div class="quiz-controls">
        <button class="button button--secondary" type="button" data-action="back-to-questions">Tiếp tục kiểm tra</button>
        <button class="button" type="button" data-action="submit">Nộp bài</button>
      </div>
    </section>`;
}

function quizResults() {
  const result = scoreQuiz(quizQuestions, state.answers);
  const percentage = Math.round((result.correct / result.total) * 100);
  return `
    <section class="quiz-results" data-ui aria-live="polite">
      <div class="result-score">
        <span>${result.correct}/${result.total}</span>
        <div>
          <h2>Kết quả của bạn</h2>
          <p>${percentage >= 80 ? "Nền tảng đang khá chắc. Hãy xem lời giải để khóa lại các điểm dễ nhầm." : percentage >= 50 ? "Bạn đã có nền tảng. Phần lời giải bên dưới sẽ chỉ ra nội dung cần ôn tiếp." : "Hãy dùng phần lời giải như một bản đồ ôn tập trước khi làm lại."}</p>
        </div>
      </div>
      <ol class="result-list">
        ${quizQuestions.map((question, index) => {
          const selected = state.answers[index];
          const isCorrect = selected === question.correctIndex;
          return `
            <li class="result-item ${isCorrect ? "is-correct" : "is-wrong"}">
              <div>
                <span>Câu ${index + 1} · ${question.topic}</span>
                <h3>${question.prompt}</h3>
              </div>
              <p><strong>${isCorrect ? "Đúng" : "Chưa đúng"}.</strong> Đáp án đúng: ${String.fromCharCode(65 + question.correctIndex)}. ${question.options[question.correctIndex]}</p>
              <p>${question.explanation}</p>
            </li>`;
        }).join("")}
      </ol>
      <button class="button" type="button" data-action="restart">Làm lại bài</button>
    </section>`;
}

function render() {
  if (!root) return;
  if (state.phase === "intro") root.innerHTML = quizIntro();
  if (state.phase === "questions") root.innerHTML = quizQuestion();
  if (state.phase === "review") root.innerHTML = quizReview();
  if (state.phase === "results") root.innerHTML = quizResults();
  initializeMotion();
  root.focus({ preventScroll: true });
}

root?.addEventListener("change", (event) => {
  if (!event.target.matches('input[name="answer"]')) return;
  setState(answerQuestion(state, state.currentIndex, Number(event.target.value)));
});

root?.addEventListener("click", (event) => {
  const questionTrigger = event.target.closest("[data-question-index]");
  if (questionTrigger) {
    setState({ ...state, currentIndex: Number(questionTrigger.dataset.questionIndex), phase: "questions" });
    return;
  }

  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  if (action === "start") setState({ ...state, phase: "questions" });
  if (action === "previous") setState({ ...state, currentIndex: Math.max(0, state.currentIndex - 1) });
  if (action === "next") setState({ ...state, currentIndex: Math.min(quizQuestions.length - 1, state.currentIndex + 1) });
  if (action === "toggle-hint") setState(toggleHint(state, state.currentIndex));
  if (action === "review") setState({ ...state, phase: "review" });
  if (action === "back-to-questions") setState({ ...state, phase: "questions" });
  if (action === "submit") setState({ ...state, phase: "results" });
  if (action === "restart") setState(createQuizState(quizQuestions.length));
});

render();
