const PDFJS_MODULE_URL = new URL("../../vendor/pdfjs/pdf.min.mjs", import.meta.url).href;
const PDFJS_WORKER_URL = new URL("../../vendor/pdfjs/pdf.worker.min.mjs", import.meta.url).href;
const VIEWER_STATE_PREFIX = "bienedu:pdf-viewer:v1:";
const MIN_SCALE = 0.45;
const MAX_SCALE = 3.2;
const VIEWED_DELAY_MS = 1200;

let pdfJsPromise = null;
let activeMount = null;
const documentCache = new Map();

const icons = Object.freeze({
  minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  width: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7v10M20 7v10M7 12h10M9 9l-3 3 3 3M15 9l3 3-3 3"/></svg>',
  page: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l4 4v14H7zM14 3v5h4"/></svg>',
  fullscreen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg>',
  previous: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>',
  retry: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg>'
});

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function readViewerState(code) {
  try {
    const value = JSON.parse(sessionStorage.getItem(`${VIEWER_STATE_PREFIX}${code}`) || "null");
    return {
      index: Math.max(0, Number(value?.index) || 0),
      mode: ["width", "page", "manual"].includes(value?.mode) ? value.mode : "width",
      scale: clamp(Number(value?.scale) || 1, MIN_SCALE, MAX_SCALE)
    };
  } catch {
    return { index: 0, mode: "width", scale: 1 };
  }
}

function saveViewerState(code, state) {
  try {
    sessionStorage.setItem(`${VIEWER_STATE_PREFIX}${code}`, JSON.stringify({
      index: state.index,
      mode: state.mode,
      scale: state.scale
    }));
  } catch {
    // Session state is optional in restricted browsing contexts.
  }
}

async function loadPdfJs() {
  if (!pdfJsPromise) {
    pdfJsPromise = import(PDFJS_MODULE_URL).then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      return pdfjsLib;
    });
  }
  return pdfJsPromise;
}

async function loadDocument(mapping) {
  const absoluteUrl = new URL(mapping.filePath, document.baseURI).href;
  if (!documentCache.has(absoluteUrl)) {
    const promise = loadPdfJs()
      .then((pdfjsLib) => pdfjsLib.getDocument({ url: absoluteUrl }).promise)
      .catch((error) => {
        documentCache.delete(absoluteUrl);
        throw error;
      });
    documentCache.set(absoluteUrl, promise);
    if (documentCache.size > 2) {
      const oldestUrl = documentCache.keys().next().value;
      if (oldestUrl !== absoluteUrl) {
        const oldest = documentCache.get(oldestUrl);
        documentCache.delete(oldestUrl);
        void oldest?.then((pdf) => pdf.destroy()).catch(() => {});
      }
    }
  }
  return documentCache.get(absoluteUrl);
}

function sourceName(mapping) {
  return mapping.documentId === "cd12-cd14-calculus"
    ? "Nguyên hàm – Tích phân CD12–CD14"
    : "Tổ hợp – Xác suất – Thống kê CD20–CD21";
}

export function renderKnowledgePdfViewer({ mapping, exercise, viewedSegments = [] }) {
  if (!mapping?.verified || !mapping.regions?.length) {
    return `<section class="pdf-unavailable" aria-labelledby="lesson-content-title">
      <p class="lesson-kicker">Kiến thức · Nguồn PDF</p>
      <h2 id="lesson-content-title">Tài liệu kiến thức đang được cập nhật.</h2>
      <p>BienEdu chưa có mapping PDF đã kiểm chứng cho dạng này. Tiến độ sẽ không được ghi nhận cho tới khi đúng tài liệu và đúng vùng nội dung được xác minh.</p>
    </section>`;
  }

  const total = mapping.regions.length;
  return `<article class="pdf-reader" data-pdf-viewer data-subtopic="${exercise.code}" tabindex="-1" aria-labelledby="lesson-content-title">
    <header class="pdf-reader__header">
      <div>
        <p class="lesson-kicker">PDF gốc · Mục ${exercise.code}</p>
        <h2 id="lesson-content-title">${exercise.title}</h2>
        <p class="pdf-reader__source"><span>Đã kiểm chứng vùng nội dung</span><b>${sourceName(mapping)}</b></p>
      </div>
      <button class="pdf-reader__expand" type="button" data-action="enter-presentation">${icons.fullscreen}<span>Toàn màn hình</span></button>
    </header>
    <div class="pdf-reader__toolbar" role="toolbar" aria-label="Điều khiển tài liệu PDF">
      <div class="pdf-reader__zoom-group">
        <button type="button" data-pdf-action="zoom-out" aria-label="Thu nhỏ tài liệu">${icons.minus}</button>
        <output data-pdf-zoom aria-label="Mức thu phóng">--</output>
        <button type="button" data-pdf-action="zoom-in" aria-label="Phóng to tài liệu">${icons.plus}</button>
      </div>
      <div class="pdf-reader__fit-group">
        <button type="button" data-pdf-action="fit-width" aria-pressed="true">${icons.width}<span>Vừa chiều rộng</span></button>
        <button type="button" data-pdf-action="fit-page" aria-pressed="false">${icons.page}<span>Vừa vùng</span></button>
      </div>
      <p class="pdf-reader__page" data-pdf-page-label>Đang xác định trang PDF…</p>
    </div>
    <div class="pdf-reader__viewport" data-pdf-viewport tabindex="0" aria-label="Vùng đọc PDF của mục ${exercise.code}">
      <div class="pdf-reader__loading" data-pdf-loading role="status"><span></span><p>Đang mở đúng mục ${exercise.code}…</p></div>
      <div class="pdf-reader__canvas-wrap" data-pdf-canvas-wrap hidden><canvas data-pdf-canvas></canvas></div>
      <div class="pdf-reader__error" data-pdf-error hidden role="alert">
        <strong>Không thể mở tài liệu PDF.</strong>
        <p>Kiểm tra kết nối hoặc thử tải lại vùng nội dung này.</p>
        <button type="button" data-pdf-action="retry">${icons.retry}<span>Thử lại</span></button>
      </div>
    </div>
    <footer class="pdf-reader__navigation" aria-label="Điều hướng trang PDF">
      <button type="button" data-pdf-action="previous">${icons.previous}<span>Trang PDF trước</span></button>
      <div><strong data-pdf-segment-label>Vùng 1/${total}</strong><small data-pdf-progress>${viewedSegments.length}/${total} vùng đã xem</small></div>
      <button type="button" data-pdf-action="next"><span>Trang PDF tiếp</span>${icons.next}</button>
    </footer>
  </article>`;
}

