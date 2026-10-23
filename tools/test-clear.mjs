import { createRequire } from 'node:module';
import { readFile, writeFile, readdir, unlink, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const manifest = resolve('src/data/media/clear.json');
const folder = resolve('public/media/clear');
const backup = await readFile(manifest); await mkdir(folder,{recursive:true});
const files = new Set(await readdir(folder));
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
const output=resolve(process.env.TEMP||'.','icy-clear-validation');await mkdir(output,{recursive:true});
const input=async (selector,value)=>{await page.locator(selector).fill(String(value));await page.locator(selector).dispatchEvent('input');};
const overflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
try {
  for(const width of [360,390,430,1440]){
    await page.setViewportSize({width,height:844});await page.goto('http://localhost:4321/clear.html');
    await page.locator('[data-particles] circle').first().waitFor();await page.evaluate(()=>document.fonts.ready);
    await overflow();assert.equal(await page.locator('.author-panel').count(),0);assert.equal(await page.locator('.source-model').count(),5);
    assert.equal(await page.locator('.dock,.next-exhibit,.previous-exhibit').count(),0);
    await page.addStyleTag({content:'astro-dev-toolbar{display:none!important}'});
    await page.screenshot({path:resolve(output,`clear-${width}.png`),fullPage:true});
    await page.locator('[data-freeze]').tap();assert.equal(await page.locator('[data-observe-state]').innerText(),'SIGNAL FROZEN');
    const path=await page.locator('[data-form]').getAttribute('d');await page.waitForTimeout(150);assert.equal(await page.locator('[data-form]').getAttribute('d'),path);
    await page.locator('#event-label').fill('A warning');await page.locator('[data-label-form] button').tap();
    assert.match(await page.locator('[data-commit-log]').innerText(),/3 alternate interpretations discarded/);
    await page.locator('#event-label').fill('A possibility');await page.locator('[data-label-form] button').tap();assert.equal(await page.locator('[data-form-label]').textContent(),'A POSSIBILITY');
    await page.locator('[data-release]').tap();assert.equal(await page.locator('[data-observe-state]').innerText(),'OBSERVING');
    await page.locator('[data-frame-choice=story]').tap();assert.equal(await page.locator('body').getAttribute('data-world-frame'),'story');assert.ok(await page.locator('.story-space').isVisible());
    const storyBg=await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor);
    await page.locator('[data-frame-choice=system]').tap();await page.waitForTimeout(800);assert.ok(await page.locator('.system-space').isVisible());assert.ok(await page.locator('.story-space').isHidden());
    assert.notEqual(await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),storyBg);await overflow();
    const single=await page.locator('[data-time-path]').getAttribute('d');await input('[data-time-window]',120);assert.match(await page.locator('[data-time-kind]').innerText(),/FEEDBACK/);assert.notEqual(await page.locator('[data-time-path]').getAttribute('d'),single);
    const wide=await page.locator('[data-time-path]').getAttribute('d');await input('[data-time-scrub]',400);assert.notEqual(await page.locator('[data-time-path]').getAttribute('d'),wide);
    await page.locator('[data-redaction]').tap();assert.ok(await page.locator('[data-missing]').isVisible());
    await page.locator('[data-evidence-toggle=observed]').tap();assert.match(await page.locator('[data-evidence-verdict]').innerText(),/detached/);await page.locator('[data-evidence-toggle=observed]').tap();
    await input('[data-peel]',100);assert.match(await page.locator('[data-evidence-verdict]').innerText(),/Intent does not/);
    assert.equal(await page.locator('.file-layer.is-peeled').count(),3);
    await page.locator('[data-lock]').tap();await page.waitForTimeout(1500);assert.ok(parseInt(await page.locator('[data-coherence-value]').innerText())>40);
    await page.locator('[data-lock]').tap();await page.waitForTimeout(1800);assert.ok(parseInt(await page.locator('[data-coherence-value]').innerText())<10);
    // Actual touchscreen press + release exercises pointer capture, not a synthetic click.
    const hold=page.locator('[data-hold]');await hold.scrollIntoViewIfNeeded();
    const rect=await hold.boundingBox();const cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rect.x+rect.width/2,y:rect.y+rect.height/2}]});await page.waitForTimeout(1000);
    assert.equal(await hold.getAttribute('aria-pressed'),'true');await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await hold.getAttribute('aria-pressed'),'false');await cdp.detach();
    await overflow();console.log(`PASS ${width}px: clean layout + five distinct working instruments + touch hold/release`);
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('http://localhost:4321/clear.html#coherence');await page.locator('[data-lock]').tap();await page.waitForTimeout(150);assert.equal(await page.locator('[data-coherence-value]').innerText(),'65%');
  for(const href of await page.locator('.source-model').evaluateAll(els=>els.map(el=>el.getAttribute('href')))) {const r=await page.request.get('http://localhost:4321'+href);assert.equal(r.status(),200);}
  console.log('PASS reduced-motion field controls and all five source-model destinations');
  await page.setViewportSize({width:390,height:844});await page.goto('http://localhost:4321/clear.html?edit=1');await page.locator('.author-panel').waitFor();
  await page.locator('[data-action=text]').click();await page.locator('[data-field=text]').fill('CLEAR persistence check');await page.locator('[data-field=text]').blur();
  const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2ZAAAAABJRU5ErkJggg==';
  await page.locator('input[type=file]').setInputFiles({name:'clear-test.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await page.locator('.room-piece img').waitFor();
  const saved=page.waitForResponse(r=>r.url().endsWith('/__author/save'));await page.locator('[data-action=save]').click();const r=await saved;assert.equal(r.status(),200,await r.text());
  await page.waitForTimeout(1300);await page.reload();await page.locator('.room-piece img').waitFor();assert.equal(await page.locator('.source-text').innerText(),'CLEAR persistence check');
  await page.goto('http://localhost:4321/clear.html');await page.locator('.room-piece img').waitFor();assert.equal(await page.locator('.author-panel,.author-handle').count(),0);
  assert.deepEqual(errors,[]);console.log('PASS Local Studio initialization, text/media add, upload, save, refresh restoration, clean normal mode');console.log(`Screenshots: ${output}`);
}finally{await browser.close();await writeFile(manifest,backup);for(const file of await readdir(folder))if(!files.has(file))await unlink(resolve(folder,file));}