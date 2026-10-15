const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function isInInitialViewport(element) {
  const bounds = element.getBoundingClientRect();
  return bounds.bottom >= 0 && bounds.top <= window.innerHeight * 0.92;
}

export function initializeHomeScrollExperience() {
  if (document.body.dataset.page !== "home") return;

  const revealElements = [...document.querySelectorAll("[data-home-reveal]")];
  if (!revealElements.length || reducedMotion() || !("IntersectionObserver" in window)) {
    revealElements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  revealElements.filter(isInInitialViewport).forEach((element) => element.classList.add("is-visible"));
  document.documentElement.classList.add("home-motion-enabled");

  const pendingElements = revealElements.filter((element) => !element.classList.contains("is-visible"));
  if (!pendingElements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });

  pendingElements.forEach((element) => observer.observe(element));
}
