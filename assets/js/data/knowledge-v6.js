import * as base from './knowledge-content.js';
import {overlayGroups,legacyText} from './learning-overlay.js';
export * from './knowledge-content.js';
const readings=Object.fromEntries(overlayGroups.filter(g=>g.knowledge&&g.mergeMode!=='append-independent-source').map(g=>[g.code,{...g.knowledge,lead:legacyText(g.knowledge.lead),formulae:g.knowledge.formulae.map(f=>({...f,value:legacyText(f.value),renderAsMath:false})),points:g.knowledge.points.map(p=>({...p,text:legacyText(p.text)})),reviewStatus:'needs-review',contentVersion:g.contentVersion,sourceDocumentId:g.source.sourceId}]));
export const knowledgeContent=Object.freeze({...base.knowledgeContent,...readings});
export const getKnowledgeContent=code=>knowledgeContent[code]??null;
export const getProblemTypesForTopic=id=>{const types=new Map(base.getProblemTypesForTopic(id).map(t=>[t.code,t]));for(const g of overlayGroups.filter(g=>g.topicId===id&&g.method&&g.mergeMode!=='append-independent-source'))types.set(g.code,{...g.method,exampleCount:g.examples.length,solutionCount:g.examples.filter(e=>e.steps?.length).length});return [...types.values()].sort((a,b)=>a.code.localeCompare(b.code,undefined,{numeric:true}));};
