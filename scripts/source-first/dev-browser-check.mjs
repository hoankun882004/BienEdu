import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve, sep, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { root as projectRoot } from "./build.mjs";

// Read-only post-apply validation of the actual local files. No module response
// overrides and no shared browser storage; the context is closed afterwards.
export async function checkDevelopmentBrowser(root, plan, output = join(root, ".audit/source-first-v5")) {
  mkdirSync(output, { recursive: true });
  const mime = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".ttf": "font/ttf", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp" };
  const server = createServer((request, response) => {
    try {
      const path = decodeURIComponent(new URL(request.url, "http://local").pathname);
      let file = resolve(join(root, path));
      if (file !== root && !file.startsWith(root+sep)) throw new Error("Forbidden");
      if (!existsSync(file)) { file = resolve(join(projectRoot, path)); if (file !== projectRoot && !file.startsWith(projectRoot+sep)) throw new Error("Forbidden"); }
      if (statSync(file).isDirectory()) file = join(file, "index.html");
      response.writeHead(200, { "content-type": mime[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" }); response.end(readFileSync(file));
    } catch { response.writeHead(404); response.end("Not found"); }
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const executablePath = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
  let browser;
  try {
    browser = await chromium.launch({ executablePath, headless: true });
    const context = await browser.newContext({ locale: "vi-VN", reducedMotion: "reduce" }), page = await context.newPage(), errors = [], states = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const { getExampleContent } = await import(pathToFileURL(join(root, "assets/js/data/example-content.js")).href);
    const records = [...new Set(plan.files.flatMap((file) => file.changes.map((change) => change.recordId)))];
    for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      for (const recordId of records) {
        const knowledge = recordId.startsWith("knowledge:"), code = knowledge ? recordId.slice(10) : recordId.split("-")[0];
        const item = knowledge ? 1 : getExampleContent(code).findIndex((entry) => entry.id === recordId)+1;
        assert.ok(item > 0); const topic = `CD${code.split(".")[0].padStart(2, "0")}`;
        await page.goto(`http://127.0.0.1:${server.address().port}/documents.html?grade=12&topic=${topic}&type=${code}&section=${knowledge ? "knowledge" : "example"}&item=${item}`, { waitUntil: "networkidle" });
        await page.locator(knowledge ? ".math-lesson" : ".example-reader").waitFor();
        if (!knowledge) { assert.equal(await page.locator(".example-reader__question").count(), 1); await page.locator(".example-reader__solution > summary").click(); assert.ok(await page.locator(".example-reader mfrac").count()); }
        const math = await page.locator(knowledge ? ".math-lesson annotation" : ".example-reader annotation").allTextContents();
        if (code === "14.1") assert.ok(math.includes("a<b"));
        if (code === "1.3") { assert.ok(math.includes("-2<x<2")); assert.ok(await page.locator(".example-reader msqrt").count()); }
        if (code === "1.2") assert.ok(math.some((value) => value.includes(String.raw`-\frac{5}{9}`)));
        const health = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth+1, mathErrors: document.querySelectorAll(".katex-error,.math-render-error").length, humanBadge: [...document.querySelectorAll("small")].some((node) => node.textContent.trim() === "Đã kiểm duyệt") }));
        assert.deepEqual(health, { overflow: false, mathErrors: 0, humanBadge: false });
        await page.screenshot({ path: join(output, `v55-local-check-${plan.planHash.slice(0, 8)}-${code}-${viewport.width}.png`) }); states.push({ code, viewport, ...health });
      }
    }
    assert.deepEqual(errors, []);
    const result = { passed: true, planHash: plan.planHash, actualLocalFiles: true, humanEditorialApproval: false, states, errors };
    writeFileSync(join(output, `local-browser-${plan.planHash}.json`), JSON.stringify(result, null, 2)+"\n"); return result;
  } finally { if (browser) await browser.close(); server.closeAllConnections(); await new Promise((done) => server.close(done)); }
}
if (process.argv[1]?.endsWith("dev-browser-check.mjs")) {
  try { const payload = JSON.parse(readFileSync(0, "utf8")); console.log(JSON.stringify(await checkDevelopmentBrowser(payload.root, payload.plan))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
