import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {localSite} from './helpers/local-site.mjs';

test('real learner knowledge, source editions, notes and practice on desktop/mobile',async()=>{
  const site=await localSite(),states=[];
  const routes=[['CD01',null],['CD06',null],['CD08',null],['CD12','12.1'],['CD13','13.3'],['CD14','14.9'],['CD15','15.1'],['CD15','15.6'],['CD17','17.1'],['CD19','19.1'],['CD20','20.1'],['CD21','21.8'],['CD28','28.1'],['CD32','32.5']];
  mkdirSync('.audit/pdf-knowledge/screenshots',{recursive:true});
  try{
    for(const width of [1366,390]){
      const context=await site.browser.newContext({viewport:{width,height:844},isMobile:width===390,hasTouch:width===390});
      const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>localStorage.setItem('keep-progress-marker','do-not-clear'));
      for(const [topic,code]of routes){
        await page.goto(`${site.origin}/documents.html?grade=12&topic=${topic}${code?'&type='+code:''}&section=knowledge&item=1`,{waitUntil:'networkidle'});
        await page.locator('[data-native-pdf-knowledge]').waitFor();
        assert.equal(await page.locator('.katex-error,.math-render-error').count(),0,topic+':'+code);
        assert.equal(await page.locator('.pdf-theory__edition[data-source-complete="false"]').count(),0);
        const expectedMath=await page.evaluate(()=>document.querySelector('.pdf-theory__edition')?.textContent?.length??0);
        assert.ok(expectedMath>80,topic+':'+code+' source content must not be empty');
        assert.equal(await page.evaluate(w=>document.documentElement.scrollWidth>w+1,width),false,topic+':'+code);
        const navigationHeight=await page.locator('[data-lesson-navigation]').evaluate(e=>e.getBoundingClientRect().height);
        assert.ok(navigationHeight<140,topic+':'+code+' footer must not consume the reading area');
        assert.equal(await page.evaluate(()=>localStorage.getItem('keep-progress-marker')),'do-not-clear');
        if(['12.1','15.1'].includes(code)||topic==='CD08'){
          if(code==='12.1')await page.locator('.pdf-theory__alternative').evaluateAll(elements=>elements.forEach(e=>e.open=true));
          await page.screenshot({path:`.audit/pdf-knowledge/screenshots/${topic}-${code??'shared'}-${width}.png`});
          assert.equal(await page.evaluate(w=>document.documentElement.scrollWidth>w+1,width),false);
        }
        states.push({width,topic,code,math:await page.locator('.pdf-theory .katex').count()});
      }
      // Exercise the actual data model and renderer for every imported article.
      const rendered=await page.evaluate(async()=>{
        const {pdfKnowledge}=await import('/assets/js/data/knowledge-pdf.js');
        const {renderKnowledgeMarkdown}=await import('/assets/js/components/pdf-knowledge-renderer.js');
        const host=document.createElement('section');host.style.cssText='width:100%;min-width:0';document.querySelector('[data-lesson-content]').replaceChildren(host);
        let count=0,overflows=[];
        for(const article of pdfKnowledge.articles){
          host.innerHTML=renderKnowledgeMarkdown({slide:{reading:{title:article.title,lead:'',formulae:[],points:[],pdfArticles:[article]}},exercise:{code:article.targets[0],title:article.title},position:{current:1,total:1}});
          host.querySelectorAll('details').forEach(d=>d.open=true);
          if(host.querySelector('.katex-error,.math-render-error'))throw new Error(article.id);
          if(document.documentElement.scrollWidth>document.documentElement.clientWidth+1)overflows.push(article.id);
          count++;
        }
        return {count,overflows};
      });
      assert.equal(rendered.count,370);assert.deepEqual(rendered.overflows,[]);
      await page.goto(`${site.origin}/documents.html?grade=12&topic=CD08&type=8.12&section=types&item=1`,{waitUntil:'networkidle'});
      await page.locator('.problem-type-reader').waitFor();
      assert.match(await page.locator('.problem-type-reader__note').innerText(),/Chỉ triệt tiêu theo chuỗi/u);
      assert.equal(await page.locator('.katex-error,.math-render-error').count(),0);
      await page.goto(`${site.origin}/documents.html?grade=12&topic=CD20&type=20.1&section=practice&item=1`,{waitUntil:'networkidle'});
      await page.locator('[data-practice-answer]').first().click();
      await page.locator('.practice-feedback').waitFor();
      const stored=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([key])=>key.startsWith('bienedu:progress:'))));
      await page.reload({waitUntil:'networkidle'});await page.locator('.practice-feedback').waitFor();
      assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([key])=>key.startsWith('bienedu:progress:')))),stored);
      assert.deepEqual(errors,[]);await context.close();
    }
    writeFileSync('.audit/pdf-knowledge/browser.json',JSON.stringify({passed:true,states,articleRenders:740,practiceAndReload:true},null,2)+'\n');
  }finally{await site.close();}
});
