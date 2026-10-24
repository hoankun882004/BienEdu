import assert from "node:assert/strict";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { chromium } from "playwright-core";
import { knowledgeContent } from "../assets/js/data/knowledge-content.js";

const root = resolve(".");
const chromeCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
];
const executablePath = chromeCandidates.find(existsSync);
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
  { width: 390, height: 844 }, { width: 430, height: 932 },
  { width: 768, height: 1024 }, { width: 1024, height: 768 },
  { width: 1280, height: 720 }, { width: 1440, height: 900 },
  { width: 1920, height: 1080 }
];
const representatives = ["12.1", "12.4", "13.1", "14.1", "20.1", "20.2", "20.17", "21.1", "21.8"];
const allCodes = Object.keys(knowledgeContent).filter((code) => /^(?:12|13|14|20|21)\./.test(code));

function topicFor(code) {
  return `CD${code.split(".")[0]}`;
}

function lessonUrl(origin, code, section = "knowledge", item = 1) {
  return `${origin}/documents.html?grade=12&topic=${topicFor(code)}&type=${code}&section=${section}&item=${item}`;
}

async function openLesson(page, origin, code, section = "knowledge", item = 1) {
  await page.goto(lessonUrl(origin, code, section, item), { waitUntil: "domcontentloaded" });
  await page.locator(section === "knowledge" ? "[data-markdown-lesson]" : `[data-lesson-stage]`).waitFor();
}

async function inspectNativeLesson(page) {
  return page.evaluate(() => {
    const reader = document.querySelector("[data-markdown-lesson]");
    const content = reader?.querySelector(".math-lesson__content");
    const nav = document.querySelector(".lesson-navigation");
    const quick = reader?.querySelector(".math-lesson__quick");
    const formula = reader?.querySelector(".math-lesson__formula-section");
    const callout = reader?.querySelector(".math-lesson__callout");
    const equations = [...(reader?.querySelectorAll(".math-markdown__display--compact") ?? [])];
    const formulaCards = [...(reader?.querySelectorAll(".math-lesson__formula-card") ?? [])];
    const box = (element) => element ? element.getBoundingClientRect().toJSON() : null;
    const visibleClone = reader?.cloneNode(true);
    visibleClone?.querySelectorAll(".katex-mathml, annotation").forEach((node) => node.remove());
    return {
      reader: box(reader), content: box(content), navigation: box(nav),
      quick: box(quick), formula: box(formula), callout: box(callout),
      quickBackground: quick ? getComputedStyle(quick).backgroundColor : null,
      katexCount: reader?.querySelectorAll(".katex").length ?? 0,
      layout: reader?.getAttribute("data-knowledge-layout"),
      formulaCardCount: formulaCards.length,
      boundedFormulaCardCount: formulaCards.filter((card) => {
        const style = getComputedStyle(card);
        return parseFloat(style.borderTopWidth) >= 1 && parseFloat(style.borderRadius) >= 10 && style.backgroundColor === "rgb(255, 255, 255)";
      }).length,
      equationCount: equations.length,
      equationOverflowCount: equations.filter((equation) => equation.scrollWidth > equation.clientWidth + 1).length,
      forbiddenNodes: document.querySelectorAll("iframe, embed, object, canvas, [data-pdf-viewer], [class*='pdf-reader']").length,
      forbiddenText: /Xem PDF|Mở tài liệu PDF|Trang gốc|Vừa chiều rộng|PDF\.js/i.test(document.body.innerText),
      rawMath: (visibleClone?.textContent ?? "").match(/\$\$|\\(?:frac|int|sum|sqrt)\b/)?.[0] ?? null,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      verified: reader?.getAttribute("data-verification"),
      title: reader?.querySelector("h2")?.textContent.trim()
    };
  });
}

await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath, headless: true });

