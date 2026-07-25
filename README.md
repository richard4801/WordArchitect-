# WordArchitect

**Write. Craft. Conquer.** — a writing studio for novelists. Manage projects,
characters, worldbuilding, and outlines with AI at your side, wrapped in a
cinematic gold-on-espresso interface with a light parchment mode.

This repository is the production web app. The dashboard is the first screen;
more pages are being designed and will drop into the existing shell.

## Tech stack

| Concern      | Choice                                                    |
| ------------ | --------------------------------------------------------- |
| Framework    | Next.js (App Router) + React + TypeScript                 |
| Styling      | Tailwind CSS v4 with a token-based design system          |
| Theming      | `next-themes` — dark (espresso) / light (parchment)       |
| Icons        | `lucide-react`                                            |
| Fonts        | Cormorant Garamond (display serif) + Inter (UI sans)      |
| AI           | Pluggable provider layer, **Claude by default**           |

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
#   then set ANTHROPIC_API_KEY for AI features

# 3. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command         | Description                     |
| --------------- | ------------------------------- |
| `npm run dev`   | Start the dev server            |
| `npm run build` | Production build                |
| `npm run start` | Serve the production build      |
| `npm run lint`  | Lint with ESLint                |

## Project structure

```
src/
  app/
    (app)/            # authenticated app shell (sidebar + top bar)
      page.tsx        # dashboard / home
      <route>/        # placeholder pages await their mockups
    api/ai/route.ts   # example provider-agnostic generation endpoint
    layout.tsx        # fonts + theme provider
    globals.css       # design tokens (light + dark) and utilities
  components/         # sidebar, theme toggle, brand mark, UI primitives
  lib/
    nav.ts            # sidebar navigation config
    dashboard-data.ts # placeholder dashboard data
    ai/               # pluggable AI provider abstraction
resources/            # design reference art (hero images, light + dark)
public/               # hero-light.png / hero-dark.jpg used by the banner
```

## AI provider layer

AI features go through a small provider-agnostic contract (`src/lib/ai`).
Application code depends only on `AiProvider`, never on a vendor SDK, so the
backing model is swappable via configuration:

- `AI_PROVIDER` — selects the provider (default `anthropic`).
- `AI_MODEL` — optional model override (default `claude-opus-5`).
- `ANTHROPIC_API_KEY` — required for the Claude provider.

Example request:

```bash
curl -X POST http://localhost:3000/api/ai \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Suggest three titles for a dark fantasy novel."}'
```

Add a new provider by implementing `AiProvider` and registering it in
`src/lib/ai/index.ts` — no caller changes required.

## Theming

Design tokens live in `src/app/globals.css` as CSS variables under `:root`
(light) and `.dark`. Components use semantic Tailwind utilities
(`bg-surface`, `text-ink`, `text-gold`, `border-line`, …) so both themes stay
in sync automatically.

## Deployment

Standard Next.js deployment. `npm run build` produces the production bundle;
host anywhere that runs Node. Set the environment variables from
`.env.example` in your host's configuration.
