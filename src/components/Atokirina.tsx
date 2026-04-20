// Atokirina — the "seeds of the sacred tree" in Na'vi. We render a
// field of drifting bioluminescent jellyfish-like pods. Pure CSS
// animation, no JS loop.

type Props = {
  count?: number;
  className?: string;
};

export function AtokirinaField({ count = 14, className = "" }: Props) {
  const seeds = Array.from({ length: count }, (_, i) => i);
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {seeds.map((i) => {
        const size = 4 + ((i * 17) % 9);       // 4–12 px
        const left = (i * 37) % 100;            // spread horizontally
        const top = (i * 53) % 100;             // spread vertically
        const speed = ["drift-slow", "drift-med", "drift-fast"][i % 3];
        const hue = ["bg-soul-400", "bg-spirit-400", "bg-atokirina-400"][i % 3];
        const delay = (i % 7) * 0.9;
        return (
          <span
            key={i}
            className={`absolute rounded-full ${hue} shadow-seed opacity-60 animate-${speed}`}
            style={{
              width: size,
              height: size,
              left: `${left}%`,
              top: `${top}%`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
    </div>
  );
}
