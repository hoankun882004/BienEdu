import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {root} from './build.mjs';
import {digest} from './model.mjs';
import {activeBaseline,read,json} from './release-chain-v61.mjs';
export const directory='.audit/source-first-v5/release-v62';
const walk=p=>readdirSync(join(root,p),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(`${p}/${e.name}`):[`${p}/${e.name}`]);
export function protectBaseline(){
  const file=join(root,directory,'protected-baseline.json');
  if(existsSync(file)){const r=read(`${directory}/protected-baseline.json`);assertProtected(r);return r;}
  const {state,parent}=activeBaseline();
  const v61=read('.audit/source-first-v5/release-v61/inventory.json');
  const files=new Set([...parent.dependencies.map(d=>d.file),...parent.files.map(f=>f.file),
    ...walk('.content-work/release-v6'),...walk('.content-work/release-v61'),
    ...walk('.content-work/source-first-v5/dev-plans'),...walk('.content-work/source-first-v5/dev-experiments'),
    '.audit/source-first-v5/release-v61/content.json','.audit/source-first-v5/release-v61/content-evidence.json',
    '.audit/source-first-v5/release-v61/inventory.json','.audit/source-first-v5/release-v61/final-report.json']);
  const snapshot={actualState:state,parentManifest:parent.planHash,v61PreparedHash:v61.planHash,
    v61State:state.planHash===v61.planHash?'ACTIVE':'PREPARED_NOT_ACTIVE',
    hashes:[...files].sort().map(file=>({file,hash:digest(readFileSync(join(root,file)))}))};
  mkdirSync(join(root,directory),{recursive:true});writeFileSync(file,json(snapshot));return snapshot;
}
export function assertProtected(snapshot=read(`${directory}/protected-baseline.json`)){
  for(const {file,hash}of snapshot.hashes)assert.equal(digest(readFileSync(join(root,file))),hash,`Protected ancestor/source changed: ${file}`);
  assert.equal(existsSync(join(root,'.content-work/release-v6/.lock')),false,'Release lock changed');
  return snapshot.hashes.length;
}
if(process.argv[1]?.endsWith('baseline-v62.mjs'))console.log(json(protectBaseline().actualState));
