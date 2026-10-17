import { getGradeCatalog, buildGradeAwareUrl } from "../domain/grade-context.js?v=8.2";
import { getGrade } from "../data/grade-catalog.js?v=8.2";

function gradeDialogMarkup() {
  return `<dialog class="grade-dialog" data-grade-dialog aria-labelledby="grade-dialog-title">
    <section class="grade-dialog__panel">
      <button class="grade-dialog__close" type="button" data-grade-dialog-close aria-label="Đóng chọn khối lớp">×</button>
      <h2 id="grade-dialog-title">Bạn đang học lớp mấy?</h2>
      <div class="grade-dialog__options">
        ${getGradeCatalog().map((grade) => `<button type="button" data-grade-choice="${grade.id}">
          <span aria-hidden="true">${grade.id}</span><strong>${grade.label}</strong>
        </button>`).join("")}
      </div>
    </section>
  </dialog>`;
}

function updateInternalLinks(root, gradeId) {
  if (!gradeId) return;
  root.querySelectorAll?.('a[href]:not([data-grade-ignore])').forEach((anchor) => {
    const rawHref = anchor.getAttribute("href");
    if (!rawHref || rawHref.startsWith("#") || /^(?:mailto:|tel:|javascript:)/i.test(rawHref)) return;
    const target = new URL(rawHref, location.href);
    if (target.origin !== location.origin) return;
    anchor.setAttribute("href", buildGradeAwareUrl(target.href, gradeId, location.href));
  });
}

export function initializeGradeSelector({ gradeId = null, onGradeChange }) {
  document.body.insertAdjacentHTML("beforeend", gradeDialogMarkup());
  const dialog = document.querySelector("[data-grade-dialog]");
  const closeButton = dialog.querySelector("[data-grade-dialog-close]");
  let currentGradeId = getGrade(gradeId)?.id ?? null;
  let selectionRequired = !currentGradeId;
  let returnFocus = null;

  function syncGrade(nextGradeId) {
    currentGradeId = getGrade(nextGradeId)?.id ?? null;
    document.querySelectorAll("[data-current-grade]").forEach((element) => {
      element.textContent = currentGradeId ? `Lớp ${currentGradeId}` : "Chọn lớp";
    });
    updateInternalLinks(document, currentGradeId);
  }

  function openGradeDialog({ required = false, trigger = null } = {}) {
    selectionRequired = required;
    returnFocus = trigger;
    closeButton.hidden = required;
    dialog.dataset.required = String(required);
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    dialog.querySelector(`[data-grade-choice="${currentGradeId ?? "9"}"]`)?.focus();
  }

  function closeGradeDialog() {
    if (selectionRequired) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  dialog.addEventListener("cancel", (event) => {
    if (selectionRequired) event.preventDefault();
  });
  closeButton.addEventListener("click", closeGradeDialog);
  dialog.addEventListener("close", () => returnFocus?.focus({ preventScroll: true }));
  dialog.addEventListener("click", (event) => {
    const choice = event.target.closest("[data-grade-choice]");
    if (!choice) return;
    const nextGradeId = choice.dataset.gradeChoice;
    selectionRequired = false;
    syncGrade(nextGradeId);
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
    onGradeChange?.(nextGradeId);
  });

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-grade-open]");
    if (trigger) openGradeDialog({ trigger });
  });

  const observer = new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) updateInternalLinks(node, currentGradeId);
    }));
  });
  observer.observe(document.body, { childList: true, subtree: true });

  syncGrade(currentGradeId);
  if (selectionRequired) openGradeDialog({ required: true });

  return { syncGrade, openGradeDialog };
}
