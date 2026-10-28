# Gaming: gameplay → highlights → my take → Gaming OS

Implemented against branch `redesign/curated-observatory`, starting at `7baf6d1d0d37328fa3bec8f2ca675362b19a7b3b`.

## Composition and media

The original landscape Naraka lead remains first. The three existing curated Shorts now form a horizontal, touch-scrolling snap rail. A full first item and a partial next item remain visible on phones. Native momentum and vertical page scrolling work together; arrow buttons and keyboard arrows are alternatives. Desktop presents all three additional highlights in one spatial row, with preview and caption beside each other. Rail controls disappear when everything fits.

The lead is item 1; the rail continues with items 2–4. It does not repeat the lead thumbnail. The former SCREEN SIGNAL grid and its CSS are removed. MORE FROM CEE HAM remains a small external channel link.

There is no second manifest. `src/data/gaming.ts` derives the same four records from the existing HOME and Natural manifests:

| Position | Existing record | Verified source | Native aspect |
| --- | --- | --- | --- |
| 1 | home-games | 68PbSDhCrxI | 1.7699115044247788 |
| 2 | play-naraka-duel | J4Po1W2ROBE | 9:16 |
| 3 | play-halo-pistol | ijLxbhyn7hI | 9:16 |
| 4 | play-gears | mdhgL77UL7Y | 9:16 |

Existing thumbnails are unchanged. YouTube's local 480×360 thumbnails include letterboxing or duplicated sides around the actual media frame. The preview uses the manifest's aspect and centered cover to remove that padding. The actual embedded video is fitted to its native aspect within the viewer, without cropping. No media was downloaded, replaced, generated, or added.

## Immersive viewer

Tapping the lead or a rail preview opens a native modal dialog. Only that active item's YouTube player is mounted; the API itself loads on the first interaction. Item changes save the active playback time, pause/destroy the old player, then mount the next. Returning to an item resumes near the saved time using YouTube's start parameter. Closing removes the player. Backgrounding pauses it. A late API response cannot resurrect a closed player. Back/Forward and BFCache restoration are handled.

Horizontal drag/swipe on the matte, header or footer moves between highlights. The cross-origin YouTube surface retains its native playback, scrubbing and fullscreen controls; gestures inside that iframe belong to YouTube. The footer explicitly identifies the swipe surface. Previous/next buttons and keyboard arrows offer alternatives. The native dialog traps focus; Escape/close restores the opening link, page scroll and rail position.

The viewer URL uses `?highlight=<existing-video-id>`. Moving inside it replaces that one history entry. Back closes it before leaving Gaming; Forward restores the current selection. A direct viewer URL also establishes a same-page base entry, and reload does not add another one. No automatic item advance or looping animation is used. Reduced motion removes smooth rail scrolling.

An unavailable API or unembeddable video retains a direct canonical YouTube link, with a status message. All four previews remain ordinary YouTube links without JavaScript.

## Compact take and exact glyph reuse

The visible score remains **9.3 / 10**, using the published Naraka record and unchanged verdict. The former 96px score and large page radar are gone; the numeric score is 52px, with a small 82px phone / 96px desktop glyph host.

`src/components/GamingGlyph.astro` imports the unchanged Gaming OS engine at `public/gaming/assets/js/domain/glyph.js` and the unchanged renderer at `public/gaming/assets/js/ui/glyph.js`. It calls that renderer's existing `sm` detail level and session variant. The exact Experience Glyph CSS block is extracted from Gaming OS's authoritative stylesheet at build time; the build fails if its boundaries disappear. No geometry, formula, colors, or radar renderer are duplicated in the Gaming page.

The current repository's actual renderer uses gradient stops `#7ee7ff`, `#8f7bff`, `#c65cff`, with its original outline/dot/grid rules. Those exact colors are reused, rather than interpreting the reference mockup as a replacement icon. The supplemental glyph is hidden from assistive technology; the adjacent numeric link names Naraka and its score.

