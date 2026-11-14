// CURRENT runtime checks, independent of immutable historical release wrappers.
import fs from 'node:fs';import {spawn} from 'node:child_process';import assert from 'node:assert/strict';
import {runtimeHashes,json,read,output,hash} from './conversion-recovery.mjs';
import {qaInputs} from './qa-inputs.mjs';
const dir='.audit/stabilization-v2';fs.mkdirSync(dir,{recursive:true});
const candidate=process.argv.includes('--candidate'),hashes=runtimeHashes(),results=[];
const mode=candidate?'candidate':'active',runDir=dir+'/runs/'+mode;fs.mkdirSync(runDir,{recursive:true});let inputs;
const gates=[
 ['build',['scripts/source-first/conversion-recovery.mjs']],
 ['fidelity',['scripts/source-first/stabilization-fidelity.mjs']],
 ['glyph-source',['scripts/source-first/quality-content-audit.mjs']],
 ['regressions',['--test','--test-concurrency=1','tests/stabilization-v2.test.mjs','tests/stabilization-patch.test.mjs']],
 ['knowledge',['--test','--test-concurrency=1','tests/knowledge-presentation.test.mjs','tests/knowledge-quality-browser.test.mjs','tests/knowledge-matrix-browser.test.mjs','tests/knowledge-navigation-browser.test.mjs']],
 ['conversion-browser',['--test','tests/conversion-recovery-browser.test.mjs']],
 ['geometry',['--test','tests/knowledge-geometry-browser.test.mjs']],
 ['hosting-cls',['--test','tests/stabilization-browser.test.mjs']],
 ['focused',['scripts/source-first/conversion-qa.mjs']],
 ['symbolic',['-X','utf8','scripts/source-first/knowledge-symbolic.py'],'python'],
 ['symbolic-risk',['-X','utf8','scripts/source-first/stabilization-symbolic.py'],'python']
];
for(const [name,args,kind]of gates){const log=runDir+'/'+name+'.log';fs.writeFileSync(log,JSON.stringify(args)+'\n');const code=await new Promise(done=>{const c=spawn(kind==='python'?'.content-work/source-first-v5/sympy-env/Scripts/python.exe':process.execPath,args,{windowsHide:true});c.stdout.on('data',b=>fs.appendFileSync(log,b));c.stderr.on('data',b=>fs.appendFileSync(log,b));c.once('error',()=>done(-1));c.once('exit',c=>done(c??-1));});const text=fs.readFileSync(log,'utf8');const totals=Array.from(text.matchAll(/(?:ℹ|#) (tests|pass|fail) (\d+)/gu),m=>({type:m[1],count:Number(m[2])}));results.push({name,args,exitCode:code,totals,log});console.log(JSON.stringify(results.at(-1)));fs.writeFileSync(runDir+'/gates.json',json(results));if(code!==0)break;if(name==='build')inputs=qaInputs();}
assert.deepEqual(runtimeHashes(),hashes,'Runtime changed during QA');const f=read(dir+'/fidelity.json');
if(inputs)assert.deepEqual(qaInputs(),inputs,'QA inputs changed during execution');
const defects=f.checks.filter(c=>!c.currentMatched).map(c=>({source:c.source,page:c.page,route:c.route,nodeId:c.id,category:'RADICAL_SCOPE',severity:'P0',status:'CONFIRMED_CONVERSION_ERROR',rootCause:'Indexed root was emitted as a square root raised to n',correction:'Source glyph owned by radical index; prepared only',regression:'tests/stabilization-v2.test.mjs',state:'FIX_PREPARED_ACTIVE_UNCHANGED'}));
const tested=results.length===gates.length&&results.every(r=>r.exitCode===0);
const summary={schemaVersion:'bienedu.current-qa.v2',passed:tested&&defects.length===0,scope:'ACTUAL_ACTIVE_RELEASE',runtimeHashes:hashes,inputHashes:inputs,candidate:read(output+'/summary.json').candidate,gates:results,defects,
 resolvedDefects:[{sourceId:'cd12-cd14-calculus',page:3,route:'/documents.html?grade=12&topic=CD12&type=12.1&section=knowledge&item=1',nodeId:'cd12-cd14-calculus:12.1:knowledge:block:5',category:'UI_RENDERING',severity:'P1',status:'CONFIRMED_RENDERER_ERROR',reproduction:'320px, focus mixed display equation and ArrowRight',rootCause:'Only pure formula groups had a focusable scroll owner; nested display wrapper consumed overflow',correction:'One outer scroll owner and router keyboard exclusion for mixed mathematical prose',regression:'tests/stabilization-browser.test.mjs',state:'FIXED_LOCAL_CODE'}],
 evidence:{fidelity:dir+'/fidelity.json',hosting:dir+'/hosting.json',cls:dir+'/cls.json',sourceInventory:output+'/inventory.json'},sourceCertification:'PARTIAL; unknown source records are not marked verified',historicalSuites:'Separate disposable baseline only',codeHash:hash(fs.readFileSync('scripts/source-first/current-qa.mjs'))};
const result=candidate?{...summary,passed:tested,scope:'READ_ONLY_CANDIDATE',activeDefectsStillPresent:defects.length,defects:[]}:summary;
result.exitCode=result.passed?0:1;fs.writeFileSync(dir+(candidate?'/candidate.json':'/current.json'),json(result));
console.log(json({mode,passed:result.passed,exitCode:result.exitCode,confirmedActiveDefects:defects.length}));process.exitCode=result.exitCode;
