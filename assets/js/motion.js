const DEFAULT_ROOT_MARGIN = "0px 0px -8% 0px";

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function revealElementsOnce(elements, {
  visibleClass = "is-in",
  threshold = 0.08,
  rootMargin = DEFAULT_ROOT_MARGIN
} = {}) {
  const revealElements = [...elements];
  if (!revealElements.length) return null;

  if (!("IntersectionObserver" in window)) {
    revealElements.forEach((element) => element.classList.add(visibleClass));
    return null;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add(visibleClass);
      observer.unobserve(entry.target);
    });
  }, { rootMargin, threshold });

  revealElements.forEach((element) => observer.observe(element));
  return observer;
}

export function initializeMotion() {
  return revealElementsOnce(document.querySelectorAll("[data-reveal]"));
}
