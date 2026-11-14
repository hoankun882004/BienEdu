import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {conversionPreviewServer} from '../scripts/source-first/conversion-preview.mjs';
import {read,output} from '../scripts/source-first/conversion-recovery.mjs';
import {localSite} from './helpers/local-site.mjs';
import {get} from 'node:http';

async function preview(fn){const server=conversionPreviewServer();await new Promise(done=>server.listen(0,'127.0.0.1',done));try{return await fn(`http://127.0.0.1:${server.address().port}`);}finally{server.closeAllConnections();await new Promise(done=>server.close(done));}}
test('local candidate preview is read-only and never exposes private tooling',()=>preview(async origin=>{
  const file='assets/js/data/pdf-knowledge-release.js',before=readFileSync(file),summary=read(output+'/summary.json');
  assert.equal((await fetch(origin)).status,200);
  assert.ok((await (await fetch(origin+'/'+file)).text()).includes(summary.candidate.knowledge.sha256));
  assert.equal((await fetch(origin+'/documents.html',{method:'POST',body:'no writes'})).status,405);
  for(const path of ['/.git/config','/.content-work/manifest.json','/node_modules/katex/package.json','/scripts/source-first/conversion-release.mjs'])assert.equal((await fetch(origin+path)).status,404,path);
  // Fetch controls Host itself; use a real HTTP request to exercise rebinding.
  const rejected=await new Promise((done,reject)=>get(origin,{headers:{host:'untrusted.invalid'}},response=>{response.resume();done(response.statusCode);}).on('error',reject));
  assert.equal(rejected,403);
  assert.deepEqual(readFileSync(file),before);
}));
test('working read-only preview serves actual learner math and geometry without page overflow',()=>preview(async origin=>{
  const site=await localSite();try{
    const page=await site.browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/documents.html?grade=12&topic=CD12&type=12.1&section=knowledge&item=1',{waitUntil:'networkidle'});
    await page.locator('[data-native-pdf-knowledge]').waitFor();await page.locator('.pdf-theory__alternative').evaluateAll(nodes=>nodes.forEach(e=>e.open=true));
    const correction=page.locator('[data-source-block="cd12-cd14-calculus:12.1:knowledge:block:6"]');
    assert.ok((await correction.innerText()).includes('Tính tuyến tính'));
    assert.ok(await correction.locator('annotation[encoding="application/x-tex"]').evaluateAll(nodes=>nodes.some(n=>n.textContent.includes('\\mathrm{d}'))));
    assert.equal(await page.locator('.katex-error,.math-render-error').count(),0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.goto(origin+'/documents.html?grade=12&topic=CD28&type=28.1&section=knowledge&item=1',{waitUntil:'networkidle'});
    await page.locator('[data-source-geometry]').first().scrollIntoViewIfNeeded();await page.locator('[data-geometry-ready="true"]').first().waitFor();assert.deepEqual(errors,[]);
  }finally{await site.close();}
}));
