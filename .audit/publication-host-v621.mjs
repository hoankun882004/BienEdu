import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {localSite} from '../tests/helpers/local-site.mjs';
import {root} from '../scripts/source-first/build.mjs';
import {read,json} from '../scripts/source-first/release-chain-v61.mjs';
import {publicationStatus} from '../scripts/source-first/publish-v621.mjs';
const pointer=read('.audit/source-first-v5/release-v62/publication-v621.json'),plan=read(pointer.manifest);
assert.equal(publicationStatus(plan).status,'ACTIVE');
const site=await localSite(),origin='https://bienedu.example',states=[];
const runtime=new Set(['learner.mjs','registry.mjs','lesson-workspace.mjs'].map(n=>'/scripts/source-first/runtime-v62/'+n));
try{
  for(const width of [390,1366]){
    const context=await site.browser.newContext({viewport:{width,height:844},isMobile:width===390,hasTouch:width===390,locale:'vi-VN',reducedMotion:'reduce'}),page=await context.newPage();
    const errors=[],failed=[];let requests=[];
    page.on('pageerror',e=>errors.push(e.message));
    await context.route(origin+'/**',async route=>{
      const u=new URL(route.request().url()),path=u.pathname;requests.push(path);
      if(path.startsWith('/.audit/')||path.startsWith('/.content-work/')||(path.startsWith('/scripts/source-first/')&&!runtime.has(path))){failed.push(path);return route.fulfill({status:404,body:'Not a hosting asset'});}
      const response=await context.request.get(site.origin+path+u.search);if(response.status()>=400)failed.push(path);
      await route.fulfill({response});
    });
    for(const [name,path]of [
      ['sequence','/documents.html?grade=12&topic=CD17&type=17.4&section=example&item=6&releasePreview=v6'],
      ['calculus-edition','/documents.html?grade=12&topic=CD12&type=12.8&section=example&item=3'],
      ['native-graph','/documents.html?grade=12&topic=CD06&type=6.1&section=example&item=8']]){
      requests=[];await page.goto(origin+path,{waitUntil:'networkidle'});await page.locator('.example-card').waitFor();
      const bundle=await page.evaluate(async()=>{const m=await import('/assets/js/data/learning-overlay.js');return {preview:m.previewActive,examples:m.overlayGroups.reduce((n,g)=>n+g.examples.length,0),fresh:m.overlayGroups.flatMap(g=>g.examples).filter(e=>e.origin==='source-first-v6.2').length};});
      assert.deepEqual(bundle,{preview:false,examples:980,fresh:761});
      if(name==='native-graph')await page.locator('[data-native-graph] svg').waitFor();else assert.equal(await page.locator('[data-source-v62]').count(),1);
      assert.equal(await page.locator('.katex-error,.math-render-error').count(),0);
      assert.equal(await page.evaluate(w=>document.documentElement.scrollWidth>w+1,width),false);
      assert.ok(!requests.some(p=>p.startsWith('/.audit/')||p.endsWith('.pdf')));assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
      states.push({name,width,hostname:new URL(page.url()).hostname,...bundle});
      if(name==='sequence'){mkdirSync(join(root,'.audit/publication-v621'),{recursive:true});await page.screenshot({path:join(root,`.audit/publication-v621/host-${width}.png`)});}
    }
    await context.close();
  }
  // A corrupt hosted payload must not silently display older content instead.
  const context=await site.browser.newContext(),page=await context.newPage(),expected=[];
  page.on('pageerror',e=>expected.push(e.message));
  await context.route(origin+'/**',async route=>{
    const u=new URL(route.request().url());if(u.pathname==='/'+plan.publicationBundle.file)return route.fulfill({status:200,contentType:'application/json',body:'{}'});
    await route.fulfill({response:await context.request.get(site.origin+u.pathname+u.search)});
  });
  await page.goto(origin+'/documents.html?grade=12&topic=CD17&type=17.4&section=example&item=6',{waitUntil:'networkidle'});
  assert.ok(expected.some(e=>e.includes('bundle hash mismatch')));assert.equal(await page.locator('[data-source-v62]').count(),0);await context.close();
  writeFileSync(join(root,'.audit/publication-v621/hosted.json'),json({publicationHash:plan.planHash,passed:true,simulatedHostedOrigin:origin,externalDeploymentVerified:false,states,corruptPayloadRejected:true,hostingExclusionsEnforced:true}));
  console.log(json({passed:true,states:states.length,productionHostname:true,corruptPayloadRejected:true}));
}finally{await site.close();}
