/**
 * Full-bleed hero background — a portrait "eye reflecting a distant castle"
 * piece, pinned to the top-right corner and bled off the top/right edges so
 * the face reads at the corner and the castle emerges lower-left as the
 * image continues down. Light and dark are matched compositions (same
 * subject, same crop), so one size/position serves both and nothing shifts
 * on theme toggle. No wash/fade/shadow color treatment — the artwork sits
 * plainly on the canvas. The only mask feathers the image's own left/bottom
 * edges into the canvas so its rectangular boundary doesn't read as a seam;
 * it does not resize, crop, or tint the artwork itself.
 */
export function PageBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-50 overflow-hidden"
      style={{ backgroundColor: "var(--canvas)" }}
    >
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
    </div>
  );
}
