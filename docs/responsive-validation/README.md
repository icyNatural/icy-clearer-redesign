# Authored composition validation

2026-10-28. Source: `redesign/curated-observatory`, starting at `a54bfae`.
The current branch and its manifests supplied the composition and all media.

## HOME

Desktop frame coordinates, sizes, rotations, crops, typography, and the Natural-only
portal remain the source composition. At phone widths, the same horizontal
anchors and media relationships remain. Readable type has a floor: archive and
destination descriptions are at least 12px; the main sentence is at least 14px.

`home-responsive.ts` measures actual text after fonts load and on resize. The
archive measure clears the rotated photograph. When copy exceeds its scaled
space, the title/signature/intro move together, then Games and the Natural portal
move together. The outer paper grows; the percentage coordinate canvas does not
stretch. This preserves the authored relationships while adding real clearance.

The existing destination component retains its desktop 58% media / 42% caption
split. Its longest actual caption determines the shared minimum phone card
height. Padding, leading, title, description, and arrow each have room; separators
stay with their preceding term. The cards remain three across and keep their
authored horizontal sizes and slight vertical stagger.

`∞ Infinite Mind` and its related directional cue remain between the collage and
destinations. The cue has a 9px floor. Lens Captured, Chad, Become, slowly., and
the Games / Natural relationship remain attached to the same scene objects.

Studio uses its saved mobile coordinates from first render. The visitor-only
desktop coordinate rule previously left unselected objects in different frames
until selected, allowing a neighboring card to cover a resize handle. The rule
now applies only to visitors; all existing editing controls remain in Studio.

## Natural

ALL remains a three-by-two signal field: PLAY, VOICE, OBSERVE, ARCHIVE, MAKE, NOW.
The field shows up to three previews per collection window. Empty windows size
to their forming state rather than inheriting a tall media row.

Preview geometry comes from the existing manifest's media aspect, with existing
pixel dimensions as a fallback. Landscape gameplay remains landscape; Shorts
and vertical film remain vertical. Existing thumbnails/posters supply previews.
No media or manifest content was added, replaced, removed, or downloaded.

ALL mounts no video or iframe players and requests no full MP4 before interaction.
YouTube previews retain their canonical links and gain a recognizable play cue.
A native video press in ALL first opens that same signal, then mounts one native
player with controls and inline playback. Signal changes and Back release that
player and restore previews; offscreen/hidden playback pauses.

Selected signals expose up to 24 artifacts at a time, native preview proportions,
readable titles, overlapping identities, and optional metadata. Landscape previews
span two columns; portrait media keeps its native shape. Studio still uses the
same renderer and editor, including all signal, tag, prominence, visibility,
upload, URL, replace, duplicate/delete, and save/reload operations.

## Cleanup

- Replaced the competing mobile caption/type rules and removed the 359px size override.
- Replaced Natural's stretched grid media and first-item row spans with native-aspect previews.
- Removed the 245/310/440/520px cluster compensations and unused overflow rules.
- Consolidated Natural phone behavior under 700px, retaining three columns.
- Updated stale portal tests to verify the current stable Natural-only behavior.
- Reconciled `package-lock.json` with the existing Astro 7 requirement; npm's clean-install dry run passes. `package.json` and the Bun lock remain unchanged.

## Viewport screenshots

All requested widths were captured and visually inspected, in addition to DOM
checks. HOME screenshots use the site's actual Cormorant Garamond, EB Garamond,
and JetBrains Mono fonts. Natural retains the fonts its document currently loads.

| Width | HOME | Natural ALL | Natural selected PLAY |
| --- | --- | --- | --- |
| 320 | [Screenshot](home-320.jpg) | — | — |
| 360 | [Screenshot](home-360.jpg) | [Screenshot](natural-360.jpg) | [Screenshot](natural-play-360.jpg) |
| 390 | [Screenshot](home-390.jpg) | [Screenshot](natural-390.jpg) | [Screenshot](natural-play-390.jpg) |
| 430 | [Screenshot](home-430.jpg) | [Screenshot](natural-430.jpg) | [Screenshot](natural-play-430.jpg) |
| 700 | [Screenshot](home-700.jpg) | — | — |
| 701 | [Screenshot](home-701.jpg) | — | — |
| 852 | [Additional check](home-852.jpg) | — | — |
| 1280 | [Screenshot](home-1280.jpg) | — | — |
| 1440 | [Screenshot](home-1440.jpg) | [Screenshot](natural-1440.jpg) | [Screenshot](natural-play-1440.jpg) |
| 1920 | [Screenshot](home-1920.jpg) | — | — |

Checks cover archive/title and body/Games clearance; photo/label and signature
placement; Infinite Mind and its cue; three-across card geometry; 58/42 split;
caption and arrow containment; six signal windows; real media aspects; one-player
interaction; Back; loaded assets; and horizontal overflow.

## Regression commands

All eleven suites below passed, including the full HOME and Natural Studio
operations and the reduced-motion/navigation checks. No source manifest or
permanent media changes remain after fixture restoration.
The final `npm run build` generated all 27 static pages successfully.

Use an external Playwright installation via `PLAYWRIGHT_PATH` and the test origin
variables documented in the scripts. Manifest-mutating tests ran serially against
isolated author-server lifetimes and restored their fixtures afterward.

```text
node tools/test-natural-model.mjs
node tools/test-natural-validation.mjs
node tools/test-home.mjs
node tools/test-natural-field.mjs
node tools/test-natural-studio.mjs
HOME_MIRROR_TEST_EDITOR=1 node tools/test-home-mirror.mjs
node tools/test-site-responsive.mjs
node tools/test-games.mjs
node tools/test-gaming.mjs
node tools/test-moments-swipe.mjs
CLEAR_TEST_SECTION=visitor node tools/test-clear.mjs
npm ci --dry-run --no-audit --no-fund --silent
npm run build
git diff --check
```

HOME's full layout matrix and Studio checks also ran separately using
`HOME_TEST_LAYOUT_ONLY=1` / `HOME_TEST_EDITOR_ONLY=1`. Tests assert desktop geometry
against the manifest and verify upload/replace/duplicate/delete/save/reload with
real existing fixtures. Source manifests and permanent media assets remain unchanged.
