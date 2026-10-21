import { getGrade } from "./data/grade-catalog.js?v=8.7";
import { getPracticePapersForGrade } from "./data/practice-papers.js?v=8.7";
import { buildGradeAwareUrl } from "./domain/grade-context.js?v=8.2";
import { initializeMotion } from "./motion.js?v=8.2";

const root = document.querySelector("[data-practice-papers-root]");
const requestedGrade = document.body.dataset.grade || new URLSearchParams(location.search).get("grade");
const grade = getGrade(requestedGrade);
const gradeId = grade?.id ?? null;
const gradeLabel = grade ? `Toán ${grade.id}` : "Toán THPT";
const papers = getPracticePapersForGrade(gradeId);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function paperMarkup(paper) {
  const source = paper.source?.href
    ? `<a class="text-link" href="${escapeHtml(paper.source.href)}">${escapeHtml(paper.source.label || "Mở đề")}</a>`
    : "";
  return `<article class="practice-paper-item">
    <div>
      <h2>${escapeHtml(paper.title)}</h2>
      <p>${escapeHtml(paper.subtitle)}</p>
    </div>
    <dl>
      <div><dt>Thời lượng</dt><dd>${escapeHtml(paper.durationMinutes)} phút</dd></div>
      <div><dt>Số câu</dt><dd>${escapeHtml(paper.numberOfQuestions)}</dd></div>
      <div><dt>Phạm vi</dt><dd>${escapeHtml(paper.scope)}</dd></div>
    </dl>
    ${source}
  </article>`;
}

function emptyStateMarkup() {
  const roadmapUrl = gradeId ? buildGradeAwareUrl("documents.html", gradeId) : "documents.html";
  const homeUrl = gradeId ? buildGradeAwareUrl("./", gradeId) : "./";
  return `<section class="practice-paper-empty" aria-labelledby="practice-empty-title">
    <div class="practice-paper-empty__grade" aria-hidden="true">
      <span>${grade?.id ?? "–"}</span>
      <small>${grade ? `Lớp ${grade.id}` : "Toán THPT"}</small>
    </div>
    <div class="practice-paper-empty__copy">
      <p class="practice-paper-status">Đang chuẩn bị nội dung</p>
      <h2 id="practice-empty-title">Nội dung luyện đề đang được cập nhật.</h2>
      <p>BienEdu đang chuẩn bị các bộ đề để bạn luyện tập theo nhịp làm bài thật. Khi có bộ đề mới, nội dung sẽ xuất hiện tại đây.</p>
      <div class="practice-paper-empty__actions">
        <a class="button" href="${roadmapUrl}">Quay lại lộ trình</a>
        <a class="text-link" href="${homeUrl}">Về trang chủ</a>
      </div>
    </div>
  </section>`;
}

function paperLibraryMarkup() {
  return `<section class="practice-paper-library" aria-labelledby="practice-library-title">
    <header>
      <h2 id="practice-library-title">Bộ đề ${escapeHtml(gradeLabel)}</h2>
      <p>Chọn một bộ đề đã được đối chiếu nguồn để bắt đầu luyện tập.</p>
    </header>
    <div>${papers.map(paperMarkup).join("")}</div>
  </section>`;
}

function renderPracticePapers() {
  document.querySelector("[data-practice-page-title]")?.replaceChildren(`Luyện đề ${gradeLabel}`);
  if (!root) return;
  root.innerHTML = papers.length ? paperLibraryMarkup() : emptyStateMarkup();
  initializeMotion();
}

renderPracticePapers();
