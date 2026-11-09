// V5.6 continuation of the existing development protocol, not publication.
// Keep V5.5's hash-bound engine untouched: an overlapping child must be rolled
// back first. Its before bytes are the *applied* parent, never the old baseline.
import { readFileSync,writeFileSync,existsSync,mkdirSync,openSync,closeSync,fsyncSync,renameSync,unlinkSync } from "node:fs";
import { join,dirname } from "node:path";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { root as projectRoot,work as projectWork } from "./build.mjs";
import { digest,localFile } from "./model.mjs";
import { devDependencies,assertDevelopmentEnvironment } from "./development.mjs";
import { previewRuntimeFile,safeRuntimeFile } from "./local-release.mjs";
import { readJsonObjectAfter } from "./runtime-target.mjs";
import { writeImmutableJson } from "./review-store.mjs";
import { prepareFractionBatch,verifySymbolic,registryFile } from "./fraction-batch.mjs";
import { classifyFractions,classifications } from "./fraction-audit.mjs";
import { renderMathText } from "../../assets/js/components/markdown-math-renderer.js";

export const previewFile=".audit/source-first-v5/development-preview-v5.6.json";
export const continuationDependencies=[...devDependencies,"scripts/import-foundation-documents.py","scripts/source-first/import-corrections.py",registryFile,
  "scripts/source-first/corrections-v56.mjs","scripts/source-first/fraction-batch.mjs","scripts/source-first/fraction-audit.mjs","scripts/source-first/fraction-evidence.py",
  "scripts/source-first/symbolic-batch.py","scripts/source-first/development-continuation.mjs","scripts/source-first/batch-browser-check.mjs"];
const read=(root,file)=>JSON.parse(readFileSync(localFile(root,file),"utf8"));
const directory=(work,hash)=>{if(!/^[A-F0-9]{64}$/u.test(hash))throw new Error("Invalid batch hash");return join(work,"dev-plans",hash);};
const backup=(work,plan,file)=>join(directory(work,plan.planHash),`${digest(file)}.json`);
const fieldValue=(record,field)=>field==="source-solution.expression"?record.steps.find((step)=>step.label==="Lời giải từ tài liệu")?.expression:record[field];

export function replayBatch() {
  const result=spawnSync("python",["-X","utf8",join(projectRoot,"scripts/import-foundation-documents.py"),"--review-fraction-candidates"],{encoding:"utf8",windowsHide:true,timeout:20000,maxBuffer:4*1024*1024});
  if(result.status!==0)throw new Error(result.error?.message??result.stderr);
  return JSON.parse(result.stdout);
}

