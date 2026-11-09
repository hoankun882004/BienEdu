import {localRelease} from './local-release.js';
const local=typeof location!=='undefined'&&['127.0.0.1','localhost','[::1]'].includes(location.hostname);
const query=local?new URL(location.href).searchParams:null;
if(query?.has('releasePreview'))sessionStorage.setItem('bienedu:local-preview:v6',query.get('releasePreview')==='v6'?'on':'off');
export const previewActive=local&&sessionStorage.getItem('bienedu:local-preview:v6')==='on';
const preview=previewActive;
export const releaseBundle=local&&(preview||localRelease)?await fetch(preview?'.audit/source-first-v5/release-v6/bundle.json':localRelease.bundle).then(async(r)=>{
  if(!r.ok)throw new Error('Local learning bundle unavailable');const bytes=await r.text();
  if(!preview){const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(bytes)))].map((b)=>b.toString(16).padStart(2,'0')).join('').toUpperCase();if(hash!==localRelease.bundleHash)throw new Error('Local learning bundle hash mismatch');}
  const payload=JSON.parse(bytes);if(payload.schemaVersion!=='bienedu.local-learning.v6')throw new Error('Unsupported local learning schema');return payload;
}).catch(()=>null):null;
// The immutable payload remains canonical; this compatibility adapter feeds the
// existing learner contract through its explicit-math path, not another renderer.
export function legacyText(node){
  if(typeof node==='string')return node;
  if(node?.type==='text')return node.value;
  if(node?.type==='math')return `${node.display?'\\[':'\\('}${node.latex}${node.display?'\\]':'\\)'}`;
  if(node?.type==='rich-text')return node.segments.map(legacyText).join('');
  throw new Error('Unsupported canonical educational content');
}
export const overlayGroups=releaseBundle?.groups??[];
