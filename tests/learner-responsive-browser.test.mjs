import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {localSite} from './helpers/local-site.mjs';
import {discoverLearnerRoutes,inspectLearnerLayout} from './helpers/learner-routes.mjs';
const dir='.audit/learner-ui';fs.mkdirSync(dir,{recursive:true});
const sizes=[[1024,768],[1280,800],[1366,768],[1440,900],[1600,900],[1920,1080],[320,568],[360,800],[375,812],[390,844],[414,896],[430,932],[768,1024],[1092,614],[910,512],[683,384]];
const entry='/documents.html?grade=12';
const settle=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
async function open(page,origin,url){
  await page.evaluate(url=>{const a=document.createElement('a');a.href=url;a.dataset.route='';document.querySelector('[data-curriculum-app]').append(a);a.click();a.remove();},origin+url);
  await page.waitForURL(origin+url);await settle(page);
}
function checkLayout(m,label){
  assert.equal(m.scale,1,label+' default browser scale');assert.equal(m.overflow,false,label+' global overflow');assert.equal(m.mathErrors,0,label+' math errors');
  assert.ok(m.roadmap?.width>=90&&m.roadmap.height>=44,label+' usable roadmap');
  assert.deepEqual(m.clippedContainers,[],label+' clipped content container');
  if(m.title)assert.ok(m.roadmap.right<=m.title.left+1||m.roadmap.bottom<=m.title.top+1,label+' roadmap/title overlap');
  assert.ok(m.analysis.every(a=>a.display==='block'&&a.font>=14),label+' analysis prose must not use numbered-step grid');
  if(m.workspace){assert.ok(m.workspace.width<=m.innerWidth+1);assert.ok(m.content?.width>100&&m.content.height>0,label+' visible content');assert.deepEqual(m.nestedVertical,[],label+' document scroll owner');assert.ok(m.footer.top>=m.content.bottom-1,label+' footer below full content');}
}

test('all discovered learner slide URLs: desktop/mobile, direct roadmap destination and complete solutions',{timeout:1800000},async()=>{
  const site=await localSite(),states=[],failures=[];
  try{
    const page=await site.browser.newPage({viewport:{width:1366,height:768},reducedMotion:'reduce'}),errors=[],failed=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
    await page.goto(site.origin+entry,{waitUntil:'networkidle'});await page.locator('.roadmap-list').waitFor();
    const inventory=await discoverLearnerRoutes(page);fs.writeFileSync(dir+'/routes.json',JSON.stringify(inventory,null,2));
    assert.equal(inventory.topics.length,39);
    for(const width of [1366,390]){
      await page.setViewportSize({width,height:844});
      for(const [index,route]of inventory.routes.entries()){
        await open(page,site.origin,route.url);
        if(route.section==='example'){
          await page.locator('.example-reader__solution').evaluateAll(es=>es.forEach(e=>e.open=true));await settle(page);
        }
        const m=await inspectLearnerLayout(page);
        try{
          checkLayout(m,route.url+' '+width);
          assert.equal(new URL(await page.locator('[data-learner-roadmap]').getAttribute('href'),site.origin).href,site.origin+entry);
          if(route.section!=='topic'){
            assert.equal(await page.locator('.learning-workspace').getAttribute('data-section'),route.section);
            assert.equal(Number(await page.locator('.learning-workspace').getAttribute('data-item')),route.item);
          }
          states.push({url:route.url,width,section:route.section,passed:true});
        }catch(e){failures.push({url:route.url,width,error:e.message});if(failures.length>=15)throw e;}
        if(index%100===0)console.log(`Learner routes ${width}: ${index}/${inventory.routes.length}`);
      }
    }
    assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.deepEqual(failures,[]);
    fs.writeFileSync(dir+'/routes-browser.json',JSON.stringify({passed:true,states,routes:inventory.routes.length,unavailable:inventory.unavailable,errors,failed},null,2));await page.close();
  }finally{fs.writeFileSync(dir+'/route-progress.json',JSON.stringify({states:states.length,failures},null,2));await site.close();}
});

