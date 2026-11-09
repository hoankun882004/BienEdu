import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync,writeFileSync,existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { root,work } from "../scripts/source-first/build.mjs";
import { digest } from "../scripts/source-first/model.mjs";
import { classifyFractions,canonicalInline,sourceInlineKey } from "../scripts/source-first/fraction-audit.mjs";
import { verifySymbolic } from "../scripts/source-first/fraction-batch.mjs";
import { continuationStatus,applyContinuation,validateContinuation,replayBatch,previewFile } from "../scripts/source-first/development-continuation.mjs";
import { continuationFixture } from "./helpers/continuation-fixture.mjs";
import { mathematicalStructure } from "../scripts/source-first/comparison.mjs";
import { renderMathText } from "../assets/js/components/markdown-math-renderer.js";

const read=(file)=>JSON.parse(readFileSync(join(root,file),"utf8"));
const setup=(t)=>{const fixture=continuationFixture();t.after(fixture.cleanup);return fixture;};
const execute=(fixture,extra={})=>({...fixture,execute:true,development:true,authorize:fixture.plan.planHash,env:{},...extra});

test("V5.6 classifies all 180 canonical references with explicit source/runtime evidence, without a second queue",()=>{
  const audit=read(".audit/source-first-v5/fraction-audit-v5.6.json"),registry=read("scripts/source-first/corrections-v56.json");
  assert.equal(audit.total,180);assert.equal(new Set(audit.rows.map((entry)=>entry.reference)).size,180);assert.equal(audit.newQueueCreated,false);
  assert.deepEqual(audit.counts,{ALREADY_CORRECT:73,CONFIRMED_CONVERSION_ERROR:14,SOURCE_AMBIGUOUS:88,RUNTIME_MAPPING_AMBIGUOUS:5,SOURCE_CONFLICT:0,UNSUPPORTED:0});
  assert.deepEqual(classifyFractions(audit.rows,registry).map((entry)=>entry.classification),audit.rows.map((entry)=>entry.classification));
  for(const row of audit.rows){assert.ok(row.existingEntityKey && row.sourceFile && row.sourceHash && row.reason);assert.equal(row.formalHumanApproval,false);
    if(row.classification==="ALREADY_CORRECT")assert.ok(row.nativeEvidence || row.sourceKey===canonicalInline(row.current));
    if(row.eligible)assert.ok(row.exactMapping && row.correctionId && row.evidence.regions.length===2);
  }
  assert.equal(audit.rows.filter((entry)=>entry.eligible).length,10);
});

test("inline fidelity never discards fraction bars, radical boundaries, exponents or probability bars",()=>{
  const shapes=[String.raw`\frac{a+b}{c}`,String.raw`a+\frac{b}{c}`,String.raw`\sqrt{x+1}`,String.raw`\sqrt{x}+1`,"x^2","x_2",String.raw`P(A\mid B)`,"P(AB)"];
  for(let i=0;i<shapes.length;i+=2)assert.notEqual(mathematicalStructure(shapes[i]).hash,mathematicalStructure(shapes[i+1]).hash);
  assert.notEqual(canonicalInline("x²"),canonicalInline("x2"));
  assert.equal(sourceInlineKey({spans:[],drawings:[{}],rawText:"1/2"}),null);
  assert.equal(sourceInlineKey({spans:[],drawings:[],rawText:"√x"}),null);
});

test("all ten complete source-bound correction groups survive actual importer replay twice",()=>{
  const registry=read("scripts/source-first/corrections-v56.json"),first=replayBatch();assert.deepEqual(replayBatch(),first);assert.equal(first.runtimeWrites,0);
  assert.equal(first.candidates.length,10);
  for(const correction of registry.corrections){const imported=first.candidates.find((entry)=>entry.id===correction.recordId);assert.ok(imported);assert.equal(imported.sourceBlockId,correction.sourceBlockId);
    assert.equal(imported.answer,imported.steps.find((step)=>step.label==="Lời giải từ tài liệu").expression);
    for(const field of correction.fields){const value=field.field==="source-solution.expression"?imported.steps.find((step)=>step.label==="Lời giải từ tài liệu").expression:imported[field.field];assert.equal(value,field.after);assert.doesNotMatch(renderMathText(value),/math-render-error|katex-error/u);}
  }
});

test("supported SymPy checks cover actual proposed fractions, radicals, powers and original real domains",()=>{
  const registry=read("scripts/source-first/corrections-v56.json"),result=verifySymbolic(registry);assert.equal(result.checks.length,22);assert.ok(result.checks.every((entry)=>entry.status==="passed" && !entry.humanApproval));
  const jobs=[{id:"unsupported",kind:"equivalent",expression:String.raw`\unknown{x}`,expected:"x",domain:"real"},{id:"lost-domain",kind:"equivalent",expression:"x/x",expected:"1",domain:"real"},
    {id:"wrong-sign",kind:"derivative",expression:String.raw`\sqrt{3-2x}`,expected:String.raw`\frac{1}{\sqrt{3-2x}}`,functionDomain:"x<=3/2",derivativeDomain:"x<3/2"},
    {id:"broadened-log",kind:"derivative",expression:String.raw`\ln(2x+1)`,expected:String.raw`\frac{2}{2x+1}`,functionDomain:"real",derivativeDomain:"real"}];
  const checked=spawnSync(join(work,"sympy-env/Scripts/python.exe"),["-X","utf8",join(root,"scripts/source-first/symbolic-batch.py")],{input:JSON.stringify({jobs}),encoding:"utf8",windowsHide:true});
  assert.equal(checked.status,0);assert.deepEqual(JSON.parse(checked.stdout).checks.map((entry)=>entry.status),["unsupported","conflict","conflict","conflict"]);
});

