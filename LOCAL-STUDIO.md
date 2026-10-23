# Local Studio (preview only)

Run `npm run edit` from the project folder, then open:

- http://localhost:4321/natural.html?edit=1
- http://localhost:4321/?edit=1
- http://localhost:4321/worlds.html?edit=1
- http://localhost:4321/clear.html?edit=1

If 4321 is occupied, use the port printed by Astro. Ordinary `npm run dev`, production builds and `npm run preview` do not enable the editor, even with `?edit=1`.

## Compose

HOME follows the supplied cream-paper mobile scrapbook composition. Its twelve neutral media slots are the sky polaroid, Moments polaroid, Games card, sketch/ideas photo, tall arched portal interior, and seven interest tiles. Select any slot in `/?edit=1`, then **Replace → FILE / URL**. Paper surrounds and tile names stay attached through replacement, duplicate, and undo/redo. The title, signature, notes, and body copy are structural HOME typography, not media objects. The portal starts with `/world.html` as its destination; change its **Link** field to configure it. Author mode adds bottom scroll space so lower frames can be moved above the mobile toolbar; normal mode has no extra editor space.

New image/video pieces are measured before placement and start with native proportions and FIT. Shorts URLs use a 9:16 aspect hint rather than YouTube oEmbed's landscape player dimensions. Corner resizing preserves the current proportions for measured media; hold Shift to reshape freely. FIT/FILL and explicit aspect controls remain available. Replacement preserves your existing frame. Mobile and desktop placement remain separately authored; percentage-based frames can change proportion on different viewport shapes, while FIT keeps the content undistorted.

The page is a canvas: drop one or several JPG/JPEG/PNG/WEBP/GIF/MP4/WEBM files directly onto it. New pieces are centered near the drop point (clamped to the room bounds), slightly staggered for multiple files, and immediately selected. Files are copied into the current room with content-hashed names; **SAVE** persists placement. Each file is limited to 23 MB.

Paste a clipboard image with **Ctrl+V** while focus is outside a text field. It appears near the visible canvas center. Native paste and undo remain available while typing into fields.

**Duplicate** copies media, crop and styling with a small offset. **Undo / Redo** cover this editing session (up to 80 snapshots): Ctrl+Z, Ctrl+Shift+Z or Ctrl+Y. Save/reload starts a new session. Uploads are retained even if their placement is undone. Arrow keys nudge; Shift+Arrow moves farther. Delete/Backspace removes the selected piece outside form fields.

Use **FIT** to show the whole image or **FILL** to crop into its frame. Crop X/Y choose the focal point. **+ TEXT** adds a plain text object with text size, alignment, light/dark/icy color, and serif/sans/mono/handwriting-style choices. The handwriting-style choice uses the existing italic serif lineage, not a newly downloaded font. Text identity/style is shared; its mobile/desktop frame placement stays separate. Multi-select is intentionally deferred.

Select a piece, or use **+ ADD MEDIA** on the canvas or toolbar. Choose JPG, JPEG, PNG, WEBP, GIF, MP4 or WEBM (up to 23 MB). Drag to move, use the corner to resize, or use Size / Aspect. Crop sliders change the image's focal point. Shape, tilt, front/back, label/alt text, link and category are optional. Arrow keys nudge selected pieces; Shift moves farther.

**+ ADD MEDIA → FILE / URL**: choose a file, or paste a source URL and select **FETCH → preview → ADD**. Replace has the same two choices and preserves placement, crop, shape, tilt, layers, link and manual text overrides. HOME's paper mats are selectable pieces too: replace them with your own media.

**SOURCE** is displayed media or its attribution. **LINK** is an independent optional click destination. YouTube plays in place with LINK blank; generic webpage fragments link to their canonical page. A separately supplied LINK overrides that destination. Refresh metadata fetches again only on request. Changing SOURCE requires **FETCH SOURCE** before SAVE; an unconfirmed source draft is not saved.

