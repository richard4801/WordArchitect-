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
- Current state: **Dashboard, Projects, New Project, and the project detail
  page's Overview tab are built and polished**. Every other destination
  (including the detail page's other 7 tabs) is stubbed with `<ComingSoon>`
  and gets built out as its mockup arrives.
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
                         #   (needs usePathname to gate the hero, see below)
      layout.tsx         # Sidebar + <header> (search w/ ⌘K, bell, mail, theme,
                         #   avatar) + <main>. Renders <PageBackground /> ONLY
                         #   when pathname === "/".
      page.tsx           # DASHBOARD (built). Switches New User vs Returning User
                         #   on useProjects().length — see §1.
      projects/page.tsx  # PROJECTS (built). Search/filter/sort/tabs/pagination
                         #   over the shared mock dataset + a stats right-rail.
      projects/new/page.tsx  # NEW PROJECT (built). Multi-section form (incl.
                         #   Target Word Count); on submit, calls project-store's
                         #   createProject() and redirects to the fake-created
                         #   project's own page.
      projects/[id]/layout.tsx  # PROJECT DETAIL shared chrome (built): back link,
                         #   title/status/meta, Write Now, the 8-tab nav, and the
                         #   right rail (cover, details incl. inline-editable
                         #   Target Words, stats, quick actions).
      projects/[id]/page.tsx    # Overview tab (built): description, manuscript
                         #   progress ring, recent chapters, recent activity.
      projects/[id]/{chapters,characters,world,outlines,notes,analytics,settings}/page.tsx
                         # the other 7 tabs — stubs → <ComingSoon>, same as main nav
      writing|characters|worldbuilding|outlines|notes|assistant|goals|
        analytics|settings|timeline|templates|help/page.tsx   # stubs → <ComingSoon>
                         #   (goals/analytics exist but aren't in the sidebar nav —
                         #   see nav.ts)
    api/ai/route.ts      # POST endpoint that calls the AI provider
  components/
    page-background.tsx  # full-bleed hero image + washes + the stat shadow (dashboard only)
    sidebar.tsx          # fixed left nav (NAV_ITEMS) + secondary utility nav
                         #   (UTILITY_NAV_ITEMS: Settings, Help & Feedback) +
                         #   profile panel that also switches new/returning-user
                         #   (XP bar vs "New Writer" + Upgrade button); ornate
                         #   astrolabe artwork background (public/sidebar-bg.webp),
                         #   pinned to the dark palette via a scoped `.dark` class
                         #   regardless of app theme
    theme-provider.tsx   # next-themes wrapper
    theme-toggle.tsx     # sun/moon button (.btn-raised chip)
    brand-mark.tsx       # BrandMark (compass-star, used as the small logo mark
                         #   above the sidebar wordmark) + Sparkle + Sigil SVGs
    coming-soon.tsx      # placeholder for unbuilt pages
    ui/
      cover-art.tsx      # deterministic SVG "book cover" placeholders (seeded)
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
    dashboard-data.ts    # dashboard-only mock data (user, continueWriting,
                         #   todaysProgress, weeklyStats, writingGoal, aiInsights,
                         #   activity); re-exports projects/Project from projects-data.ts
    projects-data.ts     # SINGLE SOURCE OF TRUTH for project data — the richer
                         #   Project type (logline, chapters/sessions/daysActive,
                         #   status active/completed/archived, active-only stage
                         #   Active/Draft/Outline, plus detail-page fields:
                         #   created/pov/tense/language/deadline/tags/
                         #   povCharacters/worldEntries), the 12-project mock
                         #   list, achievements, and derive helpers (status
                         #   counts, active-project word stats, top-genre
                         #   breakdown, deriveRecentChapters/deriveRecentActivity —
                         #   explicit data for shadows-of-elarion, generic
                         #   fallback for every other project)
    project-store.ts     # Reactive wrapper around projects-data's array
                         #   (useSyncExternalStore) so /projects/new can
                         #   fake-create a project (createProject(), which
                         #   accepts a custom targetWords) and have it actually
                         #   show up everywhere (Dashboard, /projects, its own
                         #   /projects/[id] page) — no backend, in-memory only,
                         #   resets on a hard refresh. updateProjectTarget(id,
                         #   target) lets the goal be raised later (used by the
                         #   detail page's inline-editable Target Words row).
                         #   Every project list reads through useProjects()
                         #   from here, not a static import.
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
  highlight, outer + engraved-inner shadow, subtle grain, hover lift. See
  `.card` / `.card-2` in `globals.css`.
- **Header icon chips** (`.btn-raised`) are **translucent** (semi-opaque fill +
  `backdrop-filter: blur`), not solid discs.
- **Hero image** (`page-background.tsx`): the source art (`resources/dark.png` /
  `light.png`, copied to `public/hero-*.png`) is a **portrait** (1024x1536)
  "eye reflecting a distant castle" composition — the eye sits in the upper
  ~68%/25% of the frame, the castle lower-left around 24%/55%.
  - Light & dark are **matched compositions**, so one `--hero-size` /
    `--hero-pos` serves both and the face never moves on theme toggle.
  - `--hero-size: 46%` (width-based; height follows the portrait's own aspect
    ratio) at `--hero-pos: right top`, inside a **`h-[95vh]`** band (taller
    than the old 16:9 mechanism needed, so the castle low in the frame clears
    the bottom fade before it cuts off). Bleeds off the top and right edges;
    two intersecting masks feather only the left and bottom into canvas.
  - Small circular hero-crops elsewhere (header avatar, sidebar profile photo)
    use `background-position: "68% 25%"` on `var(--hero)` to center on the eye.
  - If the source art changes again, re-derive `--hero-size`/`--hero-pos`/the
    band height from the new image's own eye/subject coordinates — don't just
    keep the old numbers. `resources/README.md`-style grid-overlay measurement
    (crop the source with PIL, draw a coordinate grid, read pixel positions)
    is far faster than eyeballing.
- **The stat "shadow"** (the dark pool grounding the quick-actions row) lives
  in `PageBackground` as a **full-bleed** layer (`--hero-stat-grad`), *not*
  inside the content. This was iterated on heavily. Rules that must hold:
  - Full-bleed so it has **no left/right edge**.
  - A `to bottom` linear gradient that fades in **above** the row and stays
    dark **from the row all the way down to the page's end** → **no bottom
    edge** (its origin is never visible; the opaque cards hide it).
  - `vh` stops target the quick-actions row's on-screen position (sits
    ≈ 12–22vh at 1536×1024 with the current, shorter hero-text block;
    re-probe if the hero text or row height changes).
  - Dark mode = real dark pool; light mode = bounded soft halo.
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
