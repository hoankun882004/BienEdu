import { bindNavigation, renderLayout } from "./components/layout.js?v=8.1";
import { initializeHomeScrollExperience } from "./home-motion.js?v=8.1";
import { initializeMotion, prefersReducedMotion } from "./motion.js?v=8.1";

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
  const targetId = decodeURIComponent(anchor.hash.slice(1));
  const target = targetId ? document.getElementById(targetId) : null;
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
  target.focus({ preventScroll: true });
});
