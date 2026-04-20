import { useEffect, useState } from "react";
import { listAgents, listMemories } from "../api/client";

export function Knowledge() {
  const [agents, setAgents] = useState<{ private: any[]; shared: any[] }>({ private: [], shared: [] });
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [mems, setMems] = useState<any[]>([]);
  const [loadingMems, setLoadingMems] = useState(false);

  useEffect(() => {
    listAgents().then(setAgents).catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeAgent) return;
    setLoadingMems(true);
    listMemories(activeAgent, 0, 100)
      .then((r) => setMems(r.memories))
      .finally(() => setLoadingMems(false));
  }, [activeAgent]);

  const allAgents = [
    ...agents.private.map((a: any) => ({ ...a, _scope: "private" })),
    ...agents.shared.map((a: any) => ({ ...a, _scope: "shared" })),
  ];

  return (
    <div>
      <div className="pb-6 border-b border-soul-400/10">
        <div className="text-[10px] uppercase tracking-[0.4em] text-soul-300/70">
          — the roots that remember —
        </div>
        <h1 className="mt-2 font-display text-4xl tracking-wide text-bark-300">
          Knowledge
        </h1>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="font-display text-xs uppercase tracking-[0.25em] text-soul-300 mb-3">
            Agents
          </div>

          {allAgents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-soul-400/25 bg-night-800/40 backdrop-blur p-5 text-sm text-bark-300/60">
              No roots yet.
              <div className="mt-2 text-xs text-bark-300/40">
                <code className="rounded bg-night-900/80 px-1 py-0.5 text-soul-300">
                  /lumid xp push-cloud
                </code>{" "}
                sends your local agents up the trunk.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {allAgents.map((a: any) => {
                const isActive = activeAgent === a.agent_id;
                return (
                  <button
                    key={a.agent_id}
                    onClick={() => setActiveAgent(a.agent_id)}
                    className={`w-full text-left rounded-xl p-4 transition-all backdrop-blur ${
                      isActive
                        ? "bg-gradient-to-br from-night-700/90 to-soul-400/10 border border-soul-400/40 shadow-soul"
                        : "bg-night-800/40 border border-soul-400/10 hover:border-soul-400/30"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isActive
                            ? "bg-soul-400 shadow-[0_0_8px_rgba(62,212,193,0.9)]"
                            : a._scope === "shared" ? "bg-spirit-400/70" : "bg-soul-400/60"
                        }`}
                      />
                      <span className="font-medium text-bark-300 truncate">{a.agent_id}</span>
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-widest text-bark-300/50 flex items-center gap-2">
                      <span>{a.domain ?? "—"}</span>
                      <span>·</span>
                      <span>{a._scope}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          {!activeAgent ? (
            <div className="h-full rounded-2xl border border-dashed border-soul-400/20 bg-night-800/30 backdrop-blur p-14 text-center">
              <div className="font-display text-3xl text-soul-300/50">❋</div>
              <div className="mt-3 text-bark-300/60 text-sm tracking-wide">
                choose a root to see its memories
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-2xl tracking-wide text-bark-300">
                  {activeAgent}
                </h2>
                <span className="text-xs text-bark-300/50 uppercase tracking-widest">
                  {loadingMems ? "listening…" : `${mems.length} memories`}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {mems.map((m: any) => (
                  <div
                    key={m.id}
                    className="group relative rounded-2xl border border-soul-400/15 bg-night-800/50 backdrop-blur p-5 overflow-hidden transition-colors hover:border-soul-400/40"
                  >
                    <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-atokirina-400/30 blur-md pointer-events-none" />
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] rounded-full border border-soul-400/25 bg-night-900/60 px-2.5 py-0.5 text-soul-300">
                        <span className="w-1 h-1 rounded-full bg-soul-400 animate-pulse-soul" />
                        {m.type ?? "memory"}
                      </span>
                      <span className="text-[11px] text-bark-300/50">
                        {m.created_at
                          ? new Date(m.created_at * 1000).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>
                    {m.title && (
                      <div className="mt-3 font-medium text-bark-300">{m.title}</div>
                    )}
                    <div className="mt-1 text-sm text-bark-300/75 whitespace-pre-wrap leading-relaxed">
                      {m.content}
                    </div>
                  </div>
                ))}
                {!loadingMems && mems.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-soul-400/20 bg-night-800/30 backdrop-blur p-6 text-sm text-bark-300/50">
                    This root is still growing — no memories yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
