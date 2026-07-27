/**
 * Deterministic atmospheric placeholder cover art, rendered as inline SVG.
 * Each seed (project id/title) yields a distinct moody "book cover": a dark
 * sky with a faint accent tint, a glowing moon, layered mountain/castle
 * silhouettes, a faint sigil, and grain. Stands in until real cover images
 * are supplied. Fills its container.
 */

const ACCENTS = [
  "#d4af7a", // gold
  "#8868d6", // violet
  "#6ca8e6", // info blue
  "#3fa46a", // green
  "#c0563f", // crimson
  "#b0895a", // bronze
];

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function CoverArt({
  seed,
  className,
}: {
  seed: string;
  className?: string;
}) {
  const h = hash(seed);
  const accent = ACCENTS[h % ACCENTS.length];
  const variant = h % 3;
  const moonX = 120 + (h % 200);
  const id = `cv${h.toString(36)}`;

  // Three silhouette ridge sets for variety
  const ridgeBack =
    variant === 0
      ? "M0,200 L60,150 L120,185 L200,120 L260,170 L340,130 L400,175 L400,250 L0,250 Z"
      : variant === 1
        ? "M0,175 L80,190 L140,140 L210,180 L280,135 L360,185 L400,150 L400,250 L0,250 Z"
        : "M0,185 L70,160 L150,195 L230,150 L300,185 L370,155 L400,180 L400,250 L0,250 Z";
  // Foreground: a jagged castle-ish skyline
  const ridgeFront =
    "M0,235 L40,215 L55,225 L70,205 L78,225 L95,210 L120,230 L150,205 L165,215 L180,200 L195,222 L230,210 L250,228 L285,208 L300,220 L330,205 L360,225 L400,212 L400,250 L0,250 Z";

  return (
    <svg
      viewBox="0 0 400 250"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label="Cover art"
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b0a09" />
          <stop offset="0.55" stopColor="#12100e" />
          <stop offset="1" stopColor={accent} stopOpacity="0.16" />
        </linearGradient>
        <radialGradient id={`${id}-moon`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={accent} stopOpacity="0.9" />
          <stop offset="0.4" stopColor={accent} stopOpacity="0.35" />
          <stop offset="1" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-vig`} cx="0.5" cy="0.35" r="0.8">
          <stop offset="0.5" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
        <filter id={`${id}-grain`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            stitchTiles="stitch"
          />
        </filter>
      </defs>

      <rect width="400" height="250" fill={`url(#${id}-sky)`} />
      {/* moon glow */}
      <circle cx={moonX} cy="72" r="70" fill={`url(#${id}-moon)`} />
      <circle cx={moonX} cy="72" r="20" fill={accent} opacity="0.5" />
      {/* faint sigil watermark */}
      <path
        d="M310 40 l3 14 14 3 -14 3 -3 14 -3 -14 -14 -3 14 -3 z"
        fill={accent}
        opacity="0.18"
      />
      {/* mountains */}
      <path d={ridgeBack} fill="#0a0908" opacity="0.85" />
      <path d={ridgeFront} fill="#050403" />
      {/* grain */}
      <rect
        width="400"
        height="250"
        filter={`url(#${id}-grain)`}
        opacity="0.05"
        style={{ mixBlendMode: "soft-light" }}
      />
      {/* vignette */}
      <rect width="400" height="250" fill={`url(#${id}-vig)`} />
    </svg>
  );
}
