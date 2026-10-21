import assert from "node:assert/strict";
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";

import { Browser, sleep } from "../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs";

const root = resolve(".");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".webp": "image/webp"
};

const server = createServer((request, response) => {
  try {
    let file = resolve(join(root, decodeURIComponent(new URL(request.url, "http://local").pathname)));
    if (file !== root && !file.startsWith(root + sep)) throw new Error("Forbidden");
    if (statSync(file).isDirectory()) file = join(file, "index.html");
    response.writeHead(200, { "cache-control": "no-store", "content-type": mime[extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404);
    response.end("not found");
  }
});

const viewports = [
  { width: 390, height: 844, mobile: true },
  { width: 768, height: 1024, mobile: false },
  { width: 1024, height: 768, mobile: false },
  { width: 1280, height: 720, mobile: false },
  { width: 1440, height: 900, mobile: false },
  { width: 1920, height: 1080, mobile: false }
];

const representativeRoutes = [
  { route: "topic=CD12&type=12.1&section=knowledge&item=1", selector: ".knowledge-reader" },
  { route: "topic=CD12&type=12.8&section=example&item=2", selector: ".example-reader" },
  { route: "topic=CD13&type=13.5&section=example&item=2", selector: ".example-reader" },
  { route: "topic=CD14&type=14.4&section=practice&item=9", selector: ".source-practice-stage" },
  { route: "topic=CD20&type=20.17&section=knowledge&item=1", selector: ".knowledge-reader" },
  { route: "topic=CD21&type=21.8&section=knowledge&item=1", selector: ".knowledge-reader" }
];

function lessonUrl(origin, route) {
  return `${origin}/documents.html?grade=12&${route}`;
}

async function inspectPage(page, selector) {
  return page.eval(`(() => {
    const stage = document.querySelector('.lesson-content');
    const content = document.querySelector(${JSON.stringify(selector)});
    const navigation = document.querySelector('.lesson-navigation');
    if (!stage || !content || !navigation) return { missing: true, text: document.body.innerText.slice(0, 240) };
    const contentBox = content.getBoundingClientRect();
    const stageBox = stage.getBoundingClientRect();
    const navBox = navigation.getBoundingClientRect();
    const overflowY = getComputedStyle(content).overflowY;
    return {
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      contentAccessible: content.scrollHeight <= content.clientHeight + 1 || ['auto', 'scroll', 'visible'].includes(overflowY),
      desktopContained: contentBox.top >= stageBox.top - 1 && contentBox.bottom <= navBox.top + 1,
      sourceLink: document.querySelector('.source-reference')?.getAttribute('href') ?? null,
      generatedCount: document.querySelector('.lesson-sidebar li:nth-child(3) small')?.textContent ?? '',
      pageHeight: document.documentElement.scrollHeight,
      viewportHeight: innerHeight
    };
  })()`);
}

await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await Browser.launch();

try {
  const page = await browser.newPage(viewports[0]);

  for (const viewport of viewports) {
    await page.setViewport(viewport);
    for (const item of representativeRoutes) {
      await page.goto(lessonUrl(origin, item.route), { timeoutMs: 30000, settleMs: 180 });
      const layout = await inspectPage(page, item.selector);
      const label = `${item.route} at ${viewport.width}x${viewport.height}`;
      assert.notEqual(layout.missing, true, `${label} renders its generic lesson component`);
      assert.equal(layout.horizontalOverflow, false, `${label} has no horizontal overflow`);
      assert.equal(layout.contentAccessible, true, `${label} keeps all content reachable`);
      if (viewport.width >= 1024) assert.equal(layout.desktopContained, true, `${label} stays above bottom navigation`);
      if (layout.sourceLink) assert.equal(await page.eval(`fetch(${JSON.stringify(layout.sourceLink)}).then((response) => response.ok)`), true, `${label} keeps a working PDF source link`);
    }

    await page.goto(lessonUrl(origin, "topic=CD14&type=14.4&section=practice&item=9"), { timeoutMs: 30000, settleMs: 180 });
    assert.equal(await page.eval("document.querySelector('.source-practice-stage').classList.contains('is-review')"), true);
    assert.equal(await page.eval("document.querySelector('[data-practice-answer]')"), null, "source-conflict exercise is never auto-graded");
    await page.eval("document.querySelector('.source-practice-stage__answer').open = true");
    assert.ok(await page.eval("document.querySelector('.source-practice-stage__answer aside').textContent.includes('Ghi chú kiểm toán')"));
    if (viewport.width <= 768) {
      const clearance = await page.eval(`(() => {
        scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
        const answer = document.querySelector('.source-practice-stage__answer').getBoundingClientRect();
        const navigation = document.querySelector('.lesson-navigation').getBoundingClientRect();
        return navigation.top - answer.bottom;
      })()`);
      assert.ok(clearance >= 8, `source answer clears sticky navigation at ${viewport.width}x${viewport.height}`);
    }
    await page.screenshot({
      path: `.audit/v11-2-source-practice-${viewport.width}x${viewport.height}.jpg`,
      quality: 88,
      fullPage: viewport.width <= 768
    });
  }

  await page.setViewport({ width: 1440, height: 900, mobile: false });
  await page.goto(lessonUrl(origin, "topic=CD12&type=12.1&section=practice&item=3"), { timeoutMs: 30000, settleMs: 180 });
  assert.equal(await page.eval("document.querySelector('.lesson-navigation button:last-child').textContent.trim()"), "Xem bài từ PDF →");
  assert.equal(await page.eval("document.querySelector('.lesson-sidebar li:nth-child(3) small').textContent"), "0/3 câu chấm · 10 bài nguồn");
  await page.eval("document.querySelector('.lesson-navigation button:last-child').click()");
  await sleep(380);
  assert.equal(await page.eval("new URLSearchParams(location.search).get('item')"), "4");
  assert.equal(await page.eval("document.querySelector('.source-practice-stage') !== null"), true);
  await page.eval("document.activeElement?.blur(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))");
  await sleep(180);
  assert.equal(await page.eval("new URLSearchParams(location.search).get('item')"), "3", "ArrowLeft returns from PDF practice without a reload");

  await page.goto(lessonUrl(origin, "topic=CD12&type=12.1&section=knowledge&item=1"), { timeoutMs: 30000, settleMs: 180 });
  await page.screenshot({ path: ".audit/v11-2-cd12-knowledge-1440x900.jpg", quality: 88 });
  await page.setViewport({ width: 390, height: 844, mobile: true });
  await page.goto(lessonUrl(origin, "topic=CD13&type=13.5&section=example&item=2"), { timeoutMs: 30000, settleMs: 180 });
  assert.ok(await page.eval("document.querySelectorAll('.example-reader__solution li').length >= 2"));
  await page.screenshot({ path: ".audit/v11-2-cd13-secondary-example-390x844.jpg", quality: 88, fullPage: true });

  console.log("V11.2 browser QA passed: six required viewports, representative CD12-CD14 source content, CD20-CD21 boundaries, PDF links, keyboard navigation and progress separation.");
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
