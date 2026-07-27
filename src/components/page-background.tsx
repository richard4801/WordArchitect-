/**
 * Full-page dashboard background.
 *
 * A single sharp image of the oracle face, anchored upper-right, that
 * dissolves *seamlessly* into the dark canvas on every side via a large, soft
 * radial mask — no second image layer and no hard edge, so it reads as the
 * page's own backdrop rather than a pasted-in element. The layer is `absolute`
 * so it scrolls with the page (hero text and image move together). Two gentle
 * washes keep the hero text legible and settle the lower page to flat canvas.
 *
 * Positioning is per-theme (`--hero-pos`) so the light and dark crops frame
 * the eye in the same place.
 */
export function PageBackground() {
  const mask =
    "radial-gradient(63% 58% at 55% 45%, #000 28%, rgba(0,0,0,0.35) 60%, transparent 84%)";
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-50 overflow-hidden"
      style={{ backgroundColor: "var(--canvas)" }}
    >
      {/* Sharp face, dissolving into the canvas on all sides */}
      <div
        className="absolute right-0 top-0 h-[94vh] w-[64%] bg-cover bg-no-repeat"
        style={{
          backgroundImage: "var(--hero)",
          backgroundPosition: "var(--hero-pos)",
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
      />

      {/* Left wash: darken the left so hero text stays legible */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, var(--canvas) 0%, rgba(var(--wash-rgb),0.7) 22%, rgba(var(--wash-rgb),0) 50%)",
        }}
      />

      {/* Bottom fade: settle the lower page to flat canvas under the cards */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0, transparent 40vh, rgba(var(--wash-rgb),0.55) 60vh, var(--canvas) 80vh)",
        }}
      />
    </div>
  );
}
