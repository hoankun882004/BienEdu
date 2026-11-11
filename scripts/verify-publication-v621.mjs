import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,openSync,closeSync} from 'node:fs';
import {join} from 'node:path';
import {root} from './source-first/build.mjs';
import {read,json} from './source-first/release-chain-v61.mjs';
import {digest} from './source-first/model.mjs';
import {publicationStatus,validatePublication} from './source-first/publish-v621.mjs';
const pointer=read('.audit/source-first-v5/release-v62/publication-v621.json'),plan=read(pointer.manifest);
assert.equal(publicationStatus(plan).status,'ACTIVE');
const folder='.audit/publication-v621',stamp=new Date().toISOString().replace(/[.:]/gu,'-'),logs=join(root,folder,stamp);mkdirSync(logs,{recursive:true});
const commands=['npm.cmd run check','node --test tests/publication-v621.test.mjs','node .audit/publication-host-v621.mjs','node .audit/native-cd08-browser.mjs','python -X utf8 tests/source-layout-v62.py',
  '.content-work\\source-first-v5\\sympy-env\\Scripts\\python.exe -X utf8 tests/source-symbolic-v62.py',
  'npm.cmd run test:canonical','node .audit/v62-browser.mjs --actual','node .audit/v62-browser.mjs --mobile --actual','node .audit/v62-browser.mjs --graphs --actual','node .audit/v62-browser.mjs --cls --actual','git diff --check'];
const results=[];
for(const [index,command]of commands.entries()){
  const name=String(index+1).padStart(2,'0')+'.log',fd=openSync(join(logs,name),'wx');console.log(`Starting ${command}; ${folder}/${stamp}/${name}`);
  const exit=await new Promise(done=>{const child=spawn('cmd.exe',['/d','/c',command],{cwd:root,windowsHide:true,stdio:['ignore',fd,fd]});child.once('error',()=>done(1));child.once('exit',c=>done(c??1));});closeSync(fd);
  validatePublication(plan);assert.equal(publicationStatus(plan).status,'ACTIVE');
  results.push({command,exitCode:exit,log:`${folder}/${stamp}/${name}`});
  writeFileSync(join(root,folder,'results.json'),json({publicationHash:plan.planHash,contentHash:plan.publicationBundle.hash,sequential:true,publishedRuntimeUnchanged:true,results}));
  console.log(`${command}: exit ${exit}`);if(exit!==0){process.exitCode=exit;break;}
}
if(results.length===commands.length&&results.every(r=>r.exitCode===0)){
  const browser=Object.fromEntries(['content','mobile','graphs','cls'].map(mode=>{
    const r=read(`.audit/source-first-v5/release-v62/browser-${mode}.json`);assert.equal(r.planHash,plan.verifiedStaging.planHash);assert.equal(r.passed,true);assert.equal(r.fixtureApplyRollback,false);assert.deepEqual(r.errors,[]);assert.deepEqual(r.networkErrors,[]);
    return [mode,{states:r.states.length,maxLocalCLS:Math.max(...r.states.map(s=>s.cls)),errors:0,networkErrors:0}];
  }));
  assert.equal(browser.content.states,1318);assert.equal(browser.mobile.states,140);assert.equal(browser.graphs.states,12);assert.equal(browser.cls.states,8);assert.ok(browser.cls.maxLocalCLS<=.1);
  const inventory=read('.audit/source-first-v5/release-v6/inventory.json');for(const s of inventory.sources)assert.equal(digest(readFileSync(join(root,s.file))),s.sha256);
  assert.equal(digest(readFileSync(join(root,plan.nativeSource.file))),plan.nativeSource.sha256);const native=read('.audit/publication-v621/native-cd08.json');assert.equal(native.publicationHash,plan.planHash);assert.equal(native.passed,true);assert.equal(native.states.length,280);
  writeFileSync(join(root,folder,'verified.json'),json({publicationHash:plan.planHash,contentPlanHash:plan.verifiedStaging.planHash,contentHash:plan.publicationBundle.hash,passed:true,sourceCount:inventory.sources.length+1,nativeSourceStates:280,
    independentSourcesUnchanged:true,actualLearnerPages:true,fixtureApplyRollback:false,counts:plan.counts,browser,results,limitations:'240 candidates remain blocked. No human mathematical approval or production deployment certification.'}));
  console.log(json({passed:true,publicationHash:plan.planHash,browser}));
}
