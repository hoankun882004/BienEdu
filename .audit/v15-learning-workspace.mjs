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

function lessonUrl(origin, topic, code, section, item = 1) {
  return `${origin}/documents.html?grade=12&topic=${topic}&type=${code}&section=${section}&item=${item}`;
}

async function openStage(page, url, selector) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.locator(selector).waitFor();
}

async function inspectWorkspace(page) {
  return page.evaluate(() => {
    const workspace = document.querySelector(".learning-workspace");
    const header = document.querySelector(".workspace-top");
    const stage = document.querySelector("[data-lesson-stage]");
    const footer = document.querySelector(".lesson-navigation");
    return {
      workspace: Boolean(workspace),
      headerHeight: header?.getBoundingClientRect().height ?? 0,
      hasPercentage: /\d+\s*%/u.test(workspace?.innerText ?? ""),
      progressBars: workspace?.querySelectorAll("progress, .lesson-progress").length ?? 0,
      sourceQaText: /Nội dung đầy đủ|Có đáp số cần rà soát|phút đọc|Source completeness/iu.test(workspace?.innerText ?? ""),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      stageWidth: stage?.getBoundingClientRect().width ?? 0,
      footerHeight: footer?.getBoundingClientRect().height ?? 0
    };
  });
}

async function assertCommonWorkspace(page, label) {
  const state = await inspectWorkspace(page);
  assert.equal(state.workspace, true, `${label}: learning workspace renders`);
  assert.ok(state.headerHeight > 0 && state.headerHeight <= 105, `${label}: compact lesson header (${state.headerHeight}px)`);
  assert.equal(state.hasPercentage, false, `${label}: no student-facing percentage`);
  assert.equal(state.progressBars, 0, `${label}: no lesson progress bar`);
  assert.equal(state.sourceQaText, false, `${label}: no internal source-QA labels`);
  assert.equal(state.horizontalOverflow, false, `${label}: no page-level horizontal overflow`);
  assert.ok(state.stageWidth > 0 && state.footerHeight > 0, `${label}: stage and bottom navigation remain visible`);
}

async function assertBottomClearance(page, cardSelector, label) {
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await page.waitForTimeout(80);
  const clearance = await page.evaluate((selector) => {
    const card = document.querySelector(selector);
    const footer = document.querySelector(".lesson-navigation");
    if (!card || !footer) return -1;
    return footer.getBoundingClientRect().top - card.getBoundingClientRect().bottom;
  }, cardSelector);
  assert.ok(clearance >= 12, `${label}: final content clears sticky navigation (${clearance}px)`);
}