test("consolidated manifest uses applied V5.5 before bytes, complete groups and dry-run defaults",(t)=>{
  const fixture=setup(t),{plan}=fixture;assert.equal(validateContinuation(plan,fixture),true);
  assert.equal(plan.files.length,1);assert.equal(plan.files[0].changes.length,26);
  assert.equal(plan.files[0].beforeHash,plan.parentFiles.find((entry)=>entry.file===plan.files[0].file).afterHash);
  assert.equal(applyContinuation(plan,fixture).runtimeWrites,0);assert.equal(continuationStatus(plan,fixture).status,"prepared-on-applied-v5.5");
  assert.equal(existsSync(join(fixture.work,"review-events")),false);
});

test("continuation requires fresh exact authorization and refuses production, forged plans or missing fields",(t)=>{
  const fixture=setup(t),{plan}=fixture;
  for(const options of [{development:false},{authorize:plan.parentPlanHash},{env:{CI:"1"}},{env:{NODE_ENV:"production"}}])assert.throws(()=>applyContinuation(plan,execute(fixture,options)),/Development-only|authorization/u);
  assert.throws(()=>applyContinuation({...plan,planHash:"wrong"},fixture),/manifest/u);
  const forged=structuredClone(plan);forged.files[0].changes.pop();const {planHash,...body}=forged;forged.planHash=digest(body);
  assert.throws(()=>validateContinuation(forged,fixture),/ENOENT|backup|Incomplete/u);
});

test("actual isolated learner files apply idempotently and rollback restores applied parent exactly",(t)=>{
  const fixture=setup(t),{plan}=fixture,result=applyContinuation(plan,execute(fixture));
  assert.equal(result.runtimeWrites,1);assert.equal(result.validation.fields.length,26);assert.ok(result.validation.fields.every((entry)=>!entry.humanEditorialBadge));
  assert.equal(applyContinuation(plan,execute(fixture)).runtimeWrites,0);
  assert.equal(applyContinuation(plan,execute(fixture,{rollback:true})).runtimeWrites,1);
  assert.equal(applyContinuation(plan,execute(fixture,{rollback:true})).runtimeWrites,0);
  for(const file of plan.parentFiles)assert.equal(digest(readFileSync(join(fixture.root,file.file))),file.afterHash);
  assert.equal(existsSync(join(fixture.work,"review-events")),false);
});

test("interruption after replacement retains recoverable child bytes and same-plan resume/rollback",(t)=>{
  const fixture=setup(t),{plan}=fixture;
  assert.throws(()=>applyContinuation(plan,execute(fixture,{afterFile:()=>{throw new Error("isolated post-replacement interruption");}})),/SAME child manifest/u);
  assert.equal(continuationStatus(plan,fixture).status,"locally-applied-unreviewed");
  assert.equal(applyContinuation(plan,execute(fixture)).runtimeWrites,0);
  assert.equal(applyContinuation(plan,execute(fixture,{rollback:true})).runtimeWrites,1);
});

test("unknown runtime edits, changed sources and corrupted backups fail closed without overwrites",(t)=>{
  const fixture=setup(t),{plan}=fixture,target=join(fixture.root,plan.files[0].file),before=readFileSync(target);writeFileSync(target,Buffer.concat([before,Buffer.from("\n// user edit")]));
  assert.throws(()=>applyContinuation(plan,execute(fixture)),/Unknown runtime/u);assert.ok(readFileSync(target,"utf8").endsWith("// user edit"));writeFileSync(target,before);
  const source=join(fixture.root,plan.sources[0].file),bytes=readFileSync(source);writeFileSync(source,"changed source");assert.throws(()=>applyContinuation(plan,execute(fixture)),/Stale source/u);writeFileSync(source,bytes);
  const saved=join(fixture.work,"dev-plans",plan.planHash,`${digest(plan.files[0].file)}.json`);writeFileSync(saved,JSON.stringify({file:plan.files[0].file,before:"bad",after:"bad"}));
  assert.throws(()=>applyContinuation(plan,execute(fixture)),/backup/u);assert.deepEqual(readFileSync(target),before);
});

test("all original sources, real V5.5 runtime, journal and rollback dependencies remain intact",()=>{
  const recovery=read(".audit/source-first-v5/recovery-v5.6.json"),preview=read(previewFile);
  for(const entry of [...recovery.sources,...recovery.runtime,...recovery.protectedFiles,...recovery.parentDependencies])assert.equal(digest(readFileSync(join(root,entry.file))),entry.hash);
  for(const entry of recovery.journal)assert.equal(digest(readFileSync(join(work,"dev-experiments",recovery.parentPlanHash,entry.file))),entry.hash);
  assert.equal(preview.realRuntimeWrites,0);assert.equal(preview.formalHumanApproval,false);
});
