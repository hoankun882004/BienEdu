import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,copyFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {join,dirname,relative,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {compileExpression,parseExpression} from '../assets/js/components/graph-expression.js';
import {validateGraphSpec,branchIntervals,branchFunction,domainContains,bound} from '../assets/js/components/graph-spec.js';
import {graphFixtures} from './helpers/graph-fixtures.mjs';
import {root} from '../scripts/source-first/build.mjs';
import {graphOutput,verifyGraphSafety} from '../scripts/source-first/graph-build.mjs';
import {executeGraphExperiment,activationFile} from '../scripts/source-first/graph-experiment.mjs';
const read=(path)=>JSON.parse(readFileSync(join(root,path),'utf8'));

for(const fixture of graphFixtures)test(`graph domain/branches: ${fixture.id}`,()=>{
  assert.equal(validateGraphSpec(fixture.spec).valid,true);
  assert.equal(fixture.branches.flatMap(branchIntervals).length,fixture.curveCount);
  for(const x of fixture.invalid)for(const branch of fixture.branches)assert.equal(Number.isNaN(branchFunction(branch)(x)),true);
  for(const [x,y] of fixture.values){const branch=fixture.branches.find((b)=>domainContains(b,x));assert.ok(branch);assert.ok(Math.abs(branchFunction(branch)(x)-y)<1e-10);}
  for(const branch of fixture.branches)for(const interval of branchIntervals(branch))for(const excluded of branch.exclusions)assert.equal(bound(interval.min)<excluded&&excluded<bound(interval.max),false);
});
test('expression grammar: precedence, parameters, exact groupings',()=>{
  assert.equal(compileExpression('-x^2')(3),-9);assert.equal(compileExpression('2^3^2')(0),512);
  assert.equal(compileExpression('a*x+sqrt(4)',{a:2})(3),8);assert.equal(compileExpression('ln(exp(x))')(2),2);
  assert.equal(compileExpression('1/(x-1)')(2),1);
});
test('expression grammar rejects arbitrary code, unknown syntax and excessive work',()=>{
  for(const value of ['alert(1)','x.constructor','globalThis','x;1','(()=>1)()','2x','sin x','x[0]','Math.sin(x)','1,2','x%2','(x','x'.repeat(600),'sqrt()','__proto__'])assert.throws(()=>parseExpression(value),value);
  assert.throws(()=>parseExpression('a*x',{a:Infinity}));assert.throws(()=>parseExpression('('.repeat(40)+'x'+')'.repeat(40)));
});
test('schema rejects malformed source, unsafe labels, unverified graphs and intervals',()=>{
  const good=graphFixtures[0].spec;
  for(const mutation of [(s)=>s.schemaVersion='v0',(s)=>s.source.sha256='bad',(s)=>s.verification.status='unknown',(s)=>s.branches[0].domain[0].min='inf',(s)=>s.branches[0].latex=String.raw`\htmlClass{bad}{x}`,(s)=>s.viewport.xMax=s.viewport.xMin,(s)=>s.branches[0].expression='document.write(x)']){
    const s=structuredClone(good);mutation(s);assert.equal(validateGraphSpec(s).valid,false);
  }
});
test('piecewise open/closed endpoints and removable holes are explicit',()=>{
  const piece=graphFixtures.find((f)=>f.id==='piecewise');assert.equal(domainContains(piece.branches[0],0),false);assert.equal(domainContains(piece.branches[1],0),true);
  const hole=graphFixtures.find((f)=>f.id==='removable-hole');assert.equal(domainContains(hole.branches[0],1),false);assert.equal(hole.spec.points[0].closed,false);
});
test('all existing figure IDs preserved; no second queue; verified source pilot only',()=>{
  const queue=read('.audit/source-first-v5/figure-review-v5.1.json'),audit=read(`${graphOutput}/inventory.json`),candidates=read(`${graphOutput}/candidates.json`);
  assert.equal(audit.total,188);assert.equal(audit.newReviewDatabase,false);assert.deepEqual(audit.rows.map((r)=>r.figureId),queue.figures.map((f)=>f.id));
  assert.equal(candidates.length,6);for(const c of candidates){assert.equal(validateGraphSpec(c.spec).valid,true);assert.equal(c.spec.source.recordId,c.target.recordId);assert.equal(c.checks.passed,true);assert.equal(c.spec.verification.humanApproval,false);}
  const symbolic=read(`${graphOutput}/symbolic.json`);assert.equal(symbolic.version,'1.14.0');assert.equal(symbolic.checks.length,5);assert.ok(symbolic.checks.every((c)=>c.passed));
});
test('variation table preserves source signs, extrema and infinity without guessed function',()=>{
  const c=read(`${graphOutput}/candidates.json`).find((c)=>c.spec.type==='variation-table');assert.equal(c.spec.branches,undefined);
  assert.deepEqual(c.spec.rows[0].cells,['','-','0','+','']);assert.deepEqual(c.spec.rows[1].cells,['+\\infty','\\searrow','-1','\\nearrow','+\\infty']);
  const sign=structuredClone(c.spec);sign.type='sign-table';sign.columns[2].kind='excluded';sign.rows=sign.rows.slice(0,1);sign.rows[0].cells[2]='\\Vert';assert.equal(validateGraphSpec(sign).valid,true);
});
test('V5.5/V5.6 source/runtime/backups and authorization remain intact',()=>{assert.equal(verifyGraphSafety().stale,false);});
test('vendored JSXGraph bytes match existing exact install',()=>{
  assert.equal(read('package.json').dependencies.jsxgraph,'1.14.2');assert.equal(read('node_modules/jsxgraph/package.json').version,'1.14.2');
  assert.deepEqual(readFileSync(join(root,'node_modules/jsxgraph/distrib/jsxgraphcore.mjs')),readFileSync(join(root,'assets/vendor/jsxgraph/jsxgraphcore.mjs')));
});
test('isolated explicit apply, interrupted recovery, idempotency, CAS and rollback',()=>{
  const summary=read(`${graphOutput}/experiment.json`),plan=read(summary.manifest),directory=mkdtempSync(join(tmpdir(),'bienedu-graph-v58-'));
  try{
    for(const file of [...plan.dependencies.map((d)=>d.file),plan.bundle,plan.target,summary.manifest,`.content-work/graphs-v5.8/${plan.planHash}/before.txt`]){const to=join(directory,file);mkdirSync(dirname(to),{recursive:true});copyFileSync(join(root,file),to);}
    const options={base:directory,authorize:plan.planHash,development:true,execute:true};
    assert.throws(()=>executeGraphExperiment(plan,{...options,authorize:'no'}));assert.throws(()=>executeGraphExperiment(plan,{...options,execute:false}));
    assert.throws(()=>executeGraphExperiment(plan,{...options,interruptAfterWrite:true}),/Simulated interruption/);
    assert.equal(executeGraphExperiment(plan,options).writes,0);assert.equal(readFileSync(join(directory,activationFile),'utf8'),plan.after);
    assert.equal(executeGraphExperiment(plan,{...options,rollback:true}).writes,1);assert.equal(readFileSync(join(directory,activationFile),'utf8'),plan.before);
    assert.equal(executeGraphExperiment(plan,{...options,rollback:true}).writes,0);
    const tampered=structuredClone(plan);tampered.after+='malicious';assert.throws(()=>executeGraphExperiment(tampered,options));
  }finally{const rel=relative(resolve(tmpdir()),resolve(directory));assert.ok(rel&&!rel.startsWith('..'));rmSync(directory,{recursive:true,force:true});}
});
