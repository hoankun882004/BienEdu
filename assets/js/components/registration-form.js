import { registrationConfig, isRegistrationConfigured } from "../data/registration-config.js?v=16.1";

const FIELD_NAMES = ["fullName", "grade", "phone", "format", "note"];

export function normalizeVietnamesePhone(value = "") {
  const compact = String(value).trim().replace(/[\s.()\-]/g, "");
  if (compact.startsWith("+84")) return `0${compact.slice(3)}`;
  if (compact.startsWith("84") && compact.length === 11) return `0${compact.slice(2)}`;
  return compact;
}

export function isValidVietnamesePhone(value) {
  return /^0(?:3|5|7|8|9)\d{8}$/.test(normalizeVietnamesePhone(value));
}

export function validateRegistrationData(data) {
  const errors = {};
  if (!String(data.fullName ?? "").trim()) errors.fullName = "Em vui lòng nhập họ và tên.";
  if (!["10", "11", "12"].includes(String(data.grade ?? ""))) errors.grade = "Em vui lòng chọn lớp đang học.";
  if (!String(data.phone ?? "").trim()) errors.phone = "Em vui lòng nhập số điện thoại hoặc Zalo.";
  else if (!isValidVietnamesePhone(data.phone)) errors.phone = "Số điện thoại chưa đúng định dạng Việt Nam.";
  return errors;
}

export async function submitRegistration(data, {
  config = registrationConfig,
  fetchImpl = globalThis.fetch
} = {}) {
  if (!isRegistrationConfigured(config)) throw new Error("REGISTRATION_NOT_CONFIGURED");
  const errors = validateRegistrationData(data);
  if (Object.keys(errors).length) throw new Error("REGISTRATION_INVALID");

  const response = await fetchImpl(config.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      "Họ và tên": data.fullName.trim(),
      "Lớp": data.grade,
      "Số điện thoại / Zalo": normalizeVietnamesePhone(data.phone),
      "Hình thức học": data.format || "Cần tư vấn thêm",
      "Nội dung cần tư vấn": data.note?.trim() || "Không có"
    })
  });

  if (!response.ok) throw new Error("REGISTRATION_DELIVERY_FAILED");
  return response;
}

function fieldErrorMarkup(name) {
  return `<span class="registration-form__error" id="registration-${name}-error" data-registration-error="${name}"></span>`;
}

function registrationFormMarkup({ gradeId, contact, configured }) {
  const selectedGrade = ["10", "11", "12"].includes(String(gradeId)) ? String(gradeId) : "";
  return `
    <form class="registration-form" data-registration-form novalidate>
      <div class="registration-form__field registration-form__field--wide">
        <label for="registration-full-name">Họ và tên <span aria-hidden="true">*</span></label>
        <input id="registration-full-name" name="fullName" type="text" autocomplete="name" required aria-describedby="registration-fullName-error" placeholder="Ví dụ: Nguyễn Minh Anh">
        ${fieldErrorMarkup("fullName")}
      </div>
      <div class="registration-form__field">
        <label for="registration-grade">Lớp đang học <span aria-hidden="true">*</span></label>
        <select id="registration-grade" name="grade" required aria-describedby="registration-grade-error">
          <option value="">Chọn lớp</option>
          ${["10", "11", "12"].map((grade) => `<option value="${grade}"${selectedGrade === grade ? " selected" : ""}>Lớp ${grade}</option>`).join("")}
        </select>
        ${fieldErrorMarkup("grade")}
      </div>
      <div class="registration-form__field">
        <label for="registration-phone">Số điện thoại / Zalo <span aria-hidden="true">*</span></label>
        <input id="registration-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required aria-describedby="registration-phone-error" placeholder="Ví dụ: 0912 345 678">
        ${fieldErrorMarkup("phone")}
      </div>
      <div class="registration-form__field registration-form__field--wide">
        <label for="registration-format">Hình thức học <span>(không bắt buộc)</span></label>
        <select id="registration-format" name="format">
          <option value="">Cần tư vấn thêm</option>
          <option value="Online">Online</option>
          <option value="Trực tiếp">Trực tiếp</option>
        </select>
      </div>
      <div class="registration-form__field registration-form__field--wide">
        <label for="registration-note">Nội dung cần tư vấn <span>(không bắt buộc)</span></label>
        <textarea id="registration-note" name="note" rows="3" placeholder="Em đang cần hỗ trợ phần nào?"></textarea>
      </div>
      <div class="registration-form__footer registration-form__field--wide">
        <p class="registration-form__privacy">${configured
          ? "Thông tin em gửi được chuyển qua Formspree để BienEdu liên hệ và tư vấn đăng ký học."
          : "Biểu mẫu chưa được kết nối nên hiện không gửi hoặc lưu thông tin của em."}</p>
        <button class="button" type="submit" data-registration-submit${configured ? "" : " disabled"}>${configured ? "Gửi đăng ký" : "Biểu mẫu đang được thiết lập"}</button>
      </div>
      <p class="registration-form__status registration-form__field--wide" data-registration-status role="status" aria-live="polite">${configured
        ? ""
        : `Để đăng ký ngay, em có thể liên hệ qua Zalo ${contact.displayNumber}.`}</p>
    </form>`;
}

