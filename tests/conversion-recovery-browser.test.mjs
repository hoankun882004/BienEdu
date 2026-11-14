import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {localSite} from './helpers/local-site.mjs';
import {root,output,read,json,runtimeHashes} from '../scripts/source-first/conversion-recovery.mjs';
import {normalizeMath} from '../assets/js/components/canonical-math.js';

const sizes=[[320,568],[360,800],[390,844],[430,932],[768,1024],[1024,768],[1366,768],[844,390]];
const math=n=>n?.type==='math'?[normalizeMath(n.latex)]:n?.type==='rich-text'?n.segments.flatMap(math):[];
const route=(topic,code,section='knowledge')=>`/documents.html?grade=12&topic=${topic}&type=${code}&section=${section}&item=1`;

test('conversion child and current runtime: source DOM, tables, practice and geometry at eight sizes',async()=>{
  const summary=read(output+'/summary.json'),corrections=read(output+'/pdf-corrections.json');
  const fixture=join(root,output,'runtime');mkdirSync(join(fixture,'assets/js/data'),{recursive:true});
  writeFileSync(join(fixture,'assets/js/data/pdf-knowledge-release.js'),`export const pdfKnowledgeRelease=${JSON.stringify(summary.candidate.knowledge)};`);
  writeFileSync(join(fixture,'assets/js/data/geometry-activation.js'),`export const geometryActivation=${JSON.stringify(summary.candidate.geometry)};`);
  const states=[],screenshots=[];
  mkdirSync(join(root,output,'screenshots'),{recursive:true});
  for(const mode of ['current','candidate']){
    const site=await localSite({fixtureRoot:mode==='candidate'?fixture:null});
    try{
      for(const [width,height]of sizes){
        const context=await site.browser.newContext({viewport:{width,height},hasTouch:width<768,isMobile:width<768}),page=await context.newPage(),errors=[],failed=[];
        page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
        page.on('response',r=>{if(r.status()>=400)failed.push({url:new URL(r.url()).pathname,status:r.status()});});
        const routes=mode==='candidate'?[...new Set(corrections.map(c=>c.recordId.split(':')[1]))].filter(c=>/^\d/u.test(c)):['12.1','13.3','14.8','15.1','20.1','21.8'];
        for(const code of routes){
          const topic='CD'+code.split('.')[0];
          await page.goto(site.origin+route(topic,code),{waitUntil:'networkidle'});await page.locator('[data-native-pdf-knowledge]').waitFor();
          await page.evaluate(async()=>{await document.fonts.ready;document.querySelectorAll('.pdf-theory__alternative').forEach(e=>e.open=true);});
          assert.equal(await page.locator('.katex-error,.math-render-error').count(),0,`${mode} ${code} ${width}`);
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${code}: global overflow at ${width}`);
          if(mode==='candidate'){
            // Source edition identity + exact per-block MathML annotations, not
            // a mere screenshot or a count of all math elsewhere on the page.
            for(const c of corrections.filter(c=>c.recordId.split(':')[1]===code||(code==='12.1'&&c.recordId.split(':')[1]==='CD12-CD14'))){
              const actual=await page.locator(`[data-source-block="${c.blockId}"]`).evaluate(e=>({
                source:e.closest('[data-source-id]')?.dataset.sourceId,
                math:[...e.querySelectorAll('.katex-mathml annotation[encoding="application/x-tex"]')].map(a=>a.textContent),
                wrappers:e.querySelectorAll('.canonical-math').length,
                clipping:[...e.querySelectorAll('.canonical-math')].some(m=>m.scrollHeight>m.clientHeight+2)
              }));
              assert.equal(actual.source,c.source.sourceId);assert.deepEqual(actual.math,math(c.after),c.blockId);assert.equal(actual.wrappers,actual.math.length);assert.equal(actual.clipping,false,c.blockId);
            }
          }
          if(['12.1','15.1'].includes(code)&&[320,1366].includes(width)){
            const file=`${output}/screenshots/${mode}-${code}-${width}.png`;await page.screenshot({path:join(root,file),fullPage:true});screenshots.push(file);
          }
          states.push({mode,width,height,code,section:'knowledge'});
        }
        // Source table cells are individually traceable and semantic.
        await page.goto(site.origin+route('CD15','15.1'),{waitUntil:'networkidle'});
        const table=page.locator('[data-source-block="cd15-cd16-trigonometry-2026:15.1:knowledge:block:2"]');
        assert.equal(await table.locator('tr').count(),5);assert.equal(await table.locator('tr').first().locator('th').count(),6);
        // The shared method/example/practice contracts still run unchanged.
        for(const section of ['types','example','practice']){
          await page.goto(site.origin+route('CD20','20.1',section),{waitUntil:'networkidle'});
          if(section==='practice'){
            await page.locator('[data-practice-answer]').first().click();await page.locator('.practice-feedback').waitFor();
            const before=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('bienedu:progress:'))));
            await page.reload({waitUntil:'networkidle'});await page.locator('.practice-feedback').waitFor();
            assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('bienedu:progress:')))),before);
          }
          assert.equal(await page.locator('.katex-error,.math-render-error').count(),0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
          states.push({mode,width,height,code:'20.1',section});
        }
        await page.goto(site.origin+route('CD28','28.1'),{waitUntil:'networkidle'});
        await page.locator('[data-source-geometry]').first().scrollIntoViewIfNeeded();await page.locator('[data-geometry-ready="true"]').first().waitFor();
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);await context.close();
      }
    }finally{await site.close();}
  }
  writeFileSync(join(root,output,'browser.json'),json({passed:true,candidate:summary.candidate,runtimeHashes:runtimeHashes(),states,screenshots,viewports:sizes,geometryCompatibility:true,practiceReload:true,physicalDeviceCertified:false}));
});

test('shared source correction MathML and local formula scrolling at all eight sizes',async()=>{
  const receipt=read(output+'/browser.json'),summary=read(output+'/summary.json');
  const corrections=read(output+'/pdf-corrections.json').filter(c=>c.recordId.split(':')[1]==='CD12-CD14');
  assert.equal(corrections.length,3);
  const site=await localSite({fixtureRoot:join(root,output,'runtime')});
  try{for(const [width,height]of sizes){
    const page=await site.browser.newPage({viewport:{width,height}});
    await page.goto(site.origin+route('CD12','12.1'),{waitUntil:'networkidle'});
    await page.locator('[data-native-pdf-knowledge]').waitFor();
    await page.evaluate(async()=>{await document.fonts.ready;document.querySelectorAll('.pdf-theory__alternative').forEach(e=>e.open=true);});
    for(const c of corrections){
      const actual=await page.locator(`[data-source-block="${c.blockId}"]`).evaluate(e=>[...e.querySelectorAll('.katex-mathml annotation[encoding="application/x-tex"]')].map(a=>a.textContent));
      assert.deepEqual(actual,math(c.after),c.blockId);
    }
    const bad=await page.locator('.pdf-theory .canonical-math').evaluateAll(nodes=>nodes.filter(e=>e.scrollWidth>e.clientWidth+2&&!['auto','scroll'].includes(getComputedStyle(e).overflowX)).length);
    assert.equal(bad,0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    if([320,1366].includes(width)){
      const target=page.locator('[data-source-block="cd12-cd14-calculus:12.1:knowledge:block:6"]');
      await target.scrollIntoViewIfNeeded();const file=`${output}/screenshots/differential-${width}.png`;await page.screenshot({path:join(root,file)});receipt.screenshots.push(file);
    }
    const radicals=read(output+'/pdf-corrections.json').filter(c=>c.category==='RADICAL_SCOPE');assert.equal(radicals.length,4);
    await page.goto(site.origin+'/documents.html?grade=12&topic=CD08&section=knowledge&item=1',{waitUntil:'networkidle'});
    await page.locator('[data-native-pdf-knowledge]').waitFor();
    for(const c of radicals){const node=page.locator(`[data-source-block="${c.blockId}"]`);assert.deepEqual(await node.locator('annotation[encoding="application/x-tex"]').allTextContents(),math(c.after));}
    assert.equal(await page.locator('.katex-error,.math-render-error').count(),0);
    await page.close();
  }}finally{await site.close();}
  assert.deepEqual(receipt.runtimeHashes,runtimeHashes());assert.deepEqual(receipt.candidate,summary.candidate);
  receipt.sharedSourceVerified=true;receipt.correctedBlockMathMLComparisons=43*8;
  writeFileSync(join(root,output,'browser.json'),json(receipt));
});