try {
  const context = await browser.newContext({ viewport: viewports[0], locale: "vi-VN" });
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") runtimeErrors.push(message.text()); });

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const code of representatives) {
      await openLesson(page, origin, code);
      const state = await inspectNativeLesson(page);
      const label = `${code} at ${viewport.width}x${viewport.height}`;
      assert.ok(state.reader && state.content && state.navigation, `${label} renders the complete native reader shell`);
      assert.equal(state.verified, "verified", `${label} exposes verified content`);
      assert.ok(state.title, `${label} keeps a visible lesson title`);
      assert.equal(state.forbiddenNodes, 0, `${label} contains no PDF/canvas renderer`);
      assert.equal(state.forbiddenText, false, `${label} contains no PDF viewer controls`);
      assert.equal(state.rawMath, null, `${label} does not expose raw LaTeX delimiters or commands`);
      assert.equal(state.horizontalOverflow, false, `${label} has no page-level horizontal overflow`);
      assert.equal(state.equationOverflowCount, 0, `${label} keeps ordinary Knowledge equations fully readable`);
      if (state.quick) assert.equal(state.quickBackground, "rgb(255, 247, 215)", `${label} keeps the yellow quick-note block`);
      if (state.formula && state.callout) {
        assert.ok(state.callout.top >= state.formula.bottom - 1, `${label} places the callout below its formula card`);
      }
      if (state.formula) assert.ok(state.katexCount > 0, `${label} renders mathematical notation through KaTeX`);
      if (code === "12.1") {
        assert.equal(state.layout, "formula-heavy", `${label} uses the wide formula-heavy composition`);
        assert.equal(state.formulaCardCount, 8, `${label} keeps all eight source-faithful formula categories on page one`);
        assert.equal(state.equationCount, 18, `${label} renders every source identity separately`);
        if (viewport.width >= 1024) assert.ok(state.formula.width >= state.content.width * .9, `${label} gives formulas the primary reading width`);
      }
      if (code === "12.4") {
        assert.equal(state.formulaCardCount, 6, `${label} renders six standalone formula cards`);
        assert.equal(state.boundedFormulaCardCount, 6, `${label} gives every formula category a clear card boundary`);
      }
    }

    await openLesson(page, origin, "20.2");
    await page.screenshot({
      path: `.audit/v13-native-20-2-${viewport.width}x${viewport.height}.png`,
      fullPage: viewport.width <= 768
    });
    if (viewport.width <= 430) {
      await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
      await page.waitForTimeout(80);
      const bottomClearance = await page.evaluate(() => {
        const finalCard = document.querySelector(".math-lesson__study-grid")?.lastElementChild;
        const navigation = document.querySelector(".lesson-navigation");
        if (!finalCard || !navigation) return -1;
        return navigation.getBoundingClientRect().top - finalCard.getBoundingClientRect().bottom;
      });
      assert.ok(bottomClearance >= 12, `20.2 final card clears sticky navigation at ${viewport.width}px`);
      await page.screenshot({ path: `.audit/v13-native-20-2-${viewport.width}x${viewport.height}-bottom.png` });
    }
    if ([390, 1440].includes(viewport.width)) {
      await openLesson(page, origin, "12.1");
      await page.screenshot({
        path: `.audit/v14-source-faithful-12-1-${viewport.width}x${viewport.height}.png`,
        fullPage: viewport.width <= 768
      });
      await openLesson(page, origin, "12.4");
      await page.screenshot({
        path: `.audit/v13-4-knowledge-12-4-${viewport.width}x${viewport.height}.png`,
        fullPage: viewport.width <= 768
      });
    }
  }

  for (const viewport of [viewports[0], viewports[5]]) {
    await page.setViewportSize(viewport);
    for (const code of allCodes) {
      await openLesson(page, origin, code);
      const state = await inspectNativeLesson(page);
      assert.ok(state.reader, `${code} renders native Markdown at ${viewport.width}px`);
      assert.equal(state.forbiddenNodes, 0, `${code} has no PDF runtime at ${viewport.width}px`);
      assert.equal(state.horizontalOverflow, false, `${code} fits ${viewport.width}px without page overflow`);
      assert.equal(state.equationOverflowCount, 0, `${code} needs no Knowledge equation scrolling at ${viewport.width}px`);
      assert.equal(state.rawMath, null, `${code} hides raw math syntax at ${viewport.width}px (found ${state.rawMath ?? "none"})`);
    }
  }

  await page.setViewportSize(viewports[0]);
  await openLesson(page, origin, "13.1");
  await page.waitForTimeout(500);
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));
  await page.waitForFunction(() => new URLSearchParams(location.search).get("section") === "example");
  assert.equal(new URL(page.url()).searchParams.get("section"), "example", "Right Arrow follows the lesson sequence");
  await page.waitForTimeout(500);
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })));
  await page.waitForFunction(() => new URLSearchParams(location.search).get("section") === "knowledge");
  assert.equal(new URL(page.url()).searchParams.get("section"), "knowledge", "Left Arrow returns to Knowledge");

  await openLesson(page, origin, "20.1", "practice", 1);
  await page.locator("[data-practice-answer]").first().click();
  await page.locator(".practice-feedback").waitFor();
  assert.equal(await page.locator("[data-practice-answer]:disabled").count(), 4, "practice feedback and answer locking remain intact");

  await page.goto(`${origin}/documents.html?grade=12&topic=CD01&type=1.1&section=knowledge&item=1`, { waitUntil: "domcontentloaded" });
  await page.locator(".lesson-unavailable").waitFor();
  assert.match(await page.locator(".lesson-unavailable").innerText(), /Nội dung đang được cập nhật/);
  assert.equal(await page.locator("iframe, embed, object, canvas, [data-pdf-viewer]").count(), 0, "missing lessons use an honest native empty state");

  assert.deepEqual(runtimeErrors, [], `browser runtime errors: ${runtimeErrors.join(" | ")}`);
  console.log(`V13 native learning QA passed: ${allCodes.length} lessons, ${representatives.length} representative routes, ${viewports.length} viewports.`);
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
