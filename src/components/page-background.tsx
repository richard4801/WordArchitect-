/**
 * Full-bleed hero background — a portrait "eye reflecting a distant castle"
 * piece, stretched to exactly match the viewport (`background-size: 100%
 * 100%`, same technique as `sidebar-bg.webp`) rather than `cover`, which
 * crops/zooms to preserve aspect ratio. No mask, no wash, no fade, no
 * shadow — just the artwork at the page's own size. `fixed` (not
 * `absolute`) so it sizes against the viewport itself rather than the full
 * scroll height of a tall dashboard. Light and dark are matched crops, so
 * one position works for both and nothing shifts on theme toggle.
 */
export function PageBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-50 bg-no-repeat"
      style={{
        backgroundImage: "var(--hero)",
        backgroundPosition: "var(--hero-pos)",
        backgroundSize: "100% 100%",
      }}
    />
  );
}
