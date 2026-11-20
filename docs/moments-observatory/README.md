# Moments observatory browser regression

## Safe execution

This suite writes **only** screenshots and `results.json` into this directory. It
does not save, upload, delete, or restore any media/manifest, and does not start a
server. Coordinate with the implementation lead before running against their
author server on port 4347. Do not run `tools/test-moments.mjs` concurrently: that
older author suite rewrites the Moments manifest and uploads, even though it
attempts restoration afterward.

Installed Playwright discovery confirmed:

- Package: `E:\Projects\chad-hamilton-portfolio\node_modules\playwright\index.js`
- Chromium: `C:\Users\justc\AppData\Local\ms-playwright\chromium-1243\chrome-win64\chrome.exe`
- Project itself does not declare Playwright. The new test first honors
  `PLAYWRIGHT_PATH`, then checks normal resolution and sibling project packages;
  it never installs dependencies.

PowerShell invocation, after the lead confirms app readiness:

```powershell
$env:PLAYWRIGHT_PATH = 'E:\Projects\chad-hamilton-portfolio\node_modules\playwright'
$env:MOMENTS_TEST_ORIGIN = 'http://localhost:4347'
node 'E:\Projects\icy-clearer-redesign\tools\test-moments-observatory.mjs'
```

## Coverage and contract

- Real Chromium at widths **360, 390, 430, 1280, 1440**; 844px mobile and 1000px
  desktop height. Each records orbit and viewer PNGs.
- `.observatory`, `[data-orbit="previous"|"next"|"enter"]`, and
  `[data-moment-open][aria-current="true"]` form the public orbit contract.
- Previous/next controls, focused photo arrow keys, native mobile touch ring
  swipe / desktop mouse ring drag, and real horizontal wheel input change
  selection. Vertical wheel intentionally remains normal page scrolling.
- Ring drag must not accidentally open a photo. Exactly one current photo;
  **at most nine mounted orbit photo controls**, even with 105 items.
- Existing `.moment-detail` controls, arrow keys, native touch swipe / desktop
  mouse drag, source/alt/count/URL agreement, and stable overlay history length.
- Escape, browser Back, and explicit Close synchronize the ring to the **last
  viewed photo**, focus that photo, clear the hash, and release scroll lock.
- Direct links to the last photo work, survive reload, and close without leaving
  Moments. Both document and viewer must avoid horizontal overflow.
- Reduced-motion context runs the same interactions and rejects lingering orbit
  animations longer than 100ms.
- Read-only **5 / 20 / 105-photo fixtures** intercept the HTML response and replace
  only inline `[data-moments-content]` JSON. Items have unique IDs and reuse real
  existing image paths; no network write endpoints or source files are touched.
  This deliberately requires client orbit rendering to use embedded JSON rather
  than obsolete server grid markup.
- Browser runtime errors fail their case. Failures capture a diagnostic screenshot
  and stack in `results.json`; all cases continue so one failure does not hide
  responsive coverage. Nonzero process exit reports any failure.

## Adapting existing tests

`tools/test-moments.mjs` is an author integration test, **not safe to run alongside
active author edits**. Keep its author-mode upload/save/move/resize coverage in an
isolated copy/server. Its public `.moment-slot`, `position: relative`, all-frame
flow, `VIEW ALL MOMENTS`, and full grid-count assertions no longer describe the
public observatory. Replace those public assertions with bounded orbit selection
and viewer behavior; do not weaken independent author-frame checks.

`tools/test-moments-swipe.mjs` is mostly read-only, but assumes the first gallery
opener remains the focus target after navigation and explicitly requires desktop
mouse drag to do nothing. Those expectations must become selected-current-photo
focus and supported desktop drag navigation. Retain its valuable touch guard,
vertical pan, pointer cancellation, metadata agreement, history, and author-mode
lightbox suppression checks, targeting current orbit/photo selectors rather than
grid order or hidden archive items. Neither existing file is modified here.

The implementation lead subsequently adapted both legacy suites separately and
reported **both passing**: the full author suite with manifest and protected
files restored, and swipe regression at 360/390/430/desktop. The lead also reported
the final production build passing (27 pages). Those edits/runs are owned by the
lead, not this focused test change.

## Validation state

`node --check tools/test-moments-observatory.mjs` passed. Coordinated browser runs
against `http://127.0.0.1:4347` found two application issues that the lead fixed:
native touch implicit-capture transfer incorrectly released ring drags early,
and viewer horizontal transition translation produced transient scroll overflow.
Tests also now wait for the ring to settle before evaluating the next gesture.
The final full matrix **passed all nine cases** on 2026-11-20 at 01:35:46 UTC:
360, 390, 430, 1280, 1440; 5/20/105-photo fixtures at 390; and reduced motion at
390. All had zero browser runtime errors. See `results.json` for final
machine-readable outcomes. Eighteen orbit/viewer screenshots were retained;
stale failure screenshots and transient execution logs were removed.

Visual inspection of captured 390px mobile and 1440px desktop orbit images and
360px viewer found coherent geometry and readable controls. Side photos clip at
mobile stage edges intentionally; the main photo reaches the stage bottom but
is not cut off. The development toolbar can overlap the bottom hint on desktop;
this is development-server chrome, not public content.

Limitations: these are Chromium desktop and CDP touch-emulated mobile checks,
not physical iOS/Android device tests or cross-browser Safari/Firefox coverage.
Screenshots are evidence for manual review, not pixel-baseline comparisons.
The final matrix targeted the author server in public mode, not the production
preview. Fixtures test client data handling and bounded orbit mounting, not 105
distinct image downloads or author upload scalability.

For focused debugging, `MOMENTS_TEST_CASE` accepts `360`, `390`, `430`, `1280`,
`1440`, `fixture-5`, `fixture-20`, `fixture-105`, or `reduced`. Omit it for the
complete matrix. Each run replaces `results.json`; screenshots are overwritten
by case name. Failure screenshots from previous runs are not proof of current
failures; use the final JSON report.