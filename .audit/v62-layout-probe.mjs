import {writeFileSync,mkdirSync} from 'node:fs';
import {localSite} from '../tests/helpers/local-site.mjs';
const site=await localSite(),states=[];
try{
  for(const width of [390,768,1024,1366])for(const [name,path]of [['roadmap','/documents.html?grade=12'],['graph','/documents.html?grade=12&topic=CD06&type=6.1&section=example&item=8&releasePreview=off']]){
    const context=await site.browser.newContext({viewport:{width,height:844},isMobile:width<768,hasTouch:width<768,locale:'vi-VN',reducedMotion:'reduce'}),page=await context.newPage();
    await page.addInitScript(()=>{globalThis.__shifts=[];new PerformanceObserver((list)=>{for(const x of list.getEntries())if(!x.hadRecentInput)globalThis.__shifts.push({time:x.startTime,value:x.value,sources:x.sources.map(s=>({tag:s.node?.tagName,cls:s.node?.className,previous:s.previousRect.toJSON(),current:s.currentRect.toJSON()}))});}).observe({type:'layout-shift',buffered:true});});
    await page.goto(site.origin+path,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(200);
    states.push({name,width,shifts:await page.evaluate(()=>globalThis.__shifts)});await context.close();
  }
}finally{await site.close();}
mkdirSync('.audit/source-first-v5/release-v62',{recursive:true});writeFileSync('.audit/source-first-v5/release-v62/cls-before.json',JSON.stringify(states,null,2));
console.log(states.map(s=>({name:s.name,width:s.width,cls:s.shifts.reduce((a,b)=>a+b.value,0),causes:s.shifts.flatMap(x=>x.sources.map(y=>y.cls)).slice(0,12)})));