export function prepareContinuation() {
  if(existsSync(join(projectRoot,previewFile))) {
    const previous=read(projectRoot,previewFile),state=continuationStatus(previous.plan);
    if(state.status!=="prepared-on-applied-v5.5") { validateContinuation(previous.plan);return {...previous,status:state,retainedActivePlan:true}; }
  }
  const {recovery,rows,registry,symbolic}=prepareFractionBatch();
  if(symbolic.checks.some((entry)=>entry.status!=="passed"))throw new Error("Unsupported/conflicting symbolic candidate; no batch authorized");
  const audit=classifyFractions(rows,registry),counts=Object.fromEntries(classifications.map((category)=>[category,audit.filter((row)=>row.classification===category).length]));
  if(audit.length!==180 || new Set(audit.map((row)=>row.reference)).size!==180 || audit.some((row)=>!row.existingEntityKey))throw new Error("Canonical 180-case queue mismatch");
  writeFileSync(join(projectRoot,".audit/source-first-v5/fraction-audit-v5.6.json"),JSON.stringify({schemaVersion:"bienedu.fraction-audit.v5.6",newQueueCreated:false,counts,total:180,rows:audit},null,2)+"\n");
  const file="assets/js/data/foundation-lessons.generated.js",before=readFileSync(join(projectRoot,file),"utf8"),examples=readJsonObjectAfter(before,"const examples = ");
  const replay=replayBatch(),changes=[];
  for(const correction of registry.corrections) {
    const records=examples[correction.code].filter((record)=>record.id===correction.recordId && record.sourceBlockId===correction.sourceBlockId);
    if(records.length!==1 || digest(records[0])!==correction.recordHash)throw new Error("Stale/ambiguous runtime record");
    const imported=replay.candidates.find((record)=>record.id===correction.recordId);
    for(const field of correction.fields) {
      if(!imported || fieldValue(imported,field.field)!==field.after)throw new Error("Actual importer did not preserve correction");
      changes.push({recordId:correction.recordId,fieldId:field.field,sourceBlockId:correction.sourceBlockId,correctionId:correction.id,
        binding:{recordHash:correction.recordHash},before:field.before,after:field.after,source:{file:correction.sourceFile,sha256:correction.sourceHash,regions:correction.regions}});
    }
  }
  const after=previewRuntimeFile(before,file,changes);
  const parent=read(projectRoot,".audit/source-first-v5/development-preview-v5.5.json").plan;
  const body={schemaVersion:"bienedu.development-continuation.v5.6",mode:"local-development-experiment",formalHumanApproval:false,productionPublication:false,
    parentPlanHash:parent.planHash,parentFiles:parent.files.map(({file,afterHash})=>({file,afterHash})),
    files:[{file,beforeHash:digest(before),afterHash:digest(after),changes}],
    dependencies:continuationDependencies.map((file)=>({file,hash:digest(readFileSync(join(projectRoot,file)))})),
    sources:recovery.sources,symbolic,registryHash:digest(registry),replayHash:digest(replay),counts,
    rollbackPolicy:"Child rollback restores applied V5.5 bytes; rollback child before parent. File-level atomicity only; interrupted child can resume/rollback with same immutable manifest."};
  const plan={...body,planHash:digest(body)};
  writeImmutableJson(backup(projectWork,plan,file),{file,before,after});
  writeImmutableJson(join(directory(projectWork,plan.planHash),"manifest.json"),plan);
  const report={plan,summary:{inspected:180,classifications:counts,eligibleCorrections:registry.corrections.length,eligibleFields:changes.length,files:1,excludedCandidates:180-registry.corrections.length,confirmedButExcluded:counts.CONFIRMED_CONVERSION_ERROR-registry.corrections.length},
    status:continuationStatus(plan),realRuntimeWrites:0,formalHumanApproval:false,
    previewCommand:"npm.cmd run content:dev:batch -- preview",statusCommand:"npm.cmd run content:dev:batch -- status",
    applyCommand:`npm.cmd run content:dev:batch -- apply --development --execute --authorize ${plan.planHash}`,
    rollbackCommand:`npm.cmd run content:dev:batch -- rollback --development --execute --authorize ${plan.planHash}`,
    immutablePlan:`.content-work/source-first-v5/dev-plans/${plan.planHash}/manifest.json`};
  writeFileSync(join(projectRoot,previewFile),JSON.stringify(report,null,2)+"\n");
  const escape=(value)=>String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
  const html=`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>BienEdu · V5.6</title><link rel="stylesheet" href="../../assets/vendor/katex/katex.min.css"><style>body{font:16px/1.6 system-ui;max-width:1120px;margin:auto;padding:24px;color:#13243f;background:#f2f5fa}section{padding:20px;background:white;margin:16px 0;border:1px solid #d6dfed}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}.columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.columns>div{min-width:0;overflow-x:auto}h1{font-size:28px}a{color:#215bb9}@media(max-width:700px){.columns{grid-template-columns:1fr}body{padding:12px}}</style><h1>Biển Edu · Bản sửa toán học V5.6</h1><p>CHƯA ÁP DỤNG · Thử nghiệm local · Không phải kiểm duyệt của con người</p><pre>${escape(JSON.stringify(report.summary,null,2))}</pre><p>Baseline: V5.5 đã áp dụng, giữ nguyên 9 trường. Bản này chỉ thay 26 trường thuộc 10 ví dụ khác.</p><pre>${escape(report.applyCommand)}</pre>${changes.map((change)=>`<section><h2>${escape(change.recordId)} · ${escape(change.fieldId)}</h2><p>Nguồn SHA: ${change.source.sha256}</p><p>${change.source.regions.map((region)=>`<a href="v56-source-page-${region.page}.png">${escape(region.role)} · trang ${region.page}</a>`).join(" · ")}</p><div class="columns"><div><h3>Hiện tại</h3>${renderMathText(change.before)}<pre>${escape(change.before)}</pre></div><div><h3>Đề xuất</h3>${renderMathText(change.after)}<pre>${escape(change.after)}</pre></div></div></section>`).join("")}<h2>Hoàn tác về V5.5 đã áp dụng</h2><pre>${escape(report.rollbackCommand)}\n${escape(report.immutablePlan)}</pre><p><a href="fraction-audit-v5.6.json">Đối chiếu đầy đủ 180 mục</a> · <a href="symbolic-v5.6.json">Kiểm tra SymPy</a> · <a href="browser-v5.6.json">Kiểm tra trình duyệt (chỉ có sau khi chạy)</a></p></html>`;
  writeFileSync(join(projectRoot,".audit/source-first-v5/development-preview-v5.6.html"),html);
  return report;
}

export function continuationStatus(plan,{root=projectRoot}={}) {
  const files=plan.files.map((entry)=>{const hash=digest(readFileSync(safeRuntimeFile(root,entry.file)));return {file:entry.file,state:hash===entry.beforeHash?"before":hash===entry.afterHash?"after":"conflict"};});
  return {planHash:plan.planHash,parentPlanHash:plan.parentPlanHash,formalHumanApproval:false,productionPublication:false,files,
    status:files.some((entry)=>entry.state==="conflict")?"conflict":files.every((entry)=>entry.state==="before")?"prepared-on-applied-v5.5":files.every((entry)=>entry.state==="after")?"locally-applied-unreviewed":"partial-application; resume or rollback same child plan"};
}

export function validateContinuation(plan,{root=projectRoot,work=projectWork,mathematics=true}={}) {
  const {planHash,...body}=plan;
  if(plan.schemaVersion!=="bienedu.development-continuation.v5.6" || digest(body)!==planHash || plan.formalHumanApproval!==false || plan.productionPublication!==false || plan.mode!=="local-development-experiment")throw new Error("Invalid continuation manifest/hash/mode");
  if(JSON.stringify(plan.dependencies.map((entry)=>entry.file))!==JSON.stringify(continuationDependencies))throw new Error("Dependency set mismatch");
  for(const entry of [...plan.dependencies,...plan.sources])if(digest(readFileSync(localFile(root,entry.file)))!==entry.hash)throw new Error("Stale source/dependency; no writes");
  const parent=read(root,`.content-work/source-first-v5/dev-plans/${plan.parentPlanHash}/manifest.json`);
  const {planHash:parentHash,...parentBody}=parent;
  if(digest(parentBody)!==parentHash || parentHash!==plan.parentPlanHash || digest(parent.files.map(({file,afterHash})=>({file,afterHash})))!==digest(plan.parentFiles))throw new Error("Invalid immutable parent");
  for(const entry of parent.dependencies)if(digest(readFileSync(localFile(root,entry.file)))!==entry.hash)throw new Error("Parent V5.5 rollback dependencies changed");
  for(const entry of plan.parentFiles){const child=plan.files.find((file)=>file.file===entry.file);if(child ? child.beforeHash!==entry.afterHash : digest(readFileSync(safeRuntimeFile(root,entry.file)))!==entry.afterHash)throw new Error("Parent not applied or child not based on applied parent");}
  const registry=read(root,registryFile),seen=new Set();
  if(digest(registry)!==plan.registryHash || plan.files.length!==1 || plan.files[0].file!=="assets/js/data/foundation-lessons.generated.js")throw new Error("Unexpected correction registry/runtime file set");
  for(const file of plan.files) {
    const saved=JSON.parse(readFileSync(backup(work,plan,file.file),"utf8"));
    if(saved.file!==file.file || digest(saved.before)!==file.beforeHash || digest(saved.after)!==file.afterHash || previewRuntimeFile(saved.before,file.file,file.changes)!==saved.after)throw new Error("Immutable backup/preview mismatch");
    for(const change of file.changes) {
      const record=registry.corrections.find((entry)=>entry.recordId===change.recordId && entry.id===change.correctionId),field=record?.fields.find((entry)=>entry.field===change.fieldId);
      const key=`${change.recordId}:${change.fieldId}`;
      if(!field || field.before!==change.before || field.after!==change.after || change.binding.recordHash!==record.recordHash || change.sourceBlockId!==record.sourceBlockId
        || digest(change.source)!==digest({file:record.sourceFile,sha256:record.sourceHash,regions:record.regions}) || !plan.sources.some((source)=>source.file===record.sourceFile && source.hash===record.sourceHash)
        || ["20","21","23"].includes(record.code.split(".")[0]) || seen.has(key) || /math-render-error|katex-error/u.test(renderMathText(change.after)))throw new Error("Unbound/duplicate/protected/invalid correction field");
      seen.add(key);
    }
  }
  if(seen.size!==registry.corrections.reduce((sum,entry)=>sum+entry.fields.length,0))throw new Error("Incomplete correction groups");
  if(mathematics) {
    const checked=verifySymbolic(registry);
    if(digest(checked)!==digest(plan.symbolic) || checked.checks.some((entry)=>entry.status!=="passed"))throw new Error("Unsupported/conflicting symbolic evidence");
    if(digest(replayBatch())!==plan.replayHash)throw new Error("Importer replay changed");
  }
  return true;
}

export function applyContinuation(plan,{root=projectRoot,work=projectWork,execute=false,development=false,authorize=null,env=process.env,rollback=false,beforeFile=null,afterFile=null}={}) {
  if(execute){assertDevelopmentEnvironment({root,development,env});if(authorize!==plan.planHash)throw new Error("Explicit exact fresh manifest authorization required");}
  validateContinuation(plan,{root,work});
  const initial=continuationStatus(plan,{root});
  if(!execute)return {...initial,dryRun:true,runtimeWrites:0};
  if(initial.status==="conflict")throw new Error("Unknown runtime edits; no overwrite");
  const lock=join(work,".local-release.lock"),handle=openSync(lock,"wx"),journal=join(work,"dev-experiments",plan.planHash);let writes=0;
  try {
    mkdirSync(journal,{recursive:true});
    const event={planHash:plan.planHash,parentPlanHash:plan.parentPlanHash,action:rollback?"rollback":"apply",humanEditorialApproval:false,executedAt:new Date().toISOString()};
    const log=(kind,data)=>writeImmutableJson(join(journal,`${Date.now()}-${randomBytes(6).toString("hex")}-${kind}.json`),{...event,...data});
    log("intent",{});
    try {
      for(const [index,entry] of (rollback?[...plan.files].reverse():plan.files).entries()) {
        const target=safeRuntimeFile(root,entry.file),desired=rollback?entry.beforeHash:entry.afterHash,expected=rollback?entry.afterHash:entry.beforeHash;
        if(digest(readFileSync(target))===desired)continue;
        beforeFile?.(entry,index);validateContinuation(plan,{root,work,mathematics:false});
        if(digest(readFileSync(target))!==expected)throw new Error("Concurrent runtime edit");
        const saved=JSON.parse(readFileSync(backup(work,plan,entry.file),"utf8")),temporary=join(dirname(target),`.bienedu-dev-${randomBytes(8).toString("hex")}.tmp`);
        try {const descriptor=openSync(temporary,"wx");try{writeFileSync(descriptor,rollback?saved.before:saved.after,"utf8");fsyncSync(descriptor);}finally{closeSync(descriptor);}
          if(digest(readFileSync(target))!==expected)throw new Error("Concurrent edit before replacement");renameSync(temporary,target);writes++;afterFile?.(entry,index);
        }finally{if(existsSync(temporary))unlinkSync(temporary);}
      }
      const result=spawnSync(process.execPath,[join(projectRoot,"scripts/source-first/validate-dev-runtime.mjs")],{input:JSON.stringify({root,changes:plan.files.flatMap((file)=>file.changes),phase:rollback?"before":"after"}),encoding:"utf8",windowsHide:true,timeout:20000,maxBuffer:4*1024*1024});
      if(result.status!==0)throw new Error(`Actual learner validation failed: ${result.stderr}`);
      const state=continuationStatus(plan,{root}),validation=JSON.parse(result.stdout);log("validated",{state,validation,runtimeWrites:writes});return {...state,validation,runtimeWrites:writes,dryRun:false};
    }catch(error){log("interrupted",{state:continuationStatus(plan,{root}),runtimeWrites:writes,error:error.message});throw new Error(`${error.message}. Resume/rollback SAME child manifest/hash; immutable backups retained. Never roll back V5.5 first.`);}
  }finally{closeSync(handle);unlinkSync(lock);}
}

if(process.argv[1]?.endsWith("development-continuation.mjs")) {
  try {
    const [command="preview",...args]=process.argv.slice(2),option=(name)=>{const index=args.indexOf(`--${name}`);return index<0?null:args[index+1];};
    if(command==="preview"){const result=prepareContinuation();console.log(JSON.stringify({...result.summary,planHash:result.plan.planHash,applyCommand:result.applyCommand,rollbackCommand:result.rollbackCommand,runtimeWrites:0},null,2));}
    else {
      const payload=read(projectRoot,option("plan")??previewFile),plan=payload.plan??payload;
      if(command==="status")console.log(JSON.stringify(continuationStatus(plan),null,2));
      else if(["apply","rollback"].includes(command)) {
        const result=applyContinuation(plan,{execute:args.includes("--execute"),development:args.includes("--development"),authorize:option("authorize"),rollback:command==="rollback"});
        if(command==="apply" && args.includes("--execute")) {
          const {checkBatchBrowser}=await import("./batch-browser-check.mjs");
          try{result.browser=await checkBatchBrowser(projectRoot,plan);}catch(error){throw new Error(`Local batch applied, browser check failed: ${error.message}. Use same-plan rollback; backups retained.`);}
        }
        console.log(JSON.stringify(result,null,2));
      }else throw new Error("Use preview | status | apply | rollback; writes require --development --execute --authorize HASH");
    }
  }catch(error){console.error(error.message);process.exitCode=1;}
}
