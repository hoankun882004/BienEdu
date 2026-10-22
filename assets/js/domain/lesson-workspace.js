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
  knowledgeSection,
  knowledgePdfMapping = null,
  contentRecord = null,
  reading = null,
  examples = null,
  questions = [],
  sourceExercises = []
}) {
  if (!knowledgeSection && !knowledgePdfMapping) {
    return [{
      id: "unavailable",
      section: "knowledge",
      label: "Nội dung",
      kind: "unavailable",
      title: exercise.title
    }];
  }

  const sourcePages = [...new Set(knowledgeSection?.knowledgeSlides.flatMap((slide) => slide.sourcePages) ?? [])];
  const readingPages = reading?.pages ?? (reading ? [reading] : []);
  const knowledgeSlides = knowledgePdfMapping?.verified
    ? [{
        id: `${exercise.code}-knowledge-pdf`,
        sourcePages: knowledgePdfMapping.regions.map((region) => region.page),
        pdfMapping: knowledgePdfMapping
      }]
    : reading
    ? readingPages.map((readingPage, index) => ({
        ...knowledgeSection.knowledgeSlides[Math.min(index, knowledgeSection.knowledgeSlides.length - 1)],
        id: contentRecord?.sections.knowledge.units[index]?.id ?? `${exercise.code}-knowledge-${index + 1}`,
        sourcePages: readingPage.sourcePages ?? sourcePages,
        reading: readingPage,
        slideType: getKnowledgeSlideType(readingPage)
      }))
    : knowledgeSection.knowledgeSlides;
  const exampleSlides = examples
    ? examples.map((workedExample, index) => ({
        id: workedExample.id ?? contentRecord?.sections.examples.units[index]?.id ?? `${exercise.code}-example-${index + 1}`,
        sourcePages: workedExample.sourcePages,
        workedExample
      }))
    : knowledgeSection.exampleSlides;

  return [
    ...knowledgeSlides.map((slide, index) => ({
      ...slide,
      id: slide.id,
      section: "knowledge",
      kind: slide.pdfMapping ? "knowledge-pdf" : "knowledge",
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
