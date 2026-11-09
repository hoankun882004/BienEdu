import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, writeFileSync } from "node:fs";
import { join, resolve, extname, sep } from "node:path";
import { chromium } from "playwright-core";
import { root } from "../scripts/source-first/build.mjs";
import { digest } from "../scripts/source-first/model.mjs";
import { developmentFixture } from "../tests/helpers/development-fixture.mjs";
import { applyDevelopmentPlan } from "../scripts/source-first/development.mjs";
import { getExampleContent } from "../assets/js/data/example-content.js";
import { createReviewServer } from "../scripts/source-first/server.mjs";
import { checkDevelopmentBrowser } from "../scripts/source-first/dev-browser-check.mjs";

const fixture = developmentFixture(), plan = fixture.createPlan(), directory = join(root, ".audit/source-first-v5");
const actualPreview = JSON.parse(readFileSync(join(directory, "development-preview-v5.5.json"), "utf8"));
const actualRuntimeBaseline=Object.fromEntries(actualPreview.plan.files.map((file)=>[file.file,digest(readFileSync(join(root,file.file)))]));
for (const file of plan.files) assert.equal(file.afterHash, actualPreview.plan.files.find((entry) => entry.file === file.file).afterHash, "fixture application and consolidated real preview use identical proposed runtime bytes");
const mime = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".ttf": "font/ttf", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp" };
const server = createServer((request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, "http://local").pathname), target = resolve(join(root, path));
    if (target !== root && !target.startsWith(root+sep)) throw new Error("Forbidden");
    const local = resolve(join(fixture.root, path));
    let file = local.startsWith(fixture.root+sep) && existsSync(local) ? local : target;
    if (statSync(file).isDirectory()) file = join(file, "index.html");
    response.writeHead(200, { "content-type": mime[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" }); response.end(readFileSync(file));
  } catch { response.writeHead(404); response.end("Not found"); }
});
const studio = createReviewServer();
await Promise.all([new Promise((done) => server.listen(0, "127.0.0.1", done)), new Promise((done) => studio.listen(0, "127.0.0.1", done))]);
const executablePath = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const browser = await chromium.launch({ executablePath, headless: true }), observations = [], errors = [];
const execution = { ...fixture, execute: true, development: true, authorize: plan.planHash, env: {} };
try {
  const context = await browser.newContext({ locale: "vi-VN", reducedMotion: "reduce" }), page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const sentinel = { viewedKnowledge: ["retained-knowledge"], openedExamples: ["retained-opened"], viewedExamples: ["retained-example"], practiceAnswers: { retained: "answer" }, knowledgePdfProgress: { viewedSegments: [], completed: false } };
  await page.goto(`${origin}/documents.html?grade=12`);
  await page.evaluate((sentinel) => localStorage.setItem("bienedu:progress:v2:grade12", JSON.stringify({ version: 2, lessons: { "retained-progress-sentinel": sentinel }, exams: {} })), sentinel);
  for (const phase of ["before", "development-after"]) {
    if (phase !== "before") {
      const result = applyDevelopmentPlan(plan, execution); assert.equal(result.runtimeWrites, 2); assert.equal(result.validation.passed, true);
      assert.equal((await checkDevelopmentBrowser(fixture.root, plan)).passed, true, "the automatic CLI post-apply browser checker validates the actual isolated files");
      for (const file of plan.files) assert.equal(digest(readFileSync(join(fixture.root, file.file))), file.afterHash);
    }
    for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      for (const lesson of [{ code: "1.2", topic: "CD01", id: "1.2-source-example-5", section: "example" }, { code: "1.3", topic: "CD01", id: "1.3-source-example-4", section: "example" }, { code: "14.1", topic: "CD14", section: "knowledge" }]) {
        const position = lesson.id ? getExampleContent(lesson.code).findIndex((record) => record.id === lesson.id)+1 : 1;
        await page.goto(`${origin}/documents.html?grade=12&topic=${lesson.topic}&type=${lesson.code}&section=${lesson.section}&item=${position}`, { waitUntil: "networkidle" });
        await page.locator(lesson.id ? ".example-reader" : ".math-lesson").waitFor();
        if (lesson.id) { assert.equal(await page.locator(".example-reader__question").count(), 1); await page.locator(".example-reader__solution > summary").click(); }
        if (phase !== "before") {
          if (lesson.id) assert.ok(await page.locator(".example-reader mfrac").count());
          if (lesson.code === "1.3") { assert.ok(await page.locator(".example-reader msqrt").count()); assert.ok((await page.locator(".example-reader annotation").allTextContents()).some((text) => text === "-2<x<2")); }
          if (lesson.code === "1.2") assert.ok((await page.locator(".example-reader annotation").allTextContents()).some((text) => text.includes(String.raw`-\frac{5}{9}`)));
          if (lesson.code === "14.1") assert.ok((await page.locator(".math-lesson annotation").allTextContents()).includes("a<b"));
        }
        await page.evaluate((phase) => { const banner = document.createElement("p"); banner.textContent = phase === "before" ? "BEFORE — ISOLATED FIXTURE" : "LOCAL DEVELOPMENT EXPERIMENT — NOT HUMAN REVIEWED"; banner.style.cssText = "position:fixed;top:0;right:0;z-index:99999;font:10px sans-serif;padding:5px;background:#fff1b8;color:#4b3c04"; document.body.append(banner); }, phase);
        const target = lesson.id ? page.locator(".example-reader__solution .katex").last() : page.locator(".math-lesson");
        if (await target.count()) await target.evaluate((node) => node.scrollIntoView({ block: "center" }));
        const health = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth+1, mathErrors: document.querySelectorAll(".katex-error,.math-render-error").length, humanBadge: [...document.querySelectorAll("small")].some((node) => node.textContent.trim() === "Đã kiểm duyệt") }));
        assert.equal(health.overflow, false); assert.equal(health.mathErrors, 0); assert.equal(health.humanBadge, false);
        await page.screenshot({ path: join(directory, `v55-${lesson.code}-${phase}-${viewport.width}.png`) });
        observations.push({ code: lesson.code, phase, viewport, ...health });
      }
    }
    const retained = await page.evaluate(() => JSON.parse(localStorage.getItem("bienedu:progress:v2:grade12")).lessons["retained-progress-sentinel"]); assert.deepEqual(retained, sentinel);
  }
  await page.goto(`${origin}/documents.html?grade=12&topic=CD20&type=20.1&section=practice&item=1`);
  await page.locator(".practice-stage").waitFor(); assert.ok(await page.locator(".practice-options button,.practice-reveal").count());
  applyDevelopmentPlan(plan, { ...execution, rollback: true });
  for (const file of plan.files) assert.equal(digest(readFileSync(join(fixture.root, file.file))), file.beforeHash);
  const previewPage = await context.newPage();
  for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
    await previewPage.setViewportSize(viewport); await previewPage.goto(`http://127.0.0.1:${studio.address().port}`);
    await previewPage.locator("#queue button").first().waitFor(); await previewPage.locator("#development-overview > summary").click();
    assert.match(await previewPage.locator("#development-summary").textContent(), /3 bản sửa · 9 trường · 2 file/u);
    assert.equal(await previewPage.locator("#development-overview input").count(), 0);
    assert.match(await previewPage.locator("#development-command").textContent(), /content:dev:apply.*--execute.*--authorize/u);
    assert.equal(await previewPage.evaluate(() => document.documentElement.scrollWidth > innerWidth+1), false);
    await previewPage.screenshot({ path: join(directory, `v55-studio-overview-${viewport.width}.png`) });
  }
  assert.deepEqual(errors, []);
  const recovery = JSON.parse(readFileSync(join(directory, "recovery-v5.5.json"), "utf8"));
  for (const [file, hash] of Object.entries(recovery.runtimeHashes)) assert.equal(digest(readFileSync(join(root, file))), actualRuntimeBaseline[file]??hash);
  writeFileSync(join(directory, "browser-v5.5.json"), JSON.stringify({ passed: true, observations, learnerStates: observations.length, errors, progressPreserved: true, exercisesPreserved: true, samePlanUsedForPreviewAndFixtureApply: true, isolatedRuntimeWrites: 4, realRuntimeWrites: 0, realHumanApprovals: 0, productionPublications: 0 }, null, 2) + "\n");
  console.log("V5.5 browser passed: 12 before/actual fixture-after states, same-plan application/rollback, retained progress, practice controls, and checkbox-free development overview.");
} finally {
  await browser.close(); for (const service of [server, studio]) { service.closeAllConnections(); await new Promise((done) => service.close(done)); } fixture.cleanup();
}
