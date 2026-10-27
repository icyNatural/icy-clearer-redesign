// Read-only regression test; safe alongside HOME work, never writes manifests.
// MOMENTS_TEST_ORIGIN=http://localhost:4347 PLAYWRIGHT_PATH=<existing playwright>
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const origin = process.env.MOMENTS_TEST_ORIGIN || 'http://localhost:4347';
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [360, 390, 430]) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}/moments.html`, { waitUntil: 'networkidle' });
  const ids = await page.locator('[data-moments-content]').evaluate(el => JSON.parse(el.textContent).filter(item => item.kind === 'image').map(item => item.id));
  assert.ok(ids.length > 1, 'requires at least two existing Moments photos (no fixtures written)');
  await page.locator('[data-moment-open]').first().click();
  const dialog = page.locator('.moment-detail');
  await dialog.waitFor({ state: 'visible' });
  const current = () => page.evaluate(() => new URLSearchParams(location.hash.slice(1)).get('moment'));
  async function agreement() {
    const result = await page.evaluate(() => {
      const items = JSON.parse(document.querySelector('[data-moments-content]').textContent).filter(item => item.kind === 'image');
      const id = new URLSearchParams(location.hash.slice(1)).get('moment');
      const index = items.findIndex(item => item.id === id);
      const item = items[index];
      const value = field => item.overrides?.[field] ?? item[field] ?? item.metadata?.[field] ?? '';
      const image = document.querySelector('.moment-detail__image');
      const metadata = document.querySelector('.moment-detail__metadata');
      return {
        count: document.querySelector('[data-detail-count]').textContent,
        expectedCount: `${index + 1} / ${items.length}`,
        src: image.getAttribute('src'), expectedSrc: item.src,
        alt: image.alt, expectedAlt: value('alt') || value('title'),
        title: metadata.querySelector('h2')?.textContent || '', expectedTitle: value('title'),
        texts: Array.from(metadata.children, el => el.textContent),
        expectedTexts: [value('title'), value('label'), value('description'), [item.date, item.group].filter(Boolean).join(' · '), item.note].filter(Boolean).map(text => text.replaceAll('Photogression', 'Photogression ↗')),
        overflow: document.documentElement.scrollWidth > innerWidth + 1 || document.querySelector('.moment-detail').scrollWidth > document.querySelector('.moment-detail').clientWidth + 1,
      };
    });
    assert.equal(result.count, result.expectedCount, 'counter agrees with current item');
    assert.equal(result.src, result.expectedSrc, 'image agrees with current item');
    assert.equal(result.alt, result.expectedAlt, 'alt agrees with current item');
    assert.equal(result.title, result.expectedTitle, 'heading agrees with current item');
    assert.deepEqual(result.texts.slice(0, result.expectedTexts.length), result.expectedTexts, 'metadata agrees with current item');
    assert.equal(result.overflow, false, `no page or dialog horizontal overflow at ${width}`);
  }
  await agreement();
  const start = await current();
  const initialState = await page.evaluate(() => ({ state: history.state, length: history.length }));
  const expected = direction => ids[(ids.indexOf(start) + direction + ids.length) % ids.length];
  async function gesture({ selector = '.moment-detail__image', dx = -110, dy = 5, pointerType = 'touch', cancel = false, primary = true, verticalFirst = false } = {}) {
    await page.locator(selector).evaluate((el, options) => {
      const { dx, dy, pointerType, cancel, primary, verticalFirst } = options;
      const emit = (type, x, y) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, pointerType, isPrimary: primary, clientX: x, clientY: y }));
      emit('pointerdown', 220, 200);
      if (verticalFirst) emit('pointermove', 222, 225);
      emit('pointermove', 220 + dx, 200 + dy);
      emit(cancel ? 'pointercancel' : 'pointerup', 220 + dx, 200 + dy);
    }, { dx, dy, pointerType, cancel, primary, verticalFirst });
  }
  await gesture();
  assert.equal(await current(), expected(1), 'left touch swipe uses Next order');
  await gesture({ dx: 110 });
  assert.equal(await current(), start, 'right touch swipe uses Previous order');
  for (const options of [
    { dx: -49 }, { dx: -80, dy: 70 }, { dx: 0, dy: 100 },
    { pointerType: 'mouse' }, { pointerType: 'pen' }, { cancel: true },
    { primary: false }, { verticalFirst: true },
    { selector: '.moment-detail__metadata' }, { selector: '.moment-detail__bar' },
  ]) {
    await gesture(options);
    assert.equal(await current(), start, `does not navigate: ${JSON.stringify(options)}`);
  }
  // Real browser touch input checks native scrolling / pointer cancellation, not just handlers.
  const session = await context.newCDPSession(page);
  async function nativeSwipe(x1, y1, x2, y2) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x1, y: y1 }] });
    for (let i = 1; i <= 8; i++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x1 + (x2 - x1) * i / 8, y: y1 + (y2 - y1) * i / 8 }] });
      await page.waitForTimeout(20);
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(150);
  }
  await nativeSwipe(300, 300, 100, 305);
  assert.equal(await current(), expected(1), 'native left touch navigates');
  await nativeSwipe(100, 300, 300, 305);
  assert.equal(await current(), start, 'native right touch navigates');
  for (const direction of [1, 1, 1, -1, -1, -1]) {
    const before = await current();
    await nativeSwipe(direction > 0 ? 300 : 100, 300, direction > 0 ? 100 : 300, 305);
    assert.equal(await current(), ids[(ids.indexOf(before) + direction + ids.length) % ids.length], 'repeated native swipe advances exactly once');
    await agreement();
  }
  assert.match(await page.locator('.moment-detail__image').evaluate(el => getComputedStyle(el).touchAction), /pan-y/, 'photo permits native vertical pan');
  // Guarantee scrollable metadata independently of the current author-owned content.
  await page.locator('.moment-detail__metadata').evaluate(el => { el.style.minHeight = '1000px'; });
  await nativeSwipe(200, 500, 202, 200);
  assert.equal(await current(), start, 'native vertical gesture does not navigate');
  await page.waitForFunction(() => document.querySelector('.moment-detail').scrollTop > 0, { timeout: 3000 });
  await dialog.evaluate(el => { el.scrollTop = 0; });
  await page.locator('[data-detail="next"]').click();
  assert.equal(await current(), expected(1), 'Next button unchanged');
  await page.keyboard.press('ArrowLeft');
  assert.equal(await current(), start, 'keyboard Previous unchanged');
  assert.deepEqual(await page.evaluate(() => ({ state: history.state, length: history.length })), initialState, 'swipes and controls preserve overlay history');
  // Boundary wrap uses exactly the existing navigation helper.
  await page.evaluate(id => { location.hash = `moment=${encodeURIComponent(id)}`; }, ids[0]);
  await page.waitForFunction(id => document.querySelector('[data-detail-count]').textContent.startsWith('1 /') && location.hash.includes(encodeURIComponent(id)), ids[0]);
  await gesture({ dx: 110 });
  assert.equal(await current(), ids.at(-1), 'right swipe wraps first to last');
  await gesture();
  assert.equal(await current(), ids[0], 'left swipe wraps last to first');
  await page.evaluate(() => document.body.classList.add('is-authoring'));
  await gesture();
  assert.equal(await current(), ids[0], 'author mode disables swipe even on an already-open dialog');
  await page.evaluate(() => document.body.classList.remove('is-authoring'));
  await page.locator('[data-detail="close"]').click();
  await dialog.waitFor({ state: 'hidden' });
  // A fresh route avoids the intentional hash entry added by the wrap test.
  await page.goto(`${origin}/moments.html`, { waitUntil: 'networkidle' });
  const opener = page.locator('[data-moment-open]').first();
  for (const action of ['escape', 'back']) {
    await opener.click();
    await dialog.waitFor({ state: 'visible' });
    await gesture();
    if (action === 'escape') await page.keyboard.press('Escape');
    else await page.goBack();
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await opener.evaluate(el => document.activeElement === el), true, `${action} restores opener focus`);
    assert.equal(await page.evaluate(() => location.hash), '', `${action} restores collection URL`);
    assert.equal(await page.evaluate(() => document.body.style.overflow), '', `${action} restores body scrolling`);
  }
  // Fresh direct links have no opener/history-overlay state; close must not leave the route.
  const direct = await context.newPage();
  direct.on('pageerror', error => errors.push(error.message));
  await direct.goto(`${origin}/moments.html#moment=${encodeURIComponent(ids[1])}`, { waitUntil: 'networkidle' });
  await direct.locator('.moment-detail').waitFor({ state: 'visible' });
  assert.equal(await direct.locator('.moment-detail__image').getAttribute('src'), await direct.locator('[data-moments-content]').evaluate(el => JSON.parse(el.textContent).filter(item => item.kind === 'image')[1].src), 'direct open renders requested image');
  assert.equal(await direct.locator('.moment-detail').evaluate(el => el.contains(document.activeElement)), true, 'direct open places focus inside dialog');
  await direct.keyboard.press('Escape');
  await direct.locator('.moment-detail').waitFor({ state: 'hidden' });
  assert.equal(new URL(direct.url()).pathname, '/moments.html', 'direct close stays on Moments');
  assert.equal(new URL(direct.url()).hash, '', 'direct close removes moment hash');
  assert.equal(await direct.evaluate(() => document.body.style.overflow), '', 'direct close restores scrolling');
  assert.equal(await direct.locator('.moment-detail').evaluate(el => el.contains(document.activeElement)), false, 'direct close releases dialog focus');
  await direct.close();
  await page.goto(`${origin}/moments.html?edit=1`, { waitUntil: 'networkidle' });
  await page.waitForSelector('body.is-authoring');
  await page.locator('[data-moment-open]').first().dispatchEvent('click');
  assert.equal(await dialog.evaluate(el => el.open), false, 'author mode never opens public lightbox');
  assert.deepEqual(errors, [], 'no browser errors');
  console.log(`PASS Moments ${width}: repeated native swipes, counter/image/metadata, pan, guards, wrap, history/focus/direct open, no overflow`);
  await context.close();
  }
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await desktop.newPage();
  await page.goto(`${origin}/moments.html`, { waitUntil: 'networkidle' });
  const ids = await page.locator('[data-moments-content]').evaluate(el => JSON.parse(el.textContent).filter(item => item.kind === 'image').map(item => item.id));
  const opener = page.locator('[data-moment-open]').first();
  await opener.click();
  const current = () => page.evaluate(() => new URLSearchParams(location.hash.slice(1)).get('moment'));
  const start = await current();
  const next = ids[(ids.indexOf(start) + 1) % ids.length];
  await page.locator('[data-detail="next"]').click();
  assert.equal(await current(), next, 'desktop Next button');
  await page.locator('[data-detail="previous"]').click();
  assert.equal(await current(), start, 'desktop Previous button');
  await page.keyboard.press('ArrowRight');
  assert.equal(await current(), next, 'desktop ArrowRight');
  await page.keyboard.press('ArrowLeft');
  assert.equal(await current(), start, 'desktop ArrowLeft');
  const box = await page.locator('.moment-detail__image').boundingBox();
  await page.mouse.move(box.x + box.width * .75, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .25, box.y + 100, { steps: 8 });
  await page.mouse.up();
  assert.equal(await current(), start, 'real desktop mouse drag does not navigate');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.querySelector('.moment-detail').scrollWidth <= document.querySelector('.moment-detail').clientWidth + 1), true, 'desktop has no horizontal overflow');
  await page.keyboard.press('Escape');
  await page.locator('.moment-detail').waitFor({ state: 'hidden' });
  assert.equal(await opener.evaluate(el => document.activeElement === el), true, 'desktop Escape restores focus');
  await desktop.close();
  console.log('PASS Moments desktop: buttons, arrow keys, mouse drag ignored, Escape/focus, no overflow');
} finally {
  await browser.close();
}