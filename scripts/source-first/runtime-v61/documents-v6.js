import * as base from './document-mappings.js';
import {overlayGroups} from './learning-overlay.js';
export * from './document-mappings.js';
export function getDocumentForTopic(id){
  const existing=base.getDocumentForTopic(id);if(existing)return existing;
  const groups=overlayGroups.filter((g)=>g.topicId===id),group=groups[0];if(!group)return null;
  return {topicId:id,documentId:group.source.sourceId,filePath:group.source.file,
    fileName:group.source.file.split('/').at(-1),sourceSha256:group.source.sha256,
    pageCount:group.source.pageCount??21,sourceKind:'pdf',mimeType:'application/pdf',availabilityStatus:'available',
    verification:{status:'machine-source-checked'},exercisePages:Object.fromEntries(groups.map((g)=>[g.code,g.source.page]))};
}
