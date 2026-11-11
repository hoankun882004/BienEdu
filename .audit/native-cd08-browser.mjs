import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {localSite} from '../tests/helpers/local-site.mjs';
import {root} from '../scripts/source-first/build.mjs';
import {read,json} from '../scripts/source-first/release-chain-v61.mjs';
import {publicationStatus} from '../scripts/source-first/publish-v621.mjs';
import {exampleContent as previous} from '../assets/js/data/example-content.js';
const index=read('.audit/source-first-v5/release-v62/publication-v621.json'),plan=read(index.manifest);assert.equal(publicationStatus(plan).status,'ACTIVE');
const native=read(plan.publicationBundle.file).groups.filter(g=>g.source.sourceId===plan.nativeSource.sourceId),site=await localSite(),states=[],errors=[];
const maths=n=>n?.type==='math'?[n.latex]:(n?.segments??[]).flatMap(maths),origin='https://bienedu.example';
try{
  for(const width of [390,1366]){
    const context=await site.browser.newContext({viewport:{width,height:844},isMobile:width===390,hasTouch:width===390,locale:'vi-VN',reducedMotion:'reduce'}),page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    await context.route(origin+'/**',async route=>{const u=new URL(route.request().url());const response=await context.request.get(site.origin+u.pathname+u.search);assert.equal(response.status(),200,u.pathname);await route.fulfill({response});});
    for(const group of native){
      const offset=previous[group.code]?.length??0;
      for(const [i,example]of group.examples.entries()){
        await page.goto(`${origin}/documents.html?grade=12&topic=CD08&type=${group.code}&section=example&item=${offset+i+1}`,{waitUntil:'domcontentloaded'});
        await page.locator('[data-native-source="tex"]').waitFor();
        assert.equal(await page.locator('.example-reader__intro h2').innerText(),`Ví dụ ${i+1}`);
        assert.deepEqual(await page.locator('.example-reader__question annotation[encoding="application/x-tex"]').allTextContents(),maths(example.prompt));
        assert.ok((await page.locator('[data-native-source="tex"]').innerText()).includes(example.sourceExampleNumber));
        assert.ok(!(await page.locator('[data-native-source="tex"]').innerText()).includes('trang undefined'));
        await page.locator('.example-reader__solution>summary').click();
        assert.deepEqual(await page.locator('.example-reader__solution-body annotation[encoding="application/x-tex"]').allTextContents(),maths(example.steps[0].expression));
        const provenance=await page.evaluate(async({code,id})=>{const m=await import('/scripts/source-first/runtime-v62/registry.mjs');return m.getSubtopicAvailability(code).sections.examples.units.find(u=>u.id===id).source;},{code:group.code,id:example.id});
        assert.equal(provenance.sourceKind,'tex');assert.equal(provenance.documentId,plan.nativeSource.sourceId);assert.equal(provenance.sourceSha256,plan.nativeSource.sha256);assert.deepEqual(provenance.lines,example.sourceLines);
        if(i===0){
          const knowledge=page.locator('[data-native-source] details').first();await knowledge.locator('summary').click();
          assert.deepEqual(await knowledge.locator('annotation[encoding="application/x-tex"]').allTextContents(),maths(group.sourceContext.knowledge));
          const method=page.locator('[data-native-source] details').last();await method.locator('summary').click();
          assert.deepEqual(await method.locator('annotation[encoding="application/x-tex"]').allTextContents(),maths(group.sourceContext.method));
          assert.equal(await page.evaluate(w=>document.querySelector('[data-native-source]').getBoundingClientRect().right<=w+1,width),true,'Expanded source must fit the real viewport, not an auto-zoomed innerWidth');
          const sources=await page.evaluate(async()=>{const m=await import('/assets/js/data/documents-v6.js');return m.getDocumentsForTopic('CD08').map(s=>s.documentId??s.id);});assert.ok(sources.includes(plan.nativeSource.sourceId));
          await knowledge.locator('summary').click();await method.locator('summary').click();await page.locator('[data-native-source]').scrollIntoViewIfNeeded();
          if(['8.1','8.3','8.10','8.14'].includes(group.code)){mkdirSync(join(root,'.audit/publication-v621'),{recursive:true});await page.screenshot({path:join(root,`.audit/publication-v621/native-${group.code}-${width}.png`)});}
        }
        assert.equal(await page.locator('.katex-error,.math-render-error').count(),0);assert.equal(await page.evaluate(w=>document.documentElement.scrollWidth>w+1,width),false);assert.deepEqual(errors,[]);
        states.push({code:group.code,id:example.id,sourceExampleNumber:example.sourceExampleNumber,width,math:true,sourceKind:'tex'});
      }
      if(offset){await page.goto(`${origin}/documents.html?grade=12&topic=CD08&type=${group.code}&section=example&item=1`,{waitUntil:'domcontentloaded'});await page.locator('.example-reader__question').waitFor();assert.equal(await page.locator('[data-native-source]').count(),0,'Earlier source remains independent');}
    }
    await context.close();
  }
  assert.equal(states.length,280);assert.deepEqual(errors,[]);writeFileSync(join(root,'.audit/publication-v621/native-cd08.json'),json({publicationHash:plan.planHash,sourceHash:plan.nativeSource.sha256,passed:true,states,errors,editorialApproval:false}));
  console.log(json({passed:true,states:states.length,nativeExamples:140,knowledgeContexts:14,methodContexts:14}));
}finally{await site.close();}
