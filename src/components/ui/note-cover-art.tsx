import type { NoteScene } from "@/lib/notes-data";

/**
 * Deterministic SVG cover art for note cards (matches resources/Notes.png's
 * atmospheric photo-style covers) — same "generated art, no real photos"
 * approach as CoverArt/CharacterPortrait, keyed to a scene type per note
 * category (landscape/portrait/map/book/starfield/crystal) with a seeded
 * hash driving small per-note variation within that scene.
 */

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function NoteCoverArt({ seed, scene, className }: { seed: string; scene: NoteScene; className?: string }) {
  const h = hash(seed);
  const id = `nc${h.toString(36)}`;

  if (scene === "landscape") {
    const glowX = 100 + (h % 100);
    return (
      <svg viewBox="0 0 300 225" className={className} preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a2a3a" />
            <stop offset="60%" stopColor="#1b1a24" />
            <stop offset="100%" stopColor="#0e0d12" />
          </linearGradient>
          <radialGradient id={`${id}-glow`} cx="50%" cy="30%" r="45%">
            <stop offset="0%" stopColor="#d4af7a" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#d4af7a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="300" height="225" fill={`url(#${id}-sky)`} />
        <circle cx={glowX} cy="65" r="70" fill={`url(#${id}-glow)`} />
        <circle cx={glowX} cy="62" r="16" fill="#f0e6c8" opacity="0.8" />
        <path d="M 0 190 L 40 120 L 80 170 L 130 90 L 170 160 L 220 100 L 260 150 L 300 130 L 300 225 L 0 225 Z" fill="#1a1a26" />
        <path d="M 0 210 L 60 160 L 120 195 L 190 150 L 260 190 L 300 175 L 300 225 L 0 225 Z" fill="#100f16" />
      </svg>
    );
  }

  if (scene === "portrait") {
    const litFromLeft = h % 2 === 0;
    return (
      <svg viewBox="0 0 300 225" className={className} preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#221f2a" />
            <stop offset="100%" stopColor="#0d0c11" />
          </linearGradient>
          <linearGradient id={`${id}-fig`} x1={litFromLeft ? "0" : "1"} y1="0" x2={litFromLeft ? "1" : "0"} y2="0">
            <stop offset="0%" stopColor="#3a3244" />
            <stop offset="55%" stopColor="#221d2b" />
            <stop offset="100%" stopColor="#0b090f" />
          </linearGradient>
        </defs>
        <rect width="300" height="225" fill={`url(#${id}-bg)`} />
        <circle cx="150" cy="60" r="85" fill="#d4af7a" opacity="0.12" />
        <path d="M 90 225 Q 90 140 150 130 Q 210 140 210 225 Z" fill={`url(#${id}-fig)`} />
        <circle cx="150" cy="95" r="38" fill={`url(#${id}-fig)`} />
      </svg>
    );
  }

  if (scene === "map") {
    return (
      <svg viewBox="0 0 300 225" className={className} preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`${id}-parch`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4a3d24" />
            <stop offset="100%" stopColor="#2a2113" />
          </linearGradient>
        </defs>
        <rect width="300" height="225" fill={`url(#${id}-parch)`} />
        {Array.from({ length: 5 }).map((_, i) => {
          const x1 = 30 + ((h + i * 47) % 240);
          const y1 = 20 + ((h + i * 61) % 180);
          const x2 = 30 + ((h + i * 83) % 240);
          const y2 = 20 + ((h + i * 97) % 180);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#d4af7a" strokeOpacity="0.5" strokeWidth="1.5" />;
        })}
        {Array.from({ length: 5 }).map((_, i) => {
          const x = 30 + ((h + i * 47) % 240);
          const y = 20 + ((h + i * 61) % 180);
          return <circle key={i} cx={x} cy={y} r="4" fill="#c0473a" opacity="0.7" />;
        })}
      </svg>
    );
  }

  if (scene === "book") {
    return (
      <svg viewBox="0 0 300 225" className={className} preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2e2416" />
            <stop offset="100%" stopColor="#150f09" />
          </linearGradient>
        </defs>
        <rect width="300" height="225" fill={`url(#${id}-bg)`} />
        <path d="M 60 175 L 150 155 L 240 175 L 240 190 L 150 170 L 60 190 Z" fill="#c9a76a" opacity="0.9" />
        <path d="M 65 178 L 150 160 L 150 168 L 65 186 Z" fill="#e8d9b0" opacity="0.5" />
        <path d="M 235 178 L 150 160 L 150 168 L 235 186 Z" fill="#e8d9b0" opacity="0.4" />
        {Array.from({ length: 6 }).map((_, i) => (
          <line key={i} x1={80 + i * 12} y1={168 - i} x2={80 + i * 12} y2={178 - i} stroke="#7a6540" strokeWidth="1" opacity="0.6" />
        ))}
      </svg>
    );
  }

  if (scene === "starfield") {
    return (
      <svg viewBox="0 0 300 225" className={className} preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#181a2e" />
            <stop offset="100%" stopColor="#0a0b16" />
          </linearGradient>
        </defs>
        <rect width="300" height="225" fill={`url(#${id}-bg)`} />
        <path d="M 0 200 L 90 120 L 180 190 L 300 130 L 300 225 L 0 225 Z" fill="#0d0e1a" />
        {Array.from({ length: 40 }).map((_, i) => {
          const x = (h + i * 53) % 300;
          const y = (h + i * 37) % 140;
          const r = 0.6 + ((h + i) % 3) * 0.4;
          return <circle key={i} cx={x} cy={y} r={r} fill="#f0ecd8" opacity={0.4 + ((h + i) % 5) * 0.1} />;
        })}
      </svg>
    );
  }

  // crystal
  return (
    <svg viewBox="0 0 300 225" className={className} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c1530" />
          <stop offset="100%" stopColor="#0a0812" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a06cc7" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#a06cc7" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="300" height="225" fill={`url(#${id}-bg)`} />
      <circle cx="150" cy="112" r="70" fill={`url(#${id}-glow)`} />
      <path d="M 150 60 L 175 105 L 150 165 L 125 105 Z" fill="#c9a3e0" opacity="0.85" />
      <path d="M 150 60 L 175 105 L 150 112 Z" fill="#e8d4f5" opacity="0.7" />
    </svg>
  );
}
