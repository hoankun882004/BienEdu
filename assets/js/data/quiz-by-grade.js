import { quizQuestions } from "./quiz-data.js?v=8.2";
import { hasGradeContent } from "./grade-catalog.js?v=8.2";

const EMPTY_QUIZ = Object.freeze([]);

export function getQuizForGrade(gradeId) {
  return hasGradeContent(gradeId, "quiz") ? quizQuestions : EMPTY_QUIZ;
}
