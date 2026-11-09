import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import { createReviewServer } from "../scripts/source-first/server.mjs";
import { root, work } from "../scripts/source-first/build.mjs";
import { digest } from "../scripts/source-first/model.mjs";

const directory = join(root, ".audit/source-first-v5"), reviewWork = mkdtempSync(join(work, "test-v54-browser-"));
const historicalFiles = JSON.parse(readFileSync(join(directory, "recovery-v5.4.json"), "utf8")).runtimeFileHashes;
const runtimeFiles = Object.fromEntries(Object.keys(historicalFiles).map((file)=>[file,digest(readFileSync(join(root,file)))]));
const parent=JSON.parse(readFileSync(join(directory,"development-preview-v5.5.json"),"utf8")).plan;
const alreadyApplied=parent.files.every((file)=>digest(readFileSync(join(root,file.file)))===file.afterHash);
const server = createReviewServer({ reviewWork }); await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const executablePath = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const browser = await chromium.launch({ executablePath, headless: true });
const results = [], errors = [];
try {
  const context = await browser.newContext({ acceptDownloads: true, locale: "vi-VN" }), page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport); await page.goto(origin); await page.locator("#queue button").first().waitFor();
    for (const [value, expected] of [["AMBIGUOUS", alreadyApplied?35:32], ["CONFIRMED_CONVERSION_DEFECT", alreadyApplied?0:3], ["MACHINE_MATCHED", 5]]) {
      await page.locator("#comparison-filter").selectOption(value); assert.equal(await page.locator("#queue button").count(), expected);
    }
    await page.locator("#comparison-filter").selectOption(alreadyApplied?"AMBIGUOUS":"CONFIRMED_CONVERSION_DEFECT");
    await page.locator("#queue button").filter({ hasText: "pdf-root-domain" }).click();
    assert.match(await page.locator("#automatic-state").textContent(), alreadyApplied?/AMBIGUOUS/u:/CONFIRMED_CONVERSION_DEFECT/u);
    await page.locator("details").filter({ has: page.locator("#runtime-state") }).locator("summary").click();
    assert.equal(await page.locator("[data-export-field]").count(), alreadyApplied?0:4);
    if(!alreadyApplied) {
    await page.locator("#reviewer").fill("V5.4 browser export fixture — not an actual approval");
    await page.locator("#reason").fill("Download-only fixture; no approval is applied to the real review store.");
    const source = page.locator("[data-field-source]").first(), mathematics = page.locator("[data-field-math]").first(), button = page.locator("[data-export-field]").first();
    await source.check(); await mathematics.check();
    const pending = page.waitForEvent("download"); await button.click(); const download = await pending;
    const stream = await download.createReadStream(), chunks = []; for await (const chunk of stream) chunks.push(chunk);
    const patch = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    assert.equal(patch.schemaVersion, "bienedu.math-field-review.v1"); assert.equal(patch.sourceVerified, true); assert.equal(patch.mathematicalApproved, true);
    assert.equal(patch.binding.recordId, "1.3-source-example-4"); assert.ok(patch.binding.beforeHash && patch.binding.afterHash && patch.binding.conditionsHash && patch.binding.sourceIdentityHash);
    assert.equal(patch.parentHash, null);
    const original = await page.locator("#latex").inputValue(); await page.locator("#latex").fill(original + " ");
    assert.equal(await source.isChecked(), false); assert.equal(await mathematics.isChecked(), false); assert.equal(await button.isDisabled(), true);
    assert.match(await page.locator("#automatic-state").textContent(), /không còn áp dụng/u);
    await page.locator("#latex").fill(original); assert.equal(await button.isDisabled(), false); assert.equal(await source.isChecked(), false);
    }
    await page.locator("#runtime-diffs").scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(directory, `v54-studio-field-review-${viewport.width}.png`) });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1); assert.equal(overflow, false);
    results.push({ viewport, fieldPatchExportedOnly: !alreadyApplied, alreadyAppliedFieldsNotReexported:alreadyApplied, confirmationsInvalidatedOnEdit: !alreadyApplied, priorityCounts: { machineMatched: 5, defects: alreadyApplied?0:3, ambiguous: alreadyApplied?35:32 }, pageOverflow: overflow });
  }
  assert.deepEqual(errors, []); await context.close();
  for (const [file, hash] of Object.entries(runtimeFiles)) assert.equal(digest(readFileSync(join(root, file))), hash);
  assert.equal(existsSync(join(reviewWork, "review-events")), false, "export alone never saves an approval");
  writeFileSync(join(directory, "studio-v5.4.json"), JSON.stringify({ passed: true, results, errors, realApprovalsCreated: 0, runtimeWrites: 0 }, null, 2) + "\n");
} finally {
  await browser.close(); server.closeAllConnections(); await new Promise((done) => server.close(done));
  const rel = relative(resolve(work), resolve(reviewWork)); assert.ok(rel && !rel.startsWith("..")); rmSync(reviewWork, { recursive: true, force: true });
}
await new Promise((done, reject) => {
  const child = spawn(process.execPath, [join(root, ".audit/runtime-integration-v53.mjs")], { cwd: root, env: { ...process.env, BIENEDU_SOURCE_QA: "v5.4" }, windowsHide: true, stdio: "inherit" });
  child.on("error", reject); child.on("exit", (code) => code === 0 ? done() : reject(new Error(`Learner V5.4 browser audit exited ${code}`)));
});
console.log(`V5.4 Studio and learner audit passed: four viewports; ${alreadyApplied?"applied fields correctly have no obsolete exports":"field export only"}; no real approvals or publication.`);
