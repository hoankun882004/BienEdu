import * as base from './example-content.js';
import {overlayGroups,legacyText,releaseBundle} from './learning-overlay.js';
export * from './example-content.js';
const added=Object.fromEntries(overlayGroups.map((g)=>[g.code,g.examples.map((e)=>({...e,prompt:legacyText(e.prompt),answer:legacyText(e.answer),steps:e.steps.map((s)=>({...s,expression:legacyText(s.expression)}))}))]));
const corrected=Object.fromEntries(Object.entries(base.exampleContent).map(([code,examples])=>[code,examples.map((record)=>{
  const changes=releaseBundle?.corrections?.filter((c)=>c.recordId===record.id)??[];if(!changes.length)return record;
  const copy=structuredClone(record);
  for(const change of changes){
    const target=change.fieldId==='source-solution.expression'?copy.steps.find((s)=>s.label==='Lời giải từ tài liệu'):copy;
    const key=change.fieldId==='source-solution.expression'?'expression':change.fieldId;
    if(target[key]!==change.before&&target[key]!==legacyText(change.after))return record;
    target[key]=legacyText(change.after);
  }return copy;
})]));
export const exampleContent=Object.freeze({...corrected,...added});
export const getExampleContent=(code)=>exampleContent[code]??null;
