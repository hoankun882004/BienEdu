import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,openSync,closeSync,mkdirSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {root} from './build.mjs';
import {digest} from './model.mjs';
import {prepareV61,output} from './release-v61.mjs';
import {activeBaseline,json} from './release-chain-v61.mjs';
const report=prepareV61(),{parent}=activeBaseline(),runtime=new Map([...parent.files,...JSON.parse(readFileSync(join(root,report.manifest),'utf8')).files].map((f)=>[f.file,digest(readFileSync(join(root,f.file)))]));
const walk=(dir)=>readdirSync(dir,{withFileTypes:true}).flatMap((e)=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);
const immutable=new Map(['.content-work/release-v6','.content-work/source-first-v5/dev-plans','.content-work/source-first-v5/dev-experiments'].flatMap((p)=>walk(join(root,p))).map((p)=>[p,digest(readFileSync(p))]));
const id=new Date().toISOString().replace(/[.:]/gu,'-'),directory=join(root,output,'verification',id);mkdirSync(directory,{recursive:true});
const results=[];
for(const suite of ['verify','test:source-first','test:canonical','test:graphs','test:release','test:mobile']){
  const log=`${suite.replaceAll(':','-')}.log`,fd=openSync(join(directory,log),'wx'),startedAt=new Date().toISOString();console.log(`Starting ${suite}; log ${directory}/${log}`);
  const exitCode=await new Promise((done)=>{const child=spawn('cmd.exe',['/d','/c',`npm.cmd run ${suite}`],{cwd:root,windowsHide:true,stdio:['ignore',fd,fd]});child.once('error',()=>done(-1));child.once('exit',(code)=>done(code??-1));});closeSync(fd);
  for(const [file,hash]of runtime)assert.equal(digest(readFileSync(join(root,file))),hash,'Actual learner runtime changed during tests');
  for(const [file,hash]of immutable)assert.equal(digest(readFileSync(file)),hash,'Historical immutable artifact changed');
  results.push({command:`npm.cmd run ${suite}`,exitCode,startedAt,finishedAt:new Date().toISOString(),log:`${output}/verification/${id}/${log}`});
  writeFileSync(join(root,output,'verification-exits.json'),json({planHash:report.planHash,sequential:true,legacyBenchmarkIsolated:true,actualRuntimeWrites:0,results}));console.log(`${suite}: exit ${exitCode}`);
  if(exitCode!==0){process.exitCode=exitCode;break;}
}
const diff=spawnSync('git',['diff','--check'],{cwd:root,encoding:'utf8'});writeFileSync(join(directory,'git-diff-check.log'),diff.stdout+diff.stderr);assert.equal(diff.status,0);
console.log(json({planHash:report.planHash,sequential:true,results,immutableFilesProtected:immutable.size,gitDiffCheck:diff.status}));
