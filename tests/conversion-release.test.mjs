import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve,relative} from 'node:path';
import {executeConversion,conversionStatus,recoverConversionLock} from '../scripts/source-first/conversion-release.mjs';
import {hash,json,read,output} from '../scripts/source-first/conversion-recovery.mjs';

function fixture(fn){const root=mkdtempSync(join(tmpdir(),'bienedu-conversion-'));const put=(file,bytes)=>{mkdirSync(dirname(join(root,file)),{recursive:true});writeFileSync(join(root,file),bytes);};
  try{const files=['assets/js/data/pdf-knowledge-release.js','assets/js/data/geometry-activation.js'].map((file,i)=>({file,before:'before-'+i,after:'after-'+i}));files.forEach(f=>put(f.file,f.before));put('dependency.txt','fixed');
    const body={schemaVersion:'bienedu.conversion-local-plan.v1',files,dependencies:[{file:'dependency.txt',sha256:hash('fixed')}]},planHash=hash(json(body)),plan={...body,planHash};
    const folder=`.content-work/conversion-recovery/${planHash}`;put(folder+'/manifest.json',json(plan));files.forEach((f,i)=>put(folder+`/before-${i}.txt`,f.before));put(output+'/plan.json',json({planHash,manifest:folder+'/manifest.json'}));
    return fn({root,plan,put,options:{root,authorize:planHash,execute:true}});
  }finally{assert.ok(relative(resolve(tmpdir()),root)&&!relative(resolve(tmpdir()),root).startsWith('..'));rmSync(root,{recursive:true,force:true});}}

test('release refuses missing or mismatched user authorization',()=>fixture(({root,options})=>{assert.throws(()=>executeConversion('apply',{root}),/authorize/);assert.throws(()=>executeConversion('apply',{...options,authorize:'A'.repeat(64)}),/authorize/);assert.equal(conversionStatus(root).status,'PREPARED_NOT_APPLIED');}));
test('apply and rollback are idempotent and restore exact backup bytes',()=>fixture(({root,options,plan})=>{for(let i=0;i<2;i++)assert.equal(executeConversion('apply',options).status,'APPLIED_LOCAL_ONLY');for(let i=0;i<2;i++)assert.equal(executeConversion('rollback',options).status,'PREPARED_NOT_APPLIED');for(const f of plan.files)assert.equal(readFileSync(join(root,f.file),'utf8'),f.before);}));
test('interrupted pointer update resumes without corrupting unrelated bytes',()=>fixture(({root,options,put})=>{put('progress.json','student progress');assert.throws(()=>executeConversion('apply',{...options,interruptAfter:1}),/interruption/);assert.equal(conversionStatus(root).status,'INTERRUPTED');assert.equal(executeConversion('apply',options).status,'APPLIED_LOCAL_ONLY');assert.equal(readFileSync(join(root,'progress.json'),'utf8'),'student progress');}));
test('stale dependency and unknown target bytes fail closed',()=>fixture(({root,options,put,plan})=>{put('dependency.txt','changed');assert.throws(()=>executeConversion('apply',options),/Stale dependency/);put('dependency.txt','fixed');put(plan.files[0].file,'user edit');assert.throws(()=>executeConversion('apply',options),/Unknown target/);assert.equal(readFileSync(join(root,plan.files[0].file),'utf8'),'user edit');}));
test('manifest and backup tampering cannot authorize a migration',()=>fixture(({options,plan,put})=>{put(`.content-work/conversion-recovery/${plan.planHash}/before-0.txt`,'tampered');assert.throws(()=>executeConversion('apply',options));}));
test('live operation lock cannot be bypassed or stolen',()=>fixture(({root,plan,options,put})=>{put(output+'/operation.lock',json({pid:process.pid,planHash:plan.planHash}));assert.throws(()=>executeConversion('apply',options),/EEXIST/);assert.throws(()=>recoverConversionLock(options),/Live lock/);assert.ok(existsSync(join(root,output+'/operation.lock')));}));
test('dead operation lock is recoverable only with exact authorization',()=>fixture(({root,plan,options,put})=>{put(output+'/operation.lock',json({pid:2147483646,planHash:plan.planHash}));assert.throws(()=>recoverConversionLock({root}),/authorization/);assert.equal(recoverConversionLock(options).status,'PREPARED_NOT_APPLIED');assert.equal(executeConversion('apply',options).status,'APPLIED_LOCAL_ONLY');}));

test('PDF corrections change only source-supported differential ownership',()=>{
  const all=read(output+'/pdf-corrections.json');assert.equal(all.length,43);
  const corrections=all.filter(c=>c.category==='MATH_PROSE_BOUNDARY');assert.equal(corrections.length,39);
  const flatten=node=>node.type==='math'?node.latex:node.type==='text'?node.value:node.segments.map(flatten).join('');
  let glyphs=0;
  for(const c of corrections){
    assert.equal(flatten(c.after).replaceAll(String.raw`\mathrm{d}`,'d').replace(/\s/gu,''),flatten(c.before).replace(/\s/gu,''),c.blockId);
    for(const evidence of c.evidence){assert.equal(evidence.kind,'Differential');assert.equal(evidence.children.length,1);assert.equal(evidence.children[0].value,'d');glyphs++;}
  }
  assert.equal(glyphs,64);
});