function readFormData(form) {
  const values = new FormData(form);
  return Object.fromEntries(FIELD_NAMES.map((name) => [name, String(values.get(name) ?? "")]));
}

function renderErrors(form, errors) {
  FIELD_NAMES.forEach((name) => {
    const input = form.elements.namedItem(name);
    const message = form.querySelector(`[data-registration-error="${name}"]`);
    const error = errors[name] ?? "";
    if (message) message.textContent = error;
    if (input) input.setAttribute("aria-invalid", String(Boolean(error)));
  });
  const firstInvalid = FIELD_NAMES.map((name) => form.elements.namedItem(name)).find((input) => input?.getAttribute("aria-invalid") === "true");
  firstInvalid?.focus();
}

export function initializeRegistrationForm(root, { gradeId = null, contact, config = registrationConfig } = {}) {
  if (!root || !contact) return null;
  const configured = isRegistrationConfigured(config);
  root.innerHTML = registrationFormMarkup({ gradeId, contact, configured });
  const form = root.querySelector("[data-registration-form]");
  const submitButton = form.querySelector("[data-registration-submit]");
  const status = form.querySelector("[data-registration-status]");
  let submitting = false;

  form.addEventListener("input", (event) => {
    const name = event.target.name;
    if (!FIELD_NAMES.includes(name)) return;
    event.target.setAttribute("aria-invalid", "false");
    const error = form.querySelector(`[data-registration-error="${name}"]`);
    if (error) error.textContent = "";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting || !configured) return;
    const data = readFormData(form);
    const errors = validateRegistrationData(data);
    renderErrors(form, errors);
    if (Object.keys(errors).length) {
      status.textContent = "Em kiểm tra lại các thông tin được đánh dấu nhé.";
      return;
    }

    submitting = true;
    submitButton.disabled = true;
    submitButton.textContent = "Đang gửi…";
    status.textContent = "Đang gửi thông tin đăng ký…";
    try {
      await submitRegistration(data, { config });
      form.reset();
      status.textContent = "BienEdu đã nhận được thông tin đăng ký của em. Cảm ơn em nhé!";
    } catch {
      status.textContent = "Chưa thể gửi đăng ký lúc này. Em thử lại hoặc liên hệ BienEdu qua Zalo nhé.";
    } finally {
      submitting = false;
      submitButton.disabled = false;
      submitButton.textContent = "Gửi đăng ký";
    }
  });

  return {
    form,
    configured,
    setFormat(format) {
      const field = form.elements.namedItem("format");
      if (!field || !["", "Online", "Trực tiếp"].includes(format)) return false;
      field.value = format;
      return true;
    }
  };
}
