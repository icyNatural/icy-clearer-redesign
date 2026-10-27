# Gaming OS public snapshot

## Architecture

`E:\Projects\icyNatural-game-os` remains the personal, editable application at
`http://localhost:3000/`. Nothing in this integration changes its database or files.

`E:\Projects\icy-clearer-redesign\public\gaming` is generated standalone static
HTML/CSS/vanilla JS, preserving the existing dark/volt app and domain calculations.
Astro copies it verbatim to `dist/gaming/index.html`; it is not an Astro rewrite.
The intended public URL is `https://icyclearer.com/gaming/` (not deployed yet).
`tools/gaming-route.mjs` exempts just this sub-app from Astro dev's global
trailing-slash rejection and serves its directory index. Production requires normal
static directory-index serving; the development middleware is not a production server.

## Refresh the snapshot

1. Use the personal app in the regular Chrome profile at **http://localhost:3000/**.
2. Settings → Export Data. Keep the full export outside this repository/public directory.
3. From `E:\Projects\icy-clearer-redesign`:

   ```powershell
   npm run gaming:publish -- "E:\path-to-private-export.json" "E:\Projects\icyNatural-game-os"
   npm run build
   ```

4. Review `E:\Projects\icy-clearer-redesign\public\gaming\data\public-snapshot.json`
   before publication. Never copy the private export into the public directory.
5. Validate with `node tools/test-gaming.mjs` against an author dev server on
   `http://127.0.0.1:4347`. Set `GAMING_TEST_ORIGIN` to test another server and
   `PLAYWRIGHT_PATH` to an installed Playwright package. To compare every rating,
   score and derived pattern to the source, set `GAMING_SOURCE_EXPORT` to the private
   export path. No private file path is bundled in the output.

The command regenerates only `public/gaming`, including the current runtime from
the personal project. Do not manually edit generated files. Version-control the
sanitized output so building elsewhere does not require access to the personal app.
Export schema changes and unrecognized signal labels fail closed for review.

## Data / privacy policy

- Public: exact game/experience/library/signal IDs, original names, selected
  platform, all nine rating values, stored score and verdict, record timestamps,
  library status, structured signal polarity/importance/confidence and known labels.
- Known overall/session contexts and standard generated rating/friction evidence
  are retained. Taste uses the existing computation frozen at the publication date.
- Excluded: free-text notes, arbitrary friction/contextual text arrays, arbitrary
  metadata, unknown custom contexts, media/attachments (even if marked public),
  sessions, stored taste caches/recommendations, raw overlay entities/edges,
  catalog cache, credentials, local/legacy storage and recovery metadata.
- Explicit private/hidden records are excluded and dependent signals filtered.
  All media is excluded in this first publication: no local clip files are copied.
- Existing seed graph is a **non-personal discovery catalog**, not proof of played
  history. Only snapshot experiences populate personal History. Generated graph
  projections of the nine real game identities make them discoverable unchanged.
- The adapter never initializes personal IndexedDB. It uses cloned JSON records;
  mutation/import/export APIs reject, editing/settings controls are hidden and
  guarded, and legacy/config references use an empty in-memory facade rather than
  visitor browser storage. No visitor-local sandbox is presented as owner data.
- Visitors can alter their own page in developer tools, but cannot persist changes
  or update the static published snapshot. There is no publishing endpoint.
- Direct JSON downloads are public by design. This is not a private-backup format.

## Source provenance for the first snapshot

A fresh read-only capture of the actual regular-Chrome `http://localhost:3000/`
database on October 26, 2026 verified 9 evaluations, 9 games, 9 library records,
73 signals, and 25 patterns across reloads. Source evidence/export is retained only
under `E:\Projects\game-os-private-backups`, never in this public bundle.

Personal storage: IndexedDB `icyNaturalGameOS`, database version 2, export schema 3.
Stores: entities, edges, games, library, sessions, experiences, signals, taste,
recommendations, evidence, catalogCache (cache not exported).
Legacy/fallback keys: `icyNaturalGameOS`, `icyNaturalGameOSHistory`,
`icyNaturalGameOS.db.v2`, `icyNaturalGameOSMigration`, `icyNaturalGameOSBackup.*`;
catalog settings: `icyNaturalGameOSCatalog`. Settings export format is
`icyNaturalGameOS.export` with versioned `collections`. Public format is separately
named `icyNaturalGameOS.public`, version 1, and must not be used as a private backup.

HOME `home-games` links to `/games.html` (Gaming); its Naraka preview and Studio
metadata stay intact. `/gaming/` remains Gaming OS. Natural PLAY remains the
distinct expressive clips collection.

## Human-facing Gaming layer

`/games.html` follows the site's `.html` page convention and avoids confusing
`/gaming.html` with the standalone `/gaming/` application. Gameplay leads down to
Naraka's exact published 9.3 evaluation and then the full system entrance.
`src/data/gaming.ts` reads only the checked-in public snapshot and executes its
published `domain/glyph.js` engine at build time for identical fixed 0–10 radar
geometry. The stored score is passed through, not recomputed. The SVG, verdict,
dimension values and navigation all work without browser JavaScript.

The rating/glyph links to `/gaming/?view=history`; the existing public router
supports views, not record-specific query parameters. Select Naraka there to open
its record. The broader entrance uses `/gaming/`. YouTube previews explicitly open
real external videos, avoiding unreliable embeds. Metadata/posters are reused
from HOME and Natural; the channel is the existing `introCopy.channel`. Three
additional Gears/Marvel clips have no fabricated ratings. No Natural data is edited.

Run `node tools/test-games.mjs` and `node tools/test-gaming.mjs` against the
development server (`GAMING_TEST_ORIGIN` overrides the default). The first also
compares HOME's manifest with the pre-change HEAD to verify destination-only changes.

Before deploying, verify hosting serves `/gaming/index.html` at `/gaming/` with
normal MIME types and no SPA rewrite interception. No deployment is performed by
the snapshot command. Existing main-site canonical `site` configuration is unchanged.