import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {localSite} from './helpers/local-site.mjs';
import {pdfKnowledgeRelease} from '../assets/js/data/pdf-knowledge-release.js';
import {normalizeMath} from '../assets/js/components/canonical-math.js';

const output='.audit/quality-recovery';
const route='/documents.html?grade=12&topic=CD01&section=knowledge&item=1';
const dataset=JSON.parse(readFileSync(pdfKnowledgeRelease.bundle,'utf8'));
const article=dataset.articles.find(a=>a.id==='cd01-cd07-functions:CD01:knowledge');
const expected=article.blocks.flatMap(b=>(b.content?.segments??[]).filter(n=>n.type==='math').map(n=>normalizeMath(n.latex)));
const settle=page=>page.evaluate(()=>document.fonts.ready);

test('CD01 at default 100%: wheel, PageDown, Home/End reach final source node unobscured',async()=>{
  mkdirSync(output+'/after',{recursive:true});const site=await localSite(),states=[];
  try{
    for(const [width,height]of [[1280,720],[1366,768],[1440,900],[1536,864],[1920,1080],[390,844]]){
      const page=await site.browser.newPage({viewport:{width,height},isMobile:width<600,hasTouch:width<600});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto(site.origin+route,{waitUntil:'networkidle'});await page.locator('[data-native-pdf-knowledge]').waitFor();await settle(page);
      assert.equal(await page.evaluate(()=>visualViewport.scale),1);
      const actual=await page.locator('.pdf-theory__edition').first().locator('annotation[encoding="application/x-tex"]').evaluateAll(nodes=>nodes.map(n=>n.textContent));assert.deepEqual(actual,expected);
      await page.screenshot({path:`${output}/after/CD01-${width}x${height}-top.png`});
      await page.keyboard.press('Home');await page.mouse.move(width-45,Math.min(400,height-150));
      await page.mouse.wheel(0,25000);await page.waitForTimeout(250);await page.keyboard.press('End');await page.waitForTimeout(400);
      const end=await page.locator('.pdf-theory__edition').first().locator('[data-source-block]').last().evaluate(e=>{
        const r=e.getBoundingClientRect(),nav=document.querySelector('[data-lesson-navigation]').getBoundingClientRect(),header=document.querySelector('.site-header').getBoundingClientRect();
        return {block:e.dataset.sourceBlock,top:r.top,bottom:r.bottom,navTop:nav.top,headerBottom:header.bottom,scrollY,rootScrollHeight:document.documentElement.scrollHeight,unobscured:r.top>=header.bottom-1&&r.bottom<=Math.min(innerHeight,nav.top)+1};
      });
      assert.equal(end.unobscured,true,`Final source block inaccessible at ${width}x${height}: ${JSON.stringify(end)}`);
      await page.screenshot({path:`${output}/after/CD01-${width}x${height}-end.png`});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.keyboard.press('Home');await page.waitForTimeout(400);assert.ok(await page.evaluate(()=>scrollY<2));
      await page.keyboard.press('PageDown');await page.waitForTimeout(400);
      const canScroll=await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight+2);
      if(canScroll)assert.ok(await page.evaluate(()=>scrollY>0),'PageDown must scroll the document');
      assert.equal(await page.locator('.katex-error,.math-render-error').count(),0);assert.deepEqual(errors,[]);
      await page.screenshot({path:`${output}/after/CD01-${width}x${height}.png`});
      states.push({width,height,end,mathNodes:actual.length});await page.close();
    }
    writeFileSync(output+'/cd01-scroll.json',JSON.stringify({passed:true,browserZoom:'Default 100%, no scale override',states},null,2)+'\n');
  }finally{await site.close();}
});
