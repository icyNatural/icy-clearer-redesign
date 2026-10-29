import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
const origin = process.env.GAMING_TEST_ORIGIN || 'http://127.0.0.1:4347';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const home = JSON.parse(await read('src/data/media/home.json'));
const natural = JSON.parse(await read('src/data/media/natural.json'));
for (const path of ['src/data/media/home.json', 'src/data/media/natural.json', 'public/gaming/data/public-snapshot.json']) {
  assert.deepEqual(JSON.parse(await read(path)), JSON.parse(execFileSync('git', ['show', 'HEAD:' + path], { encoding: 'utf8' })), path + ' unchanged');
}
assert.equal(await read('public/gaming/public-mode.js'), await read('tools/gaming-public.js'), 'published adapter matches publisher source');
const record = JSON.parse(await read('public/gaming/data/public-snapshot.json')).collections.experiences.find(item => item.gameId === 'game:user:naraka');
const items = [home.find(item => item.id === 'home-games'), ...['play-naraka-duel', 'play-halo-pistol', 'play-gears'].map(id => natural.find(item => item.id === id))];
const box = vm.createContext({});
vm.runInContext(await read('public/gaming/assets/js/domain/glyph.js'), box);
const expected = box.GOS.glyphEngine.geometry(record.scores, { score: record.score });
const output = process.env.GAMING_TEST_OUTPUT || fileURLToPath(new URL('../docs/gaming-highlights/', import.meta.url));
await mkdir(output, { recursive: true });
// Deterministic boundary test, not a claim of third-party streaming success.
// The real YouTube API is exercised separately by test-games-live.mjs.
const fakeAPI = `window.__players=[];window.YT={Player:class {
 constructor(host,options){this.options=options;this.time=options.playerVars.start;this.paused=0;this.played=0;this.destroyed=false;this.iframe=document.createElement('iframe');this.iframe.src='about:blank';host.replaceWith(this.iframe);window.__players.push(this);setTimeout(()=>options.events.onReady({target:this}),0);}
 getIframe(){return this.iframe;}getCurrentTime(){return this.time;}pauseVideo(){this.paused++;}playVideo(){this.played++;}destroy(){this.destroyed=true;this.iframe.remove();}
}};window.onYouTubeIframeAPIReady();`;
const browser = await chromium.launch({ headless: true });
const errors = [], failures = [];
try {
  for (const width of [360, 390, 430, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: true });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.url().startsWith(origin) && response.status() >= 400) failures.push(response.status() + ' ' + response.url()); });
    await context.route('https://www.youtube.com/iframe_api', route => route.fulfill({ contentType: 'text/javascript', body: fakeAPI }));
    await page.goto(origin + '/games.html');
    await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
    await page.waitForSelector('.gaming-rating-glyph svg');
    assert.equal(await page.locator('iframe,video').count(), 0, 'preview first');
    assert.equal(await page.locator('script[src*="youtube"]').count(), 0, 'API loads only on interaction');
    assert.equal(await page.locator('.score-link strong').textContent(), '9.3');
    assert.equal(await page.locator('.verdict').textContent(), record.verdict);
    assert.equal(await page.locator('.gaming-rating-glyph .experience-radar__outline').getAttribute('points'), expected.polygon);
    assert.equal(await page.locator('.gaming-rating-glyph svg').getAttribute('data-scale'), '0-10');
    assert.deepEqual(await page.locator('.gaming-rating-glyph stop').evaluateAll(nodes => nodes.map(n => n.getAttribute('stop-color'))), ['#7ee7ff', '#8f7bff', '#c65cff']);
    assert.equal(await page.locator('.radar-panel,.dimension-details,.clip-list,.more-gameplay').count(), 0, 'obsolete duplicates gone');
    assert.deepEqual(await page.locator('[data-highlight]').evaluateAll(nodes => nodes.map(n => new URL(n.href).searchParams.get('v'))), items.map(item => item.videoId));
    for (const [i, item] of items.entries()) {
      const preview = page.locator(i === 0 ? '.watch-preview' : `.highlight-card[data-highlight="${i}"] .highlight-preview`);
      const rect = await preview.boundingBox();
      assert.ok(Math.abs(rect.width / rect.height - item.metadata.aspect) < .04, 'native preview ratio ' + item.videoId);
    }
    const hero = await page.locator('.gameplay').boundingBox(), rail = await page.locator('.highlights').boundingBox(), take = await page.locator('.evaluation').boundingBox(), system = await page.locator('.system-entry').boundingBox();
    assert.ok(hero.y < 320 && rail.y >= hero.y + hero.height && take.y >= rail.y + rail.height && system.y > take.y + take.height, 'game → highlights → take → system');
    assert.ok((await page.locator('.score-link').boundingBox()).height < 70, 'compact score');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no overflow ' + width);
    // Decode the existing posters; reset BOTH scroll axes before evidence.
    for (const image of await page.locator('img').all()) { await image.scrollIntoViewIfNeeded(); await image.evaluate(node => node.decode()); }
    await page.locator('[data-highlight-rail]').evaluate(node => node.scrollTo({ left: 0, behavior: 'instant' }));
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: join(output, `page-${width}.jpg`), fullPage: true });
    if (width < 760) {
      await page.locator('[data-rail-step="1"]').click();
      await page.waitForFunction(() => document.querySelector('[data-highlight-rail]').scrollLeft > 100);
      await page.waitForTimeout(450);
      await page.locator('[data-rail-step="1"]').click(); await page.waitForTimeout(450);
      assert.equal(await page.locator('[data-rail-position]').textContent(), '4 / 4');
      // Real Chromium touch dispatch exercises native horizontal scrolling AND
      // vertical scroll passthrough, rather than calling the rail handler.
      await page.locator('[data-highlight-rail]').evaluate(node => node.scrollLeft = 0);
      await page.locator('[data-highlight-rail]').scrollIntoViewIfNeeded();
      const bounds = await page.locator('[data-highlight-rail]').boundingBox();
      const cdp = await context.newCDPSession(page);
      const touch = async (x, y, dx, dy) => {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * i / 8, y: y + dy * i / 8 }] }); await page.waitForTimeout(16); }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(450);
      };
      await touch(bounds.x + bounds.width - 30, bounds.y + 120, -180, 0);
      assert.ok(await page.locator('[data-highlight-rail]').evaluate(node => node.scrollLeft > 80), 'native horizontal swipe');
      const before = await page.evaluate(() => scrollY);
      const nextBounds = await page.locator('[data-highlight-rail]').boundingBox();
      await touch(nextBounds.x + 90, nextBounds.y + 160, 0, -120);
      assert.ok(await page.evaluate(y => scrollY > y + 30, before), 'rail does not block vertical page scroll');
      await cdp.detach();
    }
    await page.locator('.watch-preview').click();
    await page.waitForSelector('dialog[open] iframe');
    await page.waitForFunction(() => window.__players.at(-1).played > 0);
    assert.equal(new URL(page.url()).searchParams.get('highlight'), items[0].videoId);
    assert.equal(await page.locator('iframe').count(), 1);
    const dimensions = await page.locator('[data-viewer-media]').boundingBox();
    assert.ok(Math.abs(dimensions.width / dimensions.height - items[0].metadata.aspect) < .01, 'landscape stays landscape');
    await page.evaluate(() => { window.__players.at(-1).time = 18.75; });
    // Real touch starts inside the video edge; center/bottom still hit iframe.
    if (width < 700) {
      assert.ok(await page.locator('[data-viewer-media]').evaluate(node => {
        const r = node.getBoundingClientRect();
        return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.tagName === 'IFRAME'
          && document.elementFromPoint(r.x + 12, r.bottom - 24)?.tagName === 'IFRAME';
      }), 'YouTube center and bottom controls remain uncovered');
      const cdp = await context.newCDPSession(page);
      // Detaching the rail's CDP session resets Chromium touch emulation.
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
      const edge = await page.locator('.viewer-swipe-zone--right').boundingBox();
      assert.ok(edge, 'touch video edge is present');
      const x = edge.x + edge.width / 2, y = edge.y + edge.height / 2;
      const gesture = async (points, delay = 0, cancel = false) => {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        if (delay) await page.waitForTimeout(delay);
        for (const [dx, dy] of points) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx, y: y + dy }] });
        await cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
        assert.equal(await page.locator('[data-viewer-position]').textContent(), '1 / 4', 'rejected gestures do not navigate');
      };
      await gesture([[-20, 0]]);
      await gesture([[0, 30], [-90, 40]]);
      await gesture([[-100, 0]], 1100);
      await gesture([[-100, 0]], 0, true);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let i = 1; i <= 8; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 100 * i / 8, y }] });
        await page.waitForTimeout(16);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await cdp.detach();
    } else {
    // Desktop retains the existing matte/header gesture and keyboard support.
    const header = await page.locator('.viewer-header').boundingBox();
    await page.mouse.move(header.x + header.width * .7, header.y + 12); await page.mouse.down();
    await page.mouse.move(header.x + header.width * .25, header.y + 12, { steps: 8 }); await page.mouse.up();
    }
    await page.waitForFunction(() => window.__players.length === 2 && window.__players.at(-1).played > 0);
    assert.equal(await page.locator('[data-viewer-position]').textContent(), '2 / 4');
    assert.ok(await page.evaluate(() => window.__players[0].destroyed && window.__players[0].paused > 0));
    const vertical = await page.locator('[data-viewer-media]').boundingBox();
    assert.ok(Math.abs(vertical.width / vertical.height - .5625) < .01, 'Short remains vertical');
    assert.ok(await page.locator('[data-viewer-media]').evaluate(node => {
      const r = node.getBoundingClientRect();
      return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.tagName === 'IFRAME'
        && document.elementFromPoint(r.x + 12, r.bottom - 24)?.tagName === 'IFRAME';
    }), 'portrait YouTube center and bottom controls remain uncovered');
    await page.screenshot({ path: join(output, `viewer-${width}.jpg`) });
    for (const label of ['Next video', 'Next video']) await page.getByRole('button', { name: label, exact: true }).click();
    await page.waitForFunction(() => window.__players.at(-1).options.videoId === 'mdhgL77UL7Y' && window.__players.at(-1).played > 0);
    assert.equal(await page.locator('iframe').count(), 1, 'rapid changes leave one player');
    assert.equal(await page.locator('[data-viewer-position]').textContent(), '4 / 4');
    assert.ok(await page.getByRole('button', { name: 'Next video', exact: true }).isDisabled());
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    assert.ok(await page.evaluate(() => window.__players.at(-1).paused > 0), 'background pauses');
    await page.evaluate(() => { delete document.hidden; });
    await page.goBack();
    assert.equal(await page.locator('dialog[open]').count(), 0);
    assert.equal(await page.locator('iframe').count(), 0);
    assert.equal(await page.locator('.watch-preview').evaluate(node => node === document.activeElement), true, 'restore focus');
    await page.goForward();
    await page.waitForSelector('dialog[open] iframe');
    assert.equal(await page.locator('[data-viewer-position]').textContent(), '4 / 4', 'Forward retains media selection');
    await page.keyboard.press('Escape'); await page.waitForURL(origin + '/games.html');
    await page.locator('.watch-preview').click(); await page.waitForSelector('dialog[open] iframe');
    assert.equal(await page.evaluate(() => window.__players.at(-1).options.playerVars.start), 18, 'playback time retained on return');
    await page.getByRole('button', { name: 'Close highlight viewer' }).click(); await page.waitForURL(origin + '/games.html');
    await page.locator('.highlight-card').nth(1).scrollIntoViewIfNeeded();
    const saved = await page.evaluate(() => ({ y: scrollY, x: document.querySelector('[data-highlight-rail]').scrollLeft }));
    await page.locator('.highlight-card').nth(1).click(); await page.waitForSelector('dialog[open] iframe');
    await page.keyboard.press('ArrowRight'); await page.waitForFunction(() => window.__players.at(-1).options.videoId === 'mdhgL77UL7Y');
    await page.keyboard.press('Escape'); await page.waitForURL(origin + '/games.html');
    assert.deepEqual(await page.evaluate(() => ({ y: scrollY, x: document.querySelector('[data-highlight-rail]').scrollLeft })), saved, 'close returns to exact rail and page position');
    const evalURL = await page.locator('.take-links a').first().getAttribute('href');
    await page.locator('.take-links a').first().click();
    await page.waitForFunction(() => window.GOS?.gos?.context().booted && document.querySelector('.tab.active')?.id === 'results');
    assert.equal(new URL(page.url()).searchParams.get('experience'), record.id);
    assert.equal(await page.locator('#resultGame').textContent(), 'Naraka');
    assert.equal(await page.locator('#resultScore').textContent(), '9.3');
    assert.equal(await page.locator('#resultGlyph .experience-radar__outline').getAttribute('points'), expected.polygon);
    await page.reload(); await page.waitForFunction(() => window.GOS?.gos?.context().booted);
    assert.equal(await page.locator('#resultGame').textContent(), 'Naraka', 'evaluation deep link survives reload');
    await page.goBack(); await page.waitForURL(origin + '/games.html');
    await page.locator('.take-links a').last().click(); await page.waitForFunction(() => window.GOS?.gos?.context().booted);
    assert.equal(await page.locator('.tab.active').getAttribute('id'), 'history');
    assert.equal(await page.locator('[data-history-key]').count(), 9);
    await page.goBack(); await page.locator('.system-link').click(); await page.waitForFunction(() => window.GOS?.gos?.context().booted);
    assert.equal(new URL(page.url()).pathname, '/gaming/');
    await context.close();
    console.log(`PASS ${width}: authored sequence, native posters, rail touch + scroll, single-player lifecycle, swipe/keys, position/focus, Back/Forward, exact glyph, Naraka Results/reload, all ratings, Gaming OS`);
  }
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 900 } });
  const page = await context.newPage();
  await context.route('https://www.youtube.com/iframe_api', route => route.fulfill({ contentType: 'text/javascript', body: fakeAPI }));
  await page.goto(origin + '/games.html');
  await page.locator('[data-highlight-rail]').focus(); await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => document.querySelector('[data-rail-position]').textContent === '3 / 4');
  assert.equal(await page.locator('[data-rail-position]').textContent(), '3 / 4', 'reduced-motion rail moves without a smooth animation');
  assert.ok(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches));
  await page.goto(origin + '/games.html?highlight=ijLxbhyn7hI'); await page.waitForSelector('dialog[open] iframe');
  await page.reload(); await page.waitForSelector('dialog[open] iframe');
  await page.goBack(); await page.waitForURL(origin + '/games.html');
  assert.equal(await page.locator('dialog[open]').count(), 0, 'Back closes a deep link before leaving Gaming, including after reload');
  await page.goForward(); await page.waitForSelector('dialog[open] iframe');
  await page.keyboard.press('Escape'); await page.waitForURL(origin + '/games.html');
  assert.equal(await page.locator('dialog[open]').count(), 0, 'direct viewer link closes without leaving');
  await context.close();
  // A late network/API response must not resurrect a closed viewer.
  const delayed = await browser.newContext();
  const delayedPage = await delayed.newPage();
  let release;
  const released = new Promise(resolve => { release = resolve; });
  await delayed.route('https://www.youtube.com/iframe_api', async route => { await released; await route.fulfill({ contentType: 'text/javascript', body: fakeAPI }); });
  await delayedPage.goto(origin + '/games.html');
  await delayedPage.locator('.watch-preview').click();
  await delayedPage.getByRole('button', { name: 'Close highlight viewer' }).click();
  await delayedPage.waitForURL(origin + '/games.html');
  release(); await delayedPage.waitForFunction(() => !!window.YT);
  assert.equal(await delayedPage.locator('iframe').count(), 0, 'late API does not mount after close');
  await delayed.close();
  const unavailable = await browser.newContext();
  const unavailablePage = await unavailable.newPage();
  await unavailable.route('https://www.youtube.com/iframe_api', route => route.abort('failed'));
  await unavailablePage.goto(origin + '/games.html'); await unavailablePage.locator('.watch-preview').click();
  await unavailablePage.waitForFunction(() => document.querySelector('[data-viewer-status]').textContent.includes('unavailable'));
  assert.equal(await unavailablePage.locator('[data-viewer-source]').getAttribute('href'), items[0].metadata.canonicalUrl, 'direct canonical fallback');
  assert.equal(await unavailablePage.locator('iframe').count(), 0);
  await unavailable.close();
  const noJS = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await noJS.newPage(); await staticPage.goto(origin + '/games.html');
  assert.equal(await staticPage.locator('[data-highlight][href*="youtube.com/watch"]').count(), 4, 'all media remain normal links without JS');
  assert.equal(await staticPage.locator('.score-link strong').textContent(), '9.3');
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  console.log('PASS reduced motion, keyboard rail, direct viewer link, delayed API/close race, unavailable API fallback, no-JS links, unchanged manifests/snapshot, no page errors. Page screenshots: docs/gaming-highlights');
} finally { await browser.close(); }
