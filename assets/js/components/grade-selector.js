import { getGradeCatalog, buildGradeAwareUrl } from "../domain/grade-context.js?v=8.2";
import { getGrade } from "../data/grade-catalog.js?v=8.2";

function gradeDialogMarkup() {
  return `<dialog class="grade-dialog" data-grade-dialog aria-labelledby="grade-dialog-title" aria-describedby="grade-dialog-description grade-dialog-support">
    <section class="grade-dialog__panel">
      <button class="grade-dialog__close" type="button" data-grade-dialog-close aria-label="Đóng chọn khối lớp">×</button>
      <img class="grade-dialog__logo" src="assets/images/bienedu-logo.png" width="1672" height="941" alt="BienEdu">
      <p class="grade-dialog__welcome">Chào mừng em đến với BienEdu! <span aria-hidden="true">👋</span></p>
      <p class="grade-dialog__description" id="grade-dialog-description">BienEdu là không gian học Toán giúp em nắm vững kiến thức, luyện tập theo từng dạng bài và học tập theo lộ trình phù hợp.</p>
      <h2 id="grade-dialog-title" tabindex="-1">Em đang học lớp mấy nhỉ?</h2>
      <p class="grade-dialog__support" id="grade-dialog-support">Chọn lớp để BienEdu hiển thị nội dung học phù hợp với em nhé!</p>
      <div class="grade-dialog__options" role="group" aria-label="Chọn lớp đang học">
        ${getGradeCatalog().map((grade) => `<button type="button" data-grade-choice="${grade.id}" aria-pressed="false">
          <span aria-hidden="true">${grade.id}</span><strong>${grade.label}</strong>
        </button>`).join("")}
      </div>
      <p class="grade-dialog__selection" data-grade-selection aria-live="polite">Chưa chọn lớp</p>
      <button class="button grade-dialog__continue" type="button" data-grade-continue disabled>Bắt đầu học <span aria-hidden="true">→</span></button>
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
  const continueButton = dialog.querySelector("[data-grade-continue]");
  const selectionStatus = dialog.querySelector("[data-grade-selection]");
  const choices = [...dialog.querySelectorAll("[data-grade-choice]")];
  let currentGradeId = getGrade(gradeId)?.id ?? null;
  let draftGradeId = currentGradeId;
  let selectionRequired = !currentGradeId;
  let returnFocus = null;

  function renderDraftSelection(nextGradeId) {
    draftGradeId = getGrade(nextGradeId)?.id ?? null;
    choices.forEach((choice) => {
      const selected = choice.dataset.gradeChoice === draftGradeId;
      choice.setAttribute("aria-pressed", String(selected));
      choice.classList.toggle("is-selected", selected);
    });
    continueButton.disabled = !draftGradeId;
    selectionStatus.textContent = draftGradeId ? `Đã chọn lớp ${draftGradeId}` : "Chưa chọn lớp";
  }

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
    renderDraftSelection(currentGradeId);
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    if (currentGradeId) dialog.querySelector(`[data-grade-choice="${currentGradeId}"]`)?.focus();
    else dialog.querySelector("#grade-dialog-title")?.focus();
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
    if (choice) {
      renderDraftSelection(choice.dataset.gradeChoice);
      return;
    }
    if (event.target === dialog && !selectionRequired) closeGradeDialog();
  });
  dialog.addEventListener("keydown", (event) => {
    const choice = event.target.closest("[data-grade-choice]");
    if (!choice || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const direction = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1;
    const nextIndex = (choices.indexOf(choice) + direction + choices.length) % choices.length;
    choices[nextIndex].focus();
  });
  continueButton.addEventListener("click", () => {
    if (!draftGradeId) return;
    selectionRequired = false;
    syncGrade(draftGradeId);
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
    onGradeChange?.(draftGradeId);
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
