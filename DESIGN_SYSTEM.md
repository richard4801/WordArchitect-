# WordArchitect — Design System

The single source of truth for colour, type, surfaces, and material. The
canonical reference image lives at `resources/design-system.png`. These tokens
are implemented as CSS variables in `src/app/globals.css` (light under
`:root`/`.light`, dark under `.dark`) and exposed as Tailwind utilities
(`bg-surface`, `text-ink`, `text-gold`, `border-line`, `text-danger`, …).

> Philosophy: **warm, immersive, focused.** Deep tones and warm accents create
> a world-like experience. Every surface should feel like a physical object —
> polished obsidian, smoked walnut, aged bronze — never a flat CSS rectangle.

## Typography

| Role     | Font              | Notes                                             |
| -------- | ----------------- | ------------------------------------------------- |
| Headings | **Cormorant Garamond** | Page titles, section headings, large display text (refined old-style Garamond, matches the mockup) |
| Body/UI  | **Jost**          | Body, labels, buttons, captions, navigation (geometric-elegant sans) |
| Numbers  | **Cinzel**        | Big display numerals only (hero stats, ring %) — calm upright figures |

Fonts are self-hosted under `src/fonts/` (loaded via `next/font/local`) — no
external requests (Google Fonts is proxy-blocked). Utilities: `.font-display`
applies Cormorant Garamond, `.font-num` applies Cinzel; body defaults to Jost.

## Primary colours

| Name         | Hex       | Usage                                             |
| ------------ | --------- | ------------------------------------------------- |
| Primary Brown| `#8B5E34` | Primary brand colour; accents, important actions  |
| Primary Gold | `#D4AF7A` | Warm gold accent; highlights, icons, premium bits |
| Deep Brown   | `#1B140F` | Main dark background — surfaces, sidebars, cards   |
| Paper Beige  | `#F5F1EC` | Light background for cards/panels in light mode    |

## Neutral scale

| Name        | Hex       | Usage                                       |
| ----------- | --------- | ------------------------------------------- |
| Charcoal    | `#2A221B` | Secondary backgrounds, elevated surfaces    |
| Medium Brown| `#3A3026` | Borders, dividers, subtle separations       |
| Taupe       | `#6E645B` | Muted text, placeholders, icons             |
| Light Taupe | `#A09487` | Disabled text, inactive elements, subtle UI |
| Off White   | `#FAF8F5` | Light-mode background / page canvas         |
| White       | `#FFFFFF` | Surfaces, high-contrast UI                  |

## Semantic colours

| Name    | Hex       | Usage                                    |
| ------- | --------- | ---------------------------------------- |
| Success | `#3FA46A` | Success states, completed actions        |
| Warning | `#E0A94F` | Warnings, alerts, caution (Medium prio.) |
| Error   | `#E06A6A` | Errors, destructive actions (High prio.) |
| Info    | `#6CA8E6` | Informational messages, highlights       |
| Purple  | `#8868D6` | Genre tags, creative accents, variety     |

> In light mode, Warning/Error/Info/Purple are darkened slightly for contrast
> against the pale canvas (see `globals.css`).

## Surfaces

**Dark mode**

| Token            | Hex       |
| ---------------- | --------- |
| Background       | `#1B140F` |
| Elevated Surface | `#241C16` |
| Card Background  | `#2A221B` |
| Border / Divider | `#3A3026` |

**Light mode**

| Token            | Hex       |
| ---------------- | --------- |
| Page Background  | `#FAF8F5` |
| Card Background  | `#FFFFFF` |
| Border / Divider | `#E8E2D9` |
| Muted Surface    | `#F5F1EC` |

## Gradients

- **Primary Gradient** — warm gold (`#D4AF7A` family). Highlights, premium
  badges, subtle accents.
- **Dark Gradient** — deep brown. Overlays, depth, hero backgrounds.

## Buttons & accents

- **Primary button** — filled Primary Brown/gold gradient, light text.
- **Secondary button** — gold outline, gold text.
- **Text link** — gold with a trailing arrow.

## Tags & labels (genre)

Rounded pills. Examples: Epic Fantasy (neutral), Dark Fantasy (dark), Sci-Fi
(Info blue), Historical (Warning gold), Romance (Purple). "+ Add Tag" = dashed
outline.

## Material — carved surfaces

Cards are not flat rectangles. Implemented via the `.card` utility:

- **Base**: vertical gradient, warmer/brighter at top → deeper at bottom
  (dark: `#211A14` → `#18140F`).
- **Texture**: barely-there fractal-noise grain (2–5% dark, ~2.5% light),
  soft-light blend — organic stone/marble, no repeating pattern.
- **Lighting**: soft warm glow from the upper-left; faint ambient bronze glow
  `rgba(212,174,122,0.04–0.06)`.
- **Edges**: 20px radius; 1px inner highlight `rgba(255,255,255,0.03)`; soft
  outer shadow `0 10px 30px rgba(0,0,0,0.35)`; faint engraved inner shadow.
- **Border**: soft bronze glow `rgba(212,174,122,0.10)`, → `0.22` on hover.
- **Hover** (`.card-hover`): lift 3px, brighten, deepen shadow, intensify
  bronze border, 180ms ease-out.

Think luxury writing desk, handcrafted leather journal, antique library,
polished obsidian shelves — a luxury desktop application, not a flat SaaS
dashboard. Avoid frosted glass.
