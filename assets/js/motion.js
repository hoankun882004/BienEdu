export function initializeMotion() {
  const revealElements = document.querySelectorAll("[data-reveal]");
  if (!("IntersectionObserver" in window)) {
    revealElements.forEach((element) => element.classList.add("is-in"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

  revealElements.forEach((element) => observer.observe(element));
}
