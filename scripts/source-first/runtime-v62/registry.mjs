// Correct provenance for independent editions; never replace earlier unit IDs.
export * from '../../../assets/js/data/content-registry.js';
import * as original from '../../../assets/js/data/content-registry.js';
import {overlayGroups} from '../../../assets/js/data/learning-overlay.js';
const sources=new Map(overlayGroups.flatMap(g=>g.examples.filter(e=>e.origin==='source-first-v6.2').map(e=>[e.id,{...g.source,pages:e.sourcePages}])));
const topics=Object.fromEntries(Object.entries(original.learningContentRegistry.topics).map(([id,topic])=>[id,{...topic,
  subtopics:Object.fromEntries(Object.entries(topic.subtopics).map(([code,record])=>[code,{...record,sections:{...record.sections,
    examples:{...record.sections.examples,units:record.sections.examples.units.map(unit=>{
      const source=sources.get(unit.id);return source?{...unit,source:{documentId:source.sourceId,filePath:source.file,
        sha256:source.sha256,sourceSha256:source.sha256,pages:source.pages,sourceEdition:source.sourceId,lines:[],section:code,sourceKind:'pdf',verification:'machine-structure-supported'}}:unit;
    })}
  }}]))
}]));
export const learningContentRegistry=Object.freeze({...original.learningContentRegistry,topics});
export const getTopicAvailability=id=>topics[id]??null;
export const getSubtopicAvailability=code=>Object.values(topics).find(t=>t.subtopics[code])?.subtopics[code]??null;
