import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
const origin = process.env.NATURAL_TEST_ORIGIN || 'http://localhost:4321';
const items = JSON.parse(await readFile(new URL('../src/data/media/natural.json', import.meta.url)));
const real = items.filter(item => ['image','video','youtube'].includes(item.kind) && !item.deleted && item.curated !== false && (!item.visibility || item.visibility === 'public'));
// Browser-only fixtures reuse real media. No manifest is written or published.
const signals = ['PLAY','VOICE','OBSERVE','ARCHIVE','MAKE','NOW'];
const fixture = signals.flatMap((signal, index) => Array.from({length:index+1}, (_, i) => ({ ...real[i % real.length], id:`layout-${signal}-${i}`, signals:[signal] })));
const output = process.env.NATURAL_LAYOUT_OUTPUT || join(tmpdir(), 'icy-signal-review');
await mkdir(output,{recursive:true});
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.route('**/natural.html', async route => {
    const response = await route.fetch();
    const html = (await response.text()).replace(/(<script[^>]*data-natural-content[^>]*>)[\s\S]*?(<\/script>)/, (_, open, close) => open + JSON.stringify(fixture).replace(/</g,'\\u003c') + close);
    await route.fulfill({response,body:html});
  });
  for(const width of [360,390,430,1440]) {
    await page.setViewportSize({width,height:900});
    await page.goto(origin+'/natural.html');
    await page.waitForFunction(() => document.querySelector('[data-signal-cluster=NOW]')?.dataset.itemCount === '6');
    assert.deepEqual(await page.locator('.signal-artifacts').evaluateAll(nodes => nodes.map(node => node.dataset.layout)), ['hero','split','lead','quad','mosaic','mosaic']);
    assert.deepEqual(await page.locator('.signal-artifacts').evaluateAll(nodes => nodes.map(node => node.querySelectorAll('figure').length)), [1,2,3,4,5,6]);
    assert.ok(await page.locator('.signal-artifact').evaluateAll(nodes => nodes.every(node => {const r=node.getBoundingClientRect(),c=node.closest('.signal-cluster').getBoundingClientRect();return r.width>0&&r.left>=c.left&&r.right<=c.right+1;})));
    const checkPreviews = async () => {
      assert.ok(await page.locator('.artifact-preview:visible').evaluateAll(nodes => nodes.every(node => {
        const r = node.getBoundingClientRect();
        const aspect = parseFloat(getComputedStyle(node.parentElement).getPropertyValue('--artifact-aspect'));
        return r.width > 0 && r.height > 0 && Math.abs(r.width / r.height - aspect) < .04;
      })), 'mixed native-aspect frames remain unstretched');
    };
    await checkPreviews();
    if (width === 1440) {
      const rows = await page.locator('[data-signal-cluster=NOW] figure').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().top));
      assert.ok(Math.abs(rows[1]-rows[3]) < 1 && Math.abs(rows[4]-rows[5]) < 1, 'six-item mosaic uses balanced 1 + 3 + 2 rows');
      for (const target of await page.locator('[data-layout=mosaic] .artifact-video-preview').all()) {
        await target.scrollIntoViewIfNeeded();
        assert.ok(await target.evaluate(node => { const r=node.getBoundingClientRect(); return node.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)); }), 'mosaic play target is not covered by caption');
      }
    }
    await page.addStyleTag({content:'astro-dev-toolbar{display:none!important}'});
    await page.screenshot({path:join(output,`natural-counts-${width}.jpg`),fullPage:true,quality:85});
    for(const signal of signals) {
      await page.locator(`.signal-rail [data-signal-select=${signal}]`).click();
      assert.equal(await page.locator('.signal-cluster:visible').count(),1);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await checkPreviews();
      const frames = await page.locator('.signal-cluster:visible .signal-artifact').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width }; }));
      if (signal === 'PLAY') {
        const width = await page.locator('.signal-cluster:visible .signal-artifacts').evaluate(node => node.getBoundingClientRect().width);
        assert.ok(frames[0].width > width * .95, 'single landscape preview fills the featured window');
      }
      if (signal === 'VOICE' || signal === 'ARCHIVE') {
        assert.ok(Math.abs(frames[0].y - frames[1].y) < 1 && frames[1].x > frames[0].x, 'split/quadrant preserves paired columns');
      }
      if (signal === 'OBSERVE') assert.ok(frames[0].width > frames[1].width * 1.8, 'selected lead spans both support columns');
      if(width===390) await page.screenshot({path:join(output,`natural-count-${signal.toLowerCase()}-390.jpg`),fullPage:true,quality:85});
      await page.locator('.signal-rail [data-signal-select=ALL]').click();
    }
    console.log(`PASS adaptive layouts ${width}: 1/2/3/4/5/6 real-media fixtures, selected filtering, bounds`);
  }
} finally {await browser.close();}