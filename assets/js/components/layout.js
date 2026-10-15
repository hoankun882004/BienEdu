const NAVIGATION_ITEMS = [
  { id: "course", label: "Khóa học", href: "course.html" },
  { id: "documents", label: "Lộ trình", href: "documents.html" },
  { id: "quiz", label: "Kiểm tra", href: "quiz.html" },
  { id: "contact", label: "Gia sư", href: "contact.html" }
];

const BRAND_MARKUP = `
  <a class="brand" href="./" aria-label="BienEdu, về trang chủ">
    <img src="assets/images/bienedu-logo.png" width="1672" height="941" alt="BienEdu">
  </a>`;

function renderNavigationLinks(activePage) {
  return NAVIGATION_ITEMS.map((item) => `
    <a href="${item.href}" ${item.id === activePage ? 'aria-current="page"' : ""}>${item.label}</a>
  `).join("");
}

export function renderLayout(activePage) {
  const headerTarget = document.querySelector("[data-site-header]");
  const footerTarget = document.querySelector("[data-site-footer]");

  if (headerTarget) {
    headerTarget.innerHTML = `
      <header class="site-header">
        <div class="site-header__inner">
          ${BRAND_MARKUP}
          <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-navigation">Menu</button>
          <nav class="site-nav" id="site-navigation" aria-label="Điều hướng chính">
            ${renderNavigationLinks(activePage)}
          </nav>
        </div>
      </header>`;
  }

  if (footerTarget) {
    footerTarget.innerHTML = `
      <footer class="site-footer">
        <div class="footer-grid">
          <div class="footer-brand">${BRAND_MARKUP}<p>Học Toán 12 theo từng phần, có lộ trình và lời giải rõ ràng.</p></div>
          <nav aria-label="Điều hướng cuối trang">${renderNavigationLinks(activePage)}</nav>
        </div>
        <div class="footer-meta">
          <span>© 2026 BienEdu</span>
          <span>Chương trình Toán 12</span>
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
