import { useEffect, useState } from "react";
import { listAgents, listApps, listLoops } from "../api/client";
import { Brain, Database, FlaskConical } from "lucide-react";

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
      icon: Brain,
      label: "Knowledge agents",
      value: (agents?.private.length ?? 0) + (agents?.shared.length ?? 0),
      sub: `${agents?.private.length ?? 0} yours · ${agents?.shared.length ?? 0} shared`,
    },
    {
      icon: Database,
      label: "Applications",
      value: apps.length,
      sub: apps.map((a) => a.name).slice(0, 3).join(" · ") || "none synced",
    },
    {
      icon: FlaskConical,
      label: "Auto-research loops",
      value: loops.length,
      sub: `${loops.filter((l: any) => l.status === "HEALTHY").length} healthy`,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Your knowledge graph</h1>
      <p className="mt-1 text-sm text-slate-500">
        Everything your LumidOS install is producing + sharing, at a glance.
      </p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">{s.label}</span>
              <s.icon className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{s.value}</div>
            <div className="mt-1 text-xs text-slate-500 truncate">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-indigo-100 bg-indigo-50/50 p-5 text-sm text-indigo-900">
        <div className="font-medium">First time here?</div>
        <div className="mt-1 text-indigo-800/80">
          Install LumidOS locally, then run <code className="px-1.5 py-0.5 bg-white rounded">/lumid xp learn "…"</code> in Claude Code. Your memories sync here automatically once you run <code className="px-1.5 py-0.5 bg-white rounded">/lumid xp push-cloud</code>.
        </div>
        <a
          href="https://lum.id/start"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-indigo-700 underline hover:text-indigo-900"
        >
          Install instructions →
        </a>
      </div>
    </div>
  );
}
