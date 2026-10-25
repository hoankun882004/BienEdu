import { bindNavigation, renderLayout, updateLayoutGrade } from "./components/layout.js?v=8.8";
import { applyGradePage } from "./components/grade-page.js?v=8.7";
import { initializeGradeSelector } from "./components/grade-selector.js?v=8.2";
import {
  normalizeGradeUrl,
  resolveCurrentGrade,
  setSelectedGrade
} from "./domain/grade-context.js?v=8.2";
import { initializeHomeScrollExperience } from "./home-motion.js?v=8.2";
import { initializeMotion, prefersReducedMotion } from "./motion.js?v=8.2";

const isDuplicateHomeRoute = location.protocol !== "file:" && /\/index\.html$/i.test(location.pathname);

if (isDuplicateHomeRoute) {
  const canonical = new URL(location.href);
  canonical.pathname = canonical.pathname.replace(/index\.html$/i, "");
  location.replace(canonical.href);
} else {
  const page = document.body.dataset.page ?? "home";
  const gradeResolution = resolveCurrentGrade();
  let currentGradeId = gradeResolution.gradeId;

  if (currentGradeId) {
    const normalizedUrl = normalizeGradeUrl(location.href, currentGradeId);
    if (`${location.pathname}${location.search}${location.hash}` !== normalizedUrl) {
      history.replaceState(null, "", normalizedUrl);
    }
  }

  renderLayout(page, currentGradeId);
  bindNavigation();
  if (currentGradeId) applyGradePage(page, currentGradeId);

  const gradeSelector = initializeGradeSelector({
    gradeId: currentGradeId,
    onGradeChange(nextGradeId) {
      currentGradeId = setSelectedGrade(nextGradeId);
      const nextUrl = normalizeGradeUrl(location.href, currentGradeId);

      if (page !== "home") {
        location.replace(nextUrl);
        return;
      }

      history.replaceState(null, "", nextUrl);
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      updateLayoutGrade(currentGradeId);
      gradeSelector.syncGrade(currentGradeId);
      applyGradePage(page, currentGradeId);
    }
  });

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
