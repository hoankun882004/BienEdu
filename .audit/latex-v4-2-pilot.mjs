import assert from "node:assert/strict";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { chromium } from "playwright-core";

const root = resolve(".");
const executablePath = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
].find(existsSync);
assert.ok(executablePath, "Chrome or Edge is required for Playwright QA");

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

const viewports = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 }
];

await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath, headless: true });

try {
  const context = await browser.newContext({ locale: "vi-VN" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(`${origin}/documents.html?grade=12&topic=CD22&type=22.5&section=knowledge&item=1`, { waitUntil: "domcontentloaded" });
    await page.locator("[data-markdown-lesson]").waitFor();
    const knowledge = await page.evaluate(() => {
      const reader = document.querySelector("[data-markdown-lesson]");
      const formula = reader?.querySelector(".math-lesson__formula-section");
      const equation = reader?.querySelector(".math-markdown__display");
      return {
        title: reader?.querySelector("h2")?.textContent.trim(),
        katex: reader?.querySelectorAll(".katex").length ?? 0,
        hasFraction: Boolean(reader?.querySelector(".mfrac")),
        mathErrors: reader?.querySelectorAll(".math-render-error, .katex-error").length ?? 0,
        pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        equationOverflow: equation ? equation.scrollWidth > equation.clientWidth + 1 : false,
        formulaVisible: Boolean(formula && formula.getBoundingClientRect().height > 0),
        pdfControls: document.querySelectorAll("iframe, embed, object, [data-pdf-viewer]").length
      };
    });
    assert.equal(knowledge.title, "Công thức Bayes");
    assert.ok(knowledge.katex > 0, `${viewport.width}px renders native formulas with KaTeX`);
    assert.equal(knowledge.hasFraction, true, `${viewport.width}px keeps the Bayes fraction`);
    assert.equal(knowledge.mathErrors, 0, `${viewport.width}px has no math error`);
    assert.equal(knowledge.pageOverflow, false, `${viewport.width}px has no page overflow`);
    assert.equal(knowledge.equationOverflow, false, `${viewport.width}px fits the ordinary equation`);
    assert.equal(knowledge.formulaVisible, true);
    assert.equal(knowledge.pdfControls, 0);
    await page.screenshot({
      path: `.audit/latex-v4-2-cd22-${viewport.width}x${viewport.height}.png`,
      fullPage: viewport.width <= 768
    });
    if (viewport.width <= 768) {
      const bottomClearance = await page.evaluate(async () => {
        const stage = document.querySelector("[data-lesson-stage]");
        const stageCanScroll = stage
          && !["visible", "clip"].includes(getComputedStyle(stage).overflowY)
          && stage.scrollHeight > stage.clientHeight + 1;
        if (stageCanScroll) stage.scrollTop = stage.scrollHeight;
        else scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const finalCard = document.querySelector(".math-lesson__quick") ?? document.querySelector(".math-lesson__study-grid")?.lastElementChild;
        const navigation = document.querySelector(".lesson-navigation");
        return finalCard && navigation ? navigation.getBoundingClientRect().top - finalCard.getBoundingClientRect().bottom : -1;
      });
      assert.ok(bottomClearance >= 12, `${viewport.width}px keeps the final source note above navigation after scrolling`);
      await page.screenshot({ path: `.audit/latex-v4-2-cd22-${viewport.width}x${viewport.height}-bottom.png` });
    }
  }

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(`${origin}/documents.html?grade=12&topic=CD22&type=22.7&section=knowledge&item=1`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-markdown-lesson]").waitFor();
  const medical = await page.evaluate(() => {
    const lesson = document.querySelector("[data-markdown-lesson]");
    return {
      annotations: [...(lesson?.querySelectorAll("annotation[encoding='application/x-tex']") ?? [])].map((node) => node.textContent),
      hasFraction: Boolean(lesson?.querySelector(".mfrac")),
      verification: lesson?.getAttribute("data-verification")
    };
  });
  assert.ok(medical.annotations.includes(String.raw`\mathrm{P}(\text{bệnh}\mid +) = \frac{\mathrm{P}(\text{bệnh})\mathrm{P}(+\mid \text{bệnh})}{\mathrm{P}(+)}`));
  assert.equal(medical.hasFraction, true);
  assert.equal(medical.verification, "source-verified");
  assert.equal(await page.locator(".math-render-error, .katex-error").count(), 0);

  await page.goto(`${origin}/documents.html?grade=12&topic=CD22&type=22.5&section=example&item=1`, { waitUntil: "domcontentloaded" });
  await page.locator(".example-reader").waitFor();
  const exampleText = await page.locator(".example-reader").innerText();
  assert.match(exampleText, /Tài liệu nguồn chưa có lời giải được ánh xạ chắc chắn/u);
  assert.match(exampleText, /Nguồn LaTeX: dòng 716–718/u);
  assert.match(exampleText, /Đã đối chiếu LaTeX nguồn/u);
  assert.equal(await page.locator(".example-reader__solution").count(), 0);

  assert.deepEqual(errors, []);
  await context.close();
  console.log("Native LaTeX V4.2 Playwright QA passed at 1920, 1366, 768 and 390 px.");
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
