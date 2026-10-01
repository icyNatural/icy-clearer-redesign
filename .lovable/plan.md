# Icy — Two Worlds Redesign

The site stops being one long scroll. The homepage becomes a **portal** to two worlds. Each world has its own shell, nav, and atmosphere. All current Icy Clear pages and routes stay live exactly as they are — only the entry experience and global shell change.

## 1. New Information Architecture

```text
/                          Portal — choose a world
│
├── /clear                 Icy Clear world home (the current homepage, restructured)
│   ├── /clear/start       Start Here (Seeing Before Naming, Replace Stories, Clear Again)
│   ├── /models/*          (unchanged routes)
│   ├── /modes/*           (unchanged routes)
│   ├── /system/*          (unchanged routes)
│   ├── /doctrines/*       (unchanged routes)
│   ├── /categories/*      (unchanged routes)
│   └── Energy Engine      (external link, surfaced as a feature card)
│
└── /natural               Icy Natural world home (coming soon shell)
    └── Interest cards     Basketball, Gaming, Music, Philosophy, Drawing,
                           Clothing, Discovery — all "Soon", non-functional.
                           Thought-seed cards (You Are Not a Statistic,
                           Words Become Environments, etc.) listed but
                           marked "Forming".
```

Existing URLs (`/models/...`, `/modes/...`, `/system/...`, `/doctrines/...`, `/categories/...`) keep working unchanged. The current homepage content moves into `/clear`. `/` becomes the new portal. A small redirect note on `/` ensures bookmarks to the old index still feel intentional, not broken.

## 2. The Portal (`/`)

Full-viewport, no scroll on desktop, one-screen on mobile. Two large panels:

```text
 ┌───────────────────────────┬───────────────────────────┐
 │                           │                           │
 │      ICY CLEAR            │      ICY NATURAL          │
 │      See clearly          │      Become, slowly       │
 │      before you explain.  │      Coming soon.         │
 │                           │                           │
 │      [Enter →]            │      [Preview →]          │
 │                           │                           │
 └───────────────────────────┴───────────────────────────┘
```

- Desktop: split-screen 50/50, hover expands the active half to ~62/38 with a soft parallax glow.
- Mobile: stacked full-height cards, swipe or tap to enter. Safe-area aware.
- Background: animated frosted gradient — Clear leans icy blue/white, Natural leans warm dusk/sand so the two worlds read as distinct atmospheres at a glance.
- A small "Icy" wordmark sits centered between the two panels as the shared identity anchor.
- Reduced-motion: no parallax, no gradient drift, instant panel reveal.

## 3. Icy Clear world (`/clear`)

Same content as today's homepage, but restructured into a **world shell** instead of a marketing scroll:

- Persistent top-left: `← Icy` (returns to portal).
- Persistent bottom nav (mobile) / left rail (desktop ≥ 900px): Home · Start · Models · Modes · System · Energy.
- Sections become discrete views rather than one scroll: tapping Models on the nav scrolls to / swaps in the Models view with a soft cross-fade. URL hash updates (`/clear#models`) so each view is shareable and returnable.
- Energy Engine gets a featured card at the top of `/clear`, styled as a "live app" tile (keeps the existing external link).
- All current card styles, frosted glass, gradients, and reveal animations are preserved verbatim.

## 4. Icy Natural world (`/natural`)

Coming-soon shell that still feels like a *place*, not a 404:

- Hero: "Icy Natural — still forming." One short paragraph about curation and becoming.
- Two zones:
  - **Interests** — 7 non-functional cards with "Soon" badges (Basketball, Gaming, Music, Philosophy, Drawing, Clothing, Discovery).
  - **Seeds** — thought-seed cards listed by title only, marked "Forming": You Are Not a Statistic, Words Become Environments, Questions Are Seeking Devices, Make the Invisible Pattern Visible, Not Viral. Valuable., Curate From Real Inclination.
- Atmosphere shifts: warmer palette, slower motion, softer type weight — same frosted material, different temperature, so the two worlds clearly belong to one system.
- Back to portal in the same top-left slot as Clear.

## 5. Navigation system

- **Portal** (`/`): no nav chrome. Just the two panels and the Icy mark.
- **Inside a world**: persistent shell with `← Icy` (portal), world title, and the world's section nav. Never a hamburger.
- **Cross-world jump**: a single "Switch world" pill in the shell footer, not in the primary nav, so each world feels self-contained.

## 6. Returnable feel (not documentation)

- A rotating "today's cue" line in each world shell (we already have the cue rotator — reuse it, world-scoped).
- A `localStorage` "last visited section" so reopening a world lands you where you left off, with a subtle "Continue where you were" pill instead of auto-jumping.
- No breadcrumbs, no "all posts" index pages, no dates. Pages feel like rooms, not articles.

## 7. Mobile-first specifics

- Portal panels: each 50vh, stacked, tap target ≥ 56px, safe-area padding top and bottom.
- World shell: bottom nav pill (already built) becomes world-aware (Clear shows 5 sections, Natural shows 2: Interests, Seeds).
- All transitions ≤ 240ms, reduced-motion respected everywhere.

## 8. What we keep vs change

Keep, untouched:
- Every existing page under `/models`, `/modes`, `/system`, `/doctrines`, `/categories`.
- `src/styles/mobile.v2.css`, `cards.css`, `model-page.css`.
- Energy Engine external link.
- Frosted glass identity, icy palette, type system.

Change:
- `src/pages/index.astro` becomes the portal.
- New `src/pages/clear.astro` holds today's homepage content (cut-and-paste, no content rewrite).
- New `src/pages/natural.astro` holds the coming-soon world.
- New `src/layouts/WorldLayout.astro` wraps a world with shell + nav.
- New `src/styles/portal.css` and `src/styles/natural.css` for the two new surfaces. `mobile.v2.css` stays the Clear world's stylesheet.

## 9. Build order (small, reversible steps)

1. Create `/clear` as an exact copy of today's homepage. Verify it renders identically.
2. Replace `/` with the portal. Verify both panels link correctly.
3. Add `/natural` with the coming-soon shell and interest/seed cards.
4. Extract the world shell into `WorldLayout.astro`; wire Clear and Natural through it.
5. Add cross-world switcher, "continue where you left off", and world-aware bottom nav.
6. Polish: motion, reduced-motion, safe areas, og:image per world.

Each step is shippable on its own — if any step feels off we stop and adjust before the next.

---

**Decisions I need from you before I start building:**

1. **Portal layout** — split-screen 50/50 (proposed), or a centered "two doors" layout with the Icy mark above and two stacked door-cards below?
2. **Natural's temperature** — warm dusk/sand (proposed, contrasts Clear) or keep it icy and only differentiate through motion and copy?
3. **Old homepage URL** — when someone lands on `/`, should we (a) show the portal always, or (b) remember their last world and offer "Continue to Icy Clear" as the default CTA?

Once you answer those three I'll start at step 1.