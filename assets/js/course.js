import { tutorProfile } from "./data/tutor-profile.js?v=8.1";

const dialog = document.querySelector("[data-registration-dialog]");
let registrationTrigger = null;

if (dialog) {
  dialog.innerHTML = `
    <div class="registration-dialog__panel">
      <form method="dialog"><button type="submit" aria-label="Đóng hướng dẫn đăng ký">×</button></form>
      <p class="section-eyebrow">Hướng dẫn đăng ký</p>
      <h2 id="registration-dialog-title">Đăng ký học như thế nào?</h2>
      <ol>
        <li><span>01</span><p><strong>Xem lộ trình</strong>Chọn chuyên đề hoặc phần kiến thức bạn đang cần hỗ trợ.</p></li>
        <li><span>02</span><p><strong>Nhắn thông tin</strong>Cho thầy biết lớp, mục tiêu và hình thức học mong muốn.</p></li>
        <li><span>03</span><p><strong>Chốt lịch học</strong>Thống nhất thời gian học trực tiếp tại Hà Nội hoặc học online.</p></li>
      </ol>
      <div class="registration-dialog__actions">
        <a class="zalo-button" href="${tutorProfile.contact.url}" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">Zalo</span><b>Trao đổi qua Zalo</b></a>
      </div>
    </div>`;

  const openRegistration = (trigger) => {
    registrationTrigger = trigger ?? null;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    dialog.querySelector("form button")?.focus();
  };

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-registration-open]");
    if (!trigger) return;
    openRegistration(trigger);
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener("close", () => registrationTrigger?.focus());

  if (new URLSearchParams(location.search).get("register") === "online") openRegistration();
}
