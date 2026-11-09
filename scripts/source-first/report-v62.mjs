import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';
import {root} from './build.mjs';
import {digest} from './model.mjs';
import {read,json} from './release-chain-v61.mjs';
import {output,validatePlan,releaseStatusV62,applyV62} from './release-v62.mjs';
import {assertProtected} from './baseline-v62.mjs';
import {maths} from './content-v62.mjs';
const inventory=read(`${output}/inventory.json`),content=read(`${output}/content.json`),plan=read(inventory.manifest),verification=read(`${output}/verification-exits.json`);
assert.equal(verification.planHash,plan.planHash);assert.equal(verification.results.length,15);assert.ok(verification.results.every(r=>r.exitCode===0));assert.equal(verification.sequential,true);
const results=verification.results.map(r=>{const log=readFileSync(join(root,r.log),'utf8');return {...r,passTotals:[...log.matchAll(/(?:ℹ|#)\s*pass\s+(\d+)/gu)].map(m=>Number(m[1])),failTotals:[...log.matchAll(/(?:ℹ|#)\s*fail\s+(\d+)/gu)].map(m=>Number(m[1]))};});assert.ok(results.every(r=>r.failTotals.every(n=>n===0)));
const browser=Object.fromEntries(['content','mobile','graphs','cls'].map(mode=>{const r=read(`${output}/browser-${mode}.json`);assert.equal(r.planHash,plan.planHash);assert.equal(r.passed,true);assert.deepEqual(r.errors,[]);assert.deepEqual(r.networkErrors,[]);assert.ok(r.fixtureApplyRollback);return [mode,r];}));
assert.equal(browser.content.states.length,2*(content.counts.newExamples+content.counts.newKnowledgeGroups+content.counts.newMethodGroups));assert.equal(browser.mobile.states.length,140);assert.equal(browser.graphs.states.length,12);assert.equal(browser.cls.states.length,8);
for(const state of browser.cls.states)assert.ok(state.cls<=.1);
const before=read(`${output}/cls-before.json`),comparison=browser.cls.states.map(after=>{const original=before.find(b=>b.name===after.name&&b.width===after.width);assert.ok(original);return {route:after.name,width:after.width,height:after.height,before:original.shifts.reduce((n,s)=>n+s.value,0),after:after.cls};});
validatePlan(plan);assert.equal(applyV62(plan).writes,0);const protectedCount=assertProtected();const state=releaseStatusV62();assert.equal(state.planHash,plan.parent.planHash,'Real release must still be the original parent');
const sourceInventory=read('.audit/source-first-v5/release-v6/inventory.json');for(const s of sourceInventory.sources)assert.equal(digest(readFileSync(join(root,s.file))),s.sha256);
const bundle=read(plan.bundle),latex=content.groups.flatMap(g=>[...(g.knowledgeIsNew?maths(g.knowledge.lead):[]),...maths(g.sourceContext.knowledge),...maths(g.sourceContext.method),...g.examples.flatMap(e=>[...maths(e.prompt),...maths(e.steps[0].expression)])]);
const classify=reasons=>{const text=reasons.join(';');for(const [label,pattern]of [['FIGURE_DEPENDENT',/NON_TEXT_SOURCE_FIGURE/u],['CONTEXT_REVIEW',/CONTEXT_REVIEW/u],['RADICAL_LAYOUT',/RADICAL/u],['FRACTION_OR_OVERBAR_SCOPE',/FRACTION|BAR_ROLE/u],['SCRIPT_OR_INDEX',/SCRIPT/u],['OPERATOR_OR_OVERLAY',/OPERATOR|OVERLAY|NEGATION/u],['CANONICAL_SYNTAX',/KaTeX|CANONICAL/u],['MISSING_OR_UNSUPPORTED_GLYPH',/GLYPH/u],['MULTILINE_OWNERSHIP',/BASELINE|UNOWNED/u]])if(pattern.test(text))return label;return 'OTHER_DOCUMENTED';};
const blocked=content.decisions.filter(d=>d.status.startsWith('BLOCKED')),breakdown=Object.fromEntries([...new Set(blocked.map(d=>classify(d.reasons)))].map(k=>[k,blocked.filter(d=>classify(d.reasons)===k).length]));assert.equal(Object.values(breakdown).reduce((a,b)=>a+b,0),content.counts.stillBlocked);
const sourceEvidence=read(`${output}/source-evidence.json`),records=new Map(sourceEvidence.sources.flatMap(s=>s.records).map(r=>[r.id,r]));
const originalTechnicalFeatures=content.decisions.filter(d=>d.originalCohort==='SOURCE_AMBIGUOUS').map(d=>{
  const record=records.get(d.id),fields=Object.values(record.fields),glyphs=fields.flatMap(f=>f.layoutEvidence.rows.flat()),trees=fields.flatMap(f=>f.layoutEvidence.tree),features=[];
  if(trees.some(t=>t.kind==='Fraction')||d.beforeReasons.some(r=>r.includes('FRACTION_OR_OVERBAR')))features.push('FRACTION_OR_OVERBAR');
  if(glyphs.some(c=>c.c==='√'))features.push('RADICAL');
  if(glyphs.some(c=>c.font.startsWith('CMEX')&&['∫','∑','∏'].includes(c.c)))features.push('LARGE_OPERATOR');
  if(glyphs.some(c=>c.c==='→')&&trees.some(t=>t.kind==='MathGroup'))features.push('VECTOR_ACCENT');
  if(d.beforeReasons.some(r=>/SCRIPT|NO_BASELINE/u.test(r)))features.push('EXPONENT_OR_INDEX');
  if(d.beforeReasons.some(r=>r.includes('MULTIPLE_MATH_BASELINES')))features.push('MULTILINE_OR_OVERLAY');
  if(d.beforeReasons.some(r=>r.includes('FIGURE')))features.push('FIGURE_DEPENDENT');
  if(d.beforeReasons.some(r=>r.includes('GLYPH')))features.push('MISSING_OR_UNSUPPORTED_GLYPH');
  if(d.beforeReasons.includes('EXACT_NUMERIC_CONFLICT'))features.push('SOURCE_CONTEXT');
  if(!features.length)features.push('OTHER_NOTATION_OR_MIXED_MATH_CONTEXT');
  return {id:d.id,features,status:d.status};
});assert.equal(originalTechnicalFeatures.length,540);
const originalFeatureCounts=Object.fromEntries([...new Set(originalTechnicalFeatures.flatMap(d=>d.features))].map(k=>[k,originalTechnicalFeatures.filter(d=>d.features.includes(k)).length]));
writeFileSync(join(root,output,'original-structural-classification.json'),json({recordCount:540,nonExclusiveFeatures:true,featureCounts:originalFeatureCounts,records:originalTechnicalFeatures}));
const glyph=spawnSync('python',['-X','utf8','tests/source-layout-v62.py'],{cwd:root,encoding:'utf8',windowsHide:true});assert.equal(glyph.status,0);assert.match(glyph.stderr,/Ran 30 tests/u);
const sympy=spawnSync(join(root,'.content-work/source-first-v5/sympy-env/Scripts/python.exe'),['-X','utf8','tests/source-symbolic-v62.py'],{cwd:root,encoding:'utf8',windowsHide:true});assert.equal(sympy.status,0);assert.match(sympy.stderr,/Ran 9 tests/u);
const diff=spawnSync('git',['diff','--check'],{cwd:root,encoding:'utf8'});assert.equal(diff.status,0);
const asset=file=>{const b=readFileSync(join(root,file));return {file,bytes:b.length,gzipBytes:gzipSync(b).length};};
const files=['scripts/source-first/layout-v62.py','scripts/source-first/check-content-v62.py','scripts/source-first/content-v62.mjs','scripts/source-first/baseline-v62.mjs','scripts/source-first/stage-v62.mjs','scripts/source-first/release-v62.mjs','scripts/source-first/preview-v62.mjs','scripts/source-first/preview-ui-v62.mjs','scripts/source-first/compat-suites-v62.mjs','scripts/source-first/verify-v62.mjs','scripts/source-first/report-v62.mjs','scripts/source-first/runtime-v62/learner.mjs','scripts/source-first/runtime-v62/registry.mjs','scripts/source-first/runtime-v62/lesson-workspace.mjs','tests/content-v62.test.mjs','tests/source-layout-v62.py','tests/source-symbolic-v62.py','tests/helpers/release-v62.mjs','.audit/v62-browser.mjs','.audit/v62-layout-probe.mjs','docs/content/learning-v62-handoff.md'];
files.push('tests/helpers/historical-parent-v62.mjs','tests/helpers/release-v61-v62.mjs','tests/helpers/register-historical-v62.mjs');
const report={schemaVersion:'bienedu.final.v6.2',generatedAt:new Date().toISOString(),status:'PARTIAL',
  actualRuntime:{state,v55:'nine original corrected fields retained',v56:'26 fields already included in active V6.0/V6.1',v61:'ACTIVE; all 209 examples retained',v62:'prepared; not applied',actualRuntimeWrites:0},
  content:{...content.counts,cohorts:content.cohorts,cumulativeOverlayExamples:bundle.groups.reduce((n,g)=>n+g.examples.length,0),retainedV60Examples:10,retainedV61Examples:209,
    formulaOccurrences:latex.length,uniqueLatex:new Set(latex).size,remainingBlockerPrimaryCategories:breakdown,original540TechnicalFeatures:{nonExclusive:true,counts:originalFeatureCounts,detail:`${output}/original-structural-classification.json`},independentSourceCount:sourceInventory.sources.length,
    caveat:'Source-structure support is bounded machine evidence, not human source approval or proof of every mathematical assertion.'},
  mathematicalVerification:{checks:content.symbolic.checks.length,passed:content.symbolic.checks.filter(c=>c.status==='passed').length,equationContexts:content.symbolic.checks.filter(c=>c.status==='equation-context').length,
    contextReview:content.symbolic.checks.filter(c=>c.status==='context-review'),scope:content.symbolic.limitation,syntaxDistinctFromSourceFidelity:true,editorialApprovals:0,
    originalUnresolved:{sourceAmbiguities:88,mappingAmbiguities:5,calculusConflicts:9,unsupportedNativeTex:4}},
  graphs:{retainedVerifiedFunctions:5,retainedVariationTables:1,newGraphs:0,newPDFCrops:0,canonicalFigureQueue:188,unverifiedFunctionReferences:75,unverifiedTableReferences:39,jsxgraphVersion:'1.14.2'},
  mobile:{comparison,viewports:browser.mobile.states.map(s=>`${s.width}x${s.height}`).filter((v,i,a)=>a.indexOf(v)===i),
    measurement:'Local Chromium, fresh isolated contexts, reduced motion; paired initial-load cases at height 844; network-idle/fonts-ready +200ms, no user interaction during CLS. Raw shift sum, not production field CWV.',
    maxPairedCLSBefore:Math.max(...comparison.map(c=>c.before)),maxPairedCLSAfter:Math.max(...comparison.map(c=>c.after)),target:.1,physicalSafariCertified:false},
  tests:{sequential:true,results,glyph:{passed:30,failed:0,exitCode:glyph.status},symbolicFixtures:{passed:9,failed:0,exitCode:sympy.status},gitDiffCheck:diff.status,
    priorFailedAttempt:{command:'npm.cmd run verify',exitCode:1,passed:252,failed:1,log:'.audit/source-first-v5/release-v62/verification/2026-11-09T10-45-42-309Z/01-verify.log',rootCause:'The historical preview command regenerates the V6.0 inventory index. The V6.1 disposable release fixture copied that mutable index but only its explicit original parent manifest. After rollback, status lookup consulted a different absent manifest and returned UNKNOWN. Not concurrency or a learner-data regression.',fix:'In the disposable historical copy only, bind the V6.1 fixture inventory to its exact verified parent manifest. Original tests/assertions and root ancestor modules remain unchanged. Added a regression reproducing UNKNOWN and verifying ROLLED_BACK after parent binding. The six exact npm commands run via the child version-aware wrapper; the still-active parent package is not edited.'},
    historicalScope:'Original npm suites replay their unchanged historical assertions in disposable V5.5 fixtures; current active V6.1 is not rolled back. V6.2 tests apply the actual planned files in separate fixtures.',
    browser:Object.fromEntries(Object.entries(browser).map(([mode,r])=>[mode,{states:r.states.length,errors:r.errors.length,networkErrors:r.networkErrors.length,fixtureApplyRollback:r.fixtureApplyRollback,report:`${output}/browser-${mode}.json`}]))},
  performance:{assets:[asset(plan.bundle),asset('assets/vendor/jsxgraph/jsxgraphcore.mjs')],textLessonJSXGraphLoads:Math.max(...browser.content.states.map(s=>s.graphLoads)),pdfLoads:Math.max(...Object.values(browser).flatMap(b=>b.states.map(s=>s.pdfLoads))),
    readingCSSRequestsMax:Math.max(...Object.values(browser).flatMap(b=>b.states.map(s=>s.readingCSSLoads))),sympyInBrowser:false,limitation:'No production speedup/real-device/CWV certification; the bounded font-ready gate trades initial wait for stable text layout.'},
  release:{...inventory,targets:plan.files.map(({file,beforeHash,afterHash})=>({file,beforeHash,afterHash})),atomicity:plan.atomicity,realApplyPerformed:false,realRollbackPerformed:false,protectedAncestorFiles:protectedCount},
  architecture:{stack:'Existing static HTML/CSS/ES Modules; existing Canonical Math Format/Common KaTeX/JSXGraph',newDependencies:[],reactMigration:false,studentProgressIDsChanged:false,practiceScoringChanged:false,modifiedExistingRealRuntimeFiles:[],newImplementationFiles:files,
    immutableAncestorsUnmodified:true,v61StagingUnmodified:true,sourceDocumentsUnmodified:true,recognitionEngine:content.recognitionEngine},
  remaining:{blockedRecords:content.counts.stillBlocked,unprocessed:0,missingSourceTopics:inventory.matrix.filter(t=>!t.sourceIds.length).map(t=>t.topicId),CD23:'UNPUBLISHED',CD20CD21:'PROTECTED',fullMigrationComplete:false},matrix:inventory.matrix,commits:0,pushes:0,deployments:0};
writeFileSync(join(root,output,'final-report.json'),json(report));
const rows=inventory.matrix.map(t=>`| ${t.topicId} | ${t.topicId==='CD23'?'Unpublished':!t.sourceIds.length?'Source missing':['CD20','CD21'].includes(t.topicId)?'Protected existing':t.activeV61Examples?'Partial active V6.1':t.currentExamples?'Existing, not wholly verified':'Source available / incomplete'} | ${t.activeV61Examples} | ${t.preparedV62Examples} | ${t.preparedV62Knowledge} |`).join('\n');
const markdown=`# Biển Edu V6.2 — final results\n\nStatus: PARTIAL. No real V6.2 apply, commit, push or deploy.\n\n## Content\n\n${json(report.content)}\n\n## All 39 topics\n\nActive/prepared counts below are source-overlay counts, not a blanket verification of original content.\n\n| Topic | Actual status | Active V6.1 overlay examples | V6.2 staged examples | V6.2 new primary knowledge |\n|---|---|---:|---:|---:|\n${rows}\n\n## Sequential test results\n\n${results.map(r=>`- ${r.command}: exit ${r.exitCode}, Node passes ${r.passTotals.join('+')||'browser/Python suite'}; full log: ${r.log}`).join('\n')}\n\nBrowser: content ${browser.content.states.length}, mobile ${browser.mobile.states.length}, graphs ${browser.graphs.states.length}, paired no-input CLS ${browser.cls.states.length}; all passed. Python layout 30/30; symbolic 9/9. git diff --check: 0.\n\n## CLS\n\n${json(report.mobile)}\n\n## Local operation\n\nPreview: ${inventory.preview}\n\nServe: ${inventory.serveCommand}\n\nApply (user-controlled, not executed):\n\n${inventory.applyCommand}\n\nRollback:\n\n${inventory.rollbackCommand}\n\nBackups and journals: ${inventory.backupDirectory}\n\nFile-level atomicity only. Roll back child before parent.\n\nSee final-report.json for exact source checks, blockers, test logs, target hashes, files, preserved state and limitations. See docs/content/learning-v62-handoff.md for architecture.\n`;
writeFileSync(join(root,output,'final-report.md'),markdown);
console.log(json({status:report.status,counts:content.counts,cohorts:content.cohorts,tests:report.tests.browser,cls:report.mobile,applyCommand:inventory.applyCommand,rollbackCommand:inventory.rollbackCommand}));
