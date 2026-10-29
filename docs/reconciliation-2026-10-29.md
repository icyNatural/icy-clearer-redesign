# Selective recovery: Natural adaptive composition and Gaming edge gestures

## Recovery and boundaries

- Recovered access to the existing workspace on `redesign/curated-observatory`.
- Initial HEAD and fetched remote were `0946061378a884fc04be007bd4b5835c5c272a1b`, including `7baf6d1`.
- Inspected `stash@{0}`: `natural adaptive and gesture implementation before remote reconciliation`, including its untracked test/viewer files.
- The interrupted workspace already contained selective reconciliation. Reviewed and retained that work rather than applying the stash again.
- Retained the stash. No hard reset, wholesale stash application, viewer replacement, or force push.
- Excluded the stash's older `gaming-highlights.ts`, older page/rating architecture, and competing `signalPaths` symbol vocabulary.
- Existing unrelated screenshots, recovery artifacts, and an untracked GIF were left untouched and are not part of this delivery.

## Integrated behavior

Gaming keeps the `0946061` viewer, player API, history, cleanup, focus and playback-position lifecycle. A media-sized wrapper supplies narrow coarse-pointer edge zones, at most 48px wide, excluding the top 12px and bottom 64px. Center and bottom controls are uncovered; cross-origin iframe center gestures intentionally remain YouTube's. Arrows, desktop keyboard navigation, and existing matte/header gestures remain available. Gestures reject small movement, vertical intent, long holds and cancellation, and clear on lost pointer capture.

Natural shares a count-to-layout function between static rendering and client/Studio refreshes: 1 hero, 2 split, 3 lead plus supports, 4 quadrant, 5+ mosaic. ALL previews are bounded to six; selected collections retain pagination and Studio retains all editable members. Desktop six-item windows use balanced 1 + 3 + 2 rows, with small-window mosaic captions hidden so previews remain usable. Selected captions remain readable in flow. Single-item selected windows also use the full available column on mobile. Frames retain manifest aspect metadata and portrait sizing rather than stretching media.

All six authored symbol IDs, glyph paths, colors and geometry variants are unchanged from HEAD. NOW's semantic text is clarified to current activity/work/attention. Explicit authored memberships are unchanged. Legacy topical fallback no longer automatically adds NOW; unresolved unclassified imports are not silently asserted to be current. Studio continues explicitly assigning newly authored current work to NOW and permits signal editing.

## Validation

Fresh suites are run against a restarted author-mode server rather than the stale server left by the interrupted run. Browser fixtures reuse real manifest media without publishing fixture artifacts. Evidence is written outside the workspace under `%TEMP%\icy-recovery-final-20261029` to avoid the previous screenshot-write failure and stale evidence.

Required suites: `test-natural-model`, `test-natural-validation`, `test-natural-layouts`, `test-natural-symbols`, `test-natural-field`, `test-natural-studio`, `test-games`, and `test-games-live`. Responsive suites cover 360, 390, 430 and 1440 pixels. Additional assertions cover single-item full width, six-item mosaic rows, unobscured mosaic play targets, mixed aspect frames, negative touch gestures, and landscape/portrait iframe center/bottom hit testing.

The deterministic Gaming suite stubs the third-party API to test lifecycle boundaries; the separate live smoke test uses real YouTube and records whether playback time advances. Center/bottom hit testing is not a guarantee about every third-party menu, ad, browser or physical device.

Final local run on October 29, 2026: all eight suites above passed, including every responsive width, Studio regressions, and the added assertions. Real YouTube initialized one player, reached readyState 4 and playback time 3.394516 seconds, with no page errors. Two aborted embed requests were recorded despite successful playback. `git diff --check` and `git diff --cached --check` passed. `npm run build` passed: 27 static pages. A separate HEAD comparison confirmed all six IDs, symbols, colors, geometry variants and path arrays were unchanged. The media manifest remains byte-for-byte equivalent to HEAD. Initial stale-server/environment failures were resolved before the complete final rerun. Deployment status is verified after push and reported in the delivery summary; prior-run evidence is not used as final proof.