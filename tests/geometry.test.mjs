import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,cpSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join,dirname,resolve,relative} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {validateGeometrySpec,checkGeometryProperties} from '../assets/js/components/geometry-spec.js';
import {pdfKnowledgeRelease} from '../assets/js/data/pdf-knowledge-release.js';
import {prepareGeometry,executeGeometry,geometryStatus,recoverGeometryLock} from '../scripts/source-first/geometry-release.mjs';
import {stageGeometryNavigation} from '../scripts/source-first/geometry-navigation.mjs';
const read=file=>JSON.parse(readFileSync(file)),pointer=read('.audit/geometry-v1/preview.json'),bundle=read(pointer.bundle),proof=read('.audit/geometry-v1/symbolic.json'),evidence=read('.audit/geometry-v1/source-evidence.json');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex').toUpperCase(),copy=value=>structuredClone(value);
test('exact existing 30-figure cohort, unchanged independent PDF hashes and knowledge parent',()=>{
  const issues=read('.audit/pdf-knowledge/issues.json');assert.equal(issues.length,30);assert.equal(bundle.candidates.length,30);assert.equal(hash(readFileSync(pointer.bundle)),pointer.sha256);assert.deepEqual(bundle.knowledgeParent,pdfKnowledgeRelease);
  assert.deepEqual(bundle.candidates.map(c=>c.target.blockId),issues.map(i=>i.blockId));assert.equal(new Set(bundle.candidates.map(c=>c.spec.id)).size,30);
  const data=read(pdfKnowledgeRelease.bundle);assert.equal(data.articles.length,370);assert.equal(hash(readFileSync(pdfKnowledgeRelease.bundle)),pdfKnowledgeRelease.sha256);
  for(const source of new Map(data.articles.map(a=>[a.source.file,a.source])).values())assert.equal(hash(readFileSync(source.file)),source.sha256);
  assert.equal(bundle.summary.sourceDetermined,2);assert.equal(bundle.summary.constrainedSchematics,28);assert.deepEqual(bundle.summary.dimensions,{'2':10,'3':20});assert.equal(bundle.summary.threeJsRequired,0);
});
for(const candidate of bundle.candidates)test(candidate.target.key+' source, exact symbolic evidence and runtime geometry properties',()=>{
  const {spec,target}=candidate,result=proof.results.find(r=>r.id===spec.id),source=evidence.find(e=>e.blockId===target.blockId);
  assert.deepEqual(validateGeometrySpec(spec),{valid:true,errors:[]});assert.ok(checkGeometryProperties(spec).every(r=>r.valid));
  assert.ok(result.passed);assert.equal(spec.validation.evidenceHash,hash(JSON.stringify(result)));assert.equal(result.inputHash,hash(JSON.stringify({...spec,validation:{status:'pending'}})));
  assert.equal(source.sourceHash,spec.source.sha256);assert.equal(source.sourceId,spec.source.sourceId);assert.equal(source.page,spec.source.page);assert.ok(source.glyphsMatched>0);
  assert.ok(result.checks.every(c=>c.passed));assert.match(target.route,/documents.html\?grade=12&topic=CD/u);assert.match(target.route,/section=knowledge/u);
  if(spec.realization.kind==='constrained-schematic'){assert.ok(spec.realization.freeChoices.length);assert.match(spec.realization.notice,/không theo tỉ lệ/u);}
  assert.doesNotMatch(JSON.stringify(spec),/\.png|\.webp|\.svg|javascript:|<script|new Function|eval\(/iu);
});
const sample=()=>copy(bundle.candidates.find(c=>c.target.key==='29.3').spec);
const bad=(name,change)=>test(name,()=>{const spec=sample();change(spec);assert.equal(validateGeometrySpec(spec).valid,false);});
bad('reject unknown root fields',s=>s.execute='alert(1)');
bad('reject executable function objects',s=>s.objects[0].coords=()=>[0,0]);
bad('reject forged source association',s=>s.source.sha256='missing');
bad('reject invalid source location',s=>s.source.rect=[4,2,1,2]);
bad('reject HTML labels',s=>s.objects[0].label='<img src=x onerror=alert(1)>');
bad('reject label expression evaluation',s=>s.objects[0].label=String.raw`\input{secrets}`);
bad('reject dimension mismatch',s=>s.objects[0].coords.push(1));
bad('reject unsafe coordinates',s=>s.objects[0].coords[0]=Infinity);
bad('reject duplicate object identities',s=>s.objects.push(copy(s.objects[0])));
bad('reject missing references',s=>s.objects.find(o=>o.type==='segment').from='does-not-exist');
bad('reject wrong reference types',s=>s.relationships[0].point='AB');
bad('reject unproved definitions',s=>s.validation.status='pending');
bad('reject unresolved conditions',s=>s.unresolvedConditions=['missing angle']);
bad('reject incorrect geometric relationship',s=>s.objects.find(o=>o.id==='I').coords=[1,0]);
bad('reject hidden unknown object fields',s=>s.objects[0].onClick='alert(1)');
bad('reject unsupported mathematical notation',s=>s.formulae.push(String.raw`\notACommand{x}`));
bad('reject undeclared free coordinate choice',s=>s.realization.freeChoices=[]);
bad('reject unsupported library',s=>s.renderer='threejs');
test('nonplanar faces and zero plane normals are rejected',()=>{
  const spec=copy(bundle.candidates.find(c=>c.target.key==='28.8').spec);spec.objects.find(o=>o.id==='D').coords[2]+=.5;assert.equal(validateGeometrySpec(spec).valid,false);
  const plane=copy(bundle.candidates.find(c=>c.target.key==='30.1').spec);plane.objects.find(o=>o.type==='plane').u=[0,0,0];assert.equal(validateGeometrySpec(plane).valid,false);
});
test('exact logarithm domain, angle conventions, oblique box and separate integral regions',()=>{
  const get=key=>bundle.candidates.find(c=>c.target.key===key).spec;
  for(const f of get('CD08-CD11').objects.filter(o=>o.id.startsWith('log')))assert.deepEqual(f.domain,{min:0,max:'inf',minIncluded:false,maxIncluded:false});
  assert.ok(get('28.7').formulae[0].includes('u\\cdot v'));assert.ok(!get('28.7').formulae[0].includes('|u\\cdot v|'));assert.ok(get('30.5').formulae[0].includes('|n_1\\cdot n_2|'));
  assert.equal(get('28.8').relationships.some(r=>r.type==='perpendicular'),false);assert.equal(get('33.1').relationships.filter(r=>r.type==='perpendicular').length,3);
  assert.equal(get('13.6').objects.filter(o=>o.type==='polygon').length,2);assert.equal(get('13.6').objects.some(o=>o.type==='function'),false);
});
test('source imports, corrections, progress/scoring modules and inactive learner entry remain untouched',()=>{
  assert.doesNotMatch(readFileSync('documents.html','utf8'),/geometry-loader/u);assert.match(readFileSync('assets/js/data/geometry-activation.js','utf8'),/geometryActivation=null/u);
  const p=read('.audit/source-first-v5/release-v62/publication-v621.json'),plan=read(p.manifest),local=read('.audit/local-pdf-visibility/receipt.json');
  for(const file of plan.files){if(file.file==='documents.html')continue;assert.equal(hash(readFileSync(file.file)),file.file===local.file?local.afterHash:file.afterHash,file.file);}
  for(const file of plan.dependencies)assert.equal(hash(readFileSync(file.file)),file.hash,file.file);
});
test('history continuation queues popstate in-flight without changing the active router',()=>{
  const original=readFileSync('assets/js/curriculum.js','utf8'),staged=stageGeometryNavigation(original);
  assert.ok(!original.includes('pendingLessonHistory'));assert.ok(staged.includes('if (!updateHistory) pendingLessonHistory = { href, restoreState };'));
  assert.equal(staged.split('persist(').length,original.split('persist(').length);
  assert.equal(readFileSync('assets/js/curriculum.js','utf8'),original);
  assert.throws(()=>stageGeometryNavigation(original.replace('let lessonTransitionLock = false;','let lessonTransitionLock = true;')),/baseline changed/u);
});

test('fresh local continuation refuses unauthorized/stale changes; interruption, resume and rollback in isolated fixture',()=>{
  const base=mkdtempSync(join(tmpdir(),'bienedu-geometry-apply-'));
  try{
    // Full declared dependencies only; no mutation of the real site's files.
    for(const folder of ['assets','scripts','39 chuyên đề','tests'])cpSync(folder,join(base,folder),{recursive:true});
    mkdirSync(join(base,'.audit/geometry-v1'),{recursive:true});for(const file of ['preview.json','symbolic.json','source-evidence.json','browser.json','interactions.json','security.json'])cpSync('.audit/geometry-v1/'+file,join(base,'.audit/geometry-v1',file));
    mkdirSync(join(base,'.audit/pdf-knowledge'),{recursive:true});for(const file of ['summary.json','issues.json'])cpSync('.audit/pdf-knowledge/'+file,join(base,'.audit/pdf-knowledge',file));cpSync('documents.html',join(base,'documents.html'));
    mkdirSync(join(base,'node_modules/jsxgraph'),{recursive:true});cpSync('node_modules/jsxgraph/package.json',join(base,'node_modules/jsxgraph/package.json'));
    const plan=prepareGeometry(base);assert.equal(geometryStatus(base).status,'PREPARED');assert.throws(()=>executeGeometry('apply',{root:base,authorize:plan.planHash}),/Explicit/u);assert.throws(()=>executeGeometry('apply',{root:base,authorize:'wrong',execute:true}),/Explicit/u);
    writeFileSync(join(base,'.audit/geometry-v1/operation.lock'),JSON.stringify({pid:2147483646,planHash:plan.planHash}));assert.equal(recoverGeometryLock({root:base,authorize:plan.planHash,execute:true}).status,'PREPARED');
    assert.throws(()=>executeGeometry('apply',{root:base,authorize:plan.planHash,execute:true,interruptAfter:1}),/interruption/u);assert.equal(geometryStatus(base).status,'INTERRUPTED');
    assert.equal(executeGeometry('apply',{root:base,authorize:plan.planHash,execute:true}).status,'ACTIVE');assert.equal(executeGeometry('apply',{root:base,authorize:plan.planHash,execute:true}).status,'ACTIVE');
    assert.equal(executeGeometry('rollback',{root:base,authorize:plan.planHash,execute:true}).status,'PREPARED');assert.equal(readFileSync(join(base,'documents.html'),'utf8'),readFileSync('documents.html','utf8'));
    writeFileSync(join(base,'assets/geometry.css'),'changed');assert.throws(()=>executeGeometry('apply',{root:base,authorize:plan.planHash,execute:true}),/Stale dependency/u);
  }finally{const rel=relative(resolve(tmpdir()),resolve(base));assert.ok(rel&&!rel.startsWith('..'));rmSync(base,{recursive:true,force:true});}
});
