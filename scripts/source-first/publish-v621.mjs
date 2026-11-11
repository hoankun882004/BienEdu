// Explicit user-requested publication of the verified V6.2 payload, with a
// separately recorded adoption of the user's additive start/dev commands.
// Ancestor manifests, hashes, backups and implementation remain immutable.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,mkdirSync,readdirSync,openSync,closeSync,fsyncSync,renameSync,unlinkSync,cpSync,mkdtempSync,symlinkSync,rmSync} from 'node:fs';
import {join,dirname,resolve,relative} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {buildNativeCD08} from './import-cd08-native.mjs';
import {root} from './build.mjs';
import {digest} from './model.mjs';
import {safe,read,json,immutable} from './release-chain-v61.mjs';
export const family='publish-v621';
const pointer='.audit/source-first-v5/release-v62/publication-v621.json';
const activation='assets/js/data/local-release.js';
const originalInventory='.audit/source-first-v5/release-v62/inventory.json';
const suiteNames=['verify','test:source-first','test:canonical','test:graphs','test:release','test:mobile','content:release:preview','content:release:status'];
const bytes=(base,file)=>readFileSync(safe(base,file));
export function directory(plan,base=root){assert.match(plan.planHash,/^[A-F0-9]{64}$/u);return safe(base,`.content-work/${family}/${plan.planHash}`);}
function signed(plan){const {planHash,...body}=plan;assert.equal(digest(body),planHash,'Publication manifest hash mismatch');assert.equal(plan.schemaVersion,'bienedu.publication.v6.2.1');assert.equal(plan.humanMathematicalApproval,false);}
function original(base=root){const i=read(originalInventory,base),p=read(i.manifest,base);const {planHash,...body}=p;assert.equal(digest(body),planHash);return p;}
export function preparePublication(){
  const staged=original(),results=read('.audit/source-first-v5/release-v62/verification-exits.json');
  assert.equal(results.planHash,staged.planHash);assert.equal(results.results.length,15);assert.ok(results.results.every(r=>r.exitCode===0));
  assert.equal(existsSync(join(root,'.content-work/release-v6/.lock')),false,'Existing release owns lock');
  const packageBefore=readFileSync(join(root,'package.json'),'utf8'),historicalPackage=JSON.parse(staged.files.find(f=>f.file==='package.json').before);
  const currentPackage=JSON.parse(packageBefore);
  const adopted={start:'node scripts/serve.mjs',dev:'node scripts/serve.mjs'};
  assert.deepEqual(currentPackage,{...historicalPackage,scripts:{...historicalPackage.scripts,...adopted}},'Only the independently observed additive start/dev change may be adopted');
  const entries=staged.files.map(f=>({...f}));
  for(const f of entries){if(f.file==='package.json')continue;assert.equal(digest(bytes(root,f.file)),f.beforeHash,`Unreviewed runtime change: ${f.file}`);}
  const nextPackage=JSON.parse(staged.files.find(f=>f.file==='package.json').after);
  Object.assign(nextPackage.scripts,adopted);
  for(const s of suiteNames)nextPackage.scripts[s]=`node scripts/source-first/publish-v621.mjs test ${s}`;
  const pkg=entries.find(f=>f.file==='package.json');pkg.before=packageBefore;pkg.after=json(nextPackage);
  const active=entries.find(f=>f.file===activation);
  const native=buildNativeCD08(),priorBundle=read(staged.bundle);
  assert.ok(native.groups.every(g=>!priorBundle.groups.some(old=>old.code===g.code)),'Native groups must not replace existing overlay groups');
  const combined={...priorBundle,groups:[...priorBundle.groups,...native.groups],sourceAdditions:[{...native.source,topics:['CD08'],counts:native.counts}]};
  const contentBytes=json(combined),contentHash=digest(contentBytes),contentFile=`assets/content/local-learning/${contentHash}.json`;immutable(join(root,contentFile),contentBytes);
  active.after=`// Explicit user-requested publication V6.2.1; original sources remain independent.\nexport const localRelease = ${JSON.stringify({bundle:contentFile,bundleHash:contentHash})};\n`;
  const ignored=readFileSync(join(root,'.vercelignore'),'utf8');assert.equal(ignored.split('scripts/source-first/').length,2,'Hosting exclusion changed; review explicitly');
  const runtime=['learner.mjs','registry.mjs','lesson-workspace.mjs'];
  const allowed='scripts/source-first/*\n!scripts/source-first/runtime-v62/\nscripts/source-first/runtime-v62/*\n'+runtime.map(n=>'!scripts/source-first/runtime-v62/'+n).join('\n');
  entries.splice(entries.length-1,0,{file:'.vercelignore',before:ignored,after:ignored.replace('scripts/source-first/',allowed)});
  const overlayFile='assets/js/data/learning-overlay.js',overlay=readFileSync(join(root,overlayFile),'utf8');
  assert.equal(digest(overlay),staged.dependencies.find(d=>d.file===overlayFile).hash,'Unreviewed overlay change');
  assert.equal(overlay.split('local&&(preview||localRelease)?').length,2);assert.equal(overlay.split('}).catch(()=>null):null;').length,2);
  entries.splice(entries.length-1,0,{file:overlayFile,before:overlay,after:overlay.replace('local&&(preview||localRelease)?',"(typeof location!=='undefined'&&(preview||localRelease))?").replace('}).catch(()=>null):null;','}).catch(error=>{if(preview)return null;throw error;}):null;')});
  const graphFile='assets/js/graph-loader.js',graph=readFileSync(join(root,graphFile),'utf8');
  assert.equal(digest(graph),staged.dependencies.find(d=>d.file===graphFile).hash,'Unreviewed graph loader change');assert.equal(graph.split('else if (local && releaseBundle)').length,2);
  entries.splice(entries.length-1,0,{file:graphFile,before:graph,after:graph.replace('else if (local && releaseBundle)','else if (releaseBundle)')});
  for(const name of ['learner','registry']){
    const file=`scripts/source-first/runtime-v62/${name}.mjs`,before=readFileSync(join(root,file),'utf8');assert.equal(digest(before),staged.dependencies.find(d=>d.file===file).hash);
    let after=before;
    if(name==='learner'){
      after=after.replace("(example?`Đề trang ${example.statementSourcePage} · Lời giải trang ${example.solutionSourcePage}. `:'')+", "(example?(group.source.sourceKind==='tex'?`Ví dụ nguồn ${example.sourceExampleNumber} · Đề dòng ${example.sourceLineRanges.statement.join('–')} · Giải dòng ${example.sourceLineRanges.solution.join('–')}. `:`Đề trang ${example.statementSourcePage} · Lời giải trang ${example.solutionSourcePage}. `):'')+");
      after=after.replace('note.append(detail);target.prepend(note);',"if(group.source.sourceKind==='tex')note.dataset.nativeSource='tex';\n  note.append(detail);target.prepend(note);");
    }else{
      after=after.replace('pages:e.sourcePages','pages:e.sourcePages,lines:e.sourceLines');
      after=after.replace("lines:[],section:code,sourceKind:'pdf'","lines:source.lines??[],section:code,sourceKind:source.sourceKind??'pdf'");
    }
    assert.notEqual(after,before);entries.splice(entries.length-1,0,{file,before,after});
  }
  const styles=entries.find(f=>f.file==='assets/learning-v6.css');styles.after+='\n.learning-workspace .example-card{grid-template-columns:minmax(0,1fr)}\n.source-edition-note,.source-edition-note details,.source-edition-note details>div{min-width:0;max-width:100%}\n.source-edition-note[data-native-source] details>div{white-space:pre-line;line-height:1.7}\n';
  const documentsFile='assets/js/data/documents-v6.js',documentsBefore=readFileSync(join(root,documentsFile),'utf8');assert.equal(digest(documentsBefore),staged.dependencies.find(d=>d.file===documentsFile).hash);
  const documentsAfter=documentsBefore.replace("import {overlayGroups}","import {overlayGroups,releaseBundle}")+`\nexport const nativeDocumentSources=Object.freeze([...base.nativeDocumentSources,...(releaseBundle?.sourceAdditions??[]).map(s=>({...s,id:s.sourceId,topicIds:s.topics,filePath:s.file,fileName:s.file.split('/').at(-1),sourceSha256:s.sha256,mimeType:'application/x-tex'}))]);\nexport function getDocumentsForTopic(id){const first=getDocumentForTopic(id);return [...(first?[first]:[]),...nativeDocumentSources.filter(s=>s.topicIds?.includes(id))];}\n`;
  entries.splice(entries.length-1,0,{file:documentsFile,before:documentsBefore,after:documentsAfter});
  for(const f of entries){f.beforeHash=digest(f.before);f.afterHash=digest(f.after);}
  const snapshots=read('.audit/source-first-v5/release-v62/protected-baseline.json');
  const targets=new Set(entries.map(f=>f.file));
  const dependencies=new Map([...staged.dependencies,...snapshots.hashes].filter(d=>!targets.has(d.file)).map(d=>[d.file,{file:d.file,hash:d.hash}]));
  for(const d of dependencies.values())assert.equal(digest(bytes(root,d.file)),d.hash,`Source/ancestor changed: ${d.file}`);
  for(const file of [read(originalInventory).manifest,'.audit/source-first-v5/release-v62/verification-exits.json','scripts/source-first/publish-v621.mjs','scripts/source-first/import-cd08-native.mjs','tests/publication-v621.test.mjs','scripts/serve.mjs','.gitattributes','.audit/publication-host-v621.mjs','.audit/native-cd08-browser.mjs',native.source.file,contentFile])dependencies.set(file,{file,hash:digest(bytes(root,file))});
  const body={schemaVersion:'bienedu.publication.v6.2.1',intent:'User explicitly requested updating website, git add, commit and push',humanMathematicalApproval:false,
    parent:staged.parent,verifiedStaging:{planHash:staged.planHash,bundle:staged.bundle,bundleHash:staged.bundleHash},
    adoptedOperationalChange:{file:'package.json',parentHash:staged.files.find(f=>f.file==='package.json').beforeHash,beforeHash:digest(packageBefore),addedScripts:adopted},
    publicationBundle:{file:contentFile,hash:contentHash},nativeSource:{...native.source,counts:native.counts,groupsHash:digest(native.groups)},
    files:entries,dependencies:[...dependencies.values()].sort((a,b)=>a.file.localeCompare(b.file)),counts:{...staged.summary,examined:staged.summary.examined+140,newExamples:staged.summary.newExamples+140,newSolutions:staged.summary.newSolutions+140,sourceStructureSupported:staged.summary.sourceStructureSupported+140,canonicalValidated:staged.summary.canonicalValidated+140,independentEditionKnowledgeContexts:staged.summary.independentEditionKnowledgeContexts+14,independentEditionMethodContexts:staged.summary.independentEditionMethodContexts+14,nativeExamples:140,historicalV62Candidates:861,registeredSources:10},atomicity:'Per-file only; activation last; rollback reverse'};
  const plan={...body,planHash:digest(body)},dir=directory(plan);immutable(join(dir,'manifest.json'),json(plan));
  for(const f of plan.files)immutable(join(dir,digest(f.file)+'.before'),f.before);
  writeFileSync(join(root,pointer),json({planHash:plan.planHash,manifest:`.content-work/${family}/${plan.planHash}/manifest.json`,contentPlanHash:staged.planHash,counts:plan.counts}));
  validatePublication(plan);return plan;
}
export function validatePublication(plan,base=root){
  signed(plan);const dir=directory(plan,base);assert.deepEqual(read(`.content-work/${family}/${plan.planHash}/manifest.json`,base),plan);
  const staged=original(base);assert.equal(staged.planHash,plan.verifiedStaging.planHash);assert.equal(staged.bundleHash,plan.verifiedStaging.bundleHash);
  assert.equal(digest(bytes(base,staged.bundle)),staged.bundleHash);
  const published=read(plan.publicationBundle.file,base),old=read(staged.bundle,base);assert.equal(digest(bytes(base,plan.publicationBundle.file)),plan.publicationBundle.hash);
  assert.deepEqual(published.groups.slice(0,old.groups.length),old.groups);assert.deepEqual(published.corrections,old.corrections);assert.deepEqual(published.graphs,old.graphs);
  assert.equal(digest(published.groups.slice(old.groups.length)),plan.nativeSource.groupsHash);assert.equal(digest(bytes(base,plan.nativeSource.file)),plan.nativeSource.sha256);
  assert.deepEqual(plan.parent,staged.parent);assert.equal(plan.files.length,15);assert.equal(plan.files.at(-1).file,activation);assert.equal(new Set(plan.files.map(f=>f.file)).size,15);
  const permitted=new Set([...staged.files.map(f=>f.file),'.vercelignore','assets/js/data/learning-overlay.js','assets/js/graph-loader.js','assets/js/data/documents-v6.js','scripts/source-first/runtime-v62/learner.mjs','scripts/source-first/runtime-v62/registry.mjs']);
  for(const f of plan.files){assert.ok(permitted.has(f.file));assert.equal(digest(f.before),f.beforeHash);assert.equal(digest(f.after),f.afterHash);
    assert.equal(readFileSync(join(dir,digest(f.file)+'.before'),'utf8'),f.before,'Corrupt rollback evidence');
    assert.ok([f.beforeHash,f.afterHash].includes(digest(bytes(base,f.file))),`Unknown target bytes: ${f.file}`);
    if(!['package.json','.vercelignore',activation,'assets/learning-v6.css','assets/js/data/documents-v6.js','scripts/source-first/runtime-v62/learner.mjs','scripts/source-first/runtime-v62/registry.mjs','assets/js/data/learning-overlay.js','assets/js/graph-loader.js'].includes(f.file))assert.deepEqual(f,staged.files.find(s=>s.file===f.file));
  }
  const oldPackage=JSON.parse(staged.files.find(f=>f.file==='package.json').before),pkg=plan.files.find(f=>f.file==='package.json');
  assert.deepEqual(JSON.parse(pkg.before),{...oldPackage,scripts:{...oldPackage.scripts,...plan.adoptedOperationalChange.addedScripts}});
  assert.deepEqual(plan.adoptedOperationalChange.addedScripts,{start:'node scripts/serve.mjs',dev:'node scripts/serve.mjs'});
  assert.equal(plan.adoptedOperationalChange.beforeHash,pkg.beforeHash);
  const overlay=plan.files.find(f=>f.file==='assets/js/data/learning-overlay.js');
  assert.equal(overlay.beforeHash,staged.dependencies.find(d=>d.file===overlay.file).hash);
  assert.equal(overlay.after,overlay.before.replace('local&&(preview||localRelease)?',"(typeof location!=='undefined'&&(preview||localRelease))?").replace('}).catch(()=>null):null;','}).catch(error=>{if(preview)return null;throw error;}):null;'));
  const graph=plan.files.find(f=>f.file==='assets/js/graph-loader.js');assert.equal(graph.beforeHash,staged.dependencies.find(d=>d.file===graph.file).hash);assert.equal(graph.after,graph.before.replace('else if (local && releaseBundle)','else if (releaseBundle)'));
  for(const d of plan.dependencies)assert.equal(digest(bytes(base,d.file)),d.hash,`Stale publication dependency: ${d.file}`);
  return dir;
}
export function publicationStatus(plan,base=root){validatePublication(plan,base);const states=plan.files.map(f=>({file:f.file,state:digest(bytes(base,f.file))===f.afterHash?'after':'before'}));return {planHash:plan.planHash,status:states.every(s=>s.state==='after')?'ACTIVE':states.every(s=>s.state==='before')?'PREPARED':'PARTIAL',states};}
export function applyPublication(plan,{base=root,authorize,execute=false,rollback=false,afterFile}={}){
  const dir=validatePublication(plan,base);if(!execute)return {dryRun:true,writes:0};assert.equal(authorize,plan.planHash,'Fresh publication authorization required');
  const lock=safe(base,'.content-work/release-v6/.lock');mkdirSync(dirname(lock),{recursive:true});const fd=openSync(lock,'wx');
  writeFileSync(fd,json({pid:process.pid,planHash:plan.planHash,family}));let writes=0;
  const event=(kind,data={})=>immutable(join(dir,`${Date.now()}-${Math.random().toString(16).slice(2)}-${kind}.json`),json({action:rollback?'rollback':'apply',planHash:plan.planHash,...data}));
  try{validatePublication(plan,base);event('intent');
    for(const [i,f]of (rollback?[...plan.files].reverse():plan.files).entries()){
      const target=safe(base,f.file),wanted=rollback?f.beforeHash:f.afterHash,expected=rollback?f.afterHash:f.beforeHash,current=digest(bytes(base,f.file));if(current===wanted)continue;assert.equal(current,expected,'Concurrent target edit');
      const temporary=join(dirname(target),`.publish-v621-${plan.planHash.slice(0,12)}.tmp`);
      if(existsSync(temporary))assert.equal(digest(readFileSync(temporary)),wanted,'Unknown interrupted temporary file');
      else{const out=openSync(temporary,'wx');try{writeFileSync(out,rollback?f.before:f.after);fsyncSync(out);}finally{closeSync(out);}}
      assert.equal(digest(bytes(base,f.file)),expected);renameSync(temporary,target);writes++;event('file',{file:f.file});afterFile?.(f,i);
    }event('complete',{writes});return {...publicationStatus(plan,base),writes};
  }catch(e){event('interrupted',{writes,error:e.message});throw e;}finally{closeSync(fd);unlinkSync(lock);}
}
export async function runPublishedSuite(plan,suite){
  assert.ok(suiteNames.includes(suite));const state=publicationStatus(plan);assert.equal(state.status,'ACTIVE');
  if(suite==='content:release:status'||suite==='content:release:preview'){console.log(json(state));return 0;}
  const base=mkdtempSync(join(tmpdir(),'bienedu-publication-'));
  try{
    for(const n of readdirSync(root))if(/\.(?:html|md|json)$/iu.test(n)&&!n.startsWith('.'))cpSync(join(root,n),join(base,n));
    for(const n of ['assets','scripts','tests','docs','backups','content','39 chuyên đề','file tài liệu latex'])cpSync(join(root,n),join(base,n),{recursive:true});
    cpSync(join(root,'.audit'),join(base,'.audit'),{recursive:true,filter:f=>! /\.(?:png|jpe?g|webp|log)$/iu.test(f)&&!f.replaceAll('\\','/').includes('/legacy')});
    for(const n of ['source-first-v5','graphs-v5.8','release-v6','release-v61','release-v62'])cpSync(join(root,'.content-work',n),join(base,'.content-work',n),{recursive:true,filter:f=>!f.includes('sympy-env')});
    const helper='.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';mkdirSync(dirname(join(base,helper)),{recursive:true});cpSync(join(root,helper),join(base,helper));
    symlinkSync(join(root,'node_modules'),join(base,'node_modules'),'junction');symlinkSync(join(root,'.content-work/source-first-v5/sympy-env'),join(base,'.content-work/source-first-v5/sympy-env'),'junction');mkdirSync(join(base,'.git'));
    for(const f of plan.files)writeFileSync(join(base,f.file),f.before);
    for(const f of original().files)writeFileSync(join(base,f.file),f.before);
    console.log('Unchanged historical assertions run in a disposable authenticated pre-publication fixture; the published website is not rolled back.');
    return await new Promise(done=>{const child=spawn('cmd.exe',['/d','/c',`node scripts/source-first/compat-suites-v62.mjs ${suite}`],{cwd:base,windowsHide:true,stdio:'inherit'});child.once('error',()=>done(1));child.once('exit',c=>done(c??1));});
  }finally{
    const rel=relative(resolve(tmpdir()),resolve(base));assert.ok(rel&&!rel.startsWith('..')&&resolve(base)!==resolve(root));
    for(const file of [join(base,'node_modules'),join(base,'.content-work/source-first-v5/sympy-env')])if(existsSync(file))rmSync(file,{recursive:false});rmSync(base,{recursive:true,force:true});
    assert.equal(publicationStatus(plan).status,'ACTIVE');
  }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const command=process.argv[2]??'status';
  if(command==='prepare')console.log(json({planHash:preparePublication().planHash,pointer}));
  else{const index=read(pointer),plan=read(index.manifest);
    if(command==='status')console.log(json(publicationStatus(plan)));
    else if(command==='test')process.exitCode=await runPublishedSuite(plan,process.argv[3]);
    else if(['apply','rollback'].includes(command)){const args=process.argv.slice(3);console.log(json(applyPublication(plan,{authorize:args[args.indexOf('--authorize')+1],execute:args.includes('--execute'),rollback:command==='rollback'})));}
    else throw Error('Use prepare | status | test SUITE | apply/rollback --authorize HASH --execute');
  }
}
