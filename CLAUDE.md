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
- Current state: **Dashboard and Projects are built and polished**. All other
  nav destinations are stubbed with `<ComingSoon>` and get built out as their
  mockups arrive.
- **The oracle-face hero background is dashboard-only.** It does not appear on
  Projects or any other page — confirmed explicitly against the Projects
  mockup. See §4/§5 (`(app)/layout.tsx` gates `<PageBackground />` on
  `pathname === "/"`).

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
      layout.tsx         # Sidebar + <header> (search/bell/theme) + <main>.
                         #   Renders <PageBackground /> ONLY when pathname === "/".
      page.tsx           # DASHBOARD (built). Hero, stats, 3 featured project cards.
      projects/page.tsx  # PROJECTS (built). Search/filter/sort/tabs/pagination
                         #   over the shared mock dataset + a stats right-rail.
      writing|characters|worldbuilding|outlines|notes|assistant|goals|
        analytics|projects/new|settings/page.tsx   # stubs → <ComingSoon>
    api/ai/route.ts      # POST endpoint that calls the AI provider
  components/
    page-background.tsx  # full-bleed hero image + washes + the stat shadow (dashboard only)
    sidebar.tsx          # fixed left nav + profile panel; ornate astrolabe artwork
                         #   background (public/sidebar-bg.webp), pinned to the dark
                         #   palette via a scoped `.dark` class regardless of app theme
    theme-provider.tsx   # next-themes wrapper
    theme-toggle.tsx     # sun/moon button (.btn-raised chip)
    brand-mark.tsx       # Sparkle + Sigil SVGs (NOTE: the old compass-star logo
                         #   mark was removed from the sidebar; Sparkle/Sigil still used)
    coming-soon.tsx      # placeholder for unbuilt pages
    ui/
      cover-art.tsx      # deterministic SVG "book cover" placeholders (seeded)
      progress.tsx       # animated progress bar (shimmer)
      ring.tsx           # animated circular progress (comet highlight)
      section-heading.tsx
  lib/
    nav.ts               # sidebar nav items (label, href, lucide icon)
    dashboard-data.ts    # dashboard-only mock data (user, headline stats, tasks,
                         #   activity); re-exports projects/Project from projects-data.ts
    projects-data.ts     # SINGLE SOURCE OF TRUTH for project data — the richer
                         #   Project type (logline, chapters/sessions, status
                         #   active/completed/archived, active-only stage
                         #   Active/Draft/Outline), the 12-project mock list,
                         #   achievements, and derive helpers (status counts,
                         #   active-project word stats, top-genre breakdown)
    ai/
      types.ts           # AiProvider contract (vendor-agnostic)
      index.ts           # provider registry + getAiProvider()
      providers/anthropic.ts
  fonts/                 # self-hosted .woff2 (Cormorant Garamond, Jost, Cinzel)
public/
  hero-dark.png hero-light.png   # the hero artwork actually used at runtime (dashboard only)
  sidebar-bg.webp        # ornate astrolabe/constellation sidebar background
resources/
  dark.png light.png     # SOURCE hero art (matched 16:9 landscape crops of the oracle face)
  sidebar-bg.webp        # SOURCE sidebar artwork (same file as public/, kept for record)
  design-system.png      # the official colour-system reference image
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
  `light.png`, copied to `public/hero-*.png`) is a matched 16:9 landscape crop —
  face on the right, quiet space on the left for the welcome text.
  - Light & dark are **matched crops**, so one `--hero-size` / `--hero-pos`
    serves both and the face never moves on theme toggle.
  - Scaled **below** full width (`--hero-size: 72%`, `--hero-pos: right top`) so
    the whole face reads and it bleeds off the top edge (no top seam / no black
    cover-up). Two intersecting masks feather the left & bottom into the canvas;
    top and right bleed off-screen.
- **The stat "shadow"** (the dark pool grounding the hero stats) lives in
  `PageBackground` as a **full-bleed** layer (`--hero-stat-grad`), *not* inside
  the content. This was iterated on heavily. Rules that must hold:
  - Full-bleed so it has **no left/right edge**.
  - A `to bottom` linear gradient that fades in **above** the stats and stays
    dark **from the stats all the way down to the page's end** → **no bottom
    edge** (its origin is never visible; the opaque cards hide it).
  - `vh` stops target the stats' on-screen position (stats sit ≈ 44–50vh at
    1440×900; re-probe if the hero height changes).
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
