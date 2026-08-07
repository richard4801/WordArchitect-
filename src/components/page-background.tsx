/**
 * Hero background — a landscape "eye reflecting a distant castle" piece,
 * generated wide (16:9-ish) so background-size: cover fills its band with
 * no cropping into either the eye or the castle. Positioned `absolute` at
 * the top of the page (not `fixed`) so it scrolls away with the content
 * like a normal banner, rather than staying pinned to the viewport.
 *
 * The band has an explicit height (`h-[100vh]`) rather than stretching to
 * the page's full scroll height — `cover` needs a sane, fixed box to size
 * against, or a tall dashboard would scale/crop the image unpredictably.
 * Since the band necessarily ends somewhere, its bottom is masked into a
 * fade so that termination isn't a visible hard edge; the fade is on the
 * image alone (no separate wash/overlay layer, no color, just alpha).
 *
 * Light and dark are matched compositions, so one position works for both
 * and the eye never moves on theme toggle.
 */
export function PageBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-50 h-[100vh] overflow-hidden"
      style={{ backgroundColor: "var(--canvas)" }}
    >
      <div
        className="absolute inset-0 bg-no-repeat"
        style={{
          backgroundImage: "var(--hero)",
          backgroundPosition: "var(--hero-pos)",
          backgroundSize: "var(--hero-size)",
          maskImage: "linear-gradient(to bottom, #000 0%, #000 78%, transparent 98%)",
          WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 78%, transparent 98%)",
        }}
      />
    </div>
  );
}
