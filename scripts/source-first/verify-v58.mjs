// Full logs and actual exit codes. Legacy evidence suites MUST run sequentially.
import {spawn} from 'node:child_process';
import {openSync,closeSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {root} from './build.mjs';
const output=join(root,'.audit/source-first-v5/graphs-v5.8');mkdirSync(output,{recursive:true});
const results=[];
for(const suite of ['content:graphs:preview','test:graphs','verify','test:source-first','test:canonical']){
  const log=`${suite.replaceAll(':','-')}-final.log`,fd=openSync(join(output,log),'w'),startedAt=new Date().toISOString();
  console.log(`Starting ${suite}`);
  const exitCode=await new Promise((done)=>{const child=spawn('cmd.exe',['/d','/c',`npm.cmd run ${suite}`],{cwd:root,windowsHide:true,stdio:['ignore',fd,fd]});child.once('error',()=>done(-1));child.once('exit',(code)=>done(code??-1));});
  closeSync(fd);results.push({command:`npm.cmd run ${suite}`,exitCode,startedAt,finishedAt:new Date().toISOString(),log});
  writeFileSync(join(output,'verification-exits.json'),JSON.stringify({sequential:true,results},null,2)+'\n');console.log(`${suite}: ${exitCode}`);
  if(exitCode!==0){process.exitCode=exitCode;break;}
}
