import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listApps, browseMarketplaceApps } from "../api/client";

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
  const [teaser, setTeaser] = useState<any[]>([]);

  useEffect(() => {
    listApps().then((r) => setApps(r.apps)).catch(() => setApps([]));
    browseMarketplaceApps().then((r) => setTeaser((r.apps || []).slice(0, 3))).catch(() => setTeaser([]));
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl tracking-wide text-bark-300">Applications</h1>

      {/* Browse catalog teaser */}
      <div className="mt-6 relative rounded-2xl border border-soul-400/15 bg-night-800/40 backdrop-blur p-5 overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-spirit-400/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="font-display text-xs uppercase tracking-[0.25em] text-soul-300/80">⟁ Browse catalog</div>
            <div className="mt-1 text-sm text-bark-300/70">
              Discover strategies, workflows and running competitions.
            </div>
          </div>
          <Link
            to="/marketplace"
            className="text-[11px] uppercase tracking-widest text-soul-300 hover:text-soul-400 transition-colors"
          >
            open marketplace →
          </Link>
        </div>
        {teaser.length > 0 && (
          <div className="relative mt-4 grid grid-cols-3 gap-3">
            {teaser.map((a, i) => (
              <div key={i} className="rounded-lg bg-night-900/60 border border-soul-400/10 p-3">
                <div className="text-[10px] uppercase tracking-widest text-spirit-400/80">{a.source}</div>
                <div className="mt-1 text-xs text-bark-300 truncate">{a.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {apps.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-soul-400/15 bg-night-800/20 p-10 text-center">
          <div className="font-display text-2xl text-soul-300/40">⁂</div>
          <div className="mt-3 text-sm text-bark-300/50">
            Connect an app — e.g. <code className="text-soul-300">/lumid setup --competition 33</code>.
          </div>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-5">
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
                  <span className="font-display text-lg text-bark-300">{meta.label}</span>
                  {href && (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] uppercase tracking-widest text-soul-300 hover:text-soul-400 transition-colors"
                    >
                      open →
                    </a>
                  )}
                </div>
                <pre className="relative mt-4 text-xs text-bark-300/70 bg-night-900/60 rounded-lg p-3 overflow-x-auto border border-soul-400/10">
                  {JSON.stringify(a.config, null, 2)}
                </pre>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
