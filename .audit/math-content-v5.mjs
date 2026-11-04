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
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(`${origin}/documents.html?grade=12&topic=CD22&type=22.7&section=knowledge&item=1`, {
      waitUntil: "domcontentloaded"
    });
    await page.locator("[data-markdown-lesson]").waitFor();

    const result = await page.evaluate(() => {
      const lesson = document.querySelector("[data-markdown-lesson]");
      const equation = lesson?.querySelector(".math-markdown__display");
      const badge = lesson?.querySelector(".math-lesson__bar small");
      const formula = lesson?.querySelector(".math-lesson__formula-section");
      return {
        title: lesson?.querySelector("h2")?.textContent.trim(),
        verification: lesson?.getAttribute("data-verification"),
        badge: badge?.textContent.trim(),
        katexCount: lesson?.querySelectorAll(".katex").length ?? 0,
        hasFraction: Boolean(lesson?.querySelector(".mfrac")),
        mathErrors: lesson?.querySelectorAll(".math-render-error, .katex-error").length ?? 0,
        fakePointLabels: /Điểm\s+[12]/u.test(lesson?.innerText ?? ""),
        formulaVisible: Boolean(formula && formula.getBoundingClientRect().height > 0),
        pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        equationOverflow: equation ? equation.scrollWidth > equation.clientWidth + 1 : false,
        pdfControls: document.querySelectorAll("iframe, embed, object, [data-pdf-viewer]").length
      };
    });

    assert.equal(result.title, "Bài toán y tế - xét nghiệm");
    assert.equal(result.verification, "source-verified");
    assert.equal(result.badge, "Đã đối chiếu nguồn");
    assert.ok(result.katexCount >= 8, `${viewport.width}px renders all inline and display probability notation`);
    assert.equal(result.hasFraction, true, `${viewport.width}px preserves the Bayes fraction`);
    assert.equal(result.mathErrors, 0, `${viewport.width}px has no red math fallback`);
    assert.equal(result.fakePointLabels, false, `${viewport.width}px omits invented generic point labels`);
    assert.equal(result.formulaVisible, true);
    assert.equal(result.pageOverflow, false, `${viewport.width}px has no page-level horizontal overflow`);
    assert.equal(result.equationOverflow, false, `${viewport.width}px fits the ordinary Bayes equation`);
    assert.equal(result.pdfControls, 0);

    await page.screenshot({
      path: `.audit/math-content-v5-cd22-7-${viewport.width}x${viewport.height}.png`,
      fullPage: false
    });

    if (viewport.width <= 768) {
      const clearance = await page.evaluate(async () => {
        const stage = document.querySelector("[data-lesson-stage]");
        const canScroll = stage
          && !["visible", "clip"].includes(getComputedStyle(stage).overflowY)
          && stage.scrollHeight > stage.clientHeight + 1;
        if (canScroll) stage.scrollTop = stage.scrollHeight;
        else scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
        await new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)));
        const finalCard = document.querySelector(".math-lesson__quick")
          ?? document.querySelector(".math-lesson__primary")?.lastElementChild;
        const navigation = document.querySelector(".lesson-navigation");
        return finalCard && navigation
          ? navigation.getBoundingClientRect().top - finalCard.getBoundingClientRect().bottom
          : -1;
      });
      assert.ok(clearance >= 12, `${viewport.width}px keeps the final learning card above navigation`);
      await page.screenshot({
        path: `.audit/math-content-v5-cd22-7-${viewport.width}x${viewport.height}-bottom.png`,
        fullPage: false
      });
    }
  }

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(`${origin}/documents.html?grade=12&topic=CD22&type=22.7&section=example&item=1`, {
    waitUntil: "domcontentloaded"
  });
  await page.locator(".example-reader").waitFor();
  const example = await page.evaluate(() => {
    const reader = document.querySelector(".example-reader");
    return {
      text: reader?.innerText ?? "",
      solutionCount: reader?.querySelectorAll(".example-reader__solution").length ?? 0,
      errors: reader?.querySelectorAll(".math-render-error, .katex-error").length ?? 0,
      katexCount: reader?.querySelectorAll(".katex").length ?? 0
    };
  });
  assert.match(example.text, /Tài liệu nguồn chưa có lời giải được ánh xạ chắc chắn/u);
  assert.match(example.text, /Nguồn LaTeX: dòng 749–751/u);
  assert.match(example.text, /Đã đối chiếu LaTeX nguồn/u);
  assert.equal(example.solutionCount, 0, "no worked solution is invented for the source example");
  assert.equal(example.errors, 0);
  assert.ok(example.katexCount >= 2);

  assert.deepEqual(runtimeErrors, []);
  await context.close();
  console.log("Math content V5 Playwright QA passed at 1920, 1366, 768 and 390 px.");
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
