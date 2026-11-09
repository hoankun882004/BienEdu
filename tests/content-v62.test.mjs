import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {root} from '../scripts/source-first/build.mjs';
import {digest} from '../scripts/source-first/model.mjs';
import {read} from '../scripts/source-first/release-chain-v61.mjs';
import {applyContinuation} from '../scripts/source-first/release-chain-v61.mjs';
import {applyV62,releaseStatusV62,validatePlan,assertReleasePreserved} from '../scripts/source-first/release-v62.mjs';
import {validateContent} from '../assets/js/components/canonical-math.js';
import {mathContentMarkup} from '../assets/js/components/canonical-math-renderer.js';
import {fixtureV62} from './helpers/release-v62.mjs';
import {buildContentV62} from '../scripts/source-first/content-v62.mjs';
import {releaseFixture as fixtureV61} from './helpers/release-v61.mjs';
import {bindHistoricalParentInventory} from './helpers/historical-parent-v62.mjs';
import {releaseStatus as statusV61} from '../scripts/source-first/release-chain-v61.mjs';
import {applyV6} from '../scripts/source-first/release-v6.mjs';
const folder='.audit/source-first-v5/release-v62',inventory=read(`${folder}/inventory.json`),content=read(`${folder}/content.json`),plan=read(inventory.manifest),bundle=read(plan.bundle);
const parent=read(`.content-work/${plan.parent.family}/${plan.parent.planHash}/manifest.json`),previous=read(parent.bundle);
test('exact frozen 861-record cohort is exhausted without duplicate identities or successes',()=>{
  const before=read('.audit/source-first-v5/release-v61/content.json').decisions.filter(d=>!['PREPARED','ALREADY_AVAILABLE'].includes(d.status));
  assert.deepEqual([...content.decisions.map(d=>d.id)].sort(),before.map(d=>d.id).sort());assert.equal(new Set(content.decisions.map(d=>d.id)).size,861);
  assert.equal(content.counts.remainingUnprocessed,0);assert.equal(content.counts.newExamples+content.counts.alreadyAvailable+content.counts.stillBlocked,861);
  assert.equal(content.groups.reduce((n,g)=>n+g.examples.length,0),content.counts.newExamples);
  for(const [name,n]of [['SOURCE_AMBIGUOUS',540],['KNOWLEDGE_GROUP_UNRESOLVED',309],['RUNTIME_EDITION_MAPPING_UNRESOLVED',12]]){
    const c=content.cohorts[name];assert.equal(c.examined,n);assert.equal(c.recovered+c.blocked,n);
  }
});

