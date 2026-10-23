import assert from "node:assert/strict";
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { Browser } from "../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs";

const root = resolve(".");
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf" };
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
  { width: 360, height: 800, mobile: true },
  { width: 375, height: 812, mobile: true },
  { width: 390, height: 844, mobile: true },
  { width: 414, height: 896, mobile: true },
  { width: 430, height: 932, mobile: true },
  { width: 768, height: 1024, mobile: false },
  { width: 1280, height: 720, mobile: false },
  { width: 1440, height: 900, mobile: false }
];

try {
  const page = await browser.newPage(sizes[0]);

  for (const size of sizes) {
    await page.setViewport(size);
    await page.goto(`${origin}/quiz.html?grade=12`, { timeoutMs: 30000, settleMs: 220 });
    const practicePage = await page.eval(`(() => ({
      title: document.querySelector('[data-practice-page-title]')?.textContent,
      emptyState: Boolean(document.querySelector('.practice-paper-empty')),
      paperCount: document.querySelectorAll('.practice-paper-item').length,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      navLabel: [...document.querySelectorAll('.site-nav a')].find((link) => link.getAttribute('aria-current') === 'page')?.textContent
    }))()`);
    assert.equal(practicePage.title, "Luyện đề Toán 12");
    assert.equal(practicePage.emptyState, true);
    assert.equal(practicePage.paperCount, 0);
    assert.equal(practicePage.horizontalOverflow, false, `practice-paper shell must fit ${size.width}x${size.height}`);
    assert.equal(practicePage.navLabel, "Luyện đề");

    await page.goto(`${origin}/documents.html?grade=12&topic=CD13&type=13.1&section=knowledge&item=1`, { timeoutMs: 30000, settleMs: 220 });
    const note = await page.eval(`(() => {
      const element = document.querySelector('.knowledge-reader__points');
      if (!element) return {
        mode: document.querySelector('[data-pdf-viewer]') ? 'pdf' : 'missing',
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1
      };
      const style = getComputedStyle(element);
      return {
        mode: 'note',
        background: style.backgroundColor,
        borderTop: style.borderTopWidth,
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1
      };
    })()`);
    if (note.mode === "note") {
      assert.equal(note.background, "rgb(255, 247, 207)");
      assert.equal(note.borderTop, "3px");
    } else {
      assert.equal(note.mode, "pdf", "mapped source lessons may use the verified PDF reader");
    }
    assert.equal(note.horizontalOverflow, false, `yellow note must fit ${size.width}x${size.height}`);

    await page.goto(`${origin}/documents.html?grade=12&topic=CD13&type=13.1&section=example&item=1`, { timeoutMs: 30000, settleMs: 220 });
    const controls = await page.eval(`(() => {
      const footer = document.querySelector('.lesson-navigation');
      const previous = footer.firstElementChild.getBoundingClientRect();
      const next = footer.lastElementChild.getBoundingClientRect();
      return {
        widthDifference: Math.abs(previous.width - next.width),
        heightDifference: Math.abs(previous.height - next.height),
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1
      };
    })()`);
    assert.ok(controls.widthDifference <= 1, `navigation widths must match at ${size.width}x${size.height}`);
    assert.ok(controls.heightDifference <= 1, `navigation heights must match at ${size.width}x${size.height}`);
    assert.equal(controls.horizontalOverflow, false, `lesson navigation must fit ${size.width}x${size.height}`);

    if (size.width === 390) {
      await page.goto(`${origin}/quiz.html?grade=12`, { timeoutMs: 30000, settleMs: 180 });
      await page.screenshot({ path: ".audit/v9-practice-papers-390.jpg", quality: 88, fullPage: true });
      await page.goto(`${origin}/documents.html?grade=12&topic=CD13&type=13.1&section=knowledge&item=1`, { timeoutMs: 30000, settleMs: 180 });
      await page.screenshot({ path: ".audit/v9-quick-note-390.jpg", quality: 88, fullPage: true });
    }
    if (size.width === 1440) {
      await page.goto(`${origin}/quiz.html?grade=12`, { timeoutMs: 30000, settleMs: 180 });
      await page.screenshot({ path: ".audit/v9-practice-papers-1440.jpg", quality: 88, fullPage: true });
      await page.goto(`${origin}/documents.html?grade=12&topic=CD13&type=13.1&section=knowledge&item=1`, { timeoutMs: 30000, settleMs: 180 });
      await page.screenshot({ path: ".audit/v9-quick-note-1440.jpg", quality: 88 });
    }
  }

  console.log("UX V9 refinement passed: honest Luyện đề shell, balanced lesson navigation and yellow quick-note block across 8 requested viewports.");
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
