import { createRequire } from 'node:module';
import { readFile, writeFile, readdir, unlink, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const origin = process.env.HOME_TEST_ORIGIN || 'http://localhost:4321';
const layoutOnly = process.env.HOME_TEST_LAYOUT_ONLY === '1';
const editorOnly = process.env.HOME_TEST_EDITOR_ONLY === '1';
const manifest = resolve('src/data/media/home.json');
const folder = resolve('public/media/home');
const backup = await readFile(manifest);
const scene = JSON.parse(backup);
const files = new Set(await readdir(folder));
const protectedPaths = ['src/pages/natural.astro','src/pages/world.astro','src/pages/clear.astro','src/pages/worlds.astro','src/data/media/natural.json','src/data/media/clear.json','src/data/media/worlds.json'];
const protectedFiles = await Promise.all(protectedPaths.map(path => readFile(path)));
const output = process.env.HOME_TEST_OUTPUT || resolve(process.env.TEMP || '.', 'icy-home-validation');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.HOME_TEST_EXECUTABLE ? { executablePath: process.env.HOME_TEST_EXECUTABLE } : {}), args: process.env.HOME_TEST_CHROME_ARGS ? JSON.parse(process.env.HOME_TEST_CHROME_ARGS) : [] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('dialog', dialog => dialog.accept());
const worlds = [['natural','ICY NATURAL','/natural.html'],['apps','APP WORLD','/world.html'],['clear','CLEAR','/clear.html']];
const slot = name => page.locator(`[data-author-id="home-world-${name}"]`);
const action = name => page.locator(`[data-action="${name}"]`);
const clean = async () => assert.equal(await page.locator('.author-panel,.author-handle,.author-add-spot,.author-selected').count(), 0);
async function select(name) {
  const el = slot(name);
  await el.evaluate(el => { const b = el.getBoundingClientRect(); window.scrollBy(0, b.top - innerHeight * .2); });
  const b = await el.boundingBox();
  await page.touchscreen.tap(b.x + b.width * .7, b.y + b.height * .3);
  assert.ok(await el.evaluate(el => el.classList.contains('author-selected')), `${name} selects by actual mobile tap`);
  return el;
}
try {
  for (const width of editorOnly ? [] : [320,360,390,430,700,701,852,1280,1440,1920]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(origin + '/', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await clean();
    assert.equal(await page.locator('[data-role^="interest-"]').count(), 0);
    assert.equal(await page.locator('.home-world-entrance').count(), 3);
    assert.ok(!(await page.locator('main').innerText()).includes('SEVEN ROOMS'));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `horizontal overflow at ${width}`);
    if (width <= 700) {
      const copy = await page.locator('.scrap-archive,.scene-intro-body,.world-entrance__caption p').evaluateAll(elements => elements.map(el => {
        const style = getComputedStyle(el);
        return { size: parseFloat(style.fontSize), line: parseFloat(style.lineHeight), family: style.fontFamily };
      }));
      for (const text of copy) {
        assert.ok(text.size >= 12 && text.size <= Math.max(14, width * .0213) + .1, `readable mobile sentence copy at ${width}`);
        assert.ok(text.line >= text.size * 1.39, `comfortable sentence leading at ${width}`);
        assert.ok(text.family.includes('JetBrains Mono'), `authored monospace retained at ${width}`);
      }
    }
    for (const [name,label,href] of worlds) {
      assert.equal(await slot(name).getByRole('heading').textContent(), label);
      assert.equal(await slot(name).getByRole('link').getAttribute('href'), href);
      const b = await slot(name).boundingBox();
      assert.ok(b.x >= 0 && b.x + b.width <= width + 1 && b.height >= 100, `${name} usable frame at ${width}`);
      assert.ok(await slot(name).locator('.world-entrance__caption').evaluate(el => {
        const box = el.getBoundingClientRect();
        return [...el.querySelectorAll('h3,p,.world-entrance__arrow')].every(text => {
          const bounds = text.getBoundingClientRect();
          return bounds.left >= box.left - 1 && bounds.right <= box.right + 1 && bounds.top >= box.top - 1 && bounds.bottom <= box.bottom + 1 && text.scrollWidth <= text.clientWidth + 1;
        });
      }), `${name} caption fits without clipping at ${width}`);
      assert.ok(await slot(name).evaluate(el => {
        const box = el.getBoundingClientRect();
        const preview = el.querySelector('.world-preview').getBoundingClientRect();
        const copy = el.querySelector('p').getBoundingClientRect();
        const arrow = el.querySelector('.world-entrance__arrow').getBoundingClientRect();
        return Math.abs(preview.height / (box.height - 2) - .58) < .006 && copy.bottom + 2 <= arrow.top;
      }), `${name} retains 58/42 media/caption with separate arrow space at ${width}`);
    }
    const boxes = await Promise.all(worlds.map(([name]) => slot(name).boundingBox()));
    for (let i = 1; i < boxes.length; i++) {
      assert.ok(boxes[i-1].x + boxes[i-1].width < boxes[i].x, `three left-to-right destinations at ${width}`);
    }
    const canvas = await page.locator('.home-scrapbook').boundingBox();
    if (width <= 700) {
      const heights = boxes.map(box => box.height);
      // Once the type floor needs extra room, all three share the same height.
      if (await page.locator('main').evaluate(el => parseFloat(el.style.getPropertyValue('--home-card-growth')) > 0))
        assert.ok(Math.max(...heights) - Math.min(...heights) < 1, `equal expanded card geometry at ${width}`);
    }
    // Desktop is the exact authored source. Mobile retains horizontal anchors
    // and media widths while text clearance is allowed to extend the paper.
    for (const item of scene) {
      const frame = page.locator(`[data-author-id="${item.id}"]`);
      for (const [property,key,size] of [['left','x',canvas.width],['top','y',canvas.height],['width','width',canvas.width],['height','height',canvas.height]]) {
        if (width <= 700 && (['top','height'].includes(property) || property === 'width' && ['archive','intro-body'].includes(item.sceneStyle))) continue;
        const actual = await frame.evaluate((el,property) => parseFloat(getComputedStyle(el)[property]), property);
        assert.ok(Math.abs(actual - item.desktop[key] / 100 * size) < 1, `${item.id} preserves authored ${property} at ${width}`);
      }
    }
    const frameBox = id => page.locator(`[data-author-id="home-${id}"]`).boundingBox();
    const [games,mirror,sky,lens,explore] = await Promise.all(['games','portal','sky','sky-note','interest-heading'].map(frameBox));
    assert.ok(games.x + games.width < mirror.x, `Games stays left of mirror at ${width}`);
    assert.ok(sky.x < lens.x && sky.y < games.y, `Lens Capture stays beside upper hero at ${width}`);
    assert.ok(explore.y > Math.max(games.y + games.height, mirror.y + mirror.height) && explore.y + explore.height < boxes[0].y, `Infinite Mind separates collage and destinations at ${width}`);
    assert.equal(await page.getByRole('heading', { name: '∞ Infinite Mind', exact: true }).count(), 1);
    assert.doesNotMatch(await page.locator('main').innerText(), /Explore my mind|NATURAL BELOW/);
    if (width <= 700) {
      const archive = await page.locator('.scrap-archive').boundingBox();
      const title = await page.locator('.scrap-title').boundingBox();
      const body = await page.locator('.scene-intro-body').boundingBox();
      assert.ok(archive.y + archive.height + 12 <= title.y, `archive clears ICY CLEARER at ${width}`);
      assert.ok(archive.x + archive.width + 5 <= sky.x, `archive clears the rotated photo edge at ${width}`);
      assert.ok(body.y + body.height + 12 <= games.y, `readable body clears Games at ${width}`);
      const cue = page.locator('.scrap-portal-note');
      assert.match(await cue.innerText(), /INFINITE\s+MIND\s+↓/);
      assert.ok(await cue.evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 9), 'readable related directional cue');
    }
    for (const id of ['home-handle','home-title','home-signature','home-intro-heading','home-sky','home-games','home-portal']) assert.equal(await page.locator(`[data-author-id="${id}"]`).count(), 1);
    assert.ok((await page.locator('[data-author-id="home-title"]').textContent()).includes('CLEARER'));
    assert.equal(await page.getByRole('heading',{name:'Become, slowly.',exact:true}).count(),1);
    assert.equal(await slot('natural').locator('img').count(),3);
    assert.equal(await slot('apps').locator('.world-orbit').count(),3);
    assert.equal(await slot('clear').locator('.world-signal__text span').count(),3);
    await page.screenshot({ path: resolve(output, `home-${width}.jpg`), fullPage: true, quality: 85 });
  }
  if (!editorOnly) console.log('PASS desktop geometry, readable archive/body clearance, signature/Lens, Games + Natural portal, Infinite Mind, three-across 58/42 cards, visible arrows, no clipping/overflow: 320/360/390/430/700/701/852/1280/1440/1920');
  if (!layoutOnly) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin + '/?edit=1', { waitUntil: 'networkidle' });
  await page.locator('.author-panel').waitFor();
  for (const [name] of worlds) {
    const item = scene.find(item => item.id === `home-world-${name}`);
    assert.ok(await slot(name).evaluate((el, position) => {
      const canvas = el.parentElement.getBoundingClientRect();
      const box = el.getBoundingClientRect();
      return Math.abs(box.x - canvas.x - position.x / 100 * canvas.width) < 1
        && Math.abs(box.y - canvas.y - position.y / 100 * canvas.height) < 1;
    }, item.mobile), `${name} starts in its saved Studio mobile frame before selection`);
  }
  for (const [name] of worlds) {
    const el = await select(name);
    for (const control of ['replace','duplicate','delete','front','back']) assert.ok(await action(control).isVisible());
    await page.locator('[data-field="label"]').fill(`Edited ${name}`);
    await page.locator('[data-field="description"]').fill(`Caption for ${name}`);
    await page.locator('[data-field="href"]').fill('/worlds.html');
    assert.equal(await el.getByRole('heading').textContent(), `Edited ${name}`);
    if (name !== 'natural') {
      await page.locator('[data-part-index="0"]').fill(`EDITABLE ${name}`);
      assert.equal(await el.locator('.world-signal__text span').first().textContent(), `EDITABLE ${name}`);
    }
    const before = await el.boundingBox();
    await page.mouse.move(before.x + 35, before.y + 35); await page.mouse.down();
    await page.mouse.move(before.x + 42, before.y + 45, { steps: 4 }); await page.mouse.up();
    assert.ok((await el.boundingBox()).y > before.y + 5, `${name} moves`);
    const handle = await el.locator('.author-handle').boundingBox();
    const width = (await el.boundingBox()).width;
    await page.mouse.move(handle.x + 12, handle.y + 12); await page.mouse.down();
    await page.mouse.move(handle.x + 7, handle.y + 5, { steps: 4 }); await page.mouse.up();
    assert.ok((await el.boundingBox()).width < width - 2, `${name} resizes`);
    const layer = +(await el.evaluate(el => getComputedStyle(el).zIndex));
    await action('front').click(); assert.equal(+(await el.evaluate(el => getComputedStyle(el).zIndex)), layer + 1);
    await action('back').click(); assert.equal(+(await el.evaluate(el => getComputedStyle(el).zIndex)), layer);
    await action('duplicate').click(); assert.equal(await page.locator('.home-world-entrance').count(),4);
    await action('delete').click(); assert.equal(await page.locator('.home-world-entrance').count(),3);
    await select(name); await action('delete').click(); assert.equal(await page.locator('.home-world-entrance').count(),2);
    await action('undo').click(); assert.equal(await page.locator('.home-world-entrance').count(),3);
    await select(name);
    await action('replace').click();
    const chooser = page.waitForEvent('filechooser'); await action('file').click();
    const upload = page.waitForResponse(response => response.url().endsWith('/__author/upload'));
    await (await chooser).setFiles({ name:`entrance-${name}.jpg`, mimeType:'image/jpeg', buffer:await readFile('public/media/home/life/19797-sunset-poster.jpg') });
    const uploaded = await upload;
    assert.equal(uploaded.status(), 200, 'Studio upload succeeds');
    const media = await uploaded.json();
    await page.waitForFunction(({id,src}) => document.querySelector(`[data-author-id="home-world-${id}"] img`)?.getAttribute('src') === src && document.querySelectorAll(`[data-author-id="home-world-${id}"] img`).length === 1, {id:name,src:media.src});
    assert.equal(await el.getAttribute('data-role'), `world-${name}`);
    assert.equal(await el.getByRole('heading').textContent(), `Edited ${name}`);
    assert.equal(await el.locator('.world-preview img').count(),1);
  }
  const saved = page.waitForResponse(response => response.url().endsWith('/__author/save'));
  const refreshed = page.waitForNavigation({ waitUntil: 'networkidle' });
  await action('save').click(); const response = await saved;
  assert.equal(response.status(),200,await response.text());
  await refreshed; await page.reload({ waitUntil: 'networkidle' });
  const persisted = JSON.parse(await readFile(manifest));
  for (const [name] of worlds) {
    const item = persisted.find(item => item.id === `home-world-${name}`);
    assert.equal(item.overrides.label,`Edited ${name}`);
    assert.equal(item.overrides.description,`Caption for ${name}`);
    assert.equal(item.href,'/worlds.html');
    assert.equal(item.kind,'image');
    assert.deepEqual(item.desktop,scene.find(before=>before.id===item.id).desktop);
    assert.notDeepEqual(item.mobile,scene.find(before=>before.id===item.id).mobile);
    assert.equal(item.previewImages,undefined);
  }
  await page.goto(origin+'/', { waitUntil: 'networkidle' }); await clean();
  for (const [name] of worlds) assert.equal(await slot(name).getByRole('link').getAttribute('href'),'/worlds.html');
  assert.deepEqual(errors,[]);
  console.log('PASS all three: touch selection, move/resize, label/caption/link, layers, duplicate/delete/undo, real-media replacement, SAVE/reload, independent desktop/mobile');
  }
  assert.deepEqual(errors,[]);
} finally {
  await browser.close();
  if (!layoutOnly) {
    await writeFile(manifest,backup);
    for (const file of await readdir(folder)) if (!files.has(file)) await unlink(resolve(folder,file));
  }
  for (let i=0;i<protectedPaths.length;i++) assert.deepEqual(await readFile(protectedPaths[i]),protectedFiles[i],`${protectedPaths[i]} unchanged`);
}
console.log(`PASS other worlds untouched; HOME ${layoutOnly ? 'manifest never written (layout-only)' : 'restored after regression checks'}. Screenshots: ${output}`);
