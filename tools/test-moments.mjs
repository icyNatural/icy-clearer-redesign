// Run against an isolated author server. No dependencies are installed by this test.
// MOMENTS_TEST_ORIGIN=http://localhost:4321; PLAYWRIGHT_PATH may override discovery.
import { createRequire } from 'node:module';
import { readFile, writeFile, readdir, mkdir, mkdtemp, cp, rm, stat } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
async function findPlaywright() {
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
      if (pkg.chromium) return { ...pkg, path };
    } catch (error) {
      if (process.env.PLAYWRIGHT_PATH) throw error;
    }
  }
  throw new Error('No installed Playwright found. Set PLAYWRIGHT_PATH to an existing external package; do not install dependencies.');
}
const { chromium, path: playwrightPath } = await findPlaywright();
console.log(`Playwright: ${playwrightPath}`);
const origin = new URL(process.env.MOMENTS_TEST_ORIGIN || 'http://localhost:4321').origin;
const route = `${origin}/moments.html`;
const manifest = resolve(root, 'src/data/media/moments.json');
const uploads = resolve(root, 'public/media/moments');
const exists = async path => { try { await stat(path); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } };
async function filesUnder(path) {
  if (!(await exists(path))) return [];
  const entries = await readdir(path, { withFileTypes: true });
  return (await Promise.all(entries.map(e => e.isDirectory() ? filesUnder(join(path, e.name)) : [join(path, e.name)]))).flat();
}
async function protectedSnapshot() {
  const paths = [
    'src/pages/index.astro', 'src/pages/natural.astro', 'src/pages/world.astro',
    'src/pages/clear.astro', 'src/pages/worlds.astro',
    'src/components/home', 'src/styles/home-scrapbook.css',
    ...['home', 'natural', 'clear', 'worlds', 'home-interest-archive'].map(room => `src/data/media/${room}.json`),
    ...['home', 'natural', 'clear', 'worlds'].map(room => `public/media/${room}`),
  ];
  const result = {};
  for (const relative of paths) {
    const path = resolve(root, relative);
    if (!(await exists(path))) { result[path] = null; continue; }
    const files = (await stat(path)).isDirectory() ? await filesUnder(path) : [path];
    result[path] = 'present';
    for (const file of files.sort()) result[file] = createHash('sha256').update(await readFile(file)).digest('hex');
  }
  return result;
}
// Preflight before touching project data, including when the feature/server is not ready.
const probe = await fetch(route);
assert.equal(probe.status, 200, `Moments is not ready at ${route}; start an author server first`);
assert.ok(await exists(manifest), `Missing ${manifest}; wait for Moments implementation`);
const originalManifest = await readFile(manifest);
const protectedBefore = await protectedSnapshot();
const hadUploads = await exists(uploads);
const backup = await mkdtemp(join(tmpdir(), 'icy-moments-backup-'));
let browser;
let backupReady = false;
try {
  await writeFile(join(backup, 'moments.json'), originalManifest);
  if (hadUploads) await cp(uploads, join(backup, 'uploads'), { recursive: true });
  backupReady = true;
  browser = await chromium.launch({ headless: true,
    ...(process.env.MOMENTS_TEST_EXECUTABLE ? { executablePath: process.env.MOMENTS_TEST_EXECUTABLE } : {}),
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  const room = page.locator('[data-media-room="moments"]');
  const items = room.locator('[data-author-id]');
  const action = name => page.locator(`.author-panel [data-action="${name}"]`);
  const field = name => page.locator(`.author-panel [data-field="${name}"]`);
  const clean = async () => assert.equal(await page.locator('.author-panel,.author-handle,.author-add-spot,.author-selected').count(), 0, 'normal mode has no editor');
  const countIs = async count => { await page.waitForFunction(count => document.querySelectorAll('[data-media-room="moments"] [data-author-id]').length === count, count); };
  async function edit(name, value) {
    const input = field(name);
    const type = await input.getAttribute('type');
    if (type === 'checkbox') await input.setChecked(value);
    else if (await input.evaluate(el => el.tagName === 'SELECT')) await input.selectOption(String(value));
    else await input.fill(String(value));
    await input.dispatchEvent('input');
    await input.dispatchEvent('change');
    await input.blur();
  }
  // Deterministic real images with distinct contents, generated without fixtures/dependencies.
  async function image(name, color, width = 180, height = 120) {
    const data = await page.evaluate(({ color, width, height }) => {
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = color; ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#fff'; ctx.fillRect(10, 10, 30, 30);
      return canvas.toDataURL('image/png').split(',')[1];
    }, { color, width, height });
    return { name, mimeType: 'image/png', buffer: Buffer.from(data, 'base64') };
  }

  for (const width of [360, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(route, { waitUntil: 'networkidle' });
    await room.waitFor(); await clean();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `no overflow at ${width}`);
    const slots = room.locator('.moment-slot:visible');
    const originalItems = JSON.parse(originalManifest);
    assert.equal(await slots.count(), Math.min(7, originalItems.length), 'lead plus six preview moments');
    const columns = await room.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    assert.equal(columns, width <= 700 ? 2 : 3, 'compact public column count');
    const hero = room.locator('.moment-slot--featured');
    if (originalItems.length) {
      assert.equal(await hero.count(), 1, 'exactly one large featured moment');
      const box = await hero.boundingBox();
      const next = await room.locator('.moment-slot:not(.moment-slot--featured)').first().boundingBox();
      if (next) assert.ok(box.width > next.width * 1.8, 'lead is larger than preview tiles');
    }
    if (originalItems.length > 7) {
      assert.equal(await room.locator('.moment-slot--archive img[src]').count(), 0, 'archive image sources deferred');
      await page.getByRole('button', { name: 'VIEW ALL MOMENTS' }).click();
      assert.equal(await slots.count(), originalItems.length, 'full collection revealed');
      assert.ok(page.url().includes('gallery=all'));
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await slots.count(), originalItems.length, 'expanded collection survives refresh');
      await page.getByRole('button', { name: 'SHOW PREVIEW' }).click();
      assert.equal(await slots.count(), 7);
      await page.goBack();
      assert.equal(await slots.count(), originalItems.length, 'Back restores expanded collection');
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${route}?edit=1`, { waitUntil: 'networkidle' });
  await page.locator('.author-panel').waitFor();
  const initialCount = await items.count();
  const first = await image('moments-regression-wide.png', '#2a7b99');
  const second = await image('moments-regression-tall.png', '#a65d71', 120, 180);
  const chooser = page.waitForEvent('filechooser');
  await action('upload').click();
  await (await chooser).setFiles([first, second]);
  await countIs(initialCount + 2);
  const addedIds = await items.evaluateAll((els, count) => els.slice(count).map(el => el.dataset.authorId), initialCount);
  assert.equal(addedIds.length, 2);
  const targetId = addedIds[0];
  const target = room.locator(`[data-author-id="${targetId}"]`);
  async function transfer(kind, file) {
    await page.locator('body').click({ position: { x: 3, y: 3 } });
    await room.evaluate((el, { kind, name, base64 }) => {
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const data = new DataTransfer(); data.items.add(new File([bytes], name, { type: 'image/png' }));
      if (kind === 'paste') document.body.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }));
      else {
        const b = el.getBoundingClientRect();
        el.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: data }));
        el.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: data, clientX: b.left + b.width / 2, clientY: b.top + 100 }));
      }
    }, { kind, name: file.name, base64: file.buffer.toString('base64') });
  }
  await transfer('paste', await image('paste.png', '#51944b')); await countIs(initialCount + 3);
  await transfer('drop', await image('drop.png', '#dfac32')); await countIs(initialCount + 4);
  const total = initialCount + 4;
  async function selectTarget() {
    await target.scrollIntoViewIfNeeded();
    await target.click({ position: { x: 15, y: 15 } });
    assert.ok(await target.evaluate(el => el.classList.contains('author-selected')), 'gallery item selected');
  }
  await selectTarget();
  await edit('fit', 'cover'); await edit('cropX', 27); await edit('cropY', 73);
  assert.equal(await target.locator('img').evaluate(el => getComputedStyle(el).objectPosition), '27% 73%');
  await edit('fit', 'contain');
  assert.equal(await target.locator('img').evaluate(el => getComputedStyle(el).objectFit), 'contain');
  await edit('label', 'Moments regression caption');
  await edit('title', 'A quiet observation');
  await edit('description', 'Regression description');
  assert.match(await target.innerText(), /Moments regression caption/);
  const optional = {};
  for (const [name, value] of [['date', '2026-10-25'], ['note', 'Regression note'], ['featured', true]]) {
    if (await field(name).count()) { await edit(name, value); optional[name] = value; }
    else console.log(`Optional field not exposed: ${name}`);
  }
  const layer = await target.evaluate(el => Number(getComputedStyle(el).zIndex));
  await action('front').click();
  assert.equal(await target.evaluate(el => Number(getComputedStyle(el).zIndex)), layer + 1);
  await action('back').click();
  assert.equal(await target.evaluate(el => Number(getComputedStyle(el).zIndex)), layer);
  await action('duplicate').click(); await countIs(total + 1);
  await action('delete').click(); await countIs(total);
  await selectTarget(); await action('delete').click(); await countIs(total - 1);
  await action('undo').click(); await countIs(total);
  await selectTarget();
  for (const width of [360, 390, 430, 1440]) {
    await page.setViewportSize({width, height:844});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `author has no overflow at ${width}`);
    const panelBox = await page.locator('.author-panel').boundingBox();
    assert.ok(panelBox.x >= 0 && panelBox.x + panelBox.width <= width + 1, `author controls within ${width}px viewport`);
    if (width <= 700) assert.ok(panelBox.height <= 844 * .36 + 1, 'mobile panel leaves gallery visible');
  }
  await page.setViewportSize({width:390,height:844});
  await target.evaluate(el => window.scrollBy(0, el.getBoundingClientRect().top - 100));
  let box = await target.boundingBox();
  const beforeMove = await target.getAttribute('style');
  await page.mouse.move(box.x + 25, box.y + 25); await page.mouse.down();
  await page.mouse.move(box.x + 37, box.y + 45, { steps: 6 }); await page.mouse.up();
  assert.notEqual(await target.getAttribute('style'), beforeMove, 'drag changes individual percentage frame');
  const beforeResize = (await target.boundingBox()).width;
  const handle = target.locator('.author-handle'); await handle.scrollIntoViewIfNeeded();
  box = await handle.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 12, box.y + box.height / 2 - 12, { steps: 6 }); await page.mouse.up();
  assert.ok(Math.abs((await target.boundingBox()).width - beforeResize) > 1, 'corner resize changes width');
  const mobileFrame = await target.evaluate(el => ['--mx','--my','--mw','--mh'].map(key => el.style.getPropertyValue(key)));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await selectTarget(); await edit('size', 35);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.deepEqual(await target.evaluate(el => ['--mx','--my','--mw','--mh'].map(key => el.style.getPropertyValue(key))), mobileFrame, 'desktop edit preserves mobile frame');
  const saved = page.waitForResponse(r => r.url().endsWith('/__author/save') && r.request().method() === 'POST');
  const navigation = page.waitForNavigation({ waitUntil: 'networkidle' });
  await action('save').click();
  const response = await saved; assert.equal(response.status(), 200, await response.text());
  await navigation; await page.reload({ waitUntil: 'networkidle' });
  const persisted = JSON.parse(await readFile(manifest));
  assert.ok(Array.isArray(persisted), 'existing Local Studio manifest array format');
  const item = persisted.find(item => item.id === targetId);
  assert.ok(item, 'uploaded item persisted');
  assert.equal(item.fit, 'contain'); assert.equal(item.objectPosition, '27% 73%');
  assert.equal(item.overrides?.label ?? item.label, 'Moments regression caption');
  assert.equal(item.overrides?.description ?? item.description, 'Regression description');
  for (const [name, value] of Object.entries(optional)) assert.equal(item[name] ?? item.overrides?.[name], value, `${name} persisted`);
  for (const frame of ['mobile', 'desktop']) {
    for (const key of ['x', 'y', 'width', 'height']) assert.ok(Number.isFinite(item[frame]?.[key]), `${frame}.${key} is an individual percentage`);
  }
  for (const width of [360, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(route, { waitUntil: 'networkidle' }); await clean(); await countIs(total);
    const continuation = page.getByRole('button', { name: 'VIEW ALL MOMENTS' });
    if (await continuation.count()) await continuation.click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `populated stream has no overflow at ${width}`);
    const flow = await items.evaluateAll(els => els.map(el => ({ position: getComputedStyle(el).position, width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })));
    assert.ok(await items.first().evaluate(el => el.parentElement.classList.contains('moment-slot') && getComputedStyle(el.parentElement).position === 'relative'), 'auto CSS stream retains flow slots around editable frames');
    assert.ok(flow.every(el => el.width > 0 && el.height > 0), 'all gallery frames have area');
    assert.equal(await target.locator('img').evaluate(el => getComputedStyle(el).objectFit), 'contain');
    await target.scrollIntoViewIfNeeded(); await target.click();
    const dialog = page.getByRole('dialog'); await dialog.waitFor({ state: 'visible' });
    assert.equal(await dialog.getByRole('heading').textContent(), 'A quiet observation');
    const currentSource = () => dialog.locator('img,video').first().getAttribute('src');
    const source = await currentSource(); assert.ok(source, 'lightbox contains media');
    await dialog.getByRole('button', { name: /next/i }).click();
    assert.notEqual(await currentSource(), source, 'Next changes media');
    await dialog.getByRole('button', { name: /previous|prev/i }).click();
    assert.equal(await currentSource(), source, 'Previous returns to selected media');
    await dialog.getByRole('button', { name: /close/i }).click();
    await dialog.waitFor({ state: 'hidden' });
    await target.click(); await dialog.waitFor({ state: 'visible' });
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
    await target.click(); await dialog.waitFor({state:'visible'});
    await page.goBack(); await dialog.waitFor({state:'hidden'});
    console.log(`PASS ${width}px: clean normal mode, CSS stream, lightbox next/previous/close/Escape`);
  }
  const back = page.getByRole('link', { name: /home/i }).first();
  assert.ok(await back.isVisible(), 'visible Back navigation');
  const backHref = await back.getAttribute('href');
  assert.ok(backHref && !backHref.startsWith('#'), 'Back has a real destination');
  const destination = new URL(backHref, route);
  await back.click(); await page.waitForURL(url => url.pathname === destination.pathname);
  assert.deepEqual(errors, [], 'no browser runtime errors');
  console.log('PASS uploads, paste, drop, crop/fit/captions, metadata, layers, duplicate/delete/undo, move/resize, independent frames, SAVE/reload and Back');
} finally {
  try { if (browser) await browser.close(); }
  finally {
    try {
      if (backupReady) {
        await writeFile(manifest, originalManifest);
        await rm(uploads, { recursive: true, force: true });
        if (hadUploads) await cp(join(backup, 'uploads'), uploads, { recursive: true });
      }
      assert.deepEqual(await readFile(manifest), originalManifest, 'original manifest restored');
      assert.deepEqual(await protectedSnapshot(), protectedBefore, 'protected room files unchanged');
      console.log('PASS original Moments data restored; protected room files unchanged');
      await rm(backup, { recursive: true, force: true });
    } catch (error) {
      console.error(`Restoration/check failed; backup retained at ${backup}`);
      throw error;
    }
  }
}
