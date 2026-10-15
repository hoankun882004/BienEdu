import { prefersReducedMotion, revealElementsOnce } from "./motion.js?v=8.1";

function isInInitialViewport(element) {
  const bounds = element.getBoundingClientRect();
  return bounds.bottom >= 0 && bounds.top <= window.innerHeight * 0.92;
}

export function initializeHomeScrollExperience() {
  if (document.body.dataset.page !== "home") return;

  const revealElements = [...document.querySelectorAll("[data-home-reveal]")];
  if (!revealElements.length || prefersReducedMotion() || !("IntersectionObserver" in window)) {
    revealElements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  revealElements.filter(isInInitialViewport).forEach((element) => element.classList.add("is-visible"));
  document.documentElement.classList.add("home-motion-enabled");

  const pendingElements = revealElements.filter((element) => !element.classList.contains("is-visible"));
  if (!pendingElements.length) return;

  revealElementsOnce(pendingElements, { visibleClass: "is-visible", threshold: 0.16 });
}
