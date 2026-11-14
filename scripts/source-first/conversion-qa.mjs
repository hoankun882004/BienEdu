// Sequential checks, full logs and actual process exit codes.
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,appendFileSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {root,output,json} from './conversion-recovery.mjs';
import assert from 'node:assert/strict';
const commands=[
  ['source-check','npm.cmd run check'],
  ['parser-release','npm.cmd run test:conversion'],
  ['canonical', 'node --test --test-name-pattern="canonical math preserves|invalid expressions|mixed Vietnamese|bounded explicit native|independent identities|multiline inline" tests/canonical-math-v57.test.js'],
  ['learner-regression','node --test tests/latex-rendering.test.js tests/latex-import-pilot.test.js tests/learning-progress.test.js tests/lesson-workspace.test.js tests/source-practice.test.js'],
  ['geometry-properties','node --test --test-skip-pattern="source imports, corrections|history continuation|fresh local continuation" tests/geometry.test.mjs'],
  ['symbolic','.content-work\\source-first-v5\\sympy-env\\Scripts\\python.exe -X utf8 scripts/source-first/conversion-symbolic.py'],
  ['hosting','npm.cmd run test:hosting'],
  ['hosting-closure','npm.cmd run check:hosting'],
  ['diff-check','git diff --check']
];
mkdirSync(join(root,output,'logs'),{recursive:true});
const results=[];
for(const [name,command]of commands){
  const file=join(root,output,'logs',name+'.log');writeFileSync(file,command+'\n');
  // Pass regex arguments directly to Node. cmd.exe quote retention can otherwise
  // produce a vacuous test-name filter that reports a file-level success.
  const filtered=name==='canonical'
    ?['--test','--test-name-pattern=canonical math preserves|invalid expressions|mixed Vietnamese|bounded explicit native|independent identities|multiline inline','tests/canonical-math-v57.test.js']
    :name==='geometry-properties'?['--test','--test-skip-pattern=source imports, corrections|history continuation|fresh local continuation','tests/geometry.test.mjs']:null;
  const executable=filtered?process.execPath:'cmd.exe',args=filtered??['/d','/c',command];
  const exitCode=await new Promise(done=>{const child=spawn(executable,args,{cwd:root,windowsHide:true});child.stdout.on('data',b=>appendFileSync(file,b));child.stderr.on('data',b=>appendFileSync(file,b));child.once('error',()=>done(-1));child.once('exit',code=>done(code??-1));});
  const text=readFileSync(file,'utf8');
  const totals=Array.from(text.matchAll(/(?:ℹ|#) (tests|pass|fail) (\d+)/gu),m=>({type:m[1],count:Number(m[2])}));
  const expected={canonical:21,'geometry-properties':51,'parser-release':15,'learner-regression':41,hosting:8}[name];
  if(expected)assert.equal(totals.find(t=>t.type==='tests')?.count,expected,'Missing/vacuous test coverage: '+name);
  results.push({name,command,exitCode,totals,log:output+'/logs/'+name+'.log'});console.log(json(results.at(-1)));
}
writeFileSync(join(root,output,'checks.json'),json(results));
if(results.some(r=>r.exitCode!==0))process.exitCode=1;
