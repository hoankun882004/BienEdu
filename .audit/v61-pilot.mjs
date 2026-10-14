import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import assert from "node:assert/strict";
import { Browser } from "../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs";

const root = resolve(".");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".webp": "image/webp", ".png": "image/png" };
const server = createServer((request, response) => {
  try {
    let file = resolve(join(root, decodeURIComponent(new URL(request.url, "http://local").pathname)));
    if (!file.startsWith(root + sep)) throw new Error("forbidden");
    if (statSync(file).isDirectory()) file = join(file, "index.html");
    response.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
    createReadStream(file).pipe(response);
  } catch { response.writeHead(404); response.end(); }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await Browser.launch();

try {
  const page = await browser.newPage({ width: 1024, height: 768, dsf: 1 });
  for (const width of [1024, 1280, 1440, 1920]) {
    await page.setViewport({ width, height: width === 1280 ? 720 : width === 1440 ? 900 : width === 1920 ? 1080 : 768, mobile: false });
    for (const view of ["knowledge", "example", "practice"]) {
      await page.goto(`${origin}/documents.html?topic=CD20&type=20.1&section=${view}&item=1`, { timeoutMs: 30000, settleMs: 250 });
      const metrics = await page.eval(`(() => { const stage = document.querySelector('.lesson-content'); const image = document.querySelector('.knowledge-stage img'); const canvas = document.querySelector('.knowledge-stage__canvas'); const imageBox = image?.getBoundingClientRect(); const canvasBox = canvas?.getBoundingClientRect(); return { page: document.documentElement.scrollHeight - document.documentElement.clientHeight, stage: stage.scrollHeight - stage.clientHeight, sidebar: document.querySelectorAll('.lesson-sidebar li').length, imageContained: !image || (imageBox.top >= canvasBox.top - 1 && imageBox.bottom <= canvasBox.bottom + 1 && imageBox.left >= canvasBox.left - 1 && imageBox.right <= canvasBox.right + 1) }; })()`);
      assert.ok(metrics.page <= 1, `${width} ${view}: page overflow ${metrics.page}`);
      assert.ok(metrics.stage <= 1, `${width} ${view}: stage overflow ${metrics.stage}`);
      assert.equal(metrics.sidebar, 3);
      assert.equal(metrics.imageContained, true, `${width} ${view}: source image clipped`);
      if ((width === 1024 || width === 1440) && view !== "practice") await page.screenshot({ path: `.audit/v61-20-1-${view}-${width}.jpg`, quality: 88 });
      if (view === "practice") {
        await page.eval("document.querySelector('[data-practice-answer]').click()");
        const graded = await page.eval(`(() => { const stage = document.querySelector('.lesson-content'); const feedback = document.querySelector('.practice-feedback'); return { stage: stage.scrollHeight - stage.clientHeight, feedbackBottom: feedback.getBoundingClientRect().bottom, stageBottom: stage.getBoundingClientRect().bottom }; })()`);
        assert.ok(graded.stage <= 1, `${width} practice graded: stage overflow ${graded.stage}`);
        assert.ok(graded.feedbackBottom <= graded.stageBottom + 1, `${width}: feedback clipped`);
        if (width === 1024 || width === 1440) await page.screenshot({ path: `.audit/v61-20-1-practice-${width}.jpg`, quality: 88 });
      }
    }
  }
  console.log("20.1 pilot passed at 1024, 1280, 1440 and 1920 with no page/stage overflow.");
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
