// Diagnostic copies only. No active release or historical authorization is edited.
import assert from 'node:assert/strict';
import {cpSync,mkdirSync,mkdtempSync,readFileSync,writeFileSync,readdirSync,symlinkSync,existsSync,rmSync} from 'node:fs';
import {join,dirname,resolve,relative} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {workspace} from './geometry-server.mjs';
const mode=process.argv[2]??'actual';assert.ok(['actual','baseline','baseline-corrected'].includes(mode));
const base=mkdtempSync(join(tmpdir(),'bienedu-geometry-history-')),folder=join(workspace,'.audit/geometry-v1/logs');mkdirSync(folder,{recursive:true});
const read=file=>JSON.parse(readFileSync(join(workspace,file),'utf8'));
try{
  for(const name of readdirSync(workspace))if(/\.(?:html|md|json)$/iu.test(name)&&!name.startsWith('.'))cpSync(join(workspace,name),join(base,name));
  for(const name of ['assets','scripts','tests','docs','backups','content','39 chuyên đề','file tài liệu latex'])cpSync(join(workspace,name),join(base,name),{recursive:true});
  cpSync(join(workspace,'.audit'),join(base,'.audit'),{recursive:true,filter:file=>! /\.(?:png|jpe?g|webp|log)$/iu.test(file)&&!file.replaceAll('\\','/').includes('/legacy')});
  for(const name of ['source-first-v5','graphs-v5.8','release-v6','release-v61','release-v62','publish-v621'])if(existsSync(join(workspace,'.content-work',name)))cpSync(join(workspace,'.content-work',name),join(base,'.content-work',name),{recursive:true,filter:file=>!file.includes('sympy-env')});
  for(const name of ['node_modules','.content-work/source-first-v5/sympy-env']){mkdirSync(dirname(join(base,name)),{recursive:true});symlinkSync(join(workspace,name),join(base,name),'junction');}
  const cdp='.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';mkdirSync(dirname(join(base,cdp)),{recursive:true});cpSync(join(workspace,cdp),join(base,cdp));mkdirSync(join(base,'.git'));
  let env={...process.env};
  if(mode!=='actual'){
    const publication=read(read('.audit/source-first-v5/release-v62/publication-v621.json').manifest),staged=read(read('.audit/source-first-v5/release-v62/inventory.json').manifest),v61=read(read('.audit/source-first-v5/release-v61/inventory.json').manifest),old=read(read('.audit/source-first-v5/release-v6/inventory.json').manifest);
    // Reverse the authenticated descendants, then restore exact V5.5 before-bytes.
    for(const plan of [publication,staged,...(mode==='baseline-corrected'?[v61]:[]),old])for(const file of plan.files)writeFileSync(join(base,file.file),file.before);
    writeFileSync(join(base,'.audit/test-baseline-v61.json'),JSON.stringify({mode:'isolated-historical-benchmark',originRoot:workspace,parentV6:old.planHash,realRuntimeWrites:0}));
    env={...env,BIENEDU_LEGACY_FIXTURE:'1',NODE_OPTIONS:`${env.NODE_OPTIONS??''} --import=${pathToFileURL(join(base,'tests/helpers/register-historical-v62.mjs')).href}`.trim()};
  }
  const commands=mode==='actual'?['npm.cmd test']:mode==='baseline-corrected'?['node scripts/source-first/build.mjs && node scripts/source-first/verify.mjs && npm.cmd test']:['npm.cmd test','node scripts/source-first/compat-suites-v61.mjs test:source-first','node scripts/source-first/compat-suites-v61.mjs test:canonical'];
  const results=[];
  for(const [index,command]of commands.entries()){
    const log=join(folder,`${mode}-${index}.log`);writeFileSync(log,`Scope: ${mode} bytes in disposable ${base}\nCommand: ${command}\n`);
    const code=await new Promise(done=>{const child=spawn('cmd.exe',['/d','/c',command],{cwd:base,env,windowsHide:true});child.stdout.on('data',data=>{import('node:fs').then(fs=>fs.appendFileSync(log,data));});child.stderr.on('data',data=>{import('node:fs').then(fs=>fs.appendFileSync(log,data));});child.on('error',()=>done(-1));child.on('exit',code=>done(code??-1));});
    const bytes=readFileSync(log,'utf8'),totals=Array.from(bytes.matchAll(/(?:ℹ|#) (tests|pass|fail) (\d+)/gu),m=>({type:m[1],count:Number(m[2])}));results.push({command,exitCode:code,totals,log:relative(workspace,log).replaceAll('\\','/')});console.log(JSON.stringify(results.at(-1)));
  }
  writeFileSync(join(workspace,`.audit/geometry-v1/historical-${mode}.json`),JSON.stringify({mode,realRuntimeWrites:0,assertionsUnmodified:true,results},null,2)+'\n');
}finally{
  const rel=relative(resolve(tmpdir()),resolve(base));assert.ok(rel&&!rel.startsWith('..')&&resolve(base)!==resolve(workspace));
  for(const name of ['node_modules','.content-work/source-first-v5/sympy-env'])if(existsSync(join(base,name)))rmSync(join(base,name),{recursive:false});rmSync(base,{recursive:true,force:true});
}
