import { useEffect, useState } from "react";
import { listAgents, listApps, listLoops } from "../api/client";

export function Overview() {
  const [agents, setAgents] = useState<{ private: any[]; shared: any[] } | null>(null);
  const [apps, setApps] = useState<any[]>([]);
  const [loops, setLoops] = useState<any[]>([]);

  useEffect(() => {
    listAgents().then(setAgents).catch(() => setAgents({ private: [], shared: [] }));
    listApps().then((r) => setApps(r.apps)).catch(() => {});
    listLoops().then((r) => setLoops(r.loops)).catch(() => {});
  }, []);

  const stats = [
    {
      value: (agents?.private.length ?? 0) + (agents?.shared.length ?? 0),
      label: "agents",
      glyph: "❋",
      dot: "bg-soul-400",
      glow: "from-soul-400/25",
    },
    {
      value: apps.length,
      label: "apps",
      glyph: "⁂",
      dot: "bg-spirit-400",
      glow: "from-spirit-400/25",
    },
    {
      value: loops.length,
      label: "loops",
      glyph: "⋯",
      dot: "bg-atokirina-400",
      glow: "from-atokirina-400/25",
    },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl tracking-wide text-bark-300">Overview</h1>

      <div className="mt-8 grid grid-cols-3 gap-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="relative rounded-2xl border border-soul-400/10 bg-night-800/50 backdrop-blur p-6 overflow-hidden"
          >
            <div className={`absolute -top-1/2 -right-1/2 w-[180%] h-[180%] bg-gradient-radial ${s.glow} to-transparent opacity-50 blur-3xl pointer-events-none`} />
            <div className="relative flex items-start justify-between">
              <span className="font-display text-5xl text-bark-300">{s.value}</span>
              <span className="text-soul-300/60 font-display text-lg">{s.glyph}</span>
            </div>
            <div className="relative mt-2 flex items-center gap-2 text-[11px] uppercase tracking-widest text-bark-300/55">
              <span className={`w-1 h-1 rounded-full ${s.dot} animate-pulse-soul`} />
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
