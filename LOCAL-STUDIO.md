# Local Studio (preview only)

Run `npm run edit` from the project folder, then open:

- http://localhost:4321/natural.html?edit=1
- http://localhost:4321/?edit=1
- http://localhost:4321/worlds.html?edit=1
- http://localhost:4321/clear.html?edit=1
- http://localhost:4321/moments.html?edit=1

If 4321 is occupied, use the port printed by Astro. Ordinary `npm run dev`, production builds and `npm run preview` do not enable the editor, even with `?edit=1`.

## Compose

HOME is a personal foyer: the sky/Moments/Games/photo-fragment collage leads to three world entrances, **ICY NATURAL**, **APP WORLD**, and **CLEAR**. All three are ordinary HOME media objects in `src/data/media/home.json`, selected and edited with the same Local Studio controls. Their LABEL, DESCRIPTION, LINK, source, crop, fitting, shape, tilt, layers, duplicate/delete and SAVE are editable. App World and Clear begin with structural orbital/encoded previews; replace them with real media using **Replace → FILE / URL**. Their preview text is editable through the existing grouped text controls.

Natural begins with a collage of the real hoop, gaming and observation media previously on HOME. Replacing its media replaces the complete preview with the selected source; the label, caption, link, crop and frame remain. The former seven tiles are retained in `src/data/media/home-interest-archive.json` for reuse, and their original asset files remain. Natural's categories and all four destination pages are unchanged.

Phones use a longer canvas with three wide entrances in vertical order; desktop keeps the original canvas and presents three columns. The original mobile collage's y/height coordinates were rebased by 1846/2560, so the identity/media keep their actual positions and sizes. The arch above the entrances is now an editable personal photo fragment; its adjacent note points down to the worlds. Identity text and grouped captions remain editable scene objects. Author mode adds bottom scrolling space; normal mode shows no Studio controls.

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
| MOMENTS | `public/media/moments/` | `src/data/media/moments.json` |

Uploads are copied immediately with content-hashed filenames. SAVE atomically updates JSON. Deleting a piece removes its manifest entry, not the original asset: unused uploads are deliberately retained to avoid destructive deletion. HOME's media frames are manifest-driven; its paper composition is in `src/components/home/HomeScrapbook.astro` and `src/styles/home-scrapbook.css`. Previous intro data/assets remain on disk, but are not displayed. HOME starts with neutral placeholders, not example photographs or videos.

NATURAL keeps its original mint/green page and seven interest cards. Its media manifest starts empty so no sample artwork changes the existing design. The older illustrative SVG files remain on disk but are not displayed. SVG upload is intentionally not supported.

In Natural author mode, select its existing title, tagline, paragraph, headings, cards, seeds, or switch text. Drag to move, use the corner to resize, and edit the selected object's text fields in Local Studio. Native objects retain their original markup, fonts, gradients, rounded corners, and responsive flow footprint; moving or deleting one does not reflow the surrounding page. Duplicate, delete, front/back, nudge, undo/redo, and SAVE also work on these objects. Desktop/mobile movement and scaling are independent; text is shared. Saved overrides and added media are visible in normal mode without editor controls. Normal mode with an empty manifest is the original page.

Browser regression check: `node tools/test-natural.mjs` with Playwright available (or set `PLAYWRIGHT_PATH` to its installed package path). Run the author server first. The check restores Natural's manifest and removes its own uploaded files afterwards.

HOME regression check: `node tools/test-home.mjs` with Playwright available (or `PLAYWRIGHT_PATH` set to its package). Run an isolated author server first. The test checks all three destinations, preserved personal content, vertical phone / three-column desktop composition, 360/390/430/852/1440 overflow, normal-mode cleanliness, and every entrance's touch selection, move/resize, media replacement, label/caption/link editing, layering, duplicate/delete/undo, SAVE and reload. It restores its temporary changes and test uploads. Screenshots go to the system temporary `icy-home-validation` folder; `HOME_TEST_ORIGIN` and `HOME_TEST_OUTPUT` can point to an isolated server/output folder.

Two Worlds' original environmental background and CLEAR's generated thought-experiment graphics remain structural artwork, not freely editable pieces. Add supporting images/videos using the room canvas. Outside Natural's native objects and HOME's scene objects, changing structural art or canvas dimensions or adding a new room still requires code. The editor is not a CMS and cannot edit the atlas or written models.

The authoring middleware runs only in Astro's `author` dev mode. It accepts same-origin local-host requests, validates file signatures/paths/layout, and has no production endpoints. Do not expose this local editing server to the public internet. Nothing is committed, pushed or deployed by SAVE.

## Moments gallery

Public route: `/moments.html`. HOME's existing Lens Captured photo (`home-sky`) links here; its image, link, frame, crop, fitting and placement are still independently editable in HOME Studio. There is no second entrance and no automatic HOME image replacement.

Use `/moments.html?edit=1` with `npm run edit`. **+ UPLOAD PHOTOS** opens the native file picker directly and accepts multiple JPG/JPEG/PNG/WEBP/GIF photos (23 MB each). Drop and clipboard image paste use the same existing upload pipeline. HEIC/HEIF is not supported: export those photos as JPEG first. Uploaded originals are retained unchanged; a high-quality, auto-oriented WebP display copy (up to 1600 pixels per side) keeps the stream lighter. The larger view loads the original only when opened. Lazy loading, async decoding and reserved image/frame dimensions limit initial loading and layout shifts. If preview decoding fails, the original remains available as the display fallback.

New photos automatically append to a one-column mobile stream, two columns on medium screens and three on wide screens. No manual positioning is required. Each stream slot is a small Studio canvas: drag, resize, Size, crop, FIT/FILL, tilt, shape and layer controls operate within that photo's slot. Mobile/desktop frames save separately. Slots reflow as photos are added/deleted; moving a photo adjusts its composition within its slot, not the ordering of the stream. Duplicate adds another slot. A FEATURED checkbox gives one photo a wider desktop slot; it is stored for future integration but does not sync HOME or Photogression.

All metadata is optional. TITLE is the detail heading, LABEL is the visible caption, DESCRIPTION is additional detail text, CATEGORY / ROLE is the lens/category, with optional DATE, NOTE and LINK. Empty images render without metadata placeholders. Save writes the Moments manifest and refreshes; originals remain safe when pieces are deleted or undone. Moments allows up to 500 pieces (other rooms keep their 100-piece limit).

On phones, swipe over unselected photos to scroll; tap to select a photo, then drag that selected photo to move it or its corner to resize. The bottom Studio panel occupies at most 36% of screen height and scrolls independently. Upload/save controls have 44px minimum touch targets. No hover is needed.

To edit from a phone on your trusted LAN, run `npm run edit -- --host 0.0.0.0` and open the Network address printed by Astro, followed by `/moments.html?edit=1`. The phone must reach the computer (same trusted network and firewall access). Do not port-forward or expose this author server publicly. Changes save into this project on the computer; they are not phone-browser storage. Public production remains a static build; making saved photos public still requires the existing manual build/publishing workflow. No publishing or cloud infrastructure has been added.

Visitors can open photos in an accessible large-image dialog with next/previous, Close, Escape and browser Back. Optional links are shown inside detail instead of hijacking the photo tap. Normal pages have no Studio chrome; production does not load the authoring module even with `?edit=1`.

Regression: `node tools/test-moments.mjs` against a running author server (`MOMENTS_TEST_ORIGIN` overrides the origin). It uses an available Playwright install or `PLAYWRIGHT_PATH`, backs up/restores Moments data/uploads, and verifies uploads/paste/drop, editing, save/reload, stream flow, mobile widths, detail controls and protected room files. Photogression remains context only: no API, IndexedDB, browser-storage sync or cloud integration.