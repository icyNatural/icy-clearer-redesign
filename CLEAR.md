# CLEAR — an open inquiry

`/clear.html` is an experiential entrance to the existing writing. Four continuous instruments replace the former doctrine index and five boxed exhibits. The sequence is phenomenon → intervention → state change → short revelation → optional notes or deeper writing. No doctrine cards or new doctrine pages are introduced.

The work began from the clean GitHub branch `redesign/curated-observatory`, baseline `fe7871db7982822e11b4315efb8d6d7a86455cad`. HOME, Moments, Natural, Gaming, Gaming OS, App World, Two Worlds, the mirror and the general Local Studio implementation are outside this change. The Windows working directory was not mounted in this execution environment; implementation and tests used an isolated checkout of the connected repository. No Windows working files were overwritten.

## Design map and architecture

| Instrument | What the visitor manipulates                                            | What changes                                                      | What stays available                                      |
| ---------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------- |
| Observer   | The event itself, its viewpoint, a name and a compressed reconstruction | Projection, attention, interpretation and retained detail         | The held event and its temporal ordering before the label |
| Model      | An orbital turntable, its Earth/Sun origin and an erased epicycle term  | Coordinate geometry, construction and calculated prediction error | The same 48 synthetic sky bearings                        |
| Scale      | A time field spanning one second through one year                       | Window duration, bin width and the visible trace                  | One fixed analytic record                                 |
| Edge       | A real photograph’s threshold, channel measure and sampling resolution  | Pixel-derived contour locations and their crossing count          | The source photograph                                     |

The astronomical lookback instrument is folded into Observer’s “Follow the light” layer. Its three sources occupy positions computed from the logarithms of their light travel times. It is not a fifth dashboard section.

### Observer

A changing parametric loop appears before any naming interface. Tap or press Enter/Space to hold it. The observed time is elapsed time within the current page session, not a fabricated timestamp. A free-text name or one of the offered names hides the four alternative words without changing the held geometry. Reopening restores the unresolved process.

Dragging changes the projection of the same underlying loop. Moving attention reveals actual contour sample points through a movable mask. Memory reconstruction retains 16 of 240 samples and leaves the held record as a dashed reference. This demonstrates information loss; it does not claim to model the brain.

The lookback layer contains the Sun (approximately 8 minutes 20 seconds), Sirius (approximately 8.6 years) and Andromeda (approximately 2.5 million years). These are sourced estimates, not live astronomical calculations. The source notes state that sunlight’s travel time varies with distance and that the visual transition is not real-time light propagation.

### Model

A Ptolemaic-style deferent and epicycle form an operable mathematical construction. Drag the rim to turn time; each rim division corresponds to 30 days in a 780-day illustrative record. Select Earth or Sun as the origin using the bodies or their labelled controls.

The complete constructions are coordinate descriptions of the same vector relation. Their agreement is exact by construction and is not independent evidence for two physical cosmologies. The instrument makes that limitation explicit.

The circular approximation uses 1 AU and 365.256 days for Earth, 1.524 AU and 686.98 days for Mars. It omits eccentricity, equant, inclination, perturbations and light-time correction. It is neither a full historical reconstruction of Ptolemy nor an ephemeris. The RMS comparison uses 48 generated directions. Removing the Earth-motion term changes RMS error from 0.00° to 28.03° without moving the retained record.

### Scale

One constructed signal combines oscillations at 0.22 seconds, 12 seconds, one day, 28 days and one year, plus a small linear drift. Amplitude bounds keep the entire defined record within 0–1. Every view integrates the same function into 240 bin averages; analytic integration prevents undersampled fast oscillations from masquerading as new cycles.

The five anchors are 1 second, 1 minute, 1 day, 30 days and 1 year. The year is 365.25 days; intermediate windows interpolate logarithmically. Pointer dragging and keyboard operation transform the actual path rather than swapping only explanatory copy.

A small secondary trace records up to the latest 24 actual window choices. It is session-only, resets on reload and is neither transmitted nor saved. It illustrates how an interface’s offered scales constrain exploration; it does not diagnose a visitor’s habits or prove behavioural conditioning.

### Edge

The existing Moments photograph `/media/moments/4724dc7bb129d9e2ea22.jpg` supplies the observed material. CLEAR reads the collection without altering its files or manifest. A different available Moments image is used if that entry is absent.

The contour algorithm compares neighbouring samples of the actual source image. Light/dark measures weighted sRGB brightness; green contrast measures a stated channel formula. Sampling widths of 24, 48 or 96 columns change how much fine detail survives. Thresholds are normalised values and the count reports adjacent sample pairs crossing that threshold.

These are image-processing boundaries. They are not calibrated physical luminance, semantic segmentation, a measured shoreline, or proof of where an organism ends. Empty results mean no crossing was detected at the chosen setting. Source failure produces an unavailable state rather than an invented boundary.

## The twenty recurring doctrines

The doctrines recur through state changes, consequences and notes. They are not an inventory of twenty interface tiles.

| #   | Doctrine                        | Where it operates                                                                                             |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | Observe before naming           | Observer records the held event before the naming time.                                                       |
| 2   | The model is not the thing      | Model distinguishes construction, generated record and physical claim.                                        |
| 3   | Interaction produces experience | Observer projection and attention; Edge measurement choices.                                                  |
| 4   | Change the scale                | Scale transforms the same integrated signal across five windows.                                              |
| 5   | Coherence can lie               | Restoring Model’s perfect fit reveals its limited evidential scope.                                           |
| 6   | The observer is inside          | Viewpoint changes the Observer projection; Earth remains the sky observer in both model frames.               |
| 7   | Keep it unresolved              | Holding the event leaves names unapplied and alternatives available.                                          |
| 8   | Discovery > certainty           | Reopening a named event; exploring a record through multiple durations.                                       |
| 9   | The first thought is a draft    | Naming can be revised or released without erasing the event.                                                  |
| 10  | What survives the model?        | The white sky bearings survive reference-frame changes.                                                       |
| 11  | Physical ≠ obvious              | Projection can mislead; photographic contours do not define physical categories.                              |
| 12  | The frame changes the event     | Observer viewpoint, Model origin and Scale duration change the representation.                                |
| 13  | Absence is data                 | Edge distinguishes zero threshold crossings, unavailable pixels and unseen surroundings.                      |
| 14  | Attention creates signal        | The attention mask reveals existing samples; Edge makes a selected image contrast salient.                    |
| 15  | Memory is reconstruction        | Observer’s 16-sample reconstruction is compared with the 240-sample held record.                              |
| 16  | Boundaries are decisions        | Edge redraws contours when threshold, purpose or resolution changes.                                          |
| 17  | Pattern ≠ cause                 | Scale exposes recurrence without assigning a physical cause; Model notes constrain interpretation.            |
| 18  | Simplicity can hide mechanism   | Removing a model term increases error; averaging and resampling discard fine variation.                       |
| 19  | Systems train participants      | Scale records an actual exploration path within the choices the interface offers.                             |
| 20  | Becoming is the state           | Observer can remain unresolved; Scale combines continuing drift and recurrence; the inquiry stays reopenable. |

## Typography and visual grammar

| Role                     | Typeface                        | Purpose                                                               |
| ------------------------ | ------------------------------- | --------------------------------------------------------------------- |
| Philosophical statements | Bodoni Moda, upright and italic | Sharp editorial contrast, asymmetric scale and deliberate line breaks |
| Navigation and reading   | Barlow Condensed                | Narrow, legible invitations, controls and source notes                |
| Measurements and state   | IBM Plex Mono                   | Elapsed times, quantities, assumptions and genuine state transitions  |

All four font files are self-hosted under `/clear/fonts/`, with their SIL Open Font License files. There are no runtime third-party font requests. No framework, 3D library, production dependency or lockfile change was added.

The environment is near-black with icy paper type. Blue identifies attention, predictions, thresholds and active measurement. Muted green identifies alternative contours and the exploration record. Warm material belongs to the Sun marker or the error produced by a discarded model term. Lines connect constructed quantities; plot ticks represent defined intervals; values come from model calculations, pixel calculations, actual session interactions or explicitly sourced estimates. There is no decorative code or random numerical display.

## Existing writing and Studio

The page retains its dynamic archive derived from the existing Markdown pages: six models, two modes, two systems and six doctrines, plus the existing paths by intent. The four instruments link to the existing Seeing Before Naming, Replace Stories With Systems, From Reaction to Pattern and Make the Invisible Pattern Visible pages. No written source was deleted or rewritten.

`/clear.html?edit=1` remains part of the existing author server. The original `MediaRoom`, upload pipeline, revision checks, text/image controls, annotation placement and save flow remain. Procedural geometry and the main authored composition are structural. Studio continues to author the room’s added text and media; the redesign does not claim that its structural SVGs have become freely editable objects.

An author-session guard resolves before Studio’s asynchronous startup. It stops ambient animation, removes field keyboard focus, disables visitor controls and prevents instrument/source navigation from turning a selection into a visitor action. Ordinary production pages do not load Studio, including when `?edit=1` is appended.

## Mobile, accessibility and performance

Phone layouts stack one phenomenon at a time rather than reducing a desktop column grid. SVG labels, controls and annotation text have explicit phone treatment. The photograph reaches the room edges. Native controls have at least 44px touch height; fields accept horizontal dragging while preserving vertical page scrolling. Keyboard equivalents are provided for holding/reopening, viewpoint, time, light source, scale and threshold.

Only Observer has ambient animation. Its bounded frame loop runs at approximately 30fps, stops when the field is offscreen, the document is hidden, the event is held, reduced motion is requested or Studio is active, and resumes only when needed. The other diagrams redraw on input. Edge uses a fixed-size canvas and bounded sample grids; its photograph is lazy-loaded. No analytics or interaction history persistence is introduced.

Reduced motion keeps the initial diagram static while all conceptual operations remain available through pointer, touch and keyboard. There is no conceptual unlock that requires animation.

## Verification

The regression script is `tools/test-clear.mjs`. It supports a running author server through `CLEAR_TEST_ORIGIN`, an isolated server through `CLEAR_TEST_START_SERVER=1`, optional `PLAYWRIGHT_PATH`, `CHROMIUM_EXECUTABLE` and `CLEAR_CHROMIUM_ARGS`, and a screenshot destination through `CLEAR_TEST_OUTPUT`.

It checks 360, 390, 430 and 1440px, direct touch/mouse gestures, keyboard operation, naming without evidence mutation, reconstruction detail loss, viewpoint changes, reference-frame invariance, actual simplification error, all five distinct time traces, real image contour changes, absence at an extreme threshold, lookback selection, writing routes and horizontal overflow. Reduced motion is checked separately. Studio exercises initialization, disabled visitor behaviour, text and image addition, annotation metadata, save/reload, desktop selection and the clean visitor view. Temporary CLEAR data is backed up and restored; protected routes, manifests, mirror code, Studio implementation and package files are hash-checked.

Validation is browser emulation, not a claim of testing a physical phone. Independent mathematical checks also verify vector equivalence and conservation of the integrated average. The production build and comparison against the pre-change output are release gates.

The baseline repository’s `package.json` requests Astro 7 while `package-lock.json` still records Astro 3. `npm ci` therefore fails before application compilation. Dependencies for this work were installed without changing either file; `npm run build` runs with Astro 7.4.2. That existing dependency discrepancy was kept outside this CLEAR-only change.

### Recorded release checks

