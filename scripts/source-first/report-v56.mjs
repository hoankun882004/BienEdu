// Reproduce the handoff only from completed logs and unchanged real files.
import { readFileSync,writeFileSync,existsSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import { root } from "./build.mjs";
import { digest } from "./model.mjs";
import { readDevelopmentOverview } from "./development.mjs";
import { continuationStatus,validateContinuation,applyContinuation } from "./development-continuation.mjs";

const base=".audit/source-first-v5/",read=(file)=>JSON.parse(readFileSync(join(root,base+file),"utf8"));
const preview=read("development-preview-v5.6.json"),recovery=read("recovery-v5.6.json"),audit=read("fraction-audit-v5.6.json"),browser=read("browser-v5.6.json"),verification=read("verification-v5.1.json");
const log=(file)=>readFileSync(join(root,base+file),"utf8");
const results=(file)=>[...log(file).matchAll(/(?:ℹ|#) (tests|pass|fail) (\d+)/gu)].map((match)=>[match[1],Number(match[2])]);
assert.deepEqual(results("verify-v56.log"),[["tests",188],["pass",188],["fail",0],["tests",6],["pass",6],["fail",0]]);
assert.deepEqual(results("source-tests-v56-final.log"),[["tests",63],["pass",63],["fail",0]]);
assert.ok(log("verify-v56.log").includes("Polish pass checks passed"));
assert.deepEqual(JSON.parse(log("source-tests-v56-final.log").trim().split(/\r?\n/u).at(-1)),{passed:true,states:40,parentStates:6,realRuntimeWrites:0});
assert.equal(browser.planHash,preview.plan.planHash);assert.equal(browser.passed,true);
for(const entry of [...recovery.sources,...recovery.runtime,...recovery.protectedFiles,...recovery.parentDependencies])assert.equal(digest(readFileSync(join(root,entry.file))),entry.hash,entry.file);
for(const entry of recovery.journal)assert.equal(digest(readFileSync(join(root,".content-work/source-first-v5/dev-experiments",recovery.parentPlanHash,entry.file))),entry.hash);
assert.equal(verification.counts.pendingFigures,188);assert.equal(verification.counts.calculusAnswerConflicts,9);assert.equal(verification.counts.missingSourceTopics.length,21);assert.equal(verification.counts.newlyPublished,0);
validateContinuation(preview.plan);const dryRun=applyContinuation(preview.plan);assert.equal(dryRun.runtimeWrites,0);
assert.equal(readDevelopmentOverview().stale,false);assert.equal(continuationStatus(preview.plan).status,"prepared-on-applied-v5.5");
assert.equal(existsSync(join(root,".content-work/source-first-v5/dev-experiments",preview.plan.planHash)),false);
const report={schemaVersion:"bienedu.validation.v5.6",clientDate:"2026-11-06",timezone:"Asia/Bangkok",generatedAt:new Date().toISOString(),
  inspected:180,classifications:audit.counts,eligible:{groups:10,fields:26,files:1},confirmedButExcluded:4,actualNewCorrectionsApplied:0,
  parent:{status:readDevelopmentOverview().status,unchangedRuntime:recovery.runtime,unchangedJournalEvents:recovery.journal.length,rollbackDependenciesIntact:true},child:continuationStatus(preview.plan),dryRun,
  tests:{verify:{exitCode:0,log:base+"verify-v56.log"},node:{passed:188,total:188},latex:{passed:6,total:6},sourceFirst:{exitCode:0,passed:63,total:63,log:base+"source-tests-v56-final.log"},
    symbolic:{engine:preview.plan.symbolic.engine,version:preview.plan.symbolic.version,total:22,passed:preview.plan.symbolic.checks.filter((entry)=>entry.status==="passed").length,scope:"4 derivatives/domains plus 18 exact polynomial point values; not proof of all 180 cases"},
    importer:{groups:10,fields:26,deterministicReplay:true,wholeCurriculumRegenerationBlocked:true},
    browser:{passed:browser.passed,report:base+"browser-v5.6.json",beforeStates:browser.before.states.length,afterStates:browser.after.states.length,inheritedV55States:browser.parentPreserved.states.length,actualFiles:true,noModuleResponseOverrides:true,
      screenshotsVisuallyInspected:["v56-1.3-source-example-2-after-390.png","v56-1.3-source-example-5-after-1366.png","v56-6.1-source-example-5-after-1366.png","v56-6.1-source-example-2-after-390.png"],progressPreserved:true,exercisesPreserved:true}},
  sources:{total:recovery.sources.length,unchanged:true,originalPDFPagesVisuallyInspected:[5,6,49,50,51,66,67,87,88],humanReviewInferred:false},
  tools:{additionalOCRInstalled:false,privateDocumentsUploaded:false,paidAPIsUsed:false,availableMemoryKiBObserved:3002624,totalUsableMemoryKiB:16153796,freeDiskBytesObserved:78724808704,recognitionBacklog:"88 source-ambiguous references; no unmeasured OCR improvement claimed"},
  remaining:{sourceAmbiguous:88,runtimeMappingAmbiguous:5,confirmedDeferred:4,figureReviews:188,answerConflictsOutsideThis180ReferenceAudit:9,missingAuthoritativeSourceTopics:verification.counts.missingSourceTopics,CD20CD21Protected:true,CD23NewPublication:false},
  commands:{preview:preview.previewCommand,status:preview.statusCommand,apply:preview.applyCommand,rollback:preview.rollbackCommand,immutablePlan:preview.immutablePlan},realRuntimeWrites:0,humanApprovalsCreated:0,commitsPushesDeployments:0};
writeFileSync(join(root,base+"validation-v5.6.json"),JSON.stringify(report,null,2)+"\n");
const checkpoint=read("checkpoint.json");
checkpoint.developmentV56={report:base+"validation-v5.6.json",preview:base+"development-preview-v5.6.html",audit:base+"fraction-audit-v5.6.json",planHash:preview.plan.planHash,inspected:180,eligibleGroups:10,eligibleFields:26,parentStatus:"locally-applied-unreviewed",actualNewRuntimeWrites:0,humanApprovalsCreated:0};
writeFileSync(join(root,base+"checkpoint.json"),JSON.stringify(checkpoint,null,2)+"\n");
console.log(JSON.stringify({passed:true,planHash:preview.plan.planHash,node:188,latex:6,sourceFirst:63,symbolic:22,browserStates:46,realRuntimeWrites:0}));
