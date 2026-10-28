import assert from "node:assert/strict";
import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { chromium } from "playwright-core";

const root = resolve(".");
const output = resolve(".audit/screenshots/final-pdf-v2");
mkdirSync(output, { recursive: true });
const executablePath = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
].find(existsSync);
assert.ok(executablePath, "Chrome or Edge is required for Playwright QA");

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

const viewports = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 }
];
const lessons = [
  { topic: "CD01", type: "1.1", knowledge: 1, types: 10, examples: 10 },
  { topic: "CD07", type: "7.1", knowledge: 1, types: 9, examples: 10 },
  { topic: "CD08", type: "8.14", knowledge: 5, types: 14, examples: 10 },
  { topic: "CD11", type: "11.15", knowledge: 4, types: 15, examples: 10 },
  { topic: "CD12", type: "12.1", knowledge: 2, types: 0, examples: 2 }
];

await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath, headless: true });
const failures = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") failures.push(`${viewport.width}x${viewport.height}: ${message.text()}`);
    });
    page.on("pageerror", (error) => failures.push(`${viewport.width}x${viewport.height}: ${error.message}`));

    for (const lesson of lessons) {
      const base = `${origin}/documents.html?grade=12&topic=${lesson.topic}&type=${lesson.type}`;
      const topicKnowledge = lesson.types > 0;
      const knowledgeUrl = topicKnowledge
        ? `${origin}/documents.html?grade=12&topic=${lesson.topic}&section=knowledge&item=1`
        : `${base}&section=knowledge&item=1`;
      await page.goto(knowledgeUrl, { waitUntil: "domcontentloaded" });
      await page.locator("[data-markdown-lesson]").waitFor();
      if (topicKnowledge) assert.equal(await page.locator(".topic-knowledge-workspace").count(), 1);
      else assert.equal(await page.locator("[data-section='knowledge']").count() > 0, true);
      assert.equal(await page.locator(".math-render-error,.katex-error").count(), 0, `${lesson.topic} malformed math`);
      const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(horizontalOverflow <= 2, `${lesson.topic} page overflow ${horizontalOverflow}px at ${viewport.width}`);
      await page.screenshot({ path: join(output, `${lesson.topic}-${viewport.width}x${viewport.height}.png`), fullPage: false });

      if (lesson.types) {
        await page.goto(`${origin}/documents.html?grade=12&topic=${lesson.topic}`, { waitUntil: "domcontentloaded" });
        await page.locator(".type-list").waitFor();
        assert.equal(await page.locator(".type-list > a").count(), lesson.types + 1);
        assert.match(await page.locator(".type-list > a").first().innerText(), /Kiến thức cần nhớ/u);
        await page.goto(`${base}&section=types&item=1`, { waitUntil: "domcontentloaded" });
        await page.locator(".problem-type-reader").waitFor();
        assert.equal(await page.locator("[data-section='knowledge']").count(), 0);
        assert.match(await page.locator(".problem-type-reader").innerText(), /Cách làm/iu);
      }

      await page.goto(`${base}&section=example&item=1`, { waitUntil: "domcontentloaded" });
      await page.locator(".example-reader").waitFor();
      assert.match(await page.locator(".example-reader__bar p").innerText(), new RegExp(`/\\s*${lesson.examples}$`));
      assert.equal(await page.locator(".math-render-error,.katex-error").count(), 0, `${lesson.topic} example math error`);
    }
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}

assert.deepEqual(failures, [], failures.join("\n"));
console.log(`V2 final-PDF workspace QA passed: ${lessons.length} topics × ${viewports.length} viewports.`);
