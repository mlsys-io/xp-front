import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  listAgents,
  listMemories,
  listMySubscriptions,
  setAgentVisibility,
  unsubscribeAgent,
} from "../api/client";

export function Knowledge() {
  const [agents, setAgents] = useState<{ private: any[]; shared: any[] }>({ private: [], shared: [] });
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [mems, setMems] = useState<any[]>([]);
  const [loadingMems, setLoadingMems] = useState(false);
  const [subs, setSubs] = useState<any[]>([]);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [publishForm, setPublishForm] = useState({ summary: "", tags: "" });
  const [vis, setVis] = useState<Record<string, "public" | "private">>({});

  function refresh() {
    listAgents().then((r) => {
      setAgents(r);
      const v: Record<string, "public" | "private"> = {};
      for (const a of r.private) {
        v[a.agent_id] = (a.visibility || "private") as any;
      }
      setVis(v);
    }).catch(() => {});
    listMySubscriptions().then((r) => setSubs(r.subscriptions)).catch(() => setSubs([]));
  }

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (!activeAgent) return;
    setLoadingMems(true);
    listMemories(activeAgent, 0, 100)
      .then((r) => setMems(r.memories))
      .finally(() => setLoadingMems(false));
  }, [activeAgent]);

  async function doPublish(agentId: string) {
    const tags = publishForm.tags.split(",").map((t) => t.trim()).filter(Boolean);
    await setAgentVisibility(agentId, "public", publishForm.summary, tags);
    setPublishing(null);
    setPublishForm({ summary: "", tags: "" });
    setVis({ ...vis, [agentId]: "public" });
    refresh();
  }

  async function doUnpublish(agentId: string) {
    await setAgentVisibility(agentId, "private");
    setVis({ ...vis, [agentId]: "private" });
    refresh();
  }

  const allAgents = [
    ...agents.private.map((a: any) => ({ ...a, _scope: "private" })),
    ...agents.shared.map((a: any) => ({ ...a, _scope: "shared" })),
  ];

  return (
    <div>
      <h1 className="font-display text-3xl tracking-wide text-bark-300">Knowledge</h1>

      <div className="mt-8 grid grid-cols-3 gap-8">
        <div className="col-span-1">
          {allAgents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-soul-400/25 bg-night-800/40 p-5 text-sm text-bark-300/50">
              No agents synced yet. Run{" "}
              <code className="text-soul-300">/lumid xp push-cloud</code>{" "}
              from Claude Code.
            </div>
          ) : (
            <div className="space-y-2">
              {allAgents.map((a: any) => {
                const isActive = activeAgent === a.agent_id;
                const isPublic = vis[a.agent_id] === "public";
                return (
                  <div key={a.agent_id} className="relative">
                    <button
                      onClick={() => setActiveAgent(a.agent_id)}
                      className={`w-full text-left rounded-xl px-4 py-3 transition-all backdrop-blur ${
                        isActive
                          ? "bg-night-700/90 border border-soul-400/40 shadow-soul"
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
                        <span className="text-bark-300 truncate flex-1">{a.agent_id}</span>
                        {isPublic && (
                          <span title="published to marketplace" className="text-[9px] uppercase tracking-widest text-soul-300">◉ public</span>
                        )}
                      </div>
                      <div className="mt-1 text-[11px] text-bark-300/40">
                        {a.domain ?? "—"}
                      </div>
                    </button>
                    {a._scope === "private" && (
                      <div className="mt-1 flex items-center gap-3 px-4">
                        {isPublic ? (
                          <button
                            onClick={() => doUnpublish(a.agent_id)}
                            className="text-[10px] uppercase tracking-widest text-bark-300/50 hover:text-atokirina-400 transition-colors"
                          >
                            unpublish
                          </button>
                        ) : (
                          <button
                            onClick={() => setPublishing(a.agent_id)}
                            className="text-[10px] uppercase tracking-widest text-bark-300/50 hover:text-soul-300 transition-colors"
                          >
                            publish
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="col-span-2">
          {!activeAgent ? (
            <div className="h-full rounded-2xl border border-dashed border-soul-400/15 bg-night-800/20 p-10 text-center">
              <div className="font-display text-2xl text-soul-300/40">❋</div>
              <div className="mt-3 text-sm text-bark-300/50">
                Pick an agent to see its memories.
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-xl text-bark-300">{activeAgent}</h2>
                <span className="text-[11px] text-bark-300/40">
                  {loadingMems ? "…" : `${mems.length}`}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {mems.map((m: any) => (
                  <div
                    key={m.id}
                    className="relative rounded-2xl border border-soul-400/15 bg-night-800/50 backdrop-blur p-5 overflow-hidden"
                  >
                    <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-atokirina-400/30 blur-md pointer-events-none" />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-widest text-soul-300/80">
                        {m.type ?? "memory"}
                      </span>
                      <span className="text-[11px] text-bark-300/40">
                        {m.created_at ? new Date(m.created_at * 1000).toLocaleDateString() : ""}
                      </span>
                    </div>
                    {m.title && (
                      <div className="mt-2 text-bark-300">{m.title}</div>
                    )}
                    <div className="mt-1 text-sm text-bark-300/75 whitespace-pre-wrap">
                      {m.content}
                    </div>
                  </div>
                ))}
                {!loadingMems && mems.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-soul-400/15 bg-night-800/20 p-6 text-sm text-bark-300/40">
                    empty
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Subscriptions section */}
      {subs.length > 0 && (
        <div className="mt-12">
          <div className="font-display text-xs uppercase tracking-[0.25em] text-soul-300/70 mb-3">
            ◎ Subscriptions
          </div>
          <div className="grid grid-cols-2 gap-4">
            {subs.map((s) => (
              <div
                key={`${s.owner_sub}/${s.agent_id}`}
                className="relative rounded-xl border border-soul-400/15 bg-night-800/40 p-4"
              >
                <div className="flex items-center justify-between">
                  <Link
                    to={`/marketplace/agents/${encodeURIComponent(s.owner_sub)}/${encodeURIComponent(s.agent_id)}`}
                    className="font-display text-sm text-bark-300 hover:text-soul-300 transition-colors truncate"
                  >
                    {s.agent_id}
                  </Link>
                  <button
                    onClick={async () => { await unsubscribeAgent(s.owner_sub, s.agent_id); refresh(); }}
                    className="text-[10px] uppercase tracking-widest text-bark-300/40 hover:text-atokirina-400 transition-colors"
                  >
                    drop
                  </button>
                </div>
                <div className="mt-1 text-[11px] text-bark-300/50">{s.summary || s.domain || "—"}</div>
                <div className="mt-1 text-[10px] text-bark-300/40">
                  {s.memory_count ?? 0} memories{!s.still_published && " · owner unpublished"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Publish dialog */}
      {publishing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-night-900/80 backdrop-blur">
          <div className="w-full max-w-md rounded-2xl border border-soul-400/30 bg-night-800/95 p-6">
            <div className="font-display text-lg text-bark-300">
              Publish <span className="text-soul-300">{publishing}</span>
            </div>
            <p className="mt-2 text-xs text-atokirina-400/80 leading-relaxed">
              ⚠ Every memory in this agent will be readable by anyone on xp.io/marketplace.
            </p>
            <input
              value={publishForm.summary}
              onChange={(e) => setPublishForm({ ...publishForm, summary: e.target.value })}
              placeholder="one-line summary"
              className="mt-4 w-full bg-night-900/60 border border-soul-400/15 rounded-lg px-3 py-2 text-sm text-bark-300 focus:outline-none focus:border-soul-400/40"
            />
            <input
              value={publishForm.tags}
              onChange={(e) => setPublishForm({ ...publishForm, tags: e.target.value })}
              placeholder="tags (comma-separated)"
              className="mt-2 w-full bg-night-900/60 border border-soul-400/15 rounded-lg px-3 py-2 text-sm text-bark-300 focus:outline-none focus:border-soul-400/40"
            />
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setPublishing(null)}
                className="text-[11px] uppercase tracking-widest text-bark-300/50 hover:text-bark-300"
              >
                cancel
              </button>
              <button
                onClick={() => doPublish(publishing)}
                className="soul-ring rounded-full bg-night-900/80 px-5 py-2 text-[11px] tracking-widest uppercase text-bark-300 hover:scale-[1.02] transition-transform"
              >
                publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
