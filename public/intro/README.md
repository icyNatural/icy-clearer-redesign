# public/intro/ — INTRO collage media

The intro (`/`) reads this folder at build time. Drop a file in and it appears in the collage automatically — no code changes, no layout work.

## Photo / creation / observation files

| File | Used by | Collage role |
| --- | --- | --- |
| `primary.jpg` | `primary` | main portrait (arch shape, ice material) |
| `secondary.jpg` | `secondary` | second frame behind the title |
| `detail.jpg` | `detail` | narrow observation crop |
| `fragment.mp4` | `motion` | optional short muted loop (only renders when present) |

Accepted image extensions: `.jpg` `.jpeg` `.png` `.webp`.

Instagram media could not be retrieved from this environment: every public profile (including control profiles `instagram` and `natgeo`) returned an auth/error shell, the public `web_profile_info` endpoint returned HTTP 429 on every attempt, and tokenless oEmbed returned no thumbnail or author metadata. Nothing was scraped and nothing was invented. These files are the manual step.

## Video highlights (YouTube — @icyclear / "Cee Ham")

Wired with real public data from your channel. Posters stored in `highlights/`, click plays a **muted** inline player, plus an "open on YouTube" link. No audio ever autoplays.

| id | File | Video | Kind |
| --- | --- | --- | --- |
| `venom-1v6` | `highlights/venom-1v6.jpg` | [venom 1v6 survivability](https://www.youtube.com/watch?v=6JL4DZIalNg) | game — Marvel Rivals |
| `yoto-main` | `highlights/yoto-main.jpg` | [iDoAutographs F2 Yoto main](https://www.youtube.com/watch?v=68PbSDhCrxI) | game — Naraka: Bladepoint |
| `sparking-zero` | `highlights/sparking-zero.jpg` | [Dragonball sparking zero has a PERCEPTION problem](https://www.youtube.com/watch?v=sOJHKw6G6a8) | game — Sparking Zero |

To add a **basketball** or **MVP / player-of-the-game** highlight: add an entry in `src/data/intro.ts` (`youtubeHighlights`) with `category: "basketball"` or `"mvp"` and drop its poster at `public/intro/highlights/<id>.jpg`. The Instagram "Rec shenanigans" basketball highlight could not be pulled from this environment — export the clip to YouTube (or save a still) and it slots straight in.

## Adding media to the collage

Author one object in `src/data/intro.ts` — the highest `priority` items fill the six collage positions in the first viewport, anything beyond that flows into the loose band below:

```ts
define({
  id: "cloud-01",
  kind: "observation",
  category: "observation",
  src: "/intro/cloud-01.jpg",
  material: "sky",
  shape: "organic",
  priority: 46,
  label: "SKY",
}),
```

- `kind`: `photo` | `highlight` | `object` | `observation` | `motion` — each behaves differently (photos reframe on focus, highlights show a play state, observations can sit atmospheric behind other pieces, objects get a tiny caption chip)
- `material`: `ice` `silver` `denim` `charcoal` `forest` `cream` `suede` `sky` `earth` `iridescent` `black` — edge, tint and shadow character per piece (defaults by kind)
- `shape`: `arch` `tall` `soft` `strip` `slice` `organic` `paper` — defaults by kind
- `label`: tiny optional caption (`PORTRAIT`, `PHOTO`, `DETAIL`, a game name…). Never show file paths in the design — paths live in this file only
- `priority`: higher = placed earlier in the first viewport

Ideas that drop straight in: body butter / essential oil photos (`kind: "object"`), modeling or clothing stills (`photo`), clouds / mud / weather (`observation`), music or everyday fragments (`life` category).

## Notes

- Photos: roughly 1600–2400px on the long edge, under ~600KB each.
- YouTube posters are maxres frames (~120–150KB) stored locally — no fragile CDN hotlinks.
- Missing photos render as soft editorial ghosts (paper silhouette + tiny label), not technical frames.
