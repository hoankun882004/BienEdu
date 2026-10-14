import { tutorProfile } from "./data/tutor-profile.js";
import { initializeMotion } from "./motion.js";

const root = document.querySelector("[data-tutor-profile]");

if (root) {
  root.innerHTML = `
    <section class="tutor-hero">
      <div class="tutor-hero__copy">
        <h1 class="lines">
          <span class="line"><span data-line style="--i:0">Thầy Trần</span></span>
          <span class="line"><span data-line style="--i:1">Thanh Tùng</span></span>
        </h1>
        <p class="tutor-role">${tutorProfile.title}</p>
        <p class="tutor-intro">Thầy sinh năm ${tutorProfile.birthYear}, tốt nghiệp ${tutorProfile.education.toLocaleLowerCase("vi")} và đã có ${tutorProfile.experience}.</p>
        <div class="hero-actions">
          <a class="button" href="documents.html">Xem lộ trình Toán 12</a>
        </div>
      </div>
      <figure class="tutor-portrait shutter is-in" data-reveal>
        <img src="assets/images/tran-thanh-tung-portrait.png" width="1152" height="1440" alt="Chân dung thầy Trần Thanh Tùng" fetchpriority="high">
      </figure>
    </section>

    <section class="teaching-section section" aria-labelledby="teaching-title">
      <header data-reveal>
        <h2 id="teaching-title">Hình thức học</h2>
        <p>Chọn cách học thuận tiện với bạn — gặp trực tiếp tại ${tutorProfile.area} hoặc học online khi ở xa.</p>
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

    <section class="study-gallery" aria-label="Hình ảnh minh họa môi trường học Toán, không phải ảnh cá nhân của gia sư">
      <img data-reveal src="assets/images/bienedu-course-notes.png" width="1536" height="1024" alt="Sổ ghi chép Toán trong hình ảnh minh họa học tập">
      <img data-reveal src="assets/images/bienedu-quiz.png" width="1536" height="1024" alt="Phiếu trắc nghiệm trong hình ảnh minh họa học tập">
      <img data-reveal src="assets/images/bienedu-documents.png" width="1024" height="1536" alt="Phiếu chuyên đề trong hình ảnh minh họa học tập">
      <img data-reveal src="assets/images/bienedu-hero-study.png" width="1536" height="1024" alt="Góc tự học trong hình ảnh minh họa học tập">
    </section>

    <section class="tutor-contact section" aria-labelledby="tutor-contact-title">
      <div data-reveal>
        <h2 id="tutor-contact-title">Kết nối với thầy Trần Thanh Tùng</h2>
      </div>
      <div class="tutor-contact__action" data-reveal>
        <p>Nếu cần trao đổi về cách học phù hợp, bạn có thể nhắn trực tiếp qua Zalo.</p>
        <a class="button" href="${tutorProfile.contact.url}" target="_blank" rel="noopener noreferrer" aria-label="Nhắn tin với thầy Trần Thanh Tùng qua Zalo">Nhắn qua Zalo</a>
      </div>
    </section>`;

  initializeMotion();
}
