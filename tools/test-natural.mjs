import { createRequire } from 'node:module';
import { readFile, writeFile, readdir, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
// Use an installed Playwright without adding a runtime dependency to the site.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = process.cwd();
const manifest = resolve(root, 'src/data/media/natural.json');
const folder = resolve(root, 'public/media/natural');
const backup = await readFile(manifest);
const files = new Set(await readdir(folder));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('dialog', dialog => dialog.accept());
const button = action => page.locator(`[data-action="${action}"]`);
const native = id => page.locator(`[data-author-id="natural-${id}"]`);
const wait = () => page.waitForTimeout(500);
try {
  await page.goto('http://localhost:4321/natural.html'); await wait();
  await page.addStyleTag({content:'astro-dev-toolbar{display:none!important}'});
  assert.equal(await page.locator('.author-panel').count(), 0);
  assert.equal(await page.locator('.nat-card').count(), 7);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 }); await wait();
    const before = await page.screenshot({ fullPage: true, animations: 'disabled' });
    await page.evaluate(() => document.querySelectorAll('.media-room, #natural-object-state').forEach(el => el.remove()));
    const after = await page.screenshot({ fullPage: true, animations: 'disabled' });
    assert.ok(before.equals(after), `normal visual baseline at ${width}px`);
    await page.reload(); await wait(); await page.addStyleTag({content:'astro-dev-toolbar{display:none!important}'});
  }
  console.log('PASS normal mode: desktop/mobile pixel comparison, seven original cards, no controls');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://localhost:4321/natural.html?edit=1');
  await page.locator('.author-panel').waitFor();
  const title = native('title'); const start = await title.boundingBox();
  await page.mouse.move(start.x + 70, start.y + 40); await page.mouse.down();
  await page.mouse.move(start.x + 130, start.y + 70, { steps: 8 }); await page.mouse.up();
  const moved = await title.boundingBox(); assert.ok(moved.x > start.x + 50);
  await button('undo').click(); assert.ok(Math.abs((await title.boundingBox()).x - start.x) < 1);
  await button('redo').click(); assert.ok((await title.boundingBox()).x > start.x + 50);
  await page.locator('[data-native-index="0"]').fill('Icy\nNatural test.');
  await page.locator('[data-native-index="0"]').blur();
  assert.equal(await title.innerText(), 'Icy\nNatural test.');
  await button('duplicate').click(); assert.equal(await page.locator('.nat-title').count(), 2);
  await button('delete').click(); await button('undo').click();
  assert.equal(await page.locator('.nat-title:visible').count(), 2);
  await button('redo').click();
  await native('card-basketball').click();
  await page.locator('[data-native-index="1"]').fill('Basketball test');
  await page.locator('[data-native-index="1"]').blur();
  const handle = await native('card-basketball').locator('.author-handle').boundingBox();
  await page.mouse.move(handle.x + 14, handle.y + 14); await page.mouse.down();
  await page.mouse.move(handle.x + 44, handle.y + 34, { steps: 5 }); await page.mouse.up();
  await button('front').click(); await button('back').click();
  console.log('PASS native selection, move, resize, text, duplicate, delete, layers, undo/redo');
  await button('text').click(); await page.locator('[data-field="text"]').fill('New Natural text');
  await page.locator('[data-field="text"]').blur();
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2ZAAAAABJRU5ErkJggg==';
  await page.locator('input[type="file"]').setInputFiles({ name: 'natural-test.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await page.waitForFunction(() => document.querySelectorAll('.room-piece img').length === 1);
  for (const event of ['drop', 'paste']) {
    await page.evaluate(({event, png}) => {
      const bytes = Uint8Array.from(atob(png), c => c.charCodeAt(0));
      const dt = new DataTransfer(); dt.items.add(new File([bytes], 'test.png', {type:'image/png'}));
      document.body.dispatchEvent(event === 'drop' ? new DragEvent('drop', {bubbles:true,cancelable:true,dataTransfer:dt,clientX:400,clientY:400}) : new ClipboardEvent('paste', {bubbles:true,cancelable:true,clipboardData:dt}));
    }, {event, png});
    await wait();
  }
  assert.equal(await page.locator('.room-piece img').count(), 3);
  const saved = page.waitForResponse(response => response.url().endsWith('/__author/save'));
  await button('save').click();
  const response = await saved; assert.equal(response.status(), 200, await response.text());
  await page.waitForTimeout(1500);
  assert.match(await title.innerText(), /Natural test/);
  assert.equal(await native('card-basketball').locator('h3').innerText(), 'Basketball test');
  assert.equal(await page.locator('.room-piece img').count(), 3);
  await page.goto('http://localhost:4321/natural.html'); await wait();
  assert.equal(await page.locator('.author-panel,.author-handle,.author-selected').count(), 0);
  assert.match(await title.innerText(), /Natural test/);
  assert.equal(await page.locator('.room-piece img').count(), 3);
  await page.reload(); await wait();
  assert.match(await title.innerText(), /Natural test/);
  assert.deepEqual(errors, []);
  console.log('PASS add text, file upload, drop, paste, save, refresh restoration, clean normal mode');
  for (const route of ['/', '/clear.html', '/worlds.html']) {
    await page.goto(`http://localhost:4321${route}`); await wait();
    assert.equal(await page.locator('.author-panel').count(), 0);
    await page.goto(`http://localhost:4321${route}?edit=1`);
    await page.locator('.author-panel').waitFor();
  }
  console.log('PASS other editable rooms still initialize; normal modes stay clean');
} finally {
  await browser.close();
  await writeFile(manifest, backup);
  for (const file of await readdir(folder)) if (!files.has(file)) await unlink(resolve(folder, file));
}