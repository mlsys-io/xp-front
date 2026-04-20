import { useEffect, useState } from "react";
import { listApps } from "../api/client";
import { ExternalLink } from "lucide-react";

const APP_META: Record<string, { label: string; deepLink?: (cfg: any) => string }> = {
  quantarena: {
    label: "QuantArena",
    deepLink: (c) =>
      c?.active_competition_id && c?.active_strategy_id
        ? `https://lumid.market/strategies/${c.active_strategy_id}`
        : "https://lumid.market",
  },
  flowmesh: { label: "FlowMesh", deepLink: () => "https://runmesh.ai/workflows" },
  lumilake: { label: "Lumilake", deepLink: () => "https://lumilake.ai" },
  runmesh: { label: "Runmesh", deepLink: () => "https://runmesh.ai" },
};

export function Apps() {
  const [apps, setApps] = useState<any[]>([]);

  useEffect(() => {
    listApps()
      .then((r) => setApps(r.apps))
      .catch(() => setApps([]));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Applications</h1>
      <p className="mt-1 text-sm text-slate-500">
        Lumid apps your install has connected. Synced from your local{" "}
        <code className="px-1 bg-slate-100 rounded">~/.lumilake/apps/</code>.
      </p>

      {apps.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          <div className="font-medium text-slate-700">No apps synced yet</div>
          <div className="mt-2 text-sm">
            Run <code className="px-1 bg-slate-100 rounded">/lumid setup --competition &lt;id&gt;</code> or connect any app — the local scheduler pushes state on the next cycle.
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {apps.map((a) => {
            const meta = APP_META[a.name] ?? { label: a.name };
            const href = meta.deepLink ? meta.deepLink(a.config) : undefined;
            return (
              <div key={a.name} className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{meta.label}</span>
                  {href && (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                    >
                      Open <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <pre className="mt-3 text-xs text-slate-600 bg-slate-50 rounded p-3 overflow-x-auto">
                  {JSON.stringify(a.config, null, 2)}
                </pre>
                <div className="mt-2 text-xs text-slate-400">
                  synced{" "}
                  {a.synced_at
                    ? new Date(a.synced_at * 1000).toLocaleString()
                    : "—"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
