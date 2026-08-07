/**
 * Full-bleed hero background — a portrait "eye reflecting a distant castle"
 * piece, pinned to the top-right corner and bled off the top/right edges so
 * the face reads at the corner and the castle emerges lower-left as the
 * image continues down. Light and dark are matched compositions (same
 * subject, same crop), so one size/position serves both and nothing shifts
 * on theme toggle. Melts into the flat canvas via a bottom fade; a soft
 * left-side wash keeps the welcome copy legible.
 */
export function PageBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-50 overflow-hidden"
      style={{ backgroundColor: "var(--canvas)" }}
    >
      {/* Portrait hero, pinned top-right, tall enough that the castle low in
          the frame still shows before the bottom fade takes over. BLEEDS off
          the top and right edges (position runs the art past both) so there
          is no seam. Two intersecting masks feather only the LEFT and BOTTOM
          edges into the canvas. */}
      <div
        className="absolute inset-x-0 top-0 h-[95vh] bg-no-repeat"
        style={{
          backgroundImage: "var(--hero)",
          backgroundPosition: "var(--hero-pos)",
          backgroundSize: "var(--hero-size)",
          maskImage:
            "linear-gradient(to right, transparent 30%, #000 62%), linear-gradient(to bottom, #000 0%, #000 60%, transparent 88%)",
          maskComposite: "intersect",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 30%, #000 62%), linear-gradient(to bottom, #000 0%, #000 60%, transparent 88%)",
          WebkitMaskComposite: "source-in",
        }}
      />

      {/* Left wash: settle the text area toward canvas so the welcome copy stays
          legible over the quiet side of the image */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, var(--canvas) 0%, rgba(var(--wash-rgb),0.55) 30%, rgba(var(--wash-rgb),0) 58%)",
        }}
      />

      {/* Bottom fade: dissolve the hero into flat canvas beneath the cards */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0, transparent 26vh, rgba(var(--wash-rgb),0.6) 42vh, var(--canvas) 58vh)",
        }}
      />

      {/* Stat shadow: a full-bleed vertical darkening that grounds the quick
          actions row. It stays dark from there down to the page's end — so
          its origin/bottom edge is never visible — and fades up into the
          hero. Full-bleed means no side edge; the opaque cards hide it below. */}
      <div
        className="absolute inset-0"
        style={{ background: "var(--hero-stat-grad)" }}
      />
    </div>
  );
}
