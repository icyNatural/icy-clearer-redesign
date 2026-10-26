import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'E:/Projects/chad-hamilton-portfolio/node_modules/playwright');
const origin = process.env.GAMING_TEST_ORIGIN || 'http://127.0.0.1:4347';
const snapshot = JSON.parse(await readFile(new URL('../public/gaming/data/public-snapshot.json', import.meta.url)));
const source = process.env.GAMING_SOURCE_EXPORT ? JSON.parse(await readFile(process.env.GAMING_SOURCE_EXPORT)) : null;
if (source) {
  for (const record of snapshot.collections.experiences) {
    const original = source.collections.experiences.find(r => r.id === record.id);
    for (const key of ['gameId','gameName','score','verdict','scores','platform','date']) assert.deepEqual(record[key], original[key], record.id + ': ' + key);
  }
  const box = { console }; vm.createContext(box);
  for (const file of ['core/util.js','domain/taste.js']) vm.runInContext(await readFile(new URL('../public/gaming/assets/js/' + file, import.meta.url), 'utf8'), box);
  const patterns = c => box.GOS.taste.computePatterns({ signals:c.signals, experiences:c.experiences, gamesById:Object.fromEntries(c.games.map(r=>[r.id,r])), now:snapshot.publishedAt });
  assert.deepEqual(JSON.parse(JSON.stringify(patterns(snapshot.collections))), JSON.parse(JSON.stringify(patterns(source.collections))), 'All Taste Atlas calculations match source at publication time');
}
const browser = await chromium.launch({ headless: true });
const errors = [], failed = [];
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.url().startsWith(origin + '/gaming/') && response.status() >= 400) failed.push(response.status() + ' ' + response.url()); });
  await page.addInitScript(() => {
    if (!location.pathname.startsWith('/gaming/')) return;
    // A public page must work even with persistence completely unavailable.
    Object.defineProperty(window, 'localStorage', { get() { throw Error('Public view touched browser localStorage'); } });
    Object.defineProperty(window, 'indexedDB', { get() { throw Error('Public view touched IndexedDB'); } });
  });
  for (const width of [360,390,430,1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin + '/gaming/?view=history');
    await page.waitForFunction(() => window.GOS?.gos.context().booted);
    assert.equal(await page.locator('#historyGamesList [data-history-key]').count(), 9);
    assert.equal(await page.locator('.tab.active').getAttribute('id'), 'history');
    assert.equal(await page.evaluate(() => GOS.gos.context().library.length), 9);
    assert.equal(await page.evaluate(() => GOS.gos.context().patterns.length), 25);
    assert.ok(await page.evaluate(() => GOS.gos.context().games.every(game => GOS.gos.context().graph.byId[game.id]?.name === game.name)), 'Exact stored names in discovery');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Overflow at ' + width);
    for (const record of snapshot.collections.experiences) {
      await page.locator(`[data-history-key="${record.id}"]`).click();
      await page.waitForTimeout(260);
      assert.equal(await page.locator('#resultGame').textContent(), record.gameName);
      assert.equal(await page.locator('#resultScore').textContent(), Number(record.score).toFixed(1));
      assert.ok(await page.locator('#resultGlyph svg').count());
      await page.goBack();
      assert.equal(await page.locator('.tab.active').getAttribute('id'), 'history');
    }
    await page.locator('[data-tab="atlas"]').click();
    assert.ok((await page.locator('#atlasSections').textContent()).length > 100);
    await page.locator('[data-tab="discover"]').click();
    await page.locator('[data-tab="feed"]').click();
    const blocked = await page.evaluate(async () => {
      const before = JSON.stringify(GOS.gos.context().experiences);
      let denied = 0;
      for (const call of [() => GOS.storage.put('experiences',{}), () => GOS.storage.importAll({}), () => GOS.gos.saveExperience({}), () => GOS.gos.clearExperiences()]) try { await call(); } catch { denied++; }
      return { denied, unchanged: before === JSON.stringify(GOS.gos.context().experiences) };
    });
    assert.deepEqual(blocked, { denied:4, unchanged:true });
    await page.reload();
    await page.waitForFunction(() => window.GOS?.gos.context().booted);
    assert.equal(await page.evaluate(() => GOS.gos.context().experiences.length), 9);
    console.log('PASS /gaming/ width ' + width + ': scores, glyphs, Atlas, navigation/Back, read-only, reload, no browser storage');
  }
  await page.goto(origin + '/');
  const entrance = page.locator('[data-author-id="home-games"]');
  assert.equal(await entrance.locator('.room-piece__link').getAttribute('href'), '/gaming/');
  assert.equal(await entrance.locator('[data-youtube]').getAttribute('data-youtube'), '68PbSDhCrxI');
  await entrance.locator('.room-piece__link').click({ force:true });
  await page.waitForURL('**/gaming/');
  await page.waitForFunction(() => window.GOS?.gos.context().booted);
  await page.goBack();
  assert.equal(new URL(page.url()).pathname, '/');
  assert.equal(await page.locator('.author-panel').count(), 0);
  console.log('PASS HOME Games /gaming/ click, Naraka preview, Back, normal HOME');
  assert.deepEqual(errors, []); assert.deepEqual(failed, []);
} finally { await browser.close(); }