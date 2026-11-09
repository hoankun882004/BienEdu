// Historical mutation tests run against immutable BEFORE bytes in isolated
// fixtures, never by rolling back the user's already-applied development data.
import { readFileSync,writeFileSync } from "node:fs";
import { join,relative,resolve } from "node:path";
import { root,work } from "../../scripts/source-first/build.mjs";
import { digest } from "../../scripts/source-first/model.mjs";
import { classifyRuntimeMappings } from "../../scripts/source-first/runtime-mappings.mjs";

export const parentPlan=JSON.parse(readFileSync(join(root,".audit/source-first-v5/development-preview-v5.5.json"),"utf8")).plan;
export function historicalMappings(items) {
  const corrections=JSON.parse(readFileSync(join(root,"scripts/source-first/corrections-v53.json"),"utf8")).corrections;
  return classifyRuntimeMappings(items).map((row)=>{
    const usages=row.usages.map((usage)=>{
      const change=parentPlan.files.flatMap((file)=>file.changes).find((change)=>change.binding.targetId===usage.targetId);
      if(!change)return usage;
      return {...usage,before:change.before,after:change.after,beforeHash:digest(change.before),recordHash:change.binding.recordHash,
        contentVersion:change.binding.contentVersion,changed:true,conditionContext:change.recordId==="knowledge:14.1"?change.before:null,
        correctionId:change.correctionId,correctionSource:corrections.find((entry)=>entry.id===change.correctionId)};
    });
    return {...row,usages,proposedChanges:usages.filter((usage)=>usage.changed)};
  });
}
export function restoreHistoricalFixture(directory) {
  const rel=relative(resolve(work),resolve(directory));
  if(!rel || rel.startsWith(".."))throw new Error("Historical restoration is fixture-only");
  for(const file of parentPlan.files) {
    const saved=JSON.parse(readFileSync(join(work,"dev-plans",parentPlan.planHash,`${digest(file.file)}.json`),"utf8"));
    if(digest(saved.before)!==file.beforeHash || digest(saved.after)!==file.afterHash)throw new Error("Historical backup mismatch");
    writeFileSync(join(directory,file.file),saved.before);
  }
}
