import {geometryActivation} from './data/geometry-activation.js';

export async function loadGeometryBundle(pointer){
  if(!pointer||!/^assets\/content\/geometry\/[A-F0-9]{64}\.json$/u.test(pointer.bundle)||!/^[A-F0-9]{64}$/u.test(pointer.sha256))throw Error('Invalid geometry release pointer');
  const response=await fetch('/'+pointer.bundle,{cache:'no-store'});if(!response.ok)throw Error('Geometry bundle unavailable');
  const bytes=await response.arrayBuffer(),digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
  if(digest!==pointer.sha256)throw Error('Geometry bundle hash mismatch');
  const bundle=JSON.parse(new TextDecoder().decode(bytes));if(bundle.schemaVersion!=='bienedu.geometry-bundle.v1'||bundle.candidates.length!==30)throw Error('Invalid geometry cohort');
  const {pdfKnowledgeRelease}=await import('./data/pdf-knowledge-release.js');if(bundle.knowledgeParent?.sha256!==pdfKnowledgeRelease.sha256||bundle.knowledgeParent?.bundle!==pdfKnowledgeRelease.bundle)throw Error('Geometry requires its exact knowledge parent; prepare a new continuation');return bundle;
}
export function geometryStyles(){if(document.querySelector('[data-geometry-style]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href='/assets/geometry.css';link.dataset.geometryStyle='';document.head.append(link);}
export async function geometryPointer(){
  if(geometryActivation)return geometryActivation;
  if(document.querySelector('meta[name="bienedu-geometry-preview"]')&&['127.0.0.1','localhost','[::1]'].includes(location.hostname)){
    const response=await fetch('/.audit/geometry-v1/preview.json',{cache:'no-store'});if(!response.ok)throw Error('Build geometry preview first');return response.json();
  }return null;
}
async function start(){
  if(!document.querySelector('[data-curriculum-app]'))return;
  const pointer=await geometryPointer();if(!pointer)return;
  const bundle=await loadGeometryBundle(pointer);geometryStyles();
  const {attachGeometry}=await import('./geometry-learner.js');window.bieneduGeometry=attachGeometry(bundle);
}
if(typeof document!=='undefined'){
  const launch=()=>start().catch(error=>{console.error('Geometry integration:',error.message);});launch();
  window.addEventListener('pageshow',event=>{if(event.persisted)launch();});
}
