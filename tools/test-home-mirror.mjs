// Public checks are read-only. Enable HOME_MIRROR_TEST_EDITOR only against an
// isolated local author-mode checkout: that portion verifies save/reload.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
const origin=process.env.HOME_MIRROR_TEST_ORIGIN || 'http://127.0.0.1:4325';
const editor=process.env.HOME_MIRROR_TEST_EDITOR==='1';
assert.ok(!editor || ['127.0.0.1','localhost'].includes(new URL(origin).hostname),'Editor tests require an isolated local origin');
const output=resolve(process.env.HOME_MIRROR_TEST_OUTPUT || 'home-mirror-validation');
await mkdir(output,{recursive:true});
const manifest=resolve('src/data/media/home.json');
const backup=await readFile(manifest);
const scene=JSON.parse(backup);
const protectedPaths=['src/pages/natural.astro','src/pages/world.astro','src/pages/clear.astro','src/pages/worlds.astro','src/pages/moments.astro','src/data/media/natural.json','src/data/media/moments.json','public/gaming/index.html','public/gaming/data/public-snapshot.json'];
const protectedFiles=await Promise.all(protectedPaths.map(path=>readFile(path)));
const browser=await chromium.launch({headless:true,...(process.env.HOME_MIRROR_TEST_EXECUTABLE ? {executablePath:process.env.HOME_MIRROR_TEST_EXECUTABLE}:{}),args:JSON.parse(process.env.HOME_MIRROR_TEST_CHROME_ARGS || '[]')});
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
page.setDefaultTimeout(30000);
// Font families can be installed on the test host. An external font service
// is outside this interaction check and must not hold navigation open.
await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,route=>route.abort());
const errors=[];page.on('pageerror',error=>errors.push(error.message));
const piece=id=>page.locator(`[data-author-id="${id}"]`);
const mirror=()=>piece('home-portal').locator('[data-living-mirror]');
const action=name=>page.locator(`[data-action="${name}"]`);
const report={origin,widths:[],editor:false,pageErrors:errors};
try {
 for(const width of (process.env.HOME_MIRROR_TEST_WIDTHS || '360,390,430,1440').split(',').map(Number)){
  await page.setViewportSize({width,height:844});
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>{const el=document.querySelector('[data-living-mirror]');return el&&getComputedStyle(el).position==='relative';});
  await page.evaluate(()=>document.fonts.ready);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No overflow '+width);
  assert.equal(await page.locator('.author-panel,.author-handle,.author-add-spot').count(),0);
  assert.equal(await mirror().count(),1);
  assert.equal(await piece('home-portal').locator('.source-paper').count(),0);
  assert.ok(!(await piece('home-portal').innerText()).includes('ADD YOUR MEDIA'));
  assert.ok((await piece('home-portal').getAttribute('class')).includes('room-shape-arch'));
  for(const item of scene.filter(i=>!i.deleted)){
   const expected=width<=700?item.mobile||item.desktop:item.desktop;
   const actual=await piece(item.id).evaluate(el=>({x:el.offsetLeft/el.offsetParent.clientWidth*100,y:el.offsetTop/el.offsetParent.clientHeight*100,w:el.offsetWidth/el.offsetParent.clientWidth*100,h:el.offsetHeight/el.offsetParent.clientHeight*100}));
   for(const [key,target] of Object.entries({x:expected.x,y:expected.y,w:expected.width,h:expected.height}))assert.ok(Math.abs(actual[key]-target)<.35,item.id+' preserves '+key+' at '+width);
  }
  await mirror().scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('[data-living-mirror]').dataset.running==='true');
  assert.equal(await mirror().evaluate(el=>getComputedStyle(el).touchAction),'pan-y');
  assert.ok(await mirror().locator('img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0)),'Existing images load');
  const moving=await mirror().evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length);
  assert.ok(moving>=3,'Actual animation is running');
  for(const signal of ['moments','natural','apps','clear','gaming']){
   await mirror().tap();assert.equal(await mirror().getAttribute('data-reflection'),signal);
   assert.equal(await mirror().getAttribute('data-resolved'),'true');
   if(signal==='apps'&&width===390){
    await page.waitForFunction(()=>+getComputedStyle(document.querySelector('.living-mirror__geometry--apps')).opacity>.65);
    await page.screenshot({path:resolve(output,'mirror-mobile-resolved.png'),timeout:45000});
   }
  }
  await page.waitForFunction(()=>!document.querySelector('[data-living-mirror]').dataset.resolved);
  await page.waitForFunction(()=>+getComputedStyle(document.querySelector('.living-mirror__readout')).opacity<.01);
  await page.screenshot({path:resolve(output,`home-${width}.png`),fullPage:width<=700,timeout:45000});
  const y=await page.evaluate(()=>scrollY);await mirror().hover();await page.mouse.wheel(0,130);
  await page.waitForFunction(y=>scrollY>y,y);
  await page.setViewportSize({width,height:400});await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
  await page.waitForFunction(()=>document.querySelector('[data-living-mirror]').dataset.running==='false');
  assert.ok(await mirror().evaluate(el=>el.getAnimations({subtree:true}).every(a=>a.playState==='paused')));
  await page.setViewportSize({width,height:844});
  // Preserve the existing HOME Games navigation exactly as requested.
  const gameLink=piece('home-games').locator('.room-piece__link');
  assert.equal(await gameLink.getAttribute('href'),'/gaming/');
  await gameLink.scrollIntoViewIfNeeded();
  assert.ok(await gameLink.evaluate(el=>{const b=el.getBoundingClientRect();return document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest('a')===el;}),'Mirror does not intercept Games');
  const worldLinks=[['natural','/natural.html'],['apps','/world.html'],['clear','/clear.html']];
  for(const [name,href] of worldLinks)assert.equal(await piece('home-world-'+name).getByRole('link').getAttribute('href'),href);
  report.widths.push({width,overflow:false,animationsRunning:moving,imagesLoaded:true,gamesDestination:'/gaming/',gamesHitTarget:true});
  console.log('PASS '+width+': scene geometry, real media, live animation, five tap signals, scroll/offscreen pause, Games destination/hit target, world links');
 }
 await page.setViewportSize({width:390,height:844});
 assert.ok((await piece('home-sky-note').innerText()).includes('Lens Captured'));
 assert.equal(await piece('home-sky').getByRole('link').getAttribute('href'),'/moments.html');
 const gallery=await browser.newPage();
 await gallery.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,route=>route.abort());
 await gallery.goto(origin+'/moments.html',{waitUntil:'domcontentloaded'});
 assert.ok(await gallery.locator('.moment-open').count()>0);
 assert.equal(await gallery.getByRole('link',{name:'Photogression ↗',exact:true}).getAttribute('href'),'https://photogression.icynatural.now');
 await gallery.close();
 await page.emulateMedia({reducedMotion:'reduce'});await mirror().scrollIntoViewIfNeeded();
 assert.equal(await mirror().getAttribute('data-running'),'false');
 assert.equal(await mirror().evaluate(el=>el.getAnimations({subtree:true}).length),0);
 assert.ok(+(await mirror().locator('.living-mirror__photo--water').evaluate(el=>getComputedStyle(el).opacity))>.3);
 await mirror().tap();assert.equal(await mirror().getAttribute('data-resolved'),'true');
 await page.screenshot({path:resolve(output,'mirror-reduced-motion.png'),timeout:45000});
 console.log('PASS Lens Capture, Moments, Photogression, intentional reduced-motion reflection and tap');
 const desktop=await browser.newPage({viewport:{width:1440,height:900}});
 await desktop.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,route=>route.abort());
 await desktop.goto(origin+'/',{waitUntil:'domcontentloaded'});
 const desktopMirror=desktop.locator('[data-living-mirror]');
 await desktopMirror.click();assert.equal(await desktopMirror.getAttribute('data-reflection'),'moments');
 await desktopMirror.press('Enter');assert.equal(await desktopMirror.getAttribute('data-reflection'),'natural');
 await desktopMirror.press('Space');assert.equal(await desktopMirror.getAttribute('data-reflection'),'apps');
 await desktop.waitForFunction(()=>+getComputedStyle(document.querySelector('.living-mirror__geometry--apps')).opacity>.65);
 await desktop.screenshot({path:resolve(output,'mirror-desktop-resolved.png'),timeout:45000});await desktop.close();
 console.log('PASS desktop mouse and keyboard');
 if(editor){
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(origin+'/?edit=1',{waitUntil:'domcontentloaded'});await page.locator('.author-panel').waitFor();
  await piece('home-portal').scrollIntoViewIfNeeded();const b=await piece('home-portal').boundingBox();
  await page.touchscreen.tap(b.x+b.width*.5,b.y+b.height*.5);
  assert.ok((await piece('home-portal').getAttribute('class')).includes('author-selected'));
  assert.equal(await mirror().getAttribute('data-running'),'false');
  assert.equal(await mirror().getAttribute('data-resolved'),null);
  const y=await piece('home-portal').evaluate(el=>el.offsetTop);await piece('home-portal').press('ArrowDown');
  assert.ok(await piece('home-portal').evaluate(el=>el.offsetTop)>y);
  const size=page.locator('[data-field="size"]');await size.focus();await size.press('Home');for(let i=0;i<27;i++)await size.press('ArrowRight');
  await page.locator('[data-field="href"]').fill('/natural.html');assert.equal(await mirror().getAttribute('href'),'/natural.html');
  await action('duplicate').click();assert.equal(await page.locator('[data-living-mirror]').count(),2);
  await action('delete').click();await action('undo').click();assert.equal(await page.locator('[data-living-mirror]').count(),2);
  await action('redo').click();assert.equal(await page.locator('[data-living-mirror]').count(),1);
  const saved=page.waitForResponse(r=>r.url().endsWith('/__author/save'));const reload=page.waitForNavigation({waitUntil:'domcontentloaded'});
  await action('save').click();assert.equal((await saved).status(),200);await reload;
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('.author-panel').waitFor();
  assert.equal(await mirror().getAttribute('href'),'/natural.html');
  assert.equal(JSON.parse(await readFile(manifest)).find(i=>i.id==='home-portal').mobile.width,32);
  report.editor=true;console.log('PASS Local Studio selection/move/size/link, duplicate/delete/undo/redo, save/reload');
 }
 assert.deepEqual(errors,[]);
 for(let i=0;i<protectedPaths.length;i++)assert.deepEqual(await readFile(protectedPaths[i]),protectedFiles[i],protectedPaths[i]+' unchanged');
 await writeFile(resolve(output,'verification.json'),JSON.stringify(report,null,2));
} catch(error) {
 await writeFile(resolve(output,'failure.json'),JSON.stringify({url:page.url(),error:String(error),worlds:await page.evaluate(()=>[...document.querySelectorAll('[data-author-id]')].map(el=>({id:el.getAttribute('data-author-id'),html:el.getAttribute('data-author-id')?.startsWith('home-world-')?el.outerHTML:undefined,display:getComputedStyle(el).display,visibility:getComputedStyle(el).visibility}))).catch(()=>[])},null,2));
 throw error;
} finally {if(editor)await writeFile(manifest,backup);await browser.close();}
