import assert from "node:assert/strict";
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { Browser, sleep } from "../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs";

const root = resolve(".");
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff": "font/woff", ".woff2": "font/woff2" };
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

async function open(page, route, settleMs = 260) {
  await page.goto(`${origin}${route}`, { timeoutMs: 30000, settleMs });
}

try {
  const page = await browser.newPage({ width: 390, height: 844, dsf: 1, mobile: true });

  await open(page, "/?grade=12");
  await page.eval("localStorage.clear()");
  await open(page, "/");
  assert.equal(await page.eval("document.querySelector('[data-grade-dialog]').open"), true, "first visit opens onboarding");
  assert.equal(await page.eval("document.querySelector('.grade-dialog__welcome').textContent.replace(/\\s+/g, ' ').trim()"), "Chào mừng em đến với BienEdu! 👋");
  assert.equal(await page.eval("document.querySelector('#grade-dialog-title').textContent"), "Em đang học lớp mấy nhỉ?");
  assert.match(await page.eval("document.querySelector('#grade-dialog-description').textContent"), /nắm vững kiến thức/);
  assert.deepEqual(await page.eval("[...document.querySelectorAll('[data-grade-choice]')].map((button) => button.dataset.gradeChoice)"), ["9", "10", "11", "12"]);
  assert.equal(await page.eval("document.querySelector('[data-grade-continue]').disabled"), true);
  assert.equal(await page.eval(`(() => {
    const choice = document.querySelector('[data-grade-choice="10"]');
    choice.focus();
    choice.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    return document.activeElement.dataset.gradeChoice;
  })()`), "11", "arrow keys move between grade choices");
  await page.eval("document.querySelector('#grade-dialog-title').focus()");
  await page.screenshot({ path: ".audit/v16-onboarding-mobile.jpg", quality: 88 });

  await page.eval("document.querySelector('[data-grade-choice=\"10\"]').click()");
  assert.equal(await page.eval("document.querySelector('[data-grade-choice=\"10\"]').getAttribute('aria-pressed')"), "true");
  assert.equal(await page.eval("document.querySelector('[data-grade-dialog]').open"), true);
  assert.equal(await page.eval("document.querySelector('[data-grade-continue]').disabled"), false);
  await page.eval("document.querySelector('[data-grade-continue]').click()");
  await sleep(100);
  assert.equal(await page.eval("localStorage.getItem('bienedu:selected-grade:v1')"), "10");
  assert.equal(await page.eval("document.body.dataset.grade"), "10");
  assert.equal(await page.eval("document.querySelector('[data-home-grade-empty]').hidden"), false, "Grade 10 remains an honest updating state");

  await open(page, "/");
  assert.equal(await page.eval("document.querySelector('[data-grade-dialog]').open"), false, "stored grade suppresses repeated onboarding");
  assert.equal(await page.eval("document.body.dataset.grade"), "10");
  assert.equal(await page.eval("new URLSearchParams(location.search).get('grade')"), "10");

  await page.eval("document.querySelector('.grade-switcher').click()");
  assert.equal(await page.eval("document.querySelector('[data-grade-choice=\"10\"]').getAttribute('aria-pressed')"), "true");
  await page.eval("document.querySelector('[data-grade-choice=\"12\"]').click()");
  await page.eval("document.querySelector('[data-grade-continue]').click()");
  await sleep(100);
  assert.equal(await page.eval("document.body.dataset.grade"), "12", "header switcher still changes grade");

  await open(page, "/course.html?grade=12");
  const registrationLink = await page.eval(`(() => {
    const url = new URL(document.querySelector('[data-registration-link]').href);
    return { path: url.pathname, grade: url.searchParams.get('grade'), hash: url.hash };
  })()`);
  assert.deepEqual(registrationLink, { path: "/contact.html", grade: "12", hash: "#registration" });

  await open(page, "/contact.html?grade=12#registration", 360);
  assert.equal(await page.eval("document.querySelector('#registration-page-title').textContent.trim()"), "Chọn cách học phù hợp với em.");
  assert.equal(await page.eval("document.querySelector('.tutor-profile, .tutor-profile__portrait')"), null, "personal tutor profile is removed");
  assert.equal(await page.eval("document.body.textContent.includes('Trần Thanh Tùng')"), false, "personal tutor name is removed");
  assert.equal(await page.eval("document.querySelectorAll('.learning-format-card').length"), 2);
  assert.equal(await page.eval("document.querySelectorAll('.registration-guide__steps li').length"), 3);
  assert.equal(await page.eval("document.querySelectorAll('[data-registration-form]').length"), 1);
  assert.equal(await page.eval("document.querySelector('[data-registration-form] select[name=grade]').value"), "12");
  assert.equal(await page.eval("document.querySelector('[data-registration-submit]').disabled"), true, "unconfigured delivery is disabled");
  assert.match(await page.eval("document.querySelector('[data-registration-status]').textContent"), /Zalo 0943 943 151/);
  assert.equal(await page.eval("document.body.textContent.includes('BienEdu đã nhận được thông tin đăng ký của em')"), false, "no fake success appears");
  assert.equal(await page.eval("new URL(document.querySelector('.registration-contact .zalo-button').href).href"), "https://zalo.me/0943943151");
  assert.equal(await page.eval("document.querySelector('.registration-contact .zalo-button').rel.includes('noopener')"), true);
  assert.equal(await page.eval(`(() => {
    document.querySelector('[data-format-select="Online"]').click();
    return document.querySelector('[data-registration-form] select[name=format]').value;
  })()`), "Online", "online CTA preselects Online");
  assert.equal(await page.eval(`(() => {
    document.querySelector('[data-format-select="Trực tiếp"]').click();
    return document.querySelector('[data-registration-form] select[name=format]').value;
  })()`), "Trực tiếp", "offline CTA preselects direct learning");

  const validation = await page.eval(`(async () => {
    const module = await import('/assets/js/components/registration-form.js');
    return module.validateRegistrationData({ fullName: '', grade: '9', phone: '123' });
  })()`);
  assert.deepEqual(Object.keys(validation).sort(), ["fullName", "grade", "phone"]);

  await page.eval("localStorage.removeItem('bienedu:selected-grade:v1')");
  await open(page, "/documents.html?topic=CD20&type=20.1&section=knowledge&item=1");
  assert.equal(await page.eval("document.body.dataset.grade"), "12", "legacy Grade 12 lesson remains compatible");
  assert.equal(await page.eval("document.querySelector('[data-grade-dialog]').open"), false);

  const sizes = [
    { width: 390, height: 844, mobile: true },
    { width: 430, height: 932, mobile: true },
    { width: 768, height: 1024, mobile: false },
    { width: 1024, height: 768, mobile: false },
    { width: 1280, height: 720, mobile: false },
    { width: 1440, height: 900, mobile: false },
    { width: 1920, height: 1080, mobile: false }
  ];

  for (const size of sizes) {
    await page.setViewport(size);
    await page.eval("localStorage.removeItem('bienedu:selected-grade:v1')");
    await open(page, "/", 180);
    const onboardingHealth = await page.eval(`(() => {
      const dialog = document.querySelector('[data-grade-dialog]').getBoundingClientRect();
      return {
        open: document.querySelector('[data-grade-dialog]').open,
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        fits: dialog.top >= -1 && dialog.left >= -1 && dialog.right <= innerWidth + 1 && dialog.bottom <= innerHeight + 1,
        target: Math.min(...[...document.querySelectorAll('[data-grade-choice]')].map((button) => button.getBoundingClientRect().height))
      };
    })()`);
    assert.equal(onboardingHealth.open, true, `onboarding opens at ${size.width}x${size.height}`);
    assert.equal(onboardingHealth.horizontalOverflow, false, `onboarding has no horizontal overflow at ${size.width}x${size.height}`);
    assert.equal(onboardingHealth.fits, true, `onboarding fits at ${size.width}x${size.height}`);
    assert.ok(onboardingHealth.target >= 44, `grade targets are touchable at ${size.width}x${size.height}`);
    if (size.width === 1440) await page.screenshot({ path: ".audit/v16-onboarding-desktop.jpg", quality: 88 });

    await page.eval("localStorage.setItem('bienedu:selected-grade:v1', '12')");
    await open(page, "/contact.html?grade=12#registration", 200);
    const contactHealth = await page.eval(`(() => ({
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).length,
      formWidth: document.querySelector('[data-registration-form]').getBoundingClientRect().width,
      viewport: innerWidth,
      formatColumns: getComputedStyle(document.querySelector('.learning-options__grid')).gridTemplateColumns.split(' ').length
    }))()`);
    assert.equal(contactHealth.horizontalOverflow, false, `contact has no horizontal overflow at ${size.width}x${size.height}`);
    assert.equal(contactHealth.brokenImages, 0, `contact has no broken images at ${size.width}x${size.height}`);
    assert.ok(contactHealth.formWidth <= contactHealth.viewport, `form fits at ${size.width}x${size.height}`);
    assert.equal(contactHealth.formatColumns, size.width <= 760 ? 1 : 2, `learning formats respond at ${size.width}x${size.height}`);
  }

  await page.setViewport({ width: 390, height: 844, mobile: true });
  await open(page, "/contact.html?grade=12#registration", 220);
  await page.screenshot({ path: ".audit/v16-contact-mobile.jpg", quality: 86, fullPage: true });
  await page.setViewport({ width: 1440, height: 900, mobile: false });
  await open(page, "/contact.html?grade=12#registration", 220);
  await page.screenshot({ path: ".audit/v16-contact-desktop.jpg", quality: 86, fullPage: true });

  console.log("V16.1 passed: onboarding, two learning formats, CTA preselection, one honest registration form, verified Zalo, legacy links and 7 responsive viewports.");
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
