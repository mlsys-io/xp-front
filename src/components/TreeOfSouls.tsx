// Tree of Souls — abstract willow silhouette, drawn inline SVG so
// it composes with gradient fills, glow filters, and scales cleanly.
// Used on the landing hero.

type Props = { className?: string };

export function TreeOfSouls({ className = "" }: Props) {
  return (
    <svg
      viewBox="0 0 640 720"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="canopy-glow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#d0b7ff" stopOpacity="0.95" />
          <stop offset="35%" stopColor="#9177ff" stopOpacity="0.65" />
          <stop offset="70%" stopColor="#3ed4c1" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#050816" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="trunk-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0d5a5" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#9ff2e8" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#6ee5d7" stopOpacity="0.4" />
        </linearGradient>
        <filter id="soul-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* halo behind the canopy */}
      <ellipse cx="320" cy="260" rx="280" ry="230" fill="url(#canopy-glow)" />

      {/* drooping willow strands — hand-drawn curves */}
      <g
        stroke="url(#trunk-grad)"
        strokeWidth="1.2"
        fill="none"
        opacity="0.85"
        filter="url(#soul-glow)"
      >
        <path d="M320 230 C 280 300, 220 400, 210 620" />
        <path d="M320 230 C 300 320, 260 430, 250 640" />
        <path d="M320 230 C 310 320, 290 440, 290 650" />
        <path d="M320 230 C 330 320, 340 440, 330 650" />
        <path d="M320 230 C 340 320, 380 430, 370 640" />
        <path d="M320 230 C 360 300, 420 400, 430 620" />
        <path d="M320 230 C 250 320, 170 420, 150 600" />
        <path d="M320 230 C 390 320, 470 420, 490 600" />
      </g>

      {/* luminous seed pods hanging from the branches */}
      <g fill="#ffb3e3" filter="url(#soul-glow)">
        {[
          [210, 615, 2.6], [250, 635, 2.2], [290, 645, 2.5],
          [330, 648, 2.3], [370, 638, 2.4], [430, 618, 2.6],
          [150, 598, 2.1], [490, 600, 2.3],
          [200, 520, 1.8], [270, 540, 1.7], [360, 530, 1.8],
          [440, 515, 1.9], [180, 440, 1.6], [470, 440, 1.6],
        ].map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} opacity="0.85" />
        ))}
      </g>

      {/* trunk */}
      <path
        d="M310 230 C 305 280, 302 400, 300 620 L 340 620 C 338 400, 335 280, 330 230 Z"
        fill="url(#trunk-grad)"
        opacity="0.92"
      />

      {/* root flare at base */}
      <g
        stroke="url(#trunk-grad)"
        strokeWidth="1.6"
        fill="none"
        opacity="0.75"
      >
        <path d="M300 620 C 250 660, 180 680, 100 700" />
        <path d="M320 625 C 320 670, 310 700, 280 720" />
        <path d="M330 625 C 360 670, 380 695, 400 720" />
        <path d="M340 620 C 390 655, 470 675, 560 700" />
      </g>
    </svg>
  );
}
