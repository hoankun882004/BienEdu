import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {root} from './build.mjs';
const text=file=>readFileSync(join(root,file),'utf8');
function replaceOnce(source,from,to){assert.equal(source.split(from).length,2,`Exact guarded seam missing: ${from.slice(0,70)}`);return source.replace(from,to);}
export function stageRuntimeV62(bundle){
  const changes=new Map();
  const pkg=JSON.parse(text('package.json'));
  for(const suite of ['verify','test:source-first','test:canonical','test:graphs','test:release','test:mobile','content:release:preview','content:release:status'])pkg.scripts[suite]=`node scripts/source-first/compat-suites-v62.mjs ${suite}`;
  changes.set('package.json',JSON.stringify(pkg,null,2)+'\n');
  const knowledge=`import * as base from './knowledge-content.js';
import {overlayGroups,legacyText} from './learning-overlay.js';
export * from './knowledge-content.js';
const readings=Object.fromEntries(overlayGroups.filter(g=>g.knowledge&&g.mergeMode!=='append-independent-source').map(g=>[g.code,{...g.knowledge,lead:legacyText(g.knowledge.lead),formulae:g.knowledge.formulae.map(f=>({...f,value:legacyText(f.value),renderAsMath:false})),points:g.knowledge.points.map(p=>({...p,text:legacyText(p.text)})),reviewStatus:'needs-review',contentVersion:g.contentVersion,sourceDocumentId:g.source.sourceId}]));
export const knowledgeContent=Object.freeze({...base.knowledgeContent,...readings});
export const getKnowledgeContent=code=>knowledgeContent[code]??null;
export const getProblemTypesForTopic=id=>{const types=new Map(base.getProblemTypesForTopic(id).map(t=>[t.code,t]));for(const g of overlayGroups.filter(g=>g.topicId===id&&g.method&&g.mergeMode!=='append-independent-source'))types.set(g.code,{...g.method,exampleCount:g.examples.length,solutionCount:g.examples.filter(e=>e.steps?.length).length});return [...types.values()].sort((a,b)=>a.code.localeCompare(b.code,undefined,{numeric:true}));};
`;
  changes.set('assets/js/data/knowledge-v6.js',knowledge);
  let examples=text('assets/js/data/examples-v6.js');
  examples=replaceOnce(examples,'export const exampleContent=Object.freeze({...corrected,...added});',
    `const combined=Object.fromEntries(Object.entries(added).map(([code,records])=>{const group=overlayGroups.find(g=>g.code===code);return [code,group.mergeMode==='append-independent-source'?[...(corrected[code]??[]),...records]:records];}));
export const exampleContent=Object.freeze({...corrected,...combined});`);
  changes.set('assets/js/data/examples-v6.js',examples);
  let curriculum=replaceOnce(text('assets/js/curriculum.js'),
    'if (!getKnowledgeContent(exercise.code) && !getApprovedMathContent(exercise.code)) return renderUnavailable(topic, exercise);',
    'if (!getKnowledgeContent(exercise.code) && !getApprovedMathContent(exercise.code) && !getExampleContent(exercise.code)?.length) return renderUnavailable(topic, exercise);');
  curriculum=replaceOnce(curriculum,
    'const isAvailable = Boolean((hasProblemType || getKnowledgeContent(exercise.code)) && content?.status !== CONTENT_STATUS.COMING_SOON);',
    'const isAvailable = Boolean((hasProblemType || getKnowledgeContent(exercise.code) || getExampleContent(exercise.code)?.length) && content?.status !== CONTENT_STATUS.COMING_SOON);');
  curriculum=replaceOnce(curriculum,'const firstSection = topicReading && hasProblemType ? "types" : "knowledge";',
    'const firstSection = topicReading && hasProblemType ? "types" : getKnowledgeContent(exercise.code) ? "knowledge" : hasProblemType ? "types" : getExampleContent(exercise.code)?.length ? "example" : "knowledge";');
  changes.set('assets/js/curriculum.js',curriculum);
  let learning=text('assets/js/learning-v6.js');
  learning=`import {refineSourceContext} from '../../scripts/source-first/runtime-v62/learner.mjs';\n`+learning;
  learning=replaceOnce(learning,"  const style=document.createElement('link');style.rel='stylesheet';style.href='assets/learning-v6.css?v=6.0';document.head.append(style);",
    "  if(!document.querySelector('link[data-learning-v62-style]')){const style=document.createElement('link');style.rel='stylesheet';style.href='assets/learning-v6.css?v=6.0';document.head.append(style);}");
  learning=replaceOnce(learning,'  function refine(){','  function refine(){\n    refineSourceContext(app);');
  learning=replaceOnce(learning,'if(!scroll||scroll.scrollWidth<=scroll.clientWidth+1)return;',"if(!scroll||(!scroll.matches('.native-variation')&&scroll.scrollWidth<=scroll.clientWidth+1))return;");
  changes.set('assets/js/learning-v6.js',learning);
  let graph=text('assets/js/graph-learner.js');
  graph=replaceOnce(graph,'function addStyles() {',`function addStyles() {\n  if(document.querySelector('link[data-native-graph-style]')?.sheet)return Promise.resolve();`);
  changes.set('assets/js/graph-learner.js',graph);
  const graphReserve=bundle.graphs.map(g=>{
    assert.match(g.target.assetPath,/^[A-Za-z0-9/_.-]+$/u);
    const selector=`.example-reader__figures figure:has(img[src$="${g.target.assetPath}"])`;
    const height=g.spec.type==='function-2d'?'calc(clamp(280px,35vw,390px) + 10rem)':'15rem';
    return `${selector}{display:grid;grid-template-columns:minmax(0,1fr);min-block-size:${height};align-items:start}\n${selector}>*{grid-area:1/1;min-width:0}\n${selector}>figcaption{align-self:end}\n@media(max-width:600px){${selector}{min-block-size:${g.spec.type==='function-2d'?'calc(300px + 12rem)':'15rem'}}}`;
  }).join('\n');
  changes.set('assets/learning-v6.css',text('assets/learning-v6.css')+`
/* V6.2: reserve actual asynchronous layout, without hiding learner content. */
html{scrollbar-gutter:stable}
[data-site-header]:empty{min-block-size:4.6875rem}
.roadmap-loading{min-block-size:calc(100dvh - 4.6875rem)}
.source-edition-note{padding:.7rem .9rem;margin:0 0 .85rem;border-inline-start:3px solid #b88418;background:#fff7df;color:#604a18;font-size:.8125rem;line-height:1.6;overflow-wrap:anywhere}
.source-edition-note p{margin:.2rem 0 0}
.source-edition-note summary{cursor:pointer;min-height:2.75rem;display:flex;align-items:center;font-weight:600}
.source-edition-nav{display:flex;flex-wrap:wrap;gap:.5rem;margin:.5rem 0}
.source-edition-nav a{display:inline-flex;align-items:center;min-height:2.75rem;padding:.4rem .7rem;border:1px solid #b9cbe7;border-radius:.4rem;color:#174c9c;background:#fff;font-size:.8125rem}
${graphReserve}
`);
  let html=text('documents.html');
  const maps=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/u)[1]);
  maps.imports['./assets/js/domain/lesson-workspace.js?v=17.1']='./scripts/source-first/runtime-v62/lesson-workspace.mjs';
  maps.imports['./assets/js/data/content-registry.js?v=15.0']='./scripts/source-first/runtime-v62/registry.mjs';
  html=html.replace(/<script type="importmap">[\s\S]*?<\/script>/u,`<script type="importmap">\n${JSON.stringify(maps)}\n  </script>`);
  html=replaceOnce(html,'  <script type="importmap">',`  <link rel="stylesheet" href="assets/learning-v6.css?v=6.2" data-learning-v62-style>
  <link rel="stylesheet" href="assets/native-graphs.css?v=5.8" data-native-graph-style>
  <link rel="preload" href="assets/vendor/katex/fonts/KaTeX_Main-Regular.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="assets/vendor/katex/fonts/KaTeX_Math-Italic.woff2" as="font" type="font/woff2" crossorigin>
  <script type="importmap">`);
  html=replaceOnce(html,'import("./assets/js/curriculum.js?v=19.0").catch',`Promise.race([Promise.all(['400','500','600','700'].map(weight=>document.fonts.load(weight+' 16px "Be Vietnam Pro"'))).catch(()=>[]),new Promise(resolve=>setTimeout(resolve,3000))]).then(()=>import("./assets/js/curriculum.js?v=19.0")).catch`);
  changes.set('documents.html',html);
  return changes;
}
