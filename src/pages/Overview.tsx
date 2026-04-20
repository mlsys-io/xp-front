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
      label: "Knowledge roots",
      value: (agents?.private.length ?? 0) + (agents?.shared.length ?? 0),
      sub: `${agents?.private.length ?? 0} yours · ${agents?.shared.length ?? 0} shared`,
      glyph: "❋",
      glow: "from-soul-400/30 to-transparent",
      dot: "bg-soul-400",
    },
    {
      label: "Living applications",
      value: apps.length,
      sub: apps.map((a) => a.name).slice(0, 3).join(" · ") || "nothing planted yet",
      glyph: "⁂",
      glow: "from-spirit-400/30 to-transparent",
      dot: "bg-spirit-400",
    },
    {
      label: "Auto-research loops",
      value: loops.length,
      sub: `${loops.filter((l: any) => l.status === "HEALTHY").length} healthy`,
      glyph: "⋯",
      glow: "from-atokirina-400/30 to-transparent",
      dot: "bg-atokirina-400",
    },
  ];

  return (
    <div>
      <div className="flex items-end gap-4 pb-6 border-b border-soul-400/10">
        <div>
          <div className="text-[10px] uppercase tracking-[0.4em] text-soul-300/70">
            — what the Tree remembers today —
          </div>
          <h1 className="mt-2 font-display text-4xl tracking-wide text-bark-300">
            Overview
          </h1>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="group relative rounded-2xl border border-soul-400/10 bg-night-800/50 backdrop-blur p-6 overflow-hidden"
          >
            <div
              className={`absolute -top-1/2 -right-1/2 w-[180%] h-[180%] bg-gradient-radial ${s.glow} opacity-50 blur-3xl pointer-events-none`}
              style={{
                background: `radial-gradient(circle at 70% 30%, var(--tw-gradient-from), transparent 60%)`,
              }}
            />
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="font-display text-xs uppercase tracking-[0.25em] text-soul-300">
                  {s.label}
                </span>
                <span className="text-soul-300/60 font-display text-lg">{s.glyph}</span>
              </div>
              <div className="mt-5 font-display text-5xl text-bark-300">{s.value}</div>
              <div className="mt-2 flex items-center gap-2 text-xs text-bark-300/60 truncate">
                <span className={`w-1 h-1 rounded-full ${s.dot} animate-pulse-soul`} />
                {s.sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 relative rounded-2xl border border-spirit-400/20 bg-gradient-to-br from-night-800/70 to-spirit-400/5 backdrop-blur p-7 overflow-hidden">
        <div className="absolute -right-10 -top-10 w-72 h-72 rounded-full bg-spirit-400/15 blur-3xl pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="shrink-0 font-display text-3xl text-soul-300">❋</div>
          <div>
            <div className="font-display text-sm tracking-[0.25em] uppercase text-soul-300">
              Plant your first seed
            </div>
            <p className="mt-2 text-bark-300/80 leading-relaxed max-w-2xl">
              In Claude Code, run{" "}
              <code className="rounded bg-night-900/80 px-1.5 py-0.5 text-soul-300 text-[13px]">
                /lumid xp learn "…"
              </code>{" "}
              to commit a memory to your local roots, then{" "}
              <code className="rounded bg-night-900/80 px-1.5 py-0.5 text-soul-300 text-[13px]">
                /lumid xp push-cloud
              </code>{" "}
              to send it up the trunk to xp.io.
            </p>
            <a
              href="https://lum.id/start"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-soul-300 hover:text-soul-400 transition-colors"
            >
              Install LumidOS <span>→</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
