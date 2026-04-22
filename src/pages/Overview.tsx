import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listRepos, whoami, type Repo } from "../api/client";

export function Overview() {
  const [repos, setRepos] = useState<Repo[] | null>(null);

  useEffect(() => {
    (async () => {
      const me = await whoami().catch(() => null);
      if (!me) {
        setRepos([]);
        return;
      }
      const mine = await listRepos({ owner: me.sub, limit: 200 }).catch(() => []);
      setRepos(mine);
    })();
  }, []);

  const counts = {
    app: repos?.filter((r) => r.kind === "app").length ?? 0,
    autoresearch: repos?.filter((r) => r.kind === "autoresearch").length ?? 0,
    agent: repos?.filter((r) => r.kind === "agent").length ?? 0,
  };

  const stats = [
    { value: counts.app, label: "apps", glyph: "⁂", dot: "bg-spirit-400", glow: "from-spirit-400/25", to: "/dashboard/repos" },
    { value: counts.autoresearch, label: "autoresearch", glyph: "⋯", dot: "bg-soul-400", glow: "from-soul-400/25", to: "/dashboard/repos" },
    { value: counts.agent, label: "agents", glyph: "❋", dot: "bg-atokirina-400", glow: "from-atokirina-400/25", to: "/dashboard/repos" },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl tracking-wide text-bark-300">Overview</h1>

      <div className="mt-8 grid grid-cols-3 gap-5">
        {stats.map((s) => (
          <Link
            key={s.label}
            to={s.to}
            className="relative rounded-2xl border border-soul-400/10 bg-night-800/50 backdrop-blur p-6 overflow-hidden hover:border-soul-400/30 transition-colors"
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
          </Link>
        ))}
      </div>

      <div className="mt-10 flex items-center gap-3">
        <Link
          to="/new"
          className="px-4 py-2 text-xs uppercase tracking-widest rounded-full border border-soul-400/40 text-soul-300 hover:text-soul-400 hover:border-soul-400/70"
        >
          + new repo
        </Link>
        <Link
          to="/"
          className="px-4 py-2 text-xs uppercase tracking-widest rounded-full border border-soul-400/20 text-bark-300/70 hover:border-soul-400/50 hover:text-bark-300"
        >
          browse the marketspace
        </Link>
      </div>
    </div>
  );
}
