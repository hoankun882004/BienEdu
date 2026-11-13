import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
const folder='.audit/geometry-v1/logs';mkdirSync(folder,{recursive:true});
const results=[];
for(const suite of ['verify','test:source-first']){
  const result=spawnSync('cmd.exe',['/d','/c',`npm.cmd run ${suite}`],{encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});
  const log=`${folder}/guard-${suite.replaceAll(':','-')}.log`;writeFileSync(log,result.stdout+result.stderr);
  results.push({command:'npm.cmd run '+suite,exitCode:result.status,testsExecuted:0,blocker:'Historical publication refuses current documents.html bytes',log});
}
writeFileSync('.audit/geometry-v1/historical-guards.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
