import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, resolve, sep, extname } from 'node:path';
import { chromium } from 'playwright-core';
import { buildActivePracticeSet } from '../assets/js/domain/practice-bank.js';

const root = process.cwd(), output = join(root, '.audit/source-first-v5/canonical-v5.7');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = createServer((request, response) => {
  try {
    const file = resolve(root, '.' + decodeURIComponent(new URL(request.url, 'http://local').pathname));
    if (!file.startsWith(root + sep)) throw new Error('Outside root');
    response.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream' }); response.end(readFileSync(file));
  } catch { response.writeHead(404); response.end(); }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser = await chromium.launch({ executablePath, headless: true });
try {
  const page = await browser.newPage(), origin = `http://127.0.0.1:${server.address().port}`, errors = [], states = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto(`${origin}/documents.html?grade=12&topic=CD01&type=1.2&section=example&item=5`, { waitUntil: 'networkidle' });
    assert.ok(await page.locator('.example-reader__question [data-canonical-math]').count(), 'Real route must use canonical facade');
    const runtime = await page.evaluate(async () => {
      const renderer = await import('/assets/js/components/canonical-math-renderer.js?v=5.7');
      const panel = document.createElement('section');
      panel.style.cssText = 'max-width:100%;min-width:0;padding:16px;background:white';
      document.querySelector('[data-lesson-content]').replaceChildren(panel);
      const segments = [{ type: 'text', value: 'Với điều kiện x ≠ ±1, ta có ' }, { type: 'math', latex: String.raw`f(x)=\frac{x}{x^2-1}`, display: false }];
      renderer.renderRichText(segments, panel);
      const first = panel.firstChild;
      renderer.renderRichText(segments, panel);
      const stableDom = first === panel.firstChild, duplicate = panel.querySelectorAll('.katex').length !== 1;
      const long = document.createElement('div'); panel.append(long);
      renderer.renderMath(Array.from({ length: 30 }, (_, i) => `x_{${i}}`).join('+') + '=0', long, { display: true });
      const ordinary = document.createElement('div'); panel.append(ordinary);
      renderer.renderMath(String.raw`\frac{1}{\sqrt{2x+3}}`, ordinary, { display: true });
      const invalid = document.createElement('div'); panel.append(invalid);
      renderer.renderMathContent({ type: 'unresolved', original: '<img src=x onerror=alert(1)>', reason: 'Unsupported source math' }, invalid);
      const display = long.querySelector('.canonical-math--display');
      const firstTerm = long.querySelector('.katex-html');
      return { stableDom, duplicate, escaped: invalid.querySelector('img') === null, fallback: invalid.textContent.includes('hiệu đính'),
        ordinaryMath: ordinary.querySelectorAll('mfrac,msqrt').length === 2,
        localEquationScroll: display.scrollWidth > display.clientWidth || display.querySelector('.math-markdown__display').scrollWidth > display.querySelector('.math-markdown__display').clientWidth,
        firstTermReachable: firstTerm.getBoundingClientRect().left >= display.getBoundingClientRect().left - 1,
        globalOverflow: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    assert.deepEqual(runtime, { stableDom: true, duplicate: false, escaped: true, fallback: true, ordinaryMath: true, localEquationScroll: true, firstTermReachable: true, globalOverflow: false });
    await page.screenshot({ path: join(output, `dom-${viewport.width}.png`) });
    await page.goto(`${origin}/documents.html?grade=12&topic=CD20&type=20.1&section=practice&item=1`, { waitUntil: 'networkidle' });
    const question = buildActivePracticeSet('20.1', 'PRACTICE_V15')[0];
    const button = page.locator(`[data-practice-answer="${question.correctIndex}"]`);
    if (await button.isEnabled()) await button.click();
    await page.locator('.practice-feedback.is-correct').waitFor();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bienedu:progress:v2:grade12')).lessons['20.1'].practiceAnswers);
    assert.equal(saved[question.id].correct, true);
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('.practice-feedback.is-correct').count(), 1);
    await page.goto(`${origin}/documents.html?grade=12&topic=CD20&type=20.1&section=practice&item=2`, { waitUntil: 'networkidle' });
    const second = buildActivePracticeSet('20.1', 'PRACTICE_V15')[1];
    const wrongIndex = (second.correctIndex + 1) % second.options.length;
    const wrongButton = page.locator(`[data-practice-answer="${wrongIndex}"]`);
    if (await wrongButton.isEnabled()) await wrongButton.click();
    await page.locator('.practice-feedback.is-wrong').waitFor();
    const wrongSaved = await page.evaluate(() => JSON.parse(localStorage.getItem('bienedu:progress:v2:grade12')).lessons['20.1'].practiceAnswers);
    assert.equal(wrongSaved[second.id].correct, false);
    assert.equal(wrongSaved[second.id].selectedIndex, wrongIndex);
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('.practice-feedback.is-wrong').count(), 1);
    states.push({ viewport, ...runtime, scoringAndReloadPreserved: true, wrongAnswerScoringPreserved: true });
  }
  assert.deepEqual(errors, []);
  writeFileSync(join(output, 'dom.json'), JSON.stringify({ passed: true, states, errors }, null, 2));
  console.log(JSON.stringify({ passed: true, viewportStates: states.length, scoring: true, duplicateRendering: false }));
} finally { await browser.close(); server.closeAllConnections(); await new Promise((done) => server.close(done)); }
