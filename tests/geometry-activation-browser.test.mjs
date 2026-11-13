import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,cpSync,rmSync,writeFileSync} from 'node:fs';
import {join,dirname,resolve,relative} from 'node:path';
import {tmpdir} from 'node:os';
import {executeGeometry} from '../scripts/source-first/geometry-release.mjs';
import {localSite} from './helpers/local-site.mjs';

test('fresh activation and rollback work on normal learner HTML in a disposable fixture',{timeout:90000},async()=>{
  const pointer=JSON.parse(readFileSync('.audit/geometry-v1/activation-plan.json')),plan=JSON.parse(readFileSync(pointer.manifest));
  const base=mkdtempSync(join(tmpdir(),'bienedu-geometry-browser-'));let site;
  try{
    const files=[pointer.manifest,'.audit/geometry-v1/activation-plan.json',...plan.dependencies.map(d=>d.file),...plan.files.map(f=>f.file),...plan.files.map((_,i)=>`.content-work/geometry-v1/${plan.planHash}/before-${i}.txt`)];
    for(const file of new Set(files)){const target=resolve(base,file);assert.ok(target.startsWith(base+ '\\')||target.startsWith(base+'/'));mkdirSync(dirname(target),{recursive:true});cpSync(file,target);}
    assert.equal(executeGeometry('apply',{root:base,authorize:plan.planHash,execute:true}).status,'ACTIVE');
    site=await localSite({fixtureRoot:base});const page=await site.browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    const url=site.origin+'/documents.html?grade=12&topic=CD33&type=33.8&section=knowledge&item=1';await page.goto(url,{waitUntil:'networkidle'});
    assert.equal(await page.locator('meta[name="bienedu-geometry-preview"]').count(),0,'Activation must work without preview injection');
    const host=page.locator('[data-source-geometry]');await host.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('[data-geometry-ready="true"]'));assert.equal(await host.locator('svg').count(),1);
    await page.goto(site.origin+'/documents.html?grade=12&topic=CD20&type=20.1&section=practice&item=1',{waitUntil:'networkidle'});await page.locator('[data-practice-answer]').first().click();await page.locator('.practice-feedback').waitFor();
    const progress=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('bienedu:progress:'))));
    assert.equal(executeGeometry('rollback',{root:base,authorize:plan.planHash,execute:true}).status,'PREPARED');
    await page.goto(url,{waitUntil:'networkidle'});assert.equal(await page.locator('[data-source-geometry]').count(),0);assert.equal(await page.locator('.pdf-theory__figure-note').count(),1);
    assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('bienedu:progress:')))),progress);
    assert.deepEqual(errors,[]);writeFileSync('.audit/geometry-v1/activation-browser.json',JSON.stringify({passed:true,planHash:plan.planHash,realRuntimeWrites:0,normalHtml:true,activation:true,rollback:true,practiceProgressPreserved:true},null,2)+'\n');
  }finally{if(site)await site.close();const rel=relative(resolve(tmpdir()),resolve(base));assert.ok(rel&&!rel.startsWith('..'));rmSync(base,{recursive:true,force:true});}
});
