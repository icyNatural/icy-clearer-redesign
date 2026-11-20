# Moments: circular observatory

The public route remains `/moments.html`. Content and authoring still use
`src/data/media/moments.json`; no photographs or metadata were added or changed.
Local Studio retains its individual frame layout at `/moments.html?edit=1`
when served with `npm run edit`. Production never enables Studio.

## Presentation

`src/scripts/moments-observatory.ts` owns the continuous orbit position,
snapped destination and bounded photo-button window. The geometry projects
an ellipse using sine/cosine; the foreground gains scale and brightness while
the rear arc recedes. Native image aspect controls each frame's dimensions.
At most nine public photo buttons are mounted; Studio's source frames stay
separate and hidden in public mode with no image sources assigned.

Horizontal pointer input drives the orbit directly with bounded release
inertia. Vertical gestures remain native scrolling and pinch zoom is allowed.
Only horizontal-dominant wheel input rotates the collection; ordinary vertical
wheel scrolling is deliberately not intercepted. Controls and arrow keys offer
non-gesture navigation. Reduced motion snaps the orbit and disables viewer
animation. No autoplay or automatic rotation is used.

The existing `displaySrc` WebP previews supply the orbit, with lazy loading for
surrounding photographs. Entering loads only the current original source;
the two neighboring display sources are warmed. Missing metadata is omitted.
The viewer always contains the whole photograph rather than cropping it.

## Navigation state

`src/scripts/moments.ts` owns the native modal dialog, metadata and existing
`#moment=<id>` URLs. Enter pushes one viewer history entry; walking replaces
that entry. Back, Escape and Close return to the orbit at the last viewed
photograph and focus its button without scrolling the page. Selected IDs are
stored in the current history state for reload. Fresh valid deep links get an
Observatory entry beneath them so Back can close the viewer first.

## Final validation

- Focused browser matrix: nine cases passed, including all requested widths,
  5/20/105-item browser-only fixtures and reduced motion. See `results.json`.
- Existing `tools/test-moments.mjs`: passed, including upload, paste/drop,
  crop/fit, metadata, duplicate/delete/undo, independent mobile/desktop frames,
  move/resize, SAVE/reload and public viewer navigation. Original manifests,
  uploads and protected room files were verified restored.
- Existing `tools/test-moments-swipe.mjs`: passed at 360/390/430 and desktop,
  including native touch, gesture rejection, scrolling, wrap, history and focus.
- `tools/test-site-responsive.mjs`: passed across existing public routes.
- Natural model, metadata validation and responsive-layout regressions passed.
- Production build: 27 pages built successfully. Production-preview browser
  smoke passed 360/390/430/1280/1440, including public `?edit=1` isolation,
  enter/arrows/Escape, selection restoration, Photogression URL and no overflow.
- `git diff --check` passed.

Screenshots were visually inspected at mobile and desktop sizes. These checks
use Chromium and touch emulation, not physical phones or Safari/Firefox.
Deployment is not performed by these tests; branch push is reported separately.