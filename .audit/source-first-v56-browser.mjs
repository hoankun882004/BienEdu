import assert from "node:assert/strict";
import { readFileSync,writeFileSync } from "node:fs";
import { join } from "node:path";
import { root } from "../scripts/source-first/build.mjs";
import { digest } from "../scripts/source-first/model.mjs";
import { continuationFixture } from "../tests/helpers/continuation-fixture.mjs";
import { applyContinuation } from "../scripts/source-first/development-continuation.mjs";
import { checkBatchBrowser } from "../scripts/source-first/batch-browser-check.mjs";
import { checkDevelopmentBrowser } from "../scripts/source-first/dev-browser-check.mjs";

const fixture=continuationFixture(),plan=fixture.plan,output=join(root,".audit/source-first-v5");
const baseline=plan.parentFiles.map((entry)=>({file:entry.file,hash:digest(readFileSync(join(root,entry.file)))}));
const options={...fixture,execute:true,development:true,authorize:plan.planHash,env:{}};
try {
  const before=await checkBatchBrowser(fixture.root,plan,{output,phase:"before"});
  assert.equal(applyContinuation(plan,options).runtimeWrites,1);
  const after=await checkBatchBrowser(fixture.root,plan,{output,phase:"after"});
  // Parent examples and knowledge condition remain correct in the actual
  // child files; same helper used by the authorized V5.5 local command.
  const parent=JSON.parse(readFileSync(join(root,".audit/source-first-v5/development-preview-v5.5.json"),"utf8")).plan;
  const inherited=await checkDevelopmentBrowser(fixture.root,parent,output);
  assert.equal(applyContinuation(plan,{...options,rollback:true}).runtimeWrites,1);
  for(const entry of plan.parentFiles)assert.equal(digest(readFileSync(join(fixture.root,entry.file))),entry.afterHash);
  for(const entry of baseline)assert.equal(digest(readFileSync(join(root,entry.file))),entry.hash);
  const report={passed:true,planHash:plan.planHash,before,after,parentPreserved:inherited,isolatedRuntimeWrites:2,realRuntimeWrites:0,formalHumanApprovalsCreated:0};
  writeFileSync(join(output,"browser-v5.6.json"),JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify({passed:true,states:before.states.length+after.states.length,parentStates:inherited.states.length,realRuntimeWrites:0}));
}finally{fixture.cleanup();}
