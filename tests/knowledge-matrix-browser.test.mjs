import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {localSite} from './helpers/local-site.mjs';
import {pdfKnowledgeRelease} from '../assets/js/data/pdf-knowledge-release.js';
import {normalizeMath} from '../assets/js/components/canonical-math.js';
import {runtimeHashes} from '../scripts/source-first/conversion-recovery.mjs';
const output='.audit/quality-recovery';
const data=JSON.parse(readFileSync(pdfKnowledgeRelease.bundle,'utf8'));
const sizes=[[1280,720],[1366,768],[1440,900],[1536,864],[1920,1080],[320,568],[360,800],[390,844],[430,932],[768,1024],[1024,768],[844,390]];
const routes=[['CD01',null],['CD08',null],['CD12','12.1'],['CD13','13.3'],['CD14','14.8'],['CD15','15.1'],['CD17','17.1'],['CD20','20.1'],['CD21','21.8'],['CD28','28.1'],['CD32','32.5']];
const math=node=>node.type==='math'?[normalizeMath(node.latex)]:node.type==='rich-text'?node.segments.flatMap(math):[];
test('real source lessons: document scroll, math/table fidelity, accessible local scroll and measured CLS',{timeout:600000},async()=>{
  mkdirSync(output+'/matrix',{recursive:true});const site=await localSite(),states=[],hashes=runtimeHashes();
  try{
    for(const [width,height]of sizes){
      const page=await site.browser.newPage({viewport:{width,height},hasTouch:width<768,isMobile:width<768});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>{
        window.knowledgeCLS=0;
        new PerformanceObserver(entries=>{for(const entry of entries.getEntries())if(!entry.hadRecentInput)window.knowledgeCLS+=entry.value;}).observe({type:'layout-shift',buffered:true});
      });
      for(const [topic,code]of routes){
        await page.goto(`${site.origin}/documents.html?grade=12&topic=${topic}${code?'&type='+code:''}&section=knowledge&item=1`,{waitUntil:'networkidle'});
        await page.locator('[data-native-pdf-knowledge]').waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(200);
        const initialCLS=await page.evaluate(()=>window.knowledgeCLS);
        await page.evaluate(()=>document.querySelectorAll('.pdf-theory__alternative').forEach(e=>e.open=true));
        // Each block is compared to its own independent source edition, not to
        // a page-wide count that could hide duplicates or wrong associations.
        const editions=await page.locator('.pdf-theory__edition').evaluateAll(elements=>elements.map(e=>({id:e.dataset.pdfKnowledge,blocks:[...e.querySelectorAll('[data-source-block]')].map(b=>({id:b.dataset.sourceBlock,math:[...b.querySelectorAll('annotation[encoding="application/x-tex"]')].map(n=>n.textContent),rows:b.querySelectorAll('tr').length,cells:[...b.querySelectorAll('tr')].map(r=>r.children.length)}))})));
        for(const edition of editions){const source=data.articles.find(a=>a.id===edition.id);assert.ok(source,edition.id);for(const b of edition.blocks){const expected=source.blocks.find(n=>n.id===b.id);assert.ok(expected,b.id);assert.deepEqual(b.math,expected.kind==='table'?expected.rows.flatMap(row=>row.flatMap(math)):math(expected.content),b.id);if(expected.kind==='table'){assert.equal(b.rows,expected.rows.length);assert.deepEqual(b.cells,expected.rows.map(row=>row.length));}}}
        assert.equal(await page.locator('.katex-error,.math-render-error').count(),0);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${topic} ${width} page overflow`);
        const clippedScrollTargets=await page.locator('.pdf-theory__formula-row>[data-math-scroll]').evaluateAll(nodes=>nodes.filter(e=>{
          const math=e.querySelector('.katex-display');
          return math&&math.getBoundingClientRect().width>e.clientWidth+4&&e.scrollWidth<=e.clientWidth+4;
        }).length);
        assert.equal(clippedScrollTargets,0,'Long math must overflow the focusable scroll owner, not an inaccessible nested wrapper');
        // Native text outside KaTeX must not leak raw source math commands.
        const leaks=await page.locator('.pdf-theory').evaluate(e=>{const walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT),bad=[];let n;while((n=walker.nextNode()))if(!n.parentElement.closest('.katex,code,pre')&&/\\(?:frac|sqrt|int|sum|lim|begin|textbf)\b/u.test(n.textContent))bad.push(n.textContent.slice(0,100));return bad;});assert.deepEqual(leaks,[]);
        await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.press('End');await page.waitForTimeout(250);
        // An appended source-backed geometry figure is meaningful content too;
        // its preceding paragraph is not the final node of that lesson.
        const last=await page.locator('.pdf-theory__edition').last().locator('[data-source-block], .native-geometry').last().evaluate(e=>{
          const walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let n,last;while((n=walker.nextNode()))if(n.textContent.trim()&&!n.parentElement.closest('.katex-mathml')&&n.parentElement.getClientRects().length)last=n;
          const range=document.createRange();if(last){range.setStart(last,Math.max(0,last.length-24));range.setEnd(last,last.length);}else range.selectNodeContents(e);
          const r=range.getBoundingClientRect(),nav=document.querySelector('[data-lesson-navigation]').getBoundingClientRect(),header=document.querySelector('.site-header').getBoundingClientRect();
          return {id:e.dataset.sourceBlock??e.dataset.sourceGeometry,top:r.top,bottom:r.bottom,navTop:nav.top,headerBottom:Math.max(0,header.bottom),visible:r.top>=Math.max(0,header.bottom)-1&&r.bottom<=Math.min(innerHeight,nav.top)+1};
        });assert.equal(last.visible,true,`${topic} ${width} last content: ${JSON.stringify(last)}`);
        const expandedCLS=await page.evaluate(()=>window.knowledgeCLS);states.push({width,height,topic,code,editions:editions.length,last,cls:initialCLS,programmaticExpansionCLS:Math.max(0,expandedCLS-initialCLS)});
        if(['CD01','CD15'].includes(topic)&&[320,1920,844].includes(width))await page.screenshot({path:`${output}/matrix/${topic}-${width}x${height}-end.png`});
      }
      // Local equation arrows must pan the equation, never switch lessons.
      await page.goto(site.origin+'/documents.html?grade=12&topic=CD01&section=knowledge&item=1',{waitUntil:'networkidle'});await page.locator('[data-math-scroll]').first().waitFor();
      const overflow=page.locator('[data-math-scroll]').filter({has:page.locator('.katex')});
      for(let i=0;i<await overflow.count();i++){const target=overflow.nth(i);if(await target.evaluate(e=>e.scrollWidth>e.clientWidth+4)){await target.focus();const url=page.url();await page.keyboard.press('ArrowRight');await page.waitForTimeout(180);assert.equal(page.url(),url);assert.ok(await target.evaluate(e=>e.scrollLeft>0));break;}}
      assert.deepEqual(errors,[]);await page.close();console.log(`Knowledge matrix ${width}x${height}: 11 routes`);
    }
    assert.deepEqual(runtimeHashes(),hashes);
    writeFileSync(output+'/matrix.json',JSON.stringify({passed:true,runtimeHashes:hashes,states,maxCLS:Math.max(...states.map(s=>s.cls)),sizes,browserZoom:'Default 100%; no page scale override'},null,2)+'\n');
  }finally{await site.close();}
});
