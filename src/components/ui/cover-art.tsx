/**
 * Deterministic atmospheric placeholder cover art, rendered as inline SVG.
 * Each seed (project id / title) yields a distinct, editorial "book cover":
 * a graded night sky, a crisp moon with a soft halo, a scatter of stars, a
 * warm horizon haze, and several layers of misted ridges receding into fog —
 * the kind of moody landscape a literary fantasy cover leans on. Fully
 * self-contained and deterministic; stands in until real covers are supplied.
 */

const ACCENTS = [
  "#d4af7a", // gold
  "#8868d6", // violet
  "#6ca8e6", // info blue
  "#3fa46a", // green
  "#c0563f", // crimson
  "#b0895a", // bronze
];

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

// A tiny deterministic PRNG so each seed gets its own star field / ridge sway.
function mulberry(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build a soft, rolling ridge path across the 400-wide canvas at height `y`. */
function ridge(rng: () => number, baseY: number, amp: number): string {
  const pts: string[] = [`M0,${baseY.toFixed(1)}`];
  const step = 50;
  for (let x = step; x <= 400; x += step) {
    const y = baseY - amp * 0.5 + rng() * amp;
    const cx = x - step / 2;
    pts.push(`Q${cx},${(y - rng() * amp * 0.4).toFixed(1)} ${x},${y.toFixed(1)}`);
  }
  pts.push("L400,250 L0,250 Z");
  return pts.join(" ");
}

export function CoverArt({
  seed,
  className,
}: {
  seed: string;
  className?: string;
}) {
  const h = hash(seed);
  const rng = mulberry(h);
  const accent = ACCENTS[h % ACCENTS.length];
  const moonX = 90 + Math.floor(rng() * 240);
  const moonY = 46 + Math.floor(rng() * 34);
  const id = `cv${h.toString(36)}`;

  // A scatter of stars, denser toward the top of the sky.
  const stars = Array.from({ length: 34 }, () => {
    const x = rng() * 400;
    const y = rng() * 150;
    const r = 0.4 + rng() * 1.1;
    const o = 0.25 + rng() * 0.55;
    return { x, y, r, o };
  });

  // Three receding ridge layers — palest and highest at the back.
  const back = ridge(rng, 150, 26);
  const mid = ridge(rng, 186, 34);
  const front = ridge(rng, 220, 30);

  return (
    <svg
      viewBox="0 0 400 250"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label="Cover art"
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#08070a" />
          <stop offset="0.5" stopColor="#0d0b10" />
          <stop offset="0.82" stopColor={accent} stopOpacity="0.14" />
          <stop offset="1" stopColor={accent} stopOpacity="0.28" />
        </linearGradient>
        <radialGradient id={`${id}-halo`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={accent} stopOpacity="0.55" />
          <stop offset="0.35" stopColor={accent} stopOpacity="0.18" />
          <stop offset="1" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-moon`} cx="0.38" cy="0.36" r="0.7">
          <stop offset="0" stopColor="#fbf6ec" />
          <stop offset="0.7" stopColor="#efe6d4" />
          <stop offset="1" stopColor={accent} />
        </radialGradient>
        <linearGradient id={`${id}-haze`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={accent} stopOpacity="0.34" />
          <stop offset="1" stopColor={accent} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-vig`} cx="0.5" cy="0.42" r="0.75">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.6" />
        </radialGradient>
        <filter id={`${id}-grain`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            stitchTiles="stitch"
          />
        </filter>
      </defs>

      {/* Night sky */}
      <rect width="400" height="250" fill={`url(#${id}-sky)`} />

      {/* Stars */}
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.x.toFixed(1)}
          cy={s.y.toFixed(1)}
          r={s.r.toFixed(2)}
          fill="#f4ecdd"
          opacity={s.o.toFixed(2)}
        />
      ))}

      {/* Moon: soft halo + crisp disc */}
      <circle cx={moonX} cy={moonY} r="58" fill={`url(#${id}-halo)`} />
      <circle cx={moonX} cy={moonY} r="15" fill={`url(#${id}-moon)`} />

      {/* Warm horizon haze sitting behind the ridges */}
      <rect y="150" width="400" height="100" fill={`url(#${id}-haze)`} />

      {/* Receding misted ridges — back (palest) to front (darkest) */}
      <path d={back} fill="#181521" opacity="0.55" />
      <path d={mid} fill="#0f0d15" opacity="0.8" />
      <path d={front} fill="#050406" />

      {/* Grain */}
      <rect
        width="400"
        height="250"
        filter={`url(#${id}-grain)`}
        opacity="0.05"
        style={{ mixBlendMode: "soft-light" }}
      />

      {/* Vignette */}
      <rect width="400" height="250" fill={`url(#${id}-vig)`} />
    </svg>
  );
}
