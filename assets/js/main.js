import { bindNavigation, renderLayout } from "./components/layout.js";
import { initializeHomeScrollExperience } from "./home-motion.js";
import { initializeMotion } from "./motion.js";

const isDuplicateHomeRoute = location.protocol !== "file:" && /\/index\.html$/i.test(location.pathname);

if (isDuplicateHomeRoute) {
  const canonical = new URL(location.href);
  canonical.pathname = canonical.pathname.replace(/index\.html$/i, "");
  location.replace(canonical.href);
} else {
  const page = document.body.dataset.page ?? "home";
  renderLayout(page);
  bindNavigation();
  if (page === "home") initializeHomeScrollExperience();
  else initializeMotion();
}

document.addEventListener("click", (event) => {
  const anchor = event.target.closest('a[href^="#"]');
  if (!anchor) return;
  const target = document.querySelector(anchor.getAttribute("href"));
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  target.focus({ preventScroll: true });
});
