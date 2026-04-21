import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMarketplaceWorkflow, whoami } from "../api/client";

export function MarketplaceWorkflow() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const [wf, setWf] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [me, setMe] = useState<{ sub: string } | null>(null);

  useEffect(() => {
    whoami().then(setMe).catch(() => setMe(null));
  }, []);

  useEffect(() => {
    if (!workflowId) return;
    getMarketplaceWorkflow(workflowId)
      .then((r) => setWf(r.workflow))
      .catch((e) => setError(e?.response?.data?.detail || "not found"));
  }, [workflowId]);

  if (error) {
    return (
      <Shell>
        <div className="text-center text-bark-300/60">{error}</div>
      </Shell>
    );
  }

  if (!wf) return <Shell><div className="text-center text-soul-300/40">…</div></Shell>;

  const cloneCmd = `/lumid research clone-workflow ${wf.workflow_id} my-${wf.name || "workflow"}`;

  return (
    <Shell>
      <Link to="/marketplace" className="text-[11px] uppercase tracking-widest text-bark-300/50 hover:text-soul-300 transition-colors">
        ← back
      </Link>

      <div className="mt-6 relative rounded-2xl border border-soul-400/15 bg-night-800/50 backdrop-blur p-8 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-soul-400/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-spirit-400/10 blur-3xl pointer-events-none" />

        <div className="relative flex items-center gap-2 mb-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-soul-400 animate-pulse-soul" />
            <span className="w-px h-4 bg-soul-400/30" />
            <span className="w-2 h-2 rounded-full bg-spirit-400 animate-pulse-soul" />
          </span>
          <span className="text-[10px] uppercase tracking-[0.25em] text-bark-300/50">
            loop × knowledge workflow
          </span>
        </div>

        <h1 className="relative font-display text-3xl text-bark-300">{wf.name}</h1>
        {wf.domain && (
          <div className="relative mt-1 text-[11px] uppercase tracking-widest text-spirit-400/80">
            {wf.domain}
          </div>
        )}
        {wf.summary && (
          <p className="relative mt-4 text-sm text-bark-300/80 max-w-2xl">{wf.summary}</p>
        )}

        <div className="relative mt-6 grid grid-cols-3 gap-5 max-w-md">
          <Metric label="agents" value={wf.agents?.length ?? 0} />
          <Metric label="memories" value={(wf.agents ?? []).reduce((s: number, a: any) => s + (a.memory_count || 0), 0)} />
          <Metric label="clones" value={wf.clones ?? 0} />
        </div>

        {(wf.tags ?? []).length > 0 && (
          <div className="relative mt-5 flex flex-wrap gap-1.5">
            {(wf.tags ?? []).map((t: string) => (
              <span key={t} className="px-2 py-0.5 rounded-full bg-soul-400/10 text-[10px] text-soul-300/80">
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="relative mt-8 rounded-xl border border-soul-400/20 bg-night-900/60 p-5">
          <div className="text-[10px] uppercase tracking-widest text-bark-300/40 mb-2">
            Clone this workflow
          </div>
          <div className="font-mono text-xs text-soul-300 select-all">{cloneCmd}</div>
          {!me && (
            <div className="mt-3 text-[11px] text-bark-300/50">
              <Link to="/" className="text-soul-300 underline">Sign in</Link> and install the /lumid CLI to clone.
            </div>
          )}
        </div>
      </div>

      {/* Bundled agents */}
      <div className="mt-10">
        <div className="font-display text-xs uppercase tracking-[0.25em] text-soul-300/70 mb-3">
          ❋ Bundled knowledge
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(wf.agents ?? []).map((a: any) => (
            <div
              key={a.agent_id}
              className="relative rounded-2xl border border-soul-400/15 bg-night-800/40 backdrop-blur p-5 overflow-hidden"
            >
              <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-atokirina-400/10 blur-3xl pointer-events-none" />
              <div className="relative flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-atokirina-400 animate-pulse-soul" />
                <span className="font-display text-lg text-bark-300">{a.agent_id}</span>
              </div>
              {a.domain && (
                <div className="relative mt-0.5 text-[10px] uppercase tracking-widest text-atokirina-400/80">{a.domain}</div>
              )}
              {a.summary && (
                <div className="relative mt-2 text-sm text-bark-300/70 line-clamp-2">{a.summary}</div>
              )}
              <div className="relative mt-3 text-xs text-bark-300/55">
                {a.memory_count ?? 0} memories
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 rounded-xl border border-dashed border-soul-400/15 bg-night-800/20 p-5 text-[11px] text-bark-300/50 leading-relaxed">
        <strong className="text-bark-300/80">What cloning does:</strong> the loop materializes in your local
        <code className="px-1 text-soul-300">~/.lumilake/research/</code> with a fresh state (zero cycles,
        no trade records). Each bundled agent's memories are copied into your
        <code className="px-1 text-soul-300">~/.xp/kg/</code> — yours to keep and diverge from the owner's updates.
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 starfield opacity-40" />
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-soul-400/10">
        <Link to="/" className="text-soul-300 font-display tracking-[0.35em] text-sm">xp.io</Link>
      </nav>
      <main className="relative z-10 mx-auto max-w-5xl px-8 py-10">
        {children}
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-widest text-bark-300/40">{label}</div>
      <div className="mt-0.5 font-display text-xl text-bark-300">{value}</div>
    </div>
  );
}
