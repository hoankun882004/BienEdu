import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import assert from "node:assert/strict";
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
  } catch { response.writeHead(404); response.end("not found"); }
});

await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await Browser.launch();

try {
  const page = await browser.newPage({ width: 390, height: 844, dsf: 1, mobile: true });
  await page.goto(`${origin}/documents.html`, { timeoutMs: 30000, settleMs: 500 });
  await page.eval("localStorage.removeItem('bienedu.learning.v2')");
  await page.goto(`${origin}/documents.html`, { timeoutMs: 30000, settleMs: 350 });

  assert.equal(await page.eval("document.querySelectorAll('.roadmap-topic').length"), 39);
  assert.equal(await page.eval("document.querySelector('[data-curriculum-status]').textContent.replace(/\\s+/g, ' ').trim()"), "Đang hiển thị 39 chuyên đề");
  await page.eval(`(() => { const input = document.querySelector('[data-curriculum-search]'); input.value = '20.1'; input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  assert.equal(await page.eval("document.querySelectorAll('.roadmap-topic').length"), 1);
  assert.equal(await page.eval("document.querySelector('.roadmap-topic__code').textContent"), "CD20");

  await page.goto(`${origin}/documents.html?topic=CD20`, { timeoutMs: 30000, settleMs: 350 });
  assert.equal(await page.eval("document.querySelectorAll('.type-list a').length"), 17);
  assert.ok(await page.eval("document.querySelector('.final-exam-card').classList.contains('is-locked')"));

  await page.goto(`${origin}/documents.html?topic=CD20&type=20.1&section=knowledge&item=1`, { timeoutMs: 30000, settleMs: 350 });
  assert.equal(await page.eval("document.querySelectorAll('.lesson-sidebar li').length"), 3);
  assert.equal(await page.eval("document.querySelector('.knowledge-reader h2').textContent"), "Quy tắc cộng");
  assert.equal(await page.eval("document.querySelector('.knowledge-reader__formulae strong').textContent"), "N = n₁ + n₂ + … + nₖ");
  assert.equal(await page.eval("document.querySelector('.knowledge-stage img')"), null);
  assert.equal(await page.eval("document.querySelector('.lesson-progress strong').textContent"), "17%");
  assert.equal(await page.eval("document.body.textContent.includes('Đọc trước')"), false);

  await page.goto(`${origin}/documents.html?topic=CD20&type=20.8&section=knowledge&item=1`, { timeoutMs: 30000, settleMs: 300 });
  assert.equal(await page.eval("document.querySelectorAll('.source-slide-pager a').length"), 0);
  assert.equal(await page.eval("document.querySelector('.lesson-sidebar li:first-child small').textContent"), "1/1 bài đọc");
  assert.equal(await page.eval("document.querySelectorAll('.knowledge-reader__formulae dl > div').length"), 4);
  assert.equal(await page.eval("document.querySelector('.lesson-navigation').textContent.includes('Tiếp theo')"), false);

  await page.goto(`${origin}/documents.html?topic=CD20&type=20.1&section=example&item=1`, { timeoutMs: 30000, settleMs: 300 });
  assert.equal(await page.eval("document.querySelector('.example-reader h2').textContent"), "Quên làm bài tập");
  assert.equal(await page.eval("document.querySelector('.example-reader__result strong').textContent"), "Có 8 cách chọn lý do.");
  assert.equal(await page.eval("document.querySelector('.example-stage img')"), null);
  assert.equal(await page.eval("document.body.textContent.includes('Ví dụ 1/2')"), true);

  await page.goto(`${origin}/documents.html?topic=CD20&type=20.8&section=example&item=1`, { timeoutMs: 30000, settleMs: 300 });
  assert.equal(await page.eval("document.querySelector('.example-reader h2').textContent"), "Chia kẹo cho bốn bạn");
  assert.equal(await page.eval("document.querySelector('.example-reader__question').getAttribute('aria-label')"), "Đề bài");
  assert.equal(await page.eval("document.querySelector('.example-reader__question p').textContent.includes('10 viên kẹo')"), true);
  assert.equal(await page.eval("document.querySelectorAll('.example-reader__solution li').length"), 4);
  assert.equal(await page.eval("document.documentElement.scrollWidth > window.innerWidth + 1"), false, "20.8 example must not overflow on mobile");
  await page.screenshot({ path: ".audit/v66-20-8-example-390.jpg", quality: 88 });
  assert.equal(await page.eval("document.querySelector('.lesson-navigation button:last-child').textContent.trim()"), "Làm bài tập →");
  await page.eval("document.querySelector('.lesson-navigation button:last-child').click()");
  await sleep(120);
  assert.equal(await page.eval("new URLSearchParams(location.search).get('section')"), "practice");
  assert.equal(await page.eval("new URLSearchParams(location.search).get('item')"), "1");
  assert.equal(await page.eval("document.querySelector('.practice-stage') !== null"), true, "20.8 example must advance to practice question 1");

  await page.goto(`${origin}/documents.html?topic=CD20&type=20.1&section=practice&item=1`, { timeoutMs: 30000, settleMs: 300 });
  await page.eval("document.querySelector('[data-practice-answer]').click()");
  assert.equal(await page.eval("document.querySelector('.practice-feedback') !== null"), true);
  assert.equal(await page.eval("[...document.querySelectorAll('[data-practice-answer]')].every((button) => button.disabled)"), true);
  await page.goto(`${origin}/documents.html?topic=CD20&type=20.1&section=practice&item=1`, { timeoutMs: 30000, settleMs: 250 });
  assert.equal(await page.eval("document.querySelector('.practice-feedback') !== null"), true, "practice answer persists");

  await page.goto(`${origin}/documents.html?topic=CD20&type=20.1&section=practice&item=3`, { timeoutMs: 30000, settleMs: 250 });
  assert.equal(await page.eval("document.querySelector('.lesson-navigation a').textContent.trim()"), "Hoàn thành →");
  await page.eval("document.querySelector('.lesson-navigation a').click()");
  await sleep(120);
  assert.equal(await page.eval("new URLSearchParams(location.search).get('topic')"), "CD20");
  assert.equal(await page.eval("new URLSearchParams(location.search).has('type')"), false);
  assert.equal(await page.eval("document.querySelector('.topic-detail') !== null"), true);

  const completionState = await page.eval(`(async () => {
    const curriculum = await import('/assets/js/data/curriculum.js');
    const slides = await import('/assets/js/data/knowledge-slides.js');
    const topic = curriculum.curriculumTopics.find((item) => item.id === 'CD20');
    const lessons = {};
    for (const exercise of topic.exerciseTypes) lessons[exercise.code] = {
      viewedKnowledge: [slides.knowledgeSections[exercise.code].knowledgeSlides[0].id],
      viewedExamples: slides.knowledgeSections[exercise.code].exampleSlides.map((slide) => slide.id),
      practiceAnswers: { a: { selectedIndex: 0 }, b: { selectedIndex: 0 }, c: { selectedIndex: 0 } }
    };
    return JSON.stringify({ version: 2, lessons, exams: {} });
  })()`);
  await page.eval(`localStorage.setItem('bienedu.learning.v2', ${JSON.stringify(completionState)})`);
  await page.goto(`${origin}/documents.html?topic=CD20`, { timeoutMs: 30000, settleMs: 350 });
  assert.ok(await page.eval("document.querySelector('.final-exam-card').classList.contains('is-unlocked')"));

  await page.goto(`${origin}/documents.html?topic=CD20&exam=final&question=1`, { timeoutMs: 30000, settleMs: 350 });
  assert.equal(await page.eval("document.querySelectorAll('.exam-navigator a').length"), 20);
  assert.equal(await page.eval("document.querySelector('.practice-feedback')"), null);
  assert.equal(await page.eval("document.body.textContent.includes('Đáp án đúng')"), false);
  await page.eval("document.querySelector('[data-exam-answer=\"0\"]').click()");
  assert.equal(await page.eval("document.querySelector('.practice-feedback')"), null, "exam must not reveal correctness before submit");

  await page.eval(`(() => { const value = JSON.parse(localStorage.getItem('bienedu.learning.v2')); value.exams.CD20 = { answers: Object.fromEntries(Array.from({length: 20}, (_, index) => [index, 0])), submitted: false }; localStorage.setItem('bienedu.learning.v2', JSON.stringify(value)); })()`);
  await page.goto(`${origin}/documents.html?topic=CD20&exam=final&question=20`, { timeoutMs: 30000, settleMs: 300 });
  assert.equal(await page.eval("document.querySelector('[data-action=\"request-submit\"]').disabled"), false);
  await page.eval("document.querySelector('[data-action=\"request-submit\"]').click()");
  assert.equal(await page.eval("document.querySelector('.exam-confirm') !== null"), true);
  await page.eval("document.querySelector('[data-action=\"confirm-submit\"]').click()");
  await sleep(150);
  assert.equal(await page.eval("document.querySelector('.exam-result') !== null"), true);
  assert.equal(await page.eval("document.querySelector('.practice-feedback') !== null"), true);

  const sizes = [
    { width: 375, height: 812, mobile: true }, { width: 390, height: 844, mobile: true },
    { width: 768, height: 900, mobile: false }, { width: 1024, height: 768, mobile: false },
    { width: 1280, height: 800, mobile: false }, { width: 1440, height: 900, mobile: false },
    { width: 1920, height: 1080, mobile: false }
  ];
  for (const size of sizes) {
    await page.setViewport(size);
    await page.goto(`${origin}/documents.html?topic=CD21&type=21.8&section=knowledge&item=1`, { timeoutMs: 30000, settleMs: 220 });
    const layout = await page.eval(`(() => { const stage = document.querySelector('.lesson-content'); const image = document.querySelector('.knowledge-stage img'); const canvas = document.querySelector('.knowledge-stage__canvas'); const imageBox = image?.getBoundingClientRect(); const canvasBox = canvas?.getBoundingClientRect(); return { horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1, verticalOverflow: document.documentElement.scrollHeight > window.innerHeight + 1, stageOverflow: stage.scrollHeight > stage.clientHeight + 1, imageContained: !image || (imageBox.top >= canvasBox.top - 1 && imageBox.bottom <= canvasBox.bottom + 1), mobileNav: getComputedStyle(document.querySelector('.workspace-mobile-nav')).display !== 'none' }; })()`);
    assert.equal(layout.horizontalOverflow, false, `horizontal overflow at ${size.width}px`);
    if (size.width >= 1024) {
      assert.equal(layout.verticalOverflow, false, `desktop page scroll at ${size.width}px`);
      assert.equal(layout.stageOverflow, false, `desktop stage scroll at ${size.width}px`);
      assert.equal(layout.imageContained, true, `desktop source image clipped at ${size.width}px`);
    }
    if (size.width <= 768) assert.equal(layout.mobileNav, true, `mobile selector at ${size.width}px`);
    if ([390, 768, 1440].includes(size.width)) await page.screenshot({ path: `.audit/v6-workspace-${size.width}.jpg`, quality: 86 });
  }

  const desktopSizes = [{ width: 1024, height: 768 }, { width: 1280, height: 720 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 2048, height: 768 }];
  for (const size of desktopSizes) {
    await page.setViewport({ ...size, mobile: false });
    for (const route of ["topic=CD20&type=20.1&section=knowledge&item=1", "topic=CD20&type=20.8&section=knowledge&item=1", "topic=CD20&type=20.1&section=example&item=1", "topic=CD20&type=20.2&section=example&item=3", "topic=CD20&type=20.5&section=example&item=1", "topic=CD20&type=20.8&section=example&item=1", "topic=CD20&type=20.2&section=practice&item=1"]) {
      await page.goto(`${origin}/documents.html?${route}`, { timeoutMs: 30000, settleMs: 180 });
      const fitted = await page.eval(`(() => { const stage = document.querySelector('.lesson-content'); const image = document.querySelector('.knowledge-stage img'); const canvas = document.querySelector('.knowledge-stage__canvas'); const ib = image?.getBoundingClientRect(); const cb = canvas?.getBoundingClientRect(); return { page: document.documentElement.scrollHeight <= document.documentElement.clientHeight + 1, stage: stage.scrollHeight <= stage.clientHeight + 1, image: !image || (ib.top >= cb.top - 1 && ib.bottom <= cb.bottom + 1) }; })()`);
      assert.deepEqual(fitted, { page: true, stage: true, image: true }, `${size.width} ${route}`);
      if (route.includes("practice")) {
        await page.eval("document.querySelector('[data-practice-answer]').click()");
        const gradedFits = await page.eval(`(() => { const stage = document.querySelector('.lesson-content'); const feedback = document.querySelector('.practice-feedback'); return stage.scrollHeight <= stage.clientHeight + 1 && feedback.getBoundingClientRect().bottom <= stage.getBoundingClientRect().bottom + 1; })()`);
        assert.equal(gradedFits, true, `${size.width} graded practice`);
      }
    }
  }

  await page.setViewport({ width: 1440, height: 900, mobile: false });
  await page.goto(`${origin}/documents.html?topic=CD20&type=20.5&section=example&item=1`, { timeoutMs: 30000, settleMs: 180 });
  const compactExample = await page.eval(`(() => {
    const bar = document.querySelector('.example-reader__bar').getBoundingClientRect();
    const intro = document.querySelector('.example-reader__intro').getBoundingClientRect();
    const analysis = document.querySelector('.example-reader__analysis').getBoundingClientRect();
    const answer = document.querySelector('.example-reader__result').getBoundingClientRect();
    const solution = document.querySelector('.example-reader__solution').getBoundingClientRect();
    const takeaway = document.querySelector('.example-reader__takeaway').getBoundingClientRect();
    return {
      topGap: Math.round(intro.top - bar.bottom),
      leftGap: Math.round(answer.top - analysis.bottom),
      rightGap: Math.round(takeaway.top - solution.bottom),
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1
    };
  })()`);
  assert.ok(compactExample.topGap <= 24, `example top gap is ${compactExample.topGap}px`);
  assert.ok(compactExample.leftGap <= 16, `example left stack gap is ${compactExample.leftGap}px`);
  assert.ok(compactExample.rightGap <= 16, `example right stack gap is ${compactExample.rightGap}px`);
  assert.equal(compactExample.horizontalOverflow, false, "compact example must not overflow horizontally");

  for (const [route, filename] of [
    ["topic=CD20&type=20.1&section=knowledge&item=1", "v63-20-1-reading-1440.jpg"],
    ["topic=CD20&type=20.8&section=knowledge&item=1", "v63-20-8-reading-1440.jpg"],
    ["topic=CD20&type=20.2&section=example&item=3", "v66-20-2-example-1440.jpg"],
    ["topic=CD20&type=20.5&section=example&item=1", "v66-20-5-compact-1440.jpg"],
    ["topic=CD20&type=20.8&section=example&item=1", "v66-20-8-example-1440.jpg"],
    ["topic=CD20&type=20.1&section=practice&item=3", "v63-final-practice-1440.jpg"]
  ]) {
    await page.goto(`${origin}/documents.html?${route}`, { timeoutMs: 30000, settleMs: 180 });
    await page.screenshot({ path: `.audit/${filename}`, quality: 88 });
  }
  await page.setViewport({ width: 2048, height: 768, mobile: false });
  await page.goto(`${origin}/documents.html?topic=CD20&type=20.5&section=example&item=1`, { timeoutMs: 30000, settleMs: 180 });
  await page.screenshot({ path: ".audit/v66-20-5-compact-2048x768.jpg", quality: 88 });
  for (const route of ["topic=CD20&type=20.17&section=knowledge&item=1", "topic=CD20&type=20.17&section=example&item=1", "topic=CD21&type=21.1&section=example&item=1", "topic=CD21&type=21.8&section=knowledge&item=1", "topic=CD21&type=21.8&section=example&item=1"]) {
    await page.goto(`${origin}/documents.html?${route}`, { timeoutMs: 30000, settleMs: 180 });
    await page.screenshot({ path: `.audit/v61-edge-${route.match(/type=([^&]+)/)[1]}-${route.includes('example') ? 'example' : 'knowledge'}.jpg`, quality: 86 });
  }

  console.log("Browser interactions passed: structured knowledge and worked examples, fixed 20.8 practice transition, compact example stacks, topic completion route, persistent feedback, final exams, strict no-scroll desktop matrix (including 2048x768) and 7 responsive widths.");
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
