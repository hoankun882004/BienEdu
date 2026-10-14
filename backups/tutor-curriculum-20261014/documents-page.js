import { documents, documentAudit } from "./data/documents.js";
import { initializeMotion } from "./motion.js";

const list = document.querySelector("[data-document-list]");
const search = document.querySelector("[data-document-search]");
const category = document.querySelector("[data-document-category]");
const count = document.querySelector("[data-document-count]");
const dialog = document.querySelector("[data-pdf-dialog]");
const viewer = document.querySelector("[data-pdf-viewer]");
const viewerTitle = document.querySelector("[data-pdf-title]");

const categories = [...new Set(documents.map((document) => document.category))];
categories.forEach((name) => category?.insertAdjacentHTML("beforeend", `<option value="${name}">${name}</option>`));

function renderDocuments() {
  const query = search?.value.trim().toLocaleLowerCase("vi") ?? "";
  const selectedCategory = category?.value ?? "all";
  const filtered = documents.filter((document) => {
    const matchesSearch = document.title.toLocaleLowerCase("vi").includes(query);
    const matchesCategory = selectedCategory === "all" || document.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (count) count.textContent = `${filtered.length} tài liệu`;
  if (!list) return;

  if (!filtered.length) {
    list.innerHTML = `
      <section class="empty-state" role="status">
        <div class="empty-state__symbol" aria-hidden="true" data-reveal>∅</div>
        <div data-reveal>
          <h2>${documents.length ? "Không tìm thấy tài liệu phù hợp" : "Thư viện đang chờ dữ liệu PDF"}</h2>
          <p>${documents.length ? "Hãy đổi từ khóa hoặc nhóm kiến thức." : `Đã quét ${documentAudit.discoveredPdfFiles} file PDF. BienEdu chưa hiển thị tên của 39 chuyên đề khi chưa có tài liệu gốc.`}</p>
        </div>
      </section>`;
    return;
  }

  list.innerHTML = filtered.map((document) => `
    <article class="document-row">
      <div>
        <span>${document.category}</span>
        <h2>${document.title}</h2>
        <p>${document.description ?? ""}</p>
      </div>
      <div class="document-row__actions">
        <button class="button" type="button" data-view-pdf="${document.id}">Xem PDF</button>
        ${document.downloadable ? `<a class="text-link" href="${document.url}" download>Tải xuống</a>` : ""}
      </div>
    </article>`).join("");
}

search?.addEventListener("input", renderDocuments);
category?.addEventListener("change", renderDocuments);

list?.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-view-pdf]");
  if (!trigger) return;
  const documentItem = documents.find((item) => item.id === trigger.dataset.viewPdf);
  if (!documentItem || !dialog || !viewer || !viewerTitle) return;
  viewerTitle.textContent = documentItem.title;
  viewer.src = documentItem.url;
  dialog.showModal();
});

dialog?.addEventListener("close", () => {
  if (viewer) viewer.removeAttribute("src");
});

renderDocuments();
initializeMotion();
