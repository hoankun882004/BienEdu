import { buildGradeAwareUrl } from "../domain/grade-context.js?v=8.2";

const NAVIGATION_ITEMS = [
  { id: "course", label: "Khóa học", href: "course.html" },
  { id: "documents", label: "Lộ trình", href: "documents.html" },
  { id: "quiz", label: "Kiểm tra", href: "quiz.html" },
  { id: "contact", label: "Gia sư", href: "contact.html" }
];

function brandMarkup(gradeId) {
  return `
  <a class="brand" href="${gradeId ? buildGradeAwareUrl("./", gradeId) : "./"}" aria-label="BienEdu, về trang chủ">
    <img src="assets/images/bienedu-logo.png" width="1672" height="941" alt="BienEdu">
  </a>`;
}

function renderNavigationLinks(activePage, gradeId) {
  return NAVIGATION_ITEMS.map((item) => `
    <a href="${gradeId ? buildGradeAwareUrl(item.href, gradeId) : item.href}" ${item.id === activePage ? 'aria-current="page"' : ""}>${item.label}</a>
  `).join("");
}

export function renderLayout(activePage, gradeId = null) {
  const headerTarget = document.querySelector("[data-site-header]");
  const footerTarget = document.querySelector("[data-site-footer]");

  if (headerTarget) {
    headerTarget.innerHTML = `
      <header class="site-header">
        <div class="site-header__inner">
          ${brandMarkup(gradeId)}
          <div class="site-header__tools">
            <button class="grade-switcher" type="button" data-grade-open aria-haspopup="dialog" aria-label="Đổi khối lớp"><span data-current-grade>${gradeId ? `Lớp ${gradeId}` : "Chọn lớp"}</span><b aria-hidden="true">⌄</b></button>
            <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-navigation">Menu</button>
          </div>
          <nav class="site-nav" id="site-navigation" aria-label="Điều hướng chính">
            ${renderNavigationLinks(activePage, gradeId)}
          </nav>
        </div>
      </header>`;
  }

  if (footerTarget) {
    footerTarget.innerHTML = `
      <footer class="site-footer">
        <div class="footer-grid">
          <div class="footer-brand">${brandMarkup(gradeId)}<p data-footer-grade-copy>${gradeId ? `Học Toán ${gradeId} theo đúng khối lớp của bạn.` : "Chọn khối lớp để bắt đầu học cùng BienEdu."}</p></div>
          <nav aria-label="Điều hướng cuối trang">${renderNavigationLinks(activePage, gradeId)}</nav>
        </div>
        <div class="footer-meta">
          <span>© 2026 BienEdu</span>
          <span data-footer-grade-label>${gradeId ? `Chương trình Toán ${gradeId}` : "Chương trình Toán THPT"}</span>
        </div>
      </footer>`;
  }
}

export function updateLayoutGrade(gradeId) {
  document.querySelectorAll("[data-current-grade]").forEach((element) => {
    element.textContent = `Lớp ${gradeId}`;
  });
  const footerCopy = document.querySelector("[data-footer-grade-copy]");
  const footerLabel = document.querySelector("[data-footer-grade-label]");
  if (footerCopy) footerCopy.textContent = `Học Toán ${gradeId} theo đúng khối lớp của bạn.`;
  if (footerLabel) footerLabel.textContent = `Chương trình Toán ${gradeId}`;
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
