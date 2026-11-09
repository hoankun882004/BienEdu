import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {root} from './build.mjs';
import {digest} from './model.mjs';
import {output} from './content-v61.mjs';
import {read,json,activeBaseline,applyContinuation} from './release-chain-v61.mjs';
const report=read(`${output}/inventory.json`),content=read(`${output}/content.json`),plan=read(report.manifest),verification=read(`${output}/verification-exits.json`);
assert.equal(verification.planHash,plan.planHash,'Final suites must test the fresh current manifest');assert.equal(verification.sequential,true);
assert.deepEqual(verification.results.map((r)=>r.command),['verify','test:source-first','test:canonical','test:graphs','test:release','test:mobile'].map((name)=>`npm.cmd run ${name}`));
assert.ok(verification.results.every((r)=>r.exitCode===0),'All required suites must pass');
const totals=verification.results.map((row)=>{const log=readFileSync(join(root,row.log),'utf8'),passes=[...log.matchAll(/(?:ℹ|#)\s*pass\s+(\d+)/gu)].map((m)=>Number(m[1])),failures=[...log.matchAll(/(?:ℹ|#)\s*fail\s+(\d+)/gu)].map((m)=>Number(m[1]));assert.ok(failures.every((n)=>n===0));return {...row,nodePassTotals:passes,nodeFailTotals:failures};});
const browsers=Object.fromEntries(['content','graphs','mobile'].map((mode)=>{const r=read(`${output}/browser-${mode}.json`);assert.equal(r.planHash,plan.planHash);assert.equal(r.passed,true);assert.equal(r.errors.length,0);assert.equal(r.realRuntimeWrites,0);return [mode,r];}));
assert.equal(browsers.content.states.length,2*(content.groups.length+content.counts.newExamples));assert.equal(browsers.mobile.states.length,128);assert.equal(browsers.graphs.states.length,12);
const baseline=activeBaseline();assert.equal(baseline.parent.planHash,plan.parent.planHash,'No real V6.1 activation occurred during implementation');
assert.equal(applyContinuation(plan).writes,0);for(const f of plan.files)assert.equal(digest(readFileSync(join(root,f.file))),f.beforeHash);
const v6=read('.audit/source-first-v5/release-v6/inventory.json');for(const s of v6.sources)assert.equal(digest(readFileSync(join(root,s.file))),s.sha256);
const math=[];function visit(o){if(o?.type==='math')math.push(o.latex);else if(Array.isArray(o))o.forEach(visit);else if(o&&typeof o==='object')Object.values(o).forEach(visit);}visit(content.groups);
const glyph=spawnSync('python',['-X','utf8','tests/source-glyph-v61.py'],{cwd:root,encoding:'utf8',windowsHide:true});assert.equal(glyph.status,0,glyph.stdout+glyph.stderr);assert.match(glyph.stderr,/Ran 10 tests/u);writeFileSync(join(root,output,'glyph-tests.log'),glyph.stdout+glyph.stderr);
const asset=(file)=>{const bytes=readFileSync(join(root,file));return {file,bytes:bytes.length,gzipBytes:gzipSync(bytes).length};};
const states=Object.values(browsers).flatMap((r)=>r.states),range=(values)=>({min:Math.min(...values),max:Math.max(...values)});
const diff=spawnSync('git',['diff','--check'],{cwd:root,encoding:'utf8'});assert.equal(diff.status,0,diff.stderr);
const result={schemaVersion:'bienedu.final.v6.1',generatedAt:new Date().toISOString(),status:'PARTIAL',
  actualRuntime:{status:baseline.state.status,parentPlanHash:baseline.parent.planHash,v55:'9 corrected fields retained',v56:'26 physical fields included in the user-applied active V6.0',v61:'prepared, not applied',runtimeWritesByTask:0},
  content:{...content.counts,preparedFormulaOccurrences:math.length,preparedUniqueLatex:new Set(math).size,sourceAnalysisFormulaOccurrences:content.formulaOccurrences,
    caveat:'Canonical structure/render success is not independent proof or human source/editorial approval',independentSources:v6.sources.length,newSourcePDFs:content.sources.length,matrix:report.matrix},
  mathematics:{retainedV6CorrectionFields:35,retainedV55Fields:9,retainedV56Fields:26,retainedOverlayFields:9,numericSympyChecks:content.symbolic.checks.length,numericChecksPassed:content.symbolic.checks.filter((c)=>c.passed).length,
    flaggedNumericContexts:content.symbolic.checks.filter((c)=>!c.passed),contextNote:'False numeric fragments may be intentional contradiction or adjacent prose; not automatically classified as source errors or corrected.',
    operatorPreservation:{middleDot:'\\cdot',cross:'\\times',preparedExpressionsWithMiddleDot:math.filter((latex)=>latex.includes('\\cdot')).length},
    existingSourceAmbiguities:88,existingMappingAmbiguities:5,existingCalculusAnswerConflicts:9,existingUnsupportedTexCases:4,humanApprovalsCreated:0},
  graphs:{jsxgraphVersion:'1.14.2',retainedFunctions:5,retainedVariationTables:1,newGuessedGraphs:0,figureQueue:188,functionRecords:80,variationRecords:40,textAssets:68,uncertifiedFunctions:75,uncertifiedTables:39,newPDFCropAssets:0},
  tests:{sequential:true,legacyBenchmarkIsolated:true,results:totals,glyphTests:{command:'python -X utf8 tests/source-glyph-v61.py',exitCode:glyph.status,passed:10,failed:0},gitDiffCheckExit:diff.status,
    scope:'Historical suites retain all original assertions in an isolated V5.5 benchmark. Additional V6.1 browser tests apply/rollback the real prepared files in disposable filesystem fixtures.'},
  browser:Object.fromEntries(Object.entries(browsers).map(([mode,r])=>[mode,{states:r.states.length,errors:r.errors.length,viewports:[...new Set(r.states.map((s)=>`${s.width}x${s.height}`))],fixtureApplyRollback:r.fixtureApplyRollback,report:`${output}/browser-${mode}.json`}])),
  performance:{assets:[asset(plan.bundle),asset('assets/vendor/jsxgraph/jsxgraphcore.mjs')],localDOMContentLoadedMs:range(states.map((s)=>s.dcl).filter(Number.isFinite)),localObservedCLS:range(states.map((s)=>s.cls).filter(Number.isFinite)),
    ordinaryLessonGraphLoads:Math.max(...browsers.content.states.map((s)=>s.graphLoads)),learnerPDFLoads:Math.max(...states.map((s)=>s.pdfLoads)),sympyInBrowser:false,
    limitation:'Local Chromium observations, not production CWV, a controlled speedup benchmark or physical iOS Safari certification.'},
  architecture:{stack:'Existing HTML/CSS/ES Modules, Canonical Math Format v1, Common KaTeX Renderer, JSXGraph',reactMigration:false,newDependencies:[],studentProgressIDsChanged:false,practiceScoringChanged:false,protectedCD20CD21Changed:false,CD23Published:false},
  release:{planHash:plan.planHash,parentPlanHash:plan.parent.planHash,manifest:report.manifest,applyCommand:report.applyCommand,rollbackCommand:report.rollbackCommand,preview:report.preview,serveCommand:report.serveCommand,
    backupsAndJournals:`.content-work/release-v61/${plan.planHash}/`,targets:plan.files.map(({file,beforeHash,afterHash})=>({file,beforeHash,afterHash})),atomicity:plan.atomicity,realApplyPerformed:false,realRollbackPerformed:false},
  remaining:{blockedRecords:1080-content.counts.alreadyAvailable-content.counts.newExamples,unprocessedCandidates:0,sourceMissingTopics:report.matrix.filter((r)=>r.status==='SOURCE_MISSING').map((r)=>r.topicId),CD23:'unpublished',fullSourceConversionComplete:false},
  documentation:'docs/content/learning-v61-handoff.md',commits:0,pushes:0,deployments:0,productionReady:false,localExperimentReady:true};
writeFileSync(join(root,output,'final-report.json'),json(result));console.log(json({status:result.status,counts:content.counts,tests:totals.map((r)=>({command:r.command,exit:r.exitCode,pass:r.nodePassTotals,fail:r.nodeFailTotals})),browser:result.browser,release:result.release}));
