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
  async function assertPreviews() {
    const previews = await page.locator('.artifact-preview:visible').evaluateAll(nodes => nodes.map(node => {
      const box = node.getBoundingClientRect();
      return { id: node.closest('figure').dataset.authorId || node.closest('figure').dataset.artifactRef, aspect: box.width / box.height, cue: !!node.querySelector('.artifact-play') };
    }));
    assert.ok(previews.length, 'video posters exist');
    for (const preview of previews) {
      const item = publicItems.find(item => item.id === preview.id);
      const aspect = Number(item.metadata?.aspect) || 16 / 9;
      assert.ok(Math.abs(preview.aspect - aspect) < .04, `${preview.id}: native preview aspect ${aspect}`);
      assert.ok(preview.cue, 'poster has a play cue');
    }
  }
  for (const width of [360, 390, 430, 768, 1440]) {
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
    assert.equal(clusters.length, 6, 'six signal clusters');
    assert.ok(Math.abs(clusters[3].y - clusters[5].y) < 20 && clusters[3].y > clusters[0].y, 'second row has three signals');
    assert.equal(await page.locator('video,iframe').count(), 0, 'no initial players');
    await assertPreviews();
    const initialPath = new URL(page.url()).pathname;
    for (const signal of ['PLAY', 'VOICE', 'OBSERVE', 'MAKE', 'ARCHIVE', 'NOW']) {
      await page.locator(`.signal-rail [data-signal-select="${signal}"]`).click();
      assert.equal(new URL(page.url()).pathname, initialPath, 'selection stays in place');
      assert.equal(await page.locator(`.signal-rail [data-signal-select="${signal}"]`).getAttribute('aria-pressed'), 'true');
      const visible = await page.locator('.signal-artifact:visible').evaluateAll(nodes => nodes.map(node => node.dataset.signals.split(' ')));
      assert.ok(visible.every(signals => signals.includes(signal)), 'only matching artifacts foreground');
      if (signal === 'PLAY' || signal === 'OBSERVE') {
        if (signal === 'PLAY') await assertPreviews();
        await page.locator('.signal-artifact:visible summary').first().click();
        assert.ok(await page.locator('.signal-cluster.is-active figcaption strong').first().evaluate(el => getComputedStyle(el).whiteSpace === 'normal' && parseFloat(getComputedStyle(el).fontSize) >= 14), 'selected metadata is readable');
        await page.screenshot({ path: join(output, `natural-${width}-${signal.toLowerCase()}-selected.png`), fullPage: true });
      }
      await page.goBack();
      assert.equal(await page.locator('[data-natural-field]').getAttribute('data-active-signal'), 'ALL', 'Back restores field');
    }
    await page.locator('.signal-rail [data-signal-select="PLAY"]').click();
    await page.locator('.signal-artifact:visible summary').first().click();
    assert.equal(await page.locator('.signal-artifact details[open]').count(), 1, 'optional depth opens');
    await page.locator('[data-signal-select="ALL"]').click();
    const localPreviews = page.locator('button[data-video-src]:visible');
    assert.ok(await localPreviews.count() >= 2, 'overlapping local previews available');
    const owner = await localPreviews.first().evaluate(el => el.closest('figure').dataset.authorId);
    await localPreviews.first().click();
    assert.equal(await page.locator('video').count(), 1, 'interaction creates one native player');
    const player = page.locator('video');
    assert.equal(await player.evaluate(el => el.controls && el.playsInline), true);
    assert.equal(await player.evaluate(el => el.closest('figure').dataset.authorId), owner, 'Studio selection identity preserved');
    await page.waitForFunction(() => { const video = document.querySelector('video'); return video && !video.paused; });
    await localPreviews.first().click();
    assert.equal(await page.locator('video').count(), 1, 'second preview replaces rather than accumulates players');
    assert.ok(await page.locator(`figure[data-author-id="${owner}"] button[data-video-src]`).count(), 'previous poster restored');
    await page.locator('.signal-rail [data-signal-select="PLAY"]').click();
    assert.equal(await page.locator('video').count(), 0, 'changing signal clears player');
    await page.locator('[data-signal-select="ALL"]').click();
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