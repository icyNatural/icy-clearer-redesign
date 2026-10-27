import { createRequire } from "node:module";
import { readFile, writeFile, readdir, unlink, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const origin = process.env.CLEAR_TEST_ORIGIN || "http://127.0.0.1:4351";
const output = resolve(
  process.env.CLEAR_TEST_OUTPUT || "/tmp/icy-clear-validation",
);
const manifest = resolve("src/data/media/clear.json");
const mediaFolder = resolve("public/media/clear");
const backup = await readFile(manifest);
await mkdir(mediaFolder, { recursive: true });
await mkdir(output, { recursive: true });
const mediaFiles = new Set(await readdir(mediaFolder));
const protectedPaths = [
  "src/pages/index.astro",
  "src/pages/moments.astro",
  "src/pages/natural.astro",
  "src/pages/games.astro",
  "src/pages/world.astro",
  "src/pages/worlds.astro",
  "src/components/MediaRoom.astro",
  "src/scripts/local-author.ts",
  "src/scripts/home-mirror.ts",
  "src/data/media/home.json",
  "src/data/media/moments.json",
  "src/data/media/natural.json",
  "src/data/media/worlds.json",
  "package.json",
  "package-lock.json",
  "tools/local-author.mjs",
];
const digest = async (path) =>
  createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
const protectedHashes = new Map(
  await Promise.all(
    protectedPaths.map(async (path) => [path, await digest(path)]),
  ),
);
let server,
  serverLog = "",
  browser,
  page,
  touchClient;
const errors = [];
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const launch = { headless: true };
if (process.env.CHROMIUM_EXECUTABLE)
  launch.executablePath = process.env.CHROMIUM_EXECUTABLE;
if (process.env.CLEAR_CHROMIUM_ARGS)
  launch.args = JSON.parse(process.env.CLEAR_CHROMIUM_ARGS);
const overflow = async () => {
  const result = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll("body *")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1);
      })
      .slice(0, 5)
      .map((el) => ({ tag: el.tagName, class: el.getAttribute("class") })),
  }));
  assert.ok(result.scroll <= result.width, JSON.stringify(result));
};
const activate = async (locator) => {
  if ((await page.viewportSize()).width >= 760) return locator.click();
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  await touchClient.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 0 },
    ],
  });
  await pause(40);
  await touchClient.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await pause(80);
};
const drag = async (selector, from, to, touch) => {
  const locator = page.locator(selector);
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  const points = Array.from({ length: 9 }, (_, i) => ({
    x: box.x + box.width * (from.x + ((to.x - from.x) * i) / 8),
    y: box.y + box.height * (from.y + ((to.y - from.y) * i) / 8),
  }));
  // Chromium's native post-swipe gesture quarantine also suppresses taps on plain HTML buttons.
  // Let a completed CDP swipe settle before beginning another independent touch.
  if (touch) {
    await touchClient.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ ...points[0], id: 0 }],
    });
    for (const point of points.slice(1)) {
      await pause(16);
      await touchClient.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ ...point, id: 0 }],
      });
    }
    await touchClient.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await pause(550);
  } else {
    await page.mouse.move(points[0].x, points[0].y);
    await page.mouse.down();
    for (const point of points.slice(1))
      await page.mouse.move(point.x, point.y);
    await page.mouse.up();
  }
};
const capture = async (name, selector) => {
  if (selector) await page.locator(selector).scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(output, name) });
};
try {
  if (process.env.CLEAR_TEST_START_SERVER === "1") {
    const port = new URL(origin).port || "4351";
    server = spawn(
      process.execPath,
      [
        "tools/astro.mjs",
        "dev",
        "--mode",
        "author",
        "--host",
        "127.0.0.1",
        "--port",
        port,
        "--ignore-lock",
      ],
      { stdio: ["ignore", "pipe", "pipe"], env: process.env },
    );
    server.stdout.on("data", (data) => (serverLog += data));
    server.stderr.on("data", (data) => (serverLog += data));
    for (let i = 0; i < 200; i++) {
      try {
        if ((await fetch(origin + "/clear.html")).ok) break;
      } catch {}
      if (i === 199) throw new Error("Author server failed: " + serverLog);
      await pause(550);
    }
  }
  browser = await chromium.launch(launch);
  for (const width of process.env.CLEAR_TEST_SECTION === "studio"
    ? []
    : [360, 390, 430, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      hasTouch: width < 760,
      isMobile: width < 760,
    });
    page = await context.newPage();
    if (width < 760) touchClient = await context.newCDPSession(page);
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(origin + "/clear.html");
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({
      content: "astro-dev-toolbar{display:none!important}",
    });
    assert.equal(await page.locator("[data-instrument]").count(), 4);
    assert.equal(await page.locator(".author-panel").count(), 0);
    assert.ok(
      await page.evaluate(() => document.fonts.check('30px "Clear Bodoni"')),
    );
    await overflow();
    await capture(`clear-${width}-observer.png`);
    // Naming follows the held event; neither naming nor renaming changes it.
    await activate(page.locator("[data-observer-field]"));
    assert.equal(
      await page.locator("[data-observer-state]").innerText(),
      "OBSERVED",
    );
    const held = await page.locator("[data-event-form]").getAttribute("d");
    await pause(130);
    assert.equal(
      await page.locator("[data-event-form]").getAttribute("d"),
      held,
    );
    await page.locator("#event-label").fill("An organism");
    await activate(page.locator("[data-label-form] button[type=submit]"));
    assert.equal(
      await page.locator("[data-observer-state]").innerText(),
      "INTERPRETATION APPLIED",
    );
    assert.equal(
      await page.locator("[data-event-form]").getAttribute("d"),
      held,
    );
    await page.locator("#event-label").fill("A current");
    await activate(page.locator("[data-label-form] button[type=submit]"));
    assert.equal(
      await page.locator("[data-event-word]").textContent(),
      "A CURRENT",
    );
    await activate(page.locator("[data-recall]"));
    assert.equal(
      (await page.locator("[data-event-form]").getAttribute("d")).match(/L/g)
        .length,
      15,
    );
    assert.equal(
      await page.locator("[data-event-retained]").getAttribute("d"),
      held,
    );
    await activate(page.locator("[data-recall]"));
    assert.equal(
      await page.locator("[data-event-form]").getAttribute("d"),
      held,
    );
    await drag(
      "[data-observer-field]",
      { x: 0.3, y: 0.47 },
      { x: 0.68, y: 0.47 },
      width < 760,
    );
    assert.notEqual(
      await page.locator("[data-event-form]").getAttribute("d"),
      held,
    );
    assert.equal(
      await page.locator("[data-observer-state]").innerText(),
      "FRAME SHIFTED",
    );
    await activate(page.locator("[data-reopen]"));
    await page.waitForFunction(
      () =>
        document.querySelector("[data-observer-state]").textContent ===
        "REOPENED",
      {},
      { timeout: 3000 },
    );
    assert.equal(
      await page.locator("[data-observer-state]").innerText(),
      "REOPENED",
    );
    // Coordinate translation retains the observations and error. Removing a term does not.
    await page.locator("[data-orbit-field]").press("ArrowRight");
    assert.equal(await page.locator("[data-model-day]").innerText(), "10");
    await drag(
      "[data-orbit-field]",
      { x: 0.9, y: 0.48 },
      { x: 0.68, y: 0.8 },
      width < 760,
    );
    assert.notEqual(await page.locator("[data-model-day]").innerText(), "10");
    const record = await page.locator("[data-sky-observations]").innerHTML();
    await activate(page.locator("[data-model-frame=sun]"));
    assert.equal(await page.locator("[data-model-error]").innerText(), "0.00°");
    assert.equal(
      await page.locator("[data-sky-observations]").innerHTML(),
      record,
    );
    assert.ok(
      !(
        await page.locator("[data-earth-orbit]").getAttribute("class")
      ).includes("is-erased"),
    );
    await activate(page.locator("[data-model-simplify]"));
    const error = parseFloat(
      await page.locator("[data-model-error]").innerText(),
    );
    assert.ok(error > 0);
    assert.equal(
      await page.locator("[data-sky-observations]").innerHTML(),
      record,
    );
    await activate(page.locator("[data-model-frame=earth]"));
    assert.equal(
      parseFloat(await page.locator("[data-model-error]").innerText()),
      error,
    );
    await activate(page.locator("[data-model-simplify]"));
    assert.equal(await page.locator("[data-model-error]").innerText(), "0.00°");
    await capture(`clear-${width}-model.png`, "[data-orbit-field]");
    // Pointer gestures transform an actual integrated trace, with five reproducible anchors.
    const initial = await page.locator("[data-scale-trace]").getAttribute("d");
    await drag(
      "[data-scale-field]",
      { x: 0.04, y: 0.52 },
      { x: 0.99, y: 0.52 },
      width < 760,
    );
    assert.equal(
      await page.locator("[data-scale-window]").innerText(),
      "1 YEAR",
    );
    assert.notEqual(
      await page.locator("[data-scale-trace]").getAttribute("d"),
      initial,
    );
    const traces = [];
    for (let i = 0; i < 5; i++) {
      await activate(page.locator(`[data-scale-stop="${i}"]`));
      traces.push(await page.locator("[data-scale-trace]").getAttribute("d"));
    }
    assert.equal(new Set(traces).size, 5);
    assert.match(
      await page.locator("[data-interaction-note]").innerText(),
      /SYSTEMS TRAIN PARTICIPANTS/,
    );
    await capture(`clear-${width}-scale.png`, "[data-scale-field]");
    await page.locator("[data-scale-field]").press("Home");
    assert.equal(
      await page.locator("[data-scale-window]").innerText(),
      "1 SECOND",
    );
    // Contours use the actual image; thresholds, measure and resolution independently change them.
    await page.locator("[data-edge-field]").scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () => document.querySelector("[data-edge-image]").naturalWidth > 0,
    );
    await page.waitForFunction(() =>
      document
        .querySelector("[data-edge-count]")
        .textContent.includes("ADJACENT"),
    );
    const source = await page.locator("[data-edge-image]").getAttribute("src");
    const contour = await page
      .locator("[data-edge-canvas]")
      .evaluate((el) => el.toDataURL());
    await drag(
      "[data-edge-field]",
      { x: 0.2, y: 0.5 },
      { x: 0.73, y: 0.5 },
      width < 760,
    );
    assert.notEqual(
      await page.locator("[data-edge-canvas]").evaluate((el) => el.toDataURL()),
      contour,
    );
    assert.equal(
      await page.locator("[data-edge-image]").getAttribute("src"),
      source,
    );
    await page.locator("[data-edge-field]").press("End");
    assert.match(await page.locator("[data-edge-count]").innerText(), /^0 /);
    assert.equal(
      await page.locator("[data-edge-signal]").innerText(),
      "ABSENCE IS DATA",
    );
    await activate(page.locator("[data-edge-measure=green]"));
    await activate(page.locator('[data-edge-resolution="96"]'));
    assert.match(
      await page.locator("[data-edge-field]").getAttribute("aria-valuetext"),
      /96 sample columns/,
    );
    await capture(`clear-${width}-edge.png`, "[data-edge-field]");
    await activate(page.locator(".light-delay>summary"));
    await page.locator("[data-delay-field]").press("ArrowLeft");
    assert.equal(await page.locator("[data-light-name]").innerText(), "SIRIUS");
    await page.locator("[data-delay-field]").press("ArrowLeft");
    assert.equal(
      await page.locator("[data-light-name]").innerText(),
      "ANDROMEDA",
    );
    await overflow();
    const internal = await page
      .locator(".instrument-notes>a,.vault-archive a")
      .evaluateAll((elements) => [
        ...new Set(
          elements
            .map((el) => el.getAttribute("href"))
            .filter((href) => href.startsWith("/")),
        ),
      ]);
    for (const href of internal)
      assert.equal((await page.request.get(origin + href)).status(), 200, href);
    console.log(
      `PASS ${width}px: four instruments, direct ${width < 760 ? "touch" : "mouse"} gestures, keyboard, retained evidence, thresholds, lookback, archive and overflow`,
    );
    await context.close();
  }
  if (process.env.CLEAR_TEST_SECTION !== "studio") {
    // Reduced motion retains the complete experiment and stops ambient changes.
    const reducedContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      reducedMotion: "reduce",
    });
    page = await reducedContext.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(origin + "/clear.html");
    const staticPath = await page
      .locator("[data-event-form]")
      .getAttribute("d");
    await pause(150);
    assert.equal(
      await page.locator("[data-event-form]").getAttribute("d"),
      staticPath,
    );
    await page.locator("[data-observer-field]").press("Enter");
    await page.locator("#event-label").fill("Still open");
    await page.locator("[data-label-form] button[type=submit]").click();
    assert.equal(
      await page.locator("[data-observer-state]").innerText(),
      "INTERPRETATION APPLIED",
    );
    await page.locator("[data-model-frame=sun]").click();
    await page.locator('[data-scale-stop="4"]').click();
    assert.equal(
      await page.locator("[data-scale-window]").innerText(),
      "1 YEAR",
    );
    await page.locator("[data-edge-field]").press("End");
    await overflow();
    await reducedContext.close();
    console.log(
      "PASS reduced motion: static observation, naming, model, scale and boundary controls",
    );
  }
  // Studio is the original authoring flow, exercised on isolated CLEAR data only.
  const authorContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  page = await authorContext.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(origin + "/clear.html?edit=1");
  await page.locator(".author-panel").waitFor();
  assert.ok(
    await page
      .locator("body")
      .evaluate((el) => el.classList.contains("clear-author-session")),
  );
  const authorPath = await page.locator("[data-event-form]").getAttribute("d");
  await page.locator("[data-observer-field]").tap({ force: true });
  assert.equal(
    await page.locator("[data-observer-state]").innerText(),
    "UNRESOLVED",
  );
  assert.equal(
    await page.locator("[data-event-form]").getAttribute("d"),
    authorPath,
  );
  await page.locator(".vault-header a").first().click();
  assert.equal(new URL(page.url()).pathname, "/clear.html");
  assert.ok(await page.locator("[data-model-frame=sun]").isDisabled());
  await page.locator("[data-action=text]").click();
  await page.locator("[data-field=text]").fill("CLEAR persistence check");
  await page.locator("[data-field=text]").blur();
  const png =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2ZAAAAABJRU5ErkJggg==";
  await page.locator("input[type=file]").setInputFiles({
    name: "clear-check.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  await page.locator(".room-piece img").waitFor();
  await page.locator("[data-field=label]").fill("A retained annotation");
  await page.locator("[data-field=label]").blur();
  const response = page.waitForResponse((r) =>
    r.url().endsWith("/__author/save"),
  );
  await page.locator("[data-action=save]").click();
  const saved = await response;
  assert.equal(saved.status(), 200, await saved.text());
  // SAVE reloads the page; let that navigation and the file watcher settle.
  await pause(1300);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".author-panel").waitFor();
  assert.equal(
    await page.locator(".source-text").innerText(),
    "CLEAR persistence check",
  );
  assert.equal(
    await page.locator(".room-piece figcaption").innerText(),
    "A retained annotation",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .locator(".room-piece")
    .filter({ has: page.locator("img") })
    .click();
  assert.ok(await page.locator(".author-selection").isVisible());
  await capture("clear-studio-desktop.png");
  await page.goto(origin + "/clear.html");
  assert.equal(await page.locator(".author-panel,.author-handle").count(), 0);
  assert.equal(
    await page.locator(".source-text").innerText(),
    "CLEAR persistence check",
  );
  await authorContext.close();
  assert.deepEqual(errors, []);
  console.log(
    "PASS Local Studio: initializes, guards visitor gestures/navigation, text/media add, metadata, save, reload, desktop selection and clean visitor view",
  );
} catch (error) {
  if (page && !page.isClosed()) {
    await page
      .screenshot({ path: resolve(output, "failure.png") })
      .catch(() => {});
    console.error(
      "Instrument states:",
      await page
        .locator(".instrument-state")
        .allTextContents()
        .catch(() => []),
    );
  }
  console.error(serverLog.slice(-5000));
  throw error;
} finally {
  if (browser) await browser.close();
  await writeFile(manifest, backup);
  for (const file of await readdir(mediaFolder))
    if (!mediaFiles.has(file)) await unlink(resolve(mediaFolder, file));
  for (const [path, hash] of protectedHashes)
    assert.equal(await digest(path), hash, `Protected file changed: ${path}`);
  if (server) server.kill("SIGTERM");
  console.log(
    "Protected routes, Studio, mirror, manifests and package files remain byte-identical. CLEAR test data restored.",
  );
}
console.log(`Screenshots: ${output}`);
