export const LESSON_SECTIONS = Object.freeze([
  { id: "knowledge", label: "Kiến thức" },
  { id: "example", label: "Ví dụ" },
  { id: "practice", label: "Bài tập" }
]);

export function createLessonSlides({ topic, exercise, knowledgeSection, questions = [] }) {
  if (!knowledgeSection) {
    return [{ id: "unavailable", section: "knowledge", label: "Nội dung", kind: "unavailable", title: exercise.title }];
  }
  return [
    ...knowledgeSection.knowledgeSlides.map((slide, index) => ({
      ...slide,
      id: slide.id,
      section: "knowledge",
      kind: "knowledge",
      label: "Kiến thức",
      index,
      title: exercise.title,
      topicId: topic.id,
      exerciseId: exercise.id
    })),
    ...knowledgeSection.exampleSlides.map((slide, index) => ({
      ...slide,
      id: slide.id,
      section: "example",
      kind: "example",
      label: "Ví dụ",
      index,
      title: exercise.title,
      topicId: topic.id,
      exerciseId: exercise.id
    })),
    ...questions.map((question, index) => ({
      id: question.id,
      section: "practice",
      kind: "practice",
      label: "Bài tập",
      index,
      question,
      title: exercise.title,
      topicId: topic.id,
      exerciseId: exercise.id
    }))
  ];
}

export function createLessonState(slides, section = "knowledge", item = 1) {
  const candidates = slides.filter((slide) => slide.section === section);
  const active = candidates[Math.max(0, Math.min(Number(item) - 1, candidates.length - 1))] || slides[0];
  return { currentIndex: Math.max(0, slides.indexOf(active)) };
}

export function selectLessonSlide(state, slideIndex, slideCount) {
  return { ...state, currentIndex: Math.min(Math.max(Number(slideIndex), 0), Math.max(slideCount - 1, 0)) };
}

export function getNextSlide(state, slideCount) {
  return selectLessonSlide(state, state.currentIndex + 1, slideCount);
}

export function getPreviousSlide(state, slideCount) {
  return selectLessonSlide(state, state.currentIndex - 1, slideCount);
}

export function getSectionPosition(slides, currentIndex) {
  const active = slides[currentIndex];
  const sectionSlides = slides.filter((slide) => slide.section === active.section);
  return { section: active.section, current: sectionSlides.findIndex((slide) => slide.id === active.id) + 1, total: sectionSlides.length };
}
