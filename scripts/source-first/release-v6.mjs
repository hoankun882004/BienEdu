// Consolidated local-only file release. Reuses validated V5.6 payloads and V5.8
// graph specs; it does not create a parallel mathematical correction pipeline.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync,renameSync,openSync,closeSync,fsyncSync,unlinkSync} from 'node:fs';
import {join,dirname,resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {root,work} from './build.mjs';
import {digest} from './model.mjs';
import {validateContinuation} from './development-continuation.mjs';
import {assertDevelopmentEnvironment} from './development.mjs';
import {verifyGraphSafety} from './graph-build.mjs';
import {sequenceGroup,sequenceSource} from './sequence-v6.mjs';
import {graphTextCorrections} from './graph-text-v6.mjs';
import {parseRichText,validateContent} from '../../assets/js/components/canonical-math.js';
import {mathContentMarkup} from '../../assets/js/components/canonical-math-renderer.js';
import {exampleContent} from '../../assets/js/data/example-content.js';
import {knowledgeContent,getTopicKnowledgeContent} from '../../assets/js/data/knowledge-content.js';
import {learningContentRegistry} from '../../assets/js/data/content-registry.js';
export const output='.audit/source-first-v5/release-v6';
export const activation='assets/js/data/local-release.js';
const read=(file)=>JSON.parse(readFileSync(join(root,file),'utf8'));
const once=(file,text)=>{if(existsSync(file))assert.equal(readFileSync(file,'utf8'),text,`Immutable evidence differs: ${file}`);else{mkdirSync(dirname(file),{recursive:true});writeFileSync(file,text,{flag:'wx'});}};
const directory=(base,hash)=>{assert.match(hash,/^[A-F0-9]{64}$/u);return join(base,'.content-work/release-v6',hash);};
const json=(v)=>JSON.stringify(v,null,2)+'\n';
const runPython=(script,symbolic=false)=>{const result=spawnSync(symbolic?join(work,'sympy-env/Scripts/python.exe'):'python',['-X','utf8',script],{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:20*1024*1024,timeout:60000});assert.equal(result.status,0,result.stderr+result.stdout);return JSON.parse(result.stdout);};
export function prepareV6(){
  mkdirSync(join(root,output),{recursive:true});const safety=verifyGraphSafety();
  const child=read('.audit/source-first-v5/development-preview-v5.6.json').plan;validateContinuation(child);
  const sources=runPython('scripts/source-first/inventory-v6.py');
  const old=read('.audit/source-first-v5/canonical-v5.7/inventory.json');
  for(const source of sources){const registered=old.inventory.find((s)=>s.sha256===source.sha256);source.sourceId=registered?.sourceId??({'Day-so-Cap-so-CD17-CD19.pdf':sequenceSource.sourceId,'Luong-giac-CD15-CD16.pdf':'cd15-cd16-trigonometry-2026','Nguyen-ham-Tich-phan-CD12-CD14.pdf':'cd12-cd14-calculus-2026','Vecto-Oxyz-CD28-CD33 (1).pdf':'cd28-cd33-vector-2026'}[source.file.split('/').at(-1)]);assert.ok(source.sourceId,'Unmapped independent source');
    if(!source.sections.length&&registered){source.topics=registered.topics;source.sections=registered.sections.map((s)=>({code:s.sectionId,title:s.title,paired:null,uniqueStatements:null,uniqueSolutions:null,knowledgePages:[],limitation:'Legacy adapter evidence required; generic scanner did not safely pair records'}));}
  }
  sources.push(...old.inventory.filter((s)=>s.sourceType==='tex').map((s)=>({file:s.path,sourceId:s.sourceId,sha256:s.sha256,topics:s.topics,sections:s.sections.map((r)=>({code:r.sectionId,title:r.title,location:r.offset})),sourceType:'tex',limitation:'Native TEX parser retained. Not equated with probability PDF.'})));
  const evidence=runPython('scripts/source-first/sequence-evidence-v6.py'),symbolic=runPython('scripts/source-first/sequence-check-v6.py',true);
  assert.equal(evidence.length,20);assert.ok(symbolic.checks.every((c)=>c.passed));
  const group=structuredClone(sequenceGroup);
  for(const e of group.examples)e.sourceEvidence=evidence.filter((r)=>r.recordId===e.id).map(({kind,page,excerptHash})=>({kind,page,excerptHash,sourceId:sequenceSource.sourceId,sourceHash:sequenceSource.sha256}));
  const corrections=child.files.flatMap((f)=>f.changes.map((c)=>({recordId:c.recordId,fieldId:c.fieldId,before:c.before,after:parseRichText(c.after),source:c.source,sourceBlockId:c.sourceBlockId})));
  const graphs=read('.audit/source-first-v5/graphs-v5.8/candidates.json');
  for(const group of graphTextCorrections){
    const example=exampleContent['6.1'].find((e)=>e.id===group.recordId),graph=graphs.find((g)=>g.target.recordId===group.recordId);assert.ok(example&&graph&&graph.checks.passed);
    for(const field of ['prompt','answer','source-solution.expression'])corrections.push({recordId:group.recordId,fieldId:field,before:field==='source-solution.expression'?example.steps.find((s)=>s.label==='Lời giải từ tài liệu').expression:example[field],after:parseRichText(field==='prompt'?group.prompt:group.solution),source:{...graph.spec.source,page:field==='prompt'?group.page:group.solutionPage},sourceBlockId:example.sourceBlockId,verification:'agent-source-text-and-spans-checked; graph-symbolics-passed; no human approval'});
  }
  const canonical=[];const collect=(value,path)=>{if(['rich-text','math'].includes(value?.type)){assert.equal(validateContent(value).valid,true,path);assert.ok(!/math-render-error|katex-error/u.test(mathContentMarkup(value)),path);canonical.push({path,node:value});return;}if(Array.isArray(value))value.forEach((v,i)=>collect(v,`${path}[${i}]`));else if(value&&typeof value==='object')for(const [key,v]of Object.entries(value))collect(v,`${path}.${key}`);};
  collect(group,'17.1');collect(corrections,'V5.6');
  const bundle={schemaVersion:'bienedu.local-learning.v6',groups:[group],corrections,graphs,childPlanHash:child.planHash,sourceIds:sources.map((s)=>s.sourceId),humanApproval:false,productionPublication:false};
  const bundleBytes=json(bundle),bundleHash=digest(bundleBytes),bundlePath=`assets/content/local-learning/${bundleHash}.json`;once(join(root,bundlePath),bundleBytes);
  writeFileSync(join(root,output,'bundle.json'),bundleBytes);
  const file=child.files[0],saved=read(`.content-work/source-first-v5/dev-plans/${child.planHash}/${digest(file.file)}.json`);
  const beforeActivation=readFileSync(join(root,activation),'utf8');assert.match(beforeActivation,/export const localRelease = null;/u,'An active release must be rolled back first');
  const afterActivation=`// Explicit local-only V6 activation.\nexport const localRelease = ${JSON.stringify({bundle:bundlePath,bundleHash})};\n`;
  const files=[{file:file.file,before:saved.before,after:saved.after,beforeHash:file.beforeHash,afterHash:file.afterHash},{file:activation,before:beforeActivation,after:afterActivation,beforeHash:digest(beforeActivation),afterHash:digest(afterActivation)}];
  const dependencyFiles=['documents.html','assets/js/main.js','assets/js/learning-v6.js','assets/learning-v6.css','assets/js/curriculum.js','assets/js/data/learning-overlay.js','assets/js/data/examples-v6.js','assets/js/data/knowledge-v6.js','assets/js/data/documents-v6.js','assets/js/graph-loader.js','assets/js/graph-learner.js','assets/js/components/graph-renderer.js','assets/js/components/graph-spec.js','assets/js/components/graph-expression.js','assets/js/components/variation-table.js','assets/js/components/canonical-math.js','assets/js/components/canonical-math-renderer.js',...child.dependencies.map((d)=>d.file),...sources.map((s)=>s.file),bundlePath];
  const recovery=read('.audit/source-first-v5/recovery-v5.6.json');
  dependencyFiles.push('assets/js/data/graph-activation.js','scripts/source-first/release-v6.mjs','scripts/source-first/validate-v6-site.mjs','tests/helpers/local-site.mjs','scripts/source-first/sequence-v6.mjs','scripts/source-first/graph-text-v6.mjs','scripts/source-first/inventory-v6.py','scripts/source-first/sequence-evidence-v6.py','scripts/source-first/sequence-check-v6.py');
  dependencyFiles.push(...recovery.parentDependencies.map((d)=>d.file),...recovery.sources.map((d)=>d.file),...recovery.protectedFiles.map((d)=>d.file),'assets/js/data/calculus-knowledge-details.js','assets/vendor/jsxgraph/jsxgraphcore.mjs','assets/native-graphs.css');
  const dependencies=[...new Set(dependencyFiles)].filter((path)=>!files.some((f)=>f.file===path)).map((file)=>({file,hash:digest(readFileSync(join(root,file)))}));
  const body={schemaVersion:'bienedu.release.v6',mode:'local-development-only',productionPublication:false,humanApproval:false,childPlanHash:child.planHash,bundle:bundlePath,bundleHash,files,dependencies,summary:{correctionGroups:13,correctionFields:35,v56PhysicalFields:26,additionalCanonicalOverlayFields:9,newKnowledge:1,newExamples:10,newSolutions:10,newPractice:0,nativeGraphs:5,variationTables:1},atomicity:'Atomic per file only. Apply content first, activation last; rollback in reverse order.'};
  const plan={...body,planHash:digest(body)},dir=directory(root,plan.planHash);once(join(dir,'manifest.json'),json(plan));for(const entry of files)once(join(dir,`${digest(entry.file)}.before`),entry.before);
  const runtimeSections=Object.values(learningContentRegistry.topics).flatMap((t)=>Object.values(t.subtopics));
  const practiceFor=(code)=>{const p=runtimeSections.find((r)=>r.code===code)?.sections.practice;return {readySource:p?.readySourceCount??0,readyGenerated:p?.readyGeneratedCount??0,sourceCandidates:p?.sourceCount??0,needsReview:p?.needsReviewCount??0};};
  const matrix=Array.from({length:39},(_,i)=>{
    const topic=`CD${String(i+1).padStart(2,'0')}`,prefix=`${i+1}.`,available=sources.filter((s)=>s.topics.includes(topic)),existing=Object.entries(exampleContent).filter(([c])=>c.startsWith(prefix)).flatMap(([,e])=>e),practice=runtimeSections.filter((r)=>r.code.startsWith(prefix)).map((r)=>practiceFor(r.code));
    return {topicId:topic,sourceIds:available.map((s)=>s.sourceId),independentSourceCount:available.length,currentKnowledge:getTopicKnowledgeContent(topic)?.pages?.length??Object.keys(knowledgeContent).filter((c)=>c.startsWith(prefix)).length,currentExamples:existing.length,currentSolutions:existing.filter((e)=>e.steps?.length||e.answer).length,
      currentPractice:{readySource:practice.reduce((n,p)=>n+p.readySource,0),readyGenerated:practice.reduce((n,p)=>n+p.readyGenerated,0),sourceCandidates:practice.reduce((n,p)=>n+p.sourceCandidates,0),needsReview:practice.reduce((n,p)=>n+p.needsReview,0)},
      preparedExamples:topic==='CD17'?10:0,preparedKnowledge:topic==='CD17'?1:0,preparedSolutions:topic==='CD17'?10:0,preparedPractice:0,protected:['CD20','CD21'].includes(topic),status:topic==='CD23'?'UNPUBLISHED_BLOCKED':!available.length?'SOURCE_MISSING':topic==='CD17'?'PARTIAL_GROUP_PREPARED':'SOURCE_AVAILABLE_NOT_FULLY_VERIFIED',
      sections:available.flatMap((s)=>s.sections.filter((r)=>r.code.startsWith(prefix)).map((r)=>({sourceId:s.sourceId,...r,currentKnowledge:!!knowledgeContent[r.code],currentExamples:exampleContent[r.code]?.length??0,currentPractice:practiceFor(r.code),currentSolutions:(exampleContent[r.code]??[]).filter((e)=>e.steps?.length||e.answer).length,prepared:r.code==='17.1'}))) };
  });
  const report={planHash:plan.planHash,manifest:`.content-work/release-v6/${plan.planHash}/manifest.json`,safety,summary:body.summary,sources,matrix,canonicalNodes:canonical.length,sourceEvidence:evidence,symbolic,
    applyCommand:`node scripts/source-first/release-v6.mjs apply --authorize ${plan.planHash} --development --execute`,rollbackCommand:`node scripts/source-first/release-v6.mjs rollback --authorize ${plan.planHash} --development --execute`,realRuntimeWrites:0,limits:['Unverified source records remain blocked; no bulk mathematical guessing.','Old/new calculus PDFs remain independent editions.','No standalone practice invented for CD17.1.']};
  writeFileSync(join(root,output,'inventory.json'),json(report));writeFileSync(join(root,output,'canonical.json'),json(canonical));
  writeFileSync(join(root,output,'preview.html'),`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Biển Edu · Local V6</title><link rel="stylesheet" href="../../../assets/vendor/katex/katex.min.css"><link rel="stylesheet" href="../../../assets/canonical-math.css"><link rel="stylesheet" href="../../../assets/native-graphs.css"><main class="native-graph-preview" data-release-preview></main><script type="module" src="../../../assets/js/graph-loader.js"></script></html>`);
  return report;
}
export function applyV6(plan,{base=root,authorize,execute=false,development=false,rollback=false,afterFile=null}={}){
  const {planHash,...body}=plan;assert.equal(digest(body),planHash);assert.equal(plan.schemaVersion,'bienedu.release.v6');assert.equal(plan.productionPublication,false);
  const dir=directory(base,planHash);assert.deepEqual(JSON.parse(readFileSync(join(dir,'manifest.json'),'utf8')),plan);
  const local=(file)=>{const path=resolve(base,file),rel=relative(resolve(base),path);assert.ok(rel&&!rel.startsWith('..')&&!isAbsolute(rel));return path;};
  assert.deepEqual(plan.files.map((f)=>f.file),['assets/js/data/foundation-lessons.generated.js',activation]);
  for(const d of plan.dependencies)assert.equal(digest(readFileSync(local(d.file))),d.hash,`Stale dependency: ${d.file}. Prepare a new preview.`);
  for(const f of plan.files){assert.equal(digest(f.before),f.beforeHash);assert.equal(digest(f.after),f.afterHash);assert.equal(readFileSync(join(dir,`${digest(f.file)}.before`),'utf8'),f.before);assert.ok([f.beforeHash,f.afterHash].includes(digest(readFileSync(local(f.file)))),`Runtime conflict: ${f.file}`);}
  if(!execute)return {dryRun:true,writes:0,planHash};
  assertDevelopmentEnvironment({root:base,development});assert.equal(authorize,planHash,'Explicit fresh manifest-specific authorization required');
  const lockFile=join(base,'.content-work/release-v6/.lock');
  if(existsSync(lockFile)){
    const owner=JSON.parse(readFileSync(lockFile,'utf8'));assert.equal(owner.planHash,planHash,'Another release lock exists');assert.ok(Number.isInteger(owner.pid)&&owner.pid>0);
    let alive=true;try{process.kill(owner.pid,0);}catch(error){if(error.code==='ESRCH')alive=false;else throw error;}
    assert.equal(alive,false,'Another release process is still active');unlinkSync(lockFile);
  }
  const lock=openSync(lockFile,'wx');writeFileSync(lock,json({pid:process.pid,planHash}));let writes=0;
  const event=(kind,data)=>once(join(dir,`${Date.now()}-${Math.random().toString(16).slice(2)}-${kind}.json`),json({action:rollback?'rollback':'apply',planHash,productionPublication:false,...data}));
  try{event('intent',{});for(const [i,f]of (rollback?[...plan.files].reverse():plan.files).entries()){
    const target=local(f.file),wanted=rollback?f.beforeHash:f.afterHash,expected=rollback?f.afterHash:f.beforeHash,current=digest(readFileSync(target));if(current===wanted)continue;assert.equal(current,expected,'Concurrent runtime edit');
    const tmp=join(dirname(target),`.release-v6-${planHash.slice(0,12)}.tmp`);
    if(existsSync(tmp))assert.equal(digest(readFileSync(tmp)),wanted,'Unexpected interrupted temporary bytes; no overwrite');
    else{const fd=openSync(tmp,'wx');try{writeFileSync(fd,rollback?f.before:f.after);fsyncSync(fd);}finally{closeSync(fd);}}
    assert.equal(digest(readFileSync(target)),expected);renameSync(tmp,target);writes++;event('file',{file:f.file,hash:wanted});afterFile?.(f,i);
  }event('complete',{writes});return {writes,planHash,state:rollback?'before':'after'};}catch(error){event('interrupted',{writes,error:error.message});throw error;}finally{closeSync(lock);unlinkSync(lockFile);}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const command=process.argv[2]??'preview',args=process.argv.slice(3),hash=args[args.indexOf('--authorize')+1];
  if(command==='preview'){const r=prepareV6();console.log(json({planHash:r.planHash,summary:r.summary,sourceFiles:r.sources.length,canonicalNodes:r.canonicalNodes,applyCommand:r.applyCommand,rollbackCommand:r.rollbackCommand,realRuntimeWrites:0}));}
  else if(['apply','rollback'].includes(command)){
    const plan=JSON.parse(readFileSync(join(directory(root,hash),'manifest.json'),'utf8')),result=applyV6(plan,{authorize:hash,development:args.includes('--development'),execute:args.includes('--execute'),rollback:command==='rollback'});
    if(command==='apply'&&args.includes('--execute')){
      try{const {validateV6Site}=await import('./validate-v6-site.mjs');result.browser=await validateV6Site();once(join(directory(root,hash),`${Date.now()}-browser-validated.json`),json(result.browser));}
      catch(error){throw new Error(`Local files applied but browser validation failed: ${error.message}. Roll back with: node scripts/source-first/release-v6.mjs rollback --authorize ${hash} --development --execute`);}
    }console.log(json(result));
  }
  else throw new Error('Use preview | apply/rollback --authorize HASH --development --execute');
}
