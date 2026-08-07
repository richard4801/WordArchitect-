/**
 * Full-bleed hero background — a portrait "eye reflecting a distant castle"
 * piece, covering the entire viewport edge to edge with no crop games, no
 * mask, no wash, no fade, no shadow. `fixed` (not `absolute`) so `cover`
 * sizes against the viewport itself rather than the page's full scroll
 * height — otherwise a tall dashboard would stretch/crop the composition.
 * Light and dark are matched crops, so one position works for both and
 * nothing shifts on theme toggle.
 */
export function PageBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-50 bg-no-repeat"
      style={{
        backgroundImage: "var(--hero)",
        backgroundPosition: "var(--hero-pos)",
        backgroundSize: "cover",
      }}
    />
  );
}
