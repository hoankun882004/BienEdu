import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,copyFileSync,rmSync,readdirSync} from 'node:fs';
import {join,dirname,resolve,relative} from 'node:path';
import {tmpdir} from 'node:os';
import {root} from '../../scripts/source-first/build.mjs';
import {digest} from '../../scripts/source-first/model.mjs';
export function releaseFixture(plan){
  const base=mkdtempSync(join(tmpdir(),'bienedu-v61-fixture-'));
  const parentFile=`.content-work/${plan.parent.family}/${plan.parent.planHash}/manifest.json`,parent=JSON.parse(readFileSync(join(root,parentFile),'utf8'));
  const manifest=`.content-work/release-v61/${plan.planHash}/manifest.json`;
  const files=[...plan.dependencies.map((d)=>d.file),...plan.files.map((d)=>d.file),...parent.dependencies.map((d)=>d.file),...parent.files.map((d)=>d.file),manifest,parentFile,'.audit/source-first-v5/release-v6/inventory.json',
    ...plan.files.map((f)=>`.content-work/release-v61/${plan.planHash}/${digest(f.file)}.before`),
    ...parent.files.map((f)=>`.content-work/${plan.parent.family}/${plan.parent.planHash}/${digest(f.file)}.before`)];
  for(const file of new Set(files)){const to=join(base,file);mkdirSync(dirname(to),{recursive:true});copyFileSync(join(root,file),to);}
  for(const name of readdirSync(join(root,dirname(parentFile))))if(name.endsWith('.json'))copyFileSync(join(root,dirname(parentFile),name),join(base,dirname(parentFile),name));
  // Construct the explicitly declared baseline in the disposable fixture, even
  // when this helper runs inside an older benchmark workspace.
  for(const f of parent.files)writeFileSync(join(base,f.file),f.after);
  for(const f of plan.files)writeFileSync(join(base,f.file),f.before);
  mkdirSync(join(base,'.git'));
  return {base,parent,cleanup:()=>{const rel=relative(resolve(tmpdir()),resolve(base));assert.ok(rel&&!rel.startsWith('..')&&base!==root);rmSync(base,{recursive:true,force:true});}};
}
