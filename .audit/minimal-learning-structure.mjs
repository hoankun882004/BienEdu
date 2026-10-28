import assert from "node:assert/strict";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { chromium } from "playwright-core";

import { curriculumGroups } from "../assets/js/data/curriculum.js";
import { getExampleContent } from "../assets/js/data/example-content.js";
import { getProblemTypesForTopic } from "../assets/js/data/knowledge-content.js";
import { findTopic } from "../assets/js/domain/curriculum-filter.js";

const root = resolve(".");
const executablePath = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
].find(existsSync);
assert.ok(executablePath, "Chrome or Edge is required");

const mime = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf"
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

function url(origin, query) {
  return `${origin}/documents.html?grade=12&${query}`;
}

async function assertNoRenderingErrors(page, label) {
  const state = await page.evaluate(() => ({
    katexErrors: document.querySelectorAll(".katex-error, .math-render-error").length,
    pageOverflow: document.documentElement.scrollWidth > innerWidth + 1
  }));
  assert.equal(state.katexErrors, 0, `${label}: no math rendering errors`);
  assert.equal(state.pageOverflow, false, `${label}: no page-level horizontal overflow`);
}

await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath, headless: true });

try {
  const context = await browser.newContext({ locale: "vi-VN" });
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") runtimeErrors.push(message.text()); });

  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 }
  ]) {
    await page.setViewportSize(viewport);

    await page.goto(url(origin, "topic=CD01"), { waitUntil: "domcontentloaded" });
    await page.locator(".type-list").waitFor();
    const topic = findTopic(curriculumGroups, "CD01");
    const cards = page.locator(".type-list > a");
    assert.equal(await cards.count(), topic.exerciseTypes.length + 1, `CD01 ${viewport.name}: one Knowledge card plus unchanged types`);
    assert.match(await cards.nth(0).innerText(), /Kiến thức cần nhớ/u);
    assert.match(await cards.nth(1).innerText(), /^1\.1/u);
    assert.match(await cards.nth(0).getAttribute("href"), /topic=CD01.*section=knowledge/u);
    assert.doesNotMatch(await cards.nth(0).getAttribute("href"), /type=/u);
    assert.match(await cards.nth(1).getAttribute("href"), /type=1\.1.*section=types/u);
    await assertNoRenderingErrors(page, `CD01 overview ${viewport.name}`);

    await page.goto(url(origin, "topic=CD01&section=knowledge&item=1"), { waitUntil: "domcontentloaded" });
    await page.locator(".topic-knowledge-workspace").waitFor();
    assert.equal(await page.locator(".topic-knowledge-workspace .math-lesson").count(), 1);
    assert.ok(await page.locator(".topic-knowledge-workspace .katex").count() > 0, `CD01 Knowledge ${viewport.name}: KaTeX renders`);
    await assertNoRenderingErrors(page, `CD01 Knowledge ${viewport.name}`);

    await page.goto(url(origin, "topic=CD01&type=1.1&section=types&item=1"), { waitUntil: "domcontentloaded" });
    await page.locator(".problem-type-reader").waitFor();
    const typeText = await page.locator(".problem-type-reader").innerText();
    assert.match(typeText, /Dạng 1\.1/iu);
    assert.match(typeText, /Cách làm/iu);
    const sourceType = getProblemTypesForTopic("CD01").find((item) => item.code === "1.1");
    if (sourceType.note) assert.match(typeText, /Lưu ý/iu);
    assert.equal(await page.locator(".workspace-phase-nav button[data-section='knowledge']").count(), 0, `CD01 type ${viewport.name}: no repeated general Knowledge`);
    assert.equal(await page.locator(".problem-types-reader").count(), 0, `CD01 type ${viewport.name}: no duplicate type catalogue`);
    assert.match(await page.locator(".workspace-phase-nav button[data-section='example'] small").innerText(), new RegExp(`\\d+/${getExampleContent("1.1").length}`));
    await assertNoRenderingErrors(page, `CD01 type 1.1 ${viewport.name}`);

    const lastExample = getExampleContent("1.1").length;
    await page.goto(url(origin, `topic=CD01&type=1.1&section=example&item=${lastExample}`), { waitUntil: "domcontentloaded" });
    await page.locator(".example-reader").waitFor();
    assert.equal(await page.locator(".example-reader__solution").count(), 1, `CD01 last example ${viewport.name}: corresponding solution is available`);
    assert.match(await page.locator(".example-reader__bar").innerText(), new RegExp(`${lastExample}/${lastExample}`));
    await assertNoRenderingErrors(page, `CD01 last example ${viewport.name}`);

    await page.goto(url(origin, "topic=CD01&type=1.1&section=practice&item=1"), { waitUntil: "domcontentloaded" });
    await page.locator("[data-lesson-stage]").waitFor();
    assert.ok(await page.locator(".practice-stage, .lesson-inline-empty").count() > 0, `CD01 practice ${viewport.name}: existing practice state remains reachable`);

    await page.goto(url(origin, "topic=CD12&type=12.1&section=knowledge&item=1"), { waitUntil: "domcontentloaded" });
    await page.locator("[data-lesson-stage]").waitFor();
    assert.equal(await page.locator(".workspace-phase-nav button[data-section='knowledge']").count(), 1, `CD12 ${viewport.name}: unaffected per-type Knowledge remains`);
    await assertNoRenderingErrors(page, `CD12 regression ${viewport.name}`);

    for (const topicId of ["CD07", "CD08", "CD11"]) {
      const code = findTopic(curriculumGroups, topicId).exerciseTypes[0].code;
      await page.goto(url(origin, `topic=${topicId}&type=${code}&section=types&item=1`), { waitUntil: "domcontentloaded" });
      await page.locator(".problem-type-reader").waitFor();
      assert.equal(await page.locator(".workspace-phase-nav button[data-section='knowledge']").count(), 0, `${topicId} ${viewport.name}: no repeated Knowledge`);
      await assertNoRenderingErrors(page, `${topicId} ${viewport.name}`);
    }
  }

  for (const shot of [
    { name: "minimal-structure-cd01-overview-desktop.png", width: 1440, height: 900, query: "topic=CD01" },
    { name: "minimal-structure-cd01-knowledge-desktop.png", width: 1440, height: 900, query: "topic=CD01&section=knowledge&item=1" },
    { name: "minimal-structure-cd01-type-mobile.png", width: 390, height: 844, query: "topic=CD01&type=1.1&section=types&item=1" }
  ]) {
    await page.setViewportSize({ width: shot.width, height: shot.height });
    await page.goto(url(origin, shot.query), { waitUntil: "domcontentloaded" });
    await page.locator(".topic-detail, .learning-workspace").first().waitFor();
    await page.screenshot({ path: `.audit/${shot.name}`, fullPage: false });
  }

  assert.deepEqual(runtimeErrors, [], `runtime errors: ${runtimeErrors.join(" | ")}`);
  console.log("Minimal learning structure QA passed: CD01/CD07/CD08/CD11 + CD12 regression on desktop and mobile.");
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
