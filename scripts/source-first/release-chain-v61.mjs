// Versioned continuation of the existing local protocol. Parent manifests,
// backups and journals are read-only; a child must roll back before its parent.
import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync,mkdirSync,readdirSync,openSync,closeSync,fsyncSync,renameSync,unlinkSync} from 'node:fs';
import {join,dirname,resolve,relative,isAbsolute} from 'node:path';
import {root} from './build.mjs';
import {digest} from './model.mjs';
import {assertDevelopmentEnvironment} from './development.mjs';
export const activation='assets/js/data/local-release.js';
export const allowedTargets=[activation,'assets/js/data/documents-v6.js','assets/js/data/knowledge-v6.js','assets/js/learning-v6.js'];
export const json=(value)=>JSON.stringify(value,null,2)+'\n';
export const read=(file,base=root)=>JSON.parse(readFileSync(safe(base,file),'utf8'));
export function safe(base,file){const path=resolve(base,file),rel=relative(resolve(base),path);assert.ok(rel&&!rel.startsWith('..')&&!isAbsolute(rel),'Path outside workspace');return path;}
export function immutable(file,bytes){if(existsSync(file))assert.equal(readFileSync(file,'utf8'),bytes,'Immutable evidence differs');else{mkdirSync(dirname(file),{recursive:true});writeFileSync(file,bytes,{flag:'wx'});}}
export function planDirectory(hash,base=root,family='release-v61'){assert.match(hash,/^[A-F0-9]{64}$/u);assert.ok(['release-v6','release-v61'].includes(family));return join(base,'.content-work',family,hash);}
export function verifyManifest(plan){const {planHash,...body}=plan;assert.equal(digest(body),planHash,'Manifest hash mismatch');assert.ok(['bienedu.release.v6','bienedu.release.v6.1'].includes(plan.schemaVersion));assert.equal(plan.productionPublication,false);assert.equal(plan.humanApproval,false);return plan;}
function manifests(base){return ['release-v6','release-v61'].flatMap((family)=>{const dir=join(base,'.content-work',family);if(!existsSync(dir))return [];return readdirSync(dir).filter((name)=>/^[A-F0-9]{64}$/u.test(name)).flatMap((hash)=>{const file=join(dir,hash,'manifest.json');return existsSync(file)?[{family,plan:verifyManifest(JSON.parse(readFileSync(file,'utf8')))}]:[];});});}
export function releaseStatus(base=root){
  const current=digest(readFileSync(safe(base,activation))),all=manifests(base);
  const partials=all.filter(({plan})=>plan.schemaVersion==='bienedu.release.v6.1'&&plan.files.find((f)=>f.file===activation)?.beforeHash===current&&plan.dependencies.every((d)=>existsSync(safe(base,d.file))&&digest(readFileSync(safe(base,d.file)))===d.hash)).filter(({plan})=>plan.files.some((f)=>f.beforeHash!==f.afterHash&&f.file!==activation&&digest(readFileSync(safe(base,f.file)))===f.afterHash));
  if(partials.length){if(partials.length!==1)return {status:'CONFLICT',reason:'Ambiguous partial continuation',candidateHashes:partials.map((r)=>r.plan.planHash)};const partial=partials[0],states=partial.plan.files.map((f)=>({file:f.file,state:digest(readFileSync(safe(base,f.file)))===f.afterHash?'after':digest(readFileSync(safe(base,f.file)))===f.beforeHash?'before':'conflict'}));return {status:states.some((s)=>s.state==='conflict')?'CONFLICT':'PARTIAL',planHash:partial.plan.planHash,family:partial.family,states};}
  const active=all.filter(({plan})=>plan.files.some((f)=>f.file===activation&&f.afterHash===current));
  if(active.length){
    // Several historical previews may have identical activation bytes but
    // different dependency hashes. A filename/hash sort is not release identity.
    const valid=active.filter(({plan})=>plan.dependencies.every((d)=>existsSync(safe(base,d.file))&&digest(readFileSync(safe(base,d.file)))===d.hash));
    const executed=valid.filter(({plan,family})=>readdirSync(planDirectory(plan.planHash,base,family)).some((f)=>f.endsWith('-complete.json')&&read(`.content-work/${family}/${plan.planHash}/${f}`,base).action==='apply'));
    const choices=executed.length?executed:valid;
    if(choices.length!==1)return {status:'CONFLICT',reason:choices.length?'Ambiguous active manifest identity':'Active bytes have no dependency-matched manifest',candidateHashes:active.map((r)=>r.plan.planHash)};
    const {plan,family}=choices[0],states=plan.files.map((f)=>({file:f.file,state:digest(readFileSync(safe(base,f.file)))===f.afterHash?'after':digest(readFileSync(safe(base,f.file)))===f.beforeHash?'before':'conflict'}));
    return {status:states.some((s)=>s.state==='conflict')?'CONFLICT':states.every((s)=>s.state==='after')?'ACTIVE':'PARTIAL',planHash:plan.planHash,family,states};
  }
  const reference=read('.audit/source-first-v5/release-v6/inventory.json',base),parent=all.find(({plan})=>plan.planHash===reference.planHash);
  if(parent){const states=parent.plan.files.map((f)=>({file:f.file,state:digest(readFileSync(safe(base,f.file)))===f.beforeHash?'before':digest(readFileSync(safe(base,f.file)))===f.afterHash?'after':'conflict'}));
    const journal=readdirSync(planDirectory(parent.plan.planHash,base,'release-v6')).filter((p)=>p.endsWith('-complete.json')).sort().map((f)=>read(`.content-work/release-v6/${parent.plan.planHash}/${f}`,base));
    return {status:states.some((s)=>s.state==='conflict')?'CONFLICT':states.every((s)=>s.state==='before')?(journal.at(-1)?.action==='rollback'?'ROLLED_BACK':'PREPARED'):'PARTIAL',planHash:parent.plan.planHash,family:'release-v6',states};}
  return {status:'UNKNOWN'};
}
export function activeBaseline(base=root){
  assert.equal(existsSync(join(base,'.content-work/release-v6/.lock')),false,'Resolve the current release lock before preparing a continuation');
  const state=releaseStatus(base);assert.equal(state.status,'ACTIVE','Continuation needs an exactly verified active parent; partial/prepared/unknown state must be resolved explicitly');
  const parent=read(`.content-work/${state.family}/${state.planHash}/manifest.json`,base);verifyManifest(parent);
  for(const d of parent.dependencies)assert.equal(digest(readFileSync(safe(base,d.file))),d.hash,`Stale parent dependency: ${d.file}`);
  for(const f of parent.files){assert.equal(digest(readFileSync(safe(base,f.file))),f.afterHash,`Parent runtime conflict: ${f.file}`);assert.equal(readFileSync(join(planDirectory(parent.planHash,base,state.family),`${digest(f.file)}.before`),'utf8'),f.before);}
  // Read-only graph/source proof plus original V5.5 checks are carried by parent
  // hashes, not by pretending the V5.6 pending baseline is still on disk.
  return {state,parent};
}
export function savePlan(body,base=root){const plan={...body,planHash:digest(body)},dir=planDirectory(plan.planHash,base);immutable(join(dir,'manifest.json'),json(plan));for(const f of plan.files)immutable(join(dir,`${digest(f.file)}.before`),f.before);return plan;}
function validate(plan,base){
  verifyManifest(plan);assert.equal(plan.schemaVersion,'bienedu.release.v6.1');assert.equal(plan.mode,'local-development-only');
  const dir=planDirectory(plan.planHash,base);assert.deepEqual(JSON.parse(readFileSync(join(dir,'manifest.json'),'utf8')),plan);
  assert.ok(plan.files.length>0&&plan.files.at(-1).file===activation,'Activation must be last');
  assert.equal(new Set(plan.files.map((f)=>f.file)).size,plan.files.length);
  for(const f of plan.files){assert.ok(allowedTargets.includes(f.file),'Unexpected runtime target');assert.equal(digest(f.before),f.beforeHash);assert.equal(digest(f.after),f.afterHash);assert.equal(readFileSync(join(dir,`${digest(f.file)}.before`),'utf8'),f.before);assert.ok([f.beforeHash,f.afterHash].includes(digest(readFileSync(safe(base,f.file)))),`Runtime conflict / descendant active: ${f.file}`);}
  const parent=read(`.content-work/${plan.parent.family}/${plan.parent.planHash}/manifest.json`,base);verifyManifest(parent);assert.equal(digest(parent),plan.parent.manifestHash,'Parent manifest changed');
  const parentActivation=parent.files.find((f)=>f.file===activation);assert.equal(plan.parent.activationHash,parentActivation.afterHash,'Parent activation identity mismatch');
  for(const f of parent.files)assert.equal(readFileSync(join(planDirectory(parent.planHash,base,plan.parent.family),`${digest(f.file)}.before`),'utf8'),f.before,'Parent rollback evidence changed');
  for(const f of plan.files)assert.equal(f.beforeHash,parent.files.find((p)=>p.file===f.file)?.afterHash??parent.dependencies.find((d)=>d.file===f.file)?.hash,'Child before bytes do not match verified parent');
  for(const d of plan.dependencies)assert.equal(digest(readFileSync(safe(base,d.file))),d.hash,`Stale source/dependency: ${d.file}`);
  return dir;
}
export function applyContinuation(plan,{base=root,authorize,execute=false,development=false,rollback=false,afterFile=null}={}){
  const dir=validate(plan,base);if(!execute)return {dryRun:true,writes:0,planHash:plan.planHash};
  assertDevelopmentEnvironment({root:base,development});assert.equal(authorize,plan.planHash,'Fresh exact manifest-specific authorization required');
  // Same cross-version lock as V6.0. Never bypass a different plan/process.
  const lockFile=join(base,'.content-work/release-v6/.lock');mkdirSync(dirname(lockFile),{recursive:true});
  if(existsSync(lockFile)){
    const owner=JSON.parse(readFileSync(lockFile,'utf8'));assert.equal(owner.planHash,plan.planHash,'Another release owns the lock');assert.ok(Number.isInteger(owner.pid)&&owner.pid>0);
    let alive=true;try{process.kill(owner.pid,0);}catch(error){if(error.code==='ESRCH')alive=false;else throw error;}assert.equal(alive,false,'Release process is still active');unlinkSync(lockFile);
  }
  const lock=openSync(lockFile,'wx');writeFileSync(lock,json({pid:process.pid,planHash:plan.planHash}));let writes=0;
  const event=(kind,data={})=>immutable(join(dir,`${Date.now()}-${Math.random().toString(16).slice(2)}-${kind}.json`),json({planHash:plan.planHash,parent:plan.parent.planHash,action:rollback?'rollback':'apply',productionPublication:false,...data}));
  try{
    validate(plan,base);event('intent');
    for(const [index,f]of (rollback?[...plan.files].reverse():plan.files).entries()){
      const target=safe(base,f.file),wanted=rollback?f.beforeHash:f.afterHash,expected=rollback?f.afterHash:f.beforeHash,current=digest(readFileSync(target));if(current===wanted)continue;assert.equal(current,expected,'Concurrent runtime edit');
      const tmp=join(dirname(target),`.release-v61-${plan.planHash.slice(0,12)}.tmp`);
      if(existsSync(tmp))assert.equal(digest(readFileSync(tmp)),wanted,'Unknown interrupted temporary bytes');
      else{const fd=openSync(tmp,'wx');try{writeFileSync(fd,rollback?f.before:f.after);fsyncSync(fd);}finally{closeSync(fd);}}
      assert.equal(digest(readFileSync(target)),expected);renameSync(tmp,target);writes++;event('file',{file:f.file,hash:wanted});afterFile?.(f,index);
    }
    event('complete',{writes});return {planHash:plan.planHash,writes,state:rollback?'parent':'child',atomicity:'per-file only'};
  }catch(error){event('interrupted',{writes,error:error.message});throw error;}finally{closeSync(lock);unlinkSync(lockFile);}
}
