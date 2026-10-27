import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
const origin = process.env.NATURAL_TEST_ORIGIN || 'http://localhost:4321';
const items = JSON.parse(await readFile(new URL('../src/data/media/natural.json', import.meta.url)));
const publicItems = items.filter(item => !item.deleted && item.kind !== 'native' && item.kind !== 'placeholder' && item.curated !== false && (!item.visibility || item.visibility === 'public'));
const output = join(tmpdir(), 'icy-field-validation');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [360, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin + '/natural.html');
    await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}`);
    const ids = await page.locator('.signal-artifact[data-author-id]:visible').evaluateAll(nodes => nodes.map(node => node.dataset.authorId));
    assert.equal(new Set(ids).size, ids.length, 'no duplicate live artifacts');
    assert.ok(ids.every(id => publicItems.some(item => item.id === id)), 'only public curated artifacts shown');
    const clusters = await page.locator('.signal-cluster').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right }; }));
    assert.ok(Math.abs(clusters[0].y - clusters[2].y) < 20, 'same three-across cluster composition at every width');
    assert.ok(clusters.every(box => box.x >= 0 && box.right <= width), 'clusters fit without clipping');
    const initialPath = new URL(page.url()).pathname;
    for (const signal of ['PLAY', 'VOICE', 'OBSERVE', 'MAKE', 'ARCHIVE', 'NOW']) {
      await page.locator(`.signal-rail [data-signal-select="${signal}"]`).click();
      assert.equal(new URL(page.url()).pathname, initialPath, 'selection stays in place');
      assert.equal(await page.locator(`.signal-rail [data-signal-select="${signal}"]`).getAttribute('aria-pressed'), 'true');
      const visible = await page.locator('.signal-artifact:visible').evaluateAll(nodes => nodes.map(node => node.dataset.signals.split(' ')));
      assert.ok(visible.every(signals => signals.includes(signal)), 'only matching artifacts foreground');
      await page.goBack();
      assert.equal(await page.locator('[data-natural-field]').getAttribute('data-active-signal'), 'ALL', 'Back restores field');
    }
    await page.locator('[data-signal-select="ALL"]').click();
    await page.locator('.signal-artifact summary').first().click();
    assert.equal(await page.locator('.signal-artifact details[open]').count(), 1, 'optional depth opens');
    const paths = await page.locator('img').evaluateAll(nodes => [...new Set(nodes.map(node => node.getAttribute('src')))]);
    for (const path of paths.filter(path => path?.startsWith('/'))) assert.equal((await page.request.get(origin + path)).status(), 200, `real media exists: ${path}`);
    assert.equal(await page.locator('video:not([preload="none"])').count(), 0, 'videos deferred');
    assert.equal(await page.locator('.author-panel').count(), 0);
    await page.screenshot({ path: join(output, `natural-${width}.png`), fullPage: true });
    console.log(`PASS Natural ${width}: composition, unique public artifacts, six lenses, ALL, depth, real assets, lazy video`);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.ok(await page.locator('.signal-cluster').first().evaluate(el => parseFloat(getComputedStyle(el).transitionDuration) < .001), 'reduced motion disables meaningful transitions');
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
console.log(`Screenshots: ${output}`);