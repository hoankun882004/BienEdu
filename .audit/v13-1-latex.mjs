import assert from "node:assert/strict";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { chromium } from "playwright-core";

import { exampleContent } from "../assets/js/data/example-content.js";
import { knowledgeContent } from "../assets/js/data/knowledge-content.js";

const root = resolve(".");
const executablePath = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
].find(existsSync);
assert.ok(executablePath, "Chrome or Edge is required for V13.1 visual QA");

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

function topicFor(code) {
  return `CD${code.split(".")[0]}`;
}

function route(origin, code, section, item = 1) {
  return `${origin}/documents.html?grade=12&topic=${topicFor(code)}&type=${code}&section=${section}&item=${item}`;
}

async function inspect(page, label) {
  await page.locator("[data-lesson-stage]").waitFor();
  const state = await page.evaluate(() => {
    const mathContainers = [...document.querySelectorAll(".math-markdown__display, .math-expression--display")];
    const overflow = mathContainers.filter((element) => element.scrollWidth > element.clientWidth + 1);
    const unsafeOverflow = overflow.filter((element) => !["auto", "scroll"].includes(getComputedStyle(element).overflowX));
    const visible = document.body.cloneNode(true);
    visible.querySelectorAll(".katex-mathml, annotation").forEach((node) => node.remove());
    return {
      katex: document.querySelectorAll(".katex").length,
      errors: document.querySelectorAll(".katex-error, .math-render-error").length,
      overflowCount: overflow.length,
      equationOverflows: overflow.map((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth })),
      unsafeOverflowCount: unsafeOverflow.length,
      pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      overflowingElements: [...document.querySelectorAll("body *")]
        .filter((element) => element.getBoundingClientRect().right > innerWidth + 1)
        .slice(0, 8)
        .map((element) => ({ tag: element.tagName, className: element.className, right: Math.round(element.getBoundingClientRect().right), scrollWidth: element.scrollWidth, clientWidth: element.clientWidth })),
      malformedText: (visible.textContent ?? "").match(/\\(?:intP|suma|intu)\b/)?.[0] ?? null
    };
  });
  assert.equal(state.errors, 0, `${label}: no KaTeX/fallback errors`);
  assert.equal(state.unsafeOverflowCount, 0, `${label}: long equations remain equation-level scroll regions`);
  assert.equal(state.pageOverflow, false, `${label}: equations do not create page-level overflow (${JSON.stringify(state.overflowingElements)})`);
  assert.equal(state.malformedText, null, `${label}: malformed control word is not learner-visible`);
  return state;
}

await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath, headless: true });

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") runtimeErrors.push(message.text()); });

  let knowledgeRoutes = 0;
  let exampleRoutes = 0;
  let desktopEquationOverflows = 0;
  let mobileEquationOverflows = 0;
  const desktopOverflowDetails = [];
  const viewports = [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844 }];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const code of Object.keys(knowledgeContent)) {
      await page.goto(route(origin, code, "knowledge"), { waitUntil: "domcontentloaded" });
      const state = await inspect(page, `${code} Knowledge ${viewport.name}`);
      if (viewport.name === "desktop") desktopEquationOverflows += state.overflowCount;
      else mobileEquationOverflows += state.overflowCount;
      if (viewport.name === "desktop" && state.overflowCount) desktopOverflowDetails.push({ label: `${code} Knowledge`, values: state.equationOverflows });
      knowledgeRoutes += 1;
    }
    for (const [code, examples] of Object.entries(exampleContent)) {
      for (let index = 0; index < examples.length; index += 1) {
        await page.goto(route(origin, code, "example", index + 1), { waitUntil: "domcontentloaded" });
        const state = await inspect(page, `${code} Example ${index + 1} ${viewport.name}`);
        assert.ok(state.katex > 0, `${code} Example ${index + 1} ${viewport.name}: math is rendered by KaTeX`);
        if (viewport.name === "desktop") desktopEquationOverflows += state.overflowCount;
        else mobileEquationOverflows += state.overflowCount;
        if (viewport.name === "desktop" && state.overflowCount) desktopOverflowDetails.push({ label: `${code} Example ${index + 1}`, values: state.equationOverflows });
        exampleRoutes += 1;
      }
    }
  }

  const ordinaryDesktopOverflows = desktopOverflowDetails.filter(({ values }) => values.some(({ scrollWidth, clientWidth }) => scrollWidth <= clientWidth * 1.12));
  assert.deepEqual(ordinaryDesktopOverflows, [], `ordinary desktop equations fit without unnecessary scrolling: ${JSON.stringify(ordinaryDesktopOverflows)}`);
  assert.deepEqual(runtimeErrors, [], `runtime errors: ${runtimeErrors.join(" | ")}`);

  for (const shot of [
    { code: "12.1", section: "example", item: 1, width: 1440, height: 900, name: "v13-1-latex-12-1-desktop.png" },
    { code: "12.1", section: "example", item: 1, width: 390, height: 844, name: "v13-1-latex-12-1-mobile.png" },
    { code: "13.3", section: "knowledge", item: 1, width: 1440, height: 900, name: "v13-1-latex-13-3-desktop.png" },
    { code: "14.9", section: "knowledge", item: 1, width: 390, height: 844, name: "v13-1-latex-14-9-mobile.png" }
  ]) {
    await page.setViewportSize({ width: shot.width, height: shot.height });
    await page.goto(route(origin, shot.code, shot.section, shot.item), { waitUntil: "domcontentloaded" });
    await page.locator("[data-lesson-stage]").waitFor();
    await page.screenshot({ path: `.audit/${shot.name}`, fullPage: shot.width <= 390 });
  }

  console.log(JSON.stringify({
    passed: true,
    knowledgeRoutes,
    exampleRoutes,
    desktopEquationOverflows,
    mobileEquationOverflows,
    desktopOverflowDetails,
    screenshots: 4
  }, null, 2));
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
