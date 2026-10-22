const SLIDE_TYPE_LABELS = Object.freeze({
  concept: "Khái niệm",
  definition: "Định nghĩa",
  formula: "Công thức",
  properties: "Tính chất",
  method: "Phương pháp",
  steps: "Các bước",
  comparison: "So sánh",
  recognition: "Nhận dạng",
  "common-mistakes": "Lưu ý sai lầm",
  summary: "Tóm tắt",
  diagram: "Sơ đồ"
});

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function contentLength(reading) {
  return [
    reading.lead,
    ...(reading.formulae ?? []).flatMap((item) => [item.label, item.value, item.detail]),
    ...(reading.points ?? []).flatMap((item) => [item.label, item.text]),
    reading.note?.label,
    reading.note?.text
  ].filter(Boolean).join(" ").length;
}

function renderFormulae(formulae) {
  if (!formulae.length) return "";
  return `<section class="knowledge-reader__formulae" aria-labelledby="formula-title">
    <h3 id="formula-title">Công thức & nguyên tắc</h3>
    <dl>${formulae.map((item) => `<div><dt>${escapeHtml(item.label)}</dt><dd><strong>${escapeHtml(item.value)}</strong><span>${escapeHtml(item.detail)}</span></dd></div>`).join("")}</dl>
  </section>`;
}

function renderPoints(points) {
  if (!points.length) return "";
  return `<section class="knowledge-reader__points" aria-labelledby="points-title">
    <h3 id="points-title">Cách hiểu nhanh</h3>
    <ol>${points.map((item) => `<li><span>${escapeHtml(item.label)}</span><p>${escapeHtml(item.text)}</p></li>`).join("")}</ol>
  </section>`;
}

function renderNote(note) {
  if (!note) return "";
  return `<aside class="knowledge-reader__note knowledge-reader__note--${escapeHtml(note.tone)}" aria-label="${escapeHtml(note.label)}">
    <span aria-hidden="true">${note.tone === "warning" ? "!" : "✓"}</span>
    <p><strong>${escapeHtml(note.label)}</strong>${escapeHtml(note.text)}</p>
  </aside>`;
}

function presentationIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 4.75h14v10.5H5zM9 19.25l3-4 3 4M3.5 4.75h17"/></svg>`;
}

export function renderKnowledgeSlide({ slide, position, exercise, sourceMarkup = "" }) {
  const reading = slide.reading;
  const formulae = reading.formulae ?? [];
  const points = reading.points ?? [];
  const formulaMarkup = renderFormulae(formulae);
  const pointsMarkup = renderPoints(points);
  const noteMarkup = renderNote(reading.note);
  const usesPrinciplesLayout = reading.layout === "principles-split";
  const principlesMarkup = formulaMarkup || noteMarkup
    ? `<div class="knowledge-reader__principles">${formulaMarkup}${noteMarkup}</div>`
    : "";
  const studyPanels = [principlesMarkup, pointsMarkup].filter(Boolean);
  const studyMarkup = usesPrinciplesLayout
    ? `<div class="knowledge-reader__study-grid${studyPanels.length === 1 ? " knowledge-reader__study-grid--single" : ""}">${studyPanels.join("")}</div>`
    : `${formulaMarkup}${pointsMarkup}${noteMarkup}`;
  const readMinutes = Math.max(2, Math.ceil(contentLength(reading) / 550));
  const slideType = slide.slideType ?? "concept";
  const density = contentLength(reading) > 900 || formulae.length > 4 || points.length > 4 ? "dense" : "focused";
  const typeLabel = SLIDE_TYPE_LABELS[slideType] ?? SLIDE_TYPE_LABELS.concept;

  return `<article class="knowledge-reader knowledge-slide knowledge-reader--${escapeHtml(reading.layout ?? "standard")} knowledge-slide--${escapeHtml(slideType)} knowledge-slide--${density}" data-slide-type="${escapeHtml(slideType)}" aria-labelledby="lesson-content-title">
    <header class="knowledge-reader__bar">
      <p><span aria-hidden="true">${String(position.current).padStart(2, "0")}</span><span class="knowledge-slide__meta">${escapeHtml(exercise.code)} · Kiến thức ${position.current}/${position.total} · ${typeLabel}</span></p>
      <div class="knowledge-reader__tools"><span>${readMinutes} phút đọc</span>${sourceMarkup}<button class="knowledge-presentation-trigger" type="button" data-action="enter-presentation" aria-label="Trình chiếu bài học">${presentationIcon()}<span>Trình chiếu</span></button></div>
    </header>
    <div class="knowledge-reader__content">
      <section class="knowledge-reader__lead">
        <h2 id="lesson-content-title">${escapeHtml(exercise.title)}</h2>
        <p>${escapeHtml(reading.lead)}</p>
      </section>
      ${studyMarkup}
    </div>
  </article>`;
}
