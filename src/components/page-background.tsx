/**
 * Full-bleed dashboard background.
 *
 * The oracle hero image sits behind the entire app. The top band shows it
 * sharp (the face / eye lands in the hero area, top-right); below the hero it
 * continues as a blurred, darkened copy so the cards read as floating panels
 * over one continuous image. Two wash gradients keep text legible on the left
 * and deepen the lower page. All colours come from theme tokens, so it adapts
 * to light/dark automatically.
 */
export function PageBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-50 overflow-hidden"
    >
      {/* Sharp hero image — focal point raised so the eye sits in the hero band */}
      <div
        className="absolute inset-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: "var(--hero)",
          backgroundPosition: "50% 42%",
        }}
      />

      {/* Blurred, darkened continuation — masked to appear below the hero band */}
      <div
        className="absolute inset-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: "var(--hero)",
          backgroundPosition: "50% 42%",
          filter: "blur(48px) brightness(var(--hero-lower-bright)) saturate(0.9)",
          transform: "scale(1.12)",
          maskImage:
            "linear-gradient(to bottom, transparent 0, transparent 30vh, #000 60vh)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0, transparent 30vh, #000 60vh)",
        }}
      />

      {/* Horizontal wash: darken the left so hero text stays legible */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(var(--wash-rgb),0.94) 0%, rgba(var(--wash-rgb),0.74) 26%, rgba(var(--wash-rgb),0.18) 58%, rgba(var(--wash-rgb),0.04) 100%)",
        }}
      />

      {/* Vertical wash: keep the top clear, solidify the lower page */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(var(--wash-rgb),0) 0, rgba(var(--wash-rgb),0) 22vh, rgba(var(--wash-rgb),0.72) 56vh, rgba(var(--wash-rgb),0.9) 100%)",
        }}
      />

      {/* Warm amber glow near the face, for the gilded cinematic tone */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(115% 70% at 74% 6%, rgba(150,100,50,0.25), transparent 55%)",
          mixBlendMode: "soft-light",
        }}
      />
    </div>
  );
}
