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
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": mime[extname(file)] ?? "application/octet-stream"
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404);
    response.end("not found");
  }
});

function lessonUrl(origin, query) {
  return `${origin}/documents.html?grade=12&${query}`;
}

async function assertHealthyLayout(page, label) {
  const state = await page.evaluate(() => ({
    katexErrors: document.querySelectorAll(".katex-error, .math-render-error").length,
    pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    emptyControls: [...document.querySelectorAll("button, a")].filter((element) => (
      element.getClientRects().length
      && !element.textContent.trim()
      && !element.getAttribute("aria-label")
      && !element.querySelector('img[alt]:not([alt=""])')
    )).map((element) => element.outerHTML.slice(0, 240))
  }));
  assert.equal(state.katexErrors, 0, `${label}: no KaTeX errors`);
  assert.equal(state.pageOverflow, false, `${label}: no page-level horizontal overflow`);
  assert.deepEqual(state.emptyControls, [], `${label}: interactive controls have accessible names (${state.emptyControls.join(" | ")})`);
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

  const viewports = [
    { name: "1920x1080", width: 1920, height: 1080 },
    { name: "1366x768", width: 1366, height: 768 },
    { name: "768x1024", width: 768, height: 1024 },
    { name: "390x844", width: 390, height: 844 }
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);

    await page.goto(lessonUrl(origin, "topic=CD01&type=1.1&section=types&item=1"), { waitUntil: "domcontentloaded" });
    await page.locator(".problem-type-reader").waitFor();
    assert.equal(await page.locator(".problem-type-reader__method").count(), 1);
    assert.equal(await page.locator(".problem-type-reader__note").count(), 0);
    assert.equal(await page.locator(".example-index a").count(), 10);
    assert.doesNotMatch(await page.locator(".problem-type-reader > header").innerText(), /lời giải/iu);
    const methodHeight = await page.locator(".problem-type-reader__method").evaluate((element) => element.getBoundingClientRect().height);
    assert.ok(methodHeight < 180, `${viewport.name}: one-line method remains compact (${methodHeight}px)`);
    await assertHealthyLayout(page, `CD01 method ${viewport.name}`);

    if (viewport.name === "1366x768") {
      await page.keyboard.press("ArrowRight");
      await page.waitForURL(/section=example&item=1/u);
      assert.equal(await page.locator(".example-card").count(), 1, "ArrowRight opens the first example");
      await page.keyboard.press("ArrowLeft");
      await page.waitForURL(/section=types&item=1/u);
    }

    await page.goto(lessonUrl(origin, "topic=CD01&type=1.1&section=example&item=1"), { waitUntil: "domcontentloaded" });
    await page.locator(".example-card").waitFor();
    assert.equal(await page.locator(".example-reader__question").count(), 1);
    assert.equal(await page.locator(".example-reader__result").count(), 0);
    assert.equal(await page.locator(".example-reader__solution").getAttribute("open"), null);
    assert.equal(await page.locator(".example-reader__solution-body").isVisible(), false);
    assert.match(await page.locator(".example-reader__solution > summary").innerText(), /Hiện lời giải/u);
    assert.equal(await page.locator(".example-reader__source").count(), 1);
    assert.match(await page.locator(".example-reader__source").innerText(), /Nguồn: Trang 4.*Lời giải: Trang 66.*Đã đối chiếu PDF/su);
    await assertHealthyLayout(page, `CD01 example collapsed ${viewport.name}`);

    const summary = page.locator(".example-reader__solution > summary");
    await summary.click();
    assert.equal(await page.locator(".example-reader__solution").getAttribute("open"), "");
    assert.equal(await page.locator(".example-reader__solution-body").isVisible(), true);
    assert.match(await summary.innerText(), /Ẩn lời giải/u);
    assert.equal(await page.locator(".example-reader__conclusion").count(), 0, `${viewport.name}: duplicate final answer is omitted`);
    assert.equal(await page.locator(".example-reader__review-status").count(), 0, `${viewport.name}: verified example has no review warning`);
    assert.equal(await summary.evaluate((element) => document.activeElement === element), true, `${viewport.name}: solution toggle retains focus`);
    await assertHealthyLayout(page, `CD01 example expanded ${viewport.name}`);

    await page.goto(lessonUrl(origin, "topic=CD08&type=8.4&section=types&item=1"), { waitUntil: "domcontentloaded" });
    await page.locator(".problem-type-reader__note").waitFor();
    assert.equal(await page.locator(".problem-type-reader__note").count(), 1);
    assert.match(await page.locator(".problem-type-reader__note").innerText(), /Chỉ bình phương.*kiểm tra dấu hai vế/su);
    const noteHeight = await page.locator(".problem-type-reader__note").evaluate((element) => element.getBoundingClientRect().height);
    assert.ok(noteHeight < 180, `${viewport.name}: source note remains contextual (${noteHeight}px)`);
    await assertHealthyLayout(page, `CD08 method ${viewport.name}`);

    await page.goto(lessonUrl(origin, "topic=CD08&type=8.4&section=example&item=3"), { waitUntil: "domcontentloaded" });
    await page.locator(".example-reader__question .katex").first().waitFor();
    assert.equal(await page.locator(".example-reader__question").count(), 1);
    assert.equal(await page.locator(".example-reader__solution-body").isVisible(), false);
    await assertHealthyLayout(page, `CD08 example ${viewport.name}`);

    await page.goto(lessonUrl(origin, "topic=CD12&type=12.1&section=example&item=1"), { waitUntil: "domcontentloaded" });
    await page.locator(".example-card").waitFor();
    assert.equal(await page.locator(".example-reader__solution-body").isVisible(), false, `${viewport.name}: unaffected CD12 solution also starts hidden`);
    assert.equal(await page.locator(".example-reader__question").count(), 1);
    await assertHealthyLayout(page, `CD12 regression ${viewport.name}`);

    await page.goto(lessonUrl(origin, "topic=CD20&type=20.1&section=practice&item=1"), { waitUntil: "domcontentloaded" });
    await page.locator(".practice-card").waitFor();
    assert.ok(await page.locator(".practice-options button, .practice-reveal").count() > 0, `${viewport.name}: exercise module remains available`);
    await assertHealthyLayout(page, `practice regression ${viewport.name}`);
  }

  const graphExample = Object.entries(Object.fromEntries(
    ["2.1", "2.2", "2.3", "3.1", "3.2", "3.3"].map((code) => [code, getExampleContent(code) ?? []])
  )).flatMap(([code, examples]) => examples.map((example, index) => ({ code, example, index })))
    .find(({ example }) => example.assetReferences?.length);
  assert.ok(graphExample, "a CD02/CD03 graph-based source example exists");
  const topicId = `CD${graphExample.code.split(".")[0].padStart(2, "0")}`;
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(lessonUrl(origin, `topic=${topicId}&type=${graphExample.code}&section=example&item=${graphExample.index + 1}`), { waitUntil: "domcontentloaded" });
  await page.locator(".example-reader__figures img").first().waitFor();
  assert.equal(await page.locator(".example-reader__figures img").first().evaluate((image) => image.complete && image.naturalWidth > 0), true);
  await assertHealthyLayout(page, "graph source asset");

  for (const shot of [
    { name: "learning-v3-cd01-method-1366x768.png", width: 1366, height: 768, query: "topic=CD01&type=1.1&section=types&item=1", open: false },
    { name: "learning-v3-cd01-example-1366x768.png", width: 1366, height: 768, query: "topic=CD01&type=1.1&section=example&item=1", open: true },
    { name: "learning-v3-cd08-method-390x844.png", width: 390, height: 844, query: "topic=CD08&type=8.4&section=types&item=1", open: false },
    { name: "learning-v3-cd08-example-390x844.png", width: 390, height: 844, query: "topic=CD08&type=8.4&section=example&item=1", open: true }
  ]) {
    await page.setViewportSize({ width: shot.width, height: shot.height });
    await page.goto(lessonUrl(origin, shot.query), { waitUntil: "domcontentloaded" });
    await page.locator(".problem-type-reader, .example-card").first().waitFor();
    if (shot.open) await page.locator(".example-reader__solution > summary").click();
    await page.screenshot({ path: `.audit/${shot.name}`, fullPage: false });
  }

  assert.deepEqual(runtimeErrors, [], `runtime errors: ${runtimeErrors.join(" | ")}`);
  console.log("Learning Experience V3 QA passed across 1920, 1366, tablet and mobile viewports.");
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
