import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {root,work} from './build.mjs';
import {digest} from './model.mjs';
import {validateContent} from '../../assets/js/components/canonical-math.js';
import {mathContentMarkup} from '../../assets/js/components/canonical-math-renderer.js';
import {exampleContent} from '../../assets/js/data/example-content.js';
export const output='.audit/source-first-v5/release-v61';
const text=(value)=>({type:'text',value});
export const legacy=(node)=>node.type==='text'?node.value:node.type==='math'?`\\(${node.latex}\\)`:node.segments.map(legacy).join('');
export function extractAll(){
  const result=spawnSync('python',['-X','utf8','scripts/source-first/content-v61.py'],{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:40*1024*1024,timeout:60000});
  assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);
}
function validate(node){const result=validateContent(node);if(!result.valid)return result.errors;try{const html=mathContentMarkup(node);return /katex-error|math-render-error/u.test(html)?['KATEX_RENDER_ERROR']:[];}catch(error){return [error.message];}}
export function buildContent(parentBundle,{persist=true}={}){
  const extraction=extractAll(),records=extraction.sources.flatMap((s)=>s.records),groups=[],decisions=[];
  assert.equal(records.length,1080);assert.equal(new Set(records.map((r)=>r.id)).size,records.length);
  const jobs=[];
  const collect=(node,id)=>{if(node.type==='math')jobs.push({id,latex:node.latex});else for(const n of node.segments??[])collect(n,id);};
  for(const r of records){for(const [kind,f]of Object.entries(r.fields)){f.errors.push(...validate(f.content));collect(f.content,r.id+':'+kind);}r.errors=[...new Set(Object.values(r.fields).flatMap((f)=>f.errors))];}
  const symbolic=spawnSync(join(work,'sympy-env/Scripts/python.exe'),['-X','utf8','scripts/source-first/check-content-v61.py'],{cwd:root,input:JSON.stringify(jobs),encoding:'utf8',windowsHide:true,maxBuffer:6*1024*1024,timeout:60000});
  assert.equal(symbolic.status,0,symbolic.stderr);const checks=JSON.parse(symbolic.stdout);
  for(const source of extraction.sources){
    for(const section of source.groups){
      for(const field of ['knowledge','method'])section[field].errors.push(...validate(section[field].content));
      const already=parentBundle.groups.find((g)=>g.code===section.code&&g.source.sourceId===source.source.sourceId&&g.source.sha256===source.source.sha256);
      const existing=exampleContent[section.code]?.length??0;
      const groupIssues=already?[]:[...section.knowledge.errors,...section.method.errors];
      const complete=[];
      for(const record of source.records.filter((r)=>r.code===section.code)){
        let status,reasons=[...record.errors];
        const conflicts=checks.checks.filter((c)=>c.id.startsWith(record.id+':')&&!c.passed);if(conflicts.length)reasons.push('EXACT_NUMERIC_CONFLICT');
        const present=already?.examples.some((e)=>e.id===record.id||e.originalExampleNumber===record.number);
        if(present){status='ALREADY_AVAILABLE';reasons=[];}
        else if(reasons.length)status='SOURCE_AMBIGUOUS';
        else if(existing){status='RUNTIME_EDITION_MAPPING_UNRESOLVED';reasons.push('Independent source edition would overwrite existing lesson/example IDs');}
        else if(groupIssues.length){status='KNOWLEDGE_GROUP_UNRESOLVED';reasons.push(...groupIssues);}
        else status='PREPARED';
        decisions.push({id:record.id,code:record.code,number:record.number,sourceId:source.source.sourceId,status,reasons:[...new Set(reasons)],canonicalPairConverted:record.errors.length===0,
          statementPages:record.fields.statement.pages,solutionPages:record.fields.solution.pages,sourceHash:source.source.sha256,
          statementGlyphHash:record.fields.statement.glyphHash,solutionGlyphHash:record.fields.solution.glyphHash});
        if(status==='PREPARED')complete.push(record);
      }
      if(!complete.length)continue;
      assert.ok(!['20','21','23'].includes(section.code.split('.')[0]));assert.equal(existing,0);
      const pages=section.knowledge.pages,methodology=legacy(section.method.content),src={...source.source,page:pages[0],solutionPage:complete[0].fields.solution.pages[0]};
      const evidence=(field,kind)=>({kind,pages:field.pages,glyphHash:field.glyphHash,sourceId:src.sourceId,sourceHash:src.sha256});
      groups.push({code:section.code,topicId:'CD'+section.code.split('.')[0].padStart(2,'0'),source:src,contentVersion:'source-first-v6.1',knowledgeIsNew:!already,
        knowledge:already?.knowledge??{id:`${src.sourceId}:${section.code}:knowledge`,title:section.title,lead:section.knowledge.content,formulae:[],points:[{label:'Cách làm từ tài liệu',text:section.method.content}],sourcePages:pages,sourceEvidence:[evidence(section.knowledge,'knowledge'),evidence(section.method,'method')]},
        method:{id:section.code,code:section.code,title:section.title,order:Number(section.code.split('.')[1]),methodology,exampleCount:complete.length,solutionCount:complete.length,figureCount:0,sourcePages:[...new Set([...pages,...complete.flatMap((r)=>[...r.fields.statement.pages,...r.fields.solution.pages])])],reviewStatus:'needs-review'},
        examples:complete.map((r)=>({id:r.id,title:`Ví dụ ${r.number}`,prompt:r.fields.statement.content,steps:[{label:'Lời giải từ tài liệu',expression:r.fields.solution.content,text:null}],answer:text(''),
          originalExampleNumber:r.number,problemTypeId:r.code,lessonId:r.code,topicId:'CD'+r.code.split('.')[0].padStart(2,'0'),sourceBlockId:r.id,sourcePages:[...new Set([...r.fields.statement.pages,...r.fields.solution.pages])],statementSourcePage:r.fields.statement.pages[0],solutionSourcePage:r.fields.solution.pages[0],
          assetReferences:[],sourcePdf:src.sourceId,origin:'source-first-v6.1',contentVersion:'source-first-v6.1',reviewStatus:'needs-review',contentType:'canonical-math-v1',verification:'machine-positioned-glyph-checked; symbolic checks limited to declared supported cases',sourceEvidence:[evidence(r.fields.statement,'statement'),evidence(r.fields.solution,'solution')],answerStatus:'Result preserved within source solution; no separate answer invented'})),
        practice:[],verification:{status:'machine-positioned-glyph-checked',humanApproval:false,sourceHash:src.sha256,symbolicScope:'numeric equalities only; not a proof of all source assertions'}});
    }
  }
  const counts=Object.fromEntries([...new Set(decisions.map((d)=>d.status))].map((key)=>[key,decisions.filter((d)=>d.status===key).length]));
  const report={schemaVersion:'bienedu.content-batch.v6.1',sources:extraction.sources.map(({source,groups})=>({...source,sections:groups.length})),
    counts:{examined:records.length,remainingUnprocessed:0,canonicalPairsConverted:decisions.filter((d)=>d.canonicalPairConverted).length,alreadyAvailable:counts.ALREADY_AVAILABLE??0,excludedDuplicates:0,newExamples:groups.reduce((n,g)=>n+g.examples.length,0),newSolutions:groups.reduce((n,g)=>n+g.examples.length,0),newKnowledgeGroups:groups.filter((g)=>g.knowledgeIsNew).length,newPractice:0,byStatus:counts},
    groups,decisions,symbolic:checks,formulaOccurrences:jobs.length,humanApproval:false,independentSources:true,
    limitations:['Linear positioned-font mathematics only; unsupported fraction/radical/operator structures fail closed.','Canonical conversion is not independent mathematical proof.','Existing calculus source edition not overwritten or merged.','No new practice identified: explicitly headed examples remain worked examples.']};
  assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),1080);assert.equal(report.counts.newExamples,counts.PREPARED??0);
  if(persist){mkdirSync(join(root,output),{recursive:true});writeFileSync(join(root,output,'content-evidence.json'),JSON.stringify(extraction,null,2)+'\n');writeFileSync(join(root,output,'content.json'),JSON.stringify(report,null,2)+'\n');}
  return report;
}
