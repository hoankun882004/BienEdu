// Records this local-only loader fix as a child; never rewrites prior manifests,
// authorizations, mathematical payloads or student progress.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {root} from './build.mjs';
import {digest} from './model.mjs';
import {read,json,immutable} from './release-chain-v61.mjs';
export function recordLocalPdfVisibility(){
  const reference=read('.audit/source-first-v5/release-v62/publication-v621.json'),parent=read(reference.manifest);
  const {planHash,...parentBody}=parent;assert.equal(digest(parentBody),planHash);
  const target=parent.files.find(f=>f.file==='assets/js/data/learning-overlay.js');assert.ok(target);
  const before=target.after;
  const old="if(query?.has('releasePreview'))sessionStorage.setItem('bienedu:local-preview:v6',query.get('releasePreview')==='v6'?'on':'off');\nexport const previewActive=local&&sessionStorage.getItem('bienedu:local-preview:v6')==='on';";
  const next="// Once content is activated, stale preview sessions/bookmarks must not hide it.\nif(local&&localRelease)sessionStorage.removeItem('bienedu:local-preview:v6');\nelse if(query?.has('releasePreview'))sessionStorage.setItem('bienedu:local-preview:v6',query.get('releasePreview')==='v6'?'on':'off');\nexport const previewActive=local&&!localRelease&&sessionStorage.getItem('bienedu:local-preview:v6')==='on';";
  assert.equal(before.split(old).length,2);const after=before.replace(old,next);
  const current=digest(readFileSync(join(root,target.file)));assert.ok([digest(before),digest(after)].includes(current),'Unrecognized loader edit');
  for(const f of parent.files)if(f.file!==target.file)assert.equal(digest(readFileSync(join(root,f.file))),f.afterHash,`Other publication target changed: ${f.file}`);
  for(const d of parent.dependencies)assert.equal(digest(readFileSync(join(root,d.file))),d.hash,`Parent source/dependency changed: ${d.file}`);
  const body={schemaVersion:'bienedu.local-pdf-visibility.v1',scope:'local-only; no commit/push/deploy',parentPublication:{planHash,manifest:reference.manifest,manifestHash:digest(parent)},
    file:target.file,beforeHash:digest(before),afterHash:digest(after),contentHash:parent.publicationBundle.hash,
    mathematicalPayloadChanged:false,progressKeysChanged:false,reason:'Activated content takes precedence over stale V6.0 preview sessions and bookmarks'};
  const plan={...body,planHash:digest(body)},directory=join(root,'.content-work/local-pdf-visibility',plan.planHash);
  immutable(join(directory,'manifest.json'),json(plan));immutable(join(directory,'learning-overlay.before.js'),before);
  const folder=join(root,'.audit/local-pdf-visibility');mkdirSync(folder,{recursive:true});
  const result={...plan,status:current===plan.afterHash?'APPLIED_LOCAL_ONLY':'PREPARED',backup:`.content-work/local-pdf-visibility/${plan.planHash}/learning-overlay.before.js`,
    priorAuthorization:'Preserved, not reusable over this child fix; prepare a fresh release before a future publication'};
  writeFileSync(join(folder,'receipt.json'),json(result));return result;
}
if(process.argv[1]?.endsWith('local-pdf-visibility.mjs'))console.log(json(recordLocalPdfVisibility()));
