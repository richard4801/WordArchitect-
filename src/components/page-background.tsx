/**
 * Full-bleed hero background — a portrait "eye reflecting a distant castle"
 * piece, pinned to the top-right corner and bled off the top/right edges so
 * the face reads at the corner and the castle emerges lower-left as the
 * image continues down. Light and dark are matched compositions (same
 * subject, same crop), so one size/position works for both and nothing
 * shifts on theme toggle. No mask, no wash, no fade, no shadow — the
 * artwork itself, at its own correct size and position, nothing layered
 * on top of or blocking it.
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
        }}
      />
    </div>
  );
}
