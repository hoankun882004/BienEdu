import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {root} from './build.mjs';
import {digest} from './model.mjs';
import {output,buildContent} from './content-v61.mjs';
import {activation,activeBaseline,releaseStatus,savePlan,applyContinuation,read,json,immutable,planDirectory} from './release-chain-v61.mjs';
export {output};
export function prepareV61(){
  const {state,parent}=activeBaseline(),parentActivation=parent.files.find((f)=>f.file===activation);
  const config=JSON.parse(parentActivation.after.match(/localRelease\s*=\s*(\{[^;]+\})/u)[1]);
  assert.equal(digest(readFileSync(join(root,config.bundle))),config.bundleHash);
  const previous=read(config.bundle),content=buildContent(previous);
  assert.ok(content.counts.newExamples>0,'No additional eligible source records; do not create an empty release');
  const cumulative=[...previous.groups];
  for(const group of content.groups){
    const index=cumulative.findIndex((g)=>g.code===group.code);
    if(index<0){cumulative.push(group);continue;}
    const old=cumulative[index];assert.equal(old.source.sourceId,group.source.sourceId);assert.equal(old.source.sha256,group.source.sha256);
    const ids=new Set(old.examples.map((e)=>e.id));assert.ok(group.examples.every((e)=>!ids.has(e.id)),'Duplicate example identity');
    // Append only: preserve earlier route positions and progress identities.
    const examples=[...old.examples,...group.examples];cumulative[index]={...old,examples,method:{...old.method,exampleCount:examples.length,solutionCount:examples.length}};
  }
  const bundle={...previous,groups:cumulative,continuation:{version:'6.1',parentPlanHash:parent.planHash,contentEvidenceHash:digest(readFileSync(join(root,output,'content-evidence.json')))}};
  assert.equal(new Set(bundle.groups.map((g)=>g.code)).size,bundle.groups.length,'No source-edition overwrite');
  const bytes=json(bundle),bundleHash=digest(bytes),bundlePath=`assets/content/local-learning/${bundleHash}.json`;immutable(join(root,bundlePath),bytes);
  const files=['documents-v6.js','knowledge-v6.js'].map((name)=>{const file=`assets/js/data/${name}`,before=readFileSync(join(root,file),'utf8'),after=readFileSync(join(root,'scripts/source-first/runtime-v61',name),'utf8');return {file,before,after,beforeHash:digest(before),afterHash:digest(after)};}).filter((f)=>f.beforeHash!==f.afterHash);
  // Exact, guarded patch around the existing component, staged rather than
  // modifying a hash-bound active V6.0 dependency behind the user's back.
  const behaviorFile='assets/js/learning-v6.js',behaviorBefore=readFileSync(join(root,behaviorFile),'utf8');
  if(!behaviorBefore.includes('positionedExamples')){
    assert.equal(behaviorBefore.split('  function refine(){').length,2);
    const behaviorAfter=behaviorBefore.replace('  function refine(){',`  const positionedExamples=new WeakSet();
  function refine(){
    // Keep the active example visible by scrolling only its horizontal strip.
    for(const current of app.querySelectorAll('.example-index a[aria-current="page"]')){
      if(positionedExamples.has(current))continue;positionedExamples.add(current);
      requestAnimationFrame(()=>{if(!current.isConnected)return;const list=current.closest('ol');if(!list)return;const a=current.getBoundingClientRect(),b=list.getBoundingClientRect();if(a.left<b.left)list.scrollLeft+=a.left-b.left-4;else if(a.right>b.right)list.scrollLeft+=a.right-b.right+4;});
    }`);
    files.push({file:behaviorFile,before:behaviorBefore,after:behaviorAfter,beforeHash:digest(behaviorBefore),afterHash:digest(behaviorAfter)});
  }
  const before=readFileSync(join(root,activation),'utf8'),after=`// Explicit local-only V6.1 continuation. Parent: ${parent.planHash}\nexport const localRelease = ${JSON.stringify({bundle:bundlePath,bundleHash})};\n`;
  files.push({file:activation,before,after,beforeHash:digest(before),afterHash:digest(after)});
  const own=['package.json','scripts/check-source.mjs','scripts/source-first/content-v61.py','scripts/source-first/content-v61.mjs','scripts/source-first/check-content-v61.py','scripts/source-first/release-chain-v61.mjs','scripts/source-first/release-v61.mjs','scripts/source-first/preview-v61.mjs','scripts/source-first/compat-suites-v61.mjs','scripts/source-first/runtime-v61/documents-v6.js','scripts/source-first/runtime-v61/knowledge-v6.js','assets/js/release-preview-v61.js','.audit/v61-browser.mjs','tests/helpers/release-v61.mjs',bundlePath,config.bundle,
    `.content-work/${state.family}/${parent.planHash}/manifest.json`,...parent.files.filter((f)=>!files.some((entry)=>entry.file===f.file)).map((f)=>f.file)];
  const dependencies=[...new Set([...parent.dependencies.map((d)=>d.file),...own])].filter((f)=>!files.some((entry)=>entry.file===f)).map((file)=>({file,hash:digest(readFileSync(join(root,file)))}));
  assert.equal(activeBaseline().parent.planHash,parent.planHash,'Runtime changed while preparing source conversion');
  assert.equal(files.find((f)=>f.file===activation).beforeHash,parentActivation.afterHash,'Parent activation changed during preparation');
  const plan=savePlan({schemaVersion:'bienedu.release.v6.1',mode:'local-development-only',productionPublication:false,humanApproval:false,
    parent:{family:state.family,planHash:parent.planHash,manifestHash:digest(parent),activationHash:parentActivation.afterHash},bundle:bundlePath,bundleHash,files,dependencies,
    summary:{newExamples:content.counts.newExamples,newSolutions:content.counts.newSolutions,newKnowledgeGroups:content.counts.newKnowledgeGroups,newPractice:0,retainedCorrectionFields:previous.corrections.length,nativeGraphs:previous.graphs.filter((g)=>g.spec.type==='function-2d').length,variationTables:previous.graphs.filter((g)=>g.spec.type==='variation-table').length},
    atomicity:'Atomic per file only. Code first, activation last; rollback activation first, then parent code. Roll child back before parent.'});
  const base=read('.audit/source-first-v5/release-v6/inventory.json'),matrix=base.matrix.map((r)=>({...r,activeV6Examples:previous.groups.filter((g)=>g.topicId===r.topicId).reduce((n,g)=>n+g.examples.length,0),
    preparedExamples:content.groups.filter((g)=>g.topicId===r.topicId).reduce((n,g)=>n+g.examples.length,0),preparedKnowledge:content.groups.filter((g)=>g.topicId===r.topicId&&g.knowledgeIsNew).length,
    status:r.topicId==='CD23'?'UNPUBLISHED_BLOCKED':!r.sourceIds.length?'SOURCE_MISSING':['CD20','CD21'].includes(r.topicId)?'PROTECTED_EXISTING':content.groups.some((g)=>g.topicId===r.topicId)?'PARTIALLY_CONVERTED_PREPARED_NOT_APPLIED':r.currentExamples?'EXISTING_NOT_ALL_SOURCE_VERIFIED':'SOURCE_AVAILABLE_NOT_CONVERTED'}));
  const report={schemaVersion:'bienedu.integration.v6.1',status:'PARTIAL',runtimeBefore:state,parentPlanHash:parent.planHash,planHash:plan.planHash,manifest:`.content-work/release-v61/${plan.planHash}/manifest.json`,summary:plan.summary,counts:content.counts,sources:content.sources,matrix,
    symbolicChecks:content.symbolic.checks.length,symbolicConflicts:content.symbolic.checks.filter((c)=>!c.passed),formulaOccurrences:content.formulaOccurrences,
    applyCommand:`node scripts/source-first/release-v61.mjs apply --authorize ${plan.planHash} --development --execute`,rollbackCommand:`node scripts/source-first/release-v61.mjs rollback --authorize ${plan.planHash} --development --execute`,
    serveCommand:'node scripts/source-first/preview-v61.mjs --port 8001',preview:'http://127.0.0.1:8001/.audit/source-first-v5/release-v61/preview.html',realRuntimeWrites:0,limitations:content.limitations};
  mkdirSync(join(root,output),{recursive:true});writeFileSync(join(root,output,'inventory.json'),json(report));writeFileSync(join(root,output,'bundle.json'),bytes);
  writeFileSync(join(root,output,'preview.html'),'<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Biển Edu · V6.1 local</title><link rel="stylesheet" href="../../../assets/vendor/katex/katex.min.css"><link rel="stylesheet" href="../../../assets/canonical-math.css"><link rel="stylesheet" href="../../../assets/native-graphs.css"><main class="native-graph-preview" data-release-v61></main><script type="module" src="../../../assets/js/release-preview-v61.js"></script></html>');
  return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const command=process.argv[2]??'preview',args=process.argv.slice(3),position=args.indexOf('--authorize'),hash=position>=0?args[position+1]:null;
  if(command==='preview'){const r=prepareV61();console.log(json({status:r.status,currentRuntime:r.runtimeBefore,counts:r.counts,planHash:r.planHash,applyCommand:r.applyCommand,rollbackCommand:r.rollbackCommand,preview:r.preview,realRuntimeWrites:0}));}
  else if(command==='status')console.log(json(releaseStatus()));
  else if(['apply','rollback'].includes(command)){
    const plan=JSON.parse(readFileSync(join(planDirectory(hash),'manifest.json'),'utf8'));console.log(json(applyContinuation(plan,{authorize:hash,execute:args.includes('--execute'),development:args.includes('--development'),rollback:command==='rollback'})));
    if(args.includes('--execute')){
      const {validateContinuationSite}=await import('../../.audit/v61-browser.mjs');
      try{await validateContinuationSite({plan,fixture:false,mode:command==='apply'?'smoke':'parent'});}catch(error){throw new Error(`Files ${command==='apply'?'applied':'rolled back'} but browser check failed: ${error.message}. Matching rollback: node scripts/source-first/release-v61.mjs rollback --authorize ${hash} --development --execute`);}
    }
  }else throw new Error('Use preview | status | apply/rollback --authorize HASH --development --execute');
}
