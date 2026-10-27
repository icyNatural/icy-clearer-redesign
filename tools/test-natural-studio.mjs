// Uses an existing author server. Restores the manifest and removes its upload.
import assert from 'node:assert/strict';
import { readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { localAuthor } from './local-author.mjs';

const { chromium } = await import(pathToFileURL(`${process.env.PLAYWRIGHT_PATH || 'E:/Projects/chad-hamilton-portfolio/node_modules/playwright'}/index.mjs`).href);

const origin = process.env.STUDIO_TEST_ORIGIN || 'http://localhost:4321';
const manifest = new URL('../src/data/media/natural.json', import.meta.url);
const uploads = new URL('../public/media/natural/', import.meta.url);
const original = await readFile(manifest);
const before = await readdir(uploads).catch(() => []);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
// The long-running Astro server may retain its startup-time plugin module.
// Exercise the actual current backend in an isolated ephemeral HTTP listener,
// while the existing Astro server continues serving the UI unchanged.
let middleware;
const plugin = localAuthor();
plugin.config({}, { mode: 'author' });
plugin.configureServer({ config: { root: fileURLToPath(new URL('../', import.meta.url)) }, middlewares: { use(handler) { middleware = handler; } }, moduleGraph: { invalidateAll() {} } });
const backend = createServer((req, res) => middleware(req, res, () => { res.statusCode = 404; res.end(); }));
await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
const backendOrigin = `http://127.0.0.1:${backend.address().port}`;
await page.route('**/__author/**', async route => {
  const request = route.request();
  const response = await fetch(`${backendOrigin}${new URL(request.url()).pathname}`, { method: request.method(), headers: { 'Content-Type': 'application/json', 'X-Icy-Author': '1', Origin: backendOrigin }, body: request.postData() });
  await route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() });
});
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('dialog', dialog => dialog.accept());
const button = action => page.locator(`.author-panel [data-action="${action}"]`);
const field = name => page.locator(`.author-panel [data-field="${name}"]`);
try {
  await page.goto(`${origin}/natural.html?edit=1`);
  await page.waitForSelector('.author-panel');
  const initial = JSON.parse(original).filter(item => item.kind !== 'native' && !item.deleted).length;
  assert.equal(await page.locator('.signal-artifact[data-author-id]').count(), initial);
  await button('text').click();
  const id = await page.locator('.author-selected').getAttribute('data-author-id');
  assert.equal(await field('signals').inputValue(), 'NOW');
  assert.equal(await field('visibility').inputValue(), 'public');
  await field('text').fill('Studio integration test');
  await field('signals').fill('VOICE, ARCHIVE');
  await field('tags').fill('test, memory');
  await field('era').selectOption('music era');
  await field('temporal').fill('Around 2016');
  await field('date').fill('2016-06-01');
  await field('visibility').selectOption('draft');
  await field('featured').check();
  await field('playOrder').fill('7');
  await button('duplicate').click();
  assert.equal(await field('signals').inputValue(), 'VOICE, ARCHIVE');
  await button('delete').click();
  assert.equal(await page.locator('.signal-artifact[data-author-id]').count(), initial + 1);
  const save = page.waitForResponse(response => response.url().endsWith('/__author/save'));
  await button('save').click();
  assert.equal((await save).status(), 200);
  await page.waitForTimeout(1500);
  await page.waitForSelector('.author-panel');
  const saved = JSON.parse(await readFile(manifest));
  const item = saved.find(item => item.id === id);
  assert.deepEqual(item.signals, ['VOICE','ARCHIVE']);
  assert.deepEqual(item.tags, ['test','memory']);
  assert.equal(item.date, '2016-06-01'); assert.equal(item.era, 'music era'); assert.equal(item.temporal, 'Around 2016');
  assert.equal(item.visibility, 'draft'); assert.equal(item.featured, true); assert.equal(item.playOrder, 7);
  assert.equal(await page.locator(`figure[data-author-id="${id}"]`).count(), 1);
  // Local URL resolution and replacement use the same field-managed install path.
  await button('add').click(); await button('url').click();
  await page.locator('[data-source-url]').fill('/media/natural/cloth-study.svg');
  await button('fetch').click(); await button('accept-source').waitFor({ state: 'visible' });
  await button('accept-source').click();
  assert.equal(await field('signals').inputValue(), 'NOW');
  await button('replace').click(); await button('url').click();
  await page.locator('[data-source-url]').fill('/media/natural/cloth-study.svg');
  await button('fetch').click(); await button('accept-source').waitFor({ state: 'visible' }); await button('accept-source').click();
  assert.equal(await field('visibility').inputValue(), 'public');
  await button('add').click();
  await page.locator('input[type="file"]').setInputFiles({ name: 'studio-test.gif', mimeType: 'image/gif', buffer: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64') });
  await page.waitForFunction(() => document.querySelector('.author-selected img')?.getAttribute('src')?.endsWith('.gif'));
  assert.equal(await field('signals').inputValue(), 'NOW');
  assert.equal(await page.locator('.author-selected').evaluate(el => !!el.closest('.signal-artifacts')), true);
  assert.deepEqual(errors, []);
  console.log('Natural Studio hydrate/text/metadata/duplicate/delete/save/reload/URL/replace/upload passed.');
} finally {
  await browser.close();
  await new Promise(resolve => backend.close(resolve));
  await writeFile(manifest, original);
  for (const name of await readdir(uploads).catch(() => [])) if (!before.includes(name)) await rm(new URL(name, uploads));
}