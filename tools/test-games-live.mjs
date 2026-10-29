// Optional real third-party smoke check. Output distinguishes successful API
// initialization from unverified/blocked streaming; it never mocks YouTube.
import { createRequire } from 'node:module';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
const origin = process.env.GAMING_TEST_ORIGIN || 'http://127.0.0.1:4347';
const output = process.env.GAMING_TEST_OUTPUT || fileURLToPath(new URL('../docs/gaming-highlights/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.GAMING_BROWSER_PROXY ? { proxy: { server: process.env.GAMING_BROWSER_PROXY, bypass: 'localhost,127.0.0.1' } } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 900 }, ignoreHTTPSErrors: process.env.GAMING_IGNORE_PROXY_CERT === '1' });
  const failures = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => { if (/googlevideo|youtube.*embed/.test(request.url())) failures.push({ host: new URL(request.url()).hostname, error: request.failure()?.errorText }); });
  await page.goto(origin + '/games.html'); await page.locator('.watch-preview').click();
  let state;
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.waitForTimeout(5000);
    const frame = page.frames().find(frame => frame.url().includes('youtube-nocookie.com/embed/'));
    state = frame ? await frame.evaluate(() => { const video = document.querySelector('video'); return { video: !!video, time: video?.currentTime ?? 0, ready: video?.readyState ?? 0, paused: video?.paused, error: document.querySelector('.ytp-error')?.textContent || '' }; }).catch(() => null) : null;
    if (state?.time > 0 || state?.error) break;
  }
  const result = { apiInitialized: await page.evaluate(() => !!window.YT?.Player), playerCount: await page.locator('iframe').count(), status: await page.locator('[data-viewer-status]').textContent(), stream: state, streamingVerified: !!state && state.time > 0, failures, errors };
  await page.screenshot({ path: join(output, 'youtube-api-390.jpg') });
  await writeFile(join(output, 'youtube-smoke.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  if (!result.streamingVerified) console.log('LIMITATION: third-party streaming was not verified in this environment. See youtube-smoke.json.');
  if (errors.length) process.exitCode = 1;
} finally { await browser.close(); }
