import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
const origin = process.env.NATURAL_TEST_ORIGIN || 'http://localhost:4321';
const items = JSON.parse(await readFile(new URL('../src/data/media/natural.json', import.meta.url)));
const publicItems = items.filter(item => !item.deleted && item.kind !== 'native' && item.kind !== 'placeholder' && item.curated !== false && (!item.visibility || item.visibility === 'public'));
const output = process.env.NATURAL_TEST_OUTPUT || join(tmpdir(), 'icy-field-validation');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  const videoRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/\.mp4(?:[?#]|$)/.test(request.url())) videoRequests.push(request.url()); });
  for (const width of [360, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const beforePreviewRequests = videoRequests.length;
    await page.goto(origin + '/natural.html');
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}`);
    const ids = await page.locator('.signal-artifact[data-author-id]:visible').evaluateAll(nodes => nodes.map(node => node.dataset.authorId));
    assert.equal(new Set(ids).size, ids.length, 'no duplicate live artifacts');
    assert.ok(ids.every(id => publicItems.some(item => item.id === id)), 'only public curated artifacts shown');
    const clusters = await page.locator('.signal-cluster').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right }; }));
    assert.ok(Math.abs(clusters[0].y - clusters[2].y) < 20, 'same three-across cluster composition at every width');
    assert.ok(clusters.every(box => box.x >= 0 && box.right <= width), 'clusters fit without clipping');
    assert.equal(await page.locator('.signal-cluster:visible').count(), 6, 'six signal windows in ALL');
    assert.equal(await page.locator('video,iframe').count(), 0, 'ALL is preview-first without duplicate players');
    assert.equal(videoRequests.length, beforePreviewRequests, 'no full video requested before interaction');
    if (width <= 430) {
      assert.ok(await page.locator('.signal-cluster').evaluateAll(nodes => nodes.every(node => node.getBoundingClientRect().height < 250)), 'compact windows, including empty forming signals');
      assert.ok(await page.locator('.signal-head strong').evaluateAll(nodes => nodes.every(node => node.scrollWidth <= node.clientWidth + 1)), 'signal labels fit');
    }
    const checkAspects = async () => {
      const previews = await page.locator('.artifact-preview:visible').evaluateAll(nodes => nodes.map(node => {
        const r = node.getBoundingClientRect();
        return { ratio: r.width / r.height, expected: parseFloat(getComputedStyle(node.parentElement).getPropertyValue('--artifact-aspect')) };
      }));
      assert.ok(previews.length > 0);
      for (const preview of previews) assert.ok(Math.abs(preview.ratio - preview.expected) < .03, 'preview respects actual media aspect');
    };
    await checkAspects();
    await page.screenshot({ path: join(output, `natural-${width}.jpg`), fullPage: true, quality: 85 });
    await page.locator('[data-signal-cluster="NOW"] [data-play-natural-video]').click();
    assert.equal(await page.locator('[data-natural-field]').getAttribute('data-active-signal'), 'NOW', 'native preview opens its richer signal before playback');
    assert.equal(await page.locator('video').count(), 1, 'overlapping identity opens one actual player');
    await page.goBack();
    assert.equal(await page.locator('video').count(), 0);
    const initialPath = new URL(page.url()).pathname;
    for (const signal of ['PLAY', 'VOICE', 'OBSERVE', 'MAKE', 'ARCHIVE', 'NOW']) {
      await page.locator(`.signal-rail [data-signal-select="${signal}"]`).click();
      assert.equal(new URL(page.url()).pathname, initialPath, 'selection stays in place');
      assert.equal(await page.locator(`.signal-rail [data-signal-select="${signal}"]`).getAttribute('aria-pressed'), 'true');
      const visible = await page.locator('.signal-artifact:visible').evaluateAll(nodes => nodes.map(node => node.dataset.signals.split(' ')));
      assert.ok(visible.every(signals => signals.includes(signal)), 'only matching artifacts foreground');
      if (['PLAY','OBSERVE','NOW'].includes(signal)) await checkAspects();
      if (signal === 'PLAY') {
        const youtube = publicItems.find(item => item.kind === 'youtube' && item.metadata?.aspect > 1);
        const link = page.locator(`[data-author-id="${youtube.id}"] .artifact-video-preview`);
        assert.equal(await link.getAttribute('href'), youtube.metadata.canonicalUrl);
        assert.equal(await link.getAttribute('target'), '_blank', 'YouTube retains canonical open/play behavior');
        const videoItem = publicItems.find(item => item.kind === 'video');
        const host = page.locator(`[data-author-id="${videoItem.id}"]`);
        await host.locator('[data-play-natural-video]').click();
        assert.equal(await page.locator('video').count(), 1, 'interaction mounts exactly one native player');
        assert.equal(await host.locator('video').getAttribute('src'), videoItem.src);
        assert.equal(await host.locator('video').getAttribute('controls'), '');
        assert.equal(await host.locator('video').getAttribute('playsinline'), '');
        await page.locator('.signal-artifact summary').first().click();
        assert.equal(await page.locator('.signal-artifact details[open]').count(), 1, 'selected metadata opens');
        await page.screenshot({ path: join(output, `natural-play-${width}.jpg`), fullPage: true, quality: 85 });
      }
      await page.goBack();
      assert.equal(await page.locator('[data-natural-field]').getAttribute('data-active-signal'), 'ALL', 'Back restores field');
      assert.equal(await page.locator('video,iframe').count(), 0, 'Back releases playback and restores poster previews');
    }
    await page.locator('[data-signal-select="ALL"]').click();
    const paths = await page.locator('img').evaluateAll(nodes => [...new Set(nodes.map(node => node.getAttribute('src')))]);
    for (const path of paths.filter(path => path?.startsWith('/'))) assert.equal((await page.request.get(origin + path)).status(), 200, `real media exists: ${path}`);
    assert.equal(await page.locator('video:not([preload="none"])').count(), 0, 'videos deferred');
    assert.equal(await page.locator('.author-panel').count(), 0);
    console.log(`PASS Natural ${width}: six compact windows, native aspect previews, selected metadata/playback, canonical YouTube links, one player, Back, real assets, no overflow`);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.ok(await page.locator('.signal-cluster').first().evaluate(el => parseFloat(getComputedStyle(el).transitionDuration) < .001), 'reduced motion disables meaningful transitions');
  assert.deepEqual(errors, []);
  assert.ok(videoRequests.length > 0, 'actual native media is requested following interaction');
} finally { await browser.close(); }
console.log(`Screenshots: ${output}`);
