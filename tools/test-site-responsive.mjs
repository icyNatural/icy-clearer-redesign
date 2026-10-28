import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
const origin = process.env.SITE_TEST_ORIGIN || 'http://localhost:4321';
const output = join(tmpdir(), 'icy-site-validation');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage(); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const route of ['/', '/moments.html', '/games.html', '/clear.html', '/world.html', '/worlds.html', '/gaming/']) {
    const widths = route === '/' ? [320, 360, 390, 430, 700, 701, 1280, 1440, 1920] : [390, 1440];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(origin + route);
      assert.equal(response.status(), 200, route);
      await page.waitForTimeout(500);
      await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} overflow at ${width}`);
      assert.equal(await page.locator('.author-panel').count(), 0);
      const broken = await page.locator('img').evaluateAll(nodes => nodes.filter(node => node.complete && !node.naturalWidth && node.getBoundingClientRect().height > 0).map(node => node.src));
      assert.deepEqual(broken, [], `${route} broken loaded images`);
      await page.screenshot({ path: join(output, `${route.replace(/\W/g, '') || 'home'}-${width}.png`), fullPage: true });
      console.log(`PASS ${route} ${width}: route, overflow, loaded images, no author panel`);
    }
  }
  assert.deepEqual(errors, [], 'no runtime errors');
} finally { await browser.close(); }
console.log(`Screenshots: ${output}`);