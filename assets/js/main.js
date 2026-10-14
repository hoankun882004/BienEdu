import { bindNavigation, renderLayout } from "./components/layout.js";
import { initializeMotion } from "./motion.js";

const page = document.body.dataset.page ?? "home";
renderLayout(page);
bindNavigation();
initializeMotion();

document.addEventListener("click", (event) => {
  const anchor = event.target.closest('a[href^="#"]');
  if (!anchor) return;
  const target = document.querySelector(anchor.getAttribute("href"));
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  target.focus({ preventScroll: true });
});
