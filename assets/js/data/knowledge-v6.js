import * as base from './knowledge-content.js';
import {overlayGroups,legacyText} from './learning-overlay.js';
export * from './knowledge-content.js';
const readings=Object.fromEntries(overlayGroups.map((g)=>[g.code,{...g.knowledge,lead:legacyText(g.knowledge.lead),formulae:g.knowledge.formulae.map((f)=>({...f,value:legacyText(f.value),renderAsMath:false})),points:g.knowledge.points.map((p)=>({...p,text:legacyText(p.text)})),reviewStatus:'needs-review',contentVersion:g.contentVersion??'source-first-v6.0',sourceDocumentId:g.source.sourceId}]));
export const knowledgeContent=Object.freeze({...base.knowledgeContent,...readings});
export const getKnowledgeContent=(code)=>knowledgeContent[code]??null;
export const getProblemTypesForTopic=(id)=>{
  const types=new Map(base.getProblemTypesForTopic(id).map((t)=>[t.code,t]));
  for(const g of overlayGroups.filter((g)=>g.topicId===id))types.set(g.code,g.method);
  return [...types.values()].sort((a,b)=>a.code.localeCompare(b.code,undefined,{numeric:true}));
};
