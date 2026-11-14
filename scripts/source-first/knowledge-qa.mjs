// Sequential current-runtime gates. Receipts record actual child exit codes;
// historical guards remain visible rather than being turned into successes.
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,appendFileSync,readFileSync} from 'node:fs';
const output='.audit/quality-recovery';
mkdirSync(output,{recursive:true});
const gates=[
  ['conversion-build',['scripts/source-first/conversion-recovery.mjs']],
  ['source-evidence',['scripts/source-first/quality-content-audit.mjs']],
  ['source-symbolic',['-X','utf8','scripts/source-first/knowledge-symbolic.py'],'python'],
  ['knowledge',['--test','tests/knowledge-presentation.test.mjs','tests/knowledge-quality-browser.test.mjs','tests/knowledge-matrix-browser.test.mjs','tests/knowledge-navigation-browser.test.mjs']],
  ['geometry',['--test','tests/knowledge-geometry-browser.test.mjs']],
  ['conversion-browser',['--test','tests/conversion-recovery-browser.test.mjs']],
  ['current-checks',['scripts/source-first/conversion-qa.mjs']],
  ...['verify','test:source-first','test:canonical','test:mobile'].map(name=>['historical-guard-'+name.replaceAll(':','-'),['scripts/source-first/publish-v621.mjs','test',name],'guard']),
  ['prepare',['scripts/source-first/conversion-release.mjs','prepare']],
  ['release-preview',['--test','tests/conversion-real-release.test.mjs','tests/conversion-preview.test.mjs']]
];
const results=[];
for(const [name,args,kind]of gates){
  const executable=kind==='python'?'.content-work/source-first-v5/sympy-env/Scripts/python.exe':process.execPath;
  const log=output+'/'+name+'.log';writeFileSync(log,JSON.stringify({executable,args})+'\n');
  const exitCode=await new Promise(done=>{
    const child=spawn(executable,args,{windowsHide:true});
    child.stdout.on('data',b=>appendFileSync(log,b));child.stderr.on('data',b=>appendFileSync(log,b));
    child.once('error',()=>done(-1));child.once('exit',code=>done(code??-1));
  });
  const text=readFileSync(log,'utf8');
  const totals=Array.from(text.matchAll(/(?:ℹ|#) (tests|pass|fail) (\d+)/gu),m=>({type:m[1],count:Number(m[2])}));
  const historicalBlocker=kind==='guard'&&exitCode===1&&text.includes('Unknown target bytes: package.json');
  const result={name,args,exitCode,totals,log,historicalBlocker};results.push(result);
  writeFileSync(output+'/gates.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(result));
  if(exitCode!==0&&!historicalBlocker){process.exitCode=1;break;}
}
if(results.some(r=>r.exitCode!==0))process.exitCode=1;
