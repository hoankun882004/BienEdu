import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {geometryServer} from '../scripts/source-first/geometry-server.mjs';
import {localSite} from './helpers/local-site.mjs';
import {graphFixtures} from './helpers/graph-fixtures.mjs';
import {createHash} from 'node:crypto';
const runtimeFiles=['assets/js/components/geometry-spec.js','assets/js/components/geometry-renderer.js','assets/js/geometry-learner.js','assets/js/geometry-loader.js','assets/geometry.css','assets/js/curriculum.js','scripts/source-first/geometry-navigation.mjs'];
const runtimeHashes=()=>Object.fromEntries(runtimeFiles.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex').toUpperCase()]));
// View3D projection uses IEEE-754 doubles, not bit-exact rational arithmetic.
function sameCamera(actual,expected){for(const key of ['az','el'])assert.ok(Math.abs(actual[key]-expected[key])<1e-10,key+' camera reset');actual.box.forEach((value,i)=>assert.ok(Math.abs(value-expected.box[i])<1e-10,'projection reset'));}

test('geometry has stable loading dimensions, SPA/history recovery and shares the existing graph engine',{timeout:120000},async()=>{
  const site=await localSite(),server=geometryServer();await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin='http://127.0.0.1:'+server.address().port;
  const page=await site.browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.route('**/jsxgraphcore.mjs',async route=>{await new Promise(done=>setTimeout(done,800));await route.continue();});
    await page.goto(origin+'/documents.html?grade=12&topic=CD28&type=28.8&section=knowledge&item=1',{waitUntil:'domcontentloaded'});
    const host=page.locator('[data-source-geometry]');await host.waitFor();await host.scrollIntoViewIfNeeded();
    assert.ok((await page.request.get(origin+'/assets/js/curriculum.js')).status()===200);
    assert.ok((await (await page.request.get(origin+'/assets/js/curriculum.js')).text()).includes('pendingLessonHistory'),'Staged history implementation must be served');
    const before=await host.evaluate(e=>e.getBoundingClientRect().height);await page.waitForFunction(()=>document.querySelector('[data-geometry-ready="true"]'));
    const after=await host.evaluate(e=>e.getBoundingClientRect().height);assert.ok(Math.abs(after-before)<=3,`Loading layout shift: ${before} → ${after}`);
    const resized=[];for(const width of [320,768,1366,390]){await page.setViewportSize({width,height:844});await page.waitForTimeout(80);resized.push(await host.evaluate(e=>({width:e.querySelector('.native-geometry__board').clientWidth,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1})));}assert.ok(resized.every(r=>r.width>150&&!r.overflow));
    await page.locator('[data-section="example"]').first().click();await page.waitForFunction(async()=> (await import('/assets/js/components/geometry-renderer.js')).activeGeometryCount()===0);
    await page.waitForURL(/section=example/u);await page.waitForFunction(()=>document.querySelector('.learning-workspace')?.dataset.section==='example');
    // Deliberately go Back during the original 210 ms transition lock.
    await page.goBack();try{await host.waitFor({timeout:5000});}catch{throw Error('Rapid history mismatch: '+JSON.stringify(await page.evaluate(()=>({url:location.search,section:document.querySelector('.learning-workspace')?.dataset.section,depth:history.state?.depth}))));}await host.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('[data-geometry-ready="true"]'));assert.equal(await host.locator('svg').count(),1);
    await page.waitForFunction(()=>document.querySelector('[data-lesson-stage]')?.style.minHeight==='');
    await page.goForward();await page.waitForFunction(async()=> (await import('/assets/js/components/geometry-renderer.js')).activeGeometryCount()===0);await page.waitForFunction(()=>document.querySelector('[data-lesson-stage]')?.style.minHeight==='');
    await page.goBack();await host.waitFor();await host.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('[data-geometry-ready="true"]'));
    await page.evaluate(()=>{window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
    await page.waitForFunction(()=>document.querySelector('[data-geometry-ready="true"]'));assert.equal(await host.locator('svg').count(),1);
    const coexisting=await page.evaluate(async graphSpec=>{
      const geom=await import('/assets/js/components/geometry-renderer.js'),graph=await import('/assets/js/components/graph-renderer.js'),g=document.createElement('section');g.style.width='300px';document.body.append(g);
      const state=await graph.mountGraph(graphSpec,g);const before=geom.activeGeometryCount(),curves=state.curves.length;graph.disposeGraph(g);g.remove();return {before,after:geom.activeGeometryCount(),curves,graphCount:graph.activeGraphCount()};
    },graphFixtures[0].spec);assert.equal(coexisting.before,coexisting.after);assert.equal(coexisting.curves,2);assert.equal(coexisting.graphCount,0);
    const rejected=await page.evaluate(async()=>{
      const r=await import('/assets/js/components/geometry-renderer.js'),host=document.querySelector('[data-source-geometry]'),spec=structuredClone(r.getGeometryInstance(host).spec),target=document.createElement('section');target.textContent='Giữ nội dung bài học';document.body.append(target);spec.source.sha256='missing';let rejected=false;try{await r.renderGeometry(spec,target);}catch{rejected=true;}const preserved=target.textContent;target.remove();return {rejected,preserved};
    });assert.deepEqual(rejected,{rejected:true,preserved:'Giữ nội dung bài học'});assert.deepEqual(errors,[]);
    await page.goto(origin+'/geometry-preview.html',{waitUntil:'networkidle'});await page.locator('#geometry-candidates article').nth(29).waitFor();assert.equal(await page.locator('#geometry-candidates article').count(),30);assert.match(await page.locator('#geometry-summary').innerText(),/79 kiểm tra SymPy đạt/u);
    mkdirSync('.audit/geometry-v1/screenshots',{recursive:true});await page.screenshot({path:'.audit/geometry-v1/screenshots/consolidated-390.png'});
    writeFileSync('.audit/geometry-v1/interactions.json',JSON.stringify({passed:true,runtimeHashes:runtimeHashes(),loadingShiftPx:Math.abs(after-before),resizes:resized,spaAndHistory:true,rapidHistory:true,forwardNavigation:true,bfcache:true,coexistingGraph:true,safeRejection:true,previewCandidates:30},null,2)+'\n');
  }finally{server.closeAllConnections();await new Promise(done=>server.close(done));await site.close();}
});

