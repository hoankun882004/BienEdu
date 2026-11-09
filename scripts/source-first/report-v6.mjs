// Evidence-only handoff: never apply data or infer success from old reports.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {root} from './build.mjs';
import {digest} from './model.mjs';
import {verifyGraphSafety} from './graph-build.mjs';
import {applyV6,output} from './release-v6.mjs';
const read=(file)=>JSON.parse(readFileSync(join(root,file),'utf8'));
const verification=read(`${output}/verification-exits.json`);
assert.equal(verification.sequential,true);
assert.deepEqual(verification.results.map((r)=>r.command),['verify','test:source-first','test:canonical','test:graphs','test:release','test:mobile'].map((s)=>`npm.cmd run ${s}`));
for(const entry of verification.results)assert.equal(entry.exitCode,0,entry.command);
const expected={'verify':[238,6],'test:source-first':[63],'test:canonical':[24],'test:graphs':[17],'test:release':[9]};
const totals={};
for(const entry of verification.results){
  const log=readFileSync(join(root,output,entry.log),'utf8'),passes=[...log.matchAll(/(?:ℹ|#) pass (\d+)/gu)].map((m)=>Number(m[1])),fails=[...log.matchAll(/(?:ℹ|#) fail (\d+)/gu)].map((m)=>Number(m[1]));
  const name=entry.command.replace('npm.cmd run ','');if(expected[name]){assert.deepEqual(passes,expected[name],name);assert.ok(fails.every((n)=>n===0),name);}totals[name]={passed:passes,failed:fails,exitCode:entry.exitCode};
}
const inventory=read(`${output}/inventory.json`),plan=read(inventory.manifest),safety=verifyGraphSafety();
assert.equal(applyV6(plan).dryRun,true);
for(const file of plan.files)assert.equal(digest(readFileSync(join(root,file.file))),file.beforeHash,'Real release must remain unapplied');
const mobile=read(`${output}/mobile.json`),release=read(`${output}/browser.json`),graphs=read('.audit/source-first-v5/graphs-v5.8/browser.json'),canonical=read('.audit/source-first-v5/canonical-v5.7/browser.json'),dom=read('.audit/source-first-v5/canonical-v5.7/dom.json');
assert.equal(mobile.passed,true);assert.equal(mobile.states.length,96);assert.deepEqual(mobile.errors,[]);
assert.equal(release.passed,true);assert.equal(release.states.length,39);assert.equal(release.realRuntimeWrites,0);
assert.equal(graphs.passed,true);assert.equal(graphs.states.length,33);assert.equal(canonical.passed,true);assert.equal(dom.passed,true);
const logic=spawnSync('git',['diff','--','assets/js/domain/learning-progress.js','assets/js/domain/practice-bank.js','assets/js/domain/exercise-generators.js'],{cwd:root,encoding:'utf8',windowsHide:true});assert.equal(logic.stdout,'');
const diff=spawnSync('git',['diff','--check'],{cwd:root,encoding:'utf8',windowsHide:true});assert.equal(diff.status,0,diff.stdout);
for(const source of inventory.sources)assert.equal(digest(readFileSync(join(root,source.file))),source.sha256);
const assets=['assets/vendor/jsxgraph/jsxgraphcore.mjs',plan.bundle,'assets/learning-v6.css','assets/js/learning-v6.js'].map((file)=>({file,bytes:statSync(join(root,file)).size,gzipBytes:gzipSync(readFileSync(join(root,file))).length}));
const canonicalNodes=read(`${output}/canonical.json`),formulas=canonicalNodes.flatMap((r)=>r.node.type==='math'?[r.node.latex]:r.node.segments.filter((n)=>n.type==='math').map((n)=>n.latex));
const cls=mobile.states.map((s)=>s.cls??0),dcl=mobile.states.map((s)=>s.domContentLoadedMs??0);
const report={schemaVersion:'bienedu.final.v6',generatedAt:new Date().toISOString(),status:'PARTIAL',scope:'Local batch and mobile improvements implemented and tested; not complete conversion/publication of all source material',
  verification,totals,browser:{mobileStates:96,viewports:[...new Set(mobile.states.map((s)=>`${s.width}x${s.height}`))],releaseStates:39,graphStates:33,canonicalStates:canonical.states,canonicalDOMViewports:dom.states.length,errors:[],fixtureApplyRollback:true,realRuntimeWrites:0},
  sources:{independent:inventory.sources.length,topics:inventory.matrix.length,missingTopics:inventory.matrix.filter((r)=>r.status==='SOURCE_MISSING').map((r)=>r.topicId),newPDFSemanticPairs:1080,newExamplesPrepared:10,remainingNewPairsNotConverted:1070,sourceMatrix:`${output}/inventory.json`},
  mathematics:{canonicalContentNodes:canonicalNodes.length,formulaOccurrences:formulas.length,uniqueLatexExpressions:new Set(formulas).size,newSequenceSymbolicChecks:inventory.symbolic.checks.length,pendingCorrectionFields:35,v56PhysicalFields:26,additionalOverlayFields:9,sourceAmbiguitiesRetained:88,mappingAmbiguitiesRetained:5,calculusConflictsRetained:9,unsupportedNativeCasesRetained:4},
  graphInventory:{total:188,functionGraphs:80,variationTables:40,textAssets:68,functionsReconstructed:5,tablesReconstructed:1,uncertifiedGraphs:75,uncertifiedTables:39,newPDFCropAssets:0},
  safety:{...safety,actualActivation:'null',actualRuntime:'V5.5 applied; V5.6 prepared; V6 unapplied',progressKeysChanged:false,scoringChanged:false,originalSourcesModified:false,productionPublication:false,commitsPushesDeployments:0,gitDiffCheckExit:diff.status},
  performance:{assets,jsxgraphOnOrdinaryLessons:0,pdfLoadsDuringLearnerRendering:0,sympyShipped:false,observedCLS:{min:Math.min(...cls),max:Math.max(...cls)},observedDOMContentLoadedMs:{min:Math.min(...dcl),max:Math.max(...dcl)},note:'Local browser observations, not production CWV or a measured before/after speedup. CLS includes legacy page behavior.'},
  release:{planHash:inventory.planHash,manifest:inventory.manifest,applyCommand:inventory.applyCommand,rollbackCommand:inventory.rollbackCommand,backups:`.content-work/release-v6/${inventory.planHash}/`,preview:'http://127.0.0.1:8000/.audit/source-first-v5/release-v6/preview.html',serveCommand:'python -m http.server 8000 --bind 127.0.0.1',atomicity:plan.atomicity},
  architecture:{reactMigration:false,newDependencies:[],decision:'Keep ES Modules; migration does not solve source fidelity or authorization.'},
  limitations:['Most source material still requires canonical conversion and mathematical verification.','Ten topics have no authoritative source; CD23 remains unpublished.','No real release without fresh explicit authorization.','No exhaustive WCAG certification or production CWV claim.','Existing ambiguities, conflicts and unsupported figures are retained.'],documentation:'docs/content/learning-v6-handoff.md'};
writeFileSync(join(root,output,'final-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,verificationPassed:true,node:238,sourceFirst:63,canonical:24,graphs:17,release:9,mobile:96,planHash:inventory.planHash,realRuntimeWrites:0}));
