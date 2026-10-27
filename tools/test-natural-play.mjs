// Run only against an already-running, isolated Local Studio author server.
// PLAY_TEST_ORIGIN=http://localhost:4347 node tools/test-natural-play.mjs
// No server is started and no dependencies are installed. Natural is restored in finally.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile, readdir, stat, mkdtemp, cp, rm } from 'node:fs/promises';
import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { chromium } = require('E:/Projects/chad-hamilton-portfolio/node_modules/playwright/index.js');
const origin = new URL(process.env.PLAY_TEST_ORIGIN || 'http://localhost:4347').origin;
const route = `${origin}/natural.html`;
const manifest = join(root, 'src/data/media/natural.json');
const uploads = join(root, 'public/media/natural');
const groups = ['play-gaming', 'play-basketball', 'play-other'];
const known = ['play-naraka', 'play-gears', 'play-supplied-short', 'play-marvel', 'play-hoop', 'play-hoop-slot', 'play-photo-slot', 'play-other-slot'];
const exists = async path => {
  try { await stat(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
};
async function tree(path) {
  const result = {};
  if (!(await exists(path))) return { [relative(root, path)]: null };
  async function visit(file) {
    const key = relative(root, file).replaceAll('\\', '/');
    if ((await stat(file)).isDirectory()) {
      result[key] = 'directory';
      for (const name of (await readdir(file)).sort()) await visit(join(file, name));
    } else result[key] = createHash('sha256').update(await readFile(file)).digest('hex');
  }
  await visit(path);
  return result;
}
async function protectedSnapshot() {
  // Include unknown/pre-existing uploads and directories, not just tracked files.
  const paths = [
    'src/pages/index.astro', 'src/pages/world.astro', 'src/pages/clear.astro',
    'src/pages/worlds.astro', 'src/pages/moments.astro', 'src/components/home',
    'src/styles/home-scrapbook.css',
    ...['home', 'world', 'clear', 'worlds', 'moments', 'home-interest-archive'].flatMap(room => [
      `src/data/media/${room}.json`, `public/media/${room}`,
    ]),
  ];
  return Object.assign({}, ...await Promise.all(paths.map(path => tree(join(root, path)))));
}
const probe = await fetch(route, { signal: AbortSignal.timeout(15000) });
assert.equal(probe.status, 200, `Start an author server separately at ${origin}; this test never starts one`);
const originalManifest = await readFile(manifest);
const initial = JSON.parse(originalManifest);
for (const id of known) assert.ok(initial.some(item => item.id === id), `Implementation must seed ${id} before running`);
const protectedBefore = await protectedSnapshot();
const naturalBefore = await tree(uploads);
const hadUploads = await exists(uploads);
const backup = await mkdtemp(join(tmpdir(), 'icy-natural-play-'));
let browser;
let backupReady = false;
try {
  await writeFile(join(backup, 'natural.json'), originalManifest);
  if (hadUploads) await cp(uploads, join(backup, 'uploads'), { recursive: true });
  backupReady = true;
  browser = await chromium.launch({ headless: true,
    ...(process.env.PLAY_TEST_EXECUTABLE ? { executablePath: process.env.PLAY_TEST_EXECUTABLE } : {}),
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  const action = name => page.locator(`.author-panel [data-action="${name}"]`);
  const field = name => page.locator(`.author-panel [data-field="${name}"]`);
  const piece = id => page.locator(`[data-author-id="${id}"]`);
  const stream = group => page.locator(`[data-play-stream="${group}"]`);
  const playItems = page.locator('#play figure[data-author-id]');
  const selectedId = () => page.locator('.author-selected').getAttribute('data-author-id');
  async function edit(name, value) {
    const input = field(name);
    if (await input.evaluate(el => el.tagName === 'SELECT')) await input.selectOption(String(value));
    else await input.fill(String(value));
    await input.dispatchEvent('input');
    await input.dispatchEvent('change');
    await input.blur();
  }
  async function select(id) {
    // Clicking the frame, rather than its video/button, selects without playback.
    await piece(id).dispatchEvent('click');
    assert.equal(await selectedId(), id);
  }
  async function belongs(id, group) {
    await page.waitForFunction(({ id, group }) => document.querySelector(`[data-author-id="${id}"]`)
      ?.closest('[data-play-stream]')?.getAttribute('data-play-stream') === group, { id, group });
  }
  async function normal(width) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.locator('#play').waitFor();
    assert.equal(await page.locator('[data-media-room="natural"]').count(), 1, 'one existing Natural overlay');
    assert.equal(await page.locator('.author-panel,.author-handle,.author-selected,[data-add-play]:visible').count(), 0, 'normal mode has no Studio controls');
    for (const [index, group] of groups.entries()) {
      assert.equal(await page.locator(`#${['gaming', 'basketball', 'other-play'][index]} [data-play-stream="${group}"]`).count(), 1);
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `no overflow at ${width}px`);
    const frames = await playItems.evaluateAll(elements => elements.filter(el => el.getBoundingClientRect().width > 0).map(el => {
      const slot = el.closest('.play-slot');
      const frame = el.parentElement;
      const box = el.getBoundingClientRect(); const outer = frame.getBoundingClientRect();
      return { id: el.dataset.authorId, slot: !!slot,
        position: getComputedStyle(slot).position, aspect: getComputedStyle(frame).aspectRatio, width: box.width, height: box.height,
        outerWidth: outer.width, outerHeight: outer.height };
    }));
    assert.ok(frames.length >= initial.filter(item => groups.includes(item.group) && !item.deleted && item.kind !== 'placeholder' && item.curated !== false).length);
    assert.equal(await page.locator('.play-slot--reserve:visible').count(), 0, 'source history and empty slots are optional Studio depth');
    assert.ok((await piece('play-hoop').boundingBox()).y < 320, 'real basketball appears in the first viewport');
    for (const frame of frames) {
      assert.ok(frame.slot && frame.position === 'relative', `${frame.id} owns a relative flow slot`);
      assert.notEqual(frame.aspect, 'auto', `${frame.id} has its own aspect ratio`);
      assert.ok(frame.width > 0 && frame.height > 0 && frame.outerHeight > 0, `${frame.id} has area`);
      const [a, b = 1] = frame.aspect.split('/').map(Number);
      assert.ok(Math.abs(frame.outerWidth / frame.outerHeight - a / b) < .03, `${frame.id} slot respects aspect`);
    }
    assert.equal(await page.locator('#play iframe').count(), 0, 'YouTube is deferred');
    for (const id of known) assert.equal(await piece(id).count(), 1, `unique ${id}`);
    const hoop = piece('play-hoop').locator('video');
    assert.equal(await hoop.getAttribute('preload'), 'none');
    assert.ok(await hoop.getAttribute('poster'), 'real basketball clip has a poster');
    assert.equal(await hoop.getAttribute('controls') !== null, true);
    assert.equal(await hoop.getAttribute('playsinline') !== null, true);
    console.log(`PASS normal ${width}px: streams, flow slots/aspects, no overflow, deferred media`);
  }
  for (const width of [360, 390, 430, 1440]) await normal(width);
  // Decode actual local basketball metadata, without autoplaying the page's clip.
  const hoopSource = await piece('play-hoop').locator('video').getAttribute('src');
  assert.ok(hoopSource && !/youtube|youtu\.be/i.test(hoopSource), 'basketball is a native clip');
  const hoopMetadata = await page.evaluate(src => new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const timer = setTimeout(() => reject(new Error('Basketball metadata timed out')), 20000);
    video.onloadedmetadata = () => { clearTimeout(timer); resolve({ width: video.videoWidth, height: video.videoHeight, duration: video.duration }); video.removeAttribute('src'); video.load(); };
    video.onerror = () => { clearTimeout(timer); reject(new Error('Basketball clip cannot decode')); };
    video.preload = 'metadata'; video.src = src;
  }), hoopSource);
  assert.ok(hoopMetadata.width > 0 && hoopMetadata.height > 0 && hoopMetadata.duration > 0, 'real playable hoop media');
  const supplied = initial.find(item => item.id === 'play-supplied-short');
  assert.match(`${supplied.metadata?.title || ''} ${supplied.title || ''} ${supplied.label || ''}`, /gears/i, 'supplied short uses actual Gears metadata');
  const youtubeIds = await page.locator('#play [data-play-youtube]:visible').evaluateAll(buttons => buttons.map(el => ({ id: el.closest('[data-author-id]').dataset.authorId, video: el.dataset.playYoutube })));
  assert.ok(youtubeIds.length >= 4, 'gaming sources use deferred YouTube players');
  for (const { id, video } of youtubeIds) {
    await piece(id).locator('[data-play-youtube]').click();
    const iframe = piece(id).locator('iframe');
    await iframe.waitFor({ state: 'attached' });
    assert.match(await iframe.getAttribute('src'), new RegExp(`youtube-nocookie\\.com/embed/${video}\\?`));
    assert.equal(await piece(id).locator('[data-play-youtube]').count(), 0);
  }
  console.log('PASS click-to-embed YouTube and actual native basketball metadata');

  await page.goto(`${route}?edit=1`, { waitUntil: 'domcontentloaded' });
  await page.locator('.author-panel').waitFor();
  assert.equal(await field('playOrder').getAttribute('type'), 'number');
  async function image(name, color, width, height) {
    const data = await page.evaluate(({ color, width, height }) => {
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d'); context.fillStyle = color; context.fillRect(0, 0, width, height);
      context.fillStyle = '#fff'; context.fillRect(4, 4, 18, 18);
      return canvas.toDataURL('image/png').split(',')[1];
    }, { color, width, height });
    return { name, mimeType: 'image/png', buffer: Buffer.from(data, 'base64') };
  }
  const firstImage = await image('play-regression-wide.png', '#307389', 240, 160);
  const replacementImage = await image('play-regression-tall.png', '#914c73', 120, 180);
  async function fileFlow(file, replace = false) {
    await action(replace ? 'replace' : 'add').click();
    const chooser = page.waitForEvent('filechooser');
    await action('file').click(); await (await chooser).setFiles(file);
    await page.waitForFunction(() => document.querySelector('.author-source-flow')?.hidden && !!document.querySelector('.author-selected'));
    return selectedId();
  }
  // Select a non-PLAY native first: generic ADD must not inherit its group.
  await select('natural-title');
  const beforeAdd = await playItems.count();
  const addedId = await fileFlow(firstImage);
  assert.equal(await playItems.count(), beforeAdd + 1);
  await belongs(addedId, 'play-other');
  const added = piece(addedId);
  await added.locator('img').waitFor();
  const originalSrc = await added.locator('img').getAttribute('src');
  assert.equal(await fileFlow(replacementImage, true), addedId, 'replace retains item identity');
  assert.notEqual(await added.locator('img').getAttribute('src'), originalSrc, 'file replace changes media');
  await edit('label', 'PLAY regression caption');
  await edit('size', 72);
  await edit('group', 'play-gaming'); await belongs(addedId, 'play-gaming');
  await edit('playOrder', 0);
  const firstOrderedId = await stream('play-gaming').locator('.play-slot').evaluateAll(slots =>
    slots.sort((a, b) => Number(getComputedStyle(a).order) - Number(getComputedStyle(b).order))[0].querySelector('[data-author-id]').dataset.authorId);
  assert.equal(firstOrderedId, addedId, 'numeric order relocates to stream start');
  const inheritedId = await fileFlow(firstImage);
  await belongs(inheritedId, 'play-gaming');
  await action('delete').click();
  await select(addedId);
  const frameWidth = await added.evaluate(el => el.style.width || el.style.getPropertyValue('--dw'));
  assert.match(frameWidth, /%$/, 'individual frame uses percentages');
  const count = await playItems.count();
  await action('duplicate').click();
  const duplicateId = await selectedId();
  assert.notEqual(duplicateId, addedId); assert.equal(await playItems.count(), count + 1);
  await belongs(duplicateId, 'play-gaming');
  await action('delete').click(); assert.equal(await playItems.count(), count);
  await action('undo').click(); assert.equal(await playItems.count(), count + 1);
  await select(duplicateId); await action('delete').click();
  await select(addedId);
  await action('front').click(); await action('back').click();

  // Live resolver, deliberately not intercepted: validates actual URL metadata.
  await action('add').click(); await action('url').click();
  await page.locator('[data-source-url]').fill(supplied.source || `https://www.youtube.com/watch?v=${supplied.videoId}`);
  await action('fetch').click(); await action('accept-source').waitFor({ state: 'visible', timeout: 60000 });
  assert.match(await page.locator('.author-source-preview').innerText(), /gears/i, 'live URL preview has actual metadata');
  await action('accept-source').click();
  const urlId = await selectedId(); await belongs(urlId, 'play-gaming');
  assert.equal(await piece(urlId).locator('[data-play-youtube]').count(), 1);
  await edit('group', 'play-other'); await belongs(urlId, 'play-other');
  await edit('playOrder', ''); // Optional order must not serialize as NaN/null.
  console.log('PASS image add/replace, caption, size, group, optional order, duplicate/delete/undo and live URL metadata');

  // Small, real local video fixture generated by Chromium, no ffmpeg dependency.
  const recorded = await page.evaluate(async () => {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream || !MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) return null;
    const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = 90;
    const context = canvas.getContext('2d'); context.fillStyle = '#346b4c'; context.fillRect(0, 0, 160, 90);
    const stream = canvas.captureStream(10); const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
    const chunks = []; recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    const stopped = new Promise(resolve => { recorder.onstop = resolve; });
    recorder.start(); await new Promise(resolve => setTimeout(resolve, 350)); recorder.stop(); await stopped;
    stream.getTracks().forEach(track => track.stop());
    return Array.from(new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer()));
  });
  let videoId;
  if (recorded) {
    videoId = await fileFlow({ name: 'play-regression.webm', mimeType: 'video/webm', buffer: Buffer.from(recorded) });
    await belongs(videoId, 'play-other'); assert.equal(await piece(videoId).locator('video').count(), 1);
    console.log('PASS real local WebM upload');
  } else console.log('SKIP local video upload: Chromium lacks canvas VP8 MediaRecorder');

  // Per-section add controls are optional; when supplied they must target that section.
  if (await page.locator('[data-add-play="play-basketball"]').count()) {
    await page.locator('[data-add-play="play-basketball"]').click();
    const chooser = page.waitForEvent('filechooser');
    await action('file').click(); await (await chooser).setFiles(firstImage);
    await page.waitForFunction(() => document.querySelector('.author-source-flow')?.hidden);
    await belongs(await selectedId(), 'play-basketball');
  }
  const savedResponse = page.waitForResponse(response => response.url().endsWith('/__author/save') && response.request().method() === 'POST');
  const reload = page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  await action('save').click();
  const response = await savedResponse; assert.equal(response.status(), 200, await response.text());
  await reload; await page.locator('.author-panel').waitFor();
  const persisted = JSON.parse(await readFile(manifest));
  const saved = persisted.find(item => item.id === addedId);
  assert.equal(saved.group, 'play-gaming'); assert.equal(saved.playOrder, 0);
  assert.equal(saved.overrides?.label ?? saved.label, 'PLAY regression caption');
  assert.equal(saved.desktop.width, 72);
  for (const frame of ['desktop', 'mobile']) for (const key of ['x', 'y', 'width', 'height']) {
    assert.ok(Number.isFinite(saved[frame]?.[key]), `${frame}.${key} persists as a percentage number`);
  }
  assert.ok(!('playOrder' in persisted.find(item => item.id === urlId)), 'blank optional order omitted');
  assert.ok(!persisted.some(item => item.id === duplicateId), 'deleted duplicate stays deleted');
  if (videoId) assert.equal(persisted.find(item => item.id === videoId).kind, 'video');
  // Existing non-PLAY objects must not be converted to stream items by ADD/SAVE.
  for (const item of initial.filter(item => !groups.includes(item.group))) {
    assert.deepEqual(persisted.find(saved => saved.id === item.id), item, `${item.id} outside PLAY unchanged`);
  }
  for (const width of [360, 390, 430, 1440]) await normal(width);
  await belongs(addedId, 'play-gaming');
  assert.match(await added.locator('xpath=ancestor::*[contains(@class,"play-slot")]').innerText(), /PLAY regression caption/);
  assert.deepEqual(errors, [], 'no browser runtime errors');
  assert.deepEqual(await protectedSnapshot(), protectedBefore, 'HOME/world/Clear/worlds and user Moments (including uploads) untouched');
  console.log('PASS save/reload persistence, populated responsive streams and protected user Moments');
} finally {
  try { if (browser) await browser.close(); }
  finally {
    try {
      if (backupReady) {
        await writeFile(manifest, originalManifest);
        await rm(uploads, { recursive: true, force: true });
        if (hadUploads) await cp(join(backup, 'uploads'), uploads, { recursive: true });
      }
      assert.deepEqual(await readFile(manifest), originalManifest, 'original Natural manifest restored byte-for-byte');
      assert.deepEqual(await tree(uploads), naturalBefore, 'all original Natural uploads restored');
      assert.deepEqual(await protectedSnapshot(), protectedBefore, 'protected rooms/uploads unchanged (including pre-existing Moments edits)');
      await rm(backup, { recursive: true, force: true });
      console.log('PASS restoration: Natural manifest/uploads restored; protected rooms untouched');
    } catch (error) {
      console.error(`Restoration/check failed. Recovery backup retained at ${backup}`);
      throw error;
    }
  }
}