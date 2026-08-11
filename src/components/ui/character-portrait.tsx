/**
 * Deterministic atmospheric placeholder character portrait, inline SVG —
 * same philosophy as ui/cover-art.tsx (moody, painterly-abstract, seeded so
 * each character gets a consistent look), but a cloaked-bust silhouette
 * lit from behind instead of a landscape, since faking a photorealistic
 * face abstractly reads as uncanny rather than atmospheric. Stands in
 * until real portraits are supplied.
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

function mulberry(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function CharacterPortrait({
  seed,
  className,
}: {
  seed: string;
  className?: string;
}) {
  const h = hash(seed);
  const rng = mulberry(h);
  const accent = ACCENTS[h % ACCENTS.length];
  const id = `cp${h.toString(36)}`;

  const shoulderWidth = 190 + rng() * 40;
  const headR = 52 + rng() * 8;
  const headCx = 150;
  const headCy = 172;
  const shoulderTop = headCy + headR * 0.75;
  const litFromLeft = rng() > 0.5;

  const stars = Array.from({ length: 14 }, () => ({
    x: rng() * 300,
    y: rng() * 130,
    r: 0.4 + rng() * 0.9,
    o: 0.2 + rng() * 0.4,
  }));

  return (
    <svg
      viewBox="0 0 300 400"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label="Character portrait"
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#100c16" />
          <stop offset="0.5" stopColor="#0d0b12" />
          <stop offset="1" stopColor="#050408" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={accent} stopOpacity="0.6" />
          <stop offset="0.45" stopColor={accent} stopOpacity="0.2" />
          <stop offset="1" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id={`${id}-figure`}
          x1={litFromLeft ? "0" : "1"}
          y1="0"
          x2={litFromLeft ? "1" : "0"}
          y2="0"
        >
          <stop offset="0" stopColor="#3a3244" />
          <stop offset="0.4" stopColor="#221d2b" />
          <stop offset="1" stopColor="#0b090f" />
        </linearGradient>
        <radialGradient id={`${id}-vig`} cx="0.5" cy="0.38" r="0.78">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.6" />
        </radialGradient>
      </defs>

      <rect width="300" height="400" fill={`url(#${id}-sky)`} />

      {stars.map((s, i) => (
        <circle key={i} cx={s.x.toFixed(1)} cy={s.y.toFixed(1)} r={s.r.toFixed(2)} fill="#f4ecdd" opacity={s.o.toFixed(2)} />
      ))}

      {/* Backlight glow centered behind the head */}
      <circle cx={headCx} cy={headCy - 10} r="150" fill={`url(#${id}-glow)`} />

      {/* Cloaked bust silhouette, shoulders into a rounded head */}
      <path
        d={`M${150 - shoulderWidth / 2},400
            C${150 - shoulderWidth / 2},${shoulderTop + 40} ${150 - shoulderWidth * 0.3},${shoulderTop} 150,${shoulderTop}
            C${150 + shoulderWidth * 0.3},${shoulderTop} ${150 + shoulderWidth / 2},${shoulderTop + 40} ${150 + shoulderWidth / 2},400
            Z`}
        fill={`url(#${id}-figure)`}
      />
      <circle cx={headCx} cy={headCy} r={headR} fill={`url(#${id}-figure)`} />

      <rect width="300" height="400" fill={`url(#${id}-vig)`} />
    </svg>
  );
}
