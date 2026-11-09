import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,copyFileSync,rmSync}from'node:fs';
import{join,dirname,relative,resolve}from'node:path';
import{tmpdir}from'node:os';
import{localSite}from'../tests/helpers/local-site.mjs';
import{applyV6,output}from'../scripts/source-first/release-v6.mjs';
import{digest}from'../scripts/source-first/model.mjs';
import{buildActivePracticeSet}from'../assets/js/domain/practice-bank.js';
const root=process.cwd(),report=JSON.parse(readFileSync(join(root,output,'inventory.json'),'utf8')),plan=JSON.parse(readFileSync(join(root,report.manifest),'utf8'));
const base=mkdtempSync(join(tmpdir(),'bienedu-browser-v6-'));
for(const file of [...plan.dependencies.map((d)=>d.file),...plan.files.map((d)=>d.file),report.manifest,...plan.files.map((f)=>`.content-work/release-v6/${plan.planHash}/${digest(f.file)}.before`)]){const to=join(base,file);mkdirSync(dirname(to),{recursive:true});copyFileSync(join(root,file),to);}mkdirSync(join(base,'.git'));
const site=await localSite({fixtureRoot:base}),states=[],errors=[];
try{
  const options={base,execute:true,development:true,authorize:plan.planHash};assert.equal(applyV6(plan,options).writes,2);
  for(const [width,height]of [[320,568],[390,844],[1366,768]]){
    const context=await site.browser.newContext({viewport:{width,height},hasTouch:width<768,isMobile:width<768,locale:'vi-VN',reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',(e)=>errors.push(e.message));
    await page.goto(`${site.origin}/documents.html?grade=12&topic=CD17&type=17.1&section=knowledge&item=1`,{waitUntil:'networkidle'});await page.locator('.math-lesson').waitFor();
    assert.ok((await page.locator('[data-lesson-content]').innerText()).includes('chỉ số'));
    assert.ok((await page.locator('.math-lesson annotation').allTextContents()).includes(String.raw`n\ge1`),'The source index condition must be mathematical notation');
    assert.equal(await page.locator('main').count(),1,'No nested main landmarks');
    await page.screenshot({path:join(root,output,`integrated-17.1-knowledge-${width}.png`)});
    for(let item=1;item<=10;item++){
      await page.goto(`${site.origin}/documents.html?grade=12&topic=CD17&type=17.1&section=example&item=${item}`,{waitUntil:'networkidle'});await page.locator('.example-reader__solution').waitFor();
      assert.equal(await page.locator('.example-reader__solution[open]').count(),0,'Solutions not revealed by default');
      await page.locator('.example-reader__solution>summary').click();assert.ok(await page.locator('.example-reader .katex').count());
      assert.equal(await page.locator('.katex-error,.math-render-error').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      states.push({kind:'integrated-sequence',item,width,passed:true});
      if([3,6,9].includes(item))await page.screenshot({path:join(root,output,`integrated-17.1-example-${item}-${width}.png`)});
    }
    // Applied V5.6 values are read from the actual fixture module, not mocks.
    await page.goto(`${site.origin}/documents.html?grade=12&topic=CD01&type=1.3&section=example&item=2`,{waitUntil:'networkidle'});await page.locator('.example-reader__solution>summary').click();
    assert.ok(await page.locator('.example-reader mfrac').count());assert.ok(await page.locator('.example-reader msqrt').count());
    states.push({kind:'integrated-v56-correction',width,passed:true});
    await page.goto(`${site.origin}/documents.html?grade=12&topic=CD06&type=6.1&section=example&item=7`,{waitUntil:'networkidle'});await page.locator('[data-graph-replacement]').waitFor();assert.equal(await page.locator('[data-native-graph]').count(),1);
    await page.locator('.nav-button--primary[data-slide-index]').click();await page.locator('[data-graph-replacement="6.1-example-8-figure-1"]').waitFor();
    await page.goBack({waitUntil:'networkidle'});await page.locator('[data-graph-replacement="6.1-example-7-figure-1"]').waitFor();
    states.push({kind:'integrated-graph-history',width,passed:true});
    await page.goto(`${site.origin}/documents.html?grade=12&topic=CD20&type=20.1&section=practice&item=1`,{waitUntil:'networkidle'});
    const qs=buildActivePracticeSet('20.1','PRACTICE_V15');await page.locator(`[data-practice-answer="${qs[0].correctIndex}"]`).click();await page.locator('.practice-feedback.is-correct').waitFor();await page.reload({waitUntil:'networkidle'});await page.locator('.practice-feedback.is-correct').waitFor();
    await page.goto(`${site.origin}/documents.html?grade=12&topic=CD20&type=20.1&section=practice&item=2`,{waitUntil:'networkidle'});await page.locator(`[data-practice-answer="${(qs[1].correctIndex+1)%qs[1].options.length}"]`).click();await page.locator('.practice-feedback.is-wrong').waitFor();
    assert.equal(await page.locator('.practice-feedback').getAttribute('aria-atomic'),'true');
    if(width<768){await page.locator('.menu-toggle').click();assert.equal(await page.locator('.site-nav').evaluate((n)=>n.inert),false);await page.locator('.site-nav a').last().focus();await page.keyboard.press('Tab');assert.equal(await page.locator('.menu-toggle').evaluate((n)=>n===document.activeElement),true);await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('.site-nav').inert);assert.equal(await page.locator('.menu-toggle').evaluate((n)=>n===document.activeElement),true);}
    states.push({kind:'practice-keyboard-persistence',width,passed:true});await context.close();
  }
  assert.equal(applyV6(plan,{...options,rollback:true}).writes,2);
  const page=await site.browser.newPage();await page.goto(`${site.origin}/documents.html?grade=12&topic=CD06&type=6.1&section=example&item=7`,{waitUntil:'networkidle'});assert.equal(await page.locator('[data-native-graph]').count(),0);assert.ok(await page.locator('.example-reader__figures img').isVisible());await page.close();
  for(const file of plan.files)assert.equal(digest(readFileSync(join(root,file.file))),file.beforeHash,'Real learner data untouched');assert.deepEqual(errors,[]);
  writeFileSync(join(root,output,'browser.json'),JSON.stringify({passed:true,states,errors,fixtureApplyRollback:true,realRuntimeWrites:0},null,2)+'\n');console.log(JSON.stringify({passed:true,states:states.length,realRuntimeWrites:0}));
}finally{await site.close();const rel=relative(resolve(tmpdir()),resolve(base));assert.ok(rel&&!rel.startsWith('..'));rmSync(base,{recursive:true,force:true});}
