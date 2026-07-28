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
      {/* Landscape hero, pinned to the top and spanning the full width. Because
          the art is scaled below full width, a soft radial mask centred on the
          face feathers the left/top/bottom edges into transparency so the image
          dissolves into the canvas instead of showing a hard rectangle. */}
      <div
        className="absolute inset-x-0 top-0 h-[74vh] bg-no-repeat"
        style={{
          backgroundImage: "var(--hero)",
          backgroundPosition: "var(--hero-pos)",
          backgroundSize: "var(--hero-size)",
          maskImage:
            "radial-gradient(120% 135% at 80% 42%, #000 50%, rgba(0,0,0,0.4) 76%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(120% 135% at 80% 42%, #000 50%, rgba(0,0,0,0.4) 76%, transparent 100%)",
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
