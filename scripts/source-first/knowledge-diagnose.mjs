// Real-route measurements at default browser zoom; no source/runtime writes.
import {mkdirSync,writeFileSync} from 'node:fs';
import {localSite} from '../../tests/helpers/local-site.mjs';
const directory='.audit/quality-recovery';mkdirSync(directory+'/before',{recursive:true});
const site=await localSite(),states=[];
try{
  for(const [width,height]of [[1280,720],[1366,768],[1440,900],[1536,864],[1920,1080],[390,844]]){
    const page=await site.browser.newPage({viewport:{width,height},isMobile:width<600,hasTouch:width<600});
    await page.goto(site.origin+'/documents.html?grade=12&topic=CD01&section=knowledge&item=1',{waitUntil:'networkidle'});
    await page.locator('[data-native-pdf-knowledge]').waitFor();await page.evaluate(()=>document.fonts.ready);
    const initial=await page.evaluate(()=>{
      const selectors=['html','body','.curriculum-app-shell','[data-curriculum-app]','.learning-workspace','.workspace-frame','.lesson-content','.pdf-theory','.lesson-navigation'];
      return {scale:visualViewport.scale,viewport:{width:innerWidth,height:innerHeight},elements:selectors.map(selector=>{const e=document.querySelector(selector),s=getComputedStyle(e),r=e.getBoundingClientRect();return {selector,height:r.height,top:r.top,bottom:r.bottom,clientHeight:e.clientHeight,scrollHeight:e.scrollHeight,overflowY:s.overflowY,position:s.position,gridTemplateRows:s.gridTemplateRows};}),math:document.querySelectorAll('.pdf-theory .canonical-math').length};
    });
    await page.screenshot({path:`${directory}/before/CD01-${width}x${height}.png`});
    await page.mouse.move(Math.min(width-30,700),Math.min(height-150,400));await page.mouse.wheel(0,30000);await page.waitForTimeout(180);
    await page.keyboard.press('End');await page.waitForTimeout(180);
    const end=await page.locator('.pdf-theory__edition').first().evaluate(e=>{const node=e.querySelector('.pdf-theory__paragraph:last-child')??e.lastElementChild,r=node.getBoundingClientRect(),nav=document.querySelector('[data-lesson-navigation]').getBoundingClientRect();return {block:node.dataset.sourceBlock,lastTop:r.top,lastBottom:r.bottom,navTop:nav.top,navBottom:nav.bottom,windowScroll:scrollY,unobscured:r.top>=0&&r.bottom<=Math.min(innerHeight,nav.top)};});
    states.push({width,height,initial,end});await page.close();
  }
  writeFileSync(directory+'/before.json',JSON.stringify({route:'CD01 knowledge item=1',browserZoom:'Default 100%; no page scale or CSS zoom override',states},null,2)+'\n');
  console.log(JSON.stringify(states.map(s=>({viewport:`${s.width}x${s.height}`,lastBlockReachable:s.end.unobscured,windowScroll:s.end.windowScroll,lastBottom:s.end.lastBottom,navTop:s.end.navTop})),null,2));
}finally{await site.close();}