test('a regenerated historical preview index cannot misidentify a rolled-back explicit parent',()=>{
  const v61=read(read('.audit/source-first-v5/release-v61/inventory.json').manifest),f=fixtureV61(v61);
  try{
    applyV6(f.parent,{base:f.base,execute:true,development:true,authorize:f.parent.planHash,rollback:true});
    const file=join(f.base,'.audit/source-first-v5/release-v6/inventory.json'),before=JSON.parse(readFileSync(file,'utf8'));
    writeFileSync(file,JSON.stringify({...before,planHash:'F'.repeat(64)}));
    assert.equal(statusV61(f.base).status,'UNKNOWN','Reproduce mutable index leak, not concurrency');
    bindHistoricalParentInventory(f.base,f.parent,`.content-work/release-v6/${f.parent.planHash}/manifest.json`);
    assert.equal(statusV61(f.base).status,'ROLLED_BACK');
    assert.throws(()=>bindHistoricalParentInventory(root,f.parent,'wrong'),/Disposable/u);
  }finally{f.cleanup();}
});
test('all recovered pairs have exact source glyph/layout ownership and stable explicit statement-solution pairing',()=>{
  const evidence=read(`${folder}/source-evidence.json`),records=new Map(evidence.sources.flatMap(s=>s.records).map(r=>[r.id,r]));
  for(const g of content.groups)for(const e of g.examples){
    assert.equal(e.id,`${g.source.sourceId}:${g.code}:example:${e.originalExampleNumber}`);const r=records.get(e.id);
    for(const key of ['statement','solution']){const f=r.fields[key];assert.deepEqual(f.errors,[]);assert.equal(f.layoutEvidence.glyphHash,f.glyphHash);assert.ok(f.layoutEvidence.rows.length);assert.equal(f.layoutEvidence.editorialReview,false);assert.deepEqual(f.layoutEvidence.glyphBoundingBoxes.map(r=>r.length),f.layoutEvidence.rows.map(r=>r.length));assert.ok(f.layoutEvidence.vectorBars.length);}
    assert.deepEqual(e.prompt,r.fields.statement.content);assert.deepEqual(e.steps[0].expression,r.fields.solution.content);
    assert.equal(digest(readFileSync(join(root,g.source.file))),g.source.sha256);
  }
});
test('re-import is deterministic and a cumulative bundle never duplicates prepared or active examples',()=>{
  const replay=buildContentV62(previous,{persist:false});assert.deepEqual(replay,content);
  const cumulative=buildContentV62(bundle,{persist:false});assert.equal(cumulative.counts.newExamples,0);assert.equal(cumulative.counts.alreadyAvailable,content.counts.newExamples);assert.equal(cumulative.counts.stillBlocked,content.counts.stillBlocked);
});
test('every prepared math node parses safely through the existing canonical/common renderer',()=>{
  let maths=0;const check=n=>{assert.ok(validateContent(n).valid);assert.ok(!/katex-error|math-render-error/u.test(mathContentMarkup(n)));if(n.type==='math')maths++;for(const x of n.segments??[])check(x);};
  for(const g of content.groups){if(g.knowledge)check(g.knowledge.lead);if(g.sourceContext.knowledge)check(g.sourceContext.knowledge);if(g.sourceContext.method)check(g.sourceContext.method);for(const e of g.examples){check(e.prompt);check(e.steps[0].expression);assert.equal(e.answer.value,'');assert.equal(e.reviewStatus,'needs-review');assert.equal(e.verification.humanApproval,false);}}
  assert.ok(maths>content.counts.newExamples);
});
test('advanced structural fixtures include nested fractions/roots, script nesting, operators and rejection cases',()=>{
  const r=spawnSync('python',['-X','utf8','tests/source-layout-v62.py'],{cwd:root,encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stderr,/Ran 30 tests/u);
});
test('source editions are append-only, explicitly mapped, with original numbering and independent identities',()=>{
  const mapped=content.decisions.filter(d=>d.originalCohort==='RUNTIME_EDITION_MAPPING_UNRESOLVED'&&d.status==='PREPARED');
  assert.equal(mapped.length,content.cohorts.RUNTIME_EDITION_MAPPING_UNRESOLVED.recovered);
  for(const d of mapped){assert.ok(d.mapping.notEquivalentExamples);assert.equal(d.sourceId,'cd12-cd14-calculus-2026');}
  for(const g of content.groups.filter(g=>g.mergeMode==='append-independent-source')){assert.ok(g.editionMapping);assert.ok(inventory.editionOffsets[g.code]>0);}
});
test('all 209 V6.1 examples, ten V6.0 examples, 35 fields and six graph specs remain byte-equivalent',()=>{
  assert.deepEqual(bundle.corrections,previous.corrections);assert.equal(bundle.corrections.length,35);assert.deepEqual(bundle.graphs,previous.graphs);assert.equal(bundle.graphs.length,6);
  for(const old of previous.groups){const next=bundle.groups.find(g=>g.code===old.code);assert.deepEqual({...next,examples:old.examples},old);assert.deepEqual(next.examples.slice(0,old.examples.length),old.examples);}
  assert.equal(previous.groups.reduce((n,g)=>n+g.examples.length,0),219);
});
test('missing knowledge is explicit; no fake theory, practice, approvals or protected CD20/21/23 writes',()=>{
  for(const g of content.groups){assert.ok(!['CD20','CD21','CD23'].includes(g.topicId));assert.equal(g.practice.length,0);if(!g.knowledge||!g.method)assert.equal(g.pedagogicalState.exampleOnly,true);}
  assert.equal(content.humanApproval,false);assert.equal(content.counts.newPractice,0);
  assert.ok(!plan.files.some(f=>/learning-progress|practice-bank|foundation-lessons/u.test(f.file)));
});
test('source and syntax, limited symbolic checks and editorial review are separate states',()=>{
  for(const d of content.decisions){assert.equal(d.verification.editorialReview,'not-reviewed');assert.equal(d.verification.humanApproval,false);assert.ok('sourceStructure'in d.verification&&'canonicalSyntax'in d.verification&&'mathematicalConsistency'in d.verification&&'learnerRendering'in d.verification);}
  assert.ok(content.symbolic.checks.some(c=>c.status==='passed'));assert.ok(content.decisions.some(d=>d.reasons.some(r=>r.includes('CONTEXT_REVIEW'))));
});
test('dry-run never writes and fresh manifest authorization is mandatory',()=>{
  const f=fixtureV62(plan);try{assert.equal(applyV62(plan,{base:f.base}).writes,0);assert.throws(()=>applyV62(plan,{base:f.base,execute:true,development:true,authorize:'wrong'}),/authorization/u);for(const x of plan.files)assert.equal(digest(readFileSync(join(f.base,x.file))),x.beforeHash);}finally{f.cleanup();}
});
test('interrupted file-boundary apply resumes idempotently and child rollback precedes parent',()=>{
  for(let stop=0;stop<plan.files.length;stop++){
    const f=fixtureV62(plan),args={base:f.base,execute:true,development:true,authorize:plan.planHash};
    try{assert.throws(()=>applyV62(plan,{...args,afterFile:(_f,i)=>{if(i===stop)throw Error('fixture interruption');}}),/fixture interruption/u);
      assert.equal(releaseStatusV62(f.base).status,stop===plan.files.length-1?'ACTIVE':'PARTIAL');
      applyV62(plan,args);assert.equal(releaseStatusV62(f.base).status,'ACTIVE');assert.equal(applyV62(plan,args).writes,0);
      if(plan.parent.family==='release-v61')assert.throws(()=>applyContinuation(f.parent,{...args,authorize:f.parent.planHash,rollback:true}));
      applyV62(plan,{...args,rollback:true});assert.equal(applyV62(plan,{...args,rollback:true}).writes,0);for(const x of plan.files)assert.equal(digest(readFileSync(join(f.base,x.file))),x.beforeHash);
    }finally{f.cleanup();}
  }
});
test('rollback interruption preserves recoverable before/after bytes and can resume in reverse',()=>{
  const f=fixtureV62(plan),args={base:f.base,execute:true,development:true,authorize:plan.planHash};
  try{applyV62(plan,args);assert.throws(()=>applyV62(plan,{...args,rollback:true,afterFile:()=>{throw Error('interrupted rollback');}}),/interrupted rollback/u);applyV62(plan,{...args,rollback:true});for(const x of plan.files)assert.equal(digest(readFileSync(join(f.base,x.file))),x.beforeHash);}finally{f.cleanup();}
});
test('unknown edits, source changes, corrupt backups/manifests and cross-version live locks fail closed',()=>{
  for(const kind of ['edit','dependency','source','backup','parent-backup','manifest','lock']){
    const f=fixtureV62(plan),args={base:f.base,execute:true,development:true,authorize:plan.planHash};
    try{
      if(kind==='edit')writeFileSync(join(f.base,plan.files[0].file),'unknown edit');
      if(kind==='dependency')writeFileSync(join(f.base,plan.dependencies[0].file),'changed source/dependency');
      if(kind==='source')writeFileSync(join(f.base,plan.dependencies.find(d=>d.file.endsWith('.pdf')).file),'changed original source');
      if(kind==='backup')writeFileSync(join(f.base,`.content-work/release-v62/${plan.planHash}/${digest(plan.files[0].file)}.before`),'corrupt');
      if(kind==='parent-backup')writeFileSync(join(f.base,`.content-work/${plan.parent.family}/${parent.planHash}/${digest(parent.files[0].file)}.before`),'corrupt ancestor');
      if(kind==='manifest')writeFileSync(join(f.base,inventory.manifest),'{}');
      if(kind==='lock'){mkdirSync(join(f.base,'.content-work/release-v6'),{recursive:true});writeFileSync(join(f.base,'.content-work/release-v6/.lock'),JSON.stringify({pid:process.pid,planHash:plan.planHash}));}
      assert.throws(()=>applyV62(plan,args));
    }finally{f.cleanup();}
  }
});
test('dead same-plan owner recovery is explicit, and unknown temporary bytes are never overwritten',()=>{
  const f=fixtureV62(plan),args={base:f.base,execute:true,development:true,authorize:plan.planHash};
  try{mkdirSync(join(f.base,'.content-work/release-v6'),{recursive:true});writeFileSync(join(f.base,'.content-work/release-v6/.lock'),JSON.stringify({pid:2147483647,planHash:plan.planHash}));applyV62(plan,args);applyV62(plan,{...args,rollback:true});
    const temporary=join(f.base,plan.files[0].file,'..',`.release-v62-${plan.planHash.slice(0,12)}.tmp`);writeFileSync(temporary,'unknown temporary content');assert.throws(()=>applyV62(plan,args),/temporary/u);assert.equal(readFileSync(temporary,'utf8'),'unknown temporary content');
  }finally{f.cleanup();}
});
test('real runtime matches its authenticated activation; immutable ancestor evidence and V6.1 staging remain unchanged',()=>{assert.ok(assertReleasePreserved(plan)>60);validatePlan(plan);});
