// Reversible code delta relative to the DIRTY input workspace, never Git HEAD.
import fs from 'node:fs';
import {resolve,sep,dirname} from 'node:path';
import assert from 'node:assert/strict';
import {hash,json} from './conversion-recovery.mjs';
const folder='.content-work/stabilization-v2';
// Keep this recovery utility available after rollback so --redo still works.
const added=['scripts/source-first/stabilization-fidelity.mjs','scripts/source-first/stabilization-symbolic.py','scripts/source-first/current-qa.mjs','scripts/source-first/qa-inputs.mjs','scripts/hosting-artifact.mjs','tests/stabilization-v2.test.mjs','tests/stabilization-browser.test.mjs','tests/stabilization-patch.test.mjs','tests/fixtures/fidelity-v2.mjs'];
const own=(root,file)=>{assert.ok(/^(assets\/|scripts\/|tests\/|docs\/|package\.json$|\.gitignore$)/u.test(file)&&!file.includes('..')&&!file.startsWith('assets/content/')&&!file.startsWith('assets/js/data/'));const p=resolve(root,file);assert.ok(p.startsWith(resolve(root)+sep));return p;};
export function sealPatch(){
  const files=JSON.parse(fs.readFileSync(folder+'/baseline/files.json')).map((file,i)=>({file,before:fs.readFileSync(folder+`/baseline/${i}.before`).toString('base64')}));
  for(const file of added)if(fs.existsSync(file))files.push({file,before:null});
  for(const f of files)f.after=fs.readFileSync(own(process.cwd(),f.file)).toString('base64');
  const body={schemaVersion:'bienedu.dirty-code-delta.v2',files:files.filter(f=>f.before!==f.after),retainedRecoveryUtility:'scripts/source-first/stabilization-patch.mjs'},plan={...body,planHash:hash(json(body))},path=folder+'/'+plan.planHash;
  fs.mkdirSync(path,{recursive:true});if(fs.existsSync(path+'/manifest.json'))assert.equal(fs.readFileSync(path+'/manifest.json','utf8'),json(plan));else fs.writeFileSync(path+'/manifest.json',json(plan),{flag:'wx'});
  fs.writeFileSync('.audit/stabilization-v2/code-plan.json',json({manifest:path+'/manifest.json',planHash:plan.planHash}));return {planHash:plan.planHash,manifest:path+'/manifest.json',files:body.files.length};
}
export function restorePatch(plan,{root=process.cwd(),authorize,execute=false,phase='before'}={}){
  const {planHash,...body}=plan;assert.equal(hash(json(body)),planHash);assert.ok(execute&&authorize===planHash,'Explicit matching code-plan authorization required');assert.ok(['before','after'].includes(phase));
  // Preflight EVERY target before changing any; overlapping user edits refuse.
  for(const f of plan.files){const path=own(root,f.file),current=fs.existsSync(path)?fs.readFileSync(path).toString('base64'):null;assert.ok(current===f.before||current===f.after,'User edit conflict: '+f.file);}
  const path=resolve(root,'.audit/stabilization-v2');fs.mkdirSync(path,{recursive:true});const lock=path+'/code-operation.lock',fd=fs.openSync(lock,'wx');
  try{for(const f of plan.files){const dest=own(root,f.file),bytes=f[phase],current=fs.existsSync(dest)?fs.readFileSync(dest).toString('base64'):null;assert.ok(current===f.before||current===f.after,'Concurrent user edit conflict: '+f.file);if(current===bytes)continue;if(bytes===null){if(fs.existsSync(dest))fs.unlinkSync(dest);}else{fs.mkdirSync(dirname(dest),{recursive:true});const tmp=dest+'.quality.tmp';assert.ok(!fs.existsSync(tmp),'Unresolved temporary file');fs.writeFileSync(tmp,Buffer.from(bytes,'base64'),{flag:'wx'});fs.renameSync(tmp,dest);}fs.appendFileSync(path+'/code-operations.jsonl',JSON.stringify({planHash,file:f.file,phase})+'\n');}}finally{fs.closeSync(fd);fs.unlinkSync(lock);}
  return {restored:phase,files:plan.files.length};
}
if(process.argv[1]?.endsWith('stabilization-patch.mjs')){try{if(process.argv[2]==='seal')console.log(json(sealPatch()));else{const p=JSON.parse(fs.readFileSync('.audit/stabilization-v2/code-plan.json')),plan=JSON.parse(fs.readFileSync(p.manifest));console.log(json(restorePatch(plan,{authorize:process.argv[process.argv.indexOf('--authorize')+1],execute:process.argv.includes('--execute'),phase:process.argv.includes('--redo')?'after':'before'})));}}catch(e){console.error(e.message);process.exitCode=1;}}
