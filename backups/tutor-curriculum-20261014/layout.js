const navigation = [
  { id: "home", label: "Trang chủ", href: "index.html" },
  { id: "course", label: "Khóa học", href: "course.html" },
  { id: "documents", label: "Tài liệu", href: "documents.html" },
  { id: "quiz", label: "Kiểm tra", href: "quiz.html" },
  { id: "contact", label: "Liên hệ", href: "contact.html" }
];

const brand = `
  <a class="brand" href="index.html" aria-label="BienEdu, về trang chủ">
    <span class="brand__mark" aria-hidden="true"><i></i><i></i><i></i></span>
    <span>Bien<span>Edu</span></span>
  </a>`;

export function renderLayout(activePage) {
  const headerTarget = document.querySelector("[data-site-header]");
  const footerTarget = document.querySelector("[data-site-footer]");

  if (headerTarget) {
    headerTarget.innerHTML = `
      <header class="site-header">
        <div class="site-header__inner">
          ${brand}
          <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-navigation">Menu</button>
          <nav class="site-nav" id="site-navigation" aria-label="Điều hướng chính">
            ${navigation.map((item) => `
              <a href="${item.href}" ${item.id === activePage ? 'aria-current="page"' : ""}>${item.label}</a>
            `).join("")}
          </nav>
          <a class="button button--small header-action" href="quiz.html">Làm bài thử</a>
        </div>
      </header>`;
  }

  if (footerTarget) {
    footerTarget.innerHTML = `
      <footer class="site-footer">
        <div class="footer-mark" aria-hidden="true">BienEdu</div>
        <div class="footer-grid">
          <div>
            ${brand}
            <p>Nền tảng học Toán 12 tập trung vào kiến thức, luyện tập và tự kiểm tra.</p>
          </div>
          <nav aria-label="Điều hướng cuối trang">
            ${navigation.slice(1).map((item) => `<a href="${item.href}">${item.label}</a>`).join("")}
          </nav>
          <div>
            <p>Hiện chưa có thông tin liên hệ công khai hoặc hệ thống tiếp nhận biểu mẫu.</p>
            <a class="text-link" href="contact.html">Xem trạng thái liên hệ</a>
          </div>
        </div>
        <div class="footer-meta">
          <span>© 2026 BienEdu</span>
          <span>Ảnh minh họa học tập được tạo riêng cho dự án.</span>
        </div>
      </footer>`;
  }
}

export function bindNavigation() {
  const toggle = document.querySelector(".menu-toggle");
  const navigationElement = document.querySelector(".site-nav");
  if (!toggle || !navigationElement) return;

  const close = () => {
    toggle.setAttribute("aria-expanded", "false");
    navigationElement.classList.remove("is-open");
    document.body.classList.remove("menu-open");
  };

  toggle.addEventListener("click", () => {
    const willOpen = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(willOpen));
    navigationElement.classList.toggle("is-open", willOpen);
    document.body.classList.toggle("menu-open", willOpen);
  });

  navigationElement.addEventListener("click", (event) => {
    if (event.target.closest("a")) close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
}
