# HOME living mirror

The existing implementation was recovered from the previously delivered HOME
patch. It had not been committed to `redesign/curated-observatory`, and the
production deployment still referenced `467ae17` without the mirror renderer.

This release contains only the mirror. The existing Games destination `/gaming/`,
Lens Captured → Moments, Photogression, the Moments gallery and all world pages
are preserved. No scene manifest, media asset, dependency or backend is changed.

`home-portal` remains the same editable scene object and keeps its authored
position, dimensions, rotation, layer and material arch frame. Its inside is
rendered by the same shared HOME renderer in Astro and Local Studio.

The glass uses the existing HOME lake photograph, the current Games thumbnail,
the tree/water photograph from Moments, the App World orbital forms and CLEAR's
perception reticle. The lake and gaming images already appear on HOME. The
additional organic display WebP is about 269 KiB. No new images are generated.

Idle behavior retains slow composited transforms and bounded opacity signals
in masked parts of the surface. The first tap/click/Enter/Space locks a world
without leaving HOME. `SIGNAL FOUND` resolves into `WORLD / ENTER →` after 900 ms
(immediately with reduced motion). The second activation enters that world.
The lock lasts 15 seconds, then settles into the existing idle glass. No other
fragment competes with the named world while it is locked.

| Signal / visual | Destination |
| --- | --- |
| Moments / lake photograph | `/moments.html` |
| Natural / tree beside the water | `/natural.html` |
| App World / orbital geometry | `/world.html` |
| Clear / perception instrument | `/clear.html` |
| Gaming / existing Naraka thumbnail | `/gaming/` |

The shared `homeMirrorWorlds` mapping supplies the labels, visual keys and real
routes. A Local Studio destination matching one of these five routes pins the
corresponding visual and keeps the same two-stage confirmation. Other authored
links remain saved in the scene; the live mirror only enters the five known
worlds. No scene schema or generic Local Studio control changes are required.

Navigation uses the browser's normal document navigation and history. Back
returns to HOME with an idle mirror, including back/forward-cache restores.
Both buttons and authored anchors support Enter and Space without synthetic
double activation, held-key navigation or Space scrolling. Accessible names
describe the current destination and the polite status announces how to enter.
The mirror still allows vertical scrolling.

Animations and transitions pause offscreen and when the document is hidden.
Reduced motion retains static layered glass with immediate tap states. Author
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

The focused checks cover 360/390/430 and desktop, unchanged scene geometry,
loaded real imagery, running and paused animation, all five real destinations
and browser Back at every width, the 15-second reset, reduced-motion navigation,
mouse/Enter/Space, scrolling, the Games hit target, Moments/Photogression and
Local Studio persistence and navigation protection. The test clock advances
the production reset timer without making each signal check wait 15 seconds.
