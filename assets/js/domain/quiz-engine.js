export function createQuizState(questionCount) {
  return {
    currentIndex: 0,
    answers: Array(questionCount).fill(null),
    hintVisibility: Array(questionCount).fill(false),
    phase: "intro"
  };
}

export function answerQuestion(state, questionIndex, optionIndex) {
  const answers = [...state.answers];
  answers[questionIndex] = optionIndex;
  return { ...state, answers };
}

export function toggleHint(state, questionIndex) {
  const hintVisibility = [...state.hintVisibility];
  hintVisibility[questionIndex] = !hintVisibility[questionIndex];
  return { ...state, hintVisibility };
}

export function unansweredIndexes(answers) {
  return answers
    .map((answer, index) => (answer === null ? index : -1))
    .filter((index) => index >= 0);
}

export function scoreQuiz(questions, answers) {
  const details = questions.map((question, index) => ({
    questionId: question.id,
    selectedIndex: answers[index],
    correctIndex: question.correctIndex,
    isCorrect: answers[index] === question.correctIndex
  }));

  return {
    correct: details.filter((detail) => detail.isCorrect).length,
    total: questions.length,
    details
  };
}
