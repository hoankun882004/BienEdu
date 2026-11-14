// Discover the actual slide model through the same import map as the learner.
// Never synthesize a missing lesson from the 39-topic catalog alone.
export async function discoverLearnerRoutes(page) {
  return page.evaluate(async () => {
    const {getCurriculumForGrade}=await import('/assets/js/data/curriculum-by-grade.js?v=8.2');
    const {getKnowledgeContent,getTopicKnowledgeContent,getProblemTypesForTopic}=await import('/assets/js/data/knowledge-content.js?v=19.0');
    const {getExampleContent}=await import('/assets/js/data/example-content.js?v=19.0');
    const {getApprovedMathContent}=await import('/assets/js/data/approved-math-content.js?v=14.0');
    const {getSubtopicAvailability,CONTENT_STATUS}=await import('/assets/js/data/content-registry.js?v=15.0');
    const {createLessonSlides,createTopicKnowledgeSlides}=await import('/assets/js/domain/lesson-workspace.js?v=17.1');
    const {buildActivePracticeSet}=await import('/assets/js/domain/practice-bank.js?v=15.0');
    const routes=[],unavailable=[],topics=getCurriculumForGrade('12').groups.flatMap(g=>g.topics);
    const url=(topic,type,section,item)=>'/documents.html?'+new URLSearchParams({grade:'12',topic,...(type?{type}:{}),...(section?{section,item:String(item)}:{})});
    for(const topic of topics){
      routes.push({topic:topic.id,section:'topic',url:url(topic.id)});
      const topicReading=getTopicKnowledgeContent(topic.id),problemTypes=getProblemTypesForTopic(topic.id);
      for(const [i,slide]of createTopicKnowledgeSlides({topic,reading:topicReading}).entries())routes.push({topic:topic.id,section:'knowledge',item:i+1,kind:slide.kind,id:slide.id,url:url(topic.id,null,'knowledge',i+1)});
      for(const exercise of topic.exerciseTypes){
        const reading=getKnowledgeContent(exercise.code),approvedMathContent=getApprovedMathContent(exercise.code),examples=getExampleContent(exercise.code),contentRecord=getSubtopicAvailability(exercise.code);
        if(!reading&&!approvedMathContent&&!examples?.length){unavailable.push({topic:topic.id,type:exercise.code,reason:'No learner Knowledge, approved content or examples'});continue;}
        const questions=contentRecord?.sections.practice.status===CONTENT_STATUS.AVAILABLE?buildActivePracticeSet(exercise.code,'PRACTICE_V15'):[];
        const slides=createLessonSlides({topic,exercise,reading,approvedMathContent,examples,contentRecord,problemTypes,questions,includeKnowledge:!Boolean(topicReading&&problemTypes.some(p=>p.code===exercise.code))});
        const counts={};
        for(const slide of slides){const item=counts[slide.section]=(counts[slide.section]??0)+1;routes.push({topic:topic.id,type:exercise.code,section:slide.section,item,kind:slide.kind,id:slide.id,url:url(topic.id,exercise.code,slide.section,item)});}
        if(!questions.length)routes.push({topic:topic.id,type:exercise.code,section:'practice',item:1,kind:'practice-unavailable',url:url(topic.id,exercise.code,'practice',1)});
      }
    }
    return {topics:topics.map(t=>t.id),routes,unavailable,scope:'Actual learner slide routes; locked final exams tested separately'};
  });
}

export async function inspectLearnerLayout(page) {
  return page.evaluate(() => {
    const box=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect(),c=getComputedStyle(e);return {width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom,maxWidth:c.maxWidth,padding:c.padding,overflow:c.overflow};};
    return {innerWidth,scale:visualViewport.scale,overflow:document.documentElement.scrollWidth>innerWidth+1,
      workspace:box('.learning-workspace'),sidebar:box('.lesson-sidebar'),content:box('.lesson-content'),knowledge:box('.pdf-theory'),card:box('.pdf-theory__edition'),paragraph:box('.pdf-theory__paragraph'),example:box('.example-reader__content'),
      footer:box('[data-lesson-navigation]'),roadmap:box('[data-learner-roadmap]'),title:box('.workspace-heading'),mathErrors:document.querySelectorAll('.katex-error,.math-render-error').length,
      clippedContainers:[...document.querySelectorAll('.lesson-content,.example-reader__solution,.example-card,.practice-card,.workspace-heading h1')].filter(e=>/hidden|clip/.test(getComputedStyle(e).overflowX)&&e.scrollWidth>e.clientWidth+1).map(e=>e.className),
      analysis:[...document.querySelectorAll('.example-reader__analysis li')].map(e=>({display:getComputedStyle(e).display,font:parseFloat(getComputedStyle(e).fontSize)})),
      nestedVertical:[...document.querySelectorAll('.lesson-content,.example-reader,.math-lesson,.practice-stage,.problem-type-reader')].filter(e=>/auto|scroll/.test(getComputedStyle(e).overflowY)&&e.scrollHeight>e.clientHeight+1).map(e=>e.className)};
  });
}
