import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {localSite} from '../tests/helpers/local-site.mjs';
import {fixtureV62} from '../tests/helpers/release-v62.mjs';
import {applyV62,output,assertReleasePreserved} from '../scripts/source-first/release-v62.mjs';
import {read} from '../scripts/source-first/release-chain-v61.mjs';
import {maths} from '../scripts/source-first/content-v62.mjs';
import {buildActivePracticeSet} from '../assets/js/domain/practice-bank.js';
const root=process.cwd(),prose=n=>n.type==='text'?[n.value]:(n.segments??[]).flatMap(prose),compact=s=>s.replace(/\s+/gu,' ').trim();
const sizes=[[320,568],[360,800],[390,844],[430,932],[768,1024],[1024,768],[1366,768],[844,390]];
export async function validateV62Site({plan=null,fixture=true,mode='content'}={}){
  const inventory=read(`${output}/inventory.json`);plan??=read(inventory.manifest);const content=read(`${output}/content.json`),bundle=read(plan.bundle);
  const f=fixture?fixtureV62(plan):null;if(f)applyV62(plan,{base:f.base,execute:true,development:true,authorize:plan.planHash});
  const site=await localSite({fixtureRoot:f?.base}),states=[],errors=[],networkErrors=[];let latestPage;
  const viewports=mode==='mobile'?sizes:mode==='cls'?[[390,844],[768,844],[1024,844],[1366,844]]:mode==='smoke'?[[390,844],[1366,768]]:[[390,844],[1366,768]];
  const route=(code,section,item=1)=>`/documents.html?grade=12&topic=CD${code.split('.')[0].padStart(2,'0')}&type=${code}&section=${section}&item=${item}&releasePreview=off`;
  const position=(group,example)=>bundle.groups.find(g=>g.code===group.code).examples.findIndex(e=>e.id===example.id)+1+(inventory.editionOffsets[group.code]??0);
  try{
    const cases=mode==='cls'?viewports.flatMap(([w,h])=>[[w,h,'roadmap'],[w,h,'graph']]):viewports;
    for(const [width,height,clsCase]of cases){
      const context=await site.browser.newContext({viewport:{width,height},isMobile:width<768||height<500,hasTouch:width<768||height<500,locale:'vi-VN',reducedMotion:'reduce'}),page=await context.newPage();
      latestPage=page;
      page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(site.origin)&&r.status()>=400&&/\.(?:js|mjs|json|css|woff2)(?:\?|$)/u.test(r.url()))networkErrors.push({url:r.url(),status:r.status()});});
      await page.addInitScript(()=>{globalThis.__v62Shifts=[];new PerformanceObserver(list=>{for(const x of list.getEntries())if(!x.hadRecentInput)globalThis.__v62Shifts.push({time:x.startTime,value:x.value,sources:x.sources.map(s=>({tag:s.node?.tagName,cls:s.node?.className,previous:s.previousRect.toJSON(),current:s.currentRect.toJSON()}))});}).observe({type:'layout-shift',buffered:true});});
      const visit=async path=>{await page.goto(site.origin+path,{waitUntil:'domcontentloaded'});await page.locator('#main-content').waitFor();if(path.startsWith('/documents'))await page.waitForFunction(()=>!document.querySelector('.roadmap-loading'));await page.evaluate(()=>document.fonts.ready.then(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>{globalThis.__v62ReadyAt=performance.now();done();})))));};
      const health=async name=>{
        const value=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,mathErrors:document.querySelectorAll('.katex-error,.math-render-error').length,
          graphCount:document.querySelectorAll('[data-native-graph]').length,mainCount:document.querySelectorAll('main').length,
          pdfLoads:performance.getEntriesByType('resource').filter(r=>new URL(r.name).pathname.endsWith('.pdf')).length,
          graphLoads:performance.getEntriesByType('resource').filter(r=>r.name.includes('jsxgraphcore')).length,
          readingCSSLoads:performance.getEntriesByType('resource').filter(r=>new URL(r.name).pathname.endsWith('/assets/learning-v6.css')).length,
          dcl:performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd,learnerReadyMs:globalThis.__v62ReadyAt,shifts:globalThis.__v62Shifts}));
        assert.equal(value.overflow,false,`${name}@${width}: page overflow`);assert.equal(value.mathErrors,0);assert.equal(value.mainCount,1);assert.equal(value.pdfLoads,0);assert.ok(value.readingCSSLoads<=1,'No duplicate reading stylesheet request');
        const cls=value.shifts.reduce((a,b)=>a+b.value,0);states.push({name,width,height,cls,...value});
      };
      if(['content','smoke'].includes(mode)){
        const groups=mode==='smoke'?content.groups.filter(g=>['17.4','15.1','28.1','12.8','33.11'].includes(g.code)):content.groups;
        for(const group of groups){
          if(group.knowledgeIsNew){await visit(route(group.code,'knowledge'));await page.locator('.math-lesson').waitFor();const actual=await page.locator('.math-lesson annotation[encoding="application/x-tex"]').allTextContents();for(const latex of maths(group.knowledge.lead))assert.ok(actual.includes(latex));await health('knowledge-'+group.code);}
          if(group.methodIsNew){await visit(route(group.code,'types'));await page.locator('.learning-workspace[data-section="types"]').waitFor();await health('method-'+group.code);}
          const examples=mode==='smoke'?group.examples.slice(0,2):group.examples;
          for(const example of examples){
            await visit(route(group.code,'example',position(group,example)));await page.locator('.example-reader__question').waitFor();
            assert.equal(await page.locator('.example-reader__intro h2').innerText(),`Ví dụ ${example.originalExampleNumber}`);
            assert.equal(await page.locator('.example-reader__solution[open]').count(),0);
            assert.deepEqual(await page.locator('.example-reader__question annotation[encoding="application/x-tex"]').allTextContents(),maths(example.prompt));
            await page.locator('.example-reader__solution>summary').click();
            assert.deepEqual(await page.locator('.example-reader__solution-body annotation[encoding="application/x-tex"]').allTextContents(),maths(example.steps[0].expression));
            for(const [node,selector]of [[example.prompt,'.example-reader__question'],[example.steps[0].expression,'.example-reader__solution-body']]){
              const actual=compact(await page.locator(selector).innerText());for(const value of prose(node).map(compact).filter(t=>t.length>4))assert.ok(actual.includes(value),`Source wording: ${example.id} ${value}`);
            }
            assert.equal(await page.locator('[data-source-v62]').count(),1);assert.equal(await page.locator('[data-source-v62]').getAttribute('data-source-document'),group.source.file.split('/').at(-1));
            if(group.mergeMode==='append-independent-source'){
              assert.equal(await page.locator('.source-edition-nav').count(),1);
              const provenance=await page.evaluate(async({code,id})=>{const r=await import('/scripts/source-first/runtime-v62/registry.mjs');return r.getSubtopicAvailability(code).sections.examples.units.find(u=>u.id===id).source;},{code:group.code,id:example.id});
              assert.equal(provenance.documentId,group.source.sourceId);assert.equal(provenance.sourceSha256,group.source.sha256);
            }
            await health(example.id);
            if(example===examples[0]&&['17.4','15.1','28.1','12.8','33.11'].includes(group.code))await page.screenshot({path:join(root,output,`source-${group.code}-${width}.png`)});
          }
        }
      }
      if(mode==='parent'){await visit(route('17.1','example',3));await page.locator('.example-card').waitFor();assert.ok(await page.locator('.example-card mfrac').count());await health('retained-parent-17.1');}
      if(['mobile','cls'].includes(mode)){
        const complete=content.groups.find(g=>g.knowledgeIsNew&&g.methodIsNew);
        const pages=mode==='cls'?(clsCase==='roadmap'?[['roadmap','/documents.html?grade=12']]:[]):[['home','/?grade=12'],['roadmap','/documents.html?grade=12'],['topic','/documents.html?grade=12&topic=CD28'],['knowledge',route(complete.code,'knowledge')],['method',route(complete.code,'types')]];
        for(const [name,path]of pages){await visit(path);if(mode==='cls'){await page.waitForLoadState('networkidle');await page.waitForTimeout(200);}await health(name);}
        if(mode==='mobile'){
          const group=content.groups.find(g=>g.code==='17.4'),example=group.examples.at(-1),item=position(group,example);
          await visit(route(group.code,'example',item));await page.locator('.example-card').waitFor();
          const current=page.locator('.example-index a[aria-current="page"]');assert.equal(await current.evaluate(a=>{const r=a.getBoundingClientRect(),p=a.closest('ol').getBoundingClientRect();return r.left>=p.left-1&&r.right<=p.right+1;}),true);
          const before=await page.locator('.example-index header').innerText();await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('.example-index header').innerText(),before);
          await page.screenshot({path:join(root,output,`mobile-${width}.png`)});await health('progress-reload');
          if(item>1){await page.keyboard.press('ArrowLeft');await page.waitForURL(u=>u.searchParams.get('item')===String(item-1));await page.keyboard.press('ArrowRight');await page.waitForURL(u=>u.searchParams.get('item')===String(item));await health('keyboard-navigation');}
          if(width<761){const menu=page.locator('.menu-toggle');await menu.click();assert.equal(await menu.getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');assert.equal(await menu.getAttribute('aria-expanded'),'false');await health('menu-escape');}
          const questions=buildActivePracticeSet('20.1','PRACTICE_V15');
          for(const [index,correct]of [[0,true],[1,false]]){
            await visit(route('20.1','practice',index+1));await page.locator('[data-practice-answer]').first().waitFor();
            const answer=correct?questions[index].correctIndex:(questions[index].correctIndex+1)%questions[index].options.length;
            await page.locator(`[data-practice-answer="${answer}"]`).click();await page.locator('.practice-feedback').waitFor();
            assert.equal(await page.locator(correct?'.practice-feedback.is-correct':'.practice-feedback.is-wrong').count(),1);await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('.practice-feedback').count(),1);await health(correct?'practice-correct-persisted':'practice-wrong-persisted');
          }
          const edition=content.groups.find(g=>g.mergeMode==='append-independent-source');
          await visit(route(edition.code,'example',1));assert.equal(await page.locator('[data-source-v62]').count(),0,'Old edition is not relabelled');await page.locator('.source-edition-nav a').last().click();await page.locator('[data-source-v62]').waitFor();await health('independent-edition-navigation');
          const only=content.groups.find(g=>!g.knowledge&&!g.method&&g.mergeMode!=='append-independent-source');
          await visit(`/documents.html?grade=12&topic=${only.topicId}`);await page.locator(`.type-list a[href*="type=${only.code}&"]`).click();await page.locator('.example-reader__question').waitFor();assert.equal(new URL(page.url()).searchParams.get('section'),'example');await health('example-only-topic-entry');
        }
      }
      if(['graphs','mobile','cls'].includes(mode)){
        const graphs=mode==='cls'?(clsCase==='graph'?bundle.graphs.filter(g=>g.target.code==='6.1'&&g.target.item===8):[]):bundle.graphs;
        for(const graph of graphs){
          await visit(route(graph.target.code,'example',graph.target.item));await page.locator(`[data-graph-replacement="${graph.spec.id}"]`).waitFor();assert.equal(await page.locator('[data-native-graph]').count(),1);
          assert.equal(await page.locator('.example-reader__figures img:visible').count(),0);
          if(graph.spec.type==='function-2d'){
            const mounted=await page.evaluate(async()=>{const {getGraphInstance,activeGraphCount}=await import('/assets/js/components/graph-renderer.js');const host=document.querySelector('[data-native-graph]'),state=getGraphInstance(host);return {spec:state.spec,curves:state.curves.length,active:activeGraphCount(),bbox:state.board.getBoundingBox()};});assert.deepEqual(mounted.spec,graph.spec);assert.ok(mounted.curves>0);assert.equal(mounted.active,1,'Detached graph boards are disposed');
            if(mode!=='cls'){const initial=mounted.bbox;await page.locator('.native-graph__controls button').first().click();const zoomed=await page.evaluate(async()=>{const m=await import('/assets/js/components/graph-renderer.js');return m.getGraphInstance(document.querySelector('[data-native-graph]')).board.getBoundingBox();});assert.notDeepEqual(zoomed,initial);await page.locator('.native-graph__controls button').last().click();}
          }else{
            assert.equal(await page.locator('.native-variation table').count(),1);
            const url=page.url();await page.locator('.native-variation').focus();await page.keyboard.press('ArrowRight');assert.equal(page.url(),url);
          }
          if(mode==='cls'){await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(200);}
          await health(mode==='cls'?'graph':'graph-'+graph.target.recordId);if(graph.target.item===8)await page.screenshot({path:join(root,output,`graph-${width}.png`)});
          if(mode!=='cls'&&graph.target.item===8)await page.locator('[data-native-graph]').screenshot({path:join(root,output,`graph-component-${width}.png`)});
        }
      }
      await context.close();
    }
    assert.deepEqual(errors,[]);assert.deepEqual(networkErrors,[]);
    if(mode==='cls'){assert.equal(states.length,8);for(const state of states)assert.ok(state.cls<=.1,`Local no-input CLS target: ${state.name}@${state.width} = ${state.cls}`);}
    if(f){applyV62(plan,{base:f.base,execute:true,development:true,authorize:plan.planHash,rollback:true});for(const x of plan.files)assert.equal(readFileSync(join(f.base,x.file),'utf8'),x.before);}
    if(fixture)assertReleasePreserved(plan);
    const report={planHash:plan.planHash,mode,passed:true,states,errors,networkErrors,fixtureApplyRollback:Boolean(f),realRuntimeWrites:0};
    mkdirSync(join(root,output),{recursive:true});writeFileSync(join(root,output,`browser-${mode}.json`),JSON.stringify(report,null,2));
    console.log(JSON.stringify({mode,passed:true,states:states.length,errors:errors.length,maxLocalCLS:Math.max(...states.map(s=>s.cls)),realRuntimeWrites:0}));return report;
  }catch(error){
    if(latestPage&&!latestPage.isClosed()){await latestPage.screenshot({path:join(root,output,`failure-${mode}.png`)});writeFileSync(join(root,output,`failure-${mode}.json`),JSON.stringify({url:latestPage.url(),errors,networkErrors,message:error.message,text:await latestPage.locator('body').innerText()},null,2));}
    throw error;
  }finally{await site.close();f?.cleanup();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await validateV62Site({fixture:!process.argv.includes('--actual'),mode:process.argv.includes('--mobile')?'mobile':process.argv.includes('--graphs')?'graphs':process.argv.includes('--cls')?'cls':process.argv.includes('--smoke')?'smoke':'content'});