| Check                                                                           | Result                                                                          |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 360 / 390 / 430 / 1440px visitor interaction checks                             | PASS                                                                            |
| Real touch gestures on phone viewports; mouse on desktop; keyboard alternatives | PASS                                                                            |
| Naming preserves the held event; reconstruction loses the declared samples      | PASS                                                                            |
| Frame changes retain the sky record; term removal produces calculated error     | PASS                                                                            |
| Five actual time traces; real image contours; lookback selection; writing links | PASS                                                                            |
| Reduced-motion conceptual operations                                            | PASS                                                                            |
| Local Studio text/image add, metadata, save/reload and desktop selection        | PASS                                                                            |
| Author-session visitor-action and navigation protection                         | PASS                                                                            |
| Production checks at all four widths, including an `edit=1` query               | PASS; no Studio or runtime page errors                                          |
| Horizontal overflow                                                             | None at the four checked widths                                                 |
| `npm run build`                                                                 | PASS; 27 Astro pages generated                                                  |
| Unrelated production output                                                     | 27 other HTML files unchanged, except App World’s existing automatic date label |
| Protected sources, media manifests, Studio, mirror and package files            | Hash-identical to the baseline                                                  |
| Test annotation and upload cleanup                                              | Original CLEAR manifest restored; known test image removed                      |

The production CLEAR script is 21,726 bytes (8,123 gzip); its room stylesheet is 25,520 bytes (6,133 gzip), plus the already-shared model stylesheet. The four local font files total 110,432 bytes. These are transfer-size observations, not a claim of measured physical-phone frame rate.

## Exact change manifest

| File                                         | Change                                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/pages/clear.astro`                      | Four-instrument metadata, local font preloads, early author-mode flag; existing archive preserved |
| `src/components/ClearVault.astro`            | CLEAR header, four anchor entrances and instrument composition                                    |
| `src/components/clear/ClearObserver.astro`   | Event, naming, attention, reconstruction and astronomical lookback markup                         |
| `src/components/clear/ClearModel.astro`      | Orbital mechanism, reference record, assumptions and measurements                                 |
| `src/components/clear/ClearScale.astro`      | Time field, scale anchors and actual exploration history                                          |
| `src/components/clear/ClearEdge.astro`       | Existing photograph, pixel contours and measurement controls                                      |
| `src/data/clear-instruments.ts`              | Explicit shared mathematical constructions and sourced lookback estimates                         |
| `src/scripts/clear-exhibits.ts`              | Direct manipulation, state transitions, rendering and author-session guard                        |
| `src/styles/clear.css`                       | Isolated visual system, local fonts, responsive typography and reduced motion                     |
| `tools/test-clear.mjs`                       | CLEAR interaction, layout, Studio and protected-file regression checks                            |
| `public/clear/fonts/bodoni.woff2`            | Bodoni Moda upright                                                                               |
| `public/clear/fonts/bodoni-italic.woff2`     | Bodoni Moda italic                                                                                |
| `public/clear/fonts/barlow.woff2`            | Barlow Condensed regular                                                                          |
| `public/clear/fonts/plex-mono.woff2`         | IBM Plex Mono regular                                                                             |
| `public/clear/fonts/bodonimoda-OFL.txt`      | Font licence                                                                                      |
| `public/clear/fonts/barlowcondensed-OFL.txt` | Font licence                                                                                      |
| `public/clear/fonts/ibmplexmono-OFL.txt`     | Font licence                                                                                      |
| `CLEAR.md`                                   | Design map, doctrine mapping, limits, validation and change manifest                              |

## Scientific source notes

- [Harvard’s Ptolemaic Epicycle Machine](https://sciencedemonstrations.fas.harvard.edu/presentations/ptolemaic-epicycle-machine): historical purpose of deferent/epicycle constructions.
- [NASA Mars Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html): Earth/Mars orbit parameters used as approximate circular inputs.
- [NASA SOHO FAQ](https://soho.nascom.nasa.gov/explore/faq.html): approximately 500 seconds for sunlight to reach Earth.
- [NASA: Measuring a White Dwarf Star](https://science.nasa.gov/missions/hubble/measuring-a-white-dwarf-star/): Sirius at approximately 8.6 light-years.
- [NASA: Andromeda](https://science.nasa.gov/photojournal/andromeda/): approximately 2.5 million light-years.

These sources ground the specific examples. The philosophical interpretation and the illustrative signals are authored constructions, not findings attributed to those sources.
