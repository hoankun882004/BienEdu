import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {localSite} from '../tests/helpers/local-site.mjs';
const output='.audit/source-first-v5/release-v6',audit=process.argv.includes('--audit');mkdirSync(output,{recursive:true});
const site=await localSite(),states=[],errors=[];
try{
  for(const [width,height]of [[320,568],[360,800],[390,844],[430,932],[768,1024],[1024,768],[1366,768],[844,390]]){
    const phone=width<768||(width===844&&height===390);
    const context=await site.browser.newContext({viewport:{width,height},hasTouch:phone||width===768,isMobile:phone,locale:'vi-VN',reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',(e)=>errors.push(e.message));
    await page.addInitScript(()=>{globalThis.__auditCLS=0;if(PerformanceObserver.supportedEntryTypes.includes('layout-shift'))new PerformanceObserver((list)=>{for(const item of list.getEntries())if(!item.hadRecentInput)globalThis.__auditCLS+=item.value;}).observe({type:'layout-shift',buffered:true});});
    for(const [name,path]of [['home','/?grade=12'],['course','/course.html?grade=12'],['papers','/quiz.html?grade=12'],['registration','/contact.html?grade=12'],['roadmap','/documents.html?grade=12'],['topic','/documents.html?grade=12&topic=CD20'],['knowledge','/documents.html?grade=12&topic=CD13&type=13.1&section=knowledge&item=1'],['method','/documents.html?grade=12&topic=CD01&type=1.1&section=types&item=1'],['example','/documents.html?grade=12&topic=CD01&type=1.2&section=example&item=5'],['practice','/documents.html?grade=12&topic=CD20&type=20.1&section=practice&item=1'],...audit?[]:[['graph','/documents.html?grade=12&topic=CD06&type=6.1&section=example&item=7&releasePreview=v6'],['table','/documents.html?grade=12&topic=CD02&type=2.3&section=example&item=1&releasePreview=v6']]]){
      await page.goto(site.origin+path,{waitUntil:'networkidle'});await page.locator('#main-content').waitFor();
      if(name==='graph'||name==='table')await page.locator('[data-graph-replacement]').waitFor();
      if(name==='table'&&width===320){
        const scroll=page.locator('.native-variation');await scroll.focus();const url=page.url();await page.keyboard.press('ArrowRight');assert.equal(page.url(),url,'Table arrow keys must not advance the lesson');assert.ok(await scroll.evaluate((n)=>n.scrollLeft>0),'A narrow table must scroll locally with arrow keys');
      }
      const health=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,mathErrors:document.querySelectorAll('.katex-error,.math-render-error').length,
        tinyControls:[...document.querySelectorAll('button,a,input,summary')].filter((n)=>n.getClientRects().length&&n.getBoundingClientRect().width>0&&n.getBoundingClientRect().height<36).slice(0,12).map((n)=>({label:n.textContent.trim().slice(0,35),height:n.getBoundingClientRect().height})),
        engineLoads:performance.getEntriesByType('resource').filter((r)=>r.name.includes('jsxgraphcore')).length,pdfLoads:performance.getEntriesByType('resource').filter((r)=>new URL(r.name).pathname.endsWith('.pdf')).length,
        cls:globalThis.__auditCLS,domContentLoadedMs:performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd,
        plotWithinViewport:[...document.querySelectorAll('.native-graph__board')].every((n)=>{const r=n.getBoundingClientRect();return r.width>0&&r.left>=-1&&r.right<=innerWidth+1;}),
        singleMain:document.querySelectorAll('main').length===1,
        navigationTargets:[...document.querySelectorAll('.lesson-navigation>button,.lesson-navigation>a')].map((n)=>({height:n.getBoundingClientRect().height,width:n.getBoundingClientRect().width}))}));
      if(!audit){assert.equal(health.overflow,false,`${name}@${width}`);assert.equal(health.mathErrors,0,`${name}@${width}`);assert.equal(health.engineLoads,name==='graph'?1:0);assert.equal(health.pdfLoads,0);assert.equal(health.plotWithinViewport,true,`${name}@${width}`);assert.equal(health.singleMain,true);for(const target of health.navigationTargets)assert.ok(target.height>=44,'Comfortable primary navigation targets');}
      if([320,390,1366].includes(width))await page.screenshot({path:join(output,`${audit?'before':'after'}-${name}-${width}.png`)});
      states.push({name,width,height,...health});
    }
    await context.close();
  }
  if(!audit)assert.deepEqual(errors,[]);
  writeFileSync(join(output,audit?'mobile-before.json':'mobile.json'),JSON.stringify({passed:audit?null:true,states,errors},null,2)+'\n');
  console.log(JSON.stringify({states:states.length,errors,overflow:states.filter((s)=>s.overflow).map((s)=>[s.name,s.width])}));
}finally{await site.close();}