await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath, headless: true });

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, locale: "vi-VN" });
    const page = await context.newPage();
    const runtimeErrors = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") runtimeErrors.push(message.text()); });
    const label = `${viewport.width}x${viewport.height}`;

    await openStage(page, lessonUrl(origin, "CD12", "12.1", "example"), ".example-card");
    await assertCommonWorkspace(page, `12.1 example ${label}`);
    const example = await page.evaluate(() => {
      const card = document.querySelector(".example-card");
      const solution = card?.querySelector(".example-reader__solution");
      const result = card?.querySelector(".example-reader__result");
      return {
        cards: document.querySelectorAll(".example-card").length,
        problem: Boolean(card?.querySelector(".example-reader__question")),
        method: Boolean(card?.querySelector(".example-reader__analysis")),
        solutionSteps: solution?.querySelectorAll("li").length ?? 0,
        oneResult: card?.querySelectorAll(".example-reader__result").length ?? 0,
        resultAfterSolution: Boolean(solution && result && (solution.compareDocumentPosition(result) & Node.DOCUMENT_POSITION_FOLLOWING)),
        cardOverflow: card ? card.scrollWidth > card.clientWidth + 1 : true
      };
    });
    assert.equal(example.cards, 1, `12.1 example ${label}: one coherent primary card`);
    assert.equal(example.problem, true, `12.1 example ${label}: prominent problem statement`);
    assert.equal(example.method, true, `12.1 example ${label}: method remains present`);
    assert.ok(example.solutionSteps >= 2, `12.1 example ${label}: readable numbered solution`);
    assert.equal(example.oneResult, 1, `12.1 example ${label}: a single final answer`);
    assert.equal(example.resultAfterSolution, true, `12.1 example ${label}: answer follows the derivation`);
    assert.equal(example.cardOverflow, false, `12.1 example ${label}: card content fits`);
    await page.screenshot({ path: `.audit/v15-example-12-1-${label}.png`, fullPage: viewport.width <= 768 });
    if (viewport.width <= 430) {
      await assertBottomClearance(page, ".example-card", `12.1 example ${label}`);
      await page.screenshot({ path: `.audit/v15-example-12-1-${label}-bottom.png` });
    }

    await openStage(page, lessonUrl(origin, "CD12", "12.1", "practice"), ".practice-card");
    await assertCommonWorkspace(page, `12.1 practice ${label}`);
    assert.match(await page.locator(".practice-card__header").innerText(), /Câu 1\s*\/\s*10/u, `12.1 ${label}: actual active count is 10`);
    assert.equal(await page.locator(".practice-feedback").count(), 0, `12.1 ${label}: answer starts hidden`);
    assert.equal(await page.locator("[data-practice-reveal]").count(), 1, `12.1 ${label}: reviewed reveal workflow is available`);
    assert.match(await page.locator(".lesson-sidebar").innerText(), /0\/10 câu đã làm/u, `12.1 ${label}: sidebar uses actual count`);
    await page.locator("[data-practice-reveal]").click();
    await page.locator(".practice-feedback").waitFor();
    assert.ok(await page.locator(".practice-feedback__solution li").count() >= 2, `12.1 ${label}: full solution appears after reveal`);
    await page.screenshot({ path: `.audit/v15-practice-source-12-1-${label}.png`, fullPage: viewport.width <= 768 });
    if (viewport.width <= 430) {
      await assertBottomClearance(page, ".practice-card", `12.1 practice ${label}`);
      await page.screenshot({ path: `.audit/v15-practice-source-12-1-${label}-bottom.png` });
    }

    if ([390, 1440].includes(viewport.width)) {
      await openStage(page, lessonUrl(origin, "CD20", "20.2", "practice"), ".practice-card");
      await assertCommonWorkspace(page, `20.2 generated practice ${label}`);
      assert.match(await page.locator(".practice-card__header").innerText(), /Câu 1\s*\/\s*3/u);
      assert.equal(await page.locator("[data-practice-answer]").count(), 4, `20.2 ${label}: four accessible choices`);
      await page.locator("[data-practice-answer]").first().click();
      await page.locator(".practice-feedback").waitFor();
      assert.equal(await page.locator("[data-practice-answer]:disabled").count(), 4, `20.2 ${label}: submission locks choices`);
      assert.ok(await page.locator(".practice-feedback__solution li").count() >= 1, `20.2 ${label}: verified explanation is shown`);
      await page.screenshot({ path: `.audit/v15-practice-generated-20-2-${label}.png`, fullPage: viewport.width <= 768 });
      if (viewport.width <= 430) {
        await assertBottomClearance(page, ".practice-card", `20.2 practice ${label}`);
        await page.screenshot({ path: `.audit/v15-practice-generated-20-2-${label}-bottom.png` });
      }

      await openStage(page, lessonUrl(origin, "CD12", "12.4", "practice"), ".lesson-inline-empty");
      await assertCommonWorkspace(page, `12.4 pending practice ${label}`);
      assert.match(await page.locator(".lesson-inline-empty").innerText(), /Nội dung bài tập đang được cập nhật/u);
      assert.equal(await page.locator(".practice-card").count(), 0, `12.4 ${label}: no unverified exercise is published`);
      await page.screenshot({ path: `.audit/v15-practice-pending-12-4-${label}.png`, fullPage: viewport.width <= 768 });
    }

    assert.deepEqual(runtimeErrors, [], `${label}: no browser runtime errors (${runtimeErrors.join(" | ")})`);
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });
  const page = await context.newPage();
  await page.goto(`${origin}/documents.html?grade=12`, { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    const progressModule = await import("./assets/js/domain/learning-progress.js?v=15.0");
    const registryModule = await import("./assets/js/data/content-registry.js?v=15.0");
    let state = progressModule.createLearningProgress();
    for (const subtopic of Object.values(registryModule.learningContentRegistry.topics.CD20.subtopics)) {
      for (const unit of subtopic.sections.knowledge.units) state = progressModule.markKnowledgeViewed(state, subtopic.code, unit.id);
      for (const unit of subtopic.sections.examples.units) state = progressModule.markExampleViewed(state, subtopic.code, unit.id);
      for (const unit of subtopic.sections.practice.units) state = progressModule.recordPracticeAnswer(state, subtopic.code, unit.id, 0, 0);
    }
    localStorage.setItem(progressModule.LEARNING_STORAGE_KEY, JSON.stringify(state));
  });
  await openStage(page, `${origin}/documents.html?grade=12&topic=CD20&exam=final&question=1`, ".exam-question");
  assert.equal(await page.locator(".exam-workspace").count(), 1, "final exam still unlocks after all ready lesson items are complete");
  assert.equal(await page.locator("[data-exam-answer]").count(), 4, "final exam answer interaction remains intact");
  await page.locator("[data-exam-answer]").first().click();
  assert.equal(await page.locator(".exam-navigator .is-answered").count(), 1, "final exam progress still updates");
  assert.match(await page.locator(".lesson-progress strong").innerText(), /1\/20/u);
  await context.close();

  console.log(`V15 learning workspace QA passed across ${viewports.length} required viewports.`);
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
