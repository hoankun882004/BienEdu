import assert from "node:assert/strict";
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { Browser, sleep } from "../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs";

const root = resolve(".");
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".webp": "image/webp", ".pdf": "application/pdf" };
const server = createServer((request, response) => {
  try {
    let file = resolve(join(root, decodeURIComponent(new URL(request.url, "http://local").pathname)));
    if (file !== root && !file.startsWith(root + sep)) throw new Error("Forbidden");
    if (statSync(file).isDirectory()) file = join(file, "index.html");
    response.writeHead(200, { "content-type": mime[extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404);
    response.end("not found");
  }
});

await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await Browser.launch();

const sizes = [
  { width: 375, height: 812, mobile: true },
  { width: 390, height: 844, mobile: true },
  { width: 768, height: 1024, mobile: false },
  { width: 1024, height: 768, mobile: false },
  { width: 1280, height: 720, mobile: false },
  { width: 1440, height: 900, mobile: false },
  { width: 1920, height: 1080, mobile: false }
];

try {
  const page = await browser.newPage({ width: 1440, height: 900, mobile: false });

  for (const size of sizes) {
    await page.setViewport(size);
    await page.goto(`${origin}/`, { timeoutMs: 30000, settleMs: 220 });
    const state = await page.eval(`(() => {
      const main = document.querySelector('main');
      const nestedScrollers = [...main.querySelectorAll('*')].filter((element) => {
        const style = getComputedStyle(element);
        return /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1;
      });
      return {
        snapType: getComputedStyle(document.documentElement).scrollSnapType,
        snapSections: document.querySelectorAll('[data-scroll-section]').length,
        snapAlignments: [...document.querySelectorAll('[data-scroll-section]')].map((element) => getComputedStyle(element).scrollSnapAlign),
        revealGroups: document.querySelectorAll('[data-home-reveal]').length,
        motionEnabled: document.documentElement.classList.contains('home-motion-enabled'),
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        nestedScrollers: nestedScrollers.length,
        headerPosition: getComputedStyle(document.querySelector('.site-header')).position
      };
    })()`);

    assert.equal(state.snapSections, 3, `homepage snap section count at ${size.width}px`);
    assert.equal(state.revealGroups, 6, `homepage reveal group count at ${size.width}px`);
    assert.equal(state.motionEnabled, true, `homepage motion enhancement at ${size.width}px`);
    assert.equal(state.horizontalOverflow, false, `homepage horizontal overflow at ${size.width}px`);
    assert.equal(state.nestedScrollers, 0, `homepage nested scrollbar at ${size.width}px`);
    assert.equal(state.headerPosition, "sticky", `homepage sticky header at ${size.width}px`);
    if (size.width >= 1024) {
      assert.ok(["y", "y proximity"].includes(state.snapType), `desktop soft scroll snap at ${size.width}px: ${state.snapType}`);
      assert.deepEqual(state.snapAlignments, ["start", "start", "start"], `desktop snap alignment at ${size.width}px`);
    } else {
      assert.equal(state.snapType, "none", `mobile/tablet snap disabled at ${size.width}px`);
    }

    await page.eval("document.querySelector('#study-rhythm').scrollIntoView({ behavior: 'instant', block: 'start' })");
    await sleep(180);
    assert.equal(await page.eval("[...document.querySelectorAll('#study-rhythm [data-home-reveal]')].filter((element) => getComputedStyle(element).display !== 'none').every((element) => element.classList.contains('is-visible'))"), true, `study rhythm reveal at ${size.width}px`);
    await page.eval("window.scrollTo({ top: 0, behavior: 'instant' })");
    assert.equal(await page.eval("[...document.querySelectorAll('#study-rhythm [data-home-reveal]')].filter((element) => getComputedStyle(element).display !== 'none').every((element) => element.classList.contains('is-visible'))"), true, `one-time reveal persists at ${size.width}px`);

    if ([390, 768, 1440].includes(size.width)) {
      await page.screenshot({ path: `.audit/home-scroll-${size.width}.jpg`, quality: 86, fullPage: true });
    }
  }

  await page.setViewport({ width: 1440, height: 900, mobile: false });
  await page.goto(`${origin}/#study-rhythm`, { timeoutMs: 30000, settleMs: 350 });
  const anchored = await page.eval(`(() => {
    const header = document.querySelector('.site-header').getBoundingClientRect();
    const section = document.querySelector('#study-rhythm').getBoundingClientRect();
    return { visibleBelowHeader: section.top >= header.bottom - 2, revealed: [...document.querySelectorAll('#study-rhythm [data-home-reveal]')].filter((element) => getComputedStyle(element).display !== 'none').every((element) => element.classList.contains('is-visible')) };
  })()`);
  assert.equal(anchored.visibleBelowHeader, true, "anchor target must remain below the sticky header");
  assert.equal(anchored.revealed, true, "anchor-loaded section must be visible");

  await page.goto(`${origin}/`, { timeoutMs: 30000, settleMs: 220 });
  const initialScroll = await page.eval("window.scrollY");
  await page.wheel(460, { step: 34, pauseMs: 18 });
  await sleep(280);
  const slowScroll = await page.eval("window.scrollY");
  assert.ok(slowScroll > initialScroll, "small wheel deltas must scroll normally");
  await page.wheel(900, { step: 450, pauseMs: 20 });
  await sleep(220);
  const fastScroll = await page.eval("window.scrollY");
  assert.ok(fastScroll >= slowScroll, "fast wheel input must not be trapped");
  await page.wheel(-420, { step: 42, pauseMs: 18 });
  await sleep(220);
  assert.ok(await page.eval("window.scrollY") < fastScroll, "upward wheel input must work normally");

  for (const route of ["/course.html", "/documents.html", "/quiz.html", "/contact.html"]) {
    await page.goto(`${origin}${route}`, { timeoutMs: 30000, settleMs: 180 });
    const internal = await page.eval(`({
      snapType: getComputedStyle(document.documentElement).scrollSnapType,
      homeClass: document.documentElement.classList.contains('home-page'),
      snapSections: document.querySelectorAll('[data-scroll-section]').length
    })`);
    assert.deepEqual(internal, { snapType: "none", homeClass: false, snapSections: 0 }, `${route} must retain normal scrolling`);
  }

  const reducedPage = await browser.newPage({ width: 1440, height: 900, mobile: false, reducedMotion: true });
  await reducedPage.goto(`${origin}/`, { timeoutMs: 30000, settleMs: 180 });
  const reduced = await reducedPage.eval(`(() => ({
    snapType: getComputedStyle(document.documentElement).scrollSnapType,
    scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    motionEnabled: document.documentElement.classList.contains('home-motion-enabled'),
    revealStates: [...document.querySelectorAll('[data-home-reveal]')].map((element) => ({ opacity: getComputedStyle(element).opacity, transform: getComputedStyle(element).transform }))
  }))()`);
  assert.equal(reduced.snapType, "none", "reduced motion must disable snap");
  assert.equal(reduced.scrollBehavior, "auto", "reduced motion must disable smooth scrolling");
  assert.equal(reduced.motionEnabled, false, "reduced motion must not enable reveal transitions");
  assert.equal(reduced.revealStates.length, 6);
  assert.equal(reduced.revealStates.every((state) => state.opacity === "1" && state.transform === "none"), true);
  await reducedPage.close();

  const noJsPage = await browser.newPage({ width: 1440, height: 900, mobile: false });
  await noJsPage.send("Emulation.setScriptExecutionDisabled", { value: true });
  await noJsPage.goto(`${origin}/`, { timeoutMs: 30000, settleMs: 180 });
  const noJs = await noJsPage.eval(`(() => ({
    motionEnabled: document.documentElement.classList.contains('home-motion-enabled'),
    mainTextVisible: document.querySelector('main').innerText.includes('Học Toán 12'),
    revealStates: [...document.querySelectorAll('[data-home-reveal]')].map((element) => ({ opacity: getComputedStyle(element).opacity, transform: getComputedStyle(element).transform }))
  }))()`);
  assert.equal(noJs.motionEnabled, false, "no-JS page must not enable reveal states");
  assert.equal(noJs.mainTextVisible, true, "no-JS homepage content must remain readable");
  assert.equal(noJs.revealStates.length, 6);
  assert.equal(noJs.revealStates.every((state) => state.opacity === "1" && state.transform === "none"), true);
  await noJsPage.close();

  console.log("Homepage scroll experience passed: 3 soft desktop snap points, 6 grouped one-time reveals, natural mobile/internal scrolling, sticky-header anchors, wheel input, reduced motion, no-JS fallback, and 7 responsive viewports.");
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
