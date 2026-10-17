import { GRADE_CATALOG, getGrade } from "../data/grade-catalog.js?v=8.2";

export const SELECTED_GRADE_STORAGE_KEY = "bienedu:selected-grade:v1";
const LEARNING_PARAMETERS = ["topic", "type", "section", "item", "exam", "question"];

function parseUrl(url = globalThis.location?.href ?? "https://bienedu.local/") {
  return new URL(url, "https://bienedu.local/");
}

export function getGradeCatalog() {
  return GRADE_CATALOG;
}

export function getSelectedGrade(storage = globalThis.localStorage) {
  try {
    return getGrade(storage?.getItem(SELECTED_GRADE_STORAGE_KEY))?.id ?? null;
  } catch {
    return null;
  }
}

export function setSelectedGrade(gradeId, storage = globalThis.localStorage) {
  const grade = getGrade(gradeId);
  if (!grade) return null;
  try {
    storage?.setItem(SELECTED_GRADE_STORAGE_KEY, grade.id);
  } catch {
    // Selection remains valid for the current page when storage is restricted.
  }
  return grade.id;
}

export function resolveGradeFromUrl(url) {
  return getGrade(parseUrl(url).searchParams.get("grade"))?.id ?? null;
}

export function isGradeEntryUrl(url = globalThis.location?.href) {
  const currentUrl = parseUrl(url);
  const isHome = currentUrl.pathname === "/" || /\/index\.html$/i.test(currentUrl.pathname);
  return isHome && !resolveGradeFromUrl(currentUrl.href);
}

export function isLegacyGrade12Route(url) {
  const currentUrl = parseUrl(url);
  const isRoadmap = /\/documents\.html$/i.test(currentUrl.pathname);
  return isRoadmap && LEARNING_PARAMETERS.some((parameter) => currentUrl.searchParams.has(parameter));
}

export function resolveCurrentGrade({
  url = globalThis.location?.href,
  storage = globalThis.localStorage
} = {}) {
  const urlGrade = resolveGradeFromUrl(url);
  if (urlGrade) {
    setSelectedGrade(urlGrade, storage);
    return { gradeId: urlGrade, source: "url" };
  }

  if (isLegacyGrade12Route(url)) {
    setSelectedGrade("12", storage);
    return { gradeId: "12", source: "legacy-route" };
  }

  const storedGrade = getSelectedGrade(storage);
  return storedGrade
    ? { gradeId: storedGrade, source: "storage" }
    : { gradeId: null, source: "missing" };
}

export function buildGradeAwareUrl(href, gradeId, baseUrl = globalThis.location?.href) {
  const grade = getGrade(gradeId);
  if (!grade) return href;

  const url = parseUrl(new URL(href, baseUrl ?? "https://bienedu.local/").href);
  url.searchParams.set("grade", grade.id);
  if (grade.id !== "12") {
    LEARNING_PARAMETERS.forEach((parameter) => url.searchParams.delete(parameter));
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function normalizeGradeUrl(url, gradeId) {
  return buildGradeAwareUrl(parseUrl(url).href, gradeId, url);
}
