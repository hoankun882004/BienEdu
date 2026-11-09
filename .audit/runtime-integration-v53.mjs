import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, writeFileSync } from "node:fs";
import { join, resolve, extname, sep } from "node:path";
import { chromium } from "playwright-core";
import { root, work } from "../scripts/source-first/build.mjs";
import { digest } from "../scripts/source-first/model.mjs";
import { getExampleContent } from "../assets/js/data/example-content.js";
import { createReviewServer } from "../scripts/source-first/server.mjs";

const directory = join(root, ".audit/source-first-v5");
const v54 = process.env.BIENEDU_SOURCE_QA === "v5.4";
const prefix = v54 ? "v54-" : "";
const viewports = v54 ? [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }] : [{ width: 1366, height: 900 }, { width: 390, height: 844 }];
const registry = JSON.parse(readFileSync(join(root, "scripts/source-first/corrections-v53.json"), "utf8"));
const candidates = JSON.parse(readFileSync(join(work, "foundation-candidates-v53.json"), "utf8"));
const guardedFiles = ["assets/js/data/foundation-lessons.generated.js", "assets/js/data/calculus-knowledge-details.js", "assets/js/data/latex-pilot.generated.js", ...new Set(registry.corrections.map((entry) => entry.sourceDocumentId === "cd01-cd07-functions" ? "assets/documents/bienedu-ham-so-dao-ham-cd01-cd07.pdf" : "assets/documents/bienedu-nguyen-ham-tich-phan-ung-dung-cd12-cd14.pdf"))].filter((file) => existsSync(join(root, file)));
const baseline = Object.fromEntries(guardedFiles.map((file) => [file, digest(readFileSync(join(root, file)))]));
const mime = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".ttf": "font/ttf", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp" };
const server = createServer((request, response) => {
  try {
    let file = resolve(join(root, decodeURIComponent(new URL(request.url, "http://local").pathname)));
    if (file !== root && !file.startsWith(root + sep)) throw new Error("Forbidden");
    if (statSync(file).isDirectory()) file = join(file, "index.html");
    response.writeHead(200, { "content-type": mime[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" }); response.end(readFileSync(file));
  } catch { response.writeHead(404); response.end("Not found"); }
});
const studio = createReviewServer();
await Promise.all([new Promise((done) => server.listen(0, "127.0.0.1", done)), new Promise((done) => studio.listen(0, "127.0.0.1", done))]);
const origin = `http://127.0.0.1:${server.address().port}`;
const executablePath = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
assert.ok(executablePath);
const browser = await chromium.launch({ executablePath, headless: true });
const pages = [
  { code: "1.2", topic: "CD01", id: "1.2-source-example-5", section: "example", expected: ["mfrac"] },
  { code: "1.3", topic: "CD01", id: "1.3-source-example-4", section: "example", expected: ["mfrac", "msqrt"] },
  { code: "14.1", topic: "CD14", section: "knowledge", expected: [] },
  { code: "22.7", topic: "CD22", section: "knowledge", expected: ["mfrac"] },
  { code: "22.7", topic: "CD22", section: "example", expected: [] }
];
const observations = [], errors = [];
const parent = JSON.parse(readFileSync(join(directory,"development-preview-v5.5.json"),"utf8")).plan;
const alreadyApplied = parent.files.every((file)=>digest(readFileSync(join(root,file.file)))===file.afterHash);
try {
  for (const staged of (alreadyApplied ? [false] : [false, true])) {
    const context = await browser.newContext({ locale: "vi-VN", reducedMotion: "reduce" });
    if (staged) {
      await context.route("**/foundation-lessons.generated.js*", async (route) => {
        if (new URL(route.request().url()).searchParams.has("v53-original")) return route.continue();
        const original = new URL(route.request().url()); original.searchParams.set("v53-original", "1");
        const source = JSON.stringify(original.href), patches = JSON.stringify(registry.corrections.filter((entry) => candidates.candidates.some((candidate) => candidate.record.id === entry.recordId)));
        await route.fulfill({ contentType: "text/javascript", body: `export * from ${source}; import {foundationExampleContent as original} from ${source}; const copy=structuredClone(original); for(const patch of ${patches}) {const code=patch.recordId.split('-')[0]; const matches=copy[code].filter(x=>x.id===patch.recordId && x.sourceBlockId===patch.sourceBlockId); if(matches.length!==1) throw Error('Stable preview identity mismatch'); const record=matches[0]; for(const field of patch.fields) {if(field.field==='source-solution.expression') {const steps=record.steps.filter(x=>x.label==='Lời giải từ tài liệu'); if(steps.length!==1 || steps[0].expression!==field.before) throw Error('Stale solution preview'); steps[0].expression=field.after;} else {if(record[field.field]!==field.before) throw Error('Stale field preview'); record[field.field]=field.after;}}} export const foundationExampleContent=Object.freeze(copy);` });
      });
      await context.route("**/calculus-knowledge-details.js*", async (route) => {
        if (new URL(route.request().url()).searchParams.has("v53-original")) return route.continue();
        const original = new URL(route.request().url()); original.searchParams.set("v53-original", "1");
        const source = JSON.stringify(original.href), field = registry.corrections.find((entry) => entry.recordId === "knowledge:14.1").fields[0];
        await route.fulfill({ contentType: "text/javascript", body: `export * from ${source}; import {calculusKnowledgeDetails as original} from ${source}; const copy=structuredClone(original); const matches=copy['14.1'].formulae.filter(x=>x.detail===${JSON.stringify(field.before)}); if(matches.length!==1) throw Error('Condition preview identity mismatch'); matches[0].detail=${JSON.stringify(field.after)}; export const calculusKnowledgeDetails=Object.freeze(copy);` });
      });
    }
    const page = await context.newPage(); page.on("pageerror", (error) => errors.push(error.message));
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      for (const item of pages) {
        // URL indices are resolved transiently from stable IDs; never persisted as content identities.
        const position = item.id ? getExampleContent(item.code).findIndex((entry) => entry.id === item.id) + 1 : 1;
        assert.ok(position > 0);
        await page.goto(`${origin}/documents.html?grade=12&topic=${item.topic}&type=${item.code}&section=${item.section}&item=${position}`, { waitUntil: "networkidle" });
        await page.locator(item.section === "example" ? ".example-reader" : ".math-lesson").first().waitFor();
        if (item.section === "example" && await page.locator(".example-reader__solution > summary").count()) await page.locator(".example-reader__solution > summary").click();
        if (staged) await page.evaluate(() => { const banner = document.createElement("div"); banner.textContent = "LOCAL STAGED PREVIEW — NOT PUBLISHED"; banner.style.cssText = "position:fixed;top:0;right:0;z-index:99999;background:#fff1b8;color:#4c3b00;padding:4px 8px;font:11px sans-serif"; document.body.append(banner); });
        const target = page.locator(item.section === "example" ? ".example-reader__question" : ".math-lesson").first();
        await target.scrollIntoViewIfNeeded();
        const evidence = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1, mathErrors: document.querySelectorAll(".math-render-error,.katex-error").length, fractions: document.querySelectorAll(".example-reader mfrac,.math-lesson mfrac").length, radicals: document.querySelectorAll(".example-reader msqrt,.math-lesson msqrt").length, text: document.querySelector(".example-reader,.math-lesson")?.textContent }));
        assert.equal(evidence.overflow, false); assert.equal(evidence.mathErrors, 0);
        if (staged) for (const tag of item.expected) assert.ok(await page.locator(`.example-reader ${tag},.math-lesson ${tag}`).count(), `${item.code} ${item.section} ${tag}`);
        if (staged && item.code === "14.1") assert.match(evidence.text, /a\s*<\s*b/u);
        if (item.code === "22.7" && item.section === "example") { assert.match(evidence.text, /8[.,]76/u); assert.equal(await page.locator(".example-reader .katex").count(), 2); }
        const file = `${prefix}learner-${item.code}-${item.section}-${staged ? "staged" : "current"}-${viewport.width}.png`;
        await page.screenshot({ path: join(directory, file), fullPage: false });
        if (viewport.width === 390 && item.id) {
          const formula = page.locator(".example-reader__solution .katex");
          await (await formula.count() ? formula.last() : page.locator(".example-reader__solution")).evaluate((node) => node.scrollIntoView({ block: "center" }));
          await page.screenshot({ path: join(directory, file.replace(".png", "-solution.png")) });
        }
        observations.push({ code: item.code, section: item.section, mode: staged ? "isolated staged preview; runtime untouched" : "actual current runtime", viewport, screenshot: file, ...evidence, text: undefined });
      }
    }
    await context.close();
  }
  const context = await browser.newContext(), page = await context.newPage();
  for (const viewport of viewports) {
    await page.setViewportSize(viewport); await page.goto(`http://127.0.0.1:${studio.address().port}`);
    await page.locator("#queue button").first().waitFor(); await page.locator("#topic").selectOption("CD01");
    await page.locator("#queue button").filter({ hasText: "pdf-root-domain" }).click();
    await page.locator("details").filter({ has: page.locator("#runtime-state") }).locator("summary").click();
    assert.equal(await page.locator(".runtime-field-diff").count(), 4);
    await page.locator("#source-page").selectOption("5"); await page.locator("#source-crop").waitFor({ state: "visible" });
    await page.locator("#runtime-diffs").scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(directory, `${prefix}studio-runtime-diffs-${viewport.width}.png`) });
  }
  await context.close();
  assert.deepEqual(errors, []);
  for (const [file, hash] of Object.entries(baseline)) assert.equal(digest(readFileSync(join(root, file))), hash, `No source/runtime writes: ${file}`);
  const report = { passed: true, observedLearnerStates: observations.length, observations, errors, runtimeWrites: 0, sourceWrites: 0, actualPublishedCorrections: 0, stagedDefects: 3, actualRemainingVisibleDefects: 3, note: "Staged screenshots use browser-only module overrides. They do not show published corrections." };
  writeFileSync(join(directory, v54 ? "browser-v5.4.json" : "browser-v5.3.json"), JSON.stringify(report, null, 2) + "\n"); console.log(JSON.stringify({ passed: true, learnerStates: observations.length, runtimeWrites: 0 }));
} finally {
  await browser.close();
  for (const service of [server, studio]) { service.closeAllConnections(); await new Promise((done) => service.close(done)); }
}
