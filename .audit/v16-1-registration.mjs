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
assert.ok(executablePath, "Chrome or Edge is required for V16.1 Playwright QA");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
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

await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath, headless: true });

try {
  const context = await browser.newContext({ locale: "vi-VN", reducedMotion: "reduce" });
  await context.addInitScript(() => localStorage.setItem("bienedu:selected-grade:v1", "12"));
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") runtimeErrors.push(message.text()); });

  const viewports = [
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 }
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(`${origin}/contact.html?grade=12`, { waitUntil: "networkidle" });

    const state = await page.evaluate(async () => {
      const localLinks = [...document.querySelectorAll('a[href]:not([href^="#"])')]
        .map((link) => new URL(link.href))
        .filter((url) => url.origin === location.origin);
      const responses = await Promise.all(localLinks.map(async (url) => ({ url: url.pathname, status: (await fetch(url.href)).status })));
      return {
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).length,
        cardCount: document.querySelectorAll(".learning-format-card").length,
        stepCount: document.querySelectorAll(".registration-guide__steps li").length,
        formCount: document.querySelectorAll("[data-registration-form]").length,
        columns: getComputedStyle(document.querySelector(".learning-options__grid")).gridTemplateColumns.split(" ").length,
        hasTutorProfile: Boolean(document.querySelector(".tutor-profile, .tutor-profile__portrait")),
        hasTutorName: document.body.textContent.includes("Trần Thanh Tùng"),
        localLinkFailures: responses.filter((response) => response.status !== 200)
      };
    });

    assert.equal(state.horizontalOverflow, false, `no page overflow at ${viewport.width}x${viewport.height}`);
    assert.equal(state.brokenImages, 0, `no broken images at ${viewport.width}x${viewport.height}`);
    assert.equal(state.cardCount, 2, "Online and direct-learning cards render");
    assert.equal(state.stepCount, 3, "three registration steps render");
    assert.equal(state.formCount, 1, "the existing form is reused once");
    assert.equal(state.columns, viewport.width <= 760 ? 1 : 2, `card grid responds at ${viewport.width}x${viewport.height}`);
    assert.equal(state.hasTutorProfile, false, "personal profile UI is removed");
    assert.equal(state.hasTutorName, false, "personal profile copy is removed");
    assert.deepEqual(state.localLinkFailures, [], `local navigation works at ${viewport.width}x${viewport.height}`);

    if (viewport.width === 390) {
      await page.locator("body").click({ position: { x: 380, y: 400 } });
      await page.screenshot({ path: ".audit/v16-1-registration-mobile.jpg", quality: 88, fullPage: true });
    }
    if (viewport.width === 1440) {
      await page.locator("body").click({ position: { x: 1400, y: 600 } });
      await page.screenshot({ path: ".audit/v16-1-registration-desktop.jpg", quality: 88, fullPage: true });
    }
  }

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${origin}/course.html?grade=12`, { waitUntil: "networkidle" });
  await page.locator("[data-registration-link]").click();
  await page.waitForURL(/contact\.html\?grade=12#registration$/);
  await page.locator("#registration").waitFor();
  assert.ok(await page.locator("#registration").evaluate((element) => element.getBoundingClientRect().top < 140), "course CTA lands at the registration section");

  await page.goto(`${origin}/contact.html?grade=12`, { waitUntil: "networkidle" });
  await page.locator('[data-format-select="Online"]').click();
  assert.equal(await page.locator('select[name="format"]').inputValue(), "Online", "Online CTA preselects Online");
  await page.locator('[data-format-select="Trực tiếp"]').click();
  assert.equal(await page.locator('select[name="format"]').inputValue(), "Trực tiếp", "direct CTA preselects direct learning");
  assert.equal(await page.locator('select[name="grade"]').inputValue(), "12", "selected grade becomes the form default");
  assert.equal(await page.locator("[data-registration-submit]").isDisabled(), true, "unconfigured delivery remains disabled");
  assert.equal(await page.locator(".registration-contact .zalo-button").getAttribute("href"), "https://zalo.me/0943943151");
  assert.match(await page.locator(".registration-contact .zalo-button").getAttribute("rel"), /noopener/);
  assert.deepEqual(runtimeErrors, [], `no browser runtime errors (${runtimeErrors.join(" | ")})`);

  console.log("V16.1 Playwright QA passed: 7 viewports, learning-format preselection, verified Zalo, local links, responsive layout and zero runtime errors.");
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
