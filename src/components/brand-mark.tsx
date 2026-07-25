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
      viewBox="0 0 24 24"
      fill="currentColor"
      role="img"
      aria-label={title}
      className={className}
    >
      <path d="M12 0c.6 4.9 2.5 7.4 6 8.4-3.5.9-5.4 3.5-6 8.4-.6-4.9-2.5-7.5-6-8.4 3.5-1 5.4-3.5 6-8.4Z" />
      <path
        d="M18.5 14.5c.3 2.6 1.3 3.9 3.2 4.4-1.9.5-2.9 1.9-3.2 4.4-.3-2.6-1.3-3.9-3.2-4.4 1.9-.5 2.9-1.8 3.2-4.4Z"
        opacity="0.7"
      />
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
