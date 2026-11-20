// Read-only browser regression. Never invokes author APIs or changes project media.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'docs', 'moments-observatory');
const require = createRequire(import.meta.url);
async function discover() {
  const candidates = process.env.PLAYWRIGHT_PATH ? [process.env.PLAYWRIGHT_PATH] : ['playwright'];
  if (!process.env.PLAYWRIGHT_PATH) {
    for (const entry of await readdir(dirname(root), { withFileTypes: true })) {
      if (entry.isDirectory()) candidates.push(join(dirname(root), entry.name, 'node_modules', 'playwright'));
    }
  }
  for (const candidate of candidates) {
    try {
      const path = require.resolve(candidate);
      const pkg = require(path);
      if (pkg.chromium) return { chromium: pkg.chromium, path };
    } catch (error) { if (process.env.PLAYWRIGHT_PATH) throw error; }
  }
  throw new Error('Set PLAYWRIGHT_PATH to an existing Playwright package; no dependencies are installed.');
}
const { chromium, path } = await discover();
console.log(`Playwright: ${path}`);
const origin = new URL(process.env.MOMENTS_TEST_ORIGIN || 'http://localhost:4347').origin;
const route = `${origin}/moments.html`;
const results = [];
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const activeSelector = '.observatory [data-moment-open][aria-current="true"]';
const selected = page => page.locator(activeSelector).getAttribute('data-moment-open');
const current = page => page.evaluate(() => new URLSearchParams(location.hash.slice(1)).get('moment'));
async function equalEventually(read, expected, message) {
  const end = Date.now() + 5000;
  let actual;
  do {
    actual = await read();
    if (actual === expected) return;
    await new Promise(resolve => setTimeout(resolve, 60));
  } while (Date.now() < end);
  assert.equal(actual, expected, message);
}
async function change(read, before, message) {
  const end = Date.now() + 5000;
  let actual;
  do {
    actual = await read();
    if (actual && actual !== before) return actual;
    await new Promise(resolve => setTimeout(resolve, 60));
  } while (Date.now() < end);
  assert.notEqual(actual, before, message);
  assert.ok(actual, message);
  return actual;
}
async function overflow(page) {
  const sizes = await page.evaluate(() => {
    const dialog = document.querySelector('.moment-detail');
    return { viewport: innerWidth, document: document.documentElement.scrollWidth, dialog: dialog?.open ? [dialog.clientWidth, dialog.scrollWidth] : null };
  });
  assert.ok(sizes.document <= sizes.viewport + 1 && (!sizes.dialog || sizes.dialog[1] <= sizes.dialog[0] + 1), `no document or viewer horizontal overflow: ${JSON.stringify(sizes)}`);
}
async function bounded(page, total) {
  const photos = page.locator('.observatory [data-moment-open]');
  assert.ok(await photos.count() > 0 && await photos.count() <= Math.min(total, 9), 'orbit mounts at most nine photos');
  assert.equal(await page.locator(activeSelector).count(), 1, 'exactly one current orbit photo');
  await overflow(page);
}
async function screenshot(page, name) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].filter(image => image.getBoundingClientRect().width && image.currentSrc)
      .map(image => image.decode().catch(() => {})));
  });
  await page.screenshot({ path: join(output, name), fullPage: true, animations: 'disabled' });
}
async function drag(page, locator, touch = false) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  assert.ok(box && box.width > 0, 'gesture target has area');
  const x1 = box.x + box.width * .75;
  const x2 = box.x + box.width * .25;
  const y = Math.max(40, Math.min(box.y + box.height * .7, page.viewportSize().height - 80));
  if (touch) {
    const session = await page.context().newCDPSession(page);
    try {
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x1, y }] });
      for (let i = 1; i <= 10; i++) {
        await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x1 + (x2 - x1) * i / 10, y: y + 2 }] });
        await page.waitForTimeout(20);
      }
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } finally { await session.detach(); }
  } else {
    await page.mouse.move(x1, y);
    await page.mouse.down();
    await page.mouse.move(x2, y + 2, { steps: 12 });
    await page.mouse.up();
  }
}
async function agreement(page, items) {
  await page.waitForTimeout(400); // Wait for the viewer's directional image transition.
  const id = await current(page);
  const index = items.findIndex(item => item.id === id);
  assert.ok(index >= 0, 'viewer URL identifies a real photo');
  assert.equal((await page.locator('[data-detail-count]').textContent()).trim(), `${index + 1} / ${items.length}`, 'viewer count agrees with URL');
  assert.equal(await page.locator('.moment-detail__image').getAttribute('src'), items[index].src, 'viewer source agrees with URL');
  const value = key => items[index].overrides?.[key] ?? items[index][key] ?? items[index].metadata?.[key] ?? '';
  assert.equal(await page.locator('.moment-detail__image').getAttribute('alt'), value('alt') || value('title'), 'viewer alt agrees with URL');
  await overflow(page);
}
async function synchronizedExit(page, id) {
  await page.locator('.moment-detail').waitFor({ state: 'hidden' });
  await equalEventually(() => selected(page), id, 'exit centers the viewed photo');
  await equalEventually(() => page.locator(activeSelector).evaluate(el => document.activeElement === el), true, 'exit focuses the current photo');
  assert.equal(new URL(page.url()).hash, '', 'exit clears viewer hash');
  assert.equal(await page.evaluate(() => document.body.style.overflow), '', 'exit restores document scrolling');
}
async function exercise({ width, fixtureCount, reducedMotion = false }) {
  const mobile = width < 600;
  const label = `${width}${fixtureCount ? `-${fixtureCount}-photos` : ''}${reducedMotion ? '-reduced-motion' : ''}`;
  const context = await browser.newContext({ viewport: { width, height: mobile ? 844 : 1000 }, isMobile: mobile, hasTouch: mobile, reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Browser-only fixture: replace the inline data JSON in the document response.
  // All cloned items retain real existing image URLs. No manifest/API writes.
  if (fixtureCount) await context.route('**/moments.html*', async intercepted => {
    const response = await intercepted.fetch();
    let replaced = false;
    const html = (await response.text()).replace(/(<script\b[^>]*\bdata-moments-content\b[^>]*>)([\s\S]*?)(<\/script>)/i, (_, open, json, close) => {
      const images = JSON.parse(json).filter(item => item.kind === 'image' && !item.deleted);
      assert.ok(images.length, 'fixture requires existing images');
      const items = Array.from({ length: fixtureCount }, (_, index) => ({ ...images[index % images.length], id: `observatory-fixture-${index + 1}` }));
      replaced = true;
      return `${open}${JSON.stringify(items).replace(/</g, '\\u003c')}${close}`;
    });
    assert.ok(replaced, 'inline Moments JSON interception succeeded');
    await intercepted.fulfill({ response, body: html });
  });
  try {
    await page.goto(route, { waitUntil: 'networkidle' });
    await page.locator(activeSelector).waitFor();
    const items = await page.locator('[data-moments-content]').evaluate(el => JSON.parse(el.textContent).filter(item => item.kind === 'image' && !item.deleted));
    const ids = items.map(item => item.id);
    assert.ok(ids.length >= 2, 'at least two photos available');
    if (fixtureCount) assert.equal(ids.length, fixtureCount, 'requested fixture count');
    const step = (id, direction) => ids[(ids.indexOf(id) + direction + ids.length) % ids.length];
    await bounded(page, ids.length);
    await screenshot(page, `orbit-${label}.png`);
    const start = await selected(page);
    await page.locator('[data-orbit="next"]').click();
    await equalEventually(() => selected(page), step(start, 1), 'orbit Next');
    await page.locator('[data-orbit="previous"]').click();
    await equalEventually(() => selected(page), start, 'orbit Previous');
    await page.locator(activeSelector).focus();
    await page.keyboard.press('ArrowRight');
    await equalEventually(() => selected(page), step(start, 1), 'orbit ArrowRight');
    await page.keyboard.press('ArrowLeft');
    await equalEventually(() => selected(page), start, 'orbit ArrowLeft');
    await page.waitForTimeout(900);
    await drag(page, page.locator('.observatory'), mobile);
    let ringId = await change(() => selected(page), start, 'ring drag/swipe changes selection');
    assert.equal(await current(page), null, 'ring drag does not accidentally open viewer');
    await page.waitForTimeout(500);
    await page.locator('.observatory').hover();
    await page.mouse.wheel(160, 0);
    ringId = await change(() => selected(page), ringId, 'wheel changes orbit selection');
    await page.waitForTimeout(900);
    ringId = await selected(page);
    await bounded(page, ids.length);
    await page.locator('[data-orbit="enter"]').click();
    await page.locator('.moment-detail').waitFor({ state: 'visible' });
    await equalEventually(() => current(page), ringId, 'Enter opens current selection');
    await agreement(page, items);
    await screenshot(page, `viewer-${label}.png`);
    assert.equal(await page.locator('.moment-detail').evaluate(el => el.contains(document.activeElement)), true, 'viewer receives focus');
    const historyLength = await page.evaluate(() => history.length);
    await page.locator('[data-detail="next"]').click();
    await equalEventually(() => current(page), step(ringId, 1), 'viewer Next');
    await page.locator('[data-detail="previous"]').click();
    await equalEventually(() => current(page), ringId, 'viewer Previous');
    await page.keyboard.press('ArrowRight');
    await equalEventually(() => current(page), step(ringId, 1), 'viewer ArrowRight');
    await page.keyboard.press('ArrowLeft');
    await equalEventually(() => current(page), ringId, 'viewer ArrowLeft');
    await drag(page, page.locator('.moment-detail__image'), mobile);
    const viewed = await change(() => current(page), ringId, 'viewer swipe/desktop drag navigates');
    await agreement(page, items);
    assert.equal(await page.evaluate(() => history.length), historyLength, 'viewer navigation does not add history entries');
    await page.keyboard.press('Escape');
    await synchronizedExit(page, viewed);
    await page.locator(activeSelector).click();
    await page.locator('.moment-detail').waitFor({ state: 'visible' });
    await page.locator('[data-detail="next"]').click();
    const afterBack = await change(() => current(page), viewed, 'advance before browser Back');
    await page.goBack();
    await synchronizedExit(page, afterBack);
    // A fresh direct-link load has no overlay history; reload must preserve it.
    const directId = ids.at(-1);
    await page.goto(`${route}?observatory-direct=1#moment=${encodeURIComponent(directId)}`, { waitUntil: 'networkidle' });
    await page.locator('.moment-detail').waitFor({ state: 'visible' });
    await agreement(page, items);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.moment-detail').waitFor({ state: 'visible' });
    await equalEventually(() => current(page), directId, 'reload preserves deep-linked photo');
    await agreement(page, items);
    await page.locator('[data-detail="close"]').click();
    await synchronizedExit(page, directId);
    assert.equal(new URL(page.url()).pathname, '/moments.html', 'direct-link close stays in Moments');
    await bounded(page, ids.length);
    if (reducedMotion) {
      assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
      const moving = await page.locator('.observatory').evaluate(el => el.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running' && animation.effect?.getComputedTiming().duration > 100).length);
      assert.equal(moving, 0, 'reduced motion leaves no long running orbit animations');
    }
    assert.deepEqual(errors, [], 'no browser runtime errors');
    return { label, status: 'passed', photos: ids.length };
  } catch (error) {
    console.error(`${label}: ${error.stack}`);
    await screenshot(page, `failure-${label}.png`).catch(() => {});
    return { label, status: 'failed', error: error.stack, browserErrors: errors };
  } finally { await context.close(); }
}
try {
  for (const width of [360, 390, 430, 1280, 1440]) {
    if (process.env.MOMENTS_TEST_CASE && process.env.MOMENTS_TEST_CASE !== String(width)) continue;
    results.push(await exercise({ width }));
    console.log(`${results.at(-1).status.toUpperCase()} ${results.at(-1).label}`);
  }
  for (const fixtureCount of [5, 20, 105]) {
    if (process.env.MOMENTS_TEST_CASE && process.env.MOMENTS_TEST_CASE !== `fixture-${fixtureCount}`) continue;
    results.push(await exercise({ width: 390, fixtureCount }));
    console.log(`${results.at(-1).status.toUpperCase()} ${results.at(-1).label}`);
  }
  if (!process.env.MOMENTS_TEST_CASE || process.env.MOMENTS_TEST_CASE === 'reduced') results.push(await exercise({ width: 390, reducedMotion: true }));
} finally {
  await browser.close();
  await writeFile(join(output, 'results.json'), `${JSON.stringify({ origin, playwright: path, generatedAt: new Date().toISOString(), results }, null, 2)}\n`);
}
const failures = results.filter(result => result.status === 'failed');
for (const failure of failures) console.error(`${failure.label}: ${failure.error}`);
if (failures.length) process.exitCode = 1;