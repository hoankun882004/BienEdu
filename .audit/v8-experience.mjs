import assert from "node:assert/strict";
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { Browser, sleep } from "../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs";

const root = resolve(".");
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".pdf": "application/pdf", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf" };
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

async function open(page, route, settleMs = 320) {
  await page.goto(`${origin}${route}`, { timeoutMs: 30000, settleMs });
}

try {
  const page = await browser.newPage({ width: 390, height: 844, dsf: 1, mobile: true });

  await open(page, "/?grade=12");
  await page.eval("localStorage.clear()");
  await open(page, "/");
  assert.equal(await page.eval("document.querySelector('[data-grade-dialog]').open"), true, "first visit requires a grade choice");
  assert.equal(await page.eval("location.search"), "", "the grade entry URL stays clean before selection");
  assert.equal(await page.eval("document.querySelector('[data-grade-dialog]').dataset.required"), "true");
  assert.deepEqual(await page.eval("[...document.querySelectorAll('[data-grade-choice]')].map((button) => button.dataset.gradeChoice)"), ["9", "10", "11", "12"]);
  assert.equal(await page.eval("document.querySelector('[data-grade-dialog-title], #grade-dialog-title').textContent"), "Em đang học lớp mấy nhỉ?");
  assert.equal(await page.eval("document.querySelector('[data-grade-continue]').disabled"), true);
  assert.equal(await page.eval("document.querySelector('[data-grade-dialog]').textContent.includes('Nội dung đang cập nhật')"), false, "the profile chooser stays intentionally simple");
  assert.equal(await page.eval("document.body.dataset.grade ?? null"), null, "Grade 12 must not be assumed before selection");
  await page.screenshot({ path: join(tmpdir(), "bienedu-v8-grade-dialog-mobile.jpg"), quality: 88 });

  await page.eval("document.querySelector('[data-grade-choice=\"12\"]').click()");
  assert.equal(await page.eval("document.querySelector('[data-grade-dialog]').open"), true, "choosing a grade waits for explicit confirmation");
  await page.eval("document.querySelector('[data-grade-continue]').click()");
  await sleep(120);
  assert.equal(await page.eval("localStorage.getItem('bienedu:selected-grade:v1')"), "12");
  assert.equal(await page.eval("document.body.dataset.grade"), "12");
  assert.equal(await page.eval("document.querySelector('[data-grade-dialog]').open"), false);
  assert.equal(await page.eval("new URLSearchParams(location.search).get('grade')"), "12");
  await open(page, "/");
  assert.equal(await page.eval("document.querySelector('[data-grade-dialog]').open"), false, "the stored grade skips onboarding after the first visit");
  assert.equal(await page.eval("document.body.dataset.grade"), "12");
  await open(page, "/?grade=12");
  assert.equal(await page.eval("document.querySelector('[data-grade-dialog]').open"), false, "a grade-aware URL opens its content directly");
  assert.equal(await page.eval("document.body.dataset.grade"), "12");

  await page.eval("document.querySelector('.grade-switcher').click()");
  await page.eval("document.querySelector('[data-grade-choice=\"10\"]').click()");
  await page.eval("document.querySelector('[data-grade-continue]').click()");
  await sleep(100);
  assert.equal(await page.eval("localStorage.getItem('bienedu:selected-grade:v1')"), "10", "the shared switcher changes grade later");

  for (const grade of ["9", "10", "11"]) {
    await open(page, `/?grade=${grade}`);
    assert.equal(await page.eval("document.body.dataset.grade"), grade);
    assert.deepEqual(
      await page.eval("[...document.querySelectorAll('.site-nav a')].map((link) => link.textContent.trim())"),
      ["Khóa học", "Lộ trình", "Luyện đề", "Đăng ký học"],
      `Grade ${grade} uses the shared navigation labels`
    );
    assert.equal(await page.eval("document.querySelector('[data-home-grade-title]').textContent"), `Học Toán ${grade}`);
    assert.equal(await page.eval("document.querySelector('[data-home-grade-empty]').hidden"), false);
    assert.equal(await page.eval("document.querySelector('[data-home-overview-title]').textContent.trim().length > 0"), true);
    assert.equal(await page.eval("new URL(document.querySelector('[data-home-grade-actions] a').href).searchParams.get('grade')"), grade);
    assert.equal(await page.eval("[...document.querySelectorAll('[data-grade-12-only]')].every((element) => element.hidden)"), true);
    assert.equal(await page.eval("document.body.textContent.includes('CD20')"), false, `Grade ${grade} home must not expose Grade 12 curriculum`);
    if (grade === "9") await page.screenshot({ path: join(tmpdir(), "bienedu-v8-grade9-home.jpg"), quality: 86 });

    await open(page, `/course.html?grade=${grade}`);
    assert.equal(await page.eval("document.querySelector('.grade-empty-state') !== null"), false, `Grade ${grade} course uses the complete course layout`);
    assert.equal(await page.eval("document.querySelector('[data-course-title]').textContent"), `Khóa học Toán ${grade}`);
    assert.equal(await page.eval("document.querySelector('[data-course-audience]').textContent.includes('lớp ' + document.body.dataset.grade)"), true);
    assert.equal(await page.eval("new URL(document.querySelector('[data-course-curriculum-link]').href).searchParams.get('grade')"), grade);
    assert.equal(await page.eval("document.body.textContent.includes('CD20')"), false, `Grade ${grade} course must not leak Grade 12 curriculum`);
    if (grade === "9") await page.screenshot({ path: join(tmpdir(), "bienedu-v8-grade9-course.jpg"), quality: 86 });

    const curriculumRoute = `/documents.html?grade=${grade}`;
    await open(page, curriculumRoute);
    assert.equal(await page.eval("document.querySelector('.grade-empty-state') !== null"), true, `${curriculumRoute} must show an honest empty state`);
    assert.equal(await page.eval("document.body.textContent.includes('CD20')"), false, `${curriculumRoute} must not leak Grade 12 content`);
    if (grade === "9") await page.screenshot({ path: join(tmpdir(), "bienedu-v8-grade9-documents.jpg"), quality: 86 });

    const practiceRoute = `/quiz.html?grade=${grade}`;
    await open(page, practiceRoute);
    assert.equal(await page.eval("document.querySelector('.practice-paper-empty') !== null"), true, `${practiceRoute} must show the practice-paper shell`);
    assert.equal(await page.eval("document.querySelector('.grade-empty-state')"), null, `${practiceRoute} must use the shared practice-paper base`);
    assert.equal(await page.eval("document.querySelectorAll('.practice-paper-item').length"), 0, `${practiceRoute} must not fabricate papers`);
    assert.equal(await page.eval("document.querySelector('[data-practice-page-title]').textContent"), `Luyện đề Toán ${grade}`);
    assert.equal(await page.eval("[...document.querySelectorAll('.site-nav a')].some((link) => link.textContent === 'Luyện đề')"), true);
    if (grade === "9") await page.screenshot({ path: join(tmpdir(), "bienedu-v8-grade9-practice-papers.jpg"), quality: 86 });
  }

  await open(page, "/quiz.html?grade=12");
  assert.equal(await page.eval("document.querySelector('.practice-paper-empty') !== null"), true);
  assert.equal(await page.eval("document.querySelectorAll('.practice-paper-item').length"), 0, "Grade 12 must also remain an honest empty practice-paper shell");
  assert.equal(await page.eval("document.querySelector('.site-nav [aria-current=\"page\"]').textContent.trim()"), "Luyện đề");
  assert.equal(await page.eval("[...document.querySelectorAll('.site-nav a')].some((link) => link.textContent.trim() === 'Kiểm tra')"), false);

  await open(page, "/contact.html?grade=12");
  assert.equal(await page.eval("document.querySelector('.site-nav [aria-current=\"page\"]').textContent.trim()"), "Đăng ký học");
  assert.equal(await page.eval("document.querySelector('.tutor-profile h1').textContent.trim()"), "Thầy Trần Thanh Tùng");
  assert.equal(await page.eval("new URL(document.querySelector('.tutor-profile .zalo-button').href).hostname"), "zalo.me");
  assert.equal(await page.eval("document.querySelector('[data-registration-form] select[name=grade]').value"), "12");

  await open(page, "/?grade=12");
  await page.eval("window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })");
  await page.eval("document.querySelector('.grade-switcher').click()");
  await page.eval("document.querySelector('[data-grade-choice=\"9\"]').click()");
  await page.eval("document.querySelector('[data-grade-continue]').click()");
  await sleep(120);
  assert.ok(await page.eval("window.scrollY <= 1"), "changing grade on the home page returns to the complete hero");

  await open(page, "/?grade=12");
  await page.eval("localStorage.setItem('bienedu:progress:v2:grade12', JSON.stringify({ version: 2, lessons: { marker: { viewedKnowledge: ['kept'], viewedExamples: [], practiceAnswers: {} } }, exams: {} }))");
  await open(page, "/?grade=10");
  await open(page, "/?grade=12");
  assert.equal(await page.eval("JSON.parse(localStorage.getItem('bienedu:progress:v2:grade12')).lessons.marker.viewedKnowledge[0]"), "kept", "Grade 12 progress survives grade switching");

  await page.eval("localStorage.removeItem('bienedu:selected-grade:v1')");
  await open(page, "/documents.html?topic=CD20&type=20.1&section=knowledge&item=1");
  assert.equal(await page.eval("new URLSearchParams(location.search).get('grade')"), "12", "legacy deep links resolve to Grade 12");
  assert.equal(await page.eval("document.querySelector('[data-grade-dialog]').open"), false);

  await page.eval(`(() => {
    window.__bieneduDocumentSentinel = 'alive';
    const workspace = document.querySelector('.learning-workspace');
    workspace.dataset.shellSentinel = 'alive';
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
  })()`);
  const beforeTransition = await page.eval("window.scrollY");
  assert.ok(beforeTransition > 0, "mobile lesson should be scrollable before advancing");
  await page.eval("document.querySelector('.lesson-navigation .nav-button--primary').click()");
  await sleep(380);
  const firstTransition = await page.eval(`(() => {
    const stage = document.querySelector('[data-lesson-stage]').getBoundingClientRect();
    const phase = document.querySelector('.workspace-phase-nav').getBoundingClientRect();
    return {
      section: new URLSearchParams(location.search).get('section'),
      item: new URLSearchParams(location.search).get('item'),
      documentAlive: window.__bieneduDocumentSentinel,
      shellAlive: document.querySelector('.learning-workspace').dataset.shellSentinel,
      scrollY: window.scrollY,
      stageTop: stage.top,
      phaseBottom: phase.bottom
    };
  })()`);
  assert.deepEqual([firstTransition.section, firstTransition.item], ["example", "1"]);
  assert.equal(firstTransition.documentAlive, "alive", "lesson navigation must not reload the document");
  assert.equal(firstTransition.shellAlive, "alive", "lesson navigation must preserve the workspace shell");
  assert.ok(firstTransition.scrollY > 0, "lesson navigation must not jump to the global page top");
  assert.ok(firstTransition.stageTop >= firstTransition.phaseBottom - 2, "new content begins below the sticky lesson tabs");
  await page.screenshot({ path: join(tmpdir(), "bienedu-v8-lesson-mobile.jpg"), quality: 88 });

  await page.eval(`(() => {
    const next = document.querySelector('.lesson-navigation button:last-child');
    next.click();
    next.click();
  })()`);
  await sleep(380);
  assert.equal(await page.eval("new URLSearchParams(location.search).get('section')"), "example");
  assert.equal(await page.eval("new URLSearchParams(location.search).get('item')"), "2", "rapid taps advance exactly one step");

  await page.eval("history.back()");
  await sleep(380);
  assert.equal(await page.eval("new URLSearchParams(location.search).get('section')"), "example");
  assert.equal(await page.eval("new URLSearchParams(location.search).get('item')"), "1", "first Back returns to Example 1");
  await page.eval("history.back()");
  await sleep(380);
  assert.equal(await page.eval("new URLSearchParams(location.search).get('section')"), "knowledge", "second Back returns to Knowledge");
  await page.eval("history.forward()");
  await sleep(380);
  await page.eval("history.forward()");
  await sleep(380);

  await page.eval("document.querySelector('.lesson-navigation button:last-child').click()");
  await sleep(380);
  assert.equal(await page.eval("new URLSearchParams(location.search).get('section')"), "practice");
  assert.equal(await page.eval("new URLSearchParams(location.search).get('item')"), "1");
  await page.eval("history.back()");
  await sleep(380);
  assert.equal(await page.eval("new URLSearchParams(location.search).get('section')"), "example", "browser Back restores the previous lesson stage");
  assert.equal(await page.eval("new URLSearchParams(location.search).get('item')"), "2");

  const sizes = [
    { width: 360, height: 800, mobile: true }, { width: 375, height: 812, mobile: true },
    { width: 390, height: 844, mobile: true }, { width: 393, height: 852, mobile: true },
    { width: 414, height: 896, mobile: true }, { width: 430, height: 932, mobile: true },
    { width: 768, height: 1024, mobile: false }, { width: 1024, height: 768, mobile: false },
    { width: 1280, height: 720, mobile: false }, { width: 1440, height: 900, mobile: false },
    { width: 1920, height: 1080, mobile: false }
  ];
  for (const size of sizes) {
    await page.setViewport(size);
    await open(page, "/documents.html?grade=12&topic=CD20&type=20.1&section=example&item=1", 220);
    const health = await page.eval(`(() => ({
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      phaseVisible: getComputedStyle(document.querySelector('.workspace-phase-nav')).display !== 'none',
      bottomNavHeight: Math.round(document.querySelector('.lesson-navigation').getBoundingClientRect().height),
      brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).length
    }))()`);
    assert.equal(health.horizontalOverflow, false, `no horizontal overflow at ${size.width}x${size.height}`);
    assert.equal(health.brokenImages, 0, `no broken images at ${size.width}x${size.height}`);
    assert.ok(health.bottomNavHeight >= 48, `bottom navigation remains usable at ${size.width}x${size.height}`);
    assert.equal(health.phaseVisible, size.width <= 1120, `lesson tabs visibility at ${size.width}px`);

    await page.eval("document.querySelector('.grade-switcher').click()");
    await sleep(30);
    const modal = await page.eval(`(() => {
      const dialog = document.querySelector('[data-grade-dialog]').getBoundingClientRect();
      const targets = [...document.querySelectorAll('[data-grade-choice]')].map((button) => button.getBoundingClientRect().height);
      return { open: document.querySelector('[data-grade-dialog]').open, top: dialog.top, left: dialog.left, right: dialog.right, bottom: dialog.bottom, minTarget: Math.min(...targets) };
    })()`);
    assert.equal(modal.open, true, `grade dialog opens at ${size.width}x${size.height}`);
    assert.ok(modal.top >= -1 && modal.left >= -1 && modal.right <= size.width + 1 && modal.bottom <= size.height + 1, `grade dialog fits ${size.width}x${size.height}`);
    assert.ok(modal.minTarget >= 44, `grade choices remain touchable at ${size.width}x${size.height}`);
    await page.eval("document.querySelector('[data-grade-dialog-close]').click()");
  }

  await page.setViewport({ width: 1440, height: 900, mobile: false });
  await open(page, "/?grade=12", 220);
  await page.eval("document.querySelector('.grade-switcher').click()");
  await sleep(80);
  await page.screenshot({ path: join(tmpdir(), "bienedu-v8-grade-dialog-desktop.jpg"), quality: 88 });

  console.log("UX V8 passed: required Grade 9–12 choice, honest Grade 9/10/11 states, preserved Grade 12 progress, legacy URLs, stable mobile lesson shell, Back history, rapid-tap guard and 11 viewport checks.");
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
