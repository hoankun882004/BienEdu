const SUPPORTED_GRADES = Object.freeze(["9", "10", "11", "12"]);
const EMPTY_PAPER_LIST = Object.freeze([]);

/**
 * Shape reserved for verified practice-paper sources added later.
 *
 * @typedef {Object} PracticePaper
 * @property {string} id
 * @property {string} title
 * @property {string} subtitle
 * @property {number} durationMinutes
 * @property {number} numberOfQuestions
 * @property {string} scope
 * @property {string} difficulty
 * @property {"draft"|"available"} status
 * @property {boolean} available
 * @property {{ label: string, href: string } | null} source
 * @property {ReadonlyArray<object>} questions
 */

export const practicePapersByGrade = Object.freeze(
  Object.fromEntries(SUPPORTED_GRADES.map((gradeId) => [gradeId, EMPTY_PAPER_LIST]))
);

export function getPracticePapersForGrade(gradeId) {
  return practicePapersByGrade[String(gradeId)] ?? EMPTY_PAPER_LIST;
}

export function hasPracticePapers(gradeId) {
  return getPracticePapersForGrade(gradeId).length > 0;
}
