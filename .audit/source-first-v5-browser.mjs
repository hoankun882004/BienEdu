import assert from "node:assert/strict";
import { existsSync, readFileSync, mkdirSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { chromium } from "playwright-core";
import { createReviewServer } from "../scripts/source-first/server.mjs";
import { root, work } from "../scripts/source-first/build.mjs";
import { digest, validateReviewPatch, reviewedContentHash, sourceIdentityHash } from "../scripts/source-first/model.mjs";
import { saveReviewPatch } from "../scripts/source-first/review-store.mjs";
import { renderMarkdownMath } from "../assets/js/components/markdown-math-renderer.js";

const executablePath = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
assert.ok(executablePath);
const server = createReviewServer();
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath, headless: true });
const snapshot = JSON.parse(readFileSync(join(work, "snapshot.json"), "utf8"));
const out = join(root, ".audit/source-first-v5");
mkdirSync(out, { recursive: true });
const previousEvidence = existsSync(join(out, "browser-results.json")) ? JSON.parse(readFileSync(join(out, "browser-results.json"), "utf8")) : {};
const evidenceKey = digest({ snapshot: digest(snapshot), renderer: digest(readFileSync(join(root, "assets/js/components/markdown-math-renderer.js"))), katex: digest(readFileSync(join(root, "assets/vendor/katex/katex.mjs"))) });
const reuseBenchmark = previousEvidence?.passed && previousEvidence.snapshotSha256 === digest(snapshot) && (!previousEvidence.evidenceKey || previousEvidence.evidenceKey === evidenceKey) && Array.from({ length: 10 }, (_, index) => existsSync(join(out, `benchmark-sheet-${String(index + 1).padStart(2, "0")}.png`))).every(Boolean);
try {
  const context = await browser.newContext({ acceptDownloads: true, locale: "vi-VN" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const viewport of [{ width: 1366, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto(origin);
    await page.locator("#queue button").first().waitFor();
    await page.locator("#topic").selectOption("CD22");
    await page.locator("#queue button").filter({ hasText: "tex-22.7" }).click();
    await page.locator("#preview .mfrac").waitFor();
    assert.match(await page.locator("#runtime-state").textContent(), /latex-pilot-v5/u);
    assert.ok(await page.locator("#runtime-preview .mfrac").count());
    assert.ok(await page.locator("#review-questions li").count() >= 4);
    assert.match(await page.locator("#source-detail").textContent(), /95/u, "native context retains the original medical example");
    assert.equal(await page.locator(".math-render-error,.katex-error").count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await page.screenshot({ path: join(out, `studio-tex-${viewport.width}.png`), fullPage: true });
    await page.locator("#topic").selectOption("CD13");
    await page.locator("#queue button").filter({ hasText: "pdf-definite-integral" }).click();
    await page.waitForFunction(() => { const image = document.querySelector("#source-crop"); return !image.hidden && image.complete && image.naturalWidth > 0; });
    await page.screenshot({ path: join(out, `studio-pdf-${viewport.width}.png`), fullPage: true });
    await page.locator("#zoom-source").click();
    await page.locator("#source-zoom[open]").waitFor();
    await page.locator("#zoom-level").fill("2");
    await page.locator("#zoom-level").dispatchEvent("input");
    assert.equal(await page.locator("#zoom-image").evaluate((image) => image.getBoundingClientRect().width > image.parentElement.clientWidth), true);
    await page.screenshot({ path: join(out, `studio-zoom-v51-${viewport.width}.png`) });
    await page.keyboard.press("Escape");
    await page.locator("#source-context").click();
    await page.waitForFunction(() => document.querySelector("#source-context").getAttribute("aria-pressed") === "true" && document.querySelector("#source-crop").complete);
    await page.screenshot({ path: join(out, `studio-context-v51-${viewport.width}.png`), fullPage: true });
    const titleBefore = await page.locator("#item-title").textContent();
    await page.keyboard.press("Alt+ArrowRight");
    assert.notEqual(await page.locator("#item-title").textContent(), titleBefore);
    await page.keyboard.press("Alt+ArrowLeft");
    assert.equal(await page.locator("#item-title").textContent(), titleBefore);
    await page.locator("#error-type").selectOption("integrals");
    assert.equal(await page.locator("#queue button").count(), 3);
    await page.locator("#error-type").selectOption("");
  }
  await page.locator("#topic").selectOption("CD22");
  await page.locator("#queue button").filter({ hasText: "tex-22.7" }).click();
  await page.locator("#reviewer").fill("Browser regression editor");
  const originalLatex = await page.locator("#latex").inputValue();
  await page.locator("#source-compared").check();
  await page.locator("#human-source").check();
  await page.locator("#latex").fill(originalLatex + String.raw`\,`);
  assert.equal(await page.locator("#source-compared").isChecked(), false, "editing invalidates earlier source confirmation");
  assert.equal(await page.locator("#human-source").isChecked(), false);
  assert.ok((await page.locator("#diff-after ins").textContent()).includes(String.raw`\,`));
  await page.locator("#preview .mfrac").waitFor();
  await page.locator("#reason").fill("Regression export: compare with exact original TeX source");
  await page.locator("#source-compared").check();
  await page.locator("#human-source").check();
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#approve").click();
  const download = await downloadPromise;
  const patch = JSON.parse(readFileSync(await download.path(), "utf8"));
  assert.equal(validateReviewPatch(snapshot.items.find((item) => item.id === patch.itemId), patch, { root }), true);
  assert.equal(patch.status, "source-verified");
  assert.equal(patch.schemaVersion, "bienedu.math-review-patch.v3");
  assert.equal(patch.itemVersion, snapshot.items.find((item) => item.id === patch.itemId).contentVersion);
  assert.ok(patch.sourceIdentityHash && patch.originalExpressionHash);
  assert.equal(patch.editorialApproval.confirmed, false);
  assert.match(await page.locator("#queue-count").textContent(), /40 \/ 40/u, "export alone does not count as completed human verification");
  assert.notEqual(patch.after, patch.before, "editor changes are retained in the exported patch");
  assert.equal((await fetch(`${origin}/api/items`, { method: "POST", body: JSON.stringify(patch) })).status, 405);
  await page.keyboard.press("Alt+n");
  assert.notEqual(await page.locator("#item-title").textContent(), "tex-22.7");
  const unresolvedId = await page.locator("#item-title").textContent();
  await page.locator("#reason").fill("Synthetic ambiguity decision; export only, never applied as a real review");
  const ambiguityDownload = page.waitForEvent("download");
  await page.locator("#mark-ambiguous").click();
  const ambiguity = JSON.parse(readFileSync(await (await ambiguityDownload).path(), "utf8"));
  assert.equal(ambiguity.status, "unresolved-ambiguity");
  assert.equal(ambiguity.before, ambiguity.after);
  assert.equal(ambiguity.editorialApproval.confirmed, false);
  assert.equal(validateReviewPatch(snapshot.items.find((item) => item.id === unresolvedId), ambiguity, { root }), true);
  await page.locator("#latex").fill(String.raw`\unsupportedFixtureCommand`);
  assert.equal(await page.locator("#approve").isDisabled(), true);
  const correctionDownload = page.waitForEvent("download");
  await page.locator("#mark-error").click();
  const correction = JSON.parse(readFileSync(await (await correctionDownload).path(), "utf8"));
  assert.equal(correction.status, "needs-correction");
  assert.equal(validateReviewPatch(snapshot.items.find((item) => item.id === unresolvedId), correction, { root }), true);
  await page.locator("#refresh-reviews").click();
  await page.waitForFunction(() => document.querySelector("#feedback").textContent.includes("Đã đọc lại"));
  for (const status of ["needs-correction", "unresolved-ambiguity"]) { await page.locator("#status").selectOption(status); assert.equal(await page.locator("#queue button").count(), 0, "exports are not saved decisions"); }
  await page.locator("#status").selectOption("");
  assert.match(await page.locator("#queue-count").textContent(), /40 \/ 40/u);
  assert.deepEqual(errors, []);

  // A synthetic, isolated review store exercises completed states. It is never
  // used for actual preparation counts or persisted into real review history.
  const fixtureWork = mkdtempSync(join(work, "browser-v52-fixture-"));
  const fixtureServer = createReviewServer({ reviewWork: fixtureWork });
  try {
    const item = snapshot.items.find((entry) => entry.id === "tex-22.7");
    const reviewer = "Synthetic V5.2 UI fixture, not an actual human review";
    saveReviewPatch(item, { schemaVersion: "bienedu.math-review-patch.v3", itemId: item.id, itemVersion: item.contentVersion,
      sourceIdentityHash: sourceIdentityHash(item), originalExpressionHash: digest(item.originalExpression), baseHash: digest(item), sourceSha256: item.source.sha256,
      before: item.normalizedLatex, after: item.normalizedLatex, reviewedContentHash: reviewedContentHash(item), status: "source-verified",
      reviewer, reviewerType: "human", humanSourceConfirmed: true, sourceCompared: true, reason: "UI regression fixture only",
      exportedAt: "2026-11-05T11:00:00.000Z", editorialApproval: { confirmed: true, reviewerType: "human", reviewer } }, reviewer, { root, work: fixtureWork });
    await new Promise((done) => fixtureServer.listen(0, "127.0.0.1", done));
    await page.goto(`http://127.0.0.1:${fixtureServer.address().port}`);
    await page.locator("#queue button").first().waitFor();
    await page.locator("#topic").selectOption("CD22");
    await page.locator("#queue button").filter({ hasText: "tex-22.7" }).click();
    for (const index of [2, 3]) assert.equal(await page.locator("#checks p").nth(index).getAttribute("data-status"), "passed", "completed human gates display their own state");
    assert.equal(await page.locator("#latex").evaluate((node) => node.readOnly), true);
    for (const selector of ["#approve", "#mark-error", "#mark-ambiguous"]) assert.equal(await page.locator(selector).isDisabled(), true);
  } finally {
    fixtureServer.closeAllConnections(); await new Promise((done) => fixtureServer.close(done));
    const rel = relative(resolve(work), resolve(fixtureWork)); assert.ok(rel && !rel.startsWith("..")); rmSync(fixtureWork, { recursive: true, force: true });
  }

  const escape = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const sheet = await context.newPage();
  await sheet.setViewportSize({ width: 1700, height: 1200 });
  await sheet.goto(origin);
  const sessionToken = await sheet.locator("meta[name=review-session]").getAttribute("content");
  await sheet.setExtraHTTPHeaders({ "x-review-token": sessionToken });
  for (let start = 0; !reuseBenchmark && start < snapshot.items.length; start += 4) {
    const batch = snapshot.items.slice(start, start + 4);
    const cards = batch.map((item) => {
      const source = item.source.kind === "tex"
        ? `<pre>${escape(item.originalExpression)}</pre>`
        : `<img src="${origin}/api/crop?id=${encodeURIComponent(item.id)}" alt="Original PDF region">`;
      return `<article><h2>${escape(item.id)}</h2><p>${escape(item.source.file)} · ${escape(JSON.stringify(item.source.location))}</p>${source}<h3>Conversion candidate · source review pending</h3>${renderMarkdownMath(`$$${item.normalizedLatex}$$`)}${(item.conditions ?? []).map((condition) => renderMarkdownMath(`Source condition: \\(${condition.normalizedLatex}\\)`)).join("")}</article>`;
    });
    await sheet.setContent(`<!doctype html><html><head><link rel="stylesheet" href="${origin}/assets/vendor/katex/katex.min.css"><style>body{margin:24px;background:#eef2f6;font-family:Arial}main{display:grid;grid-template-columns:1fr 1fr;align-items:start;gap:20px}article{min-width:0;padding:20px;background:white}img{width:100%;height:auto}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:19px;line-height:1.6;background:#f5f7fa;padding:20px}h2{font-size:20px}h3{font-size:14px;color:#57677e}p{font-size:12px;overflow-wrap:anywhere}.math-markdown__display{font-size:19px;overflow-x:auto;padding:18px 8px}.katex-display{margin:0}</style></head><body><main>${cards.join("")}</main></body></html>`);
    await sheet.evaluate(() => document.fonts.ready);
    await sheet.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
    assert.equal(await sheet.locator(".math-render-error,.katex-error").count(), 0);
    await sheet.screenshot({ path: join(out, `benchmark-sheet-${String(start / 4 + 1).padStart(2, "0")}.png`), fullPage: true });
  }
  const figureReportPath = join(out, "figure-review-v5.1.json");
  if (existsSync(figureReportPath)) {
    const figures = JSON.parse(readFileSync(figureReportPath, "utf8"));
    const preparation = JSON.parse(readFileSync(join(out, "review-preparation-v5.2.json"), "utf8"));
    const batchKey = digest(preparation.figurePreparation.nextVisualBatchIds.map((id) => { const figure = figures.figures.find((entry) => entry.id === id); return { id, sourceHash: figure.sourceHash, assetHash: figure.assetHash, region: figure.sourceRegion }; }));
    const reuseFigures = previousEvidence?.v52FigureCacheKey === batchKey && [1, 2].every((number) => existsSync(join(out, `figure-comparison-v52-${number}.png`)));
    for (let start = 0; !reuseFigures && start < preparation.figurePreparation.nextVisualBatchIds.length; start += 4) {
      const selected = preparation.figurePreparation.nextVisualBatchIds.slice(start, start + 4).map((id) => figures.figures.find((figure) => figure.id === id));
      await sheet.setContent(`<!doctype html><html><head><style>body{font-family:Arial;background:#edf2f7;margin:24px}main{display:grid;grid-template-columns:1fr 1fr;gap:20px}article{background:white;padding:20px;min-width:0}h2{font-size:18px}p{font-size:13px}img{display:block;width:100%;height:auto}.context{max-height:650px;object-fit:contain}small{color:#596b82}</style></head><body><main>${selected.map((figure) => `<article><h2>${escape(figure.id)}</h2><p>Question ${figure.originalExampleNumber} · Source page ${figure.sourcePage} · Human review pending</p><small>Original existing asset</small><img src="${origin}/api/figure?id=${encodeURIComponent(figure.id)}" alt="Original source asset"><small>Original full-page context</small><img class="context" src="${origin}/api/figure-context?id=${encodeURIComponent(figure.id)}" alt="Original PDF page"></article>`).join("")}</main></body></html>`);
      await sheet.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
      await sheet.screenshot({ path: join(out, `figure-comparison-v52-${start / 4 + 1}.png`), fullPage: true });
    }
    previousEvidence.v52FigureCacheKey = batchKey;
  }
  writeFileSync(join(out, "browser-results.json"), JSON.stringify({ passed: true, snapshotSha256: digest(snapshot), evidenceKey, benchmarkEvidenceReused: reuseBenchmark, v52FigureCacheKey: previousEvidence?.v52FigureCacheKey, viewports: [1366, 390], sourceItems: snapshot.items.length, benchmarkSheets: 10, figureSheets: 4, zoomAndContext: true, keyboardNavigation: true, errorFilters: true, beforeAfterDiff: true, v3VersionBoundExport: true, distinctUnresolvedDecisions: true, reviewRefresh: true, confirmationInvalidatedOnEdit: true, completedGateDisplayTestedInIsolatedFixture: true, humanApprovalNotInferredFromExport: true, errorCount: errors.length, mathFallbackErrors: 0, patchExportValidated: true, httpWrites: "rejected" }, null, 2) + "\n");
  console.log(`Source-first studio passed: desktop/mobile, V3 decisions, refresh and read-only HTTP; 40 comparison candidates ${reuseBenchmark ? "reused from unchanged evidence" : "captured"} in 10 sheets.`);
  await context.close();
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
}
