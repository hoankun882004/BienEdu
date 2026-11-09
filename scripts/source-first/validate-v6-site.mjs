// Read-only browser validation after an explicitly authorized local release.
import assert from 'node:assert/strict';
import {localSite} from '../../tests/helpers/local-site.mjs';
export async function validateV6Site(){
  const site=await localSite(),states=[],errors=[];
  try{for(const viewport of [{width:390,height:844},{width:1366,height:768}]){
    const page=await site.browser.newPage({viewport});page.on('pageerror',(e)=>errors.push(e.message));
    for(const [name,url,selector]of [['new-knowledge','CD17&type=17.1&section=knowledge&item=1','.math-lesson'],['new-example','CD17&type=17.1&section=example&item=3','.example-reader'],['native-graph','CD06&type=6.1&section=example&item=7','[data-graph-replacement]']]){
      await page.goto(`${site.origin}/documents.html?grade=12&topic=${url}`,{waitUntil:'networkidle'});await page.locator(selector).waitFor();
      assert.equal(await page.locator('.katex-error,.math-render-error').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);states.push({name,viewport,passed:true});
    }await page.close();
  }assert.deepEqual(errors,[]);return {passed:true,states,errors,readOnly:true};}finally{await site.close();}
}
