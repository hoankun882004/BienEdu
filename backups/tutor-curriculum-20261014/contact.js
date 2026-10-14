import { validateContactValue } from "./domain/contact-validator.js";

const form = document.querySelector("[data-contact-form]");
const status = document.querySelector("[data-form-status]");

function validateField(field) {
  const message = validateContactValue(field.name, field.value);
  const error = form.querySelector(`[data-error-for="${field.name}"]`);
  field.setAttribute("aria-invalid", String(Boolean(message)));
  if (error) error.textContent = message;
  return !message;
}

form?.addEventListener("blur", (event) => {
  if (event.target.matches("input, textarea")) validateField(event.target);
}, true);

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const fields = [...form.querySelectorAll("input, textarea")];
  const isValid = fields.every(validateField);
  status.className = "form-status";

  if (!isValid) {
    status.textContent = "Vui lòng sửa các trường được đánh dấu trước khi tiếp tục.";
    status.classList.add("form-status--error");
    fields.find((field) => field.getAttribute("aria-invalid") === "true")?.focus();
    return;
  }

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = "Đang kiểm tra…";
  window.setTimeout(() => {
    button.disabled = false;
    button.textContent = "Kiểm tra thông tin";
    status.textContent = "Thông tin hợp lệ nhưng chưa được gửi. Form demo hiện chưa kết nối hệ thống tiếp nhận.";
    status.classList.add("form-status--notice");
  }, 450);
});
