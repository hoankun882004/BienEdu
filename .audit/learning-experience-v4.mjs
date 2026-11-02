import assert from "node:assert/strict";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { chromium } from "playwright-core";

import { getExampleContent } from "../assets/js/data/example-content.js";

const root = resolve(".");
const executablePath = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
].find(existsSync);
assert.ok(executablePath, "Chrome or Edge is required");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf"
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

function lessonUrl(origin, query) {
  return `${origin}/documents.html?grade=12&${query}`;
}

async function waitForLesson(page) {
  await page.locator(".problem-type-reader, .example-reader, .practice-stage").first().waitFor();
}

async function assertHealthy(page, label) {
  const result = await page.evaluate(() => ({
    katexErrors: document.querySelectorAll(".katex-error, .math-render-error").length,
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
    duplicatePrompts: document.querySelectorAll(".example-reader__question").length,
    duplicateSolutions: document.querySelectorAll(".example-reader__solution").length
  }));
  assert.equal(result.katexErrors, 0, `${label}: no math rendering errors`);
  assert.equal(result.overflow, false, `${label}: no page-level horizontal overflow`);
  if (await page.locator(".example-reader").count()) {
    assert.equal(result.duplicatePrompts, 1, `${label}: one prompt`);
    assert.equal(result.duplicateSolutions, 1, `${label}: one collapsed solution`);
    assert.equal(await page.locator(".example-reader__source").count(), 1, `${label}: one source footer`);
  }
}

await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath, headless: true });

