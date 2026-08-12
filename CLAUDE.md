# CLAUDE.md — WordArchitect

Guidance for any agent (or human) working in this repo. Read this first, then
`DESIGN_SYSTEM.md` for the visual spec. Keep this file up to date as the app
grows — it is the handover document.

---

## 1. What this is

**WordArchitect** is a production web app: an AI-assisted studio for novelists
(projects, characters, worldbuilding, outlines, writing, with AI at the
writer's side). Tagline: **"Write. Craft. Conquer."**

- **Product name is WordArchitect** (the repo name). The design references a
  NOVELCRAFTER-style mockup for *visual direction only* — never put
  "NovelCrafter" in the product.
- Live on Vercel: **word-architect-three.vercel.app** (auto-deploys on every
  push to the working branch).
- Current state: **Dashboard, Projects, New Project, the project detail
  page's Overview tab, and five full workspaces — Writing (the manuscript
  editor), Outliner, Characters, Worldbuilding, and Notes — are built and
  polished.** Still stubbed with `<ComingSoon>`: the project detail page's
  Analytics and Settings tabs, and the top-level Timeline/AI
  Assistant/Templates/Goals/Help nav destinations. Every one of the five
  built workspaces follows the same shape: a top-level nav item at, e.g.,
  `/characters` that has no page of its own — it just redirects to the
  most-recently-active project's real workspace at `/projects/[id]/characters`
  (see §4's "full-bleed workspace" note and `lib/*-store.ts` pattern below).
  When the next mockup arrives for one of the still-stubbed destinations,
  build it the same way: a project-scoped full-bleed route + a top-level
  redirect page, not a tab inside `(tabs)/`.
- **Every mock data domain (Projects, Characters, Worldbuilding, Notes)
  follows one reactive-store pattern** — see the `lib/*-store.ts` files
  under §4. This is the seam a real backend integration will replace: each
  store's public hook signatures (`useProjects()`, `useCharacters()`,
  `createProject()`, etc.) are what every page already depends on, so
  swapping the store's internals for real `fetch` calls against an API
  should not require touching the UI components themselves, only the
  store files plus whatever loading/error states get added.
- **The oracle-face hero background is dashboard-only.** It does not appear on
  Projects or any other page — confirmed explicitly against the Projects
  mockup. See §4/§5 (`(app)/layout.tsx` gates `<PageBackground />` on
  `pathname === "/"`).