| Entrance | Destination |
| --- | --- |
| Full evaluation / numeric score | `/gaming/?view=results&experience=exp-mup4h565-16dgkbw` |
| Other game ratings | `/gaming/?view=history` |
| Enter Gaming OS | `/gaming/` |

The existing public adapter now supports selecting a published experience by ID in the existing Results view. It uses the original `loadHistoryItem` flow and preserves that ID through reload/history. It falls back to History for an unknown record. Both publisher source and published adapter are updated together. No Gaming OS layout, evaluation values, storage, or algorithms change. There is no second evaluation UI.

HOME, Natural, CLEAR, Moments, typography tokens, all media manifests, and the entire Gaming OS snapshot remain unchanged.

## Validation

Passed:

- `node tools/test-games.mjs` — 360 / 390 / 430 / 1440; native-ratio previews; all four sources; real Chromium touch swipe and vertical scroll passthrough; arrows/keys; single-player lifecycle; time retention; background pause; close/Back/Forward; deep viewer URL and reload; exact scroll/focus restoration; delayed API/close race; unavailable-API fallback; no-JS links; exact score/verdict/geometry/gradient; Naraka Results and reload; nine-rating History; system entrance; no horizontal page overflow or application errors. The playback boundary uses a deterministic API test double, explicitly separate from the live smoke check.
- `node tools/test-gaming.mjs` — all nine stored evaluations and glyphs at 360 / 390 / 430 / 1440; Atlas, navigation/Back, read-only protection, reload with browser storage unavailable, and HOME → Gaming → Gaming OS → Back.
- `node tools/test-site-responsive.mjs` — full existing matrix across HOME, Natural, Moments, Gaming, CLEAR, App World, Two Worlds and Gaming OS, including HOME 320 / 360 / 390 / 430 / 700 / 701 / 1280 / 1440 / 1920.
- `node tools/capture-games-viewer.mjs` — landscape and vertical preview states at all four widths; existing Naraka Results at 390 / 1440.
- `npm run build` — 27 static pages.
- `git diff --check`.

Actual third-party smoke: `node tools/test-games-live.mjs` loaded the real YouTube API and one real player through the execution environment's HTTP proxy. The player recognized the unchanged lead source and 4:08 duration. Googlevideo CDN requests failed (`net::ERR_FAILED`), leaving playback at time 0 / readyState 0. **Uninterrupted third-party streaming is not verified in this environment.** This is recorded in [youtube-smoke.json](youtube-smoke.json), with the actual player screenshot below. No fake playback screenshot is presented as real playback.

Headless Chromium 153 was used for visual and interaction validation. Physical Android/iOS, Safari and Firefox were not available. The Windows path `E:\Projects\icy-clearer-redesign` was not mounted; implementation and validation ran in the synced repository clone.

## Screenshots

The page captures show actual unchanged posters. Viewer preview captures hold the API request to make its real loading/poster state reproducible; they contain no fake player or replacement frames. A viewport repaint is forced after changing aspect because the headless compositor otherwise omits some unchanged dialog chrome from screenshots.

| Width | Page | Landscape viewer preview | Vertical viewer preview |
| --- | --- | --- | --- |
| 360 | [page](page-360.jpg) | [landscape](viewer-landscape-preview-360.jpg) | [Short](viewer-short-preview-360.jpg) |
| 390 | [page](page-390.jpg) | [landscape](viewer-landscape-preview-390.jpg) | [Short](viewer-short-preview-390.jpg) |
| 430 | [page](page-430.jpg) | [landscape](viewer-landscape-preview-430.jpg) | [Short](viewer-short-preview-430.jpg) |
| 1440 | [page](page-1440.jpg) | [landscape](viewer-landscape-preview-1440.jpg) | [Short](viewer-short-preview-1440.jpg) |

Existing full evaluation: [390](naraka-results-390.jpg), [1440](naraka-results-1440.jpg).

Real YouTube API/player smoke, still buffering due to the CDN failures: [390](youtube-api-390.jpg).
