import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,existsSync,mkdtempSync,mkdirSync,copyFileSync,rmSync} from 'node:fs';
import {resolve,join,sep,extname,dirname,relative} from 'node:path';
import {tmpdir} from 'node:os';
import {chromium} from 'playwright-core';
import {graphFixtures} from '../tests/helpers/graph-fixtures.mjs';
import {buildActivePracticeSet} from '../assets/js/domain/practice-bank.js';
import {pilotDefinitions} from '../scripts/source-first/graph-pilots.mjs';
import {executeGraphExperiment,activationFile} from '../scripts/source-first/graph-experiment.mjs';
const root=process.cwd(),output=join(root,'.audit/source-first-v5/graphs-v5.8');
const candidates=JSON.parse(readFileSync(join(output,'candidates.json'),'utf8'));
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
let activationFixture;
const server=createServer((req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://local').pathname),file=activationFixture&&path==='/'+activationFile?join(activationFixture,activationFile):resolve(root,'.'+path);assert.ok(file.startsWith(root+sep)||activationFixture&&file===join(activationFixture,activationFile));const bytes=readFileSync(file);res.writeHead(200,{'content-type':mime[extname(file)]??'application/octet-stream','cache-control':'no-store'});res.end(bytes);}catch{res.writeHead(404);res.end();}});
await new Promise((done)=>server.listen(0,'127.0.0.1',done));
const origin=`http://127.0.0.1:${server.address().port}`,executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath,headless:true}),states=[],errors=[],performance=[];
try{
  for(const viewport of [{width:1366,height:768},{width:390,height:844}]){
    const context=await browser.newContext({viewport,isMobile:viewport.width===390,hasTouch:viewport.width===390,locale:'vi-VN',reducedMotion:'reduce'}),page=await context.newPage();
    page.on('pageerror',(error)=>errors.push(error.message));
    await page.goto(`${origin}/documents.html?grade=12&topic=CD20&type=20.1&section=knowledge&item=1`,{waitUntil:'networkidle'});
    assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').filter((r)=>r.name.includes('jsxgraph')).length),0,'Text lessons must not load JSXGraph');
    await page.goto(`${origin}/.audit/source-first-v5/graphs-v5.8/preview.html`,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>document.querySelectorAll('.native-graph__board svg').length===5);
    assert.equal(await page.locator('.native-variation table').count(),1);
    assert.equal(await page.locator('img').count(),0,'No PDF raster graphs in preview');
    await page.screenshot({path:join(output,`preview-${viewport.width}.png`)});
    for(const candidate of candidates){
      const {target,spec}=candidate,started=Date.now();
      await page.goto(`${origin}/documents.html?grade=12&topic=${target.topic}&type=${target.code}&section=example&item=${target.item}&graphPreview=v58`,{waitUntil:'networkidle'});
      const selector=`[data-graph-replacement="${spec.id}"]`;await page.locator(selector).waitFor();
      const graph=page.locator(`${selector} [data-native-graph]`);await graph.scrollIntoViewIfNeeded();
      const health=await page.evaluate(async({id,samples})=>{
        const engine=await import('/assets/js/components/graph-renderer.js'),host=document.querySelector(`[data-native-graph="${id}"]`),state=engine.getGraphInstance(host);
        const visibleImages=[...host.parentElement.querySelectorAll('img')].filter((i)=>i.getClientRects().length>0).length;
        const plot=host.querySelector('.native-graph__board'),rect=plot?.getBoundingClientRect();
        const labelsWithinBoard=!plot||[...plot.querySelectorAll('text')].filter((t)=>t.textContent&&t.getBoundingClientRect().width>0).every((t)=>{const b=t.getBoundingClientRect();return b.left>=rect.left-1&&b.right<=rect.right+1&&b.top>=rect.top-1&&b.bottom<=rect.bottom+1;});
        const valuesMatch=samples.every(([x,y])=>state.curves.some(({curve})=>Math.abs(curve.Y(x)-y)<1e-8));
        return {count:engine.activeGraphCount(),svg:host.querySelectorAll('.native-graph__board svg').length,table:host.querySelectorAll('table').length,visibleImages,valuesMatch,labelsWithinBoard,
          curves:state.curves.length,overflow:document.documentElement.scrollWidth>innerWidth+1,mathErrors:host.querySelectorAll('.katex-error,.math-render-error').length,
          hasFormulaLeak:!!host.querySelector('.canonical-math')&&state.spec.type==='function-2d',plotWidth:host.querySelector('.native-graph__board')?.clientWidth??0,plotHeight:host.querySelector('.native-graph__board')?.clientHeight??0};
      },{id:spec.id,samples:pilotDefinitions.find((p)=>p.figureId===spec.id).samples??[]});
      assert.equal(health.count,1);assert.equal(health.visibleImages,0);assert.equal(health.overflow,false);assert.equal(health.mathErrors,0);assert.equal(health.hasFormulaLeak,false);assert.equal(health.valuesMatch,true);assert.equal(health.labelsWithinBoard,true,`${spec.id} labels must not be clipped`);
      if(spec.type==='function-2d'){assert.equal(health.svg,1);assert.ok(health.plotWidth>200);assert.ok(health.plotWidth<=viewport.width-16,'Graph must fit inside the learner viewport');assert.ok(health.plotHeight>=280);assert.equal(health.curves,spec.branches[0].exclusions.length?2:1);}
      else assert.equal(health.table,1);
      await page.screenshot({path:join(output,`learner-${spec.id}-${viewport.width}.png`)});
      if(spec.type==='function-2d')await graph.locator('.native-graph__board').screenshot({path:join(output,`board-${spec.id}-${viewport.width}.png`)});
      states.push({kind:'learner',id:spec.id,viewport,...health});performance.push({id:spec.id,width:viewport.width,navigationAndMountMs:Date.now()-started});
      if(spec.id==='6.1-example-7-figure-1'){
        const before=await page.evaluate(async()=>{const m=await import('/assets/js/components/graph-renderer.js');return m.getGraphInstance(document.querySelector('[data-native-graph]')).board.getBoundingBox();});
        await graph.getByRole('button',{name:'Phóng to',exact:true}).click();
        const zoomed=await page.evaluate(async()=>{const m=await import('/assets/js/components/graph-renderer.js');return m.getGraphInstance(document.querySelector('[data-native-graph]')).board.getBoundingBox();});assert.ok(zoomed[2]-zoomed[0]<before[2]-before[0]);
        await graph.getByRole('button',{name:'Đặt lại góc nhìn'}).click();
        const reset=await page.evaluate(async()=>{const m=await import('/assets/js/components/graph-renderer.js');return m.getGraphInstance(document.querySelector('[data-native-graph]')).board.getBoundingBox();});assert.ok(reset.every((v,i)=>Math.abs(v-before[i])<1e-9),'Reset restores original bounds within floating-point tolerance');
        await graph.locator('.native-graph__board').focus();await page.keyboard.press('ArrowRight');
        assert.ok((await page.url()).includes('item=7'),'Graph arrows must not advance lesson');await page.keyboard.press('Home');
        if(viewport.width===390){
          const plot=graph.locator('.native-graph__board');await plot.scrollIntoViewIfNeeded();const box=await plot.boundingBox(),cdp=await context.newCDPSession(page);
          const x=box.x+box.width/2,y=Math.min(viewport.height-160,Math.max(180,box.y+box.height/2));
          const touches=[{x:x-35,y,id:1},{x:x+35,y,id:2}];
          await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touches});
          await page.waitForTimeout(80);
          for(const delta of [8,16,25,35]){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:touches.map((t)=>({...t,x:t.x+delta}))});await page.waitForTimeout(40);}
          await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
          const moved=await page.evaluate(async()=>{const m=await import('/assets/js/components/graph-renderer.js');return m.getGraphInstance(document.querySelector('[data-native-graph]')).board.getBoundingBox();});
          assert.ok(moved.some((v,i)=>Math.abs(v-before[i])>1e-6),'Two-finger mobile pan must change bounds');await cdp.detach();
          await page.screenshot({path:join(output,'touch-pan-mobile.png')});
          await graph.getByRole('button',{name:'Đặt lại góc nhìn'}).click();
        }
        await page.locator('.nav-button--primary[data-slide-index]').click();await page.locator('[data-graph-replacement="6.1-example-8-figure-1"]').waitFor();
        assert.equal(await page.evaluate(async()=>(await import('/assets/js/components/graph-renderer.js')).activeGraphCount()),1,'Old board disposed on navigation');
        await page.locator('.nav-button--primary[data-slide-index]').click();await page.locator('[data-graph-replacement="6.1-example-9-figure-1"]').waitFor();
        assert.equal(await page.evaluate(async()=>(await import('/assets/js/components/graph-renderer.js')).activeGraphCount()),1);
      }
    }
    // Engineering fixtures mounted INSIDE a real learner panel, not claimed as source content.
    for(const fixture of graphFixtures){
      await page.goto(`${origin}/documents.html?grade=12&topic=CD20&type=20.1&section=knowledge&item=1`,{waitUntil:'networkidle'});
      const properties=await page.evaluate(async(fixture)=>{
        const engine=await import('/assets/js/components/graph-renderer.js'),schema=await import('/assets/js/components/graph-spec.js');
        if(!document.querySelector('link[data-test-graphs]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/assets/native-graphs.css';link.dataset.testGraphs='';document.head.append(link);await new Promise((r)=>link.onload=r);}
        const panel=document.querySelector('[data-lesson-content]'),host=document.createElement('section');panel.replaceChildren(host);
        const state=await engine.mountGraph(fixture.spec,host),svg=host.querySelector('svg');await engine.mountGraph(fixture.spec,host);
        const stable=svg===host.querySelector('svg');
        const sampled=state.curves.map(({curve,interval})=>({interval,points:curve.points.filter((p)=>p?.usrCoords&&Number.isFinite(p.usrCoords[1])&&Number.isFinite(p.usrCoords[2])).map((p)=>p.usrCoords.slice(1))}));
        const valueChecks=fixture.values.every(([x,y])=>{const b=fixture.branches.find((b)=>schema.domainContains(b,x));return b&&Math.abs(schema.branchFunction(b)(x)-y)<1e-9;});
        const invalid=fixture.invalid.every((x)=>fixture.branches.every((b)=>Number.isNaN(schema.branchFunction(b)(x))));
        const result={stable,count:engine.activeGraphCount(),curveCount:state.curves.length,valueChecks,invalid,sampled,mathErrors:host.querySelectorAll('.math-render-error,.katex-error').length,overflow:document.documentElement.scrollWidth>innerWidth+1};
        return result;
      },fixture);
      assert.equal(properties.stable,true);assert.equal(properties.count,1);assert.equal(properties.curveCount,fixture.curveCount);assert.equal(properties.valueChecks,true);assert.equal(properties.invalid,true);assert.equal(properties.overflow,false);assert.equal(properties.mathErrors,0);
      for(const {interval,points}of properties.sampled){assert.ok(points.length>=2,`${fixture.id}: each curve must have drawable points`);for(const [x]of points){const min=interval.min==='-inf'?-Infinity:interval.min,max=interval.max==='inf'?Infinity:interval.max;assert.ok(x>=min-1e-9&&x<=max+1e-9);}}
      for(const branch of fixture.branches)for(const excluded of branch.exclusions)for(const {points}of properties.sampled)assert.ok(!points.some(([x])=>x<excluded)||!points.some(([x])=>x>excluded),'No single curve bridges a hole/pole');
      if(['piecewise','removable-hole','radical'].includes(fixture.id))await page.screenshot({path:join(output,`fixture-${fixture.id}-${viewport.width}.png`)});
      await page.evaluate(async()=>{const e=await import('/assets/js/components/graph-renderer.js');e.disposeGraph(document.querySelector('[data-native-graph]'));});
      assert.equal(await page.evaluate(async()=>(await import('/assets/js/components/graph-renderer.js')).activeGraphCount()),0);
      delete properties.sampled;states.push({kind:'technical-fixture',id:fixture.id,viewport,...properties});
    }
    // Real scoring and persistence are still the existing learning engine.
    await page.goto(`${origin}/documents.html?grade=12&topic=CD20&type=20.1&section=practice&item=1`,{waitUntil:'networkidle'});
    const question=buildActivePracticeSet('20.1','PRACTICE_V15')[0];await page.locator(`[data-practice-answer="${question.correctIndex}"]`).click();await page.locator('.practice-feedback.is-correct').waitFor();
    await page.reload({waitUntil:'networkidle'});await page.locator('.practice-feedback.is-correct').waitFor();
    const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('bienedu:progress:v2:grade12')));assert.equal(stored.lessons['20.1'].practiceAnswers[question.id].correct,true);
    states.push({kind:'practice-persistence',viewport,passed:true});await context.close();
  }
  // An actual authorized activation file in an isolated filesystem fixture,
  // served by the same static server. No page.route or JS module rewriting.
  const experiment=JSON.parse(readFileSync(join(output,'experiment.json'),'utf8')),plan=JSON.parse(readFileSync(join(root,experiment.manifest),'utf8'));
  activationFixture=mkdtempSync(join(tmpdir(),'bienedu-graph-browser-'));
  try{
    for(const file of [...plan.dependencies.map((d)=>d.file),plan.bundle,plan.target,experiment.manifest,`.content-work/graphs-v5.8/${plan.planHash}/before.txt`]){const to=join(activationFixture,file);mkdirSync(dirname(to),{recursive:true});copyFileSync(join(root,file),to);}
    const options={base:activationFixture,authorize:plan.planHash,development:true,execute:true};executeGraphExperiment(plan,options);
    for(const viewport of [{width:1366,height:768},{width:390,height:844}]){
      const page=await browser.newPage({viewport});page.on('pageerror',(e)=>errors.push(e.message));
      await page.goto(`${origin}/documents.html?grade=12&topic=CD06&type=6.1&section=example&item=7`,{waitUntil:'networkidle'});await page.locator('[data-graph-replacement]').waitFor();
      assert.equal(await page.locator('[data-native-graph]').count(),1);states.push({kind:'authorized-fixture-activation',viewport,passed:true});await page.close();
    }
    executeGraphExperiment(plan,{...options,rollback:true});
    const page=await browser.newPage();await page.goto(`${origin}/documents.html?grade=12&topic=CD06&type=6.1&section=example&item=7`,{waitUntil:'networkidle'});
    assert.equal(await page.locator('[data-native-graph]').count(),0);assert.ok(await page.locator('.example-reader__figures img').isVisible());
    assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').filter((r)=>r.name.includes('jsxgraph')).length),0);
    states.push({kind:'authorized-fixture-rollback',passed:true});await page.close();
  }finally{const directory=activationFixture;activationFixture=null;const rel=relative(resolve(tmpdir()),resolve(directory));assert.ok(rel&&!rel.startsWith('..'));rmSync(directory,{recursive:true,force:true});}
  assert.deepEqual(errors,[]);writeFileSync(join(output,'browser.json'),JSON.stringify({passed:true,states,errors,performance,realRuntimeWrites:0},null,2)+'\n');console.log(JSON.stringify({passed:true,states:states.length,errors}));
}finally{await browser.close();server.closeAllConnections();await new Promise((done)=>server.close(done));}
