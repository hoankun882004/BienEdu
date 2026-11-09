import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync,existsSync,statSync,mkdirSync,writeFileSync } from "node:fs";
import { join,resolve,sep,extname } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { root as projectRoot } from "./build.mjs";
import { extractDelimitedMath } from "./tex.mjs";

// Same actual-file serving convention as V5.5. No response/module overrides,
// no existing user session, no hidden write to real runtime or learner storage.
export async function checkBatchBrowser(root,plan,{output=join(root,".audit/source-first-v5"),phase="after"}={}) {
  mkdirSync(output,{recursive:true});
  const mime={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".woff2":"font/woff2",".png":"image/png",".jpg":"image/jpeg",".webp":"image/webp"};
  const server=createServer((request,response)=>{
    try {const path=decodeURIComponent(new URL(request.url,"http://local").pathname);let file=resolve(join(root,path));
      if(file!==root&&!file.startsWith(root+sep))throw new Error("Forbidden");
      if(!existsSync(file)){file=resolve(join(projectRoot,path));if(file!==projectRoot&&!file.startsWith(projectRoot+sep))throw new Error("Forbidden");}
      if(statSync(file).isDirectory())file=join(file,"index.html");
      response.writeHead(200,{"content-type":mime[extname(file)]??"application/octet-stream","cache-control":"no-store"});response.end(readFileSync(file));
    }catch{response.writeHead(404);response.end("Not found");}
  });
  await new Promise((done)=>server.listen(0,"127.0.0.1",done));let browser;
  try {
    const executablePath=["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Google/Chrome/Application/chrome.exe","C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
    browser=await chromium.launch({executablePath,headless:true});
    const context=await browser.newContext({locale:"vi-VN",reducedMotion:"reduce"}),page=await context.newPage(),errors=[],states=[];
    page.on("pageerror",(error)=>errors.push(error.message));
    const {getExampleContent}=await import(pathToFileURL(join(root,"assets/js/data/example-content.js")).href);
    const origin=`http://127.0.0.1:${server.address().port}`,sentinel={viewedKnowledge:["v56-retained"],openedExamples:[],viewedExamples:[],practiceAnswers:{existing:"answer"},knowledgePdfProgress:{viewedSegments:[],completed:false}};
    await page.goto(`${origin}/documents.html?grade=12`);
    await page.evaluate((sentinel)=>localStorage.setItem("bienedu:progress:v2:grade12",JSON.stringify({version:2,lessons:{"v56-sentinel":sentinel},exams:{}})),sentinel);
    const records=[...new Set(plan.files.flatMap((file)=>file.changes.map((change)=>change.recordId)))];
    for(const viewport of [{width:1366,height:768},{width:390,height:844}]) {
      await page.setViewportSize(viewport);
      for(const recordId of records) {
        const code=recordId.split("-")[0],examples=getExampleContent(code),position=examples.findIndex((entry)=>entry.id===recordId)+1;
        assert.ok(position>0);const record=examples[position-1],topic=`CD${code.split(".")[0].padStart(2,"0")}`;
        const route=`/documents.html?grade=12&topic=${topic}&type=${code}&section=example&item=${position}`;
        await page.goto(origin+route,{waitUntil:"networkidle"});
        await page.locator(".example-reader").waitFor();assert.equal(await page.locator(".example-reader__question").count(),1);
        await page.locator(".example-reader__solution > summary").click();
        const annotations=await page.locator(".example-reader annotation").allTextContents();
        if(phase==="after") {
          for(const change of plan.files.flatMap((file)=>file.changes).filter((change)=>change.recordId===recordId)) {
            for(const math of extractDelimitedMath(change.after))assert.ok(annotations.includes(math.raw),`${recordId}: missing actual proposed math ${math.raw}`);
          }
          assert.ok(await page.locator(".example-reader mfrac").count(),`${recordId}: actual fraction structure missing`);
        }
        // The image-zoom dialog has an intentionally empty <img> until opened.
        // Validate actual source assets, not that inactive dialog placeholder.
        await page.locator(".example-reader img[src]").evaluateAll(async(nodes)=>{for(const node of nodes){node.loading="eager";try{await node.decode();}catch{/* Report exact failing asset below. */}}});
        const images=await page.locator(".example-reader img[src]").evaluateAll((nodes)=>nodes.map((node)=>({src:node.getAttribute("src"),loaded:node.complete&&node.naturalWidth>0})));
        assert.ok(images.every((entry)=>entry.loaded),`${recordId}: missing source image ${JSON.stringify(images)}`);
        if(record.assetReferences?.length)assert.ok(images.length>=record.assetReferences.length);
        const health=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,mathErrors:document.querySelectorAll(".katex-error,.math-render-error").length,humanBadge:[...document.querySelectorAll("small")].some((node)=>node.textContent.trim()==="Đã kiểm duyệt")}));
        assert.deepEqual(health,{overflow:false,mathErrors:0,humanBadge:false});
        await page.locator(".example-reader__solution").evaluate((node)=>node.scrollIntoView({block:"start"}));
        const screenshot=`v56-${recordId}-${phase}-${viewport.width}.png`;
        await page.screenshot({path:join(output,screenshot)});
        states.push({recordId,route,phase,viewport,...health,figures:images.length,screenshot});
      }
    }
    assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem("bienedu:progress:v2:grade12")).lessons["v56-sentinel"]),sentinel);
    await page.goto(`${origin}/documents.html?grade=12&topic=CD20&type=20.1&section=practice&item=1`,{waitUntil:"networkidle"});
    await page.locator(".practice-stage").waitFor();assert.ok(await page.locator(".practice-options button,.practice-reveal").count());assert.deepEqual(errors,[]);
    const result={passed:true,phase,planHash:plan.planHash,actualLocalFiles:true,humanEditorialApproval:false,states,errors,progressPreserved:true,exercisesPreserved:true};
    writeFileSync(join(output,`browser-v5.6-${phase}.json`),JSON.stringify(result,null,2)+"\n");return result;
  }finally{if(browser)await browser.close();server.closeAllConnections();await new Promise((done)=>server.close(done));}
}