test('six desktop sizes, seven mobile/tablet sizes and three equivalent zoom reflows; real native geometry resize',{timeout:360000},async()=>{
  const site=await localSite(),states=[];
  const {geometryActivation}=await import('../assets/js/data/geometry-activation.js');
  const geometry=JSON.parse(fs.readFileSync(geometryActivation.bundle,'utf8'));
  const reps=[['CD01','topic=CD01&section=knowledge&item=1'],['long','topic=CD12&type=12.1&section=knowledge&item=1'],['table','topic=CD15&type=15.1&section=knowledge&item=1'],['example','topic=CD13&type=13.1&section=example&item=1'],['practice','topic=CD20&type=20.1&section=practice&item=1'],['method','topic=CD01&type=1.1&section=types&item=1'],['vector','topic=CD28&type=28.1&section=knowledge&item=1']];
  const spatial=geometry.candidates.find(c=>c.spec.dimension===3);reps.push(['3d',spatial.target.route.split('?')[1]]);
  try{const page=await site.browser.newPage({reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(site.origin+entry,{waitUntil:'networkidle'});await page.locator('.roadmap-list').waitFor();
    for(const [width,height]of sizes){await page.setViewportSize({width,height});for(const [name,query]of reps){
      const url='/documents.html?'+(query.startsWith('grade=')?'':'grade=12&')+query;await open(page,site.origin,url);
      await page.locator('.example-reader__solution').evaluateAll(es=>es.forEach(e=>e.open=true));
      if(name==='3d'){
        const host=page.locator(`[data-source-geometry="${spatial.target.blockId}"]`);await host.scrollIntoViewIfNeeded();await page.waitForFunction(id=>document.querySelector(`[data-source-geometry="${id}"]`)?.dataset.geometryReady==='true',spatial.target.blockId);
        const value=await host.evaluate(async e=>{const {getGeometryInstance}=await import('/assets/js/components/geometry-renderer.js');const s=getGeometryInstance(e);return {source:s.spec.source,boards:e.querySelectorAll('svg').length,views:s.spec.views.length,sizes:s.scenes.map(x=>({board:x.board.canvasWidth,plot:x.plot.clientWidth}))};});
        assert.deepEqual(value.source,spatial.spec.source);assert.equal(value.boards,value.views);assert.ok(value.sizes.every(s=>Math.abs(s.board-s.plot)<2));
      }
      await settle(page);const m=await inspectLearnerLayout(page);checkLayout(m,name+' '+width);
      if(m.knowledge)assert.ok(m.knowledge.width>=m.content.width-1,'Knowledge uses available content width');
      await page.evaluate(()=>document.fonts.ready);
      // End may reveal a lazy native board, which legitimately changes document
      // height. Wait for it, then scroll to the actual final document position.
      await page.keyboard.press('End');await page.waitForTimeout(180);
      await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await settle(page);
      const end=await page.locator('[data-lesson-navigation]').evaluate(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:innerHeight};});assert.ok(end.bottom<=end.height+1,JSON.stringify({name,width,end}));assert.ok(end.top>=0,JSON.stringify({name,width,end}));
      states.push({name,width,height,...m});
      if([1366,390].includes(width)){await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:`${dir}/${name}-${width}.png`});await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await page.screenshot({path:`${dir}/${name}-${width}-end.png`});}
    }}
    assert.deepEqual(errors,[]);fs.writeFileSync(dir+'/responsive.json',JSON.stringify({passed:true,states,trueBrowserZoom:false,viewportReflowFactors:[1.25,1.5,2]},null,2));await page.close();
  }finally{await site.close();}
});

