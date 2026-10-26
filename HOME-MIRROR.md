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

Idle behavior uses slow composited transforms and bounded opacity signals in
masked parts of the surface. A tap/click/Enter/Space resolves one reflection for
2.6 seconds, then settles. The default mirror stays on HOME; a destination set
in Local Studio remains an ordinary link. The mirror allows vertical scrolling.

Animations and transitions pause offscreen and when the document is hidden.
Reduced motion retains static layered glass with immediate tap states. Author
mode keeps the internal effect static so object selection, movement, size,
layer, duplication, deletion and saving remain with Local Studio. Replacing
the arch with a real image uses it as the reflection's base.

The effect is autonomous. It does not use unreliable referrer state, webcam
access, video/audio, a canvas/frame loop, particles, visitor storage, a second
media library or another editing system.

Run `tools/test-home-mirror.mjs` against a running local app, with Playwright
available via `PLAYWRIGHT_PATH` if necessary. Set `HOME_MIRROR_TEST_ORIGIN` to
the server origin. Normal checks are read-only and can verify production.
`HOME_MIRROR_TEST_EDITOR=1` is only for an isolated local author-mode checkout;
it exercises save/reload and restores the scene manifest afterward.

The focused checks cover 360/390/430 and desktop, unchanged scene geometry,
loaded real imagery, running and paused animation, all five tap signals,
reduced motion, mouse/keyboard, scrolling, destination links, the Games hit target,
Moments/Photogression and Local Studio persistence.
