import fs from 'node:fs';
import assert from 'node:assert/strict';
import {sourceOracles,trigonometryCells} from '../../tests/fixtures/fidelity-v2.mjs';
import {pdfKnowledgeRelease} from '../../assets/js/data/pdf-knowledge-release.js';
import {localRelease} from '../../assets/js/data/local-release.js';
import {normalizeMath,validateMath} from '../../assets/js/components/canonical-math.js';
import {read,output,hash,json,runtimeHashes} from './conversion-recovery.mjs';
const dir='.audit/stabilization-v2';fs.mkdirSync(dir,{recursive:true});
const current=read(pdfKnowledgeRelease.bundle),candidate=read(read(output+'/summary.json').candidate.knowledge.bundle),overlay=read(localRelease.bundle);
const math=n=>n?.type==='math'?[n.latex]:n?.type==='rich-text'?n.segments.flatMap(math):[];
const known=[];
const old=read('tests/fixtures/cd01-source-knowledge.json');
for(const b of old.blocks)known.push(['cd01-cd07-functions:CD01:knowledge',old.page,b.suffix,b.math]);
known.push(...sourceOracles);
const checks=[];
for(const [id,page,suffix,expected]of known){
  const a=current.articles.find(a=>a.id===id),c=candidate.articles.find(a=>a.id===id),block=a.blocks.find(b=>b.id.endsWith(':block:'+suffix)),next=c.blocks.find(b=>b.id===block.id);
  assert.equal(hash(fs.readFileSync(a.source.file)),a.source.sha256);assert.equal(block.page,page);assert.equal(next.glyphHash,block.glyphHash);
  assert.deepEqual(math(next.content),expected,block.id);expected.forEach(l=>assert.equal(validateMath(l).valid,true));
  checks.push({id:block.id,source:a.source,page,glyphHash:block.glyphHash,route:route(a.targets[0]),expected,current:math(block.content),currentMatched:JSON.stringify(math(block.content))===JSON.stringify(expected),candidateMatched:true,editorialApproval:false});
}
const table=current.articles.find(a=>a.id==='cd15-cd16-trigonometry-2026:15.1:knowledge').blocks.find(b=>b.kind==='table');
const flat=n=>n.type==='text'?n.value:n.type==='math'?n.latex:n.segments.map(flat).join('');
assert.deepEqual(table.rows.map(row=>row.map(flat)),trigonometryCells);
const example=overlay.groups.find(g=>g.code==='17.1').examples.find(e=>e.id==='17.1-source-example-1');
assert.deepEqual(math(example.prompt),['u_n=2n+1',String.raw`n\ge1`,'u_5']);assert.deepEqual(math(example.steps[0].expression),['n=5','u_5=11']);
assert.equal(example.statementSourcePage,2);assert.equal(example.solutionSourcePage,13);
function route(code,section='knowledge',item=1){return `/documents.html?grade=12&topic=${code.startsWith('CD')?code.split('-')[0]:'CD'+code.split('.')[0]}${code.startsWith('CD')?'':'&type='+code}&section=${section}&item=${item}`;}
const nodes=[],metadata=[];
function walk(n,context,path){if(!n||typeof n!=='object')return;if(n.type==='math'){nodes.push({...context,nodeId:context.recordId+path,canonical:n.latex,risk:/\\(?:frac|sqrt|int|lim|begin)|[_^]\{/u.test(n.latex)?'P0':/\\(?:log|sin|cos|overrightarrow|sum)|=.+[=]/u.test(n.latex)?'P1':'P2',syntaxValid:validateMath(n.latex).valid,status:'NOT_YET_CHECKED'});return;}for(const [k,v]of Object.entries(n))if(v&&typeof v==='object'){if(Array.isArray(v))v.forEach((x,i)=>walk(x,context,path+'/'+k+'/'+i));else walk(v,context,path+'/'+k);}}
for(const a of current.articles)for(const b of a.blocks){const ctx={recordId:b.id,source:a.source,page:b.page,route:route(a.targets[0]),rendering:'PDF_SOURCE_EDITION',glyphHash:b.glyphHash};if(b.kind==='paragraph')walk(b.content,ctx,'/content');else if(b.kind==='table')b.rows.forEach((r,i)=>r.forEach((n,j)=>walk(n,ctx,`/rows/${i}/${j}`)));else metadata.push(b.id);}
for(const g of overlay.groups){
  const pdfPrimary=current.articles.some(a=>a.kind==='knowledge'&&a.unresolvedText===0&&a.targets.includes(g.code));
  if(pdfPrimary)metadata.push(g.knowledge?.id);else if(g.knowledge)walk(g.knowledge,{recordId:g.knowledge.id,source:g.source,route:route(g.code),rendering:'FALLBACK_KNOWLEDGE'},'');
  walk(g.method,{recordId:g.code+':method',source:g.source,route:route(g.code,'types'),rendering:'METHOD'},'');
  for(const [index,e]of g.examples.entries()){
    const ctx={recordId:e.id,source:g.source,pages:e.sourcePages,route:route(g.code,'example',index+1),rendering:'WORKED_EXAMPLE',evidence:e.sourceEvidence};
    walk(e.prompt,ctx,'/prompt');walk(e.steps,ctx,'/steps');
    if(e.steps.some(s=>JSON.stringify(s.expression)===JSON.stringify(e.answer)))metadata.push(e.id+':answer-copy');else walk(e.answer,ctx,'/answer');
  }
}
for(const n of nodes){const c=checks.find(c=>c.id===n.recordId);if(c)n.status=c.expected.includes(n.canonical)?'SOURCE_MATCHED':'CONFIRMED_CONVERSION_ERROR';if(n.recordId===table.id||n.recordId===example.id)n.status='SOURCE_MATCHED';}
assert.ok(nodes.every(n=>n.syntaxValid));const unique=new Map(nodes.map(n=>[JSON.stringify([n.source?.sourceId,n.source?.sha256??n.source?.sourceHash,n.nodeId]),n]));
const report={schemaVersion:'bienedu.quality.v2',status:'PARTIAL',runtimeHashes:runtimeHashes(),activeUniqueRenderedPositions:unique.size,renderEligibleOccurrences:nodes.length,metadataExcluded:metadata.length,
  independentMathNodes:checks.reduce((s,c)=>s+c.expected.length,0),activeSourceMatchedNodes:checks.reduce((s,c)=>s+c.expected.filter((l,i)=>l===c.current[i]).length,0),independentTableCells:30,
  independentExampleMathNodes:5,statementSolution:{id:example.id,statementPage:2,solutionPage:13,passed:true},
  risk:Object.fromEntries(['P0','P1','P2'].map(p=>[p,[...unique.values()].filter(n=>n.risk===p).length])),checks,
  exceptions:read(output+'/inventory.json').filter(n=>n.status==='SOURCE_AMBIGUOUS').map(n=>({recordId:n.recordId,source:n.source,location:n.location,status:n.status,reason:n.error})),
  limitations:['Render-eligible source positions, not a count of distinct algebraic identities or simultaneously visible DOM nodes. Source editions/methods can be collapsed.','Legacy plain-text practice and graph-label strings outside canonical payloads are not blanket source-certified.','Historical projections reused, not counted as live defects. No human editorial approval.']};
fs.writeFileSync(dir+'/fidelity.json',json(report));fs.writeFileSync(dir+'/active-nodes.json',json([...unique.values()]));
console.log(json({...report,checks:undefined,exceptions:undefined}));
