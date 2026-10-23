import assert from "node:assert/strict";
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { Browser } from "../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs";
import { knowledgeContent } from "../assets/js/data/knowledge-content.js";

const root = resolve(".");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf"
};
const server = createServer((request, response) => {
  try {
    let file = resolve(join(root, decodeURIComponent(new URL(request.url, "http://local").pathname)));
    if (file !== root && !file.startsWith(root + sep)) throw new Error("Forbidden");
    if (statSync(file).isDirectory()) file = join(file, "index.html");
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": mime[extname(file)] ?? "application/octet-stream"
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404);
    response.end("not found");
  }
});

const lessonCodes = Object.keys(knowledgeContent).filter((code) => /^(?:20|21)\./.test(code));
const keyLessonCodes = ["20.1", "20.2", "20.17", "21.1", "21.8"];
const requestedViewports = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 }
];

function lessonUrl(origin, code) {
  const topic = code.startsWith("20.") ? "CD20" : "CD21";
  return `${origin}/documents.html?grade=12&topic=${topic}&type=${code}&section=knowledge&item=1`;
}

async function inspectLayout(page) {
  return page.eval(`(() => {
    const markdown = document.querySelector('[data-approved-math-content]');
    const pdf = document.querySelector('[data-pdf-viewer]');
    const navigation = document.querySelector('.lesson-navigation');
    const box = (element) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height };
    };
    if (markdown && navigation) return {
      mode: 'markdown',
      reader: box(markdown),
      navigation: box(navigation),
      formulaCount: markdown.querySelectorAll('.katex').length,
      hasSourceButton: Boolean(markdown.querySelector('[data-action="show-source-pdf"]')),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1
    };
    if (pdf && navigation) return {
      mode: 'pdf',
      reader: box(pdf),
      navigation: box(navigation),
      hasViewport: Boolean(pdf.querySelector('[data-pdf-viewport]')),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1
    };
    const reader = document.querySelector('.knowledge-reader');
    const content = document.querySelector('.knowledge-reader__content');
    const study = document.querySelector('.knowledge-reader__study-grid');
    const principles = document.querySelector('.knowledge-reader__principles');
    const formula = document.querySelector('.knowledge-reader__formulae');
    const points = document.querySelector('.knowledge-reader__points');
    const note = document.querySelector('.knowledge-reader__note');
    if (![reader, content, study, principles, formula, points, note, navigation].every(Boolean)) {
      return { missing: true, body: document.body.innerText.slice(0, 300) };
    }
    const style = getComputedStyle(reader);
    return {
      mode: 'note',
      layoutClass: reader?.classList.contains('knowledge-reader--principles-split'),
      nested: principles?.contains(formula) && principles?.contains(note) && study?.contains(points),
      reader: box(reader),
      content: box(content),
      study: box(study),
      formula: box(formula),
      points: box(points),
      note: box(note),
      navigation: box(navigation),
      pointsBackground: getComputedStyle(points).backgroundColor,
      readerOverflowY: style.overflowY,
      readerScrollOverflow: reader.scrollHeight - reader.clientHeight,
      contentFitsScrollRange: box(content).bottom - box(reader).top + reader.scrollTop <= reader.scrollHeight + 1,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1
    };
  })()`);
}

