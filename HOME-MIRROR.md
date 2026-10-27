# HOME living mirror

The existing implementation was recovered from the previously delivered HOME
patch. It had not been committed to `redesign/curated-observatory`, and the
production deployment still referenced `467ae17` without the mirror renderer.

The mirror now enters the human-facing Games destination `/games.html`;
Lens Captured → Moments, Photogression, the Moments gallery and all world pages
are preserved. No scene manifest, media asset, dependency or backend is changed.

`home-portal` remains the same editable scene object and keeps its authored
position, dimensions, rotation, layer and material arch frame. Its inside is
rendered by the same shared HOME renderer in Astro and Local Studio.

The glass uses the existing HOME lake photograph, the current Games thumbnail,
the tree/water photograph from Moments, the App World orbital forms and CLEAR's
perception reticle. The lake and gaming images already appear on HOME. The
additional organic display WebP is about 269 KiB. No new images are generated.

The mirror automatically cycles Natural → Moments → App World → Clear → Gaming.
Each world resolves for 1.3 seconds, matching the existing image crossfade, then
holds enterable for 5.5 seconds. `RESOLVING` becomes `WORLD / ENTER →`. One
tap/click/Enter/Space enters the visible stable world. Transition-started presses
do not navigate, even when released after stabilization. No other fragment
competes with the named world. Stable glass gains restrained contrast/brightness,
a pale inner rim and a single small brightness pulse; the frame is unchanged.

| Signal / visual | Destination |
| --- | --- |
| Moments / lake photograph | `/moments.html` |
| Natural / tree beside the water | `/natural.html` |
| App World / orbital geometry | `/world.html` |
| Clear / perception instrument | `/clear.html` |
| Gaming / existing Naraka thumbnail | `/games.html` |

The shared `homeMirrorWorlds` mapping supplies the labels, visual keys and real
routes. A Local Studio destination matching one of these five routes chooses the
starting visual without stopping the cycle. Other authored
links remain saved in the scene; the live mirror only enters the five known
worlds. No scene schema or generic Local Studio control changes are required.

Navigation uses the browser's normal document navigation and history. Back
returns to HOME with an autonomous mirror, including back/forward-cache restores.
Both buttons and authored anchors support Enter and Space without synthetic
double activation, held-key navigation or Space scrolling. Accessible names
describe the current destination; resolving is marked unavailable. Focused
resolution announces how to enter without continually announcing idle cycling.
The mirror still allows vertical scrolling.

Animations and transitions pause offscreen and when the document is hidden.
Reduced motion cuts between static destinations every 5.5 seconds, with no pulse
or animated transition. Hover/focus holds the current stable world; during
resolving it finishes that world then holds. Active presses also hold stability.
Offscreen/hidden pages preserve their remaining phase time. Author
mode keeps the internal effect static so object selection, movement, size,
layer, duplication, deletion and saving remain with Local Studio. A capture
guard prevents native mirror-link navigation in `?edit=1`, including redrawn
links, without consuming Studio's selection events. Replacing the arch with
a real image uses it as the reflection's base.

The effect is autonomous. It does not use unreliable referrer state, webcam
access, video/audio, a canvas/frame loop, particles, visitor storage, a second
media library or another editing system.

Run `tools/test-home-mirror.mjs` against a running local app, with Playwright
available via `PLAYWRIGHT_PATH` if necessary. Set `HOME_MIRROR_TEST_ORIGIN` to
the server origin. Normal checks are read-only and can verify production.
`HOME_MIRROR_TEST_EDITOR=1` is only for an isolated local author-mode checkout;
it exercises save/reload and restores the scene manifest afterward.

The focused checks cover 360/390/430 and desktop, all five real destinations,
resolved image/geometry opacity, native Back at every phone width, transition
press race protection, hover/focus freeze, Enter/Space, overflow, reduced-motion
stepped navigation and Local Studio persistence/navigation protection. The test
clock advances real cycle timers. Screenshots go to the temporary icy-home-cycle
directory. `tools/test-home.mjs` retains the broader HOME Studio regression.
