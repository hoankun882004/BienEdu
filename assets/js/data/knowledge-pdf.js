import * as previous from './knowledge-v6.js';
import {pdfKnowledgeRelease} from './pdf-knowledge-release.js';
import {articlesFor,attachPdfKnowledge} from './pdf-knowledge-model.js';
import {legacyText} from './learning-overlay.js';
export * from './knowledge-v6.js';

async function loadKnowledge() {
  if(typeof location==='undefined') return null;
  const response = await fetch(new URL(pdfKnowledgeRelease.bundle,document.baseURI));
  if(!response.ok) throw new Error('Không tải được kiến thức từ PDF');
  const bytes = await response.text();
  const actual = [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(bytes)))].map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();
  if(actual!==pdfKnowledgeRelease.sha256) throw new Error('Dữ liệu kiến thức PDF không khớp bản nhập');
  const data = JSON.parse(bytes);
  if(data.schemaVersion!=='bienedu.pdf-knowledge.v1') throw new Error('Unsupported PDF knowledge schema');
  return data;
}

export const pdfKnowledge = await loadKnowledge();
export const knowledgeContent = Object.freeze(Object.fromEntries([
  ...new Set([...Object.keys(previous.knowledgeContent),...(pdfKnowledge?.articles ?? []).flatMap(a=>a.targets).filter(key=>/^\d+\.\d+$/u.test(key))])
].map(code=>[code,attachPdfKnowledge(previous.getKnowledgeContent(code),articlesFor(pdfKnowledge,code))])));
export const getKnowledgeContent = code=>knowledgeContent[code] ?? null;
export const getProblemTypesForTopic = id=>previous.getProblemTypesForTopic(id).map(type=>{
  const articles=articlesFor(pdfKnowledge,type.code);
  const methods=articles.filter(a=>a.kind==='method'&&!a.unresolvedText);
  const notes=articles.filter(a=>a.kind==='notes'&&!a.unresolvedText);
  const asText=article=>article.blocks.filter(b=>b.kind==='paragraph').map(b=>legacyText(b.content)).join('\n\n');
  const method=methods.find(a=>a.source.sourceId.endsWith('-2026'))??methods[0];
  return {...type,...(method?{methodology:asText(method),sourceDocumentId:method.source.sourceId,sourcePages:method.sourcePages}:{}),
    ...(notes.length?{note:notes.map(asText).join('\n\n')}:{})};
});
export const getTopicKnowledgeContent = id=>{
  const reading=previous.getTopicKnowledgeContent(id);
  // A chapter introduction must not replace the existing per-type CD20/CD21
  // knowledge flow or change which progress namespace a lesson uses.
  return reading ? attachPdfKnowledge(reading,articlesFor(pdfKnowledge,id)) : null;
};
