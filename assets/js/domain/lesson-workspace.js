export const KNOWLEDGE_SLIDE_TYPES = Object.freeze([
  "concept",
  "definition",
  "formula",
  "properties",
  "method",
  "steps",
  "comparison",
  "recognition",
  "common-mistakes",
  "summary",
  "diagram"
]);

export function getKnowledgeSlideType(reading = {}) {
  if (KNOWLEDGE_SLIDE_TYPES.includes(reading.type)) return reading.type;
  const formulae = reading.formulae ?? [];
  const points = reading.points ?? [];
  if (formulae.length) return "formula";
  if (points.length > 1) return "method";
  if (reading.note?.tone === "warning") return "common-mistakes";
  if (points.length === 1) return "recognition";
  return "concept";
}

export function createLessonSlides({
  topic,
  exercise,
  approvedMathContent = null,
  contentRecord = null,
  reading = null,
  examples = null,
  questions = [],
  sourceExercises = []
}) {
  const hasApprovedKnowledge = approvedMathContent?.verification?.status === "verified"
    && approvedMathContent.blocks?.some((block) => block.section === "knowledge");
  if (!reading && !hasApprovedKnowledge) {
    return [{
      id: "unavailable",
      section: "knowledge",
      label: "Nội dung",
      kind: "unavailable",
      title: exercise.title
    }];
  }

  const readingPages = reading?.pages ?? (reading ? [reading] : []);
  const knowledgeSlides = reading
    ? readingPages.map((readingPage, index) => ({
        id: contentRecord?.sections.knowledge.units[index]?.id ?? `${exercise.code}-knowledge-${index + 1}`,
        sourcePages: readingPage.sourcePages ?? [],
        reading: readingPage,
        approvedMathContent: index === 0 && hasApprovedKnowledge ? approvedMathContent : null,
        slideType: getKnowledgeSlideType(readingPage)
      }))
    : [{
        id: contentRecord?.sections.knowledge.units[0]?.id ?? `${exercise.code}-knowledge-1`,
        sourcePages: approvedMathContent.source.pages,
        approvedMathContent
      }];
  const exampleSlides = examples
    ? examples.map((workedExample, index) => ({
        id: workedExample.id ?? contentRecord?.sections.examples.units[index]?.id ?? `${exercise.code}-example-${index + 1}`,
        sourcePages: workedExample.sourcePages,
        workedExample
      }))
    : [];

  return [
    ...knowledgeSlides.map((slide, index) => ({
      ...slide,
      id: slide.id,
      section: "knowledge",
      kind: "knowledge-markdown",
      label: "Kiến thức",
      index,
      title: exercise.title,
      topicId: topic.id,
      exerciseId: exercise.id
    })),
    ...exampleSlides.map((slide, index) => ({
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
    })),
    ...sourceExercises.map((sourceExercise, index) => ({
      id: sourceExercise.id,
      section: "practice",
      kind: "source-practice",
      label: "Bài tập nguồn",
      index: questions.length + index,
      sourceIndex: index,
      sourceExercise,
      title: exercise.title,
      topicId: topic.id,
      exerciseId: exercise.id
    }))
  ];
}

export function createLessonState(slides, section = "knowledge", item = 1) {
  const candidates = slides.filter((slide) => slide.section === section);
  const requestedIndex = Math.max(0, Math.min(Number(item) - 1, candidates.length - 1));
  const active = candidates[requestedIndex] || slides[0];
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
  return {
    section: active.section,
    current: sectionSlides.findIndex((slide) => slide.id === active.id) + 1,
    total: sectionSlides.length
  };
}
