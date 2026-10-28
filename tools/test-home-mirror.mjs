// Natural-only portal checks, including the existing Local Studio controls.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
const origin = process.env.HOME_MIRROR_TEST_ORIGIN || 'http://localhost:4321';
const editor = process.env.HOME_MIRROR_TEST_EDITOR === '1';
assert.ok(!editor || ['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const manifest = resolve('src/data/media/home.json');
const backup = await readFile(manifest);
const output = resolve(process.env.HOME_MIRROR_TEST_OUTPUT || process.env.TEMP || '.', 'icy-home-portal');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
async function tab(options = {}) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ...options });
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  return page;
}
const mirror = page => page.locator('[data-living-mirror]').first();
async function home(page) {
  await page.goto(origin + '/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('[data-living-mirror]')?.dataset.portalReady === 'true');
  await mirror(page).scrollIntoViewIfNeeded();
}
try {
  for (const width of [360, 390, 430, 1440]) {
    const page = await tab({ viewport: { width, height: 844 } });
    await home(page);
    assert.equal(await mirror(page).getAttribute('href'), '/natural.html');
    assert.equal(await mirror(page).getAttribute('data-destination'), '/natural.html');
    assert.equal(await mirror(page).getAttribute('data-reflection'), 'natural');
    assert.equal(await mirror(page).getAttribute('data-running'), 'false');
    assert.equal(await mirror(page).getAttribute('aria-label'), 'Natural portal — enter');
    assert.match(await mirror(page).innerText(), /NATURAL\s+ENTER →/);
    await page.clock.runFor(60000);
    assert.equal(await mirror(page).getAttribute('data-reflection'), 'natural', 'portal never cycles back to old worlds');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await mirror(page).tap();
    await page.waitForURL('**/natural.html');
    await page.goBack();
    await mirror(page).waitFor();
    for (const key of ['Enter', 'Space']) {
      await mirror(page).focus();
      await mirror(page).press(key);
      await page.waitForURL('**/natural.html');
      await page.goBack();
    }
    await page.close();
    console.log(`PASS ${width}: stable Natural-only portal, one-tap and Enter/Space, Back, no overflow`);
  }
  const reduced = await tab({ reducedMotion: 'reduce' });
  await home(reduced);
  await reduced.clock.runFor(60000);
  assert.equal(await mirror(reduced).getAttribute('data-phase'), 'stable');
  assert.equal(await mirror(reduced).getAttribute('href'), '/natural.html');
  await reduced.close();
  console.log('PASS reduced motion retains stable Natural destination');
  if (editor) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/?edit=1', { waitUntil: 'domcontentloaded' });
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
    await action('save').click(); assert.equal((await saved).status(), 200);
    // HMR and Studio can both initiate a reload. Verify the saved revision
    // reaches the hydrated page instead of racing the first navigation event.
    const revision = createHash('sha256').update(await readFile(manifest)).digest('hex');
    await page.waitForFunction(revision => document.querySelector('[data-media-room="home"]')?.dataset.revision === revision && document.querySelector('.author-panel'), revision);
    await page.reload({ waitUntil: 'networkidle' }); await page.locator('.author-panel').waitFor();
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
