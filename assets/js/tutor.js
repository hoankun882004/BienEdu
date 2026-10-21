import { tutorProfile } from "./data/tutor-profile.js?v=8.8";
import { initializeMotion } from "./motion.js?v=8.2";

const root = document.querySelector("[data-tutor-profile]");

if (root) {
  root.innerHTML = `
    <section class="tutor-hero">
      <div class="tutor-hero__copy">
        <h1 class="lines">
          <span class="line"><span data-line style="--i:0">Đăng ký học</span></span>
        </h1>
        <p class="tutor-role">${tutorProfile.courseTitle}</p>
        <p class="tutor-intro">Thầy sinh năm ${tutorProfile.birthYear}, tốt nghiệp ${tutorProfile.education} và đã có ${tutorProfile.experience}.</p>
        <div class="hero-actions">
          <a class="button" href="${tutorProfile.contact.url}" target="_blank" rel="noopener noreferrer">Đăng ký qua Zalo</a>
        </div>
      </div>
      <figure class="tutor-portrait shutter is-in" data-reveal>
        <img src="assets/images/tran-thanh-tung-portrait.png" width="1152" height="1440" alt="Chân dung thầy Trần Thanh Tùng" fetchpriority="high">
      </figure>
    </section>

    <section class="teaching-section section" aria-labelledby="teaching-title">
      <header data-reveal>
        <h2 id="teaching-title">Chọn hình thức học</h2>
        <p>Chọn cách học thuận tiện, sau đó nhắn qua Zalo để trao đổi lớp học và thời gian phù hợp.</p>
      </header>
      <div class="teaching-bands">
        <article class="teaching-band" data-reveal>
          <div class="teaching-band__type"><strong>${tutorProfile.area}</strong><span>Học trực tiếp</span></div>
          <div><h3>Học trực tiếp</h3><p>Trao đổi ngay trong buổi học, thuận tiện khi cần chữa bài và hỏi lại phần chưa hiểu.</p></div>
        </article>
        <article class="teaching-band" data-reveal>
          <div class="teaching-band__type"><strong>Linh hoạt địa điểm</strong><span>Học online</span></div>
          <div><h3>Học trực tuyến</h3><p>Phù hợp với học sinh ở xa hoặc muốn chủ động hơn về việc di chuyển.</p></div>
        </article>
      </div>
    </section>

    <a class="zalo-chat-bubble" href="${tutorProfile.contact.url}" target="_blank" rel="noopener noreferrer" aria-label="Nhắn tin với thầy Trần Thanh Tùng qua Zalo">
      <span aria-hidden="true">Zalo</span>
      <small>Nhắn tin qua Zalo</small>
    </a>`;

  initializeMotion();
}
