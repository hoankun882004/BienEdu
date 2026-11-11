import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join,dirname,relative,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {root} from '../scripts/source-first/build.mjs';
import {read} from '../scripts/source-first/release-chain-v61.mjs';
import {digest} from '../scripts/source-first/model.mjs';
import {applyPublication,publicationStatus,validatePublication} from '../scripts/source-first/publish-v621.mjs';
import {buildNativeCD08} from '../scripts/source-first/import-cd08-native.mjs';
const index=read('.audit/source-first-v5/release-v62/publication-v621.json'),plan=read(index.manifest);
function fixture(){
  const base=mkdtempSync(join(tmpdir(),'bienedu-publication-test-'));
  const oldIndex='.audit/source-first-v5/release-v62/inventory.json',old=read(read(oldIndex).manifest);
  const files=new Set([...plan.dependencies.map(d=>d.file),...plan.files.map(f=>f.file),index.manifest,oldIndex,read(oldIndex).manifest,
    ...plan.files.map(f=>`.content-work/publish-v621/${plan.planHash}/${digest(f.file)}.before`),old.bundle]);
  for(const file of files){mkdirSync(dirname(join(base,file)),{recursive:true});copyFileSync(join(root,file),join(base,file));}
  for(const f of plan.files)writeFileSync(join(base,f.file),f.before);
  return {base,cleanup:()=>{assert.ok(!relative(resolve(tmpdir()),resolve(base)).startsWith('..'));rmSync(base,{recursive:true,force:true});}};
}
test('only additive start/dev adoption and unchanged verified math payload are prepared',()=>{
  validatePublication(plan);assert.equal(plan.counts.newExamples,761);assert.equal(plan.counts.stillBlocked,240);assert.equal(plan.counts.examined,1001);assert.equal(plan.counts.newExamples+plan.counts.stillBlocked,plan.counts.examined);
  const before=JSON.parse(plan.files.find(f=>f.file==='package.json').before),after=JSON.parse(plan.files.find(f=>f.file==='package.json').after);
  assert.equal(before.scripts.start,after.scripts.start);assert.equal(before.scripts.dev,after.scripts.dev);assert.deepEqual(before.dependencies,after.dependencies);assert.deepEqual(before.devDependencies,after.devDependencies);
  assert.equal(plan.humanMathematicalApproval,false);
});
test('all 140 native CD08 pairs keep exact full IDs, source bytes, math and previous-source separation',()=>{
  const native=buildNativeCD08(),payload=read(plan.publicationBundle.file);assert.equal(native.groups.length,14);assert.equal(native.counts.examples,140);assert.equal(native.counts.mathOccurrences,636);
  assert.deepEqual(payload.groups.slice(-14),native.groups);assert.equal(native.source.sha256,plan.nativeSource.sha256);
  for(const g of native.groups){assert.equal(g.mergeMode,'append-independent-source');assert.ok(g.sourceContext.knowledge&&g.sourceContext.method);assert.equal(g.practice.length,0);
    for(const e of g.examples){assert.equal(e.sourceExampleNumber,`${g.code}.${e.originalExampleNumber}`);assert.equal(e.sourceEvidence.length,2);assert.equal(e.verification.humanApproval,false);assert.ok(Array.isArray(e.sourceLines));assert.ok(e.sourceLines.every(Number.isInteger));assert.equal(e.sourceLineRanges.statement.length,2);assert.equal(e.sourceLineRanges.solution.length,2);}
  }
  assert.equal(payload.groups.reduce((n,g)=>n+g.examples.length,0),980);
});
test('hosting includes the exact three learner adapters but not the source-first tools',()=>{
  const rules=plan.files.find(f=>f.file==='.vercelignore').after;
  for(const n of ['learner.mjs','registry.mjs','lesson-workspace.mjs'])assert.ok(rules.includes('!scripts/source-first/runtime-v62/'+n));
  assert.ok(rules.includes('scripts/source-first/*'));assert.ok(!rules.includes('!scripts/source-first/layout'));
});
test('published bundles load on real hostnames; local-only preview remains private',()=>{
  const after=plan.files.find(f=>f.file==='assets/js/data/learning-overlay.js').after;
  assert.ok(after.includes("releaseBundle=(typeof location!=='undefined'&&(preview||localRelease))?"));assert.ok(!after.includes('releaseBundle=local&&'));
  assert.ok(after.includes('const query=local?'));assert.ok(after.includes('crypto.subtle.digest'));assert.ok(after.includes('if(preview)return null;throw error;'));
  assert.ok(readFileSync(join(root,'.gitattributes'),'utf8').includes('assets/content/local-learning/*.json -text'));
  assert.ok(plan.files.find(f=>f.file==='assets/js/graph-loader.js').after.includes('else if (releaseBundle)'));
  assert.ok(plan.files.find(f=>f.file==='assets/learning-v6.css').after.includes('.learning-workspace .example-card{grid-template-columns:minmax(0,1fr)}'));
});
test('dry run and wrong authorization do not write',()=>{
  const f=fixture();try{assert.equal(applyPublication(plan,{base:f.base}).writes,0);assert.throws(()=>applyPublication(plan,{base:f.base,execute:true,authorize:'wrong'}));assert.equal(publicationStatus(plan,f.base).status,'PREPARED');}finally{f.cleanup();}
});
test('exact apply is idempotent and rollback preserves the user start/dev additions',()=>{
  const f=fixture(),args={base:f.base,execute:true,authorize:plan.planHash};try{
    assert.equal(applyPublication(plan,args).writes,15);assert.equal(publicationStatus(plan,f.base).status,'ACTIVE');assert.equal(applyPublication(plan,args).writes,0);
    assert.equal(applyPublication(plan,{...args,rollback:true}).writes,15);assert.equal(publicationStatus(plan,f.base).status,'PREPARED');assert.equal(applyPublication(plan,{...args,rollback:true}).writes,0);
    assert.equal(JSON.parse(readFileSync(join(f.base,'package.json'),'utf8')).scripts.start,'node scripts/serve.mjs');
  }finally{f.cleanup();}
});
test('interrupted apply and interrupted rollback resume without losing backups',()=>{
  const f=fixture(),args={base:f.base,execute:true,authorize:plan.planHash};try{
    assert.throws(()=>applyPublication(plan,{...args,afterFile:(_f,i)=>{if(i===2)throw Error('interrupted');}}));assert.equal(publicationStatus(plan,f.base).status,'PARTIAL');applyPublication(plan,args);
    assert.throws(()=>applyPublication(plan,{...args,rollback:true,afterFile:()=>{throw Error('interrupted rollback');}}));applyPublication(plan,{...args,rollback:true});assert.equal(publicationStatus(plan,f.base).status,'PREPARED');
  }finally{f.cleanup();}
});
test('unknown target edits, stale source and corrupt backups fail closed',()=>{
  for(const kind of ['target','source','backup']){const f=fixture();try{
    const file=kind==='target'?plan.files[0].file:kind==='source'?plan.dependencies.find(d=>d.file.endsWith('.pdf')).file:`.content-work/publish-v621/${plan.planHash}/${digest(plan.files[0].file)}.before`;
    writeFileSync(join(f.base,file),'unreviewed');assert.throws(()=>applyPublication(plan,{base:f.base,execute:true,authorize:plan.planHash}));assert.equal(readFileSync(join(f.base,file),'utf8'),'unreviewed');
  }finally{f.cleanup();}}
});
test('a live cross-version lock is not bypassed',()=>{
  const f=fixture();try{mkdirSync(join(f.base,'.content-work/release-v6'),{recursive:true});writeFileSync(join(f.base,'.content-work/release-v6/.lock'),'another owner');assert.throws(()=>applyPublication(plan,{base:f.base,execute:true,authorize:plan.planHash}),/EEXIST/u);}finally{f.cleanup();}
});
