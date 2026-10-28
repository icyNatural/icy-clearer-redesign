# Natural signal language

The symbol library was read before design. Current source was branch head `59a46f7`, whose tree contains the validated `82b9cfe` responsive baseline. The Windows E: directory is not mounted in this environment; work uses the connected repository branch.

| Signal | Identity | Library meaning | Geometry |
| --- | --- | --- | --- |
| PLAY | ◈ | active phenomenon | directional corners |
| VOICE | ∿ | wave | soft asymmetric curves |
| OBSERVE | 𓂀 | deep observation / seeing beneath appearance | aperture enclosure |
| ARCHIVE | 🗃 | archive / old material | inset stacked frames |
| MAKE | ⊕ | add a layer / integrate / composition | alternating constructive corners |
| NOW | ⟡ | realization / anomaly / event noticed | pointed corner emphasis |
| Infinite Mind | ∞ | unresolved / continuing / continuous | existing HOME identity retained |

These are the library's assigned meanings. VOICE associates the library's wave with sound; it does not redefine the glyph as expression. ARCHIVE uses the explicit archive entry, rather than reassigning an elapsed-time glyph to storage. MAKE explicitly uses the composition sense of the polysemous ⊕, not its separate Earth/world meaning. NOW retains the noticed-event meaning rather than assigning ⟡ a clock meaning. No new combinations or grammar were invented.

`src/scripts/natural-signals.ts` is the single Natural definition for label, symbol, color, meaning, geometry variant, collection note, and vector paths. The existing model re-exports its signals, retaining compatibility for public rendering, filtering, and Studio. Color literals were removed from competing CSS mappings. Identity is inherited by the signal, never assigned to each artifact.

ALL retains the same six windows, three across, existing type sizes and media regions. Small vector marks replace the former circular marks and rail dots. Selected signals show their literal library meaning and one larger, quiet header emblem; no emblem covers media. Container corners and inner borders form one family with subtle variants. The opening gesture is a single short scale/fade; reduced motion disables it. There is no looping animation.

All marks are authored inline SVG paths, including the rare Egyptian observation glyph and archive emoji identity. They contain no text, external font, image, or remote SVG reference. This prevents missing-font glyph boxes and emoji substitution. Visible labels remain; SVG marks are aria-hidden and non-focusable. Accessible button names retain signal words without repeated glyph noise, and selected meanings remain ordinary readable text.

Chromium verifies rendering and layout. Physical Windows and Android devices, Safari, and Firefox were not available for device-specific testing. The vector implementation removes operating-system font coverage from the rendering path; it is not a claim of physical-device testing.

HOME, the document library, Visual Lab, artifact manifests, permanent media, native preview playback, and Studio editor code are unchanged. No cross-app dependency was added.

## Files

- `src/scripts/natural-signals.ts`: authoritative identities and authored vectors.
- `src/scripts/natural-model.ts`: compatible signal import/re-export.
- `src/components/NaturalField.astro`: inherited marks, colors, geometry and selected meanings.
- `src/styles/natural-field.css`: shared geometry family, compact/selected treatment, reduced motion.
- `tools/test-natural-symbols.mjs`: semantic, vector, layout, state and screenshot checks.
- This report and the 28 screenshots below.

## Screenshots

Every state was captured at 360, 390, 430 and 1440. Visible media is decoded before capture. ALL and all selected states were visually inspected at 390 and 1440.

| State | 360 | 390 | 430 | 1440 |
| --- | --- | --- | --- | --- |
| ALL | [View](360-all.jpg) | [View](390-all.jpg) | [View](430-all.jpg) | [View](1440-all.jpg) |
| PLAY | [View](360-play.jpg) | [View](390-play.jpg) | [View](430-play.jpg) | [View](1440-play.jpg) |
| VOICE | [View](360-voice.jpg) | [View](390-voice.jpg) | [View](430-voice.jpg) | [View](1440-voice.jpg) |
| OBSERVE | [View](360-observe.jpg) | [View](390-observe.jpg) | [View](430-observe.jpg) | [View](1440-observe.jpg) |
| ARCHIVE | [View](360-archive.jpg) | [View](390-archive.jpg) | [View](430-archive.jpg) | [View](1440-archive.jpg) |
| MAKE | [View](360-make.jpg) | [View](390-make.jpg) | [View](430-make.jpg) | [View](1440-make.jpg) |
| NOW | [View](360-now.jpg) | [View](390-now.jpg) | [View](430-now.jpg) | [View](1440-now.jpg) |

## Validation

All six test suites below passed. The production build generated 27 static pages successfully; `git diff --check` is clean.

Run with an external Playwright installation through PLAYWRIGHT_PATH and a local author server. Manifest-mutating checks run serially and restore their fixtures.

- `node tools/test-natural-symbols.mjs`
- `node tools/test-natural-model.mjs`
- `node tools/test-natural-validation.mjs`
- `node tools/test-natural-field.mjs`
- `node tools/test-natural-studio.mjs`
- `node tools/test-site-responsive.mjs`
- `npm run build`
- `git diff --check`

Checks cover library identities, font-independent paths, all seven views, six compact windows, labels, meanings, media aspect, preview-first playback, Back, single-player behavior, Studio editing/persistence, reduced motion, existing site routes and responsive coverage. Deployment status and the final commit are reported in the delivery response.