try {
  const context = await browser.newContext({ locale: "vi-VN", reducedMotion: "reduce" });
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });

  await page.goto(`${origin}/documents.html?grade=12`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());

  const viewports = [
    { name: "1920x1080", width: 1920, height: 1080 },
    { name: "1366x768", width: 1366, height: 768 },
    { name: "768x1024", width: 768, height: 1024 },
    { name: "390x844", width: 390, height: 844 }
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(lessonUrl(origin, "topic=CD08&type=8.1&section=types&item=1"), { waitUntil: "domcontentloaded" });
    await page.locator(".problem-type-reader").waitFor();
    assert.equal(await page.locator(".workspace-top [data-history-back]").count(), 0, `${viewport.name}: redundant header Back is removed`);
    assert.equal(await page.locator(".lesson-navigation [data-history-back]").count(), 1, `${viewport.name}: bottom Back is the single contextual Back control`);
    assert.equal(await page.locator(".lesson-navigation [data-history-back]").isEnabled(), true, `${viewport.name}: bottom Back has a safe fallback`);
    assert.match(await page.locator(".lesson-navigation [data-history-back]").innerText(), /Trước/u);
    assert.equal(await page.locator(".problem-type-reader__examples").count(), 0, `${viewport.name}: old box index removed`);
    assert.equal(await page.locator(".example-index a").count(), 10, `${viewport.name}: complete lightweight index`);
    await assertHealthy(page, `method index ${viewport.name}`);

    await page.locator('.example-index a[href$="item=1"]').click();
    await page.waitForURL(/section=example&item=1/u);
    await page.locator(".example-card").waitFor();
    assert.equal(await page.locator(".workspace-top [data-history-back]").count(), 0);
    assert.equal(await page.locator(".lesson-navigation [data-history-back]").count(), 1);
    assert.equal(await page.locator(".example-index a.is-current").count(), 1);
    assert.match(await page.locator(".example-index a.is-current").getAttribute("aria-label"), /đang xem/u);
    assert.equal(await page.locator(".example-reader__solution").getAttribute("open"), null);
    assert.match(await page.locator('[data-phase-navigation] button[data-section="example"] small').innerText(), /^0\/10/u, `${viewport.name}: opening is not completion`);

    assert.equal(await page.locator('.example-context details[data-context-panel="method"]').count(), 1);
    assert.equal(await page.locator('.example-context details[data-context-panel="note"]').count(), 1);
    const noteDetails = page.locator('.example-context details[data-context-panel="note"]');
    if (await noteDetails.getAttribute("open") === null) await noteDetails.locator("summary").click();
    const noteText = await noteDetails.innerText();
    assert.match(noteText, /Không biến/u);
    assert.equal(await page.locator('.example-context details[data-context-panel="note"] .katex').count(), 2, `${viewport.name}: exponent warning keeps both source expressions`);
    assert.doesNotMatch(noteText, /aα|aβ|aα⁺β/u);
    await assertHealthy(page, `verified example ${viewport.name}`);
  }

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(lessonUrl(origin, "topic=CD08&type=8.1&section=example&item=1"), { waitUntil: "domcontentloaded" });
  await waitForLesson(page);
  const methodPanel = page.locator('.example-context details[data-context-panel="method"]');
  const notePanel = page.locator('.example-context details[data-context-panel="note"]');
  if (await methodPanel.getAttribute("open") === null) await methodPanel.locator("summary").click();
  if (await notePanel.getAttribute("open") === null) await notePanel.locator("summary").click();
  await page.locator('.example-index a[href*="item=2"]').click();
  await page.waitForURL(/item=2/u);
  assert.equal(await page.locator('.example-context details[data-context-panel="method"]').getAttribute("open"), "");
  assert.equal(await page.locator('.example-context details[data-context-panel="note"]').getAttribute("open"), "");
  await page.locator('.example-index a[href*="item=5"]').click();
  await page.waitForURL(/item=5/u);
  assert.equal(await page.locator(".example-index a.is-viewed").count(), 2, "examples 1 and 2 remain viewed while 5 is current");
  assert.equal(await page.locator(".example-index a.is-current").innerText().then((text) => text.trim().startsWith("5")), true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForLesson(page);
  assert.equal(await page.locator(".example-index a.is-viewed").count(), 2, "opened IDs persist after reload");
  assert.match(await page.locator(".example-index header p").innerText(), /3\/10/u);

  await page.locator(".example-reader__solution > summary").click();
  assert.match(await page.locator('[data-phase-navigation] button[data-section="example"] small').innerText(), /^1\/10/u, "solution reveal completes exactly one example");
  await page.locator(".example-reader__solution > summary").click();
  assert.match(await page.locator('[data-phase-navigation] button[data-section="example"] small').innerText(), /^1\/10/u, "closing does not double count");

  await page.goto(lessonUrl(origin, "topic=CD08&type=8.2&section=example&item=1"), { waitUntil: "domcontentloaded" });
  await waitForLesson(page);
  assert.equal(await page.locator('.example-context details[data-context-panel="note"]').count(), 0, "unverified note is not promoted to learner guidance");
  assert.equal(await page.locator('.example-context details[data-context-panel="method"]').getAttribute("open"), null, "context state does not leak between types");

  const navigationPage = await context.newPage();
  await navigationPage.setViewportSize({ width: 1366, height: 768 });

  // Topic → type overview → non-adjacent example: contextual Back returns to the actual overview.
  await navigationPage.goto(lessonUrl(origin, "topic=CD01"), { waitUntil: "domcontentloaded" });
  await navigationPage.locator('a[href*="type=1.1"]').first().click();
  await navigationPage.locator(".problem-type-reader").waitFor();
  await navigationPage.locator('.example-index a[href*="item=4"]').click();
  await navigationPage.waitForURL(/section=example&item=4/u);
  await navigationPage.locator(".lesson-navigation [data-history-back]").click();
  await navigationPage.locator(".problem-type-reader").waitFor();
  assert.match(navigationPage.url(), /topic=CD01&type=1.1/u, "Back preserves topic and type identity");
  await navigationPage.locator(".lesson-navigation [data-history-back]").click();
  await navigationPage.waitForURL(/topic=CD01(?!.*type=)/u);
  assert.equal(await navigationPage.locator(".topic-detail").count(), 1, "type overview Back returns to its topic context");

  // Non-sequential 2 → 7: Back must return to 2 rather than decrementing to 6.
  await navigationPage.goto(lessonUrl(origin, "topic=CD08&type=8.1&section=example&item=2"), { waitUntil: "domcontentloaded" });
  await waitForLesson(navigationPage);
  const repeatedHistoryLength = await navigationPage.evaluate(() => history.length);
  await navigationPage.locator(".example-index a.is-current").click();
  assert.equal(await navigationPage.evaluate(() => history.length), repeatedHistoryLength, "reopening the current example does not add duplicate history");
  await navigationPage.locator('.example-index a[href*="item=7"]').click();
  await navigationPage.waitForURL(/item=7/u);
  const completionBeforeBack = await navigationPage.locator('[data-phase-navigation] button[data-section="example"] small').innerText();
  await navigationPage.locator(".lesson-navigation [data-history-back]").click();
  await navigationPage.waitForURL(/item=2/u);
  assert.match(await navigationPage.locator(".example-reader__intro h2").innerText(), /2/u);
  assert.match(await navigationPage.locator('.example-index a[href*="item=7"]').getAttribute("class"), /is-viewed/u, "viewed state survives contextual Back");
  assert.equal(await navigationPage.locator('[data-phase-navigation] button[data-section="example"] small').innerText(), completionBeforeBack, "Back does not change completion");

  // Sequential 4 → 5: contextual Back and browser Forward remain synchronized.
  await navigationPage.goto(lessonUrl(origin, "topic=CD08&type=8.1&section=example&item=4"), { waitUntil: "domcontentloaded" });
  await waitForLesson(navigationPage);
  await navigationPage.locator('.example-index a[href*="item=5"]').click();
  await navigationPage.waitForURL(/item=5/u);
  assert.match(await navigationPage.locator(".lesson-navigation .nav-button--primary").innerText(), /Ví dụ tiếp theo/u);
  await navigationPage.locator(".lesson-navigation [data-history-back]").click();
  await navigationPage.waitForURL(/item=4/u);
  assert.match(await navigationPage.locator(".example-reader__intro h2").innerText(), /4/u);
  await navigationPage.goForward();
  await navigationPage.waitForURL(/item=5/u);
  assert.match(await navigationPage.locator(".example-reader__intro h2").innerText(), /5/u);

  // A reload keeps the structured history entry and its real predecessor.
  await navigationPage.goto(lessonUrl(origin, "topic=CD08&type=8.1&section=example&item=2"), { waitUntil: "domcontentloaded" });
  await waitForLesson(navigationPage);
  await navigationPage.locator('.example-index a[href*="item=7"]').click();
  await navigationPage.waitForURL(/item=7/u);
  await navigationPage.reload({ waitUntil: "domcontentloaded" });
  await waitForLesson(navigationPage);
  await navigationPage.locator(".lesson-navigation [data-history-back]").click();
  await navigationPage.waitForURL(/item=2/u);
  await navigationPage.close();

  // Direct example links fall back to the problem-type overview, then to the correct topic.
  const directPage = await context.newPage();
  await directPage.setViewportSize({ width: 1366, height: 768 });
  await directPage.goto(lessonUrl(origin, "topic=CD08&type=8.1&section=example&item=4"), { waitUntil: "domcontentloaded" });
  await directPage.locator(".lesson-navigation [data-history-back]").click();
  await directPage.waitForURL(/topic=CD08&type=8.1&section=types&item=1/u);
  assert.equal(await directPage.locator(".problem-type-reader").count(), 1, "direct example deep link uses the type overview fallback");
  await directPage.locator(".lesson-navigation [data-history-back]").click();
  await directPage.waitForURL(/topic=CD08(?!.*type=)/u);
  assert.equal(await directPage.locator(".topic-detail").count(), 1, "type overview fallback returns to the correct topic");
  await directPage.close();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(lessonUrl(origin, "topic=CD08&type=8.1&section=example&item=4"), { waitUntil: "domcontentloaded" });
  await waitForLesson(page);
  await page.locator('.example-context details[data-context-panel="method"] summary').click();
  await page.evaluate(() => window.scrollTo(0, Math.min(420, document.documentElement.scrollHeight - innerHeight)));
  await page.waitForTimeout(100);
  const savedScroll = await page.evaluate(() => scrollY);
  await page.locator('.example-index a[href*="item=5"]').click();
  await page.waitForURL(/item=5/u);
  await page.goBack();
  await page.waitForURL(/item=4/u);
  await page.waitForTimeout(100);
  const restoredScroll = await page.evaluate(() => scrollY);
  assert.ok(Math.abs(restoredScroll - savedScroll) <= 12, `mobile scroll restored (${savedScroll} -> ${restoredScroll})`);

  // Arrow keys remain sequential and intentionally distinct from contextual history Back.
  await page.keyboard.press("ArrowRight");
  await page.waitForURL(/item=5/u);
  await page.keyboard.press("ArrowLeft");
  await page.waitForURL(/item=4/u);

  await page.goto(lessonUrl(origin, "topic=CD20&type=20.1&section=practice&item=1"), { waitUntil: "domcontentloaded" });
  await page.locator(".practice-card").waitFor();
  assert.ok(await page.locator(".practice-options button, .practice-reveal").count() > 0, "practice controls remain available");
  assert.equal(await page.locator(".workspace-top [data-history-back]").count(), 0, "practice uses the same simplified lesson header");
  assert.equal(await page.locator(".lesson-navigation [data-history-back]").count(), 1, "practice keeps contextual bottom Back");
  await assertHealthy(page, "practice regression");

  const graphExample = Object.entries(Object.fromEntries(
    ["2.1", "2.2", "2.3", "3.1", "3.2", "3.3"].map((code) => [code, getExampleContent(code) ?? []])
  )).flatMap(([code, examples]) => examples.map((example, index) => ({ code, example, index })))
    .find(({ example }) => example.assetReferences?.length);
  assert.ok(graphExample, "a graph source example exists");
  const graphTopic = `CD${graphExample.code.split(".")[0].padStart(2, "0")}`;
  await page.goto(lessonUrl(origin, `topic=${graphTopic}&type=${graphExample.code}&section=example&item=${graphExample.index + 1}`), { waitUntil: "domcontentloaded" });
  await page.locator(".example-reader__figures img").first().waitFor();
  assert.equal(await page.locator(".example-reader__figures img").first().evaluate((image) => image.complete && image.naturalWidth > 0), true);

  for (const shot of [
    { name: "learning-v4-1-type-1366x768.png", width: 1366, height: 768, query: "topic=CD08&type=8.1&section=types&item=1", open: false },
    { name: "learning-v4-1-example-1366x768.png", width: 1366, height: 768, query: "topic=CD08&type=8.1&section=example&item=3", open: true },
    { name: "learning-v4-1-tablet-768x1024.png", width: 768, height: 1024, query: "topic=CD08&type=8.1&section=example&item=5", open: false },
    { name: "learning-v4-1-mobile-390x844.png", width: 390, height: 844, query: "topic=CD08&type=8.1&section=example&item=1", open: true }
  ]) {
    await page.setViewportSize({ width: shot.width, height: shot.height });
    await page.goto(lessonUrl(origin, shot.query), { waitUntil: "domcontentloaded" });
    await waitForLesson(page);
    if (shot.open) {
      const note = page.locator('.example-context details[data-context-panel="note"]');
      if (await note.getAttribute("open") === null) await note.locator("summary").click();
    }
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      const lessonContent = document.querySelector("[data-lesson-content]");
      if (lessonContent) lessonContent.scrollTop = 0;
    });
    await page.screenshot({ path: `.audit/${shot.name}`, fullPage: false });
  }

  assert.deepEqual(runtimeErrors, [], `runtime errors: ${runtimeErrors.join(" | ")}`);
  console.log("Learning Experience V4.1 navigation QA passed across 1920, 1366, 768 and 390 px viewports.");
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