TITLE, DESCRIPTION, ALT TEXT and LABEL use fetched metadata by default. Typing creates a manual override; **AUTO**, or clearing the field, restores metadata. These overrides survive source replacement and refresh. YouTube oEmbed supplies title, channel and thumbnail; descriptions/durations are not fabricated when absent. Metadata is stored inside the room manifest. Thumbnails are cached under `public/media/<room>/remote/` when downloadable, with a remote URL fallback. Rendering/building never fetches metadata.

Supported sources: YouTube watch/Shorts/share URLs, direct image/video URLs, local public media paths, and ordinary public webpage Open Graph/title/canonical metadata. Remote access can fail or expire; refresh or attach a local file. External media still depends on its provider/network. For Instagram, URLs are preserved without anonymous scraping: add the unavailable fragment, then **Replace → FILE** to attach your downloaded media while retaining Instagram attribution. No credentials or API keys are stored.

Desktop and mobile positions/sizes are saved separately. Resize the browser to compose the other layout. Crop, shape, label and link are shared. On a phone use Size rather than pinch gestures; the toolbar scrolls independently at the bottom.

**SAVE** writes the room manifest and refreshes the page. Unsaved changes trigger a navigation warning. A changed source revision prevents another tab from silently overwriting your work.

## Source files

| Room | Upload folder | Manifest |
| --- | --- | --- |
| HOME | `public/media/home/` | `src/data/media/home.json` |
| NATURAL | `public/media/natural/` | `src/data/media/natural.json` |
| CLEAR | `public/media/clear/` | `src/data/media/clear.json` |
| TWO WORLDS | `public/media/worlds/` | `src/data/media/worlds.json` |

Uploads are copied immediately with content-hashed filenames. SAVE atomically updates JSON. Deleting a piece removes its manifest entry, not the original asset: unused uploads are deliberately retained to avoid destructive deletion. HOME's media frames are manifest-driven; its paper composition is in `src/components/home/HomeScrapbook.astro` and `src/styles/home-scrapbook.css`. Previous intro data/assets remain on disk, but are not displayed. HOME starts with neutral placeholders, not example photographs or videos.

NATURAL keeps its original mint/green page and seven interest cards. Its media manifest starts empty so no sample artwork changes the existing design. The older illustrative SVG files remain on disk but are not displayed. SVG upload is intentionally not supported.

In Natural author mode, select its existing title, tagline, paragraph, headings, cards, seeds, or switch text. Drag to move, use the corner to resize, and edit the selected object's text fields in Local Studio. Native objects retain their original markup, fonts, gradients, rounded corners, and responsive flow footprint; moving or deleting one does not reflow the surrounding page. Duplicate, delete, front/back, nudge, undo/redo, and SAVE also work on these objects. Desktop/mobile movement and scaling are independent; text is shared. Saved overrides and added media are visible in normal mode without editor controls. Normal mode with an empty manifest is the original page.

Browser regression check: `node tools/test-natural.mjs` with Playwright available (or set `PLAYWRIGHT_PATH` to its installed package path). Run the author server first. The check restores Natural's manifest and removes its own uploaded files afterwards.

HOME mobile regression check: `node tools/test-home.mjs` with the same Playwright setup. It checks responsive geometry/overflow, all twelve touch targets, replacement/upload, drag/resize, crop/FIT/FILL, tilt/layers, undo/redo, paste/drop, save/refresh and clean normal mode. It restores HOME's manifest and removes its test uploads. Full-page screenshots are written under the system temporary directory in `icy-home-validation`.

Two Worlds' original environmental background and CLEAR's generated thought-experiment graphics remain structural artwork, not freely editable pieces. Add supporting images/videos using the room canvas. Outside Natural's exposed native objects, changing structural art, text, canvas dimensions or adding a new room still requires code. The editor is not a CMS and cannot edit the atlas or written models.

The authoring middleware runs only in Astro's `author` dev mode. It accepts same-origin local-host requests, validates file signatures/paths/layout, and has no production endpoints. Do not expose this local editing server to the public internet. Nothing is committed, pushed or deployed by SAVE.