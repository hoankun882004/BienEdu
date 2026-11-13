import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {localSite} from './helpers/local-site.mjs';
import {privatePath} from '../scripts/check-hosting.mjs';

const production='https://bienedu-host-test.vercel.app';
async function publicContext(site,viewport,{missing=null}={}){
  const context=await site.browser.newContext({viewport,isMobile:viewport.width===390,hasTouch:viewport.width===390,reducedMotion:'reduce'}),requests=[],failed=[];
  await context.route(production+'/**',async route=>{
    const url=new URL(route.request().url()),path=url.pathname;requests.push(path);
    // Model the actual failure: NO scripts/, audit or local-work files exist
    // on the hosting CDN. Do not fall back to source files for missing modules.
    if(privatePath(path)||path===missing){failed.push(path);return route.fulfill({status:404,contentType:'text/plain',body:'Not a public hosting asset'});}
    const response=await context.request.get(site.origin+path+url.search);if(response.status()>=400)failed.push(path);await route.fulfill({response});
  });return {context,requests,failed};
}

test('five public pages and real learning routes work with ALL tooling paths denied',{timeout:180000},async()=>{
  const site=await localSite(),states=[];mkdirSync('.audit/hosting-fix/screenshots',{recursive:true});
  try{
    for(const width of [1366,390]){
      const {context,requests,failed}=await publicContext(site,{width,height:844}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>{localStorage.setItem('hosting-progress-marker','keep');localStorage.setItem('bienedu:progress:v2:grade11','{"version":2,"lessons":{},"exams":{}}');sessionStorage.setItem('bienedu:local-preview:v6','on');});
      for(const entry of ['/?grade=12','/course.html?grade=12','/quiz.html?grade=12','/contact.html?grade=12','/documents.html?grade=12']){
        await page.goto(production+entry,{waitUntil:'networkidle'});await page.locator('.site-header').waitFor();
        if(entry.startsWith('/documents'))await page.locator('#roadmap-title').waitFor();
        assert.equal(await page.locator('html.curriculum-load-error').count(),0,entry);states.push({width,entry});
      }
      for(const [topic,code,section,item]of [['CD12','12.1','knowledge',1],['CD17','17.4','example',6],['CD28','28.1','example',1],['CD06','6.1','example',8],['CD33','33.8','knowledge',1]]){
        const route=`/documents.html?grade=12&topic=${topic}&type=${code}&section=${section}&item=${item}&releasePreview=v6`;
        await page.goto(production+route,{waitUntil:'networkidle'});await page.locator('.learning-workspace').waitFor();
        if(section==='example')await page.locator('.example-card').waitFor();else await page.locator('[data-native-pdf-knowledge]').waitFor();
        if(code==='6.1')await page.locator('[data-native-graph] svg').waitFor();
        if(code==='33.8'){
          const host=page.locator('[data-source-geometry]');await host.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('[data-geometry-ready="true"]'));
          assert.equal(await host.locator('svg').count(),1);await host.getByRole('button',{name:'Xoay phải',exact:true}).click();
          await page.screenshot({path:`.audit/hosting-fix/screenshots/geometry-public-${width}.png`});
        }
        const payload=await page.evaluate(async()=>{const data=await import('/assets/js/data/learning-overlay.js');return {preview:data.previewActive,examples:data.overlayGroups.reduce((n,g)=>n+g.examples.length,0)};});assert.deepEqual(payload,{preview:false,examples:980});
        assert.equal(await page.locator('.katex-error,.math-render-error').count(),0,route);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1),false,route);states.push({width,entry:route});
      }
      await page.goto(production+'/documents.html?grade=12&topic=CD20&type=20.1&section=practice&item=1',{waitUntil:'networkidle'});await page.locator('[data-practice-answer]').first().click();await page.locator('.practice-feedback').waitFor();
      const progress=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('bienedu:progress:'))));await page.reload({waitUntil:'networkidle'});await page.locator('.practice-feedback').waitFor();assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('bienedu:progress:')))),progress);
      assert.equal(await page.evaluate(()=>localStorage.getItem('hosting-progress-marker')),'keep');
      assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.ok(!requests.some(privatePath));await context.close();
    }
    writeFileSync('.audit/hosting-fix/browser.json',JSON.stringify({passed:true,simulatedProductionOrigin:production,externalDeploymentVerified:false,states,toolingPathsDenied:true,practiceReload:true,progressPreserved:true},null,2)+'\n');
  }finally{await site.close();}
});

test('missing public module fails visibly with an appropriate hosted error, not a local-server instruction',{timeout:60000},async()=>{
  const site=await localSite();try{
    const {context,failed}=await publicContext(site,{width:390,height:844},{missing:'/assets/js/runtime/registry.js'}),page=await context.newPage();
    await page.goto(production+'/documents.html?grade=12',{waitUntil:'networkidle'});await page.locator('html.curriculum-load-error').waitFor();
    assert.ok(failed.includes('/assets/js/runtime/registry.js'));assert.match(await page.locator('.roadmap-loading__error p').innerText(),/mô-đun|dữ liệu/u);assert.doesNotMatch(await page.locator('.roadmap-loading__error p').innerText(),/local server/u);await context.close();
  }finally{await site.close();}
});
