// Read-only network/startup checks. Requires an existing Playwright install.
// The separate test-moments.mjs exercises writes with backup/restoration.
import { createRequire } from 'node:module';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const candidates = process.env.PLAYWRIGHT_PATH ? [process.env.PLAYWRIGHT_PATH] : ['playwright', ...(await readdir(dirname(root), {withFileTypes:true})).filter(e => e.isDirectory()).map(e => join(dirname(root), e.name, 'node_modules/playwright'))];
let chromium;
for (const candidate of candidates) { try { ({chromium} = require(candidate)); if (chromium) break; } catch {} }
assert.ok(chromium, 'Set PLAYWRIGHT_PATH to an existing Playwright install');
const origins = (process.env.AUTHOR_TEST_ORIGINS || 'http://localhost:4321,http://100.118.199.50:4321').split(',');
const browser = await chromium.launch({headless:true});
try {
  for (const origin of origins) {
    for (const mobile of [false, true]) for (const route of ['/', '/?edit=1', '/moments.html', '/moments.html?edit=1']) {
      const page = await browser.newPage({viewport:{width:mobile ? 390 : 1440,height:844},hasTouch:mobile,isMobile:mobile});
      const errors = [], failures = [], sockets = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('requestfailed', r => failures.push({url:r.url(),error:r.failure()?.errorText}));
      page.on('websocket', s => sockets.push(s.url().split('?')[0]));
      assert.equal((await page.goto(origin + route, {waitUntil:'domcontentloaded'})).status(), 200);
      const author = route.includes('?edit=1');
      if (author) await page.locator('.author-panel').waitFor();
      await page.waitForFunction(() => performance.getEntriesByName('first-contentful-paint').length > 0);
      const result = await page.evaluate(() => ({
        fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
        init:performance.getEntriesByName('icy-author:initializing editor')[0]?.startTime,
        studio:!!document.querySelector('.author-panel'),
        overflow:document.documentElement.scrollWidth-innerWidth,
        secure:isSecureContext,uuid:typeof crypto.randomUUID,
        objects:document.querySelectorAll('[data-author-id]').length,
        nodes:document.querySelectorAll('*').length,
        manifestBytes:document.querySelector('[data-author-manifest]')?.textContent.length,
        scripts:performance.getEntriesByType('resource').filter(r=>r.initiatorType==='script').map(r=>({url:r.name,ms:Math.round(r.duration),bytes:r.transferSize}))
      }));
      assert.equal(result.studio, author);
      if (author) assert.ok(result.fcp <= result.init, `page paint precedes Studio: ${JSON.stringify(result)}`);
      assert.ok(result.overflow <= 1);
      assert.deepEqual(errors, []);
      assert.deepEqual(failures, []);
      if (author && mobile && route.startsWith('/moments.html')) {
        await page.locator('[data-action="add"]').click();
        const chooser = page.waitForEvent('filechooser');
        await page.locator('[data-action="file"]').click();
        const picker = await chooser;
        assert.ok(picker.isMultiple(), 'ADD MEDIA → FILE supports multiple photos');
        await picker.setFiles([]);
      }
      console.log(JSON.stringify({origin,route,mobile,...result,sockets}));
      await page.close();
    }
    // Valid security headers get past the origin guard, but deliberately invalid
    // room data ensures this read-only test can never write a manifest.
    for (const [requestOrigin, marker, expected] of [[origin,'1',400],['http://attacker.invalid','1',403],['http://localhost:9999','1',403],[origin,'',403],['null','1',403]]) {
      const response = await fetch(`${origin}/__author/save`, {method:'POST',headers:{Origin:requestOrigin,'X-Icy-Author':marker,'Content-Type':'application/json'},body:JSON.stringify({room:'invalid-test-room',items:[]})});
      assert.equal(response.status, expected);
      console.log('SECURITY', origin, requestOrigin, expected, await response.text());
    }
    for (const scenario of ['failed-module','stalled-module','broken-hmr']) {
      const page = await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
      if (scenario === 'failed-module') await page.route('**/src/scripts/local-author.ts*', route => route.abort('failed'));
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      if (scenario === 'stalled-module') await page.route('**/src/scripts/local-author.ts*', async route => { await gate; await route.continue(); });
      if (scenario === 'broken-hmr') await page.routeWebSocket(/.*/, socket => socket.close());
      try {
        await page.goto(`${origin}/moments.html?edit=1`, {waitUntil:'commit'});
        await page.locator('.moments-header h1').waitFor();
        await page.waitForFunction(() => performance.getEntriesByName('first-contentful-paint').length > 0);
        if (scenario === 'failed-module') {
          await page.waitForFunction(() => window.__icyAuthorStartup?.stage.startsWith('startup failed:'));
          assert.ok(await page.locator('[data-author-startup]').isVisible());
        } else if (scenario === 'stalled-module') {
          await page.waitForFunction(() => window.__icyAuthorStartup?.stage.startsWith('editor module still loading'), null, {timeout:18000});
          assert.equal(await page.locator('.author-panel').count(), 0);
          assert.ok(await page.locator('[data-author-startup]').isVisible());
          release(); await page.locator('.author-panel').waitFor();
        } else await page.locator('.author-panel').waitFor();
        console.log('PASS', origin, scenario, 'underlying page visible');
      } finally { release(); await page.close(); }
    }
  }
  async function scan(folder) {
    for (const entry of await readdir(folder,{withFileTypes:true})) {
      const path = join(folder,entry.name);
      if (entry.isDirectory()) await scan(path);
      else if (/\.(html|js|mjs|css|json)$/.test(path)) assert.doesNotMatch(await readFile(path,'utf8'), /__author\/|LOCAL STUDIO|src\/scripts\/local-author|data-author-startup|data-author-manifest|Same-origin editor requests only/, path);
    }
  }
  await scan(join(root,'dist'));
  console.log('PASS static dist: no author bootstrap, UI, modules or write handlers');
} finally { await browser.close(); }