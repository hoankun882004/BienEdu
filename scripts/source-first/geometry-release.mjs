// A new continuation: old release manifests/journals are never edited.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync,renameSync,unlinkSync,appendFileSync,openSync,closeSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {stageGeometryNavigation} from './geometry-navigation.mjs';
export const workspace=fileURLToPath(new URL('../../',import.meta.url));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex').toUpperCase();
const json=value=>JSON.stringify(value,null,2)+'\n';
const read=(root,file)=>JSON.parse(readFileSync(join(root,file),'utf8'));
const targetFiles=['documents.html','assets/js/curriculum.js','assets/js/data/geometry-activation.js'];
const output='.audit/geometry-v1';
const ownPath=(root,file)=>{const absolute=resolve(root,file);assert.ok(absolute.startsWith(resolve(root)+ '\\')||absolute.startsWith(resolve(root)+'/'),'Path escaped workspace');return absolute;};
function immutable(root,file,bytes){const path=ownPath(root,file);mkdirSync(dirname(path),{recursive:true});if(existsSync(path))assert.equal(readFileSync(path,'utf8'),bytes,'Immutable geometry plan differs');else writeFileSync(path,bytes,{flag:'wx'});}
export function prepareGeometry(root=workspace){
  const pointer=read(root,output+'/preview.json'),bundleBytes=readFileSync(join(root,pointer.bundle));assert.equal(digest(bundleBytes),pointer.sha256);
  const browser=read(root,output+'/browser.json');assert.equal(browser.passed,true,'Browser validation required');assert.equal(browser.bundleHash,pointer.sha256,'New bundle needs fresh browser validation');assert.equal(browser.states.length,240,'All 30 routes at all 8 sizes required');
  for(const [file,sha256]of Object.entries(browser.runtimeHashes??{}))assert.equal(digest(readFileSync(join(root,file))),sha256,'Runtime changed since browser validation: '+file);
  assert.equal(Object.keys(browser.runtimeHashes??{}).length,7,'Runtime-bound browser receipt required');
  const interactions=read(root,output+'/interactions.json');
  for(const field of ['passed','spaAndHistory','rapidHistory','forwardNavigation','bfcache','touchRotation','touchDefaultScroll','touchLandscape','pointerCaptureRelease','pointerCancel','mouseRotation','zoomReset'])assert.equal(interactions[field],true,'Interaction validation required: '+field);
  assert.deepEqual(interactions.runtimeHashes,browser.runtimeHashes,'Interaction validation does not match browser runtime');
  const security=read(root,output+'/security.json');assert.deepEqual(security.findings,[],'Sensitive diagnostics must be resolved before preparation');
  const bundle=JSON.parse(bundleBytes);assert.equal(bundle.summary.ready,30);assert.equal(bundle.summary.activation,'PREPARED_ONLY');
  const viewports=['320x568','360x800','390x844','430x932','768x1024','1024x768','1366x768','844x390'];
  const expected=bundle.candidates.flatMap(c=>viewports.map(size=>size+':'+c.target.key)).sort();
  assert.deepEqual(browser.states.map(s=>s.width+'x'+s.height+':'+s.key).sort(),expected,'Incomplete or duplicate viewport/source combinations');assert.ok(browser.states.every(s=>s.properties===true));
  const beforeDocument=readFileSync(join(root,targetFiles[0]),'utf8');assert.ok(!beforeDocument.includes('src="assets/js/geometry-loader.js'),'Geometry already integrated; inspect current plan');
  const afterDocument=beforeDocument.replace('</body>','<script type="module" src="assets/js/geometry-loader.js?v=1"></script>\n</body>');assert.notEqual(beforeDocument,afterDocument);
  const files=targetFiles.map((file,index)=>{const before=readFileSync(join(root,file),'utf8');return {file,before,after:index===0?afterDocument:index===1?stageGeometryNavigation(before):`// Authorized native geometry continuation. Original knowledge pointer unchanged.\nexport const geometryActivation=${JSON.stringify(pointer)};\n`};});
  const code=['assets/geometry.css','assets/js/geometry-loader.js','assets/js/geometry-learner.js','assets/js/components/geometry-renderer.js','assets/js/components/geometry-spec.js','assets/js/components/graph-renderer.js','assets/js/components/graph-expression.js','assets/js/components/canonical-math.js','assets/js/components/canonical-math-renderer.js','assets/js/data/pdf-knowledge-release.js','assets/js/data/knowledge-pdf.js','assets/js/components/pdf-knowledge-renderer.js','assets/vendor/jsxgraph/jsxgraphcore.mjs','node_modules/jsxgraph/package.json','scripts/source-first/geometry-release.mjs',pointer.bundle,bundle.knowledgeParent.bundle,output+'/symbolic.json',output+'/source-evidence.json',output+'/browser.json'];
  code.push('tests/geometry.test.mjs','tests/geometry-browser.test.mjs','tests/geometry-interactions.test.mjs',output+'/interactions.json');
  code.push('tests/geometry-activation-browser.test.mjs');
  code.push('scripts/source-first/geometry-build.mjs','scripts/source-first/geometry-models.mjs','scripts/source-first/geometry-source.py','scripts/source-first/geometry-symbolic.py','.audit/pdf-knowledge/issues.json');
  code.push('scripts/source-first/geometry-security.mjs','scripts/source-first/geometry-navigation.mjs','.audit/pdf-knowledge/summary.json');
  const sourceFiles=read(root,'.audit/pdf-knowledge/summary.json');
  // Bind all original documents through the already active knowledge bundle.
  const knowledge=read(root,bundle.knowledgeParent.bundle);for(const article of knowledge.articles)code.push(article.source.file);
  const dependencies=[...new Set(code)].sort().map(file=>({file,sha256:digest(readFileSync(join(root,file)))}));
  const body={schemaVersion:'bienedu.geometry-local-plan.v1',bundle:pointer,knowledgeParent:bundle.knowledgeParent,files,dependencies,authorization:'Fresh --authorize HASH --execute required; local development only',sourceInventoryHash:digest(json(sourceFiles))};
  const planHash=digest(json(body)),plan={...body,planHash};
  immutable(root,`.content-work/geometry-v1/${planHash}/manifest.json`,json(plan));
  for(const [index,file]of files.entries())immutable(root,`.content-work/geometry-v1/${planHash}/before-${index}.txt`,file.before);
  writeFileSync(join(root,output+'/activation-plan.json'),json({manifest:`.content-work/geometry-v1/${planHash}/manifest.json`,planHash}));return {planHash,files:files.map(f=>f.file),status:'PREPARED',apply:`node scripts/source-first/geometry-release.mjs apply --authorize ${planHash} --execute`,rollback:`node scripts/source-first/geometry-release.mjs rollback --authorize ${planHash} --execute`};
}
function loadPlan(root){const pointer=read(root,output+'/activation-plan.json');assert.match(pointer.planHash,/^[A-F0-9]{64}$/u);assert.equal(pointer.manifest,`.content-work/geometry-v1/${pointer.planHash}/manifest.json`);const plan=read(root,pointer.manifest),{planHash,...body}=plan;assert.equal(digest(json(body)),planHash);assert.equal(planHash,pointer.planHash);assert.deepEqual(plan.files.map(f=>f.file),targetFiles);for(const [index,file]of plan.files.entries())assert.equal(readFileSync(join(root,`.content-work/geometry-v1/${planHash}/before-${index}.txt`),'utf8'),file.before,'Rollback backup corrupted');return plan;}
export function geometryStatus(root=workspace){
  const plan=loadPlan(root),states=plan.files.map(f=>{const bytes=readFileSync(join(root,f.file),'utf8');return {file:f.file,state:bytes===f.before?'BEFORE':bytes===f.after?'AFTER':'UNKNOWN'};});
  return {planHash:plan.planHash,status:states.every(s=>s.state==='BEFORE')?'PREPARED':states.every(s=>s.state==='AFTER')?'ACTIVE':states.some(s=>s.state==='UNKNOWN')?'CONFLICT':'INTERRUPTED',files:states};
}
export function executeGeometry(action,{root=workspace,authorize,execute=false,interruptAfter=Infinity}={}){
  assert.ok(['apply','rollback'].includes(action));const plan=loadPlan(root);
  assert.ok(execute&&authorize===plan.planHash,'Explicit matching authorization and --execute required');
  assert.ok(!process.env.VERCEL&&!process.env.CI,'Local execution only');
  for(const dep of plan.dependencies)assert.equal(digest(readFileSync(ownPath(root,dep.file))),dep.sha256,'Stale dependency: '+dep.file+'; prepare a new preview');
  const initial=geometryStatus(root);assert.notEqual(initial.status,'CONFLICT','Unknown runtime bytes; refusing to overwrite');
  const lock=join(root,output+'/operation.lock');let handle;
  try{
    handle=openSync(lock,'wx');writeFileSync(handle,json({pid:process.pid,action,planHash:plan.planHash}));
    const files=action==='apply'?plan.files:[...plan.files].reverse();let changed=0;
    for(const file of files){
      const desired=action==='apply'?file.after:file.before,current=readFileSync(join(root,file.file),'utf8');if(current===desired)continue;
      assert.ok(current===file.before||current===file.after,'Runtime changed during operation');
      const path=ownPath(root,file.file),temporary=path+'.geometry-'+plan.planHash+'.tmp';
      if(existsSync(temporary))assert.equal(readFileSync(temporary,'utf8'),desired,'Unknown temporary bytes; refusing overwrite');else writeFileSync(temporary,desired,{flag:'wx'});
      assert.equal(readFileSync(path,'utf8'),current,'Concurrent runtime edit');renameSync(temporary,path);
      appendFileSync(join(root,output+'/operations.jsonl'),JSON.stringify({planHash:plan.planHash,action,file:file.file,sha256:digest(desired)})+'\n');
      if(++changed>=interruptAfter)throw Error('Injected interruption (isolated tests only)');
    }
    return geometryStatus(root);
  }finally{if(handle!==undefined){closeSync(handle);unlinkSync(lock);}}
}
export function recoverGeometryLock({root=workspace,authorize,execute=false}={}){
  const plan=loadPlan(root);assert.ok(execute&&authorize===plan.planHash,'Explicit matching authorization and --execute required');
  const lock=join(root,output+'/operation.lock'),record=JSON.parse(readFileSync(lock,'utf8'));assert.equal(record.planHash,plan.planHash);assert.ok(Number.isInteger(record.pid)&&record.pid>0);
  let running=true;try{process.kill(record.pid,0);}catch(error){if(error.code==='ESRCH')running=false;else throw error;}assert.equal(running,false,'An active process still owns this lock');
  assert.notEqual(geometryStatus(root).status,'CONFLICT');
  for(const file of plan.files){const temporary=ownPath(root,file.file)+'.geometry-'+plan.planHash+'.tmp';if(existsSync(temporary)){const bytes=readFileSync(temporary,'utf8');assert.ok([file.before,file.after].includes(bytes),'Unknown temporary bytes; refusing recovery');unlinkSync(temporary);}}
  unlinkSync(lock);appendFileSync(join(root,output+'/operations.jsonl'),JSON.stringify({planHash:plan.planHash,action:'recover-dead-lock',pid:record.pid})+'\n');return geometryStatus(root);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const action=process.argv[2]??'status';try{const options={authorize:process.argv[process.argv.indexOf('--authorize')+1],execute:process.argv.includes('--execute')};const result=action==='prepare'?prepareGeometry():action==='status'?geometryStatus():action==='recover-lock'?recoverGeometryLock(options):executeGeometry(action,options);console.log(json(result));}catch(error){console.error(error.message);process.exitCode=1;}
}
