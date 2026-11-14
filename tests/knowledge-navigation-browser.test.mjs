import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {localSite} from './helpers/local-site.mjs';

test('mobile menu lock, local formula arrows, history scroll and progress remain functional',async()=>{
  const site=await localSite();try{
    for(const width of [1366,390]){
      const page=await site.browser.newPage({viewport:{width,height:844},hasTouch:width===390,isMobile:width===390});
      await page.goto(site.origin+'/documents.html?grade=12&topic=CD01&section=knowledge&item=1',{waitUntil:'networkidle'});await page.locator('[data-native-pdf-knowledge]').waitFor();
      if(width===390){
        await page.getByRole('button',{name:'Menu',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Menu',exact:true}).getAttribute('aria-expanded'),'true');
        const before=await page.evaluate(()=>scrollY);await page.mouse.move(320,600);await page.mouse.wheel(0,1000);await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>scrollY),before);
        await page.keyboard.press('Escape');assert.equal(await page.getByRole('button',{name:'Menu',exact:true}).getAttribute('aria-expanded'),'false');
        await page.mouse.wheel(0,800);await page.waitForTimeout(180);assert.ok(await page.evaluate(()=>scrollY>0));
        const overflowingIndex=await page.locator('[data-math-scroll]').evaluateAll(elements=>elements.findIndex(e=>e.scrollWidth>e.clientWidth+8));assert.ok(overflowingIndex>=0,'CD01 has a genuinely long source equation at mobile width');
        const equation=page.locator('[data-math-scroll]').nth(overflowingIndex);await equation.focus();const url=page.url();await page.keyboard.press('ArrowRight');await page.waitForTimeout(200);assert.equal(page.url(),url);assert.ok(await equation.evaluate(e=>e.scrollLeft>0));
      }
      await page.goto(site.origin+'/documents.html?grade=12&topic=CD08&section=knowledge&item=1',{waitUntil:'networkidle'});await page.locator('[data-native-pdf-knowledge]').waitFor();
      await page.mouse.move(Math.min(width-30,800),500);await page.mouse.wheel(0,500);await page.waitForTimeout(220);const y=await page.evaluate(()=>scrollY);assert.ok(y>0);
      const expectedNext=await page.locator('[data-lesson-navigation] .nav-button--primary').getAttribute('href');
      await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.press('ArrowRight');await page.waitForURL(new URL(expectedNext,site.origin).href);await page.waitForTimeout(350);const nextURL=page.url();
      await page.goBack();await page.locator('[data-native-pdf-knowledge]').waitFor();await page.waitForTimeout(400);assert.ok(Math.abs(await page.evaluate(()=>scrollY)-y)<=3,'Back must restore document reading position');
      await page.goForward();await page.waitForTimeout(400);assert.equal(page.url(),nextURL);
      await page.goto(site.origin+'/documents.html?grade=12&topic=CD20&type=20.1&section=practice&item=1',{waitUntil:'networkidle'});await page.locator('[data-practice-answer]').first().click();await page.locator('.practice-feedback').waitFor();
      const state=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('bienedu:progress:'))));
      await page.reload({waitUntil:'networkidle'});await page.locator('.practice-feedback').waitFor();assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('bienedu:progress:')))),state);
      await page.close();
    }
  }finally{await site.close();}
});

test('125/150/200 percent equivalent viewport reflow, not a claim of true browser zoom',async()=>{
  const site=await localSite(),states=[];try{
    for(const factor of [1.25,1.5,2]){
      const width=Math.floor(1366/factor),height=Math.floor(768/factor),page=await site.browser.newPage({viewport:{width,height}});
      await page.goto(site.origin+'/documents.html?grade=12&topic=CD01&section=knowledge&item=1',{waitUntil:'networkidle'});await page.locator('[data-native-pdf-knowledge]').waitFor();await page.keyboard.press('End');await page.waitForTimeout(400);
      const last=await page.locator('[data-source-block="cd01-cd07-functions:CD01:knowledge:block:6"]').evaluate(e=>{const r=e.getBoundingClientRect(),n=document.querySelector('[data-lesson-navigation]').getBoundingClientRect();return {bottom:r.bottom,navTop:n.top};});
      assert.ok(last.bottom<=Math.min(height,last.navTop)+1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.ok(await page.locator('[data-lesson-navigation]').isVisible());
      states.push({effectiveScale:factor,width,height,trueBrowserZoomTested:false});await page.close();
    }
    writeFileSync('.audit/quality-recovery/reflow.json',JSON.stringify({passed:true,states,scope:'Viewport resizing only; not CDP pinch scaling or actual browser zoom certification'},null,2)+'\n');
  }finally{await site.close();}
});
