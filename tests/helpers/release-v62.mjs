import assert from 'node:assert/strict';
import {readFileSync,copyFileSync,writeFileSync,mkdtempSync,mkdirSync,readdirSync,rmSync} from 'node:fs';
import {join,dirname,resolve,relative} from 'node:path';
import {tmpdir} from 'node:os';
import {root} from '../../scripts/source-first/build.mjs';
import {digest} from '../../scripts/source-first/model.mjs';
export function fixtureV62(plan){
  const base=mkdtempSync(join(tmpdir(),'bienedu-v62-')),parentFile=`.content-work/${plan.parent.family}/${plan.parent.planHash}/manifest.json`;
  const parent=JSON.parse(readFileSync(join(root,parentFile),'utf8'));
  const files=new Set([...plan.dependencies.map(d=>d.file),...plan.files.map(f=>f.file),...parent.dependencies.map(d=>d.file),...parent.files.map(f=>f.file),
    `.content-work/release-v62/${plan.planHash}/manifest.json`,parentFile,
    ...plan.files.map(f=>`.content-work/release-v62/${plan.planHash}/${digest(f.file)}.before`),
    ...parent.files.map(f=>`.content-work/${plan.parent.family}/${parent.planHash}/${digest(f.file)}.before`)]);
  for(const file of files){const to=join(base,file);mkdirSync(dirname(to),{recursive:true});copyFileSync(join(root,file),to);}
  for(const n of readdirSync(join(root,dirname(parentFile))))if(n.endsWith('.json'))copyFileSync(join(root,dirname(parentFile),n),join(base,dirname(parentFile),n));
  // The fixture explicitly starts at the declared parent, independently of
  // historical benchmark suites or the real site's eventual activation.
  for(const f of parent.files)writeFileSync(join(base,f.file),f.after);
  for(const f of plan.files)writeFileSync(join(base,f.file),f.before);
  mkdirSync(join(base,'.git'));
  return {base,parent,cleanup:()=>{const rel=relative(resolve(tmpdir()),resolve(base));assert.ok(rel&&!rel.startsWith('..')&&base!==root);rmSync(base,{recursive:true,force:true});}};
}
