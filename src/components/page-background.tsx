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
      {/* Landscape hero, pinned to the top and spanning the full width. The art
          is scaled below full width, so it has real edges inside the viewport.
          Two intersecting gradient masks (horizontal × vertical) feather every
          exposed edge — left, top and bottom — to transparent *before* the
          image's real boundary, so it dissolves into the canvas with no hard
          line or top cut-off. The right edge bleeds off-screen. */}
      <div
        className="absolute inset-x-0 top-0 h-[74vh] bg-no-repeat"
        style={{
          backgroundImage: "var(--hero)",
          backgroundPosition: "var(--hero-pos)",
          backgroundSize: "var(--hero-size)",
          maskImage:
            "linear-gradient(to right, transparent 16%, #000 42%), linear-gradient(to bottom, transparent 0%, #000 12%, #000 74%, transparent 96%)",
          maskComposite: "intersect",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 16%, #000 42%), linear-gradient(to bottom, transparent 0%, #000 12%, #000 74%, transparent 96%)",
          WebkitMaskComposite: "source-in",
        }}
      />

      {/* Top fade: paint the page's canvas over the image's upper edge and
          dissolve it down before the face. The mask only feathers *opacity*,
          which still blends the image's lighter-than-canvas backdrop into a
          faint haze near the top; this tones the top to the exact canvas colour
          so the hero laps seamlessly into the page under the header. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, var(--canvas) 0%, rgba(var(--wash-rgb),0.85) 7%, rgba(var(--wash-rgb),0) 26%)",
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
