# Natural field refinement

The field remains the authored six-signal composition from `e3d2d34`. No media
was added or replaced. Empty signals intentionally await real personal material.

## One model, overlapping contexts

`src/scripts/natural-model.ts` supplies the signal vocabulary, legacy fallbacks,
public visibility predicate, prominence ordering, and escaped artifact markup.
The Astro component and live field/Studio consume the same renderer. The first
signal owns the editable artifact; other signals show contextual previews, not
duplicate video players. Legacy `group` stays compatible with existing records;
it is not the identity taxonomy. Existing IDs and sources stay unchanged.

- `signals`: one or more of PLAY, VOICE, OBSERVE, MAKE, ARCHIVE, NOW.
- `tags`: optional freeform tags.
- `era`: childhood, school, early, hoop era, music era, current, undated.
- `temporal`: optional approximate date label; `date`: optional exact date.
- `visibility`: public, hidden, draft. Missing visibility retains existing
  public behavior. Placeholders and `curated: false` never enter visitor output.
- `featured`: prominence preference, not permission to publish.
- `playOrder`: retained storage key for prominence; lower values surface first.

Private artifacts are omitted from visitor HTML and JSON, not hidden using CSS.
Visibility is publication control, not file access control: files in `public/`
remain directly addressable. Do not upload confidential diaries into a public
repository or public asset directory; keep those originals outside the site.

## Local Studio

Run `npm run edit`, then open `/natural.html?edit=1`. Natural supports the existing
file/URL/text workflow plus signal/tag/time/visibility/feature/prominence editing.
Save persists the manifest. Restart an already-running author server after
backend/plugin changes; Vite's page HMR does not replace startup-time middleware.

Natural is flow/cluster managed. Drag-to-tag is intentionally deferred: use the
multi-signal field rather than competing percentage-position and tagging systems.
The server accepts up to 2,000 Natural records. The landing field mounts at most
four previews per cluster; a selected signal surfaces 24 at a time. Images are
lazy/async, videos defer fetching and pause offscreen or when the tab is hidden.
Public metadata is still serialized as one manifest; very large future archives
may warrant separate data chunks and dedicated generated image thumbnails.

## Validation

Use an existing Playwright installation through `PLAYWRIGHT_PATH`; Playwright is
not a site runtime dependency. Run from the repository root:

```text
node tools/test-natural-model.mjs
node tools/test-natural-validation.mjs
node tools/test-natural-field.mjs
node tools/test-natural-studio.mjs
node tools/test-site-responsive.mjs
node tools/test-home.mjs
node tools/test-moments-swipe.mjs
node tools/test-games.mjs
node tools/test-gaming.mjs
node tools/test-home-mirror.mjs
node tools/test-clear.mjs
npm run build
```

Set each test's origin environment variable to the running server. HOME's
`HOME_TEST_LAYOUT_ONLY=1` skips author writes. CLEAR's `CLEAR_TEST_SECTION=visitor`
can run against production preview. Run manifest-mutating Studio tests serially;
other suites verify protected-file hashes. Natural Studio uses an ephemeral
instance of the actual current middleware so an old author server cannot strip
new fields during persistence checks. Tests restore their fixtures in `finally`.