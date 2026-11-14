import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {localSite} from './helpers/local-site.mjs';
import {buildArtifact,artifactServer} from '../scripts/hosting-artifact.mjs';
import {conversionPreviewServer} from '../scripts/source-first/conversion-preview.mjs';
const dir='.audit/stabilization-v2';
test('source indexed radicals become MathML mroot, including a fraction inside the radical',{timeout:120000},async()=>{
  const server=conversionPreviewServer(),site=await localSite();await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try{for(const width of [320,360,390,430,768,1024,1366,844]){const page=await site.browser.newPage({viewport:{width,height:844}});await page.goto('http://127.0.0.1:'+server.address().port+'/documents.html?grade=12&topic=CD08&section=knowledge&item=1',{waitUntil:'networkidle'});await page.locator('[data-native-pdf-knowledge]').waitFor();
    for(const [suffix,count]of [[5,1],[11,2],[35,1],[37,6]])assert.equal(await page.locator(`[data-source-block="cd08-cd11-exponential-logarithm:CD08-CD11:knowledge:block:${suffix}"] .katex-mathml mroot`).count(),count);
    assert.equal(await page.locator('.katex-error,.math-render-error').count(),0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    if(width===320){await page.locator('[data-source-block="cd08-cd11-exponential-logarithm:CD08-CD11:knowledge:block:37"]').scrollIntoViewIfNeeded();await page.screenshot({path:dir+'/indexed-radical-320.png'});}await page.close();
  }}finally{server.closeAllConnections();await new Promise(r=>server.close(r));await site.close();}
});
test('actual public-only deployable artifact works without audit or source preparation files',{timeout:180000},async()=>{
  const a=buildArtifact(),server=artifactServer(a.folder),site=await localSite();await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,states=[];
  try{for(const width of [1366,390]){const page=await site.browser.newPage({viewport:{width,height:844}}),errors=[],failed=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(new URL(r.url()).pathname);});
    for(const [path,selector]of [['/?grade=12','h1'],['/documents.html?grade=12','.roadmap-list'],['/documents.html?grade=12&topic=CD01&section=knowledge&item=1','[data-native-pdf-knowledge]'],['/documents.html?grade=12&topic=CD06&type=6.1&section=example&item=1','[data-native-graph] svg'],['/documents.html?grade=12&topic=CD20&type=20.1&section=practice&item=1','[data-practice-answer]']]){
      await page.goto(origin+path,{waitUntil:'networkidle'});await page.locator(selector).first().waitFor();if(path.includes('practice')){await page.locator('[data-practice-answer]').first().click();await page.locator('.practice-feedback').waitFor();}
      assert.equal(await page.locator('.katex-error,.math-render-error,html.curriculum-load-error').count(),0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));states.push({width,path});
    }await page.screenshot({path:dir+`/artifact-${width}.png`});assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);await page.close();}
    assert.equal((await fetch(origin+'/scripts/source-first/knowledge-pdf.py')).status,404);fs.writeFileSync(dir+'/hosting.json',JSON.stringify({passed:true,artifactHash:a.hash,states,productionDeployed:false},null,2));
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));await site.close();}
});
test('mixed formula focus and instrumented cold/warm CLS preserve source content',{timeout:180000},async()=>{
  const site=await localSite(),runs=[];
  try{
    for(const width of [320,1024])for(const cold of [true,false])for(let repeat=0;repeat<3;repeat++){
      const context=await site.browser.newContext({viewport:{width,height:768}}),page=await context.newPage();
      await page.addInitScript(()=>{window.qualityShifts=[];window.qualityMutations=[];new PerformanceObserver(l=>l.getEntries().forEach(e=>window.qualityShifts.push({value:e.value,recentInput:e.hadRecentInput,time:e.startTime,fonts:document.fonts.status,geometry:!!document.querySelector('[data-geometry-ready="true"]'),sources:e.sources?.map(s=>({tag:s.node?.tagName,class:s.node?.className,previous:s.previousRect.toJSON(),current:s.currentRect.toJSON()}))}))).observe({type:'layout-shift',buffered:true});new MutationObserver(l=>{if(window.qualityMutations.length<100)window.qualityMutations.push({time:performance.now(),targets:l.map(m=>m.target.nodeName)});}).observe(document,{subtree:true,childList:true});});
      const url=site.origin+'/documents.html?grade=12&topic=CD32&type=32.5&section=knowledge&item=1';if(!cold)await page.goto(url,{waitUntil:'networkidle'});await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(400);
      const before=await page.evaluate(()=>({shifts:qualityShifts,mutations:qualityMutations,fontState:document.fonts.status,mathNodes:document.querySelectorAll('.katex').length,measurementTime:performance.now(),resources:performance.getEntriesByType('resource').filter(e=>/katex|geometry|woff/u.test(e.name)).map(e=>({name:new URL(e.name).pathname,start:e.startTime,end:e.responseEnd})),geometry:[...document.querySelectorAll('.native-geometry')].map(e=>({ready:e.dataset.geometryReady,box:e.getBoundingClientRect().toJSON()}))}));
      const cls=before.shifts.filter(s=>!s.recentInput).reduce((n,s)=>n+s.value,0);runs.push({width,cold,repeat,cls,...before});
      await context.close();
    }
    const page=await site.browser.newPage({viewport:{width:320,height:568}});await page.goto(site.origin+'/documents.html?grade=12&topic=CD12&type=12.1&section=knowledge&item=1',{waitUntil:'networkidle'});await page.locator('details').evaluateAll(es=>es.forEach(e=>e.open=true));
    const block=page.locator('[data-source-block="cd12-cd14-calculus:12.1:knowledge:block:5"]');assert.equal(await block.locator('[data-math-scroll]').count(),5);
    const target=block.locator('[data-math-scroll]').first();await target.focus();const url=page.url();await page.keyboard.press('ArrowRight');await page.waitForTimeout(220);assert.equal(page.url(),url);assert.ok(await target.evaluate(e=>e.scrollLeft>0));await page.screenshot({path:dir+'/mixed-focus-320.png'});await page.close();
    fs.writeFileSync(dir+'/cls.json',JSON.stringify({passed:true,runs,maxInitialCLS:Math.max(...runs.map(r=>r.cls)),historicalSpike:.15950845868792385,fieldCertification:false,userAndProgrammaticChangesExcluded:true},null,2));
  }finally{await site.close();}
});
