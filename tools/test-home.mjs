import { createRequire } from 'node:module';
import { readFile, writeFile, readdir, unlink, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const manifest = resolve('src/data/media/home.json');
const folder = resolve('public/media/home');
const backup = await readFile(manifest);
const scene = JSON.parse(backup);
const count = scene.filter(item => !item.deleted).length;
const files = new Set(await readdir(folder));
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('dialog', dialog => dialog.accept());
const button = action => page.locator(`[data-action="${action}"]`);
const slot = id => page.locator(`[data-author-id="home-${id}"]`);
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2ZAAAAABJRU5ErkJggg==';
const output = resolve(process.env.TEMP || '.', 'icy-home-validation');
await mkdir(output,{recursive:true});
try {
  for (const width of [360,390,430,852,1440]) {
    await page.setViewportSize({width,height:844});
    await page.goto('http://localhost:4321/');
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('.author-panel').count(),0);
    assert.equal(await page.locator('.room-piece').count(),count);
    assert.equal(await page.locator('[data-role^="interest-"]').count(),7);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),`overflow at ${width}`);
    const geometry = await page.evaluate(() => {
      const root=document.querySelector('.home-scrapbook').getBoundingClientRect();
      const portal=document.querySelector('[data-role="portal"]').getBoundingClientRect();
      return {ratio:root.height/root.width,portalTop:(portal.top-root.top)/root.height};
    });
    assert.ok(Math.abs(geometry.ratio-1846/852)<.01);
    assert.ok(Math.abs(geometry.portalTop-.41)<.01);
    await page.addStyleTag({content:'astro-dev-toolbar{display:none!important}'});
    await page.screenshot({path:resolve(output,`home-${width}.png`),fullPage:true});
  }
  console.log('PASS composition geometry, complete scene, seven tiles, clean normal mode, no overflow: 360/390/430/852/1440');
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://localhost:4321/?edit=1');
  await page.locator('.author-panel').waitFor();
  // Center each frame above the phone toolbar, then tap the real element.
  for (const item of JSON.parse(backup)) {
    const el=page.locator(`[data-author-id="${item.id}"]`);
    await el.evaluate(el => { const b=el.getBoundingClientRect(); window.scrollBy(0,b.top+b.height/2-innerHeight*.28); });
    const b=await el.boundingBox();
    await page.touchscreen.tap(Math.min(380,b.x+b.width/2),Math.max(5,b.y+b.height/2));
    assert.ok(await el.evaluate(el=>el.classList.contains('author-selected')),`${item.id} selectable at ${JSON.stringify(b)}`);
  }
  console.log('PASS all existing scene objects selectable by mobile tap');
  // Edit compound-object parts without separating the caption from its frame.
  await slot('moments').click({force:true});
  await page.locator('[data-part-index="0"]').fill('Edited moments');
  assert.equal(await slot('moments').locator('[data-part="0"]').textContent(),'Edited moments');
  await slot('intro-body').click({force:true});
  await page.locator('[data-field="text"]').fill('Shared editable body copy.');
  assert.equal(await slot('intro-body').locator('p').textContent(),'Shared editable body copy.');
  await slot('portal').click({force:true});
  await page.locator('[data-field="href"]').fill('/clear.html');
  await page.locator('[data-field="href"]').dispatchEvent('input');
  await slot('sky').evaluate(el=>el.scrollIntoView({block:'center'}));
  await slot('sky').click();
  const before=await slot('sky').boundingBox();
  await page.mouse.move(before.x+before.width/2,before.y+before.height/2);await page.mouse.down();
  await page.mouse.move(before.x+before.width/2+8,before.y+before.height/2+10,{steps:5});await page.mouse.up();
  const moved=await slot('sky').boundingBox();assert.ok(moved.x>before.x+5);
  await button('undo').click();await button('redo').click();
  await button('replace').click();
  const chooserPromise=page.waitForEvent('filechooser');await button('file').click();
  await (await chooserPromise).setFiles({name:'home-test.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await slot('sky').locator('img').waitFor();
  assert.equal(await page.locator('.room-piece').count(),count);
  assert.equal(await slot('sky').getAttribute('data-role'),'sky');
  await page.locator('[data-field="fit"]').selectOption('contain');
  assert.equal(await slot('sky').locator('img').evaluate(el=>getComputedStyle(el).objectFit),'contain');
  await page.locator('[data-field="fit"]').selectOption('cover');
  await page.locator('[data-field="cropX"]').fill('35');await page.locator('[data-field="cropX"]').dispatchEvent('input');
  await page.locator('[data-field="cropY"]').fill('60');await page.locator('[data-field="cropY"]').dispatchEvent('input');
  assert.equal(await slot('sky').locator('img').evaluate(el=>getComputedStyle(el).objectPosition),'35% 60%');
  const handle=await slot('sky').locator('.author-handle').boundingBox();
  const originalWidth=(await slot('sky').boundingBox()).width;
  await page.mouse.move(handle.x+14,handle.y+14);await page.mouse.down();
  await page.mouse.move(handle.x+24,handle.y+24,{steps:4});await page.mouse.up();
  assert.ok((await slot('sky').boundingBox()).width>originalWidth);
  await page.locator('[data-field="rotation"]').fill('-7');await page.locator('[data-field="rotation"]').dispatchEvent('input');
  await button('front').click();await button('back').click();
  await button('duplicate').click();assert.equal(await page.locator('[data-role="sky"]').count(),2);
  await button('undo').click();assert.equal(await page.locator('[data-role="sky"]').count(),1);
  // Existing editor clipboard/drop workflows remain available on the longer canvas.
  for(const event of ['paste','drop']) {
    await page.evaluate(({event,png})=>{
      document.activeElement?.blur();
      const dt=new DataTransfer();dt.items.add(new File([Uint8Array.from(atob(png),c=>c.charCodeAt(0))],'test.png',{type:'image/png'}));
      document.body.dispatchEvent(event==='drop'?new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt,clientX:100,clientY:350}):new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:dt}));
    },{event,png});
    await page.waitForTimeout(500);
  }
  assert.equal(await page.locator('.room-piece').count(),count+2);
  const saved=page.waitForResponse(r=>r.url().endsWith('/__author/save'));
  await button('save').click();const response=await saved;assert.equal(response.status(),200,await response.text());
  await page.waitForTimeout(1500);await page.reload();await slot('sky').locator('img').waitFor();
  const data=JSON.parse(await readFile(manifest,'utf8'));assert.equal(data.find(i=>i.id==='home-sky').kind,'image');
  assert.equal(data.find(i=>i.id==='home-sky').rotation,-7);
  assert.equal(data.find(i=>i.id==='home-sky').objectPosition,'35% 60%');
  assert.equal(data.find(i=>i.id==='home-intro-body').text,'Shared editable body copy.');
  assert.equal(data.find(i=>i.id==='home-moments').parts[0],'Edited moments');
  assert.equal(data.find(i=>i.id==='home-portal').href,'/clear.html');
  assert.deepEqual(data.find(i=>i.id==='home-sky').desktop,scene.find(i=>i.id==='home-sky').desktop);
  assert.notDeepEqual(data.find(i=>i.id==='home-sky').mobile,scene.find(i=>i.id==='home-sky').mobile);
  await page.setViewportSize({width:1100,height:900});
  await page.reload();
  assert.equal(await slot('intro-body').locator('p').textContent(),'Shared editable body copy.');
  console.log('PASS grouped captions, shared text/link edits, saved mobile placement independent of desktop');
  await page.goto('http://localhost:4321/');await slot('sky').locator('img').waitFor();
  assert.equal(await page.locator('.author-panel,.author-selected,.author-handle').count(),0);
  assert.equal(await slot('portal').locator('a').getAttribute('href'),'/clear.html');
  assert.deepEqual(errors,[]);
  console.log('PASS drag, undo/redo, Replace → FILE upload, FIT/FILL, tilt, layers, duplicate material, paste/drop, save, refresh restoration, clean normal mode, portal link');
  console.log(`Screenshots: ${output}`);
} finally {
  await browser.close();await writeFile(manifest,backup);
  for (const file of await readdir(folder)) if(!files.has(file)) await unlink(resolve(folder,file));
}