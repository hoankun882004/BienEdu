// New hash-bound child plan. Old manifests, backups and journals are read-only.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync,openSync,closeSync,unlinkSync,renameSync,appendFileSync} from 'node:fs';
import {resolve,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {root as workspace,output,hash,json,runtimeHashes} from './conversion-recovery.mjs';
import {qaInputs} from './qa-inputs.mjs';

const targets=['assets/js/data/pdf-knowledge-release.js','assets/js/data/geometry-activation.js'];
const owned=(root,file)=>{const path=resolve(root,file);assert.ok(path.startsWith(resolve(root)+sep),'Outside workspace');return path;};
const read=(root,file)=>JSON.parse(readFileSync(owned(root,file),'utf8'));
function immutable(root,file,bytes){const path=owned(root,file);mkdirSync(dirname(path),{recursive:true});if(existsSync(path))assert.equal(readFileSync(path,'utf8'),bytes,'Immutable backup conflict');else writeFileSync(path,bytes,{flag:'wx'});}
export function freezeQaEvidence(root,dependencies){
  const evidence=[];
  const frozen=dependencies.map(d=>{
    if(!/^\.audit\/(?:conversion-recovery|quality-recovery|stabilization-v2)\//u.test(d.file))return d;
    const bytes=readFileSync(owned(root,d.file));assert.equal(hash(bytes),d.sha256);
    const file='.content-work/conversion-recovery/evidence/'+d.sha256+'.json';immutable(root,file,bytes.toString('utf8'));
    evidence.push({origin:d.file,file,sha256:d.sha256});return {...d,file};
  });return {dependencies:frozen,evidence};
}
export function prepareConversion(root=workspace){
  const summary=read(root,output+'/summary.json'),browser=read(root,output+'/browser.json');
  assert.equal(browser.passed,true,'Fresh real-route browser verification required');
  assert.equal(browser.sharedSourceVerified,true,'Shared source edition validation required');
  assert.equal(browser.correctedBlockMathMLComparisons,43*8);
  assert.deepEqual(browser.candidate,summary.candidate);
  assert.deepEqual(browser.runtimeHashes,summary.runtimeHashes);
  if(root===workspace)assert.deepEqual(runtimeHashes(),summary.runtimeHashes,'Runtime changed since preview');
  // The knowledge parent is hash-bound by the active geometry bundle, so this
  // continuation must carry both pointers. Require the FULL compatibility gate,
  // not only the single geometry route in the conversion smoke test.
  const quality=read(root,'.audit/quality-recovery/matrix.json'),geometry=read(root,'.audit/quality-recovery/geometry.json'),source=read(root,'.audit/quality-recovery/content.json');
  assert.equal(quality.passed,true);assert.equal(quality.states.length,132);assert.deepEqual(quality.runtimeHashes,summary.runtimeHashes);
  assert.equal(geometry.passed,true);assert.equal(geometry.records,30);assert.equal(geometry.states.length,240);assert.ok(geometry.states.every(s=>s.properties));
  assert.deepEqual(geometry.candidate,summary.candidate);assert.deepEqual(geometry.runtimeHashes,summary.runtimeHashes);
  assert.equal(source.sourceHashAndGlyphEvidence.passed,true);assert.equal(source.sourceMatchedMathNodes,26);
  const stabilization=read(root,'.audit/stabilization-v2/candidate.json'),fidelity=read(root,'.audit/stabilization-v2/fidelity.json'),hosting=read(root,'.audit/stabilization-v2/hosting.json');
  assert.equal(stabilization.passed,true,'Full current-code candidate QA required');assert.deepEqual(stabilization.runtimeHashes,summary.runtimeHashes);assert.equal(hosting.passed,true);assert.equal(fidelity.independentMathNodes,93);
  assert.equal(stabilization.scope,'READ_ONLY_CANDIDATE');assert.deepEqual(stabilization.candidate,summary.candidate);
  if(root===workspace)assert.deepEqual(qaInputs(),stabilization.inputHashes,'QA inputs changed; rerun candidate QA');
  const corrections=read(root,output+'/pdf-corrections.json');assert.equal(corrections.length,summary.pdfCorrectionBlocks);assert.ok(corrections.length>0);
  const dependencies=[...Object.entries(summary.runtimeHashes).filter(([file])=>!targets.includes(file)).map(([file,sha256])=>({file,sha256})),
    ...Object.entries(stabilization.inputHashes).filter(([file])=>!targets.includes(file)).map(([file,sha256])=>({file,sha256})),
    ...summary.sources.map(s=>({file:s.file,sha256:s.sha256})),
    ...Object.values(summary.parent).map(p=>({file:p.bundle,sha256:p.sha256??p.bundleHash})),
    ...Object.values(summary.candidate).map(p=>({file:p.bundle,sha256:p.sha256})),
    ...['summary.json','pdf-corrections.json','browser.json'].map(f=>({file:output+'/'+f,sha256:hash(readFileSync(owned(root,output+'/'+f)))})),
    ...['matrix.json','geometry.json','content.json'].map(f=>({file:'.audit/quality-recovery/'+f,sha256:hash(readFileSync(owned(root,'.audit/quality-recovery/'+f)))})),
    ...['.audit/stabilization-v2/candidate.json','.audit/stabilization-v2/fidelity.json','.audit/stabilization-v2/hosting.json','scripts/source-first/stabilization-fidelity.mjs','scripts/source-first/current-qa.mjs','scripts/hosting-artifact.mjs','tests/fixtures/fidelity-v2.mjs','tests/stabilization-v2.test.mjs','tests/stabilization-browser.test.mjs']
      .map(file=>({file,sha256:hash(readFileSync(owned(root,file)))})),
    ...['conversion-recovery.mjs','conversion-recovery.py','layout-v62.py','knowledge-pdf.py','canonical-adapters.mjs','conversion-symbolic.py'].map(f=>({file:'scripts/source-first/'+f,sha256:hash(readFileSync(owned(root,'scripts/source-first/'+f)))})),
    ...['scripts/source-first/quality-content-audit.mjs','scripts/source-first/knowledge-source-proof.py','scripts/source-first/knowledge-symbolic.py','scripts/source-first/knowledge-qa.mjs',
      'tests/fixtures/cd01-source-knowledge.json','tests/knowledge-quality-browser.test.mjs','tests/knowledge-matrix-browser.test.mjs','tests/knowledge-navigation-browser.test.mjs','tests/knowledge-presentation.test.mjs','tests/knowledge-geometry-browser.test.mjs']
      .map(file=>({file,sha256:hash(readFileSync(owned(root,file)))})),
    {file:'scripts/latex-pilot/parser.mjs',sha256:hash(readFileSync(owned(root,'scripts/latex-pilot/parser.mjs')))},
    {file:'scripts/source-first/conversion-release.mjs',sha256:hash(readFileSync(owned(root,'scripts/source-first/conversion-release.mjs')))}];
  const files=targets.map((file,index)=>({file,before:readFileSync(owned(root,file),'utf8'),after:index===0
    ?`// Explicitly authorized source-backed conversion continuation.\nexport const pdfKnowledgeRelease = Object.freeze(${JSON.stringify(summary.candidate.knowledge)});\n`
    :`// Geometry constructions unchanged; authenticated knowledge-parent continuation.\nexport const geometryActivation=${JSON.stringify(summary.candidate.geometry)};\n`}));
  const frozen=freezeQaEvidence(root,dependencies);
  const body={schemaVersion:'bienedu.conversion-local-plan.v1',scope:'PDF literal differential and indexed radical ownership; TEX parser candidates remain staged',files,dependencies:frozen.dependencies,evidence:frozen.evidence,
    candidate:summary.candidate,correctionBlocks:corrections.length,qualityGates:{knowledgeStates:132,geometryStates:240,sourceMatchedMathNodes:26},localOnly:true,requiresExplicitAuthorization:true};
  const plan={...body,planHash:hash(json(body))},folder=`.content-work/conversion-recovery/${plan.planHash}`;
  immutable(root,folder+'/manifest.json',json(plan));files.forEach((f,i)=>immutable(root,folder+`/before-${i}.txt`,f.before));
  writeFileSync(owned(root,output+'/plan.json'),json({planHash:plan.planHash,manifest:folder+'/manifest.json'}));
  return {status:'PREPARED_NOT_APPLIED',planHash:plan.planHash,backup:folder,
    apply:`node scripts/source-first/conversion-release.mjs apply --authorize ${plan.planHash} --execute`,
    rollback:`node scripts/source-first/conversion-release.mjs rollback --authorize ${plan.planHash} --execute`};
}
function load(root){const pointer=read(root,output+'/plan.json');assert.match(pointer.planHash,/^[A-F0-9]{64}$/u);assert.equal(pointer.manifest,`.content-work/conversion-recovery/${pointer.planHash}/manifest.json`);const plan=read(root,pointer.manifest),{planHash,...body}=plan;assert.equal(hash(json(body)),planHash);assert.equal(planHash,pointer.planHash);assert.deepEqual(plan.files.map(f=>f.file),targets);plan.files.forEach((f,i)=>assert.equal(readFileSync(owned(root,`.content-work/conversion-recovery/${planHash}/before-${i}.txt`),'utf8'),f.before));return plan;}
export function conversionStatus(root=workspace){const p=load(root),files=p.files.map(f=>{const bytes=readFileSync(owned(root,f.file),'utf8');return {file:f.file,state:bytes===f.before?'BEFORE':bytes===f.after?'AFTER':'UNKNOWN'};});return {planHash:p.planHash,status:files.some(f=>f.state==='UNKNOWN')?'CONFLICT':files.every(f=>f.state==='BEFORE')?'PREPARED_NOT_APPLIED':files.every(f=>f.state==='AFTER')?'APPLIED_LOCAL_ONLY':'INTERRUPTED',files};}
export function executeConversion(action,{root=workspace,authorize,execute=false,interruptAfter=Infinity}={}){
  assert.ok(['apply','rollback'].includes(action));const p=load(root);assert.ok(execute&&authorize===p.planHash,'Matching --authorize HASH and --execute required');assert.ok(!process.env.CI&&!process.env.VERCEL,'Local execution only');
  for(const d of p.dependencies)assert.equal(hash(readFileSync(owned(root,d.file))),d.sha256,'Stale dependency; new preview required: '+d.file);
  assert.notEqual(conversionStatus(root).status,'CONFLICT','Unknown target bytes');
  const lock=owned(root,output+'/operation.lock');let fd;
  try{fd=openSync(lock,'wx');writeFileSync(fd,json({pid:process.pid,planHash:p.planHash}));
    let changed=0;
    for(const f of action==='apply'?p.files:[...p.files].reverse()){
      const desired=action==='apply'?f.after:f.before,path=owned(root,f.file),current=readFileSync(path,'utf8');if(current===desired)continue;
      assert.ok(current===f.before||current===f.after,'Concurrent target edit');const temporary=path+'.conversion-'+p.planHash+'.tmp';
      if(existsSync(temporary))assert.equal(readFileSync(temporary,'utf8'),desired,'Unknown interrupted bytes');else writeFileSync(temporary,desired,{flag:'wx'});
      assert.equal(readFileSync(path,'utf8'),current,'Concurrent target edit');renameSync(temporary,path);
      appendFileSync(owned(root,output+'/operations.jsonl'),json({planHash:p.planHash,action,file:f.file,sha256:hash(desired)}).replace(/\n\s*/gu,'')+'\n');
      if(++changed>=interruptAfter)throw Error('Injected interruption (fixture only)');
    }return conversionStatus(root);
  }finally{if(fd!==undefined){closeSync(fd);unlinkSync(lock);}}
}
export function recoverConversionLock({root=workspace,authorize,execute=false}={}){
  const p=load(root);assert.ok(execute&&authorize===p.planHash,'Matching authorization required');
  const file=owned(root,output+'/operation.lock'),lock=read(root,output+'/operation.lock');assert.equal(lock.planHash,p.planHash);assert.ok(Number.isInteger(lock.pid)&&lock.pid>0);
  let alive=true;try{process.kill(lock.pid,0);}catch(e){if(e.code==='ESRCH')alive=false;else throw e;}assert.equal(alive,false,'Live lock owner');assert.notEqual(conversionStatus(root).status,'CONFLICT');
  for(const f of p.files){const temp=owned(root,f.file)+'.conversion-'+p.planHash+'.tmp';if(existsSync(temp)){assert.ok([f.before,f.after].includes(readFileSync(temp,'utf8')));unlinkSync(temp);}}
  unlinkSync(file);return conversionStatus(root);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const action=process.argv[2]??'status',options={authorize:process.argv[process.argv.indexOf('--authorize')+1],execute:process.argv.includes('--execute')};console.log(json(action==='prepare'?prepareConversion():action==='status'?conversionStatus():action==='recover-lock'?recoverConversionLock(options):executeConversion(action,options)));}catch(e){console.error(e.message);process.exitCode=1;}
}
