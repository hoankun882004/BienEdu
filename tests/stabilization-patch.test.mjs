import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {tmpdir} from 'node:os';import {join,resolve,relative} from 'node:path';
import {restorePatch} from '../scripts/source-first/stabilization-patch.mjs';import {hash,json} from '../scripts/source-first/conversion-recovery.mjs';
import {freezeQaEvidence} from '../scripts/source-first/conversion-release.mjs';
test('code rollback preserves dirty baseline, refuses overlapping user edits and is redoable',()=>{
  const root=fs.mkdtempSync(join(tmpdir(),'bienedu-code-delta-')),b=s=>Buffer.from(s).toString('base64');
  try{fs.mkdirSync(join(root,'assets'));const body={schemaVersion:'bienedu.dirty-code-delta.v2',files:[{file:'assets/example.css',before:b('existing user work'),after:b('this task edit')},{file:'assets/new.css',before:null,after:b('new owned file')}]},plan={...body,planHash:hash(json(body))},opts={root,authorize:plan.planHash,execute:true};
    fs.writeFileSync(join(root,'assets/example.css'),'overlapping user edit');fs.writeFileSync(join(root,'assets/new.css'),'new owned file');assert.throws(()=>restorePatch(plan,opts),/User edit conflict/);assert.equal(fs.readFileSync(join(root,'assets/new.css'),'utf8'),'new owned file');
    fs.writeFileSync(join(root,'assets/example.css'),'this task edit');assert.throws(()=>restorePatch(plan,{root}),/authorization/);restorePatch(plan,opts);assert.equal(fs.readFileSync(join(root,'assets/example.css'),'utf8'),'existing user work');assert.equal(fs.existsSync(join(root,'assets/new.css')),false);restorePatch(plan,{...opts,phase:'after'});assert.equal(fs.readFileSync(join(root,'assets/example.css'),'utf8'),'this task edit');
  }finally{assert.ok(relative(resolve(tmpdir()),root)&&!relative(resolve(tmpdir()),root).startsWith('..'));fs.rmSync(root,{recursive:true,force:true});}
});
test('release freezes QA proof without dropping source or code dependency guards',()=>{
  const root=fs.mkdtempSync(join(tmpdir(),'bienedu-proof-freeze-'));
  try{const report='.audit/stabilization-v2/check.json';fs.mkdirSync(join(root,'.audit/stabilization-v2'),{recursive:true});fs.writeFileSync(join(root,report),'original proof');
    const dependency={file:report,sha256:hash('original proof')},source={file:'source.pdf',sha256:'source-hash'};const result=freezeQaEvidence(root,[dependency,source]);
    assert.deepEqual(result.dependencies[1],source);assert.equal(result.evidence[0].origin,report);fs.writeFileSync(join(root,report),'later QA');assert.equal(fs.readFileSync(join(root,result.dependencies[0].file),'utf8'),'original proof');assert.throws(()=>freezeQaEvidence(root,[dependency]));
  }finally{assert.ok(relative(resolve(tmpdir()),root)&&!relative(resolve(tmpdir()),root).startsWith('..'));fs.rmSync(root,{recursive:true,force:true});}
});
