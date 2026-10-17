import { curriculumGroups, curriculumMeta } from "./curriculum.js?v=8.2";
import { hasGradeContent } from "./grade-catalog.js?v=8.2";

const EMPTY_CURRICULUM = Object.freeze([]);

export function getCurriculumForGrade(gradeId) {
  if (!hasGradeContent(gradeId, "curriculum")) {
    return { groups: EMPTY_CURRICULUM, meta: null };
  }
  return { groups: curriculumGroups, meta: curriculumMeta };
}
