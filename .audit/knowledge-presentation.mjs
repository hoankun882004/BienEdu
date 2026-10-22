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
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf"
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
const representativeLessons = [
  ["CD12", "12.1"],
  ["CD13", "13.1"],
  ["CD14", "14.1"],
  ["CD20", "20.1"],
  ["CD20", "20.2"],
  ["CD20", "20.17"],
  ["CD21", "21.1"],
  ["CD21", "21.8"]
];

function lessonUrl(origin, topic, code, item = 1) {
  return `${origin}/documents.html?grade=12&topic=${topic}&type=${code}&section=knowledge&item=${item}`;
}

async function realClick(page, selector) {
  const point = await page.eval(`(() => {
    const rect = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y });
  await page.send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 });
  await page.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 });
}

async function enterPresentation(page, trusted = false) {
  if (trusted) await realClick(page, '[data-action="enter-presentation"]');
  else await page.eval("document.querySelector('[data-action=\"enter-presentation\"]').click()");
  await sleep(180);
}

async function exitPresentation(page) {
  await page.eval("document.querySelector('[data-action=\"exit-presentation\"]').click()");
  await sleep(180);
}

async function inspectPresentation(page) {
  return page.eval(`(() => {
    const workspace = document.querySelector('.learning-workspace');
    const toolbar = document.querySelector('.knowledge-presentation-toolbar');
    const reader = document.querySelector('.knowledge-reader');
    const content = document.querySelector('.knowledge-reader__content');
    const formula = document.querySelector('.knowledge-reader__formulae');
    const navigation = document.querySelector('.lesson-navigation');
    const rect = (element) => {
      const box = element.getBoundingClientRect();
      return { top: box.top, right: box.right, bottom: box.bottom, left: box.left, width: box.width, height: box.height };
    };
    return {
      active: document.body.classList.contains('presentation-mode') && workspace.classList.contains('is-presenting'),
      toolbarVisible: getComputedStyle(toolbar).display !== 'none',
      toolbar: rect(toolbar),
      toolbarBrand: rect(toolbar.querySelector('.knowledge-presentation-toolbar__brand')),
      toolbarExit: rect(toolbar.querySelector('[data-action="exit-presentation"]')),
      siteHeaderHidden: getComputedStyle(document.querySelector('.site-header')).display === 'none',
      sidebarHidden: getComputedStyle(document.querySelector('.lesson-sidebar')).display === 'none',
      reader: rect(reader),
      content: rect(content),
      formula: rect(formula),
      navigation: rect(navigation),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      contentReachable: content.getBoundingClientRect().bottom - reader.getBoundingClientRect().top + reader.scrollTop <= reader.scrollHeight + 2,
      formulaTextVisible: formula.textContent.trim().length > 0,
      exitName: document.querySelector('[data-action="exit-presentation"]').getAttribute('aria-label'),
      nextDisabled: document.querySelector('.lesson-navigation > :last-child').disabled,
      slideType: reader.dataset.slideType
    };
  })()`);
}

function assertPresentation(layout, viewport, label) {
  assert.equal(layout.active, true, `${label} enters presentation mode at ${viewport.width}x${viewport.height}`);
  assert.equal(layout.toolbarVisible, true, `${label} shows presentation chrome`);
  assert.equal(layout.siteHeaderHidden, true, `${label} hides global navigation`);
  assert.equal(layout.sidebarHidden, true, `${label} hides the lesson sidebar`);
  assert.equal(layout.horizontalOverflow, false, `${label} has no horizontal overflow`);
  assert.equal(layout.contentReachable, true, `${label} keeps the full slide reachable`);
  assert.equal(layout.formulaTextVisible, true, `${label} keeps mathematics visible`);
  assert.equal(layout.exitName, "Thoát trình chiếu", `${label} exposes an accessible exit action`);
  assert.ok(layout.toolbarBrand.left >= -1 && layout.toolbarBrand.right <= viewport.width + 1, `${label} keeps the brand inside presentation chrome`);
  assert.ok(layout.toolbarExit.left >= -1 && layout.toolbarExit.right <= viewport.width + 1, `${label} keeps Exit inside presentation chrome`);
  assert.ok(layout.toolbarBrand.width >= Math.min(150, viewport.width * .45), `${label} gives the presentation title usable width (${layout.toolbarBrand.width}px)`);
  assert.ok(layout.toolbarExit.width >= 44, `${label} keeps the Exit target touch accessible`);
  assert.ok(layout.reader.width >= viewport.width - 2, `${label} uses the presentation width`);
  assert.ok(layout.navigation.bottom <= viewport.height + 1, `${label} keeps navigation inside the viewport`);
  assert.ok(layout.formula.width > 0 && layout.formula.height > 0, `${label} does not clip the formula panel`);
  assert.ok(layout.slideType, `${label} exposes a generic slide type`);
}

await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await Browser.launch();

try {
  const page = await browser.newPage(viewports[5]);
  await page.goto(lessonUrl(origin, "CD12", "12.1"), { timeoutMs: 30000, settleMs: 300 });
  await page.eval("localStorage.removeItem('bienedu:progress:v2:grade12')");
  await page.goto(lessonUrl(origin, "CD12", "12.1"), { timeoutMs: 30000, settleMs: 260 });
  assert.deepEqual(await page.eval("JSON.parse(localStorage.getItem('bienedu:progress:v2:grade12')).lessons['12.1'].viewedKnowledge"), ["12.1-knowledge-1"]);

  await enterPresentation(page, true);
  assertPresentation(await inspectPresentation(page), viewports[5], "12.1");
  await page.eval("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))");
  await sleep(380);
  assert.equal(await page.eval("new URLSearchParams(location.search).get('item')"), "2", "Right Arrow advances the shared current slide");
  assert.equal(await page.eval("document.querySelector('.knowledge-presentation-toolbar > p strong').textContent.trim()"), "02 / 02");
  assert.deepEqual(await page.eval("JSON.parse(localStorage.getItem('bienedu:progress:v2:grade12')).lessons['12.1'].viewedKnowledge.sort()"), ["12.1-knowledge-1", "12.1-knowledge-2"]);
  await page.eval("document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))");
  await sleep(180);
  assert.equal(await page.eval("new URLSearchParams(location.search).get('item')"), "2", "Space does not leave the Knowledge deck at its end");
  await page.eval("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))");
  await sleep(380);
  assert.equal(await page.eval("new URLSearchParams(location.search).get('item')"), "1", "Left Arrow returns to the previous Knowledge slide");
  await page.eval("document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))");
  await sleep(380);
  assert.equal(await page.eval("new URLSearchParams(location.search).get('item')"), "2", "Space advances when focus is not on a control");
  await exitPresentation(page);
  assert.equal(await page.eval("document.body.classList.contains('presentation-mode')"), false);
  assert.equal(await page.eval("new URLSearchParams(location.search).get('item')"), "2", "exit preserves the current slide");
  assert.equal(await page.eval("document.activeElement.matches('[data-action=\"enter-presentation\"]')"), true, "exit restores focus to the presentation trigger");
  await page.eval("history.back()");
  await sleep(420);
  assert.equal(await page.eval("new URLSearchParams(location.search).get('item')"), "1", "browser Back restores the previous slide");
  const deepLink = await page.eval("location.href");
  await page.goto(deepLink, { timeoutMs: 30000, settleMs: 260 });
  assert.equal(await page.eval("new URLSearchParams(location.search).get('item')"), "1", "a refreshed deep link restores the current slide");
  await enterPresentation(page);
  await page.eval("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))");
  await sleep(220);
  assert.equal(await page.eval("document.body.classList.contains('presentation-mode')"), false, "Escape exits presentation mode");

  for (const viewport of viewports) {
    await page.setViewport(viewport);
    await page.goto(lessonUrl(origin, "CD20", "20.2"), { timeoutMs: 30000, settleMs: 220 });
    await enterPresentation(page);
    assertPresentation(await inspectPresentation(page), viewport, "20.2");
    if ([390, 1440].includes(viewport.width)) {
      await page.screenshot({ path: `.audit/knowledge-presentation-20-2-${viewport.width}x${viewport.height}.jpg`, quality: 90 });
    }
    await exitPresentation(page);
  }

  await page.setViewport(viewports[5]);
  for (const [topic, code] of representativeLessons) {
    await page.goto(lessonUrl(origin, topic, code), { timeoutMs: 30000, settleMs: 220 });
    await enterPresentation(page);
    assertPresentation(await inspectPresentation(page), viewports[5], code);
    await exitPresentation(page);
  }
  assert.deepEqual(page.consoleErrors, [], "presentation flow has no runtime exceptions");

  const reducedMotionPage = await browser.newPage({ ...viewports[0], reducedMotion: true });
  await reducedMotionPage.goto(lessonUrl(origin, "CD20", "20.2"), { timeoutMs: 30000, settleMs: 220 });
  assert.ok(await reducedMotionPage.eval("parseFloat(getComputedStyle(document.querySelector('.lesson-stage')).transitionDuration) <= 0.001"), "reduced motion disables perceptible slide transitions");
  await reducedMotionPage.close();

  console.log(`Knowledge presentation passed: ${viewports.length} viewports, ${representativeLessons.length} representative lessons, shared state, history, progress and reduced motion.`);
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
