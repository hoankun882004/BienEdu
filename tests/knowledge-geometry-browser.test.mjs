import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {localSite} from './helpers/local-site.mjs';
import {conversionPreviewServer} from '../scripts/source-first/conversion-preview.mjs';
import {read,output,runtimeHashes} from '../scripts/source-first/conversion-recovery.mjs';
const sizes=[[320,568],[360,800],[390,844],[430,932],[768,1024],[1024,768],[1366,768],[844,390]];

test('knowledge document layout preserves all 30 native geometry constructions at eight viewports',{timeout:600000},async()=>{
  const summary=read(output+'/summary.json'),bundle=JSON.parse(readFileSync(summary.candidate.geometry.bundle,'utf8'));
  // Validate the candidate/receipt before opening owned browser resources.
  const server=conversionPreviewServer(),site=await localSite();await new Promise(done=>server.listen(0,'127.0.0.1',done));
  const origin='http://127.0.0.1:'+server.address().port,states=[],hashes=runtimeHashes();
  try{
    for(const [width,height]of sizes){
      const page=await site.browser.newPage({viewport:{width,height},hasTouch:width<768,isMobile:width<768,reducedMotion:'reduce'}),errors=[];
      page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
      for(const {target,spec}of bundle.candidates){
        await page.goto(origin+'/'+target.route,{waitUntil:'domcontentloaded'});
        const host=page.locator(`[data-source-geometry="${target.blockId}"]`);await host.waitFor();await host.scrollIntoViewIfNeeded();
        await page.waitForFunction(id=>document.querySelector(`[data-geometry-id="${id}"]`)?.dataset.geometryReady==='true',spec.id,{timeout:20000});
        const result=await host.evaluate(async e=>{
          const {getGeometryInstance}=await import('/assets/js/components/geometry-renderer.js'),{checkGeometryProperties}=await import('/assets/js/components/geometry-spec.js'),state=getGeometryInstance(e);
          return {source:state.spec.source,valid:checkGeometryProperties(state.spec).every(r=>r.valid),scenes:state.scenes.length,boards:e.querySelectorAll('.native-geometry__board svg').length,
            sizes:state.scenes.map(s=>[s.plot.clientWidth,s.plot.clientHeight]),
            points:state.scenes.flatMap((scene,index)=>state.spec.objects.filter(o=>o.type==='point'&&o.visible&&o.view===state.spec.views[index].id).map(o=>{const p=scene.objects.get(o.id),c=(p.element2D??p).coords.scrCoords;return {id:o.id,x:c[1],y:c[2],width:scene.plot.clientWidth,height:scene.plot.clientHeight};})),
            clipped:[...e.querySelectorAll('.native-geometry__board')].flatMap(b=>{const r=b.getBoundingClientRect();return [...b.querySelectorAll('text')].filter(t=>/[A-Za-zαθ]/u.test(t.textContent)&&t.getBoundingClientRect().width>0).filter(t=>{const x=t.getBoundingClientRect();return x.left<r.left-1||x.right>r.right+1||x.top<r.top-1||x.bottom>r.bottom+1;}).map(t=>t.textContent);})};
        });
        assert.deepEqual(result.source,spec.source);assert.equal(result.valid,true);assert.equal(result.scenes,spec.views.length);assert.equal(result.boards,spec.views.length);
        assert.ok(result.sizes.every(s=>s[0]>=150&&s[1]>=250));assert.deepEqual(result.clipped,[],`${target.key} ${width}`);
        assert.ok(result.points.every(p=>p.x>=5&&p.x<=p.width-5&&p.y>=5&&p.y<=p.height-5),target.key);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(await page.locator('.katex-error,.math-render-error').count(),0);
        if(spec.dimension===3){
          const camera=()=>host.evaluate(async e=>(await import('/assets/js/components/geometry-renderer.js')).getGeometryInstance(e).scenes[0].view.az_slide.Value());
          const before=await camera();await host.getByRole('button',{name:'Xoay phải',exact:true}).first().click();assert.ok(Math.abs(await camera()-before)>.1);
        }
        await host.getByRole('button',{name:'Phóng to',exact:true}).first().click();await host.getByRole('button',{name:'Đặt lại góc nhìn',exact:true}).first().click();
        states.push({width,height,key:target.key,recordId:target.recordId,sourceId:spec.source.sourceId,properties:true,boards:result.boards});
      }
      const lifecycle=await page.evaluate(async()=>{const r=await import('/assets/js/components/geometry-renderer.js'),host=document.querySelector('[data-source-geometry]'),state=r.getGeometryInstance(host),before=r.activeGeometryCount();for(let i=0;i<3;i++){r.disposeGeometry(host);await r.renderGeometry(state.spec,host);}return {before,after:r.activeGeometryCount(),boards:host.querySelectorAll('svg').length,expected:state.spec.views.length};});
      assert.equal(lifecycle.before,lifecycle.after);assert.equal(lifecycle.boards,lifecycle.expected);assert.deepEqual(errors,[]);await page.close();
      console.log(`Knowledge geometry ${width}x${height}: 30 records`);
    }
    assert.deepEqual(runtimeHashes(),hashes);
    writeFileSync('.audit/quality-recovery/geometry.json',JSON.stringify({passed:true,candidate:summary.candidate,runtimeHashes:hashes,records:30,states,lifecycle:true,scope:'Current source-backed constructions on candidate learner routes; no physical-device or new touch-engine certification'},null,2)+'\n');
  }finally{server.closeAllConnections();await new Promise(done=>server.close(done));await site.close();}
});
