// Version-aware entry point. Historical assertions remain unchanged and run
// against their declared V5.5 baseline, not against forged active-site state.
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync,mkdtempSync,cpSync,symlinkSync,readdirSync,rmSync,existsSync} from 'node:fs';
import {join,resolve,relative,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {root} from './build.mjs';
import {read,json} from './release-chain-v61.mjs';
import {releaseStatusV62,validatePlan,prepareV62,assertReleasePreserved,output} from './release-v62.mjs';
const suite=process.argv[2],suites=['verify','test:source-first','test:canonical','test:graphs','test:release','test:mobile'];
assert.ok([...suites,'probe:historical-parent','content:release:preview','content:release:status'].includes(suite));
const run=(command,cwd,env=process.env)=>new Promise(done=>{const child=spawn('cmd.exe',['/d','/c',command],{cwd,env,windowsHide:true,stdio:'inherit'});child.once('error',()=>done(-1));child.once('exit',code=>done(code??-1));});
if(process.env.BIENEDU_LEGACY_FIXTURE==='1'){
  // The unchanged V6.1 runner validates the explicit disposable marker.
  process.exitCode=await run(`node scripts/source-first/compat-suites-v61.mjs ${suite}`,root);
}else if(suite==='content:release:status')console.log(json(releaseStatusV62()));
else if(suite==='content:release:preview'){
  const current=releaseStatusV62();console.log(json(current.family==='release-v62'&&current.status==='ACTIVE'?{...read(`${output}/inventory.json`),actualRuntime:current}:prepareV62()));
}else{
  const report=read(`${output}/inventory.json`),plan=read(report.manifest);validatePlan(plan);assertReleasePreserved(plan);
  const base=mkdtempSync(join(tmpdir(),'bienedu-v62-legacy-'));
  try{
    for(const name of readdirSync(root))if(/\.(?:html|md|json)$/iu.test(name)&&!name.startsWith('.'))cpSync(join(root,name),join(base,name));
    for(const name of ['assets','scripts','tests','docs','backups','content','39 chuyên đề','file tài liệu latex'])cpSync(join(root,name),join(base,name),{recursive:true});
    const helper='.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';mkdirSync(dirname(join(base,helper)),{recursive:true});cpSync(join(root,helper),join(base,helper));
    cpSync(join(root,'.audit'),join(base,'.audit'),{recursive:true,filter:file=>! /\.(?:png|jpe?g|webp|log)$/iu.test(file)&&!file.replaceAll('\\','/').includes('/legacy')});
    for(const name of ['source-first-v5','graphs-v5.8','release-v6','release-v61','release-v62'])if(existsSync(join(root,'.content-work',name)))cpSync(join(root,'.content-work',name),join(base,'.content-work',name),{recursive:true,filter:file=>!file.includes('sympy-env')});
    symlinkSync(join(root,'.content-work/source-first-v5/sympy-env'),join(base,'.content-work/source-first-v5/sympy-env'),'junction');symlinkSync(join(root,'node_modules'),join(base,'node_modules'),'junction');mkdirSync(join(base,'.git'));
    // First restore only this child's declared before-bytes in the COPY.
    for(const f of plan.files)writeFileSync(join(base,f.file),f.before);
    const legacy=read('.audit/source-first-v5/release-v6/inventory.json'),baseline=read(legacy.manifest);
    for(const f of baseline.files)writeFileSync(join(base,f.file),f.before);
    writeFileSync(join(base,'.audit/test-baseline-v61.json'),json({mode:'isolated-historical-benchmark',originRoot:root,parentV6:baseline.planHash,realRuntimeWrites:0}));
    console.log(`[V6.2] ${suite}: unchanged historical assertions in isolated V5.5 benchmark; real active release is untouched.`);
    const preload=pathToFileURL(join(base,'tests/helpers/register-historical-v62.mjs')).href;
    const command=suite==='probe:historical-parent'?'node scripts/source-first/release-v6.mjs preview && node --test tests/content-v61.test.js':`npm.cmd run ${suite}`;
    const code=await run(command,base,{...process.env,BIENEDU_LEGACY_FIXTURE:'1',NODE_OPTIONS:`${process.env.NODE_OPTIONS??''} --import=${preload}`.trim()});process.exitCode=code;
    const archive=join(root,output,'legacy-v62',suite.replaceAll(':','-'));mkdirSync(archive,{recursive:true});
    cpSync(join(base,'.audit/source-first-v5'),join(archive,'source-first-v5'),{recursive:true,filter:file=>!file.includes('release-v62')&&!file.includes('release-v61\\legacy')&&!file.endsWith('.log')});
    writeFileSync(join(archive,'result.json'),json({suite,exitCode:code,scope:'Unchanged historical V5.5 baseline in a disposable copy',actualRelease:releaseStatusV62(),realRuntimeWrites:0}));
    if(code===0){const additional=suite==='test:release'?'node --test tests/content-v62.test.mjs && node .audit/v62-browser.mjs':suite==='test:mobile'?'node .audit/v62-browser.mjs --mobile':suite==='test:graphs'?'node .audit/v62-browser.mjs --graphs':null;if(additional)process.exitCode=await run(additional,root);}
    assertReleasePreserved(plan);
  }finally{
    const rel=relative(resolve(tmpdir()),resolve(base));assert.ok(rel&&!rel.startsWith('..')&&resolve(base)!==resolve(root));
    for(const path of [join(base,'node_modules'),join(base,'.content-work/source-first-v5/sympy-env')])if(existsSync(path))rmSync(path,{recursive:false});rmSync(base,{recursive:true,force:true});
  }
}
