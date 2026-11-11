import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {localSite} from './helpers/local-site.mjs';
import {recordLocalPdfVisibility} from '../scripts/source-first/local-pdf-visibility.mjs';
const origin=process.env.BIENEDU_LOCAL_URL??null;
test('active PDF content wins over stale preview state without clearing progress, on desktop/mobile',async()=>{
  const receipt=recordLocalPdfVisibility();assert.equal(receipt.status,'APPLIED_LOCAL_ONLY');
  const site=await localSite(),states=[];
  const progress=JSON.stringify({version:2,lessons:{'20.1':{viewedKnowledge:['keep'],practiceAnswers:{KEEP:{correct:true}}}},exams:{}});
  try{
    for(const width of [390,1366])for(const mode of ['ordinary','stale-session','old-bookmark']){
      const context=await site.browser.newContext({viewport:{width,height:844},isMobile:width===390,hasTouch:width===390});
      await context.addInitScript(({mode,progress})=>{
        if(!sessionStorage.getItem('visibility-test-seeded')){
          sessionStorage.setItem('visibility-test-seeded','yes');sessionStorage.setItem('keep-other-session-state','retained');
          if(mode!=='ordinary')sessionStorage.setItem('bienedu:local-preview:v6','on');
          localStorage.setItem('bienedu:progress:v2:grade11',progress);
        }
      },{mode,progress});
      const page=await context.newPage(),errors=[],responses=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>responses.push(r.url()));
      const base=origin??site.origin;
      for(const [name,path]of [['trigonometry','topic=CD15&type=15.1&section=example&item=1'],['vectors','topic=CD28&type=28.1&section=example&item=1'],['calculus','topic=CD12&type=12.8&section=example&item=3']]){
        await page.goto(`${base}/documents.html?grade=12&${path}${mode==='old-bookmark'?'&releasePreview=v6':''}`,{waitUntil:'networkidle'});
        await page.locator('.example-reader__question').waitFor();
        const data=await page.evaluate(async()=>{const m=await import('/assets/js/data/learning-overlay.js');return {preview:m.previewActive,examples:m.overlayGroups.reduce((n,g)=>n+g.examples.length,0),stale:sessionStorage.getItem('bienedu:local-preview:v6'),other:sessionStorage.getItem('keep-other-session-state'),progress:localStorage.getItem('bienedu:progress:v2:grade11')};});
        assert.equal(data.preview,false);assert.equal(data.examples,980);assert.equal(data.stale,null);assert.equal(data.other,'retained');assert.equal(data.progress,progress);
        assert.equal(await page.locator('[data-source-v62]').count(),1);await page.locator('.example-reader__solution>summary').click();await page.locator('.example-reader__solution-body').waitFor();
        assert.equal(await page.locator('.katex-error,.math-render-error').count(),0);assert.equal(await page.evaluate(w=>document.documentElement.scrollWidth>w+1,width),false);
        assert.ok(!responses.some(url=>new URL(url).pathname==='/.audit/source-first-v5/release-v6/bundle.json'));assert.deepEqual(errors,[]);
        states.push({name,mode,width,examples:data.examples,preview:data.preview});
        if(name==='trigonometry'&&mode==='stale-session'){mkdirSync('.audit/local-pdf-visibility',{recursive:true});await page.screenshot({path:`.audit/local-pdf-visibility/fixed-${width}.png`});}
      }
      await context.close();
    }
    // Before any content is activated, explicit development preview still works.
    const context=await site.browser.newContext();await context.route('**/assets/js/data/local-release.js',r=>r.fulfill({contentType:'text/javascript',body:'export const localRelease=null;'}));
    const page=await context.newPage();await page.goto((origin??site.origin)+'/documents.html?grade=12&topic=CD17&type=17.1&section=example&item=1&releasePreview=v6',{waitUntil:'networkidle'});
    const preview=await page.evaluate(async()=>{const m=await import('/assets/js/data/learning-overlay.js');return {active:m.previewActive,examples:m.overlayGroups.reduce((n,g)=>n+g.examples.length,0)};});assert.deepEqual(preview,{active:true,examples:10});await context.close();
    assert.equal(states.length,18);recordLocalPdfVisibility();
    writeFileSync('.audit/local-pdf-visibility/browser.json',JSON.stringify({passed:true,receiptHash:receipt.planHash,actualLocalURL:origin,states,unactivatedDevelopmentPreviewPreserved:true,studentProgressPreserved:true},null,2)+'\n');
  }finally{await site.close();}
});