test('roadmap is direct, keyboard accessible after external entry/reload; normal history/next/progress still works',{timeout:120000},async()=>{
  const site=await localSite();try{for(const width of [1366,390]){
    const page=await site.browser.newPage({viewport:{width,height:844},hasTouch:width===390,isMobile:width===390,reducedMotion:'reduce'});
    const url='/documents.html?grade=12&topic=CD20&type=20.1&section=example&item=1';
    await page.goto(site.origin+url,{waitUntil:'networkidle'});await page.locator('.learning-workspace').waitFor();await page.reload({waitUntil:'networkidle'});
    const link=page.locator('[data-learner-roadmap]');await link.focus();assert.equal(await link.evaluate(e=>getComputedStyle(e).outlineStyle),'solid');await page.keyboard.press('Enter');await page.waitForURL(site.origin+entry);await page.locator('.roadmap-list').waitFor();
    await page.goBack();await page.locator('.learning-workspace').waitFor();await page.locator('[data-lesson-navigation] .nav-button--primary').click();await page.waitForURL(u=>u.href!==site.origin+url);const nextURL=page.url();await page.goBack();await page.waitForURL(site.origin+url);await page.goForward();await page.waitForURL(nextURL);
    await page.goto(site.origin+'/documents.html?grade=12&topic=CD20&type=20.1&section=practice&item=1',{waitUntil:'networkidle'});await page.locator('[data-practice-answer]').first().click();await page.locator('.practice-feedback').waitFor();const stored=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('bienedu:progress:'))));await page.reload({waitUntil:'networkidle'});await page.locator('.practice-feedback').waitFor();assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('bienedu:progress:')))),stored);await page.close();
  }}finally{await site.close();}
});

test('unlocked final exam and scored solutions use the shared layout without changing real student storage',{timeout:120000},async()=>{
  const site=await localSite(),states=[];
  try{const page=await site.browser.newPage({reducedMotion:'reduce'});await page.goto(site.origin+entry,{waitUntil:'networkidle'});await page.locator('.roadmap-list').waitFor();
    const answers=await page.evaluate(async()=>{
      const p=await import('/assets/js/domain/learning-progress.js?v=8.6'),{getTopicAvailability}=await import('/assets/js/data/content-registry.js?v=15.0'),{buildActivePracticeSet}=await import('/assets/js/domain/practice-bank.js?v=15.0'),{createFinalExam}=await import('/assets/js/domain/exam-engine.js?v=8.6');
      let state=p.createLearningProgress();for(const record of Object.values(getTopicAvailability('CD20').subtopics)){
        for(const unit of record.sections.knowledge.units)state=p.markKnowledgeViewed(state,record.code,unit.id);
        for(const unit of record.sections.examples.units)state=p.markExampleViewed(state,record.code,unit.id);
        for(const q of buildActivePracticeSet(record.code,'PRACTICE_V15'))state=p.recordPracticeAnswer(state,record.code,q.id,q.correctIndex,q.correctIndex);
      }
      p.saveLearningProgress(state,localStorage,'12');return createFinalExam('CD20').map(q=>q.correctIndex);
    });
    const url='/documents.html?grade=12&topic=CD20&exam=final&question=1';await page.goto(site.origin+url,{waitUntil:'networkidle'});await page.locator('.exam-workspace').waitFor();
    for(const width of [320,390,768,1024,1366,1920]){await page.setViewportSize({width,height:844});await settle(page);checkLayout(await inspectLearnerLayout(page),'exam '+width);states.push({width,section:'exam'});}
    for(const [i,answer]of answers.entries()){
      await page.locator(`[data-exam-answer="${answer}"]`).click();
      if(i<answers.length-1){await page.locator('[data-lesson-navigation] .nav-button--primary').click();await page.waitForURL(u=>u.searchParams.get('question')===String(i+2));}
    }
    await page.locator('[data-action="request-submit"]').click();await page.locator('[data-action="confirm-submit"]').click();await page.locator('.exam-result').waitFor();assert.match(await page.locator('.exam-result').innerText(),/20\/20/);
    await page.reload({waitUntil:'networkidle'});await page.locator('.exam-result').waitFor();assert.match(await page.locator('.exam-result').innerText(),/20\/20/);
    fs.writeFileSync(dir+'/exam.json',JSON.stringify({passed:true,states,score:'20/20',isolatedBrowserStorage:true},null,2));await page.close();
  }finally{await site.close();}
});
