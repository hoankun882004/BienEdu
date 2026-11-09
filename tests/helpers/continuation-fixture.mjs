import { readFileSync,copyFileSync,cpSync,mkdirSync,mkdtempSync,rmSync } from "node:fs";
import { join,dirname,resolve,relative } from "node:path";
import { root,work } from "../../scripts/source-first/build.mjs";
import { previewFile } from "../../scripts/source-first/development-continuation.mjs";
import { digest } from "../../scripts/source-first/model.mjs";

export function continuationFixture() {
  const plan=JSON.parse(readFileSync(join(root,previewFile),"utf8")).plan;
  const directory=mkdtempSync(join(work,"test-v56-")),reviewWork=join(directory,".content-work/source-first-v5");
  cpSync(join(root,"assets/js/data"),join(directory,"assets/js/data"),{recursive:true});
  const parentFile=`.content-work/source-first-v5/dev-plans/${plan.parentPlanHash}/manifest.json`;
  for(const file of new Set([...plan.dependencies.map((entry)=>entry.file),...plan.sources.map((entry)=>entry.file),...plan.parentFiles.map((entry)=>entry.file),parentFile])) {
    const target=join(directory,file);mkdirSync(dirname(target),{recursive:true});copyFileSync(join(root,file),target);
  }
  const targetDirectory=join(reviewWork,"dev-plans",plan.planHash);mkdirSync(targetDirectory,{recursive:true});
  for(const file of ["manifest.json",...plan.files.map((entry)=>`${digest(entry.file)}.json`)])copyFileSync(join(work,"dev-plans",plan.planHash,file),join(targetDirectory,file));
  mkdirSync(join(directory,".git"));
  return {root:directory,work:reviewWork,plan,cleanup:()=>{const rel=relative(resolve(work),resolve(directory));if(!rel||rel.startsWith(".."))throw new Error("Unsafe fixture cleanup");rmSync(directory,{recursive:true,force:true});}};
}