test('real touch drag rotates only in opt-in mode, with mobile landscape rendering',{timeout:90000},async()=>{
  const site=await localSite(),server=geometryServer();await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin='http://127.0.0.1:'+server.address().port;
  const context=await site.browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage();
  try{
    await page.goto(origin+'/documents.html?grade=12&topic=CD28&type=28.8&section=knowledge&item=1',{waitUntil:'networkidle'});
    const host=page.locator('[data-source-geometry]');await host.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('[data-geometry-ready="true"]'));
    const board=host.locator('.native-geometry__board'),toggle=host.getByRole('button',{name:'Bật kéo để xoay hình',exact:true});
    const session=await context.newCDPSession(page);
    const camera=()=>host.evaluate(async e=>{const s=(await import('/assets/js/components/geometry-renderer.js')).getGeometryInstance(e).scenes[0];return {az:s.view.az_slide.Value(),el:s.view.el_slide.Value(),box:s.board.getBoundingBox()};});
    const scroll=()=>board.evaluate(e=>{const values=[window.scrollY];for(let p=e.parentElement;p;p=p.parentElement)values.push(p.scrollTop);return values;});
    const swipe=async(dx,dy,cancel=false)=>{const box=await board.boundingBox(),x=box.x+box.width*.4,y=box.y+box.height*.5;
      await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
      for(let i=1;i<=6;i++){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+i*dx/6,y:y+i*dy/6}]});await page.waitForTimeout(20);}
      await session.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});await page.waitForTimeout(80);
    };
    assert.equal(await board.evaluate(e=>getComputedStyle(e).touchAction),'pan-y');
    const initialCamera=await camera(),beforeScroll=await scroll();await swipe(0,-110);const afterScroll=await scroll();
    assert.ok(afterScroll.some((v,i)=>Math.abs(v-beforeScroll[i])>10),'An actual one-finger gesture must scroll the document/reading pane');assert.equal((await camera()).az,initialCamera.az);
    await toggle.click();await board.scrollIntoViewIfNeeded();assert.equal(await board.evaluate(e=>getComputedStyle(e).touchAction),'none');
    await board.evaluate(e=>{window.geometryPointerEvents=[];for(const type of ['gotpointercapture','lostpointercapture','pointercancel'])e.addEventListener(type,event=>window.geometryPointerEvents.push({type,id:event.pointerId,captured:e.hasPointerCapture(event.pointerId)}));});
    const before=await camera();await swipe(54,12);const after=await camera();assert.ok(Math.abs(after.az-before.az)>.01,`Touch did not rotate: ${before.az} → ${after.az}`);
    let pointerEvents=await page.evaluate(()=>window.geometryPointerEvents);assert.ok(pointerEvents.some(e=>e.type==='gotpointercapture'&&e.captured));assert.ok(pointerEvents.some(e=>e.type==='lostpointercapture'&&!e.captured));
    await swipe(18,-10,true);pointerEvents=await page.evaluate(()=>window.geometryPointerEvents);assert.ok(pointerEvents.some(e=>e.type==='pointercancel'));
    const cancelled=await camera();await board.dispatchEvent('pointermove',{pointerId:pointerEvents.at(-1).id,clientX:200,clientY:200});assert.deepEqual(await camera(),cancelled,'Cancelled pointer must not keep rotating');
    const mouseBox=await board.boundingBox(),mx=mouseBox.x+mouseBox.width*.4,my=mouseBox.y+mouseBox.height*.5;await page.mouse.move(mx,my);const mouseBefore=await camera();await page.mouse.down();await page.mouse.move(mx+45,my-18,{steps:5});await page.mouse.up();assert.ok(Math.abs((await camera()).az-mouseBefore.az)>.01,'Mouse drag must rotate');
    await host.getByRole('button',{name:'Đặt lại góc nhìn',exact:true}).click();sameCamera(await camera(),initialCamera);
    await host.getByRole('button',{name:'Phóng to',exact:true}).click();assert.ok((await camera()).box[2]-(await camera()).box[0]<initialCamera.box[2]-initialCamera.box[0]);await host.getByRole('button',{name:'Đặt lại góc nhìn',exact:true}).click();sameCamera(await camera(),initialCamera);
    await toggle.click();assert.equal(await board.evaluate(e=>getComputedStyle(e).touchAction),'pan-y');
    await page.setViewportSize({width:844,height:390});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1),false);
    const receipt=JSON.parse(readFileSync('.audit/geometry-v1/interactions.json'));assert.deepEqual(receipt.runtimeHashes,runtimeHashes());writeFileSync('.audit/geometry-v1/interactions.json',JSON.stringify({...receipt,touchRotation:true,touchDefaultScroll:true,touchLandscape:true,pointerCaptureRelease:true,pointerCancel:true,mouseRotation:true,zoomReset:true,physicalDeviceCertified:false},null,2)+'\n');
  }finally{await context.close();server.closeAllConnections();await new Promise(done=>server.close(done));await site.close();}
});
