import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {localSite} from '../tests/helpers/local-site.mjs';
import {releaseFixture} from '../tests/helpers/release-v61.mjs';
import {applyContinuation,read} from '../scripts/source-first/release-chain-v61.mjs';
import {output} from '../scripts/source-first/content-v61.mjs';
import {digest} from '../scripts/source-first/model.mjs';
import {buildActivePracticeSet} from '../assets/js/domain/practice-bank.js';
import {pilotDefinitions} from '../scripts/source-first/graph-pilots.mjs';
const root=process.cwd(),maths=(n)=>n.type==='math'?[n.latex]:(n.segments??[]).flatMap(maths);
const prose=(n)=>n.type==='text'?[n.value]:(n.segments??[]).flatMap(prose),compact=(s)=>s.replace(/\s+/gu,' ').trim();
export async function validateContinuationSite({plan=null,fixture=true,mode='content'}={}){
  const report=read(`${output}/inventory.json`);plan??=read(report.manifest);
  const content=read(`${output}/content.json`),original=new Map(plan.files.map((f)=>[f.file,digest(readFileSync(join(root,f.file)))]));
  const f=fixture?releaseFixture(plan):null;
  if(f)applyContinuation(plan,{base:f.base,execute:true,development:true,authorize:plan.planHash});
  const site=await localSite({fixtureRoot:f?.base}),states=[],errors=[];
  const viewports=mode==='mobile'?[[320,568],[360,800],[390,844],[430,932],[768,1024],[1024,768],[1366,768],[844,390]]:mode==='smoke'?[[390,844]]:[[390,844],[1366,768]];
  const route=(code,section,item=1)=>`/documents.html?grade=12&topic=CD${code.split('.')[0].padStart(2,'0')}&type=${code}&section=${section}&item=${item}&releasePreview=off`;
  try{
    for(const [width,height]of viewports){
      const phone=width<768||height<500,context=await site.browser.newContext({viewport:{width,height},isMobile:phone,hasTouch:phone,locale:'vi-VN',reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',(e)=>errors.push(e.message));
      await page.addInitScript(()=>{globalThis.__v61CLS=0;if(PerformanceObserver.supportedEntryTypes.includes('layout-shift'))new PerformanceObserver((list)=>{for(const item of list.getEntries())if(!item.hadRecentInput)globalThis.__v61CLS+=item.value;}).observe({type:'layout-shift',buffered:true});});
      const health=async(name)=>{
        const value=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,mathErrors:document.querySelectorAll('.katex-error,.math-render-error').length,
          graphCount:document.querySelectorAll('[data-native-graph]').length,mainCount:document.querySelectorAll('main').length,pdfLoads:performance.getEntriesByType('resource').filter((r)=>new URL(r.name).pathname.endsWith('.pdf')).length,
          graphLoads:performance.getEntriesByType('resource').filter((r)=>r.name.includes('jsxgraphcore')).length,dcl:performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd,cls:globalThis.__v61CLS}));
        assert.equal(value.overflow,false,`${name}@${width}`);assert.equal(value.mathErrors,0,`${name}@${width}`);assert.equal(value.pdfLoads,0);assert.equal(value.mainCount,1);states.push({name,width,height,...value});
      };
      const visit=async(path)=>{
        await page.goto(site.origin+path,{waitUntil:'domcontentloaded'});await page.locator('#main-content').waitFor();
        if(path.startsWith('/documents.html'))await page.waitForFunction(()=>!document.querySelector('.roadmap-loading'));
        // Wait for the actual render/fonts/layout rather than an arbitrary
        // network-idle delay on every one of the hundreds of source records.
        await page.evaluate(()=>document.fonts.ready.then(()=>new Promise((done)=>requestAnimationFrame(()=>requestAnimationFrame(done)))));
      };
      if(['content','smoke'].includes(mode)){
        const groups=mode==='smoke'?content.groups.filter((g)=>['17.5','15.2','28.3'].includes(g.code)):content.groups;
        for(const group of groups){
          await visit(route(group.code,'knowledge'));await page.locator('.math-lesson').waitFor();await health(`knowledge-${group.code}`);
          for(const latex of maths(group.knowledge.lead))assert.ok((await page.locator('.math-lesson annotation[encoding="application/x-tex"]').allTextContents()).includes(latex),`Knowledge formula retained: ${group.code} ${latex}`);
          const knowledgeText=compact(await page.locator('.math-lesson').innerText());for(const text of prose(group.knowledge.lead).map(compact).filter((s)=>s.length>4))assert.ok(knowledgeText.includes(text),`Knowledge wording retained: ${group.code} ${text}`);
          assert.equal((await page.evaluate(()=>performance.getEntriesByType('resource').filter((r)=>r.name.includes('jsxgraphcore')).length)),0,'No graph engine for new text lessons');
          const examples=mode==='smoke'?group.examples.slice(0,2):group.examples;
          for(const [index,example]of examples.entries()){
            await visit(route(group.code,'example',index+1));await page.locator('.example-reader__solution').waitFor();
            assert.equal(await page.locator('.example-reader__intro h2').innerText(),`Ví dụ ${example.originalExampleNumber}`);
            assert.equal(await page.locator('.example-reader__solution[open]').count(),0,'Source solution hidden until requested');
            await page.locator('.example-reader__solution>summary').click();
            const actual=await page.locator('.example-card annotation[encoding="application/x-tex"]').allTextContents(),expected=[...maths(example.prompt),...maths(example.steps[0].expression)];
            assert.deepEqual(actual,expected,`No missing/duplicate source formula: ${example.id}`);await health(example.id);
            const questionText=compact(await page.locator('.example-reader__question').innerText()),solutionText=compact(await page.locator('.example-reader__solution-body').innerText());
            for(const [node,actualText]of [[example.prompt,questionText],[example.steps[0].expression,solutionText]])for(const text of prose(node).map(compact).filter((s)=>s.length>4))assert.ok(actualText.includes(text),`Source wording retained: ${example.id} ${text}`);
            assert.equal(await page.locator('.example-card').innerText().then((t)=>t.includes('Đang đối chiếu')),true,'No fabricated editorial approval');
            if(group.code==='28.6'&&index===0)await page.screenshot({path:join(root,output,`vector-dot-${width}.png`)});
          }
          if(['17.5','15.2','28.3','33.11'].includes(group.code))await page.screenshot({path:join(root,output,`example-${group.code}-${width}.png`)});
        }
      }
      if(mode==='parent'){await visit(route('17.1','example',3));await page.locator('.example-card').waitFor();assert.ok(await page.locator('.example-card mfrac').count());await health('retained-parent-17.1');}
      if(['mobile','graphs','parent'].includes(mode)){
        const pages=['graphs','parent'].includes(mode)?[]:[['home','/?grade=12'],['roadmap','/documents.html?grade=12'],['topic','/documents.html?grade=12&topic=CD28'],['knowledge',route('28.3','knowledge')],['method',route('28.3','types')],['new-example',route('18.2','example',10)]];
        for(const [name,path]of pages){await visit(path);await health(name);if(name==='new-example'){
          const current=page.locator('.example-index a[aria-current="page"]');assert.equal(await current.evaluate((a)=>{const list=a.closest('ol'),r=a.getBoundingClientRect(),p=list.getBoundingClientRect();return r.left>=p.left-1&&r.right<=p.right+1;}),true,'Active example stays visible without page scrolling');
          const progress=await page.locator('.example-index header').innerText();await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('.example-index header').innerText(),progress);await page.screenshot({path:join(root,output,`mobile-current-${width}.png`)});
          const settled=()=>page.waitForFunction(()=>!document.querySelector('[data-lesson-stage]')?.classList.contains('is-entering'));
          // Previous is intentionally history-aware (V4.1), not a slide-index
          // button. Establish real 9 -> 10 history through existing controls.
          await page.locator('.example-index a[href*="item=9"]').click();await page.waitForFunction(()=>document.querySelector('.example-reader__intro h2')?.textContent==='Ví dụ 9');await settled();
          await page.locator('.lesson-navigation .nav-button--primary[data-slide-index]').click();await page.waitForFunction(()=>document.querySelector('.example-reader__intro h2')?.textContent==='Ví dụ 10');await settled();
          const pageY=await page.evaluate(()=>scrollY);await page.locator('.lesson-navigation [data-history-back]').click();
          await page.waitForFunction(()=>new URL(location.href).searchParams.get('item')==='9');await settled();assert.equal(await page.locator('.example-reader__intro h2').innerText(),'Ví dụ 9');assert.equal(await page.evaluate(()=>scrollY),pageY,'SPA previous does not jump the outer page');await health('new-example-spa-previous');
          await page.goForward({waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('.example-reader__intro h2')?.textContent==='Ví dụ 10');await settled();
          await page.keyboard.press('ArrowLeft');await page.waitForFunction(()=>new URL(location.href).searchParams.get('item')==='9');await settled();await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>new URL(location.href).searchParams.get('item')==='10');await settled();await health('new-example-history-keyboard');
        }}
        const bundle=read(plan.bundle);
        for(const graph of bundle.graphs){const code=graph.target.recordId.match(/^\d+\.\d+/u)[0],item=Number(graph.target.recordId.match(/example-(\d+)$/u)[1]);
          await visit(route(code,'example',item));await page.locator('[data-graph-replacement]').waitFor();await health(`pilot-${graph.id??graph.target.recordId}`);assert.equal(await page.locator('[data-graph-replacement]').count(),1,'One graph/table replacement per source target');
          if(graph.spec.type==='function-2d'){assert.equal(await page.locator('[data-native-graph]').count(),1);assert.equal(await page.locator('.native-graph__legend,.native-graph annotation').count(),0,'Recognition graph does not reveal selected equation or derived answer legend');const b=page.locator('.native-graph__board');assert.ok(await b.evaluate((n)=>{const r=n.getBoundingClientRect();return r.width>0&&r.left>=-1&&r.right<=innerWidth+1;}));}
          const properties=await page.evaluate(async({samples})=>{const m=await import('/assets/js/components/graph-renderer.js'),host=document.querySelector('[data-native-graph]'),state=m.getGraphInstance(host);return {count:m.activeGraphCount(),values:samples.every(([x,y])=>state.curves.some(({curve})=>Math.abs(curve.Y(x)-y)<1e-8)),table:host.querySelectorAll('table').length};},{samples:pilotDefinitions.find((p)=>p.figureId===graph.spec.id).samples??[]});
          assert.equal(properties.count,1);assert.equal(properties.values,true);assert.equal(properties.table,graph.spec.type==='variation-table'?1:0);
          if(graph.spec.type==='variation-table'&&width===320){const table=page.locator('.native-variation');await table.focus();const url=page.url();await page.keyboard.press('ArrowRight');assert.equal(page.url(),url);assert.ok(await table.evaluate((n)=>n.scrollLeft>0),'Table keys scroll locally, not to a different lesson');}
          if(code==='6.1'&&item===7)await page.screenshot({path:join(root,output,`graph-${width}.png`)});
        }
        if(mode==='mobile'){
          await visit(route('20.1','practice'));const questions=buildActivePracticeSet('20.1','PRACTICE_V15');await page.locator(`[data-practice-answer="${questions[0].correctIndex}"]`).click();await page.locator('.practice-feedback.is-correct').waitFor();await page.reload({waitUntil:'networkidle'});await page.locator('.practice-feedback.is-correct').waitFor();await health('practice-correct-persistence');
          await visit(route('20.1','practice',2));await page.locator(`[data-practice-answer="${(questions[1].correctIndex+1)%questions[1].options.length}"]`).click();await page.locator('.practice-feedback.is-wrong').waitFor();await health('practice-wrong');
          if(width<760){await page.locator('.menu-toggle').click();await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('.site-nav').inert);}
        }
      }
      await context.close();
    }
    assert.deepEqual(errors,[]);
    if(f){applyContinuation(plan,{base:f.base,execute:true,development:true,authorize:plan.planHash,rollback:true});const page=await site.browser.newPage();await page.goto(site.origin+route('17.1','example',3),{waitUntil:'networkidle'});await page.locator('.example-reader').waitFor();assert.ok(await page.locator('.example-card mfrac').count());await page.close();}
    for(const [file,hash]of original)assert.equal(digest(readFileSync(join(root,file))),hash,'Real runtime untouched by browser fixtures');
    const result={passed:true,mode,planHash:plan.planHash,states,errors,fixtureApplyRollback:Boolean(f),actualRuntime:!f,realRuntimeWrites:0,physicalSafariCertified:false};
    mkdirSync(join(root,output),{recursive:true});writeFileSync(join(root,output,`browser-${mode}.json`),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({mode,passed:true,states:states.length,errors:errors.length,realRuntimeWrites:0}));return result;
  }finally{await site.close();f?.cleanup();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await validateContinuationSite({mode:process.argv.includes('--smoke')?'smoke':process.argv.includes('--mobile')?'mobile':process.argv.includes('--graphs')?'graphs':'content'});