- **The Dashboard has two variants**, switched purely on whether the live
  project store is empty (`useProjects().length === 0`) — no separate
  auth/onboarding flag: a **New User** dashboard (onboarding: feature
  callouts, "Let's Get You Started", "How WordArchitect Helps You Write
  Better", Suggested for You, Tip of the Day) and a **Returning User**
  dashboard (quick actions row, Continue Writing + Today's Progress,
  weekly stats row, AI Insights / Recent Activity / Writing Goal, Your
  Projects). Both live in `(app)/page.tsx`. To preview the New User state
  locally: temporarily empty `projects-data.ts`'s `projects` array, rebuild,
  screenshot, then revert — there's no UI toggle for it (matches the "resets
  the whole store" nature of every other mock-data flow in this app).
- **Pasted chat images never reach the filesystem** — only visual access, no
  file. When a mockup/asset is shared that way, ask the user to save it into
  the repo (they can upload directly via the GitHub web UI onto the working
  branch — see the `resources/dashboard-mockup.png` / `dark.png` / `light.png`
  history for the pattern) rather than guessing from memory. This cost real
  rework once already on the Dashboard redesign — don't repeat it.

## 2. Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js **16.2.11**, App Router, Turbopack, React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS **v4** (`@theme inline`, `@custom-variant`, `@layer utilities`, CSS-variable tokens — **no `tailwind.config.js`**; config lives in `globals.css`) |
| Theming | `next-themes`, class-based `.dark` / `.light` on `<html>`, `defaultTheme="dark"` |
| Icons | `lucide-react` |
| Fonts | Self-hosted via `next/font/local` (see §6) |
| AI | Provider-agnostic abstraction, Anthropic/Claude default (`@anthropic-ai/sdk`) |

## 3. Commands

```bash
npm run dev      # local dev server (next dev)
npm run build    # production build — ALWAYS run this to verify changes compile
npm run start    # serve the production build
npm run lint     # eslint
```

There is **no test suite**. Verification is: `npm run build` passes + visual
check via screenshots (see §8).

## 4. Directory map

```
src/
  app/
    layout.tsx           # root: loads fonts, ThemeProvider, <html> classes
    globals.css          # design tokens + Tailwind v4 config + utilities  ← the design system lives here
    (app)/               # authenticated app shell (route group) — "use client"
                         #   (needs usePathname to gate the hero + full-bleed workspaces)
      layout.tsx         # Sidebar + <header> (search w/ ⌘K, bell, mail, theme,
                         #   avatar) + <main> for standard pages. For full-bleed
                         #   workspaces (isFullBleedWorkspace regex below) it
                         #   instead renders Sidebar + a bare padded column —
                         #   the workspace's own page builds its own top bar.
                         #   Renders <PageBackground /> ONLY when pathname === "/".
      page.tsx           # DASHBOARD (built). Switches New User vs Returning User
                         #   on useProjects().length (or ?newUser=1, a QA-only
                         #   override that force-shows the empty state without
                         #   touching real project-store data — needs a
                         #   Suspense boundary around its useSearchParams()) —
                         #   see §1. Every widget on both variants is
                         #   documented below by whether it's LIVE (reads
                         #   through project-store, so it's already correct
                         #   once Projects has a real backend) or MOCK-ONLY
                         #   (a hardcoded number in dashboard-data.ts with no
                         #   real backend equivalent yet — these are the ones
                         #   that need a new API resource, not just Projects
                         #   made real).
                         #
                         #   Returning User variant (has ≥1 project):
                         #     - Quick Actions row — 6 real links (Write/New
                         #       Project/Character/World Entry/Outline/Ask AI),
                         #       no data.
                         #     - Continue Writing — LIVE only in that its two
                         #       buttons link to a real project id; the title/
                         #       chapter/word-count shown are MOCK-ONLY
                         #       (dashboard-data.ts's `continueWriting`,
                         #       hardcoded to shadows-of-elarion, not derived
                         #       from whichever project was actually last
                         #       edited).
                         #     - Today's Progress — MOCK-ONLY throughout: the
                         #       word-count ring, the MiniCalendar's active-day
                         #       dots (see ui/mini-calendar.tsx below), and the
                         #       streak counter are all `todaysProgress` in
                         #       dashboard-data.ts. "View Calendar" links to
                         #       /timeline, itself still a stub.
                         #     - Weekly Stats row (5 tiles) — MIXED: "Projects"
                         #       count and the "Characters"/"World Entries"
                         #       totals ARE live, computed in-component from
                         #       `projects.reduce(...)` over each project's
                         #       `povCharacters`/`worldEntries` fields (see
                         #       projects-data.ts). "Words Written (This
                         #       Week)" and "Writing Time (This Week)" —
                         #       including their trend %s and the sparkline —
                         #       are MOCK-ONLY (`weeklyStats`); there's no
                         #       real writing-session/time-tracking data
                         #       anywhere yet.
                         #     - AI Insights — MOCK-ONLY, a fixed 3-item list
                         #       (`aiInsights`) with real link hrefs into
                         #       shadows-of-elarion specifically. No actual AI
                         #       analysis runs to produce these.
                         #     - Recent Activity — MOCK-ONLY, a fixed 5-item
                         #       feed (`activity`); nothing in the app
                         #       currently appends to it when a real action
                         #       happens (creating a character, editing a
                         #       chapter, etc. don't log activity today).
                         #     - Writing Goal — MOCK-ONLY (`writingGoal`);
                         #       "Edit" button is a decorative no-op.
                         #     - Your Projects grid — LIVE, `projects.filter(
                         #       status === "active").slice(0, 5)` + a New
                         #       Project card.
                         #
                         #   New User variant (0 projects):
                         #     - "Let's Get You Started" — 4 cards. Only
                         #       "Create Your First Project" is a real action:
                         #       it calls project-store's createProject()
                         #       directly (no form) and navigates straight
                         #       in. The other 3 (World/Character/Outline) are
                         #       just links to their top-level redirect pages.
                         #     - "How WordArchitect Helps You Write Better",
                         #       "Tip of the Day" — fully static, decorative.
                         #     - "Suggested for You" — "Explore Templates"
                         #       links to /templates (a stub); "Set Your Goal"
                         #       is a decorative no-op button next to a Ring
                         #       hardcoded to 0/500.
      projects/page.tsx  # PROJECTS (built). Search/filter/sort/tabs/pagination
                         #   over the shared mock dataset + a stats right-rail.
      projects/new/page.tsx  # NEW PROJECT (built). Multi-section form (incl.
                         #   Target Word Count); on submit, calls project-store's
                         #   createProject() and redirects to the fake-created
                         #   project's own page.
      projects/[id]/(tabs)/layout.tsx  # PROJECT DETAIL shared chrome (built):
                         #   back link, title/status/meta, Write Now, the 8-tab
                         #   nav (Overview/Chapters/Characters/World/Outlines/
                         #   Notes/Analytics/Settings — tab hrefs point at the
                         #   real routes below, most of which now live OUTSIDE
                         #   this (tabs) group), and the right rail (cover,
                         #   details incl. inline-editable Target Words, stats,
                         #   quick actions).
      projects/[id]/(tabs)/page.tsx  # Overview tab (built): description,
                         #   manuscript progress ring, recent chapters, activity.
      projects/[id]/(tabs)/{analytics,settings}/page.tsx  # still stubs → <ComingSoon>
      projects/[id]/chapters/page.tsx      # WRITING — the manuscript editor
                         #   (built, full-bleed). Three columns: manuscript
                         #   outline, a real contentEditable prose body with
                         #   working formatting commands, and a Comments/
                         #   Versions/Outline/AI panel. Focus Mode (Normal/
                         #   Typewriter/Zen/Typewriter×Zen) hides the global
                         #   Sidebar via ui-store's setFocusModeActive(). The
                         #   center column is `@container`-queried (Tailwind v4
                         #   native container queries) so its toolbar/status-bar
                         #   chrome degrades by ACTUAL available width, not
                         #   viewport width — see the dropdown-select.tsx note
                         #   below (components/ui/) for the same-shaped bug in
                         #   a different component, and why viewport-based
                         #   breakpoints/positioning broke in both places.
      projects/[id]/outlines/page.tsx      # OUTLINER (built, full-bleed).
                         #   Pannable/zoomable endless board (drag to pan,
                         #   scroll/pinch to zoom), a beat detail panel that
                         #   overlays the board (not push-layout), multiple
                         #   outline modes (Three Act/Hero's Journey/Save the
                         #   Cat shown; others decorative). No reactive store —
                         #   reads straight from lib/outline-data.ts.
      projects/[id]/characters/_shared.tsx # CharactersTopBar (breadcrumb +
                         #   search/bell/theme) + ROLE_META + RoleBadge, shared
                         #   by all 3 Characters pages below.
      projects/[id]/characters/page.tsx    # CHARACTERS list+detail (built,
                         #   full-bleed). Left rail = character list; right =
                         #   selected character's full profile across 6 tabs
                         #   (Profile has the mockup's big-portrait+dl-grid
                         #   header; Background/Personality/Relationships/
                         #   Notes/Timeline share a leaner header + a portrait+
                         #   At-a-Glance right rail instead). Relationships tab
                         #   is a real radial graph (SVG, up to 6 nodes,
                         #   position presets per node-count, colored by a
                         #   closed RelationshipBond union) with a legend and a
                         #   live-computed summary. Accepts ?c=<id> to deep-link
                         #   (needs a Suspense boundary around useSearchParams).
      projects/[id]/characters/all/page.tsx    # ALL CHARACTERS grid (built) —
                         #   stats strip, role tabs, grid/compact view toggle,
                         #   pagination.
      projects/[id]/characters/new/page.tsx    # + NEW CHARACTER form (built) —
                         #   multi-section form incl. a Quick Traits chip
                         #   editor and a live "At a Glance" preview; submits
                         #   via character-store's createCharacter().
      projects/[id]/world/_shared.tsx      # WorldTopBar (breadcrumb + search/
                         #   bell/theme), shared by both Worldbuilding pages.
      projects/[id]/world/page.tsx         # WORLDBUILDING hub (built,
                         #   full-bleed). World Overview, a hand-authored SVG
                         #   world map (region labels/mountains/forest/river/
                         #   compass rose — no real map image), a Categories
                         #   grid (8 categories), a live-sorted Recent Entries
                         #   table, plus a right rail (Timeline Overview, a
                         #   real multi-segment SVG donut for World Stats,
                         #   Quick Actions, Pinned Items). Category tabs/cards
                         #   filter the entries table.
      projects/[id]/world/new-category/page.tsx  # CREATE NEW CATEGORY form
                         #   (built) — name/description/parent, a searchable
                         #   64-icon library with tag filters, 8 color
                         #   swatches, cover-image upload, a live preview;
                         #   submits via worldbuilding-store's
                         #   createWorldCategory().
      projects/[id]/notes/page.tsx         # NOTES hub (built, full-bleed).
                         #   The ONE workspace whose mockup header has no
                         #   project breadcrumb — just 3 icon buttons — so it
                         #   does NOT use a _shared.tsx top-bar component like
                         #   the other three; it builds its own minimal header
                         #   inline. All Notes/Pinned/My Notes/Shared tabs, a
                         #   Note Folders rail (functional filters), Pinned/
                         #   Recent Notes rails (both computed live, not
                         #   hardcoded), a functional Quick Notes composer, and
                         #   a lightweight New Note modal (no dedicated
                         #   creation-form mockup existed for this one, unlike
                         #   Characters/Categories).
      writing|outlines|characters|worldbuilding|notes/page.tsx (top level)
                         # each is a REDIRECT, not a real page: finds the
                         #   most-recently-active project (lowest
                         #   updatedRank) via useProjects() and
                         #   router.replace()s to that project's real
                         #   workspace above, with a "No projects yet" +
                         #   New Project fallback. This is what every sidebar
                         #   nav item / dashboard quick action actually points
                         #   at — see sidebar.tsx's FULL_BLEED_WORKSPACES below
                         #   for why the sidebar has to special-case these.
      assistant|goals|analytics|settings|timeline|templates|help/page.tsx
                         # top-level stubs → <ComingSoon> (goals/analytics
                         #   exist but aren't in the sidebar nav — see nav.ts)
    api/ai/route.ts      # POST endpoint that calls the AI provider
  components/
    page-background.tsx  # full-bleed hero image + washes + the stat shadow (dashboard only)
    sidebar.tsx          # fixed left nav (NAV_ITEMS) + secondary utility nav
                         #   (UTILITY_NAV_ITEMS: Settings, Help & Feedback) +
                         #   profile panel that also switches new/returning-user
                         #   (XP bar vs "New Writer" + Upgrade button); ornate
                         #   astrolabe artwork background (public/sidebar-bg.webp),
                         #   pinned to the dark palette via a scoped `.dark` class
                         #   regardless of app theme. FULL_BLEED_WORKSPACES is a
                         #   {pattern, href} table (chapters→/writing,
                         #   outlines→/outlines, characters→/characters,
                         #   world→/worldbuilding, notes→/notes) that forces
                         #   the conceptually-correct top-level nav item active
                         #   when on a full-bleed workspace page — without it,
                         #   the plain `pathname.startsWith(item.href)` check
                         #   would light up "Projects" instead, since every one
                         #   of those routes starts with /projects/[id]/...
    theme-provider.tsx   # next-themes wrapper
    theme-toggle.tsx     # sun/moon button (.btn-raised chip)
    brand-mark.tsx       # BrandMark (compass-star, used as the small logo mark
                         #   above the sidebar wordmark) + Sparkle + Sigil SVGs
    coming-soon.tsx      # placeholder for unbuilt pages
    ui/
      cover-art.tsx      # deterministic SVG "book cover" placeholders (seeded)
      character-portrait.tsx  # deterministic SVG backlit-bust silhouette
                         #   (seeded per character id) — moody portrait
                         #   placeholder, same "generated art" approach as
                         #   cover-art.tsx.
      world-map-art.tsx  # hand-authored (not seeded) SVG fantasy map for the
                         #   Worldbuilding hub's "World Map" card.
      note-cover-art.tsx # deterministic SVG cover art for note cards, 6 scene
                         #   variants (landscape/portrait/map/book/starfield/
                         #   crystal) keyed to the note's category.
      dropdown-select.tsx  # DropdownSelect + MultiSelectDropdown. The option
                         #   panel is rendered via a React portal into
                         #   document.body with `position: fixed`, computed
                         #   from the trigger's live bounding rect — NOT a
                         #   normal absolutely-positioned child. Reason: `.card`/
                         #   `.card-2` set `z-index: 0` on `position: relative`
                         #   to layer their own inner glow, which also opens a
                         #   new CSS stacking context — a panel positioned
                         #   inside one card could never paint above a LATER
                         #   sibling card no matter its own z-index, since
                         #   stacking contexts are compared to each other in
                         #   DOM order. Don't revert this to a plain absolute
                         #   child; the portal is the fix, not a workaround.
      progress.tsx       # animated progress bar (shimmer)
      ring.tsx           # animated circular progress (comet highlight); sublabel
                         #   is ReactNode so callers control its typography
      sparkline.tsx      # tiny inline SVG trend line (weekly-stats tiles)
      mini-calendar.tsx  # month-grid activity calendar (Today's Progress widget);
                         #   takes an explicit day list, no real Date math, so it
                         #   renders identically on server/client
      section-heading.tsx
  lib/
    nav.ts               # NAV_ITEMS (main sidebar list) + UTILITY_NAV_ITEMS
                         #   (Settings, Help & Feedback)
    dashboard-data.ts    # dashboard-only mock data — user, continueWriting,
                         #   todaysProgress, weeklyStats, writingGoal,
                         #   aiInsights, activity — all MOCK-ONLY, see the
                         #   Dashboard's LIVE-vs-MOCK-ONLY breakdown above.
                         #   Its own file comment already flags this as a
                         #   placeholder "until the data layer ... and auth
                         #   are wired up." No reactive store of its own —
                         #   nothing on the dashboard creates/edits these
                         #   values today, so there was nothing to make
                         #   reactive yet. Also re-exports projects/Project
                         #   from projects-data.ts so the dashboard's "Your
                         #   Projects" grid doesn't need a second import path.
    projects-data.ts + project-store.ts  # PROJECTS domain. projects-data.ts is
                         #   the single source of truth for the Project type
                         #   (logline, chapters/sessions/daysActive, status
                         #   active/completed/archived, active-only stage
                         #   Active/Draft/Outline, detail-page fields incl.
                         #   created/pov/tense/language/deadline/tags/
                         #   povCharacters/worldEntries) plus the 12-project
                         #   mock list, achievements, and derive helpers.
                         #   project-store.ts is the reactive
                         #   useSyncExternalStore wrapper: useProjects(),
                         #   createProject(), updateProjectTarget(id, target).
                         #   Every project list reads through useProjects(),
                         #   never a static import — same rule for every
                         #   domain below.
    character-data.ts + character-store.ts  # CHARACTERS domain. character-
                         #   data.ts: Character type (physical description,
                         #   personality traits, motivations, arc, background
                         #   paragraphs, lifeEvents, culturalBackground,
                         #   strengths/weaknesses, internalConflict, notes,
                         #   relationships), a closed RelationshipBond union
                         #   (Family/Ally/Friend/Mentor/Colleague/Rival/
                         #   Romantic), and the 16-character mock roster (only
                         #   Kaelen Duskryn — the default-selected protagonist,
                         #   swapped in for the mockup's Lyriana Veyra for
                         #   continuity with the rest of the app — and Lyriana
                         #   herself carry full depth). character-store.ts:
                         #   useCharacters(), useCharacter(id),
                         #   createCharacter().
    worldbuilding-data.ts + worldbuilding-store.ts  # WORLDBUILDING domain.
                         #   worldbuilding-data.ts: WorldCategoryMeta (8 fixed
                         #   categories: Places/Nations/Cultures/History/Magic/
                         #   Factions/Religion/Items & Artifacts, each with an
                         #   icon + color), WorldEntry (31 seeded entries,
                         #   updatedHours is the sort-authoritative field —
                         #   recentEntries() sorts by it live, "updated X ago"
                         #   strings are derived via formatAgo(), never
                         #   stored), WORLD_TIMELINE, WORLD_OVERVIEW,
                         #   PINNED_WORLD_ITEMS. worldbuilding-store.ts:
                         #   useWorldCategories(), createWorldCategory() (lets
                         #   the New Category form fake-create a category that
                         #   actually shows up in the grid/tabs/stats).
    notes-data.ts + notes-store.ts  # NOTES domain. notes-data.ts: NoteCategory
                         #   (6 fixed categories, each with a color),
                         #   NOTE_CATEGORY_META, Note type (dateRank is the
                         #   sort-authoritative field, 1 = newest; "date" is a
                         #   display string, not derived — unlike Worldbuilding's
                         #   updatedHours/formatAgo, dates here were assigned
                         #   directly since they needed to read as real
                         #   calendar dates, e.g. "May 23, 2026"), the 24-note
                         #   mock list, pinnedNotes()/recentNotes() (both
                         #   live-computed, capped-and-sorted, not hardcoded
                         #   lists), folderCount()/notesInFolder() (folders map
                         #   onto categories: Research/Inspirations/Ideas ↔
                         #   Research/Inspiration/Plot categories). notes-
                         #   store.ts: useNotes(), togglePinned(id),
                         #   createNote().
    outline-data.ts       # OUTLINER's static mock data — no reactive store;
                         #   the Outliner board doesn't currently support
                         #   creating new beats/structures.
    manuscript-data.ts    # WRITING (chapters editor)'s static mock data —
                         #   manuscript structure, chapter bodies, comment
                         #   threads, active collaborators. No reactive store.
    ui-store.ts           # cross-cutting UI state that isn't any one domain's:
                         #   sidebar collapsed/expanded (persisted to
                         #   localStorage, hydrated client-side post-mount) and
                         #   focus-mode-active (set by the chapters editor,
                         #   read by (app)/layout.tsx to hide the global
                         #   Sidebar during Focus Mode).
    ai/
      types.ts           # AiProvider contract (vendor-agnostic)
      index.ts           # provider registry + getAiProvider()
      providers/anthropic.ts
  fonts/                 # self-hosted .woff2 (Cormorant Garamond, Jost, Cinzel)
public/
  hero-dark.png hero-light.png   # the hero artwork actually used at runtime (dashboard only)
  sidebar-bg.webp        # ornate astrolabe/constellation sidebar background
resources/
  dark.png light.png     # SOURCE hero art — portrait "eye reflecting a distant
                         #   castle" composition (1024x1536), pinned top-right
                         #   via --hero-size/--hero-pos so the face bleeds off
                         #   the top/right edge and the castle shows lower-left
                         #   as the image continues down (see §5)
  sidebar-bg.webp        # SOURCE sidebar artwork (same file as public/, kept for record)
  design-system.png      # the official colour-system reference image
  dashboard-mockup.png   # the Dashboard reference mockup (New User + Returning
                         #   User panels side by side) — measure against this
                         #   file directly (crop + grid-overlay with PIL) rather
                         #   than eyeballing a chat screenshot; that's how the
                         #   structural deltas in the Oct 2026 redesign pass
                         #   were actually found (quick-actions tile width,
                         #   Continue Writing's two-column layout, icon badge
                         #   styles, etc.)
  writing-mockup.png                              # WRITING (chapters editor)
  Outliner Three Act.png, Outliner Save The Cat.png,
    Outliner Hero's Journey .png                  # OUTLINER (3 of its modes)
  Characters.png, All Characters.png,
    + New Character.png                           # CHARACTERS (3 screens)
  Character tabs.png     # composite of 5 stacked screenshots — Background/
                         #   Personality/Relationships/Notes/Timeline tabs —
                         #   used to rebuild those 5 detail-panel tabs after
                         #   the initial Characters build shipped with generic
                         #   placeholder content in them.
  Worldbuilding.png, Create New Category (Worldbuilding).png  # WORLDBUILDING (2 screens)
  Notes.png               # NOTES (1 screen)
  README.md
DESIGN_SYSTEM.md         # full visual spec (colours, fonts, materials)
```

## 5. Design system — the essentials

`DESIGN_SYSTEM.md` has the full spec. The **authoritative source is
`src/app/globals.css`** (all tokens are CSS variables under `:root/.light` and
`.dark`). Highlights and hard-won rules:

- **Palette is near-neutral near-black in dark mode** (canvas `#0a0a0b`), *not
  brown*. Warmth lives only in the gold accents (`--gold #d4af7a`) and the hero
  image. Light mode canvas is off-white `#faf8f5`. If it ever looks "brown,"
  it's wrong.
- **Fonts (three):**
  - **Cormorant Garamond** — headings (`.font-display`, `--font-cormorant`); a refined old-style Garamond matching the mockup (replaced Playfair, whose dramatic Didone did not match).
  - **Jost** — all body/UI text (`--font-jost`, wired to `--font-sans` and
    `body`). Chosen because a geometric-elegant sans complements the elegant
    serif headings; a neutral grotesk (Inter/Poppins) read as generic and was
    rejected.
  - **Cinzel** — big display **numbers only** (`.font-num`: hero stats, ring
    %). Playfair-style serif numerals "dance" (oldstyle 6/9); Cinzel's are calm and
    upright.
- **Cards are a "carved material"** (obsidian / smoked walnut / aged bronze),
  never flat or frosted: vertical gradient, bronze-glow border, inner
  highlight, outer + engraved-inner shadow, subtle grain, hover lift, plus a
  tighter `--card-pop-shadow` layer (echoing the header chips' raised depth,
  but opaque — cards never go translucent) for a bit more pop against the
  page. See `.card` / `.card-2` in `globals.css`.
- **Header icon chips** (`.btn-raised`) are **translucent** (semi-opaque fill +
  `backdrop-filter: blur`), not solid discs — the one place in the design
  system that *is* translucent; cards echo its raised-depth look but stay
  fully opaque.
- **Hero image** (`page-background.tsx`): the source art (`resources/dark.png` /
  `light.png`, copied to `public/hero-*.png`) is a **landscape** (1672×941,
  ~16:9) "eye reflecting a distant castle" composition, generated wide
  specifically so it can cover the page at any viewport ratio — the eye sits
  at roughly **75%/30%** of the frame, the castle spans the left two-thirds.
  - Light & dark are **matched compositions**, so one `--hero-pos` serves
    both and the eye never moves on theme toggle.
  - `--hero-size: cover`, `--hero-pos: 75% 30%` (the position doubles as the
    focal point cover crops around on any axis that overflows — keeps the
    eye in frame across reasonable desktop aspect ratios; an unrealistically
    tall/narrow viewport can still crop it out, but this is a desktop-only
    app, sidebar included, so that's an acceptable edge case).
  - `PageBackground`'s root is `absolute inset-x-0 top-0` with an explicit
    `h-[100vh]` band, not `fixed` — the user wants the hero to scroll away
    with the page like a normal banner rather than stay pinned to the
    viewport. `cover` still needs a sane fixed box to size against (a tall
    dashboard under an unbounded height would scale/crop unpredictably),
    hence the explicit `100vh` cap rather than letting the band stretch to
    the page's full scroll height.
  - Because `absolute` + a capped height means the band has a real endpoint
    partway down the page, its bottom is masked into a fade
    (`mask-image`/`WebkitMaskImage`, `linear-gradient(to bottom, #000 0%,
    #000 78%, transparent 98%)`) so the termination isn't a visible hard
    edge. This is a deliberate, narrow exception to the "no overlay" rule
    below — explicitly requested by the user for this specific scroll
    behavior, alpha-only (no color/wash), applied to the image alone.
  - Otherwise, **no CSS overlay beyond that bottom fade** — no wash, no
    shadow, no other `mask-image`. This was explicit, repeated user
    direction from an earlier (portrait, 46%-width) version of this art: any
    color wash read as "dimming," and a full-image `mask-image` feather
    still read as "a card blocking the art." With `cover` there's no
    boundary to feather on the top/sides anyway — the image always fills the
    container completely — so only the bottom (where the band now
    necessarily ends under `absolute`) gets a fade.
  - Small circular hero-crops elsewhere (header avatar, sidebar profile photo)
    use `background-position: "75% 27%"` on `var(--hero)` to center on the eye.
  - If the source art changes again: regenerate it **wide** (16:9 or wider —
    a portrait image fighting a landscape page is what caused most of the
    back-and-forth that led here), re-measure the eye's coordinates as
    fractions of the new image's width/height (crop with PIL, draw a
    coordinate grid, read pixel positions — far faster than eyeballing), and
    update `--hero-pos` and the two `75% 27%` avatar crops to match. Don't
    reintroduce a percentage-width `--hero-size` or any mask/wash beyond the
    bottom fade already in place — `cover` + a focal-point position is the
    settled approach.
- **The hero background is dashboard-only** — every other page has a plain
  canvas background, no oracle face. `(app)/layout.tsx` is a client component
  (`usePathname`) that renders `<PageBackground />` only when
  `pathname === "/"`. Don't move `<PageBackground />` back to being
  unconditional in the shared layout.
- **The sidebar is a fixed dark ornate panel, independent of the app theme.**
  Its background is `public/sidebar-bg.webp` (an astrolabe/constellation
  artwork sized to the sidebar's proportions, stretched `100%/100%` so its
  corner flourishes always land on the sidebar's actual corners) plus a flat
  ~45% black overlay to darken it further. Because that art is dark and
  gold-inked, the `<aside>` also carries a literal `className="dark"` — this
  re-applies every `.dark { --var: ... }` declaration from `globals.css`
  scoped to that subtree only, so nav text/borders/the profile card stay
  legible on the art *even when the rest of the app is in light mode* (a
  persistent-dark-rail pattern, like Notion/Linear). Don't try to theme the
  sidebar via the normal light/dark variables — it intentionally ignores them.

## 6. Fonts / the proxy gotcha (IMPORTANT)

**Google Fonts is blocked by the network proxy** — `next/font/google` fails the
build. All fonts are therefore **self-hosted**:

1. `npm install --no-save @fontsource/<font>`
2. copy the needed `.woff2` weights from `node_modules/@fontsource/<font>/files/`
   into `src/fonts/`
3. register with `next/font/local` in `src/app/layout.tsx` (exposes a
   `--font-*` CSS variable)
4. reference the variable in `globals.css`.

Current: Cormorant Garamond (500/600, normal+italic), Jost (400/500/600),
Cinzel (500/600).

## 7. AI provider abstraction

App code never imports a vendor SDK directly — it depends on the `AiProvider`
contract in `src/lib/ai/types.ts`.

- `getAiProvider(id?)` (`src/lib/ai/index.ts`) resolves a provider from the
  `registry`, defaulting to `AI_PROVIDER` env or `"anthropic"`.
- Add a provider: implement `AiProvider`, register it in `registry`. Nothing
  else changes.
- `src/app/api/ai/route.ts` is the server entry point.
- Env: `AI_PROVIDER` (default `anthropic`), `AI_MODEL` (default
  `claude-opus-5`), `ANTHROPIC_API_KEY`. See `.env.example`. Default to the
  latest/most capable Claude models.

## 8. Visual verification workflow (how this app was built)

Every visual change was verified with headless-Chromium screenshots. Reusable
recipe:

- Chromium binary: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
  (Playwright is pre-installed; **never** run `playwright install`). Use
  `playwright-core`.
- Build, then serve the production build, then screenshot. Toggle theme in the
  page via `localStorage.setItem("theme", ...)` + set the `.dark`/`.light` class
  on `<html>`.
- **Dev-server gotchas (bit us repeatedly):**
  - Kill stale servers before starting (`pkill -9 -f next`); zombies serve stale
    assets and produce unstyled/incorrect screenshots. Use a fresh port each
    time.
  - Prefer launching the server as a **background task** (it needs to stay
    foregrounded to keep the port bound) rather than shell `&` backgrounding.
  - Files added to `public/` after `next start` ARE served (static), but a
    **cross-origin** `@font-face` load (blank page → localhost) is **CORS-blocked**
    — run font tests **on the app's own origin** (`page.goto(appUrl)` then
    inject), or fonts silently fall back to serif.
- **Always screenshot after a visual change and actually look** before saying
  it's done — the user repeatedly (rightly) caught edges/seams the screenshots
  showed.

## 9. Deployment

- Vercel is connected to the repo; **every push to the working branch
  auto-deploys** to word-architect-three.vercel.app.
- No special build config (`next.config.ts` is empty). Standard Next build.

## 10. Git / workflow conventions

- Work on branch **`claude/production-repo-prep-js0ilc`** (the designated
  feature branch). Create from latest default branch if needed. Never push to
  another branch without explicit permission.
- Commit author must be `Claude <noreply@anthropic.com>` or GitHub marks
  commits "Unverified". If needed:
  `git config user.email noreply@anthropic.com && git config user.name Claude`,
  then `git commit --amend --no-edit --reset-author` (or rebase `--exec`).
- Commit message footer used in this repo:
  ```
  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Fea2oCfRToCiqneAD3PPtr
  ```
- **Push == deploy.** The user reviews screenshots before pushing. Pattern used
  all session: commit locally, show screenshots, push only on approval.
- Do **not** put the raw model identifier in commits/PRs/code — chat only.

## 11. Working style the user expects

- Match the mockup precisely; sweat the subtle details (seams, edges, spacing,
  font pairing). Show a screenshot and self-check before declaring done.
- When a design choice is open (a font, a treatment), audition a few options
  against the real context and recommend one — don't ship the generic default.
