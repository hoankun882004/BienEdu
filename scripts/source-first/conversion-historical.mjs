// Replay historical assertions in an isolated copy, never in the active site.
import assert from 'node:assert/strict';
import {cpSync,mkdirSync,mkdtempSync,readdirSync,symlinkSync,existsSync,rmSync,writeFileSync,readFileSync,appendFileSync} from 'node:fs';
import {join,dirname,resolve,relative} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn,spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {root,output,read,json,hash} from './conversion-recovery.mjs';
const base=mkdtempSync(join(tmpdir(),'bienedu-conversion-history-'));
const restoreChecker=process.argv.includes('--restore-source-check');
const reportName=restoreChecker?'historical-restored':'historical';
try{
  for(const n of readdirSync(root))if(/\.(?:html|md|json)$/iu.test(n)&&!n.startsWith('.'))cpSync(join(root,n),join(base,n));
  for(const n of ['assets','scripts','tests','docs','backups','content','39 chuyên đề','file tài liệu latex'])cpSync(join(root,n),join(base,n),{recursive:true});
  cpSync(join(root,'.audit'),join(base,'.audit'),{recursive:true,filter:f=>! /\.(?:png|jpe?g|webp|log)$/iu.test(f)&&!f.replaceAll('\\','/').includes('/legacy')});
  for(const n of ['source-first-v5','graphs-v5.8','release-v6','release-v61','release-v62','publish-v621'])if(existsSync(join(root,'.content-work',n)))cpSync(join(root,'.content-work',n),join(base,'.content-work',n),{recursive:true,filter:f=>!f.includes('sympy-env')});
  for(const n of ['node_modules','.content-work/source-first-v5/sympy-env']){mkdirSync(dirname(join(base,n)),{recursive:true});symlinkSync(join(root,n),join(base,n),'junction');}
  const helper='.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';mkdirSync(dirname(join(base,helper)),{recursive:true});cpSync(join(root,helper),join(base,helper));mkdirSync(join(base,'.git'));
  // Reproduce the committed pre-task parser, not today's changed parser, for
  // a historical baseline comparison. Assertions remain exactly unchanged.
  const restored=['assets/js/components/canonical-math.js','assets/js/components/canonical-math-renderer.js','assets/js/components/pdf-knowledge-renderer.js','assets/pdf-knowledge.css','assets/js/curriculum.js','scripts/latex-pilot/parser.mjs','scripts/source-first/canonical-adapters.mjs','scripts/source-first/layout-v62.py'];
  for(const file of restored){const result=spawnSync('git',['show','HEAD:'+file],{cwd:root,maxBuffer:4*1024*1024,windowsHide:true});assert.equal(result.status,0);writeFileSync(join(base,file),result.stdout);}
  const plans=[read(read('.audit/source-first-v5/release-v62/publication-v621.json').manifest),read(read('.audit/source-first-v5/release-v62/inventory.json').manifest),read(read('.audit/source-first-v5/release-v61/inventory.json').manifest),read(read('.audit/source-first-v5/release-v6/inventory.json').manifest)];
  for(const plan of plans)for(const file of plan.files)writeFileSync(join(base,file.file),file.before);
  let checkerEvidence=null;
  if(restoreChecker){
    const file='scripts/check-source.mjs',commit='b506954720aea8901b0e770fabe5d778eadf44c1';
    const expected=plans[2].dependencies.find(d=>d.file===file);assert.ok(expected);
    const blob=spawnSync('git',['show',commit+':'+file],{cwd:root,windowsHide:true});assert.equal(blob.status,0);
    assert.equal(hash(blob.stdout),expected.hash??expected.sha256,'Git blob must match original immutable dependency');
    writeFileSync(join(base,file),blob.stdout);checkerEvidence={file,commit,sha256:hash(blob.stdout),originalManifestUnchanged:true};
  }
  writeFileSync(join(base,'.audit/test-baseline-v61.json'),json({mode:'isolated-historical-benchmark',originRoot:root,parentV6:plans.at(-1).planHash,realRuntimeWrites:0}));
  const env={...process.env,BIENEDU_LEGACY_FIXTURE:'1',NODE_OPTIONS:`${process.env.NODE_OPTIONS??''} --import=${pathToFileURL(join(base,'tests/helpers/register-historical-v62.mjs')).href}`.trim()};
  const command='node scripts/source-first/build.mjs && node scripts/source-first/verify.mjs && npm.cmd test';
  const log=join(root,output,reportName+'.log');writeFileSync(log,'Isolated original baseline; unchanged assertions.\n'+command+'\n');
  const exitCode=await new Promise(done=>{const child=spawn('cmd.exe',['/d','/c',command],{cwd:base,env,windowsHide:true});child.stdout.on('data',b=>appendFileSync(log,b));child.stderr.on('data',b=>appendFileSync(log,b));child.once('error',()=>done(-1));child.once('exit',code=>done(code??-1));});
  const totals=Array.from(readFileSync(log,'utf8').matchAll(/(?:ℹ|#) (tests|pass|fail) (\d+)/gu),m=>({type:m[1],count:Number(m[2])}));
  const result={command,exitCode,totals,scope:'Original historical baseline in disposable fixture; not current runtime certification',restoredFromHead:restored,checkerEvidence,realRuntimeWrites:0,assertionsUnmodified:true};
  writeFileSync(join(root,output,reportName+'.json'),json(result));console.log(json(result));process.exitCode=exitCode;
}finally{
  assert.ok(relative(resolve(tmpdir()),resolve(base))&&!relative(resolve(tmpdir()),resolve(base)).startsWith('..')&&resolve(base)!==resolve(root));
  for(const n of ['node_modules','.content-work/source-first-v5/sympy-env'])if(existsSync(join(base,n)))rmSync(join(base,n),{recursive:false});rmSync(base,{recursive:true,force:true});
}
