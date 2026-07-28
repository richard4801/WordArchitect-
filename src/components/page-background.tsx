/**
 * Full-width landscape hero background.
 *
 * The art is a single 16:9 crop with the oracle face composed on the right and
 * open, near-canvas-toned space on the left — so the "Welcome back" text sits
 * over quiet space and the face falls to the right on its own. Light and dark
 * are matched crops, so one cover/position serves both and nothing moves when
 * the theme is toggled. The image occupies the top band of the page and melts
 * into the flat canvas below (where the cards sit) via a bottom fade; a soft
 * left-side wash keeps the hero text legible.
 */
export function PageBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-50 overflow-hidden"
      style={{ backgroundColor: "var(--canvas)" }}
    >
      {/* Landscape hero, scaled below full width and pinned to the right. It
          BLEEDS off the top edge (position runs the art past the top) so there
          is no canvas strip above it to mismatch — the head fills to the top of
          the page with no seam and no black cover-up. Two intersecting masks
          feather only the LEFT and BOTTOM edges into the canvas; the top and
          right bleed off-screen. */}
      <div
        className="absolute inset-x-0 top-0 h-[74vh] bg-no-repeat"
        style={{
          backgroundImage: "var(--hero)",
          backgroundPosition: "var(--hero-pos)",
          backgroundSize: "var(--hero-size)",
          maskImage:
            "linear-gradient(to right, transparent 16%, #000 42%), linear-gradient(to bottom, #000 0%, #000 74%, transparent 96%)",
          maskComposite: "intersect",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 16%, #000 42%), linear-gradient(to bottom, #000 0%, #000 74%, transparent 96%)",
          WebkitMaskComposite: "source-in",
        }}
      />

      {/* Left wash: settle the text area toward canvas so the welcome copy stays
          legible over the quiet side of the image */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, var(--canvas) 0%, rgba(var(--wash-rgb),0.55) 18%, rgba(var(--wash-rgb),0) 44%)",
        }}
      />

      {/* Bottom fade: dissolve the hero into flat canvas beneath the cards */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0, transparent 34vh, rgba(var(--wash-rgb),0.6) 52vh, var(--canvas) 70vh)",
        }}
      />
    </div>
  );
}
