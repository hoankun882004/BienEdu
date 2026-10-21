import assert from "node:assert/strict";
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { Browser, sleep } from "../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs";

const root = resolve(".");
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".webp": "image/webp", ".pdf": "application/pdf" };
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

async function open(page, route, settleMs = 220) {
  await page.goto(`${origin}${route}`, { timeoutMs: 30000, settleMs });
  await page.eval(`(() => {
    const style = document.createElement('style');
    style.textContent = '* { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; } .js [data-reveal], .home-motion-enabled [data-home-reveal], .js .home-hero__copy > p, .js .tutor-hero__copy > p, .js .hero-actions { opacity: 1 !important; transform: none !important; } .js .shutter { clip-path: inset(0) !important; } .js .shutter img, .js .lines [data-line] { transform: none !important; }';
    document.head.append(style);
    document.querySelectorAll('[data-reveal]').forEach((element) => element.classList.add('is-in'));
    document.querySelectorAll('[data-home-reveal]').forEach((element) => element.classList.add('is-visible'));
  })()`);
}

try {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1, mobile: false });

  await open(page, "/index.html?grade=12", 350);
  assert.equal(await page.eval("location.pathname"), "/", "/index.html must redirect to the canonical root");
  assert.equal(await page.eval("new URL(document.querySelector('.site-nav a').href).searchParams.get('grade')"), "12");
  assert.equal(await page.eval("document.querySelectorAll('.footer-grid nav a').length"), 4);
  assert.equal(await page.eval("document.querySelector('.study-rhythm') !== null"), true, "home must keep the concise study rhythm");
  assert.equal(await page.eval("document.querySelector('.study-rhythm__note')"), null, "home must remove the no-account note");
  assert.equal(await page.eval("document.querySelector('.topic-catalogue, .quiz-preview, .learning-path, .contact-cta')"), null, "home must stop after the concise study rhythm");

  await open(page, "/course.html?grade=12", 350);
  assert.equal(await page.eval("document.querySelector('.course-program, .course-method, .registration-cta')"), null, "course page must stop after the learning goals");
  await page.eval("document.querySelector('[data-registration-open]').click()");
  assert.equal(await page.eval("document.querySelector('[data-registration-dialog]').open"), true, "registration guidance must open on demand");
  assert.equal(await page.eval("document.querySelector('[data-registration-dialog] .zalo-button').href.includes('zalo.me/0943943151')"), true);
  assert.equal(await page.eval("document.querySelector('[data-registration-dialog] .text-link, [data-registration-dialog] .registration-dialog__note')"), null, "registration guidance must not repeat the roadmap link or channel note");
  await page.screenshot({ path: ".audit/polish-after-registration-modal-1440.jpg", quality: 86 });
  await page.eval("document.querySelector('[data-registration-dialog]').close()");

  await open(page, "/documents.html?grade=12", 400);
  assert.equal(await page.eval("document.querySelector('[data-curriculum-group] option').textContent"), "Tất cả nhóm kiến thức");
  assert.equal(await page.eval("document.querySelectorAll('.roadmap-topic.is-ready').length"), 5);
  assert.equal(await page.eval("document.querySelectorAll('.roadmap-topic.is-source').length"), 0);
  assert.equal(await page.eval("document.querySelectorAll('.roadmap-topic.is-pending').length"), 34);
  assert.equal(await page.eval("document.querySelector('[data-curriculum-status]').textContent.replace(/\\s+/g, ' ').trim()"), "Đang hiển thị 39 chuyên đề");

  await open(page, "/contact.html?grade=12", 350);
  assert.deepEqual(await page.eval("[...document.querySelectorAll('.site-nav a')].map((link) => link.textContent.trim())"), ["Khóa học", "Lộ trình", "Luyện đề", "Đăng ký học"]);
  assert.equal(await page.eval("document.querySelector('.tutor-hero h1').textContent.replace(/\\s+/g, ' ').trim()"), "Đăng ký học");
  assert.equal(await page.eval("document.querySelectorAll('.teaching-band__action').length"), 0, "contact methods must not repeat large action buttons");
  assert.equal(await page.eval("document.querySelectorAll('.zalo-chat-bubble').length"), 1, "contact page must expose one floating Zalo bubble");
  assert.equal(await page.eval("document.querySelector('.zalo-chat-bubble').href.includes('zalo.me/0943943151')"), true);
  assert.equal(await page.eval("getComputedStyle(document.querySelector('.zalo-chat-bubble')).position"), "fixed");
  assert.equal(await page.eval("document.querySelectorAll('.study-gallery').length"), 0, "internal tutor page must not repeat the large collage");

  await open(page, "/quiz.html?grade=12", 300);
  assert.equal(await page.eval("document.querySelectorAll('.study-gallery').length"), 0, "practice-paper page must stay focused");
  assert.equal(await page.eval("document.querySelector('[data-practice-page-title]').textContent"), "Luyện đề Toán 12");
  assert.equal(await page.eval("document.querySelector('.practice-paper-empty') !== null"), true);
  assert.equal(await page.eval("document.querySelectorAll('.practice-paper-item').length"), 0, "practice-paper page must not fabricate content");
  assert.equal(await page.eval("document.querySelector('.practice-paper-empty').textContent.includes('đang được cập nhật')"), true);
  assert.equal(await page.eval("document.querySelector('.practice-paper-empty__actions a').textContent"), "Quay lại lộ trình");
  await page.screenshot({ path: ".audit/polish-after-practice-papers-1440.jpg", quality: 84, fullPage: true });

  const desktopPages = [["/", "home"], ["/course.html", "course"], ["/documents.html", "roadmap"], ["/quiz.html", "quiz"], ["/contact.html", "contact"]];
  await page.setViewport({ width: 1440, height: 900, mobile: false });
  for (const [route, name] of desktopPages) {
    await open(page, route, 260);
    const pageHealth = await page.eval(`(() => ({
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).length,
      footerLinks: document.querySelectorAll('.footer-grid nav a').length
    }))()`);
    assert.equal(pageHealth.horizontalOverflow, false, `${name} must not overflow at 1440px`);
    assert.equal(pageHealth.brokenImages, 0, `${name} must not contain broken images`);
    assert.equal(pageHealth.footerLinks, 4, `${name} footer navigation must remain complete`);
    await page.screenshot({ path: `.audit/polish-after-${name}-1440.jpg`, quality: 82, fullPage: true });
  }

  const sizes = [
    { width: 360, height: 800, mobile: true },
    { width: 375, height: 812, mobile: true },
    { width: 390, height: 844, mobile: true },
    { width: 414, height: 896, mobile: true },
    { width: 430, height: 932, mobile: true },
    { width: 768, height: 1024, mobile: false },
    { width: 1024, height: 768, mobile: false },
    { width: 1280, height: 720, mobile: false },
    { width: 1440, height: 900, mobile: false },
    { width: 1920, height: 1080, mobile: false }
  ];
  for (const size of sizes) {
    await page.setViewport(size);
    for (const route of ["/", "/course.html", "/documents.html", "/quiz.html", "/contact.html"]) {
      await open(page, route, 160);
      const health = await page.eval(`(() => ({
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        navPresent: document.querySelectorAll('.site-nav a').length === 4,
        footerPresent: document.querySelectorAll('.footer-grid nav a').length === 4
      }))()`);
      assert.equal(health.horizontalOverflow, false, `${route} horizontal overflow at ${size.width}x${size.height}`);
      assert.equal(health.navPresent, true, `${route} navigation missing at ${size.width}x${size.height}`);
      assert.equal(health.footerPresent, true, `${route} footer missing at ${size.width}x${size.height}`);
    }
  }

  await page.setViewport({ width: 390, height: 844, mobile: true });
  for (const [route, name] of [["/", "home"], ["/course.html", "course"], ["/documents.html", "roadmap"], ["/quiz.html?grade=12", "practice-papers"], ["/contact.html", "contact"]]) {
    await open(page, route, 240);
    await page.screenshot({ path: `.audit/polish-after-${name}-390.jpg`, quality: 82, fullPage: true });
  }
  await open(page, "/course.html?grade=12&register=online", 240);
  assert.equal(await page.eval("document.querySelector('[data-registration-dialog]').open"), true);
  assert.equal(await page.eval("document.documentElement.scrollWidth > window.innerWidth + 1"), false, "registration dialog must fit at 390px");
  await page.screenshot({ path: ".audit/polish-after-registration-modal-390.jpg", quality: 84 });

  console.log("Polish pass checks passed: concise home and course pages, registration dialog, clear roadmap states, honest practice-paper shell, tutor CTAs, and no horizontal overflow across 10 viewports.");
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