function assertSharedLayout(layout, code, viewport) {
  const label = `${code} at ${viewport.width}x${viewport.height}`;
  if (layout.mode === "markdown") {
    assert.equal(code, "20.2", `${label} only uses approved Markdown for the published pilot`);
    assert.ok(layout.formulaCount > 0, `${label} renders KaTeX formulae`);
    assert.equal(layout.hasSourceButton, true, `${label} keeps the PDF source fallback`);
    assert.equal(layout.horizontalOverflow, false, `${label} has no horizontal page overflow`);
    return;
  }
  if (layout.mode === "pdf") {
    assert.equal(layout.hasViewport, true, `${label} renders the verified PDF.js viewport`);
    assert.equal(layout.horizontalOverflow, false, `${label} has no horizontal page overflow`);
    return;
  }
  assert.notEqual(layout.missing, true, `${label} renders every knowledge layout region`);
  assert.equal(layout.layoutClass, true, `${label} uses the shared principles layout`);
  assert.equal(layout.nested, true, `${label} keeps formula/note left and quick note right`);
  assert.equal(layout.pointsBackground, "rgb(255, 247, 207)", `${label} keeps the yellow quick-note treatment`);
  assert.equal(layout.horizontalOverflow, false, `${label} has no horizontal page overflow`);
  assert.equal(layout.contentFitsScrollRange, true, `${label} keeps the complete lesson accessible`);
  assert.ok(layout.study.width >= layout.reader.width * .78, `${label} uses the available lesson width`);
  assert.ok(layout.note.top >= layout.formula.bottom - 1, `${label} places the recognition/mistake note below the formula`);
  assert.ok(layout.note.width <= layout.formula.width + 1, `${label} keeps the left-column notes aligned`);

  if (viewport.width <= 640) {
    assert.ok(layout.points.top >= layout.note.bottom - 1, `${label} stacks the yellow note after formula-related content`);
    assert.equal(layout.readerOverflowY, "visible", `${label} uses natural page scrolling on mobile`);
  } else {
    assert.ok(layout.points.left >= layout.formula.right - 1, `${label} places the yellow note in a separate right column`);
    assert.ok(Math.abs(layout.points.top - layout.formula.top) <= 2, `${label} aligns both study columns at the top`);
  }
}

await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await Browser.launch();

try {
  const page = await browser.newPage(requestedViewports[0]);

  for (const viewport of requestedViewports) {
    await page.setViewport(viewport);
    for (const code of keyLessonCodes) {
      await page.goto(lessonUrl(origin, code), { timeoutMs: 30000, settleMs: 220 });
      const layout = await inspectLayout(page);
      assertSharedLayout(layout, code, viewport);

      if (layout.mode === "note" && viewport.width >= 1024 && ["20.1", "20.2"].includes(code)) {
        assert.ok(layout.readerScrollOverflow <= 2, `${code} fits without an unnecessary lesson scrollbar at ${viewport.width}x${viewport.height}`);
      }
    }

    await page.goto(lessonUrl(origin, "20.2"), { timeoutMs: 30000, settleMs: 160 });
    await page.screenshot({
      path: `.audit/knowledge-layout-20-2-${viewport.width}x${viewport.height}.jpg`,
      quality: 90,
      fullPage: viewport.width <= 640
    });

    if ([1280, 390].includes(viewport.width)) {
      for (const code of ["20.17", "21.8"]) {
        await page.goto(lessonUrl(origin, code), { timeoutMs: 30000, settleMs: 160 });
        await page.screenshot({
          path: `.audit/knowledge-layout-${code.replace(".", "-")}-${viewport.width}x${viewport.height}.jpg`,
          quality: 90,
          fullPage: viewport.width <= 640
        });
      }
    }
  }

  for (const viewport of [requestedViewports[1], requestedViewports.at(-1)]) {
    await page.setViewport(viewport);
    for (const code of lessonCodes) {
      await page.goto(lessonUrl(origin, code), { timeoutMs: 30000, settleMs: 180 });
      const layout = await inspectLayout(page);
      assertSharedLayout(layout, code, viewport);

      if (viewport.width <= 640 && layout.mode !== "pdf") {
        const bottomClearance = await page.eval(`(() => {
          scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
          const lastElement = document.querySelector('.math-markdown > footer, .knowledge-reader__points');
          const lastBlock = lastElement.getBoundingClientRect();
          const navigation = document.querySelector('.lesson-navigation').getBoundingClientRect();
          return navigation.top - lastBlock.bottom;
        })()`);
        assert.ok(bottomClearance >= 12, `${code} scrolls its final card clear of the sticky navigation`);
      }
    }
  }

  const mobileViewport = requestedViewports.at(-1);
  await page.setViewport(mobileViewport);
  await page.goto(lessonUrl(origin, "20.2"), { timeoutMs: 30000, settleMs: 160 });
  await page.eval("scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })");
  await page.screenshot({
    path: ".audit/knowledge-layout-20-2-390x844-bottom.jpg",
    quality: 90
  });

  console.log(`Knowledge layout passed: ${lessonCodes.length} CD20/CD21 lessons plus the six-viewport visual matrix.`);
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
