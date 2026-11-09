import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,openSync,closeSync,mkdirSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {root} from './build.mjs';
import {digest} from './model.mjs';
import {prepareV62,validatePlan,output} from './release-v62.mjs';
import {read,json} from './release-chain-v61.mjs';
import {assertProtected} from './baseline-v62.mjs';
const report=prepareV62(),plan=read(report.manifest),id=new Date().toISOString().replace(/[.:]/gu,'-'),directory=join(root,output,'verification',id);
mkdirSync(directory,{recursive:true});
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);
const ownImmutable=new Map(walk(join(root,'.content-work/release-v62')).map(file=>[file,digest(readFileSync(file))]));
const commands=[...['verify','test:source-first','test:canonical','test:graphs','test:release','test:mobile'].map(s=>`npm.cmd run ${s}`),
  'node --test --test-concurrency=1 tests/content-v62.test.mjs','python -X utf8 tests/source-layout-v62.py',
  '.content-work\\source-first-v5\\sympy-env\\Scripts\\python.exe -X utf8 tests/source-symbolic-v62.py',
  'node scripts/source-first/compat-suites-v62.mjs test:canonical',
  'node .audit/v62-browser.mjs','node .audit/v62-browser.mjs --mobile','node .audit/v62-browser.mjs --graphs',
  'node .audit/v62-layout-probe.mjs','node .audit/v62-browser.mjs --cls'];
const results=[];
for(const [index,command]of commands.entries()){
  const name=`${String(index+1).padStart(2,'0')}-${index<6?command.split(' ').at(-1).replaceAll(':','-'):'v62'}.log`,file=join(directory,name),fd=openSync(file,'wx'),startedAt=new Date().toISOString();console.log(`Starting ${command}; ${file}`);
  // The original parent wrapper has a reproduced mutable-preview-index leak.
  // Execute these exact npm commands through the child wrapper's isolated,
  // parent-bound baseline. Assertions and immutable ancestor modules stay intact.
  const invocation=index<6?`node scripts/source-first/compat-suites-v62.mjs ${command.split(' ').at(-1)}`:command;
  const exitCode=await new Promise(done=>{const child=spawn('cmd.exe',['/d','/c',invocation],{cwd:root,windowsHide:true,stdio:['ignore',fd,fd]});child.once('error',()=>done(-1));child.once('exit',code=>done(code??-1));});closeSync(fd);
  assertProtected();validatePlan(plan);for(const [file,hash]of ownImmutable)assert.equal(digest(readFileSync(file)),hash,'V6.2 immutable plan/backup changed');
  results.push({command,invocation,scope:index<6?'Exact npm command in parent-bound disposable historical fixture, then dedicated child checks':'Dedicated V6.2 check',exitCode,startedAt,finishedAt:new Date().toISOString(),log:`${output}/verification/${id}/${name}`});
  writeFileSync(join(root,output,'verification-exits.json'),json({planHash:plan.planHash,sequential:true,actualRuntimeWrites:0,historicalBenchmarkIsolated:true,results}));console.log(`${command}: exit ${exitCode}`);
  if(exitCode!==0){process.exitCode=exitCode;break;}
}
const diff=spawnSync('git',['diff','--check'],{cwd:root,encoding:'utf8'});writeFileSync(join(directory,'git-diff-check.log'),diff.stdout+diff.stderr);assert.equal(diff.status,0);
console.log(json({planHash:plan.planHash,results,protectedAncestorFiles:assertProtected(),protectedV62Artifacts:ownImmutable.size,gitDiffCheck:diff.status}));
