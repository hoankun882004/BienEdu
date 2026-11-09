// Graph overlay uses the existing SHA/CAS development conventions but writes
// only its NEW activation file. V5.5/V5.6 manifests and runtime remain untouched.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { root } from './build.mjs';
import { digest } from './model.mjs';
import { graphOutput, buildGraphs, verifyGraphSafety } from './graph-build.mjs';
export const activationFile = 'assets/js/data/graph-activation.js';
const planDirectory = (base, hash) => { assert.match(hash, /^[A-F0-9]{64}$/u); return join(base,'.content-work/graphs-v5.8',hash); };
const putOnce = (file, bytes) => { if (existsSync(file)) assert.equal(readFileSync(file,'utf8'),bytes,`Immutable evidence differs: ${file}`); else writeFileSync(file,bytes,{flag:'wx'}); };
export function prepareGraphExperiment() {
  const { candidates } = buildGraphs();
  const dependencyFiles = [
    'assets/js/main.js','assets/js/learning-v6.js','assets/learning-v6.css',
    'documents.html','assets/js/curriculum.js','assets/js/components/markdown-math-renderer.js','assets/js/components/canonical-math.js','assets/js/components/canonical-math-renderer.js',
    'assets/js/components/graph-expression.js','assets/js/components/graph-spec.js','assets/js/components/graph-renderer.js','assets/js/components/variation-table.js',
    'assets/js/graph-loader.js','assets/js/graph-learner.js','assets/native-graphs.css','assets/js/data/foundation-lessons.generated.js','assets/vendor/jsxgraph/jsxgraphcore.mjs',
    ...candidates.map((c)=>c.spec.source.file),...candidates.map((c)=>c.target.assetPath)
  ];
  const before=readFileSync(join(root,activationFile),'utf8');
  assert.match(before,/export const graphActivation = null;/u,'Rollback active experiment before preparing another');
  const dependencies=[...new Set(dependencyFiles)].map((file)=>({file,hash:digest(readFileSync(join(root,file)))}));
  const payload=JSON.stringify(candidates,null,2)+'\n',bundleHash=digest(payload),bundle=`assets/content/native-graphs/${bundleHash}.json`;
  mkdirSync(join(root,'assets/content/native-graphs'),{recursive:true});putOnce(join(root,bundle),payload);
  const core={schemaVersion:'bienedu.graph-experiment.v1',dependencies,bundle,bundleHash,target:activationFile,before,beforeHash:digest(before),recordIds:candidates.map((c)=>c.target.recordId),productionPublication:false};
  const planHash=digest(core),after=`// Hash-authorized local-only graph experiment.\nexport const graphActivation = ${JSON.stringify({planHash,bundle})};\n`;
  const plan={...core,planHash,after,afterHash:digest(after)},directory=planDirectory(root,planHash);mkdirSync(directory,{recursive:true});
  putOnce(join(directory,'manifest.json'),JSON.stringify(plan,null,2)+'\n');putOnce(join(directory,'before.txt'),before);
  writeFileSync(join(root,graphOutput,'experiment.json'),JSON.stringify({planHash,manifest:`.content-work/graphs-v5.8/${planHash}/manifest.json`,applyCommand:`node scripts/source-first/graph-experiment.mjs apply --authorize ${planHash} --development --execute`,rollbackCommand:`node scripts/source-first/graph-experiment.mjs rollback --authorize ${planHash} --development --execute`,realRuntimeWrites:0},null,2)+'\n');
  return plan;
}
export function executeGraphExperiment(plan,{base=root,authorize,development=false,execute=false,rollback=false,interruptAfterWrite=false}={}) {
  assert.equal(authorize,plan.planHash,'Exact authorization hash required');assert.equal(development,true);assert.equal(execute,true);
  const {planHash,after,afterHash,...core}=plan;assert.equal(digest(core),planHash,'Plan tampered');assert.equal(digest(after),afterHash);
  assert.equal(plan.target,activationFile);assert.equal(digest(plan.before),plan.beforeHash);
  const directory=planDirectory(base,planHash);
  assert.deepEqual(JSON.parse(readFileSync(join(directory,'manifest.json'),'utf8')),plan);
  assert.equal(readFileSync(join(directory,'before.txt'),'utf8'),plan.before);
  for(const d of plan.dependencies){assert.ok(!d.file.includes('..')&&!resolve(base,d.file).startsWith('..'));assert.equal(digest(readFileSync(join(base,d.file))),d.hash,`Stale dependency: ${d.file}; new preview required`);}
  assert.equal(digest(readFileSync(join(base,plan.bundle))),plan.bundleHash,'Stale graph bundle');
  const file=join(base,plan.target),current=digest(readFileSync(file)),expected=rollback?afterHash:plan.beforeHash,wanted=rollback?plan.beforeHash:afterHash;
  assert.ok(current===expected||current===wanted,'Unexpected activation state; refusing overwrite');
  let writes=0;
  if(current!==wanted){
    const temp=file+`.${planHash.slice(0,12)}.tmp`,value=rollback?plan.before:after;
    if(existsSync(temp))assert.equal(readFileSync(temp,'utf8'),value,'Unexpected interrupted file');
    writeFileSync(temp,value);renameSync(temp,file);writes++;
  }
  if(interruptAfterWrite)throw new Error('Simulated interruption after atomic activation');
  const event={action:rollback?'rollback':'apply',target:plan.target,hash:wanted,productionPublication:false};
  putOnce(join(directory,`${event.action}-complete.json`),JSON.stringify(event,null,2)+'\n');
  return {writes,state:rollback?'before':'after',recoveredOrIdempotent:writes===0};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const command=process.argv[2];
  if(command==='prepare'){const plan=prepareGraphExperiment();console.log(JSON.stringify({planHash:plan.planHash,recordIds:plan.recordIds,realRuntimeWrites:0}));}
  else if(['apply','rollback'].includes(command)){
    verifyGraphSafety();const hash=process.argv[process.argv.indexOf('--authorize')+1],plan=JSON.parse(readFileSync(join(planDirectory(root,hash),'manifest.json'),'utf8'));
    console.log(JSON.stringify(executeGraphExperiment(plan,{authorize:hash,development:process.argv.includes('--development'),execute:process.argv.includes('--execute'),rollback:command==='rollback'})));
  }else throw new Error('Use prepare, or apply/rollback --authorize HASH --development --execute');
}
