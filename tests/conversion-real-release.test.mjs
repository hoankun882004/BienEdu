import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,copyFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,relative,resolve} from 'node:path';
import {read,root as workspace,output,json} from '../scripts/source-first/conversion-recovery.mjs';
import {executeConversion,conversionStatus} from '../scripts/source-first/conversion-release.mjs';

test('fresh real correction manifest: isolated interrupted apply, resume, replay and exact rollback',()=>{
  const pointer=read(output+'/plan.json'),plan=read(pointer.manifest),root=mkdtempSync(join(tmpdir(),'bienedu-real-conversion-'));
  const targets=plan.files.map(f=>({file:f.file,bytes:readFileSync(join(workspace,f.file))}));
  const copy=file=>{mkdirSync(dirname(join(root,file)),{recursive:true});copyFileSync(join(workspace,file),join(root,file));};
  try{
    copy(output+'/plan.json');copy(pointer.manifest);
    for(const dependency of plan.dependencies)copy(dependency.file);
    for(const [index,file]of plan.files.entries()){copy(file.file);copy(`.content-work/conversion-recovery/${plan.planHash}/before-${index}.txt`);}
    const options={root,authorize:plan.planHash,execute:true};
    assert.equal(conversionStatus(root).status,'PREPARED_NOT_APPLIED');
    assert.throws(()=>executeConversion('apply',{...options,interruptAfter:1}),/interruption/);
    assert.equal(conversionStatus(root).status,'INTERRUPTED');
    assert.equal(executeConversion('apply',options).status,'APPLIED_LOCAL_ONLY');
    assert.equal(executeConversion('apply',options).status,'APPLIED_LOCAL_ONLY');
    // Re-running active QA may replace mutable reports. The authorized source
    // evidence is frozen, so this must not make an otherwise safe rollback stale.
    for(const proof of plan.evidence??[]){mkdirSync(dirname(join(root,proof.origin)),{recursive:true});writeFileSync(join(root,proof.origin),'new QA report');}
    assert.equal(executeConversion('rollback',options).status,'PREPARED_NOT_APPLIED');
    assert.equal(executeConversion('rollback',options).status,'PREPARED_NOT_APPLIED');
    for(const t of targets){assert.deepEqual(readFileSync(join(root,t.file)),t.bytes);assert.deepEqual(readFileSync(join(workspace,t.file)),t.bytes);}
    writeFileSync(join(workspace,output,'release-fixture.json'),json({passed:true,planHash:plan.planHash,interruptionResume:true,idempotence:true,exactRollback:true,activeRuntimeWrites:0}));
  }finally{assert.ok(relative(resolve(tmpdir()),root)&&!relative(resolve(tmpdir()),root).startsWith('..'));rmSync(root,{recursive:true,force:true});}
});
