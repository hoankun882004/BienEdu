import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {geometryServer} from '../scripts/source-first/geometry-server.mjs';
import {localSite} from './helpers/local-site.mjs';

test('native geometry on every real learner route, responsive controls and lifecycle',{timeout:900000},async()=>{
  const site=await localSite(),server=geometryServer();await new Promise(done=>server.listen(0,'127.0.0.1',done));
  const origin='http://127.0.0.1:'+server.address().port,pointer=JSON.parse(readFileSync('.audit/geometry-v1/preview.json')),bundle=JSON.parse(readFileSync(pointer.bundle));
  const files=['assets/js/components/geometry-spec.js','assets/js/components/geometry-renderer.js','assets/js/geometry-learner.js','assets/js/geometry-loader.js','assets/geometry.css','assets/js/curriculum.js','scripts/source-first/geometry-navigation.mjs'];
  const hashes=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex').toUpperCase()])),runtimeHashes=hashes();
  const sizes=process.env.GEOMETRY_SMOKE?[[1366,768],[390,844]]:[[320,568],[360,800],[390,844],[430,932],[768,1024],[1024,768],[1366,768],[844,390]],states=[];
  mkdirSync('.audit/geometry-v1/screenshots',{recursive:true});
  try{
    for(const [width,height]of sizes){
      const mobile=width<768||height<500,context=await site.browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.addInitScript(()=>localStorage.setItem('geometry-progress-marker','preserve'));
      for(const {spec,target}of bundle.candidates){
        await page.goto(origin+'/'+target.route,{waitUntil:'domcontentloaded'});
        const host=page.locator(`[data-source-geometry="${target.blockId}"]`);await host.waitFor();await host.scrollIntoViewIfNeeded();
        await page.waitForFunction(id=>document.querySelector(`[data-geometry-id="${id}"]`)?.dataset.geometryReady==='true',spec.id,{timeout:20000});
        const report=await host.evaluate(async(element)=>{
          const {getGeometryInstance}=await import('/assets/js/components/geometry-renderer.js'),{checkGeometryProperties}=await import('/assets/js/components/geometry-spec.js'),state=getGeometryInstance(element);
          return {scenes:state.scenes.length,objects:state.scenes.reduce((n,s)=>n+s.objects.size,0),valid:checkGeometryProperties(state.spec).every(r=>r.valid),sizes:state.scenes.map(s=>[s.plot.clientWidth,s.plot.clientHeight]),labels:state.scenes.flatMap(s=>Array.from(s.plot.querySelectorAll('text')).map(t=>t.textContent)),points:state.scenes.flatMap(scene=>state.spec.objects.filter(o=>o.type==='point'&&o.visible&&o.view===state.spec.views[state.scenes.indexOf(scene)].id).map(o=>{const point=scene.objects.get(o.id),c=(point.element2D??point).coords.scrCoords;return {id:o.id,x:c[1],y:c[2],width:scene.plot.clientWidth,height:scene.plot.clientHeight};})),domains:state.scenes.flatMap(s=>s.curves.map(c=>({id:c.id,invalid:c.domain.min===0?Number.isNaN(c.evaluate(-1)):true}))),view3d:state.scenes.every(s=>state.spec.dimension===2||!!s.view)};
        });
        const identity=await host.evaluate(async e=>(await import('/assets/js/components/geometry-renderer.js')).getGeometryInstance(e).spec.source);assert.deepEqual(identity,spec.source,target.key+': source identity');
        const clippedLabels=await host.locator('.native-geometry__board').evaluateAll(boards=>boards.flatMap(board=>{
          const rect=board.getBoundingClientRect();return Array.from(board.querySelectorAll('text')).filter(t=>/[A-Za-zαθ]/u.test(t.textContent)&&t.getBoundingClientRect().width>0).filter(t=>{const r=t.getBoundingClientRect();return r.left<rect.left-1||r.top<rect.top-1||r.right>rect.right+1||r.bottom>rect.bottom+1;}).map(t=>t.textContent);
        }));assert.deepEqual(clippedLabels,[],target.key+': clipped mathematical labels');
        assert.equal(report.scenes,spec.views.length,target.key);assert.equal(report.valid,true,target.key);assert.equal(report.view3d,true,target.key);assert.ok(report.sizes.every(s=>s[0]>=150&&s[1]>=250),target.key+': size');assert.ok(report.domains.every(c=>c.invalid),target.key+': domain');
        assert.ok(report.points.every(p=>p.x>=5&&p.x<=p.width-5&&p.y>=5&&p.y<=p.height-5),target.key+': clipped source point '+JSON.stringify(report.points));
        for(const point of spec.objects.filter(o=>o.type==='point'&&o.visible&&o.label))assert.ok(report.labels.includes(point.label),target.key+': missing point label '+point.label);
        assert.equal(await host.locator('.native-geometry__board svg').count(),spec.views.length,target.key+': duplicate/missing board');
        assert.equal(await page.locator('.katex-error,.math-render-error').count(),0,target.key);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1),false,target.key+': overflow '+width);
        assert.equal(await host.locator('button').evaluateAll(buttons=>buttons.every(b=>b.getBoundingClientRect().height>=44&&b.getBoundingClientRect().width>=44)),true);
        assert.equal(await page.evaluate(()=>localStorage.getItem('geometry-progress-marker')),'preserve');
        if(spec.dimension===3){
          const before=await host.evaluate(async e=>(await import('/assets/js/components/geometry-renderer.js')).getGeometryInstance(e).scenes[0].view.az_slide.Value());
          await host.getByRole('button',{name:'Xoay phải',exact:true}).first().click();
          const after=await host.evaluate(async e=>(await import('/assets/js/components/geometry-renderer.js')).getGeometryInstance(e).scenes[0].view.az_slide.Value());assert.ok(Math.abs(after-before)>.1,target.key+': rotate');
          await host.getByRole('button',{name:'Đặt lại góc nhìn',exact:true}).first().click();
          await host.getByRole('button',{name:'Bật kéo để xoay hình',exact:true}).first().click();assert.equal(await host.getByRole('button',{name:'Bật kéo để xoay hình',exact:true}).first().getAttribute('aria-pressed'),'true');await host.getByRole('button',{name:'Bật kéo để xoay hình',exact:true}).first().click();
        }
        await host.getByRole('button',{name:'Phóng to',exact:true}).first().click();await host.getByRole('button',{name:'Đặt lại góc nhìn',exact:true}).first().click();
        const board=host.locator('.native-geometry__board').first();await board.focus();const route=page.url();await page.keyboard.press('ArrowRight');await page.keyboard.press('Home');assert.equal(page.url(),route,'Board keyboard must not navigate lessons');
        if(['13.6','28.8','32.4','33.7','CD08-CD11'].includes(target.key)&&[1366,390,320].includes(width))await host.screenshot({path:`.audit/geometry-v1/screenshots/${target.key}-${width}.png`});
        states.push({width,height,key:target.key,boards:report.scenes,properties:true});
      }
      // Repeated mount/dispose including pending asynchronous work shares the
      // existing graph library without leaving boards or observers behind.
      const lifecycle=await page.evaluate(async()=>{
        const renderer=await import('/assets/js/components/geometry-renderer.js');const host=document.querySelector('[data-source-geometry]'),spec=renderer.getGeometryInstance(host).spec;
        const before=renderer.activeGeometryCount();for(let i=0;i<5;i++){await renderer.renderGeometry(spec,host);renderer.disposeGeometry(host);await renderer.renderGeometry(spec,host);}
        const same=await renderer.renderGeometry(spec,host);const boards=host.querySelectorAll('svg').length;const detached=document.createElement('figure');document.body.append(detached);const pending=renderer.renderGeometry(spec,detached);renderer.disposeGeometry(detached);await pending;detached.remove();renderer.disposeDetachedGeometry();
        return {before,after:renderer.activeGeometryCount(),boards,views:same.spec.views.length};
      });assert.equal(lifecycle.before,lifecycle.after);assert.equal(lifecycle.boards,lifecycle.views);
      await page.goto(origin+'/documents.html?grade=12&topic=CD20&type=20.1&section=practice&item=1',{waitUntil:'networkidle'});await page.locator('[data-practice-answer]').first().click();await page.locator('.practice-feedback').waitFor();
      const progress=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('bienedu:progress:'))));await page.reload({waitUntil:'networkidle'});await page.locator('.practice-feedback').waitFor();assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('bienedu:progress:')))),progress);
      const noGraph=await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>e.name.includes('jsxgraphcore')).length);assert.equal(noGraph,0,'Text/practice pages must not download JSXGraph');
      assert.deepEqual(errors,[]);console.log(`Geometry: ${width}×${height}, all 30 learner routes passed`);await context.close();
    }
    const context=await site.browser.newContext(),page=await context.newPage();
    await page.goto(site.origin+'/documents.html?grade=12&topic=CD28&type=28.1&section=knowledge&item=1',{waitUntil:'networkidle'});assert.equal(await page.locator('[data-source-geometry]').count(),0,'Unactivated active runtime must remain unchanged');await context.close();
    assert.deepEqual(hashes(),runtimeHashes,'Runtime changed during browser validation; rerun required');
    writeFileSync('.audit/geometry-v1/browser.json',JSON.stringify({passed:true,bundleHash:pointer.sha256,runtimeHashes,states,unactivatedRuntimePreserved:true,progressReload:true,lifecycle:true},null,2)+'\n');
  }finally{server.closeAllConnections();await new Promise(done=>server.close(done));await site.close();}
});
