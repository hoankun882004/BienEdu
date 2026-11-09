// Compatibility seam: retain the existing slide/progress implementation.
export * from '../../../assets/js/domain/lesson-workspace.js';
import {createLessonSlides as original} from '../../../assets/js/domain/lesson-workspace.js';
export function createLessonSlides(options){
  const exampleOnly=!options.reading&&!options.topicReading&&
    !options.approvedMathContent?.blocks?.some(b=>b.section==='knowledge')&&options.examples?.length;
  return original(exampleOnly?{...options,includeKnowledge:false}:options);
}
