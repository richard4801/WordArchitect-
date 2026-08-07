/**
 * Full-bleed hero background — a landscape "eye reflecting a distant castle"
 * piece, generated wide (16:9-ish) specifically so it covers the page at any
 * viewport ratio via background-size: cover, with no cropping into either
 * the eye or the castle. `fixed` (not `absolute`) so cover sizes against the
 * viewport itself rather than the page's full scroll height — otherwise a
 * tall dashboard would stretch the crop unpredictably. Light and dark are
 * matched compositions, so one position works for both and the eye never
 * moves on theme toggle. No mask, no wash, no fade, no shadow — the artwork
 * on its own.
 */
export function PageBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-50 bg-no-repeat"
      style={{
        backgroundImage: "var(--hero)",
        backgroundPosition: "var(--hero-pos)",
        backgroundSize: "var(--hero-size)",
      }}
    />
  );
}
