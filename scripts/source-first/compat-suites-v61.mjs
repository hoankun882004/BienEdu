// Historical suites intentionally assert the V5.5-applied / V5.6-prepared
// benchmark. Run that exact cohort in a disposable copy, not by rolling back
// the user's active V6.0. V6.1 learner checks run separately on the actual plan.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,cpSync,symlinkSync,readdirSync,rmSync,existsSync} from 'node:fs';
import {join,resolve,relative,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';
import {root} from './build.mjs';
import {activeBaseline,read,json} from './release-chain-v61.mjs';
const legacy={
  'content:release:preview':'node scripts/source-first/release-v6.mjs preview',
  verify:'npm run check && npm run content:scan && npm run content:validate && npm run content:math:audit && npm run content:source:build && npm run content:graphs:preview && npm run content:release:preview && npm test && npm run content:source:verify && npm run content:source:prepare && npm run test:latex && npm run test:latex-pilot && npm run test:v5 && npm run test:source-review && npm run test:v13 && npm run test:v15 && npm run test:v4 && npm run test:v16 && npm run test:v16-1 && npm run test:home-scroll && npm run test:polish',
  'test:source-first':'node --test --test-concurrency=1 tests/source-first.test.js tests/source-verification-v51.test.js tests/source-review-v52.test.js tests/source-integration-v53.test.js tests/source-release-v54.test.js tests/source-development-v55.test.js tests/source-fraction-v56.test.js && node .audit/source-first-v5-browser.mjs && node .audit/runtime-integration-v53.mjs && node .audit/source-first-v54-browser.mjs && node .audit/source-first-v55-browser.mjs && node .audit/source-first-v56-browser.mjs',
  'test:canonical':'npm run content:canonical:preview && node --test tests/canonical-math-v57.test.js && node .audit/canonical-v57-browser.mjs && node .audit/canonical-v57-dom.mjs',
  'test:graphs':'npm run content:graphs:preview && node --test tests/graph-engine-v58.test.js && node .audit/graph-v58-browser.mjs',
  'test:release':'npm run content:release:preview && node --test tests/release-v6.test.js && node .audit/v6-release-browser.mjs',
  'test:mobile':'node .audit/v6-mobile.mjs'
};
const suite=process.argv[2];assert.ok(Object.hasOwn(legacy,suite),'Known suite name required');
const execute=(command,cwd,env=process.env)=>new Promise((done)=>{const child=spawn('cmd.exe',['/d','/c',command],{cwd,env,windowsHide:true,stdio:'inherit'});child.once('error',()=>done(-1));child.once('exit',(code)=>done(code??-1));});
if(process.env.BIENEDU_LEGACY_FIXTURE==='1'){
  const marker=read('.audit/test-baseline-v61.json');assert.equal(marker.mode,'isolated-historical-benchmark');assert.notEqual(resolve(marker.originRoot),resolve(root));
  process.exitCode=await execute(legacy[suite],root);
}else if(suite==='content:release:preview'){
  process.exitCode=await execute('node scripts/source-first/release-v61.mjs preview',root);
}else{
  activeBaseline();
  const base=mkdtempSync(join(tmpdir(),'bienedu-legacy-v61-'));
  try{
    for(const name of readdirSync(root))if(/\.(?:html|md|json)$/iu.test(name)&&!name.startsWith('.'))cpSync(join(root,name),join(base,name));
    for(const name of ['assets','scripts','tests','docs','backups','content','39 chuyên đề','file tài liệu latex'])cpSync(join(root,name),join(base,name),{recursive:true});
    // Existing onboarding/home/polish suites import this local CDP helper.
    const cdp='.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';mkdirSync(dirname(join(base,cdp)),{recursive:true});cpSync(join(root,cdp),join(base,cdp));
    cpSync(join(root,'.audit'),join(base,'.audit'),{recursive:true,filter:(file)=>! /\.(?:png|jpe?g|webp|log)$/iu.test(file)&&!file.replaceAll('\\','/').includes('/release-v61/legacy')});
    for(const name of ['source-first-v5','graphs-v5.8','release-v6','release-v61'])if(existsSync(join(root,'.content-work',name)))cpSync(join(root,'.content-work',name),join(base,'.content-work',name),{recursive:true,filter:(file)=>!file.includes('sympy-env')});
    symlinkSync(join(root,'.content-work/source-first-v5/sympy-env'),join(base,'.content-work/source-first-v5/sympy-env'),'junction');
    symlinkSync(join(root,'node_modules'),join(base,'node_modules'),'junction');mkdirSync(join(base,'.git'));
    const baselineReport=read('.audit/source-first-v5/release-v6/inventory.json'),baseline=read(baselineReport.manifest);
    for(const file of baseline.files)writeFileSync(join(base,file.file),file.before);
    writeFileSync(join(base,'.audit/test-baseline-v61.json'),json({mode:'isolated-historical-benchmark',originRoot:root,parentV6:baseline.planHash,realRuntimeWrites:0}));
    console.log(`[V6.1] ${suite}: unchanged historical assertions run in disposable V5.5 benchmark; active V6.0 is not rolled back.`);
    const code=await execute(legacy[suite],base,{...process.env,BIENEDU_LEGACY_FIXTURE:'1'});
    const archive=join(root,'.audit/source-first-v5/release-v61/legacy',suite.replaceAll(':','-'));mkdirSync(archive,{recursive:true});
    cpSync(join(base,'.audit/source-first-v5'),join(archive,'source-first-v5'),{recursive:true,filter:(file)=>!file.includes('release-v61')&&!file.endsWith('.log')});
    writeFileSync(join(archive,'result.json'),json({suite,exitCode:code,baseline:'V5.5 applied; V5.6/V6.0 prepared',scope:'Disposable historical benchmark; actual V6.1 integration is tested separately',realRuntimeWrites:0}));
    process.exitCode=code;
    if(code===0){
      const additional=suite==='test:release'?'node --test tests/content-v61.test.js && node .audit/v61-browser.mjs':suite==='test:mobile'?'node .audit/v61-browser.mjs --mobile':suite==='test:graphs'?'node .audit/v61-browser.mjs --graphs':null;
      if(additional)process.exitCode=await execute(additional,root);
    }
  }finally{
    const rel=relative(resolve(tmpdir()),resolve(base));assert.ok(rel&&!rel.startsWith('..')&&resolve(base)!==resolve(root));
    // Junctions are unlinked, never traversed recursively into shared installs.
    for(const path of [join(base,'node_modules'),join(base,'.content-work/source-first-v5/sympy-env')])if(existsSync(path))rmSync(path,{recursive:false});
    rmSync(base,{recursive:true,force:true});
  }
}
