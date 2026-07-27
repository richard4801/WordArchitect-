/**
 * Full-bleed dashboard background.
 *
 * Two image layers of the oracle hero:
 *   1. Ambient — the image covering the whole page, heavily blurred and
 *      darkened. This is the "image stretched to the bottom" wash that every
 *      card floats over. Because it's blurred, upscaling softness is fine.
 *   2. Sharp hero — the face shown near its natural size, anchored to the
 *      TOP-RIGHT so the astrolabe eye reads crisply in the hero band, then
 *      radial-faded (top-right → bottom-left) into the ambient layer.
 *
 * Plus legibility washes (dark on the left for the hero text, dark toward the
 * bottom for the cards) and a warm amber glow. All colours are theme tokens,
 * so it adapts to light/dark automatically.
 */
export function PageBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-50 overflow-hidden"
    >
      {/* 1. Ambient blurred + darkened image — fills the whole page */}
      <div
        className="absolute inset-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: "var(--hero)",
          backgroundPosition: "50% 28%",
          filter: "blur(52px) brightness(var(--hero-lower-bright)) saturate(0.9)",
          transform: "scale(1.15)",
        }}
      />

      {/* 2. Sharp face, anchored top-right, radial-faded into the ambient.
          Positioned so the astrolabe eye lands in the upper hero band. */}
      <div
        className="absolute right-0 top-0 h-[72vh] w-[58%] bg-cover bg-no-repeat"
        style={{
          backgroundImage: "var(--hero)",
          backgroundPosition: "center 66%",
          filter: "contrast(1.06) saturate(1.08) brightness(1.08)",
          maskImage:
            "radial-gradient(125% 115% at 60% 26%, #000 52%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(125% 115% at 60% 26%, #000 52%, transparent 85%)",
        }}
      />

      {/* Horizontal wash: darken the left so hero text stays legible */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(var(--wash-rgb),0.97) 0%, rgba(var(--wash-rgb),0.74) 30%, rgba(var(--wash-rgb),0.12) 60%, rgba(var(--wash-rgb),0) 100%)",
        }}
      />

      {/* Vertical wash: keep the top clear, solidify the lower page */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(var(--wash-rgb),0) 0, rgba(var(--wash-rgb),0) 26vh, rgba(var(--wash-rgb),0.7) 58vh, rgba(var(--wash-rgb),0.92) 100%)",
        }}
      />

      {/* Warm amber glow near the face */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(95% 60% at 76% 3%, rgba(150,100,50,0.22), transparent 55%)",
          mixBlendMode: "soft-light",
        }}
      />
    </div>
  );
}
