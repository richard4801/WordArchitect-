/**
 * Full-page dashboard background.
 *
 * This layer is `absolute` (not fixed), so it scrolls *with* the page — the
 * sharp hero face and the hero text move together as you scroll, rather than
 * the content sliding over a pinned image.
 *
 * Two image layers of the oracle hero:
 *   1. Ambient — the image covering the whole page, heavily blurred, darkened
 *      and desaturated so away-from-hero areas settle to the #1B140F canvas
 *      with only faint texture (the "image stretched to the bottom").
 *   2. Sharp hero — the face near natural scale, anchored TOP-RIGHT so the
 *      astrolabe eye reads crisply, radial-faded into the ambient.
 *
 * Plus legibility washes and a restrained warm glow. Colours are theme tokens.
 */
export function PageBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-50 overflow-hidden"
    >
      {/* 1. Ambient blurred + darkened + desaturated image — fills the page */}
      <div
        className="absolute inset-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: "var(--hero)",
          backgroundPosition: "50% 28%",
          filter:
            "blur(56px) brightness(var(--hero-lower-bright)) saturate(0.55)",
          transform: "scale(1.15)",
        }}
      />

      {/* 2. Sharp face, anchored top-right, radial-faded into the ambient */}
      <div
        className="absolute right-0 top-0 h-[72vh] w-[58%] bg-cover bg-no-repeat"
        style={{
          backgroundImage: "var(--hero)",
          backgroundPosition: "center 66%",
          filter: "contrast(1.05) saturate(1.02) brightness(1.06)",
          maskImage:
            "radial-gradient(125% 115% at 60% 26%, #000 50%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(125% 115% at 60% 26%, #000 50%, transparent 85%)",
        }}
      />

      {/* Horizontal wash: darken the left so hero text stays legible */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(var(--wash-rgb),0.97) 0%, rgba(var(--wash-rgb),0.76) 30%, rgba(var(--wash-rgb),0.14) 60%, rgba(var(--wash-rgb),0) 100%)",
        }}
      />

      {/* Vertical wash: clear at the top, settle to the flat canvas below */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(var(--wash-rgb),0) 0, rgba(var(--wash-rgb),0) 24vh, rgba(var(--wash-rgb),0.74) 52vh, rgba(var(--wash-rgb),0.95) 82vh)",
        }}
      />

      {/* Restrained warm glow near the face */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(85% 52% at 78% 2%, rgba(150,105,55,0.12), transparent 52%)",
          mixBlendMode: "soft-light",
        }}
      />
    </div>
  );
}
