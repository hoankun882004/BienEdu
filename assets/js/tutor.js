import { initializeRegistrationForm } from "./components/registration-form.js?v=16.1";
import { learningRegistrationConfig } from "./data/registration-config.js?v=16.1";
import { getSelectedGrade } from "./domain/grade-context.js?v=8.2";
import { initializeMotion } from "./motion.js?v=8.2";

const root = document.querySelector("[data-registration-page]");
const { contact, offlineServiceArea } = learningRegistrationConfig;

function iconMarkup(type) {
  if (type === "online") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"></rect><path d="M8 21h8M12 17v4"></path></svg>`;
  }
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>`;
}

function zaloButtonMarkup(className = "zalo-button") {
  return `<a class="${className}" href="${contact.url}" target="_blank" rel="noopener noreferrer" aria-label="Liên hệ BienEdu qua Zalo ${contact.displayNumber} (mở trong thẻ mới)">
    <span aria-hidden="true">Zalo</span><b>Liên hệ qua Zalo</b>
  </a>`;
}

if (root) {
  const gradeId = document.body.dataset.grade ?? getSelectedGrade();
  root.innerHTML = `
    <section class="registration-hero section" aria-labelledby="registration-page-title">
      <div class="registration-hero__copy" data-reveal>
        <p class="section-eyebrow">Hình thức học &amp; Đăng ký</p>
        <h1 id="registration-page-title">Chọn cách học phù hợp với em.</h1>
        <p>Học Online tại nhà hoặc trao đổi để sắp xếp lớp trực tiếp tại Hà Nội. BienEdu chỉ cần vài thông tin cơ bản để tư vấn cách học phù hợp.</p>
      </div>
      <dl class="registration-hero__summary" aria-label="Thông tin đăng ký" data-reveal>
        <div><dt>02</dt><dd>hình thức học</dd></div>
        <div><dt>03</dt><dd>bước đăng ký</dd></div>
        <div><dt>Zalo</dt><dd>kênh liên hệ nhanh</dd></div>
      </dl>
    </section>

    <section class="learning-options section" id="learning-options" aria-labelledby="learning-options-title">
      <header class="learning-options__heading" data-reveal>
        <p class="section-eyebrow">Hình thức học</p>
        <h2 id="learning-options-title">Chọn cách học thuận tiện</h2>
        <p>Cả hai lựa chọn đều được trao đổi kỹ hơn trước khi xác nhận lịch học.</p>
      </header>
      <div class="learning-options__grid">
        <article class="learning-format-card learning-format-card--online" data-reveal>
          <div class="learning-format-card__icon">${iconMarkup("online")}</div>
          <div class="learning-format-card__body">
            <p class="learning-format-card__label">Học từ xa</p>
            <h3>Học trực tuyến</h3>
            <p>Học Toán thuận tiện tại nhà, dễ dàng trao đổi và ôn luyện theo từng dạng bài.</p>
            <dl class="learning-format-card__facts">
              <div><dt>Hình thức</dt><dd>Online</dd></div>
              <div><dt>Lịch học</dt><dd>Trao đổi khi đăng ký</dd></div>
              <div><dt>Khối lớp</dt><dd>Lớp 10–12</dd></div>
            </dl>
          </div>
          <a class="button learning-format-card__action" href="#registration" data-format-select="Online">Đăng ký học Online</a>
        </article>

        <article class="learning-format-card learning-format-card--offline" data-reveal>
          <div class="learning-format-card__icon">${iconMarkup("offline")}</div>
          <div class="learning-format-card__body">
            <p class="learning-format-card__label">Học cùng nhau</p>
            <h3>Học trực tiếp</h3>
            <p>Học trực tiếp và trao đổi bài tập ngay trong quá trình học.</p>
            <dl class="learning-format-card__facts">
              <div><dt>Hình thức</dt><dd>Trực tiếp</dd></div>
              <div><dt>Khu vực</dt><dd>${offlineServiceArea}</dd></div>
              <div><dt>Địa điểm</dt><dd>Trao đổi khi đăng ký</dd></div>
            </dl>
          </div>
          <a class="button button--secondary learning-format-card__action" href="#registration" data-format-select="Trực tiếp">Đăng ký học trực tiếp</a>
        </article>
      </div>
    </section>

    <section class="registration-guide section" aria-labelledby="registration-guide-title">
      <header class="registration-guide__heading" data-reveal>
        <p class="section-eyebrow">Cách đăng ký học</p>
        <h2 id="registration-guide-title">Ba bước để bắt đầu</h2>
      </header>
      <ol class="registration-guide__steps">
        <li data-reveal><span>01</span><div><h3>Chọn hình thức học</h3><p>Chọn học Online hoặc học trực tiếp theo nhu cầu của em.</p></div></li>
        <li data-reveal><span>02</span><div><h3>Gửi thông tin đăng ký</h3><p>Điền thông tin cơ bản để BienEdu có thể liên hệ tư vấn.</p></div></li>
        <li data-reveal><span>03</span><div><h3>Trao đổi và xác nhận</h3><p>BienEdu sẽ liên hệ để trao đổi hình thức, lịch học và thông tin cần thiết.</p></div></li>
      </ol>
    </section>

    <section class="registration-section section" id="registration" tabindex="-1" aria-labelledby="registration-title">
      <header class="registration-section__heading" data-reveal>
        <p class="section-eyebrow">Đăng ký học</p>
        <h2 id="registration-title">Gửi thông tin để được tư vấn</h2>
        <p>Chỉ cần họ tên, lớp và số điện thoại hoặc Zalo. BienEdu không yêu cầu thêm thông tin cá nhân không cần thiết.</p>
      </header>
      <div class="registration-section__layout">
        <div class="registration-card" data-registration-form-root data-reveal></div>
        <aside class="registration-contact" data-reveal aria-labelledby="registration-contact-title">
          <p class="section-eyebrow">Liên hệ nhanh</p>
          <h3 id="registration-contact-title">Cần tư vấn qua Zalo?</h3>
          <p>Nếu em hoặc phụ huynh muốn hỏi thêm về hình thức học, lịch học hay cách đăng ký, hãy liên hệ BienEdu qua Zalo.</p>
          ${zaloButtonMarkup("zalo-button zalo-button--contact")}
          <span>${contact.displayNumber}</span>
        </aside>
      </div>
    </section>`;

  const registration = initializeRegistrationForm(root.querySelector("[data-registration-form-root]"), {
    gradeId,
    contact
  });

  root.querySelectorAll("[data-format-select]").forEach((link) => {
    link.addEventListener("click", () => {
      registration?.setFormat(link.dataset.formatSelect ?? "");
    });
  });

  initializeMotion();

  if (["#learning-options", "#registration"].includes(location.hash)) {
    requestAnimationFrame(() => {
      const target = document.querySelector(location.hash);
      target?.scrollIntoView({ block: "start" });
      target?.focus({ preventScroll: true });
    });
  }
}
