import assert from "node:assert/strict";
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { Browser, sleep } from "../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs";

const root = resolve(".");
const mime = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
  ".pdf": "application/pdf", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf"
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
  { width: 430, height: 932, mobile: true },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 }
];
const representativePdfLessons = [
  ["CD12", "12.1"], ["CD13", "13.1"], ["CD14", "14.1"],
  ["CD20", "20.1"], ["CD20", "20.17"], ["CD21", "21.1"], ["CD21", "21.8"]
];

function lessonUrl(origin, topic, code) {
  return `${origin}/documents.html?grade=12&topic=${topic}&type=${code}&section=knowledge&item=1`;
}

async function inspect(page) {
  return page.eval(`(() => {
    const workspace = document.querySelector('.learning-workspace');
    const toolbar = document.querySelector('.knowledge-presentation-toolbar');
    const viewer = document.querySelector('[data-pdf-viewer]');
    const navigation = document.querySelector('.pdf-reader__navigation');
    return {
      active: document.body.classList.contains('presentation-mode') && workspace?.classList.contains('is-presenting'),
      toolbarVisible: Boolean(toolbar) && getComputedStyle(toolbar).display !== 'none',
      siteHeaderHidden: getComputedStyle(document.querySelector('.site-header')).display === 'none',
      sidebarHidden: getComputedStyle(document.querySelector('.lesson-sidebar')).display === 'none',
      viewerVisible: Boolean(viewer) && getComputedStyle(viewer).display !== 'none',
      pdfNavigationVisible: Boolean(navigation) && getComputedStyle(navigation).display !== 'none',
      exitName: toolbar?.querySelector('[data-action="exit-presentation"]')?.getAttribute('aria-label'),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1
    };
  })()`);
}

function assertPdfPresentation(state, label) {
  assert.equal(state.active, true, `${label} enters presentation mode`);
  assert.equal(state.toolbarVisible, true, `${label} shows presentation chrome`);
  assert.equal(state.siteHeaderHidden, true, `${label} hides global navigation`);
  assert.equal(state.sidebarHidden, true, `${label} hides the lesson sidebar`);
  assert.equal(state.viewerVisible, true, `${label} keeps PDF.js visible`);
  assert.equal(state.pdfNavigationVisible, true, `${label} keeps PDF page navigation visible`);
  assert.equal(state.exitName, "Thoát trình chiếu", `${label} exposes an accessible exit action`);
  assert.equal(state.horizontalOverflow, false, `${label} has no horizontal overflow`);
}

await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await Browser.launch();

try {
  const page = await browser.newPage(viewports[0]);

  for (const viewport of viewports) {
    await page.setViewport(viewport);
    await page.goto(lessonUrl(origin, "CD20", "20.1"), { timeoutMs: 30000, settleMs: 260 });
    assert.equal(await page.eval("Boolean(document.querySelector('[data-action=\"enter-presentation\"]'))"), true);
    await page.eval("document.querySelector('[data-action=\"enter-presentation\"]').click()");
    await sleep(220);
    assertPdfPresentation(await inspect(page), `20.1 at ${viewport.width}x${viewport.height}`);
    await page.eval("document.querySelector('[data-action=\"exit-presentation\"]').click()");
    await sleep(180);
    assert.equal(await page.eval("document.body.classList.contains('presentation-mode')"), false);
  }

  await page.setViewport(viewports[5]);
  for (const [topic, code] of representativePdfLessons) {
    await page.goto(lessonUrl(origin, topic, code), { timeoutMs: 30000, settleMs: 240 });
    await page.eval("document.querySelector('[data-action=\"enter-presentation\"]').click()");
    await sleep(180);
    assertPdfPresentation(await inspect(page), code);
    await page.eval("document.querySelector('[data-action=\"exit-presentation\"]').click()");
    await sleep(140);
  }

  await page.goto(lessonUrl(origin, "CD20", "20.2"), { timeoutMs: 30000, settleMs: 260 });
  const markdown = await page.eval(`(() => ({
    approved: Boolean(document.querySelector('[data-approved-math-content]')),
    sourceFallback: Boolean(document.querySelector('[data-action="show-source-pdf"]')),
    presentationTrigger: Boolean(document.querySelector('[data-action="enter-presentation"]')),
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1
  }))()`);
  assert.deepEqual(markdown, { approved: true, sourceFallback: true, presentationTrigger: false, horizontalOverflow: false });
  assert.deepEqual(page.consoleErrors, [], "knowledge modes have no runtime exceptions");

  console.log(`Knowledge presentation passed: ${viewports.length} PDF viewports, ${representativePdfLessons.length} representative PDF lessons and the approved Markdown pilot.`);
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
