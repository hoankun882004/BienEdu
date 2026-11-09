// Version extension of the existing authenticated, file-atomic local protocol.
// Ancestor engines/manifests are immutable. No action executes by default.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,mkdirSync,readdirSync,openSync,closeSync,fsyncSync,renameSync,unlinkSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {root} from './build.mjs';
import {digest} from './model.mjs';
import {safe,read,json,immutable,activeBaseline,verifyManifest as verifyAncestor,releaseStatus as ancestorStatus} from './release-chain-v61.mjs';
import {assertDevelopmentEnvironment} from './development.mjs';
import {protectBaseline,assertProtected} from './baseline-v62.mjs';
import {output,buildContentV62,maths} from './content-v62.mjs';
import {stageRuntimeV62} from './stage-v62.mjs';
import {exampleContent as originalExamples} from '../../assets/js/data/example-content.js';
export {output};
const activation='assets/js/data/local-release.js',family='release-v62';
const allowed=new Set([activation,'package.json','assets/js/data/knowledge-v6.js','assets/js/data/examples-v6.js','assets/js/learning-v6.js','assets/js/graph-learner.js','assets/js/curriculum.js','assets/learning-v6.css','documents.html']);
export function planDirectory(hash,base=root){assert.match(hash,/^[A-F0-9]{64}$/u);return join(base,'.content-work',family,hash);}
function verify(plan){const {planHash,...body}=plan;assert.equal(digest(body),planHash,'Manifest hash mismatch');assert.equal(plan.schemaVersion,'bienedu.release.v6.2');assert.equal(plan.productionPublication,false);assert.equal(plan.humanApproval,false);return plan;}
function readParent(plan,base){
  assert.ok(['release-v6','release-v61','release-v62'].includes(plan.parent.family));
  const parent=read(`.content-work/${plan.parent.family}/${plan.parent.planHash}/manifest.json`,base);
  if(plan.parent.family==='release-v62')verify(parent);else verifyAncestor(parent);
  assert.equal(digest(parent),plan.parent.manifestHash,'Immutable parent changed');
  for(const f of parent.files){assert.equal(digest(f.before),f.beforeHash);assert.equal(digest(f.after),f.afterHash);
    assert.equal(readFileSync(safe(base,`.content-work/${plan.parent.family}/${parent.planHash}/${digest(f.file)}.before`),'utf8'),f.before,'Parent rollback evidence changed');}
  return parent;
}
export function validatePlan(plan,base=root){
  verify(plan);const dir=planDirectory(plan.planHash,base);assert.deepEqual(read(`.content-work/${family}/${plan.planHash}/manifest.json`,base),plan);
  assert.equal(plan.mode,'local-development-only');assert.ok(plan.files.length>0&&plan.files.at(-1).file===activation);assert.equal(new Set(plan.files.map(f=>f.file)).size,plan.files.length);
  const parent=readParent(plan,base);
  for(const f of plan.files){
    assert.ok(allowed.has(f.file),'Unexpected runtime target');assert.equal(digest(f.before),f.beforeHash);assert.equal(digest(f.after),f.afterHash);
    assert.equal(f.beforeHash,parent.files.find(p=>p.file===f.file)?.afterHash??parent.dependencies.find(d=>d.file===f.file)?.hash,'Child is not based on verified parent bytes');
    assert.equal(readFileSync(join(dir,`${digest(f.file)}.before`),'utf8'),f.before,'Corrupt backup');
    assert.ok([f.beforeHash,f.afterHash].includes(digest(readFileSync(safe(base,f.file)))),`Unknown runtime edit or active descendant: ${f.file}`);
  }
  assert.equal(plan.parent.activationHash,parent.files.find(f=>f.file===activation).afterHash);
  for(const d of plan.dependencies)assert.equal(digest(readFileSync(safe(base,d.file))),d.hash,`Stale source/dependency: ${d.file}`);
  return dir;
}
export function releaseStatusV62(base=root){
  const directory=join(base,'.content-work',family),current=digest(readFileSync(safe(base,activation)));
  const plans=existsSync(directory)?readdirSync(directory).filter(h=>/^[A-F0-9]{64}$/u.test(h)).map(h=>verify(read(`.content-work/${family}/${h}/manifest.json`,base))):[];
  const active=plans.filter(p=>p.files.at(-1).afterHash===current);
  const partial=plans.filter(p=>p.files.at(-1).beforeHash===current&&p.files.some(f=>f.file!==activation&&digest(readFileSync(safe(base,f.file)))===f.afterHash&&f.beforeHash!==f.afterHash));
  const choices=active.length?active:partial;
  if(choices.length){
    const withIntent=choices.filter(p=>readdirSync(planDirectory(p.planHash,base)).some(n=>n.endsWith('-intent.json')));
    const pick=withIntent.length===1?withIntent:choices;
    if(pick.length!==1)return {status:'CONFLICT',reason:'Ambiguous continuation identity'};
    const plan=pick[0];try{validatePlan(plan,base);}catch(e){return {status:'CONFLICT',reason:e.message,planHash:plan.planHash};}
    const states=plan.files.map(f=>({file:f.file,state:digest(readFileSync(safe(base,f.file)))===f.afterHash?'after':'before'}));
    return {status:states.every(s=>s.state==='after')?'ACTIVE':'PARTIAL',family,planHash:plan.planHash,states};
  }
  return ancestorStatus(base);
}
export function assertReleasePreserved(plan){
  const state=releaseStatusV62();assert.ok(state.status==='ACTIVE'&&[plan.planHash,plan.parent.planHash].includes(state.planHash),'Unknown active learner state');
  const child=state.planHash===plan.planHash;
  if(child)assert.ok(readdirSync(planDirectory(plan.planHash)).some(n=>n.endsWith('-complete.json')&&read(`.content-work/release-v62/${plan.planHash}/${n}`).action==='apply'),'Applied child needs its authenticated execution journal');
  const snapshot=read(`${output}/protected-baseline.json`);
  for(const entry of snapshot.hashes){const target=plan.files.find(f=>f.file===entry.file);assert.equal(digest(readFileSync(join(root,entry.file))),child&&target?target.afterHash:entry.hash,`Ancestor/source preservation: ${entry.file}`);}
  return snapshot.hashes.length;
}
function currentBaseline(base=root){
  assert.equal(existsSync(join(base,'.content-work/release-v6/.lock')),false,'Resolve the existing cross-version release lock');
  const state=releaseStatusV62(base);assert.equal(state.status,'ACTIVE','Exactly verified active parent required');
  if(state.family!==family)return activeBaseline(base);
  const parent=read(`.content-work/${family}/${state.planHash}/manifest.json`,base);validatePlan(parent,base);return {state,parent};
}
export function applyV62(plan,{base=root,authorize,development=false,execute=false,rollback=false,afterFile=null}={}){
  const dir=validatePlan(plan,base);if(!execute)return {dryRun:true,writes:0,planHash:plan.planHash};
  assertDevelopmentEnvironment({root:base,development});assert.equal(authorize,plan.planHash,'Fresh exact manifest authorization required');
  const lockFile=join(base,'.content-work/release-v6/.lock');mkdirSync(dirname(lockFile),{recursive:true});
  if(existsSync(lockFile)){
    const owner=JSON.parse(readFileSync(lockFile,'utf8'));assert.equal(owner.planHash,plan.planHash,'Different release owns the lock');assert.ok(Number.isInteger(owner.pid)&&owner.pid>0);
    let alive=true;try{process.kill(owner.pid,0);}catch(e){if(e.code==='ESRCH')alive=false;else throw e;}assert.equal(alive,false,'Release process still active');unlinkSync(lockFile);
  }
  const lock=openSync(lockFile,'wx');writeFileSync(lock,json({pid:process.pid,planHash:plan.planHash}));let writes=0;
  const event=(kind,extra={})=>immutable(join(dir,`${Date.now()}-${Math.random().toString(16).slice(2)}-${kind}.json`),json({action:rollback?'rollback':'apply',planHash:plan.planHash,parent:plan.parent.planHash,productionPublication:false,...extra}));
  try{
    validatePlan(plan,base);event('intent');
    for(const [index,f]of(rollback?[...plan.files].reverse():plan.files).entries()){
      const target=safe(base,f.file),wanted=rollback?f.beforeHash:f.afterHash,expected=rollback?f.afterHash:f.beforeHash,current=digest(readFileSync(target));
      if(current===wanted)continue;assert.equal(current,expected,'Concurrent runtime edit');
      const tmp=join(dirname(target),`.release-v62-${plan.planHash.slice(0,12)}.tmp`);
      if(existsSync(tmp))assert.equal(digest(readFileSync(tmp)),wanted,'Unknown interrupted temporary bytes');
      else{const fd=openSync(tmp,'wx');try{writeFileSync(fd,rollback?f.before:f.after);fsyncSync(fd);}finally{closeSync(fd);}}
      assert.equal(digest(readFileSync(target)),expected);renameSync(tmp,target);writes++;event('file',{file:f.file,hash:wanted});afterFile?.(f,index);
    }
    event('complete',{writes});return {planHash:plan.planHash,writes,state:rollback?'parent':'child',atomicity:'per-file only'};
  }catch(e){event('interrupted',{writes,error:e.message});throw e;}finally{closeSync(lock);unlinkSync(lockFile);}
}
export function prepareV62({refresh=false}={}){
  const protection=protectBaseline(),{state,parent}=currentBaseline();assertProtected(protection);
  const previous=read(parent.bundle),content=buildContentV62(previous,{refresh});assert.ok(content.counts.newExamples>0,'No eligible new content; refuse an empty release');
  const cumulative=structuredClone(previous.groups);
  for(const group of content.groups){
    const index=cumulative.findIndex(g=>g.code===group.code);
    if(index<0){cumulative.push(group);continue;}
    const old=cumulative[index];assert.equal(old.source.sourceId,group.source.sourceId);assert.equal(old.source.sha256,group.source.sha256);
    const ids=new Set(old.examples.map(e=>e.id));assert.ok(group.examples.every(e=>!ids.has(e.id)),'Duplicate candidate');
    cumulative[index]={...old,examples:[...old.examples,...group.examples]};
  }
  const bundle={...previous,groups:cumulative,continuation:{version:'6.2',parentPlanHash:parent.planHash,evidenceHash:digest(readFileSync(join(root,output,'source-evidence.json')))}};
  assert.deepEqual(bundle.corrections,previous.corrections);assert.deepEqual(bundle.graphs,previous.graphs);
  const bytes=json(bundle),bundleHash=digest(bytes),bundlePath=`assets/content/local-learning/${bundleHash}.json`;immutable(join(root,bundlePath),bytes);
  const stages=stageRuntimeV62(bundle);
  stages.set(activation,`// Explicit local-only V6.2 child of ${parent.planHash}\nexport const localRelease = ${JSON.stringify({bundle:bundlePath,bundleHash})};\n`);
  const files=[...stages].map(([file,after])=>{const before=readFileSync(join(root,file),'utf8');return {file,before,after,beforeHash:digest(before),afterHash:digest(after)};}).filter(f=>f.beforeHash!==f.afterHash);
  const own=readdirSync(join(root,'scripts/source-first')).filter(n=>/v62\.(?:mjs|py)$/u.test(n)).map(n=>'scripts/source-first/'+n);
  own.push(...readdirSync(join(root,'scripts/source-first/runtime-v62')).map(n=>'scripts/source-first/runtime-v62/'+n),
    'tests/source-layout-v62.py','tests/source-symbolic-v62.py','tests/helpers/release-v62.mjs','tests/helpers/historical-parent-v62.mjs','tests/helpers/release-v61-v62.mjs','tests/helpers/register-historical-v62.mjs','scripts/source-first/symbolic-check.py',
    'assets/js/data/content-registry.js','assets/js/domain/lesson-workspace.js','assets/js/domain/learning-progress.js','assets/js/domain/practice-bank.js',
    bundlePath,`${output}/content.json`,`${output}/source-evidence.json`,`${output}/protected-baseline.json`);
  for(const optional of ['tests/content-v62.test.mjs','.audit/v62-browser.mjs'])if(existsSync(join(root,optional)))own.push(optional);
  const deps=[...new Set([...parent.dependencies.map(d=>d.file),...parent.files.map(f=>f.file),...protection.hashes.map(d=>d.file),...own,`.content-work/${state.family}/${parent.planHash}/manifest.json`])]
    .filter(f=>!files.some(x=>x.file===f)).sort().map(file=>({file,hash:digest(readFileSync(join(root,file)))}));
  assert.equal(currentBaseline().parent.planHash,parent.planHash,'Parent changed during preparation');assertProtected(protection);
  const body={schemaVersion:'bienedu.release.v6.2',mode:'local-development-only',productionPublication:false,humanApproval:false,
    parent:{family:state.family,planHash:parent.planHash,manifestHash:digest(parent),activationHash:parent.files.find(f=>f.file===activation).afterHash},
    bundle:bundlePath,bundleHash,files,dependencies:deps,summary:content.counts,atomicity:'Per-file atomic only; activation last; rollback child before parent'};
  const plan={...body,planHash:digest(body)},dir=planDirectory(plan.planHash);immutable(join(dir,'manifest.json'),json(plan));for(const f of files)immutable(join(dir,`${digest(f.file)}.before`),f.before);
  validatePlan(plan);const old=read('.audit/source-first-v5/release-v61/inventory.json');
  const report={schemaVersion:'bienedu.integration.v6.2',status:'PARTIAL',actualParent:state,v61State:protection.v61State,planHash:plan.planHash,manifest:`.content-work/${family}/${plan.planHash}/manifest.json`,
    counts:content.counts,cohorts:content.cohorts,cumulative:{examples:bundle.groups.reduce((n,g)=>n+g.examples.length,0),retainedV61Examples:209,retainedV60Examples:10,retainedCorrections:35,graphs:5,tables:1},
    matrix:old.matrix.map(t=>({...t,activeV61Examples:previous.groups.filter(g=>g.topicId===t.topicId).reduce((n,g)=>n+g.examples.length,0),preparedV62Examples:content.groups.filter(g=>g.topicId===t.topicId).reduce((n,g)=>n+g.examples.length,0),
      preparedV62Knowledge:content.groups.filter(g=>g.topicId===t.topicId&&g.knowledgeIsNew).length})),
    editionOffsets:Object.fromEntries(content.groups.filter(g=>g.mergeMode==='append-independent-source').map(g=>[g.code,originalExamples[g.code]?.length??0])),
    applyCommand:`node scripts/source-first/release-v62.mjs apply --authorize ${plan.planHash} --development --execute`,
    rollbackCommand:`node scripts/source-first/release-v62.mjs rollback --authorize ${plan.planHash} --development --execute`,
    preview:'http://127.0.0.1:8002/.audit/source-first-v5/release-v62/preview.html',serveCommand:'node scripts/source-first/preview-v62.mjs --port 8002',
    backupDirectory:`.content-work/${family}/${plan.planHash}/`,realRuntimeWrites:0,humanApproval:false};
  mkdirSync(join(root,output),{recursive:true});writeFileSync(join(root,output,'inventory.json'),json(report));writeFileSync(join(root,output,'bundle.json'),bytes);
  const sourceRecords=new Map(read(`${output}/source-evidence.json`).sources.flatMap(s=>s.records).map(r=>[r.id,r]));
  const cases=[];
  for(const [kind,token]of [['Fraction','\\frac'],['Radical','\\sqrt'],['Superscript','^{'],['Subscript','_{'],['Dot product','\\cdot'],['Cross product','\\times'],['Vector accent','\\overrightarrow'],['Multiple-line solution','\n']]){
    const candidate=content.groups.flatMap(g=>g.examples.flatMap(e=>['statement','solution'].map(field=>({e,field,source:sourceRecords.get(e.id)}))))
      .find(({source,field})=>kind==='Multiple-line solution'?source.fields[field].original.includes('\n'):maths(source.fields[field].content).some(latex=>latex.includes(token)));
    if(!candidate)continue;const {e:example,source,field}=candidate;
    cases.push({kind,id:example.id,sourceId:source.source.sourceId,pages:source.fields[field].pages,original:source.fields[field].original,canonical:source.fields[field].content});
  }
  writeFileSync(join(root,output,'cases.json'),json(cases));
  writeFileSync(join(root,output,'preview.html'),'<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Biển Edu V6.2 · Local preview</title><link rel="stylesheet" href="../../../assets/vendor/katex/katex.min.css"><link rel="stylesheet" href="../../../assets/canonical-math.css"><link rel="stylesheet" href="../../../assets/native-graphs.css"><main class="native-graph-preview" data-preview-v62></main><script type="module" src="../../../scripts/source-first/preview-ui-v62.mjs"></script></html>');
  return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const action=process.argv[2]??'preview',args=process.argv.slice(3),hash=args[args.indexOf('--authorize')+1];
  if(action==='preview'){const r=prepareV62({refresh:args.includes('--refresh')});console.log(json({status:r.status,actualParent:r.actualParent,counts:r.counts,planHash:r.planHash,preview:r.preview}));}
  else if(action==='status')console.log(json(releaseStatusV62()));
  else if(['apply','rollback'].includes(action)){
    const plan=read(`.content-work/${family}/${hash}/manifest.json`);console.log(json(applyV62(plan,{authorize:hash,development:args.includes('--development'),execute:args.includes('--execute'),rollback:action==='rollback'})));
    if(args.includes('--execute')){const {validateV62Site}=await import('../../.audit/v62-browser.mjs');try{await validateV62Site({plan,fixture:false,mode:action==='apply'?'smoke':'parent'});}catch(e){throw Error(`Files ${action} completed but browser check failed: ${e.message}. Matching rollback: node scripts/source-first/release-v62.mjs rollback --authorize ${hash} --development --execute`);}}
  }else throw new Error('Use preview | status | apply/rollback --authorize HASH --development --execute');
}
