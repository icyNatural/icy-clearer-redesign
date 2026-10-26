# Mobile Tailscale author diagnosis

## Scope and honesty boundary

The existing real author server on port 4321 was tested, not a substitute server. Its process used `astro dev --mode author --port 4321 --host 0.0.0.0 --port 4321 --force` and listened on `0.0.0.0`. Tailscale reported the laptop's address as `100.118.199.50`.

Both origins were requested by Chromium running on the laptop. This exercises the actual Tailscale-IP origin, Host/Origin headers, insecure-context behavior, assets and author endpoints. It does not exercise the phone-to-laptop tunnel or a physical phone browser. No native phone-gallery test was possible from this environment.

**The reported intermittent initial blank/dark screen was not reproduced. Its exact cause is not established. Do not mistake the confirmed upload failure below for proof of the initial blank-screen cause.**

## Confirmed failure and fix

On `http://localhost:4321`, `isSecureContext` was true and `typeof crypto.randomUUID` was `function`. On `http://100.118.199.50:4321`, they were false and `undefined` respectively.

Local Studio called `crypto.randomUUID()` inside `install()` when creating media and inside Duplicate. Before the fix, the existing Moments regression at the Tailscale origin failed waiting for the two uploaded photos to be inserted. The ID call occurs after file upload; the file can have reached disk even though insertion fails. These calls are not used during initial startup.

Scene IDs now use 16 random bytes from `crypto.getRandomValues`, encoded as a `media-` prefixed hex string. These are object identifiers, not authorization credentials. No weaker origin rule or new dependency was introduced.

After the fix the full existing Moments regression passed at both origins: multi-photo upload through a file-chooser event, paste/drop, editing, crop/fit, metadata, duplicate/delete/undo, move/resize, SAVE, reload persistence, public gallery and detail navigation at 360/390/430/1440px. The test restored the original manifest/uploads and verified other room files were unchanged. This is browser automation, not a physical phone picker.

## Initial load observations

Before changes, all eight combinations of localhost/Tailscale, HOME/Moments and normal/author returned 200 and painted in mobile emulation. There were no captured page errors or failed requests. Studio appeared for author URLs. Initial empty Moments had 38 DOM nodes in normal mode and 150 with Studio; HOME had 124/229. HOME had 15 editable objects and about 6.5K characters of manifest data. Moments was empty, so a large real-photo collection or phone memory-pressure problem was not tested.

Post-change desktop and mobile matrix passed. Representative mobile timings from one run (milliseconds; laptop measurements, not phone performance):

| Origin | Page | First contentful paint | Editor initialization starts |
| --- | --- | ---: | ---: |
| localhost | HOME author | 140 | 190 |
| localhost | Moments author | 36 | 66 |
| Tailscale IP | HOME author | 152 | 201 |
| Tailscale IP | Moments author | 36 | 71 |

Normal and author pages had no horizontal overflow in that matrix. The full Moments suite additionally checked populated-gallery widths.

## What was checked, not guessed

- **Security:** the original interface-address allowlist and exact HTTP Origin/Host check were retained. Browser SAVE and upload succeeded at the Tailscale origin. Explicit external-origin, mismatched-port, missing editor-header and `null`-origin requests returned 403. Correct same-origin requests with deliberately invalid room data passed the origin guard and returned 400 `Unknown room.` without writing.
- **URL construction:** author POSTs already use relative `/__author/...` URLs. No absolute localhost URL was found in the browser author request path. No host rewrite was needed.
- **Vite/HMR:** installed Vite is 8.1.0. Its served client starts the transport without awaiting connection at top level. The primary socket uses the current page's host, including the Tailscale IP. A localhost fallback exists, but was not evidence of the reported failure. Tests forcibly closing WebSockets still loaded Studio. No HMR configuration was changed.
- **HTML/CSS:** main page CSS was already server-inlined in dev responses. No whole-page author startup hide/reveal gate was found. Author startup did not await `/__author` endpoints, image decoding or videos.
- **External fonts:** HOME has a render-blocking Google Fonts CSS link. This is a possible network dependency, not a demonstrated cause; it does not explain Moments by itself. Fonts and visual design were left unchanged.
- **Browser/network:** normal matrix captured no failed modules, CORS/CSP/mixed-content errors or runtime errors. No service worker registration, author ResizeObserver or host-sensitive mobile startup branch was found in the application search. This does not rule out browser-specific or cached state on the phone.
- **Performance:** object/DOM/manifest counts, resource timing and paint/startup timings were recorded. No measured evidence justified a media/architecture redesign. Device-specific script parse cost, main-thread blocking and memory pressure remain unmeasured; desktop timings must not be presented as phone measurements.

## Startup behavior and fault injection

A dev-author-only inline bootstrap now runs independently of the external editor module. It yields a frame before requesting Studio, records startup stages and browser errors, and catches import/start errors. A small status remains available if the module fails or is still loading after 12 seconds. It hides after success. It never hides the page, waits for media/load/fonts/HMR or removes Studio features.

Injected editor-module failure left the Moments header visible and displayed the failure. Holding the module request for over 12 seconds left the page visible with a loading warning; releasing it let Studio finish. Closing HMR sockets still allowed page and Studio rendering. These checks passed for both origins. An initial concurrent test run timed out waiting for the stall warning; an isolated trace showed it at 12,039ms, and the full rerun passed. No application change was made to conceal the failed run.

## Production and regression results

`npm run build` passed. A recursive text scan of static HTML/JS/CSS/JSON in `dist` found no author bootstrap, author manifest, Local Studio UI, author script URL, `/__author/` routes or write-handler marker. The plugin remains `apply: 'serve'`, enabled only by author mode. Production is still static.

The older `tools/test-home.mjs` failed at its line 59 object-presence assertion: it expects `home-moments` and `home-sketch`, neither of which exists in the current HOME manifest. The test failed before editor interaction. No HOME content was changed to satisfy this outdated expectation. The separate network matrix verified HOME normal/author rendering and no overflow, but the old full HOME visual suite is not claimed as passing.

## Files changed

- `src/components/AuthorStartup.astro`: shared dev-only progressive bootstrap, timing/error diagnostics and graceful startup failure.
- `src/components/MediaRoom.astro`: use the shared bootstrap after the author manifest.
- `src/pages/moments.astro`: same bootstrap wiring; gallery visuals and architecture unchanged.
- `src/scripts/local-author.ts`: explicit startup export; HTTP-compatible random media IDs.
- `tools/test-author-network.mjs`: read-only origin/render/fault/security/production regression.
- `LOCAL-STUDIO.md`: Tailscale diagnostics and test instructions.
- `AUTHOR-NETWORK-DIAGNOSIS.md`: this evidence/limitations report.

No commit, push or deploy was performed. The original server command and security middleware are unchanged.

## Remaining real-phone validation

Open both author URLs on the phone. If loading stops, tap the startup status and capture its contents and the phone browser Network/Console log. Then test native gallery multi-select, SAVE and refresh on Moments. A status stuck before module loading, an import failure, a long module request and initialization failure now produce distinct evidence. A failure before the HTML/bootstrap arrives still requires browser/network capture. The exact intermittent blank-screen cause cannot honestly be closed until that affected-device evidence exists.