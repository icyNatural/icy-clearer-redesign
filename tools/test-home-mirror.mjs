// Autonomous mirror checks; opt in to isolated Local Studio persistence checks.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
const origin = process.env.HOME_MIRROR_TEST_ORIGIN || 'http://127.0.0.1:4347';
const editor = process.env.HOME_MIRROR_TEST_EDITOR === '1';
assert.ok(!editor || ['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const manifest = resolve('src/data/media/home.json');
const backup = await readFile(manifest);
const output = resolve(process.env.HOME_MIRROR_TEST_OUTPUT || process.env.TEMP || '.', 'icy-home-cycle');
await mkdir(output, { recursive: true });
const worlds = [
  ['natural', '/natural.html', '.living-mirror__photo--organic'],
  ['moments', '/moments.html', '.living-mirror__photo--water'],
  ['apps', '/world.html', '.living-mirror__geometry--apps'],
  ['clear', '/clear.html', '.living-mirror__geometry--clear'],
  ['gaming', '/games.html', '.living-mirror__photo--gaming'],
];
const browser = await chromium.launch({ headless: true });
const errors = [];
async function tab(options = {}) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ...options });
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  return page;
}
async function poll(check, message) {
  for (let i = 0; i < 200; i++) { if (await check()) return; await wait(50); }
  assert.fail(message);
}
const mirror = page => page.locator('[data-living-mirror]').first();
async function ready(page) {
  await poll(async () => await mirror(page).getAttribute('data-portal-ready') === 'true', 'Mirror initializes');
  await mirror(page).scrollIntoViewIfNeeded();
  await poll(async () => await mirror(page).getAttribute('data-running') === 'true', 'Mirror is onscreen and running');
}
async function home(page) {
  await page.goto(origin + '/', { waitUntil: 'domcontentloaded' });
  await ready(page);
  await page.clock.runFor(1400);
  assert.equal(await mirror(page).getAttribute('data-phase'), 'stable');
}
try {
  for (const width of [360, 390, 430]) {
    const page = await tab({ viewport: { width, height: 844 } });
    await home(page);
    for (let i = 0; i < worlds.length; i++) {
      const [signal, href, visual] = worlds[i];
      assert.equal(await mirror(page).getAttribute('data-reflection'), signal);
      assert.equal(await mirror(page).getAttribute('data-destination'), href);
      assert.match(await mirror(page).innerText(), /ENTER →/);
      // Let compositor transitions finish before checking resolved opacity.
      await wait(1400);
      assert.ok(await mirror(page).locator(visual).evaluate(el => +getComputedStyle(el).opacity) >= .6);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: resolve(output, `${width}-${signal}.png`) });
      await page.clock.runFor(i === 0 ? 5400 : 5500);
      assert.equal(await mirror(page).getAttribute('data-phase'), 'resolving');
      // A transition tap must not navigate, even if the finger stays down until stable.
      await mirror(page).dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 1, isPrimary: true, button: 0 });
      await page.clock.runFor(1300);
      await mirror(page).dispatchEvent('pointerup', { pointerType: 'touch', pointerId: 1 });
      await mirror(page).dispatchEvent('click');
      assert.equal(new URL(page.url()).pathname, '/');
      await mirror(page).evaluate(el => el.blur());
    }
    // One tap enters each visible destination; Back restores an autonomous HOME.
    for (let i = 0; i < worlds.length; i++) {
      await home(page);
      if (i) await page.clock.runFor(i * 6800);
      assert.equal(await mirror(page).getAttribute('data-destination'), worlds[i][1]);
      await Promise.all([page.waitForURL(origin + worlds[i][1], { waitUntil: 'domcontentloaded' }), mirror(page).tap()]);
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await mirror(page).waitFor();
      await poll(async () => await mirror(page).getAttribute('data-portal-ready') === 'true', 'Back restores HOME');
    }
    await page.close();
    console.log(`PASS ${width}: autonomous five worlds, visual lock, transition guard, one-tap routes, Back, overflow`);
  }
  const desktop = await tab({ viewport: { width: 1440, height: 1000 }, isMobile: false, hasTouch: false });
  await home(desktop);
  await mirror(desktop).hover();
  const signal = await mirror(desktop).getAttribute('data-reflection');
  await desktop.clock.runFor(30000);
  assert.equal(await mirror(desktop).getAttribute('data-reflection'), signal);
  await desktop.mouse.move(0, 0);
  await desktop.clock.runFor(6800);
  assert.notEqual(await mirror(desktop).getAttribute('data-reflection'), signal);
  for (const key of ['Enter', 'Space']) {
    await home(desktop);
    await mirror(desktop).focus();
    await desktop.clock.runFor(30000);
    assert.equal(await mirror(desktop).getAttribute('data-reflection'), 'natural');
    await Promise.all([desktop.waitForURL(origin + '/natural.html', { waitUntil: 'domcontentloaded' }), mirror(desktop).press(key)]);
  }
  await desktop.close();
  console.log('PASS desktop hover pause/resume, keyboard focus freeze, Enter/Space one-step entry');
  const reduced = await tab({ reducedMotion: 'reduce' });
  await reduced.goto(origin + '/', { waitUntil: 'domcontentloaded' });
  await poll(async () => await mirror(reduced).getAttribute('data-portal-ready') === 'true', 'Reduced initializes');
  await mirror(reduced).scrollIntoViewIfNeeded(); await wait(150);
  await reduced.clock.runFor(1);
  assert.equal(await mirror(reduced).getAttribute('data-phase'), 'stable');
  await reduced.clock.runFor(5501);
  assert.equal(await mirror(reduced).getAttribute('data-reflection'), 'moments');
  assert.equal(await mirror(reduced).getAttribute('data-phase'), 'stable');
  await Promise.all([reduced.waitForURL(origin + '/moments.html', { waitUntil: 'domcontentloaded' }), mirror(reduced).tap()]);
  await reduced.close();
  console.log('PASS reduced motion stepped cycle and one-tap entry');
  if (editor) {
    const page = await tab();
    await page.goto(origin + '/?edit=1', { waitUntil: 'domcontentloaded' });
    await page.clock.resume();
    await page.locator('.author-panel').waitFor();
    const piece = page.locator('[data-author-id="home-portal"]');
    const action = name => page.locator(`[data-action="${name}"]`);
    await piece.scrollIntoViewIfNeeded(); const b = await piece.boundingBox();
    await page.touchscreen.tap(b.x + b.width * .5, b.y + b.height * .5);
    assert.ok((await piece.getAttribute('class')).includes('author-selected'));
    assert.equal(await mirror(page).getAttribute('data-running'), 'false');
    const y = await piece.evaluate(el => el.offsetTop); await piece.press('ArrowDown');
    assert.ok(await piece.evaluate(el => el.offsetTop) > y);
    const size = page.locator('[data-field="size"]'); await size.focus(); await size.press('Home');
    for (let i = 0; i < 27; i++) await size.press('ArrowRight');
    await page.locator('[data-field="href"]').fill('/natural.html');
    await mirror(page).focus(); await mirror(page).press('Enter'); await mirror(page).press('Space');
    assert.equal(new URL(page.url()).search, '?edit=1');
    await action('duplicate').click(); assert.equal(await page.locator('[data-living-mirror]').count(), 2);
    await action('delete').click(); await action('undo').click(); await action('redo').click();
    const saved = page.waitForResponse(r => r.url().endsWith('/__author/save'));
    const reload = page.waitForNavigation({ waitUntil: 'domcontentloaded' });
    await action('save').click(); assert.equal((await saved).status(), 200); await reload;
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('.author-panel').waitFor();
    assert.equal(await mirror(page).getAttribute('href'), '/natural.html');
    assert.equal(JSON.parse(await readFile(manifest)).find(i => i.id === 'home-portal').mobile.width, 32);
    await page.close();
    console.log('PASS Studio selection, move, size, link, duplicate/delete/undo/redo, save/reload and navigation guard');
  }
  assert.deepEqual(errors, []);
} finally {
  if (editor) await writeFile(manifest, backup);
  await browser.close();
}