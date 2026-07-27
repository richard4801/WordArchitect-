/**
 * The WordArchitect four-pointed star mark (the ✦ sparkle motif from the
 * design). Rendered as inline SVG so it inherits `currentColor` and scales
 * cleanly. Used as the logo and as decorative flourishes.
 */
export function BrandMark({
  className,
  title = "WordArchitect",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="currentColor"
      role="img"
      aria-label={title}
      className={className}
    >
      {/* Ornate compass-star cluster: a tall concave four-point star with four
          small diamonds set in the diagonal notches. */}
      <path d="M24 2 Q27 21 42 24 Q27 27 24 46 Q21 27 6 24 Q21 21 24 2 Z" />
      <path
        d="M35 12 L38 15 L35 18 L32 15 Z M35 30 L38 33 L35 36 L32 33 Z M13 30 L16 33 L13 36 L10 33 Z M13 12 L16 15 L13 18 L10 15 Z"
        opacity="0.75"
      />
      <circle cx="24" cy="24" r="1.5" opacity="0.9" />
    </svg>
  );
}

/** Small decorative sparkle used beside headings. */
export function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 2c.5 4 2 6 6 6.9-4 .9-5.5 2.9-6 6.9-.5-4-2-6-6-6.9 4-.9 5.5-2.9 6-6.9Z" />
    </svg>
  );
}

/**
 * Ornate compass sigil in a diamond frame — the emblem beside the carved
 * quote in the footer. Thin gold strokes, alchemical/astrolabe feel.
 */
export function Sigil({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden
      className={className}
    >
      <rect
        x="6.5"
        y="6.5"
        width="35"
        height="35"
        rx="2"
        transform="rotate(45 24 24)"
        opacity="0.6"
      />
      <circle cx="24" cy="24" r="9.5" opacity="0.5" />
      {/* four-point compass star */}
      <path
        d="M24 8 L26.5 21.5 L40 24 L26.5 26.5 L24 40 L21.5 26.5 L8 24 L21.5 21.5 Z"
        fill="currentColor"
        stroke="none"
        opacity="0.9"
      />
      {/* diagonal minor points */}
      <path
        d="M24 13 L25 23 L35 24 L25 25 L24 35 L23 25 L13 24 L23 23 Z"
        fill="currentColor"
        stroke="none"
        opacity="0.35"
        transform="rotate(45 24 24)"
      />
    </svg>
  );
}
