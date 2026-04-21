import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listLoops, listAgents, api, unpublishWorkflow } from "../api/client";

const STATUS_COLOR: Record<string, string> = {
  HEALTHY:   "bg-soul-400",
  STALE:     "bg-bark-400",
  DECLINING: "bg-atokirina-400",
  DEAD:      "bg-night-500",
};

type Tab = "loops" | "published";

export function Research() {
  const [tab, setTab] = useState<Tab>("loops");
  const [loops, setLoops] = useState<any[]>([]);
  const [myWorkflows, setMyWorkflows] = useState<any[]>([]);
  const [myAgents, setMyAgents] = useState<any[]>([]);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [form, setForm] = useState({ summary: "", tags: "", agents: "" });

  function refresh() {
    listLoops().then((r) => setLoops(r.loops)).catch(() => setLoops([]));
    listAgents().then((r) => setMyAgents(r.private || [])).catch(() => {});
    // "My workflows" — filter marketplace workflows to mine.
    // We expose a per-user view by asking /api/v1/me first and then filtering
    // the marketplace list. (A dedicated endpoint would be tidier; MVP is fine.)
    api.get("/api/v1/me").then(async (me) => {
      const sub = me.data?.sub;
      if (!sub) { setMyWorkflows([]); return; }
      const r = await api.get("/api/v1/marketplace/workflows");
      setMyWorkflows((r.data?.workflows || []).filter((w: any) => w.owner_sub === sub));
    }).catch(() => setMyWorkflows([]));
  }

  useEffect(() => { refresh(); }, []);

  async function doPublish(loopName: string) {
    const tag_list = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const bundled = form.agents.split(",").map((a) => a.trim()).filter(Boolean);
    const agentSnaps = bundled.length === 0
      // fall back to every private agent matching the loop name prefix
      ? myAgents.filter((a: any) => (a.agent_id || "").toLowerCase().includes(loopName.toLowerCase().split("-")[0])).map((a: any) => ({ agent_id: a.agent_id, summary: a.description || "" }))
      : bundled.map((aid) => ({ agent_id: aid, summary: "" }));
    if (agentSnaps.length === 0) {
      alert("No bundled agents — specify which agent(s) to bundle in the Agents field.");
      return;
    }
    try {
      await api.post("/api/v1/workflows", {
        name: loopName,
        summary: form.summary,
        domain: (loops.find((l: any) => l.name === loopName)?.config_keys || [])[0] || "",
        tags: tag_list,
        loop: { source: "xp.io-dashboard" },   // real loop spec gets published via /lumid CLI
        agents: agentSnaps,                      // memory snapshot happens on the CLI side
      });
      setPublishing(null);
      setForm({ summary: "", tags: "", agents: "" });
      refresh();
    } catch (e: any) {
      alert(e?.response?.data?.detail || "publish failed");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl tracking-wide text-bark-300">Auto-research</h1>
        <div className="flex items-center gap-6">
          {(["loops", "published"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative text-[11px] uppercase tracking-widest pb-1 transition-colors ${
                tab === t ? "text-soul-300" : "text-bark-300/50 hover:text-bark-300"
              }`}
            >
              {t === "loops" ? "Loops" : "My workflows"}
              {tab === t && (
                <span className="absolute inset-x-0 -bottom-0.5 h-[2px] rounded-full bg-soul-400 shadow-[0_0_8px_rgba(62,212,193,0.9)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === "loops" && (
        loops.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-soul-400/15 bg-night-800/20 p-10 text-center">
            <div className="font-display text-2xl text-soul-300/40">⋯</div>
            <div className="mt-3 text-sm text-bark-300/50">
              No loops yet. Try <code className="text-soul-300">/lumid research run AutoResearch-v1 --cycles 1</code>.
            </div>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-5">
            {loops.map((l: any) => {
              const dot = STATUS_COLOR[l.status] ?? "bg-bark-400";
              return (
                <div
                  key={l.name}
                  className="relative rounded-2xl border border-soul-400/15 bg-night-800/50 backdrop-blur p-6 overflow-hidden"
                >
                  <div className="absolute -top-20 -left-20 w-48 h-48 rounded-full bg-soul-400/10 blur-3xl pointer-events-none" />
                  <div className="relative flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${dot} animate-pulse-soul`} />
                    <span className="font-display text-lg text-bark-300 truncate flex-1">{l.name}</span>
                    <button
                      onClick={() => setPublishing(l.name)}
                      className="text-[10px] uppercase tracking-widest text-bark-300/50 hover:text-soul-300 transition-colors"
                    >
                      publish
                    </button>
                  </div>
                  <div className="relative mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-bark-300/40">cycles</div>
                      <div className="mt-0.5 font-display text-2xl text-bark-300">{l.cycles ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-bark-300/40">last</div>
                      <div className="mt-0.5 text-[12px] text-bark-300/80">
                        {l.last_run_at ? new Date(l.last_run_at * 1000).toLocaleString() : "never"}
                      </div>
                    </div>
                  </div>
                  {l.last_outcome && (
                    <div className="relative mt-4 text-xs text-bark-300/60 bg-night-900/60 rounded-lg p-3 border border-soul-400/10 line-clamp-2">
                      {l.last_outcome}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {tab === "published" && (
        myWorkflows.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-soul-400/15 bg-night-800/20 p-10 text-center">
            <div className="font-display text-2xl text-soul-300/40">∅</div>
            <div className="mt-3 text-sm text-bark-300/50 max-w-md mx-auto">
              Nothing published yet. Publish a loop here or via Claude Code:
              <div className="mt-2 font-mono text-xs text-soul-300">
                /lumid research publish-workflow &lt;loop&gt;
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-5">
            {myWorkflows.map((w) => (
              <div key={w.workflow_id} className="relative rounded-2xl border border-soul-400/15 bg-night-800/50 backdrop-blur p-6 overflow-hidden">
                <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-spirit-400/10 blur-3xl pointer-events-none" />
                <div className="relative flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-spirit-400 animate-pulse-soul" />
                  <Link
                    to={`/marketplace/workflows/${w.workflow_id}`}
                    className="font-display text-lg text-bark-300 hover:text-soul-300 truncate flex-1"
                  >
                    {w.name}
                  </Link>
                  <button
                    onClick={async () => { await unpublishWorkflow(w.workflow_id); refresh(); }}
                    className="text-[10px] uppercase tracking-widest text-bark-300/40 hover:text-atokirina-400 transition-colors"
                  >
                    unpublish
                  </button>
                </div>
                {w.summary && (
                  <div className="relative mt-3 text-xs text-bark-300/60 line-clamp-2">{w.summary}</div>
                )}
                <div className="relative mt-4 flex items-center gap-4 text-xs text-bark-300/50">
                  <span>{w.agent_count ?? 0} agents</span>
                  <span>· {w.memory_count ?? 0} memories</span>
                  <span>· {w.clones ?? 0} clones</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {publishing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-night-900/80 backdrop-blur">
          <div className="w-full max-w-md rounded-2xl border border-soul-400/30 bg-night-800/95 p-6">
            <div className="font-display text-lg text-bark-300">
              Publish workflow <span className="text-soul-300">{publishing}</span>
            </div>
            <p className="mt-2 text-xs text-atokirina-400/80 leading-relaxed">
              ⚠ Bundles the loop's schedule + skills with the specified agents (memories included).
              Anyone who clones it gets a fresh-state copy.
            </p>
            <p className="mt-2 text-[11px] text-bark-300/60">
              For a full memory snapshot, publish from Claude Code instead:
              <br />
              <code className="text-soul-300">/lumid research publish-workflow {publishing}</code>
            </p>
            <input
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="one-line summary"
              className="mt-4 w-full bg-night-900/60 border border-soul-400/15 rounded-lg px-3 py-2 text-sm text-bark-300 focus:outline-none focus:border-soul-400/40"
            />
            <input
              value={form.agents}
              onChange={(e) => setForm({ ...form, agents: e.target.value })}
              placeholder="bundle agents (comma-separated agent_ids)"
              className="mt-2 w-full bg-night-900/60 border border-soul-400/15 rounded-lg px-3 py-2 text-sm text-bark-300 focus:outline-none focus:border-soul-400/40"
            />
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
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
