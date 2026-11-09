import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {root} from '../scripts/source-first/build.mjs';
import {digest} from '../scripts/source-first/model.mjs';
import {spawnSync} from 'node:child_process';
import {output,buildContent} from '../scripts/source-first/content-v61.mjs';
import {applyContinuation,releaseStatus,activeBaseline,activation,savePlan} from '../scripts/source-first/release-chain-v61.mjs';
import {applyV6} from '../scripts/source-first/release-v6.mjs';
import {validateContent} from '../assets/js/components/canonical-math.js';
import {mathContentMarkup} from '../assets/js/components/canonical-math-renderer.js';
import {releaseFixture} from './helpers/release-v61.mjs';
const read=(path)=>JSON.parse(readFileSync(join(root,path),'utf8'));
const report=read(`${output}/inventory.json`),content=read(`${output}/content.json`),plan=read(report.manifest),parent=read(`.content-work/${plan.parent.family}/${plan.parent.planHash}/manifest.json`),previous=read(parent.bundle);
const initialRuntime=new Map([...plan.files,...parent.files].map((f)=>[f.file,digest(readFileSync(join(root,f.file)))]));
test('V6.1 accounts for every one of 1080 source-specific pairs, no success-count inflation',()=>{
  assert.equal(content.decisions.length,1080);assert.equal(new Set(content.decisions.map((d)=>d.id)).size,1080);assert.equal(content.counts.remainingUnprocessed,0);
  assert.equal(content.counts.newExamples,209);assert.equal(content.counts.newSolutions,209);assert.equal(content.counts.newKnowledgeGroups,29);
  assert.equal(content.groups.reduce((n,g)=>n+g.examples.length,0),209);assert.equal(Object.values(content.counts.byStatus).reduce((a,b)=>a+b,0),1080);
  assert.ok(content.decisions.filter((d)=>d.status!=='PREPARED'&&d.status!=='ALREADY_AVAILABLE').every((d)=>d.reasons.length));
});
test('source hashes, pages, and statement/solution glyph evidence remain independently bound',()=>{
  for(const source of content.sources)assert.equal(digest(readFileSync(join(root,source.file))),source.sha256);
  for(const g of content.groups)for(const e of g.examples){assert.equal(e.sourceEvidence.length,2);assert.equal(new Set(e.sourceEvidence.map((s)=>s.kind)).size,2);assert.ok(e.sourceEvidence.every((s)=>s.sourceHash===g.source.sha256&&s.sourceId===g.source.sourceId&&s.pages.length&&s.glyphHash.length===64));assert.equal(e.id,`${g.source.sourceId}:${g.code}:example:${e.originalExampleNumber}`);}
});
test('all prepared canonical fields parse without unresolved nodes, missing math, or unsafe HTML',()=>{
  let formulas=0;const check=(n)=>{assert.equal(validateContent(n).valid,true);assert.notEqual(n.type,'unresolved');if(n.type==='math')formulas++;for(const s of n.segments??[])check(s);};
  for(const g of content.groups){check(g.knowledge.lead);assert.ok(g.knowledge.lead.segments.length);for(const p of g.knowledge.points)check(p.text);for(const e of g.examples){check(e.prompt);check(e.steps[0].expression);assert.equal(e.answer.value,'');assert.equal(e.reviewStatus,'needs-review');}}
  assert.ok(formulas>500);assert.equal(content.humanApproval,false);
});
test('positioned-glyph adapter rejects ambiguous scopes and preserves control-word boundaries',()=>{
  const result=spawnSync('python',['-X','utf8','tests/source-glyph-v61.py'],{cwd:root,encoding:'utf8',windowsHide:true});assert.equal(result.status,0,result.stdout+result.stderr);
});
test('source-backed vector dot and cross products retain different mathematical operators',()=>{
  const dot=content.groups.find((g)=>g.code==='28.6').examples.find((e)=>e.originalExampleNumber===1);
  // Its statement is supported, but the full pair stays blocked because its
  // solution contains an unresolved condition. Do not publish it just for a test.
  const cross=read(`${output}/content-evidence.json`).sources.find((s)=>s.source.sourceId==='cd28-cd33-vector-2026').records.find((r)=>r.code==='28.3'&&r.number===9).fields.statement.content;
  assert.ok(dot.prompt.segments.some((n)=>n.type==='math'&&n.latex.includes(String.raw`\cdot `)));
  assert.ok(cross.segments.some((n)=>n.type==='math'&&n.latex.includes(String.raw`\times `)));
  assert.ok(mathContentMarkup(dot.prompt).includes('<mo>⋅</mo>'));assert.ok(!mathContentMarkup(dot.prompt).includes('<mo>×</mo>'));
  assert.ok(mathContentMarkup(cross).includes('<mo>×</mo>'));
});
test('systematic re-import is deterministic, does not overwrite prior examples or invent practice',()=>{
  const replay=buildContent(previous,{persist:false});assert.equal(digest(replay),digest(content));
  for(const g of content.groups){assert.equal(g.practice.length,0);assert.ok(!['12','13','14','20','21','23'].includes(g.code.split('.')[0]));}
  assert.equal(content.counts.alreadyAvailable,10);assert.ok(content.decisions.some((d)=>d.status==='RUNTIME_EDITION_MAPPING_UNRESOLVED'));
});
test('partial parent groups count only actually available examples and prepare missing records, not duplicate whole lessons',()=>{
  const partial=structuredClone(read(plan.bundle)),group=partial.groups.find((g)=>g.code==='18.2'),removed=group.examples.pop();
  const continuation=buildContent(partial,{persist:false});assert.equal(continuation.counts.newExamples,1);assert.equal(continuation.counts.newKnowledgeGroups,0);
  assert.equal(continuation.groups[0].examples[0].id,removed.id);assert.deepEqual(continuation.groups[0].knowledge,group.knowledge);
  assert.equal(continuation.decisions.find((d)=>d.id===removed.id).status,'PREPARED');assert.equal(continuation.counts.alreadyAvailable,218);
});
test('V6.0 corrections, source solutions, five graphs, table and protected content are retained byte-for-byte in bundle',()=>{
  const next=read(plan.bundle);assert.deepEqual(next.corrections,previous.corrections);assert.equal(next.corrections.length,35);assert.deepEqual(next.graphs,previous.graphs);assert.equal(next.graphs.length,6);
  assert.deepEqual(next.groups.slice(0,previous.groups.length),previous.groups);assert.equal(next.groups[0].examples.length,10);assert.equal(new Set(next.groups.map((g)=>g.code)).size,next.groups.length);
});
test('exact verified active V6.0 is used as parent; dry-run and unauthorized action never write',()=>{
  const f=releaseFixture(plan);try{assert.equal(releaseStatus(f.base).status,'ACTIVE');assert.equal(activeBaseline(f.base).parent.planHash,parent.planHash);assert.equal(applyContinuation(plan,{base:f.base}).writes,0);assert.throws(()=>applyContinuation(plan,{base:f.base,execute:true,development:true,authorize:'wrong'}),/authorization/);for(const entry of plan.files)assert.equal(digest(readFileSync(join(f.base,entry.file))),entry.beforeHash);}finally{f.cleanup();}
});
test('interruption at every file boundary resumes, reports partial state, and rolls back child before parent',()=>{
  for(let stop=0;stop<plan.files.length;stop++){
    const f=releaseFixture(plan),options={base:f.base,execute:true,development:true,authorize:plan.planHash};try{
      assert.throws(()=>applyContinuation(plan,{...options,afterFile:(_file,i)=>{if(i===stop)throw new Error('interrupted fixture');}}),/interrupted fixture/);
      assert.equal(releaseStatus(f.base).status,stop===plan.files.length-1?'ACTIVE':'PARTIAL');
      applyContinuation(plan,options);assert.equal(applyContinuation(plan,options).writes,0);assert.equal(releaseStatus(f.base).planHash,plan.planHash);
      assert.throws(()=>applyV6(parent,{base:f.base,execute:true,development:true,authorize:parent.planHash,rollback:true}),/Stale|Runtime conflict/);
      assert.equal(applyContinuation(plan,{...options,rollback:true}).writes,plan.files.length);assert.equal(releaseStatus(f.base).planHash,parent.planHash);
      assert.equal(applyV6(parent,{base:f.base,execute:true,development:true,authorize:parent.planHash,rollback:true}).writes,2);
      assert.equal(releaseStatus(f.base).status,'ROLLED_BACK');
    }finally{f.cleanup();}
  }
});
test('rollback interruptions resume idempotently in reverse order without destroying the active parent',()=>{
  const f=releaseFixture(plan),options={base:f.base,execute:true,development:true,authorize:plan.planHash};try{applyContinuation(plan,options);assert.throws(()=>applyContinuation(plan,{...options,rollback:true,afterFile:()=>{throw new Error('rollback interruption');}}),/rollback interruption/);applyContinuation(plan,{...options,rollback:true});assert.equal(applyContinuation(plan,{...options,rollback:true}).writes,0);assert.equal(activeBaseline(f.base).parent.planHash,parent.planHash);}finally{f.cleanup();}
});
test('changed source, unknown target edits and active release lock are rejected',()=>{
  const f=releaseFixture(plan),options={base:f.base,execute:true,development:true,authorize:plan.planHash};try{
    const dependency=plan.dependencies.find((d)=>d.file.endsWith('.pdf')),target=join(f.base,dependency.file),bytes=readFileSync(target);writeFileSync(target,'wrong source');assert.throws(()=>applyContinuation(plan,options),/Stale source/);writeFileSync(target,bytes);
    const mutable=join(f.base,activation),original=readFileSync(mutable);writeFileSync(mutable,'unknown edit');assert.throws(()=>applyContinuation(plan,options),/Runtime conflict/);writeFileSync(mutable,original);
    const lock=join(f.base,'.content-work/release-v6/.lock');writeFileSync(lock,JSON.stringify({pid:process.pid,planHash:parent.planHash}));assert.throws(()=>applyContinuation(plan,options),/owns the lock/);assert.equal(existsSync(lock),true);
  }finally{f.cleanup();}
});
test('a verified child can become the baseline of a future versioned continuation without changing old hashes',()=>{
  const f=releaseFixture(plan),options={base:f.base,execute:true,development:true,authorize:plan.planHash};try{
    applyContinuation(plan,options);assert.equal(activeBaseline(f.base).parent.planHash,plan.planHash);
    const before=readFileSync(join(f.base,activation),'utf8'),after=before+'// Isolated next-version fixture; no new educational assertions.\n';
    const {planHash:oldHash,...oldBody}=plan;
    const child=savePlan({...oldBody,parent:{family:'release-v61',planHash:plan.planHash,manifestHash:digest(plan),activationHash:plan.files.find((p)=>p.file===activation).afterHash},files:[{file:activation,before,after,beforeHash:digest(before),afterHash:digest(after)}]},f.base);
    const next={base:f.base,execute:true,development:true,authorize:child.planHash};applyContinuation(child,next);
    assert.equal(activeBaseline(f.base).parent.planHash,child.planHash);assert.throws(()=>applyContinuation(plan,{...options,rollback:true}),/Runtime conflict/);
    applyContinuation(child,{...next,rollback:true});assert.equal(activeBaseline(f.base).parent.planHash,plan.planHash);applyContinuation(plan,{...options,rollback:true});assert.equal(activeBaseline(f.base).parent.planHash,parent.planHash);
  }finally{f.cleanup();}
});
test('stale same-plan process recovery is allowed; corrupted manifest and temporary bytes are never overwritten',()=>{
  const f=releaseFixture(plan),options={base:f.base,execute:true,development:true,authorize:plan.planHash};try{
    const lock=join(f.base,'.content-work/release-v6/.lock');writeFileSync(lock,JSON.stringify({pid:99999999,planHash:plan.planHash}));assert.equal(applyContinuation(plan,options).writes,plan.files.length);applyContinuation(plan,{...options,rollback:true});
    const target=plan.files[0],tmp=join(f.base,target.file,'..',`.release-v61-${plan.planHash.slice(0,12)}.tmp`);writeFileSync(tmp,'unknown partial bytes');assert.throws(()=>applyContinuation(plan,options),/Unknown interrupted/);assert.equal(readFileSync(tmp,'utf8'),'unknown partial bytes');
    const parentFile=join(f.base,`.content-work/${plan.parent.family}/${plan.parent.planHash}/manifest.json`);writeFileSync(parentFile,'{}');assert.throws(()=>applyContinuation(plan,options),/Manifest hash/);
  }finally{f.cleanup();}
});
test('real workspace is unchanged by continuation tests and prior V6.0 immutable plan is untouched',()=>{
  for(const [file,hash]of initialRuntime)assert.equal(digest(readFileSync(join(root,file))),hash);
  assert.equal(digest(read(parent.schemaVersion==='bienedu.release.v6'?`.content-work/release-v6/${parent.planHash}/manifest.json`:`.content-work/release-v61/${parent.planHash}/manifest.json`)),plan.parent.manifestHash);
});
