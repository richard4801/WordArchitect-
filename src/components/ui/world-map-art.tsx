/**
 * Stylized fantasy-map placeholder for the Worldbuilding hub (matches
 * resources/Worldbuilding.png's "World Map" card) — hand-authored SVG
 * terrain + labels + compass rose, same "no real photos, generated art
 * instead" approach as CoverArt/CharacterPortrait, just not seeded (this
 * is project-specific lore, not a per-item deterministic placeholder).
 */
export function WorldMapArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 760 420" className={className} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="wm-sea" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0d1f2b" />
          <stop offset="100%" stopColor="#122a38" />
        </linearGradient>
        <linearGradient id="wm-land" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a3221" />
          <stop offset="100%" stopColor="#221d14" />
        </linearGradient>
        <linearGradient id="wm-forest" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2c3a26" />
          <stop offset="100%" stopColor="#1a2417" />
        </linearGradient>
      </defs>

      <rect width="760" height="420" fill="url(#wm-sea)" />

      {/* Main landmass */}
      <path
        d="M 90 120 Q 40 180 70 250 Q 60 320 140 360 Q 240 400 340 370 Q 420 390 520 360 Q 620 340 660 270 Q 700 210 640 150 Q 600 90 500 100 Q 430 60 340 90 Q 260 60 180 90 Q 120 80 90 120 Z"
        fill="url(#wm-land)"
        stroke="#d4af7a"
        strokeOpacity="0.35"
        strokeWidth="2"
      />

      {/* Blackspire Forest patch (right side) */}
      <path
        d="M 420 130 Q 480 110 540 140 Q 590 160 580 220 Q 560 270 490 260 Q 430 250 410 200 Q 400 160 420 130 Z"
        fill="url(#wm-forest)"
        stroke="#3fa46a"
        strokeOpacity="0.3"
        strokeWidth="1.5"
      />
      {Array.from({ length: 34 }).map((_, i) => {
        const x = 415 + ((i * 37) % 170);
        const y = 130 + (((i * 53) % 120) + (i % 3) * 4);
        return <circle key={i} cx={x} cy={y} r={2.4} fill="#3fa46a" opacity={0.5} />;
      })}

      {/* Frostmarch mountains (top-left) */}
      {[
        [110, 150], [140, 130], [170, 155], [200, 125], [230, 150],
      ].map(([x, y], i) => (
        <path
          key={i}
          d={`M ${x - 18} ${y + 22} L ${x} ${y - 14} L ${x + 18} ${y + 22} Z`}
          fill="#5a5a66"
          stroke="#c8c8d8"
          strokeOpacity="0.4"
          strokeWidth="1"
        />
      ))}

      {/* Great Wastes texture (bottom-right, cracked/scorched dots) */}
      {Array.from({ length: 22 }).map((_, i) => {
        const x = 470 + ((i * 41) % 160);
        const y = 300 + ((i * 29) % 60);
        return <circle key={i} cx={x} cy={y} r={1.6} fill="#c0473a" opacity={0.35} />;
      })}

      {/* Rivers */}
      <path
        d="M 200 150 Q 220 220 190 280 Q 170 320 210 360"
        fill="none"
        stroke="#4f86c6"
        strokeOpacity="0.45"
        strokeWidth="2.5"
      />

      {/* Region labels */}
      <text x="165" y="112" fontFamily="serif" fontSize="15" fill="#e8e2d4" textAnchor="middle">
        The Frostmarches
      </text>
      <text x="600" y="130" fontFamily="serif" fontSize="15" fill="#e8e2d4" textAnchor="middle">
        Eldoria
      </text>
      <text x="300" y="205" fontFamily="serif" fontSize="14" fill="#f0e6c8" textAnchor="middle">
        Valenor
      </text>
      <text x="300" y="222" fontFamily="serif" fontSize="12" fill="#c9bfa0" textAnchor="middle">
        Kingdom
      </text>
      <text x="495" y="205" fontFamily="serif" fontSize="15" fill="#c9d9c9" textAnchor="middle">
        Blackspire
      </text>
      <text x="495" y="222" fontFamily="serif" fontSize="15" fill="#c9d9c9" textAnchor="middle">
        Forest
      </text>
      <text x="95" y="255" fontFamily="serif" fontSize="13" fill="#a8bcd0" textAnchor="middle">
        The Shattered Sea
      </text>
      <text x="565" y="330" fontFamily="serif" fontSize="14" fill="#d0a89c" textAnchor="middle">
        The Great Wastes
      </text>

      {/* Compass rose (bottom-left) */}
      <g transform="translate(60,360)">
        <circle r="26" fill="none" stroke="#d4af7a" strokeOpacity="0.6" strokeWidth="1.5" />
        <path d="M 0 -26 L 5 0 L 0 26 L -5 0 Z" fill="#d4af7a" opacity="0.8" />
        <path d="M -26 0 L 0 5 L 26 0 L 0 -5 Z" fill="#d4af7a" opacity="0.5" />
      </g>
    </svg>
  );
}
