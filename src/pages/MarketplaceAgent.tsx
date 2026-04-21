import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getMarketplaceAgent,
  getMarketplaceAgentMemories,
  subscribeAgent,
  whoami,
} from "../api/client";

export function MarketplaceAgent() {
  const { owner, agentId } = useParams<{ owner: string; agentId: string }>();
  const [agent, setAgent] = useState<any>(null);
  const [mems, setMems] = useState<any[]>([]);
  const [previewsOnly, setPreviewsOnly] = useState(true);
  const [me, setMe] = useState<{ sub: string; email: string | null } | null>(null);
  const [msg, setMsg] = useState<string>("");
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    whoami().then(setMe).catch(() => setMe(null));
  }, []);

  useEffect(() => {
    if (!owner || !agentId) return;
    getMarketplaceAgent(owner, agentId).then(setAgent).catch(() => setAgent(null));
    // Memories endpoint accepts optional auth; anon gets previews only
    getMarketplaceAgentMemories(owner, agentId, 50)
      .then((r) => { setMems(r.memories); setPreviewsOnly(r.previews_only); })
      .catch(() => setMems([]));
  }, [owner, agentId]);

  async function onSubscribe() {
    if (!owner || !agentId) return;
    setSubscribing(true);
    try {
      await subscribeAgent(owner, agentId);
      setMsg("Subscribed. Your /lumid xp ask queries now merge these memories read-only.");
    } catch (e: any) {
      setMsg(e?.response?.data?.detail || "subscribe failed");
    } finally {
      setSubscribing(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 starfield opacity-40" />
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-soul-400/10">
        <Link to="/" className="text-soul-300 font-display tracking-[0.35em] text-sm">xp.io</Link>
      </nav>

      <main className="relative z-10 mx-auto max-w-5xl px-8 py-10">
        <Link to="/marketplace" className="text-[11px] uppercase tracking-widest text-bark-300/50 hover:text-soul-300 transition-colors">
          ← back
        </Link>

        {!agent ? (
          <div className="mt-10 text-center text-bark-300/50">loading…</div>
        ) : (
          <>
            <div className="mt-6 relative rounded-2xl border border-soul-400/15 bg-night-800/50 backdrop-blur p-8 overflow-hidden">
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-atokirina-400/10 blur-3xl pointer-events-none" />
              <div className="relative flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-atokirina-400 animate-pulse-soul" />
                <span className="text-[10px] uppercase tracking-[0.25em] text-bark-300/50">knowledge agent</span>
              </div>
              <h1 className="relative mt-2 font-display text-3xl text-bark-300">{agent.agent_id}</h1>
              {agent.domain && (
                <div className="relative mt-1 text-[11px] uppercase tracking-widest text-atokirina-400/80">
                  {agent.domain}
                </div>
              )}
              {agent.summary && (
                <p className="relative mt-4 text-sm text-bark-300/80 max-w-2xl">{agent.summary}</p>
              )}
              <div className="relative mt-5 text-xs text-bark-300/60">
                {agent.memory_count ?? 0} memories · owner <code className="text-soul-300/80">{(agent.owner_sub || "").slice(0, 10)}…</code>
              </div>

              <div className="relative mt-6 flex items-center gap-4">
                {me ? (
                  <button
                    onClick={onSubscribe}
                    disabled={subscribing}
                    className="soul-ring rounded-full bg-night-900/80 px-6 py-2.5 text-sm tracking-widest uppercase text-bark-300 hover:scale-[1.02] transition-transform disabled:opacity-50"
                  >
                    {subscribing ? "…" : "subscribe"}
                  </button>
                ) : (
                  <Link
                    to="/"
                    className="soul-ring rounded-full bg-night-900/80 px-6 py-2.5 text-sm tracking-widest uppercase text-bark-300 hover:scale-[1.02] transition-transform"
                  >
                    sign in to subscribe
                  </Link>
                )}
                {msg && <span className="text-xs text-soul-300/80">{msg}</span>}
              </div>
            </div>

            <div className="mt-10">
              <div className="font-display text-xs uppercase tracking-[0.25em] text-soul-300/70 mb-3">
                ❋ Memories {previewsOnly && <span className="text-bark-300/40 text-[10px] normal-case tracking-normal">· previews only — sign in for full content</span>}
              </div>
              <div className="space-y-3">
                {mems.map((m) => (
                  <div key={m.id} className="relative rounded-xl border border-soul-400/15 bg-night-800/40 p-5 overflow-hidden">
                    <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-atokirina-400/30 blur-md pointer-events-none" />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-widest text-soul-300/80">{m.type ?? "memory"}</span>
                      {m.created_at && (
                        <span className="text-[11px] text-bark-300/40">
                          {new Date(m.created_at * 1000).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {m.title && <div className="mt-2 text-bark-300">{m.title}</div>}
                    <div className="mt-1 text-sm text-bark-300/75 whitespace-pre-wrap">{m.content}</div>
                  </div>
                ))}
                {mems.length === 0 && (
                  <div className="rounded-xl border border-dashed border-soul-400/15 bg-night-800/20 p-6 text-sm text-bark-300/40">
                    no memories yet
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
