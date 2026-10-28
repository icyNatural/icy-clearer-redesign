import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {signals,signalGlyph,infiniteMindIdentity} from '../src/scripts/natural-signals.ts';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const origin=process.env.NATURAL_TEST_ORIGIN||'http://localhost:4321';
const output='docs/natural-symbols';await mkdir(output,{recursive:true});
assert.deepEqual(signals.map(s=>s.symbol),['◈','∿','𓂀','🗃','⊕','⟡']);
assert.equal(infiniteMindIdentity.symbol,'∞');
for(const signal of signals){assert.match(signalGlyph(signal),/aria-hidden="true"/);assert.doesNotMatch(signalGlyph(signal),/<text|<image|<use/);}
const browser=await chromium.launch({headless:true});
try{const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
for(const width of [360,390,430,1440]){await page.setViewportSize({width,height:900});await page.goto(origin+'/natural.html',{waitUntil:'networkidle'});await page.addStyleTag({content:'astro-dev-toolbar{display:none!important}'});
for(const state of ['ALL',...signals.map(s=>s.id)]){await page.locator(`.signal-rail [data-signal-select="${state}"]`).click();
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
assert.equal(await page.locator('video,iframe').count(),0,'selection remains preview-first');
const visible=page.locator('.signal-cluster:visible');assert.equal(await visible.count(),state==='ALL'?6:1);
if(state==='ALL'){assert.ok(await visible.evaluateAll(els=>els.every(el=>el.querySelector('.signal-head strong').scrollWidth<=el.querySelector('.signal-head strong').clientWidth+1)),'headings fit');if(width<700)assert.ok(await visible.evaluateAll(els=>els.every(el=>el.getBoundingClientRect().height<250)),'compact field');}
else{const signal=signals.find(s=>s.id===state);assert.equal(await visible.locator('.signal-meaning').innerText(),signal.meaning);assert.equal(await visible.locator('.signal-emblem svg').count(),1);assert.ok(await visible.locator('.signal-meaning').isVisible());}
for(const image of await page.locator('.signal-cluster:visible img').all()){await image.scrollIntoViewIfNeeded();await image.evaluate(el=>el.decode());assert.ok(await image.evaluate(el=>el.naturalWidth>0),'real media decoded');}
await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';scrollTo({top:0,behavior:'instant'});});await page.waitForFunction(()=>scrollY===0);await page.waitForTimeout(250);
await page.screenshot({path:`${output}/${width}-${state.toLowerCase()}.jpg`,quality:80,fullPage:true});}
console.log(`PASS symbolic Natural ${width}: all seven states, vector identities, readable labels, native previews, compact field, no overflow`);}
await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.is-active .signal-mark svg').evaluate(el=>getComputedStyle(el).animationName),'none');assert.deepEqual(errors,[]);
}finally{await browser.close();}
