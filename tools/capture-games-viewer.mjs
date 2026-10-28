// Capture the real preview/loading state while the third-party API request is
// held. No fake player, replacement media, or generated frames are used.
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
const origin = process.env.GAMING_TEST_ORIGIN || 'http://127.0.0.1:4347';
const output = new URL('../docs/gaming-highlights/', import.meta.url).pathname;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [360,390,430,1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    let release;
    const wait = new Promise(resolve => { release = resolve; });
    await context.route('https://www.youtube.com/iframe_api', async route => { await wait; await route.abort(); });
    await page.goto(origin + '/games.html');
    await page.locator('.watch-preview img').evaluate(node => node.decode());
    await page.locator('.watch-preview').click();
    await page.waitForSelector('dialog[open]');
    await page.waitForTimeout(100);
    await page.screenshot({ path: output + `viewer-landscape-preview-${width}.jpg` });
    await page.getByRole('button', { name: 'Next video', exact: true }).click();
    await page.locator('[data-viewer-media]').evaluate(async node => { const image = new Image(); image.src = getComputedStyle(node).backgroundImage.slice(5,-2); await image.decode(); });
    // Force a full viewport repaint after the native dialog resizes its media.
    await page.setViewportSize({ width: width + 1, height: 900 });
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(100);
    await page.screenshot({ path: output + `viewer-short-preview-${width}.jpg` });
    await page.keyboard.press('Escape'); release();
    // Existing full evaluation is optional depth; it is not reimplemented here.
    if ([390,1440].includes(width)) {
      await page.waitForURL(origin + '/games.html');
      await page.locator('.take-links a').first().click();
      await page.waitForFunction(() => window.GOS?.gos?.context().booted);
      await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
      await page.screenshot({ path: output + `naraka-results-${width}.jpg`, fullPage: true });
    }
    await context.close();
    console.log(`CAPTURE ${width}: native landscape/Short viewer previews and existing evaluation`);
  }
} finally { await browser.close(); }
