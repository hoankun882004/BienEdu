import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkHosting,privatePath} from '../scripts/check-hosting.mjs';
import {createLessonSlides as publishedSlides} from '../assets/js/runtime/lesson-workspace.js';
import {createLessonSlides as historicalSlides} from '../scripts/source-first/runtime-v62/lesson-workspace.mjs';

test('every public entry has a complete case-correct browser closure outside private tooling',()=>{
  const report=checkHosting();assert.equal(report.pages,5);assert.ok(report.modules.length>60);assert.equal(report.payloadsChecked,3);
  for(const file of ['learner.js','registry.js','lesson-workspace.js'])assert.ok(report.modules.includes('assets/js/runtime/'+file));
  assert.ok(report.modules.every(file=>!privatePath('/'+file)));
});
test('public slide adapter retains the old semantics and stable IDs',()=>{
  for(const reading of [null,{title:'Kiến thức',lead:'Giữ nguyên',formulae:[],points:[]}]){
    const options={topic:{id:'CD28',title:'Vectơ'},exercise:{id:'28.1',code:'28.1',title:'Vectơ'},reading,examples:[{id:'keep-example',prompt:'Không đổi nội dung',steps:[]}]};
    assert.deepEqual(publishedSlides(options),historicalSlides(options));
  }
});
test('public provenance adapter changes module paths, not the mathematics or source metadata',()=>{
  const original=readFileSync('scripts/source-first/runtime-v62/registry.mjs','utf8').split('\n').slice(1).join('\n').replaceAll('../../../assets/js/','../');
  const current=readFileSync('assets/js/runtime/registry.js','utf8').split('\n').slice(1).join('\n');assert.equal(current.trim(),original.trim());
});
test('public source-context renderer only relocates imports, preserving the existing output',()=>{
  const original=readFileSync('scripts/source-first/runtime-v62/learner.mjs','utf8').replaceAll('\r\n','\n').replaceAll('../../../assets/js/','../');
  const current=readFileSync('assets/js/runtime/learner.js','utf8').split('\n').slice(1).join('\n');assert.equal(current.trim(),original.trim());
});
test('all exact-byte payload families are protected from Git newline conversion',()=>{
  const attributes=readFileSync('.gitattributes','utf8');for(const folder of ['local-learning','native-graphs','pdf-knowledge','geometry'])assert.ok(attributes.includes(`assets/content/${folder}/*.json -text`));
});
test('hosted load failure does not tell real users to run a local server',()=>{
  const html=readFileSync('documents.html','utf8'),fallback=html.match(/<div class="roadmap-loading__error"[\s\S]*?<\/div>/u)[0];assert.doesNotMatch(fallback,/local server/u);assert.match(html,/location\.protocol==='file:'/u);
});
