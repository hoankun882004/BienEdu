import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,copyFileSync,rmSync,writeFileSync}from'node:fs';
import{join,dirname,resolve,relative}from'node:path';
import{tmpdir}from'node:os';
import{root}from'../scripts/source-first/build.mjs';
import{digest}from'../scripts/source-first/model.mjs';
import{applyV6,activation,output}from'../scripts/source-first/release-v6.mjs';
import{validateContent}from'../assets/js/components/canonical-math.js';
const read=(file)=>JSON.parse(readFileSync(join(root,file),'utf8'));
const report=read(`${output}/inventory.json`),plan=read(report.manifest);
test('nine independent educational sources retain exact current hashes and coverage',()=>{
  assert.equal(report.sources.length,9);assert.equal(new Set(report.sources.map((s)=>s.sourceId)).size,9);
  for(const source of report.sources)assert.equal(digest(readFileSync(join(root,source.file))),source.sha256);
  assert.equal(report.sources.filter((s)=>s.topics.includes('CD12')).length,2,'Different calculus editions must remain independent');
  assert.equal(report.sources.filter((s)=>s.topics.includes('CD20')).length,2,'PDF and TEX stay independent');
  assert.equal(report.matrix.length,39);assert.equal(report.matrix.filter((t)=>t.status==='SOURCE_MISSING').length,10);
});
test('new PDF headings pair full stable IDs, not repeated statement/solution counts',()=>{
  for(const [id,count]of [['cd17-cd19-sequences-2026',170],['cd15-cd16-trigonometry-2026',150],['cd12-cd14-calculus-2026',260],['cd28-cd33-vector-2026',500]]){
    const source=report.sources.find((s)=>s.sourceId===id);assert.equal(source.sections.reduce((n,r)=>n+r.paired,0),count,id);
    assert.equal(source.sections.flatMap((r)=>r.ambiguousIds).length,0);
  }
});
test('one complete new semantic group: knowledge/method/10 examples/10 solutions; no invented practice',()=>{
  const bundle=read(`${output}/bundle.json`),group=bundle.groups[0];assert.equal(group.code,'17.1');assert.equal(group.examples.length,10);assert.equal(group.practice.length,0);assert.equal(group.method.exampleCount,10);
  for(const [i,e]of group.examples.entries()){assert.equal(e.id,`17.1-source-example-${i+1}`);assert.equal(e.sourceEvidence.length,2);assert.equal(validateContent(e.prompt).valid,true);assert.equal(validateContent(e.steps[0].expression).valid,true);assert.ok(e.sourceEvidence.every((s)=>s.sourceHash===group.source.sha256));}
  assert.equal(report.sourceEvidence.length,20);assert.ok(report.symbolic.checks.every((c)=>c.passed));assert.equal(report.symbolic.checks.length,10);
});
test('canonical math remains the single conversion contract for prepared content and corrections',()=>{
  const nodes=read(`${output}/canonical.json`);assert.ok(nodes.length>=59);for(const record of nodes)assert.equal(validateContent(record.node).valid,true,record.path);
  const corrections=read(`${output}/bundle.json`).corrections;assert.equal(corrections.length,35);
  const child=read('.audit/source-first-v5/development-preview-v5.6.json').plan;
  for(const field of child.files[0].changes){const match=corrections.find((c)=>c.recordId===field.recordId&&c.fieldId===field.fieldId);assert.ok(match);assert.equal(match.before,field.before);}
  for(const id of ['6.1-source-example-7','6.1-source-example-8','6.1-source-example-9'])assert.deepEqual(corrections.filter((c)=>c.recordId===id).map((c)=>c.fieldId),['prompt','answer','source-solution.expression']);
});
test('protected CD20/CD21 and unpublished CD23 are not supplemented or corrected',()=>{
  const bundle=read(`${output}/bundle.json`);assert.ok(bundle.groups.every((g)=>!['CD20','CD21','CD23'].includes(g.topicId)));
  assert.ok(bundle.corrections.every((c)=>!/^2[013]\./u.test(c.recordId)));assert.equal(report.matrix.find((r)=>r.topicId==='CD23').status,'UNPUBLISHED_BLOCKED');
});
function fixture(){const base=mkdtempSync(join(tmpdir(),'bienedu-v6-'));for(const file of [...plan.dependencies.map((d)=>d.file),...plan.files.map((d)=>d.file),report.manifest,...plan.files.map((f)=>`.content-work/release-v6/${plan.planHash}/${digest(f.file)}.before`)]){const to=join(base,file);mkdirSync(dirname(to),{recursive:true});copyFileSync(join(root,file),to);}mkdirSync(join(base,'.git'));return {base,cleanup:()=>{const rel=relative(resolve(tmpdir()),resolve(base));assert.ok(rel&&!rel.startsWith('..'));rmSync(base,{recursive:true,force:true});}};}
test('local release dry-run makes no writes; exact manifest authorization is mandatory',()=>{
  const f=fixture();try{assert.equal(applyV6(plan,{base:f.base}).writes,0);assert.throws(()=>applyV6(plan,{base:f.base,execute:true,development:true,authorize:'wrong'}));assert.equal(readFileSync(join(f.base,activation),'utf8'),plan.files[1].before);}finally{f.cleanup();}
});
test('interrupted multi-file release resumes idempotently and rolls back in reverse safely',()=>{
  const f=fixture(),options={base:f.base,execute:true,development:true,authorize:plan.planHash};try{
    assert.throws(()=>applyV6(plan,{...options,afterFile:(_file,index)=>{if(index===0)throw new Error('Simulated interruption');}}),/Simulated/);
    assert.equal(digest(readFileSync(join(f.base,plan.files[0].file))),plan.files[0].afterHash);assert.equal(readFileSync(join(f.base,activation),'utf8'),plan.files[1].before);
    assert.equal(applyV6(plan,options).writes,1);assert.equal(applyV6(plan,options).writes,0);
    assert.equal(applyV6(plan,{...options,rollback:true}).writes,2);assert.equal(applyV6(plan,{...options,rollback:true}).writes,0);
    for(const file of plan.files)assert.equal(digest(readFileSync(join(f.base,file.file))),file.beforeHash);
  }finally{f.cleanup();}
});
test('stale source, changed dependencies and concurrent runtime edits are rejected',()=>{
  const f=fixture(),options={base:f.base,execute:true,development:true,authorize:plan.planHash};try{
    const d=plan.dependencies[0],file=join(f.base,d.file),before=readFileSync(file);writeFileSync(file,'stale');assert.throws(()=>applyV6(plan,options),/Stale/);writeFileSync(file,before);
    writeFileSync(join(f.base,activation),'user edit');assert.throws(()=>applyV6(plan,options),/Runtime conflict/);
  }finally{f.cleanup();}
});
test('real V5.5 content stays applied and V5.6 content stays prepared, never applied by tests',()=>{
  for(const file of plan.files)assert.equal(digest(readFileSync(join(root,file.file))),file.beforeHash);
  const recovery=read('.audit/source-first-v5/recovery-v5.6.json');for(const entry of [...recovery.runtime,...recovery.parentDependencies,...recovery.protectedFiles])assert.equal(digest(readFileSync(join(root,entry.file))),entry.hash);
});
