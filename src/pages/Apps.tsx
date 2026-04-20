import { useEffect, useState } from "react";
import { listApps } from "../api/client";

const APP_META: Record<string, { label: string; deepLink?: (cfg: any) => string }> = {
  quantarena: {
    label: "QuantArena",
    deepLink: (c) =>
      c?.active_strategy_id
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
    listApps().then((r) => setApps(r.apps)).catch(() => setApps([]));
  }, []);

  return (
    <div>
      <div className="pb-6 border-b border-soul-400/10">
        <div className="text-[10px] uppercase tracking-[0.4em] text-soul-300/70">
          — every branch, still connected to the trunk —
        </div>
        <h1 className="mt-2 font-display text-4xl tracking-wide text-bark-300">
          Applications
        </h1>
      </div>

      {apps.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-soul-400/25 bg-night-800/40 backdrop-blur p-10 text-center">
          <div className="font-display text-3xl text-soul-300/50">⁂</div>
          <div className="mt-3 font-display tracking-widest uppercase text-xs text-bark-300/70">
            no branches reporting in yet
          </div>
          <div className="mt-3 text-bark-300/60 text-sm max-w-md mx-auto leading-relaxed">
            Run{" "}
            <code className="rounded bg-night-900/80 px-1.5 py-0.5 text-soul-300 text-[13px]">
              /lumid setup --competition &lt;id&gt;
            </code>{" "}
            or connect any Lumid app. Your scheduler pushes state here on the next cycle.
          </div>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
          {apps.map((a) => {
            const meta = APP_META[a.name] ?? { label: a.name };
            const href = meta.deepLink ? meta.deepLink(a.config) : undefined;
            return (
              <div
                key={a.name}
                className="relative rounded-2xl border border-soul-400/15 bg-night-800/50 backdrop-blur p-6 overflow-hidden"
              >
                <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-spirit-400/15 blur-3xl pointer-events-none" />
                <div className="relative flex items-center justify-between">
                  <span className="font-display text-lg tracking-wide text-bark-300">
                    {meta.label}
                  </span>
                  {href && (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs uppercase tracking-widest text-soul-300 hover:text-soul-400 transition-colors"
                    >
                      open →
                    </a>
                  )}
                </div>
                <pre className="relative mt-4 text-xs text-bark-300/80 bg-night-900/60 rounded-lg p-3 overflow-x-auto border border-soul-400/10">
                  {JSON.stringify(a.config, null, 2)}
                </pre>
                <div className="relative mt-3 text-[11px] uppercase tracking-widest text-bark-300/40 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-spirit-400 animate-pulse-soul" />
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