function teardownActiveMount() {
  if (!activeMount) return;
  activeMount.abortController.abort();
  activeMount.resizeObserver?.disconnect();
  activeMount.visibilityObserver?.disconnect();
  activeMount.renderTask?.cancel();
  clearTimeout(activeMount.viewedTimer);
  activeMount = null;
}

function updatePressedState(root, mode) {
  root.querySelector('[data-pdf-action="fit-width"]')?.setAttribute("aria-pressed", String(mode === "width"));
  root.querySelector('[data-pdf-action="fit-page"]')?.setAttribute("aria-pressed", String(mode === "page"));
}

export function mountKnowledgePdfViewer({ root, mapping, viewedSegments = [], onSegmentViewed = () => {} }) {
  teardownActiveMount();
  const viewer = root?.querySelector?.("[data-pdf-viewer]");
  if (!viewer || !mapping?.verified || !mapping.regions?.length) return;

  const abortController = new AbortController();
  const state = readViewerState(mapping.subtopicId);
  state.index = clamp(state.index, 0, mapping.regions.length - 1);
  const seen = new Set(viewedSegments);
  const viewportElement = viewer.querySelector("[data-pdf-viewport]");
  const canvasWrap = viewer.querySelector("[data-pdf-canvas-wrap]");
  const canvas = viewer.querySelector("[data-pdf-canvas]");
  const loading = viewer.querySelector("[data-pdf-loading]");
  const errorState = viewer.querySelector("[data-pdf-error]");
  const mount = { abortController, resizeObserver: null, visibilityObserver: null, renderTask: null, renderId: 0, viewedTimer: null, visible: true };
  activeMount = mount;

  function updateLabels(actualScale = null) {
    const region = mapping.regions[state.index];
    viewer.querySelector("[data-pdf-page-label]").textContent = `Trang gốc ${region.page}/${mapping.pageCount}`;
    viewer.querySelector("[data-pdf-segment-label]").textContent = `Vùng ${state.index + 1}/${mapping.regions.length}`;
    viewer.querySelector("[data-pdf-progress]").textContent = `${seen.size}/${mapping.regions.length} vùng đã xem`;
    viewer.querySelector('[data-pdf-action="previous"]').disabled = state.index === 0;
    viewer.querySelector('[data-pdf-action="next"]').disabled = state.index === mapping.regions.length - 1;
    if (actualScale) viewer.querySelector("[data-pdf-zoom]").textContent = `${Math.round(actualScale * 100)}%`;
    updatePressedState(viewer, state.mode);
  }

  function scheduleViewed(region) {
    clearTimeout(mount.viewedTimer);
    if (!mount.visible || document.visibilityState !== "visible" || seen.has(region.id)) return;
    mount.viewedTimer = setTimeout(() => {
      if (activeMount !== mount || !mount.visible || document.visibilityState !== "visible") return;
      seen.add(region.id);
      updateLabels();
      onSegmentViewed(region.id, mapping.regions.map((item) => item.id));
    }, VIEWED_DELAY_MS);
  }

  async function renderCurrent() {
    const renderId = ++mount.renderId;
    const region = mapping.regions[state.index];
    mount.renderTask?.cancel();
    clearTimeout(mount.viewedTimer);
    loading.hidden = false;
    errorState.hidden = true;
    canvasWrap.hidden = true;
    updateLabels();

    try {
      const pdf = await loadDocument(mapping);
      if (activeMount !== mount || renderId !== mount.renderId) return;
      const page = await pdf.getPage(region.page);
      if (activeMount !== mount || renderId !== mount.renderId) return;
      const baseViewport = page.getViewport({ scale: 1 });
      const regionWidth = baseViewport.width * region.width;
      const regionHeight = baseViewport.height * region.height;
      const availableWidth = Math.max(280, viewportElement.clientWidth - 32);
      const availableHeight = Math.max(360, viewportElement.clientHeight - 32);
      const fitWidth = clamp(availableWidth / regionWidth, MIN_SCALE, MAX_SCALE);
      const fitPage = clamp(Math.min(availableWidth / regionWidth, availableHeight / regionHeight), MIN_SCALE, MAX_SCALE);
      const cssScale = state.mode === "width" ? fitWidth : state.mode === "page" ? fitPage : state.scale;
      const pixelRatio = clamp(globalThis.devicePixelRatio || 1, 1, 2);
      const renderScale = cssScale * pixelRatio;
      const renderViewport = page.getViewport({ scale: renderScale });
      const sourceX = region.x * renderViewport.width;
      const sourceY = region.y * renderViewport.height;
      const pixelWidth = Math.max(1, Math.round(regionWidth * renderScale));
      const pixelHeight = Math.max(1, Math.round(regionHeight * renderScale));

      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvas.style.width = `${Math.round(regionWidth * cssScale)}px`;
      canvas.style.height = `${Math.round(regionHeight * cssScale)}px`;
      const context = canvas.getContext("2d", { alpha: false });
      context.save();
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, pixelWidth, pixelHeight);
      context.restore();
      mount.renderTask = page.render({
        canvasContext: context,
        viewport: renderViewport,
        transform: [1, 0, 0, 1, -sourceX, -sourceY]
      });
      await mount.renderTask.promise;
      if (activeMount !== mount || renderId !== mount.renderId) return;
      page.cleanup();
      loading.hidden = true;
      canvasWrap.hidden = false;
      viewportElement.scrollTo({ top: 0, left: 0, behavior: "instant" });
      updateLabels(cssScale);
      scheduleViewed(region);
    } catch (error) {
      if (error?.name === "RenderingCancelledException" || activeMount !== mount) return;
      loading.hidden = true;
      canvasWrap.hidden = true;
      errorState.hidden = false;
      console.error("BienEdu PDF viewer:", error);
    }
  }

  function changeSegment(direction) {
    const nextIndex = clamp(state.index + direction, 0, mapping.regions.length - 1);
    if (nextIndex === state.index) return;
    state.index = nextIndex;
    saveViewerState(mapping.subtopicId, state);
    void renderCurrent();
  }

  function setMode(mode) {
    state.mode = mode;
    saveViewerState(mapping.subtopicId, state);
    void renderCurrent();
  }

  function changeZoom(delta) {
    const displayed = Number.parseFloat(viewer.querySelector("[data-pdf-zoom]").textContent) / 100;
    state.mode = "manual";
    state.scale = clamp((Number.isFinite(displayed) ? displayed : state.scale) + delta, MIN_SCALE, MAX_SCALE);
    saveViewerState(mapping.subtopicId, state);
    void renderCurrent();
  }

  viewer.addEventListener("click", (event) => {
    const action = event.target.closest("[data-pdf-action]")?.dataset.pdfAction;
    if (!action) return;
    if (action === "previous") changeSegment(-1);
    if (action === "next") changeSegment(1);
    if (action === "zoom-out") changeZoom(-0.15);
    if (action === "zoom-in") changeZoom(0.15);
    if (action === "fit-width") setMode("width");
    if (action === "fit-page") setMode("page");
    if (action === "retry") void renderCurrent();
  }, { signal: abortController.signal });

  viewer.addEventListener("keydown", (event) => {
    if (!document.body.classList.contains("presentation-mode")) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      event.stopPropagation();
      changeSegment(-1);
    }
    if (event.key === "ArrowRight" || (event.key === " " && !event.target.closest("button, a"))) {
      event.preventDefault();
      event.stopPropagation();
      changeSegment(1);
    }
  }, { signal: abortController.signal });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") scheduleViewed(mapping.regions[state.index]);
    else clearTimeout(mount.viewedTimer);
  }, { signal: abortController.signal });

  if ("ResizeObserver" in globalThis) {
    let resizeFrame = 0;
    mount.resizeObserver = new ResizeObserver(() => {
      if (state.mode === "manual") return;
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => void renderCurrent());
    });
    mount.resizeObserver.observe(viewportElement);
  }

  if ("IntersectionObserver" in globalThis) {
    mount.visibilityObserver = new IntersectionObserver(([entry]) => {
      mount.visible = entry.isIntersecting && entry.intersectionRatio >= 0.2;
      if (mount.visible) scheduleViewed(mapping.regions[state.index]);
      else clearTimeout(mount.viewedTimer);
    }, { threshold: [0, 0.2, 0.5] });
    mount.visibilityObserver.observe(viewer);
  }

  updateLabels();
  void renderCurrent();
}

export function destroyKnowledgePdfViewer() {
  teardownActiveMount();
}
