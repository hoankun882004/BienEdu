import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {root,work} from './build.mjs';
import {digest} from './model.mjs';
import {validateContent} from '../../assets/js/components/canonical-math.js';
import {mathContentMarkup} from '../../assets/js/components/canonical-math-renderer.js';
import {exampleContent as originalExamples} from '../../assets/js/data/example-content.js';
import {getCurriculumForGrade} from '../../assets/js/data/curriculum-by-grade.js';
import {legacy} from './content-v61.mjs';
export const output='.audit/source-first-v5/release-v62';
const read=p=>JSON.parse(readFileSync(join(root,p),'utf8'));
export const maths=n=>n?.type==='math'?[n.latex]:(n?.segments??[]).flatMap(maths);
function validate(node){
  const result=validateContent(node);if(!result.valid)return result.errors;
  try{assert.ok(!/katex-error|math-render-error/u.test(mathContentMarkup(node)));return [];}catch(e){return ['CANONICAL_OR_KATEX:'+e.message];}
}
const catalog=new Map(getCurriculumForGrade('12').groups.flatMap(g=>g.topics).flatMap(t=>t.exerciseTypes.map(e=>[e.code,e])));
// These are explicit semantic mappings to catalog problem types, NOT claims
// that the two independent calculus editions have equivalent examples.
const editionAliases={
  '12.9':['Nguyên hàm thỏa điều kiện ban đầu','Tìm nguyên hàm khi biết điều kiện ban đầu F(x0)=a'],
  '13.3':['Đổi biến trong tích phân','Đổi biến'],
  '14.4':['Vật thể bị khoét hoặc rỗng','Vật thể bị khoét/rỗng'],
  '14.6':['Đại lượng tích lũy','Đại lượng tích lũy F(b)-F(a)=∫f(t)dt'],
  '14.7':['Công suất và năng lượng','Công suất → năng lượng'],
  '14.8':['Lưu lượng và thể tích','Lưu lượng → thể tích']
};
export function editionMapping(section){
  const target=catalog.get(section.code);if(!target)return null;
  const alias=editionAliases[section.code];
  return target.title===section.title||alias?.[0]===section.title&&alias[1]===target.title
    ?{code:target.code,sourceTitle:section.title,runtimeTitle:target.title,kind:'same-problem-type-independent-edition',notEquivalentExamples:true}:null;
}
export function buildContentV62(previous,{persist=true,refresh=false}={}){
  const baseline=read('.audit/source-first-v5/release-v61/content.json');
  const cohort=baseline.decisions.filter(d=>!['PREPARED','ALREADY_AVAILABLE'].includes(d.status));assert.equal(cohort.length,861);
  const cache=join(root,output,'source-evidence.json');let evidence;
  const converterHash=digest(readFileSync(join(root,'scripts/source-first/layout-v62.py')));
  if(!refresh&&existsSync(cache)){
    evidence=read(`${output}/source-evidence.json`);assert.equal(evidence.converterHash,converterHash,'Refresh V6.2 evidence after parser changes');
  }else{
    const result=spawnSync('python',['-X','utf8','scripts/source-first/layout-v62.py'],{cwd:root,encoding:'utf8',maxBuffer:160*1024*1024,timeout:120000,windowsHide:true});
    assert.equal(result.status,0,result.stderr);evidence={...JSON.parse(result.stdout),converterHash};
  }
  const records=new Map(evidence.sources.flatMap(s=>s.records).map(r=>[r.id,r]));assert.equal(records.size,1080);
  const frozen=read('.audit/source-first-v5/release-v61/content-evidence.json');
  const oldRecords=new Map(frozen.sources.flatMap(s=>s.records).map(r=>[r.id,r]));
  // A stricter geometry adapter must not discard a field whose exact glyphs
  // were already supported by the bounded linear adapter. This is reuse of
  // frozen canonical evidence, not a guessed fallback for nonlinear material.
  function preserveLinear(field,old){
    if(field.errors.length&&old&&!old.errors.length){
      assert.equal(field.glyphHash,old.glyphHash);
      field.rejectedGeometryReasons=[...field.errors];field.content=structuredClone(old.content);field.errors=[];
      field.layoutEvidence.rejectedGeometryTree=field.layoutEvidence.tree;field.layoutEvidence.tree=[];
      field.layoutEvidence.sourceStructure='supported';field.layoutEvidence.adapter='frozen-linear-v6.1';
    }else field.layoutEvidence.adapter??='positioned-layout-v6.2';
  }
  for(const source of evidence.sources){
    const oldSource=frozen.sources.find(s=>s.source.sourceId===source.source.sourceId);
    for(const record of source.records)for(const key of ['statement','solution'])preserveLinear(record.fields[key],oldRecords.get(record.id)?.fields[key]);
    for(const group of source.groups)for(const key of ['knowledge','method'])preserveLinear(group[key],oldSource.groups.find(g=>g.code===group.code)?.[key]);
  }
  for(const source of evidence.sources)assert.equal(digest(readFileSync(join(root,source.source.file))),source.source.sha256);
  for(const d of baseline.decisions){const r=records.get(d.id);assert.ok(r);assert.equal(r.source.sha256,d.sourceHash);assert.equal(r.fields.statement.glyphHash,d.statementGlyphHash);assert.equal(r.fields.solution.glyphHash,d.solutionGlyphHash);}
  const jobs=[];
  for(const source of evidence.sources){
    for(const r of source.records)for(const [kind,f]of Object.entries(r.fields)){
      f.errors=[...new Set([...f.errors,...validate(f.content)])];
      for(const latex of maths(f.content))jobs.push({id:r.id+':'+kind,latex});
    }
    for(const r of source.records){r.errors=[...new Set(Object.values(r.fields).flatMap(f=>f.errors))];r.status=r.errors.length?'SOURCE_AMBIGUOUS':'SOURCE_STRUCTURE_SUPPORTED';}
    for(const section of source.groups)for(const key of ['knowledge','method'])section[key].errors=[...new Set([...section[key].errors,...validate(section[key].content)])];
  }
  const run=spawnSync(join(work,'sympy-env/Scripts/python.exe'),['-X','utf8','scripts/source-first/check-content-v62.py'],{cwd:root,input:JSON.stringify(jobs),encoding:'utf8',maxBuffer:16*1024*1024,timeout:120000,windowsHide:true});
  assert.equal(run.status,0,run.stderr);const symbolic=JSON.parse(run.stdout);
  const present=new Set(previous.groups.flatMap(g=>g.examples.map(e=>e.id))),decisions=[],groups=[];
  for(const source of evidence.sources)for(const section of source.groups){
    const accepted=[];const existing=previous.groups.find(g=>g.code===section.code);
    for(const before of cohort.filter(d=>d.sourceId===source.source.sourceId&&d.code===section.code)){
      const r=records.get(before.id),errors=[...new Set(Object.values(r.fields).flatMap(f=>f.errors))];
      const checks=symbolic.checks.filter(c=>c.id.startsWith(r.id+':'));
      let status='PREPARED',mapping=null;
      if(present.has(r.id))status='ALREADY_AVAILABLE';
      else if(errors.length)status='BLOCKED_STRUCTURE';
      else if(originalExamples[r.code]?.length){mapping=editionMapping(section);if(!mapping){status='BLOCKED_MAPPING';errors.push('No explicit semantic independent-edition mapping');}}
      // Retain the two known contextual equalities without treating them as
      // confirmed book mistakes; incomplete contextual source remains blocked.
      if(before.reasons.includes('EXACT_NUMERIC_CONFLICT')&&status==='PREPARED'){
        status='BLOCKED_CONTEXT';errors.push('CONTEXT_REVIEW: intentional contradiction or split numeric/prose condition requires adjudication');
      }
      if(checks.some(c=>c.status==='context-review')&&status==='PREPARED'){
        status='BLOCKED_CONTEXT';errors.push('SUPPORTED_MATH_CONTEXT_REVIEW: retain source; no automatic correction or approval');
      }
      const sourceSupported=Object.values(r.fields).every(f=>f.layoutEvidence.sourceStructure==='supported');
      const syntaxSupported=sourceSupported&&Object.values(r.fields).every(f=>validate(f.content).length===0);
      const verification={sourceStructure:sourceSupported?'bounded-source-structure-supported':'unresolved',canonicalSyntax:syntaxSupported?'passed':sourceSupported?'failed':'not-converted',
        mathematicalConsistency:checks.some(c=>c.status==='context-review')?'context-review':checks.some(c=>c.status==='passed')?'supported-checks-passed':'not-checked',
        symbolicChecks:checks,learnerRendering:'pending',editorialReview:'not-reviewed',humanApproval:false};
      decisions.push({id:r.id,code:r.code,number:r.number,sourceId:r.source.sourceId,sourceHash:r.source.sha256,
        originalCohort:before.status,beforeReasons:before.reasons,status,reasons:errors,mapping,verification,
        acceptanceReason:status==='PREPARED'?(mapping?'Independent source edition appended after stable existing records':before.status==='KNOWLEDGE_GROUP_UNRESOLVED'?'Complete source pair admitted with explicit knowledge/method availability':'Glyph/vector scope reconstructed by shared bounded adapters'):null,
        beforeEvidence:{path:'.audit/source-first-v5/release-v61/content-evidence.json',id:r.id},
        evidence:{statementGlyphHash:r.fields.statement.glyphHash,solutionGlyphHash:r.fields.solution.glyphHash,statementPages:r.fields.statement.pages,solutionPages:r.fields.solution.pages}});
      if(status==='PREPARED')accepted.push({record:r,verification});
    }
    if(!accepted.length)continue;
    assert.ok(!['20','21','23'].includes(section.code.split('.')[0]));
    const knowledgeOK=!section.knowledge.errors.length,methodOK=!section.method.errors.length;
    const proof=f=>({pages:f.pages,glyphHash:f.glyphHash,sourceId:source.source.sourceId,sourceHash:source.source.sha256});
    const sourceInfo={...source.source,page:section.knowledge.pages[0]??accepted[0].record.fields.statement.pages[0],solutionPage:accepted[0].record.fields.solution.pages[0]};
    const topicId='CD'+section.code.split('.')[0].padStart(2,'0'),independent=Boolean(originalExamples[section.code]?.length);
    const knowledge=existing?.knowledge??(!independent&&knowledgeOK?{id:`${sourceInfo.sourceId}:${section.code}:knowledge`,title:section.title,lead:section.knowledge.content,formulae:[],
      points:methodOK?[{label:'Cách làm từ tài liệu',text:section.method.content}]:[],sourcePages:section.knowledge.pages,sourceEvidence:[{kind:'knowledge',...proof(section.knowledge)},...(methodOK?[{kind:'method',...proof(section.method)}]:[])]}:null);
    const method=existing?.method??(!independent&&methodOK?{id:section.code,code:section.code,title:section.title,order:Number(section.code.split('.')[1]),methodology:legacy(section.method.content),
      exampleCount:accepted.length,solutionCount:accepted.length,figureCount:0,sourcePages:section.method.pages,reviewStatus:'needs-review'}:null);
    groups.push({code:section.code,topicId,source:sourceInfo,contentVersion:'source-first-v6.2',knowledge,method,
      knowledgeIsNew:!existing&&!independent&&knowledgeOK,methodIsNew:!existing&&!independent&&methodOK,
      pedagogicalState:{knowledge:knowledgeOK?'source-recovered':'source-unresolved',method:methodOK?'source-recovered':'source-unresolved',exampleOnly:!knowledge||!method},
      mergeMode:independent?'append-independent-source':'append-stable-source',editionMapping:independent?editionMapping(section):null,
      sourceContext:{knowledge:independent&&knowledgeOK?section.knowledge.content:null,method:independent&&methodOK?section.method.content:null},
      sourceContextEvidence:{knowledge:knowledgeOK?{kind:'knowledge',...proof(section.knowledge)}:null,method:methodOK?{kind:'method',...proof(section.method)}:null},
      examples:accepted.map(({record:r,verification})=>({id:r.id,title:`Ví dụ ${r.number}`,originalExampleNumber:r.number,prompt:r.fields.statement.content,answer:{type:'text',value:''},
        steps:[{label:'Lời giải từ tài liệu',expression:r.fields.solution.content,text:null}],problemTypeId:r.code,lessonId:r.code,topicId,sourceBlockId:r.id,
        sourcePages:[...new Set([...r.fields.statement.pages,...r.fields.solution.pages])],statementSourcePage:r.fields.statement.pages[0],solutionSourcePage:r.fields.solution.pages[0],
        sourcePdf:sourceInfo.sourceId,sourceEdition:sourceInfo.sourceId,assetReferences:[],origin:'source-first-v6.2',contentVersion:'source-first-v6.2',reviewStatus:'needs-review',contentType:'canonical-math-v1',
        verification,sourceEvidence:[{kind:'statement',...proof(r.fields.statement)},{kind:'solution',...proof(r.fields.solution)}],answerStatus:'Full original source solution retained; no separate answer invented'})),
      practice:[],verification:{humanApproval:false,sourceStructure:'bounded-glyph-layout',editorialReview:'not-reviewed'}});
  }
  assert.equal(decisions.length,861);assert.equal(new Set(decisions.map(d=>d.id)).size,861);
  const count=status=>decisions.filter(d=>d.status===status).length;
  const report={schemaVersion:'bienedu.content-batch.v6.2',converterHash,cohortEvidenceHash:digest(readFileSync(join(root,'.audit/source-first-v5/release-v61/content.json'))),
    counts:{examined:861,newExamples:count('PREPARED'),newSolutions:count('PREPARED'),alreadyAvailable:count('ALREADY_AVAILABLE'),excludedDuplicates:0,
      newKnowledgeGroups:groups.filter(g=>g.knowledgeIsNew).length,newMethodGroups:groups.filter(g=>g.methodIsNew).length,exampleOnlyGroups:groups.filter(g=>g.pedagogicalState.exampleOnly).length,newPractice:0,
      sourceStructureSupported:decisions.filter(d=>d.verification.sourceStructure==='bounded-source-structure-supported').length,canonicalValidated:decisions.filter(d=>d.verification.canonicalSyntax==='passed').length,
      recordsWithSupportedMathChecks:decisions.filter(d=>d.verification.symbolicChecks.length).length,editorialApprovals:0,
      recordsWithPassedMathChecks:decisions.filter(d=>d.verification.symbolicChecks.some(c=>c.status==='passed')).length,
      independentEditionKnowledgeContexts:groups.filter(g=>g.sourceContext.knowledge).length,independentEditionMethodContexts:groups.filter(g=>g.sourceContext.method).length,
      stillBlocked:decisions.filter(d=>d.status.startsWith('BLOCKED')).length,remainingUnprocessed:0},
    cohorts:Object.fromEntries(['SOURCE_AMBIGUOUS','KNOWLEDGE_GROUP_UNRESOLVED','RUNTIME_EDITION_MAPPING_UNRESOLVED'].map(key=>[key,{examined:decisions.filter(d=>d.originalCohort===key).length,
      recovered:decisions.filter(d=>d.originalCohort===key&&d.status==='PREPARED').length,alreadyAvailable:decisions.filter(d=>d.originalCohort===key&&d.status==='ALREADY_AVAILABLE').length,blocked:decisions.filter(d=>d.originalCohort===key&&d.status.startsWith('BLOCKED')).length}])),
    groups,decisions,symbolic,sources:evidence.sources.map(s=>s.source),humanApproval:false,
    recognitionEngine:{used:false,reason:'All original sources expose positioned glyphs/vector primitives; no external upload, OCR model or new ML dependency required for supported cases.'}};
  assert.equal(report.counts.newExamples,groups.reduce((n,g)=>n+g.examples.length,0));assert.equal(report.counts.newExamples+report.counts.alreadyAvailable+report.counts.stillBlocked,861);
  if(persist){mkdirSync(join(root,output),{recursive:true});writeFileSync(cache,JSON.stringify(evidence)+'\n');writeFileSync(join(root,output,'content.json'),JSON.stringify(report,null,2)+'\n');}
  return report;
}
if(process.argv[1]?.endsWith('content-v62.mjs')){
  const config=readFileSync(join(root,'assets/js/data/local-release.js'),'utf8').match(/localRelease\s*=\s*(\{[^;]+\})/u);
  const report=buildContentV62(read(JSON.parse(config[1]).bundle),{refresh:process.argv.includes('--refresh')});console.log(JSON.stringify({counts:report.counts,cohorts:report.cohorts},null,2));
}
