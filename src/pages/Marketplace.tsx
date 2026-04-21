import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  browseMarketplaceWorkflows,
  browseMarketplaceAgents,
  browseMarketplaceApps,
  whoami,
} from "../api/client";
import { AtokirinaField } from "../components/Atokirina";

type Tab = "workflows" | "agents" | "apps";

export function Marketplace() {
  const [tab, setTab] = useState<Tab>("workflows");
  const [q, setQ] = useState("");
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [me, setMe] = useState<{ sub: string; email: string | null } | null>(null);

  useEffect(() => {
    whoami().then(setMe).catch(() => setMe(null));
  }, []);

  useEffect(() => {
    browseMarketplaceWorkflows("", q).then((r) => setWorkflows(r.workflows)).catch(() => setWorkflows([]));
    browseMarketplaceAgents("", q).then((r) => setAgents(r.agents)).catch(() => setAgents([]));
    browseMarketplaceApps().then((r) => setApps(r.apps)).catch(() => setApps([]));
  }, [q]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 starfield opacity-40" aria-hidden="true" />
      <AtokirinaField count={14} />

      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-soul-400/10">
        <Link to="/" className="text-soul-300 font-display tracking-[0.35em] text-sm">xp.io</Link>
        <div className="flex items-center gap-6 text-[11px] uppercase tracking-widest">
          <Link to="/" className="text-bark-300/50 hover:text-soul-300 transition-colors">home</Link>
          {me ? (
            <Link to="/dashboard" className="text-bark-300/70 hover:text-soul-300 transition-colors">dashboard</Link>
          ) : (
            <Link to="/" className="text-soul-300 hover:text-soul-400 transition-colors">sign in</Link>
          )}
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-6xl px-8 py-12">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl tracking-wide text-bark-300">
            The Marketplace
          </h1>
          <p className="mt-3 text-sm text-bark-300/60 max-w-md mx-auto">
            Workflows of knowledge and research, shared by the community.
          </p>
        </div>

        {/* Tabs — glowing runes */}
        <div className="flex items-center justify-center gap-10 mb-8">
          {(["workflows", "agents", "apps"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative font-display text-sm tracking-[0.25em] uppercase transition-colors pb-2 ${
                tab === t ? "text-soul-300" : "text-bark-300/40 hover:text-bark-300/70"
              }`}
            >
              {t === "workflows" ? "⟲ Workflows" : t === "agents" ? "❋ Agents" : "⁂ Applications"}
              {tab === t && (
                <span className="absolute inset-x-0 -bottom-0.5 h-[2px] rounded-full bg-soul-400 shadow-[0_0_8px_rgba(62,212,193,0.9)]" />
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-8 flex justify-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="search the tree…"
            className="w-full max-w-md bg-night-800/60 border border-soul-400/15 rounded-full px-5 py-2.5 text-sm text-bark-300 placeholder:text-bark-300/30 focus:outline-none focus:border-soul-400/40 transition-colors"
          />
        </div>

        {tab === "workflows" && <WorkflowsTab workflows={workflows} />}
        {tab === "agents" && <AgentsTab agents={agents} />}
        {tab === "apps" && <AppsTab apps={apps} />}
      </main>
    </div>
  );
}

// ── Workflows — headline unit (twin-orb cards) ──

function WorkflowsTab({ workflows }: { workflows: any[] }) {
  if (workflows.length === 0) {
    return <EmptyPane hint="No workflows published yet. From Claude Code: /lumid research publish-workflow <loop-name>" />;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {workflows.map((w) => (
        <Link
          key={w.workflow_id}
          to={`/marketplace/workflows/${w.workflow_id}`}
          className="group relative rounded-2xl border border-soul-400/15 bg-night-800/50 backdrop-blur p-6 overflow-hidden hover:border-soul-400/35 transition-colors"
        >
          {/* twin-orb backdrop: loop ◉ + knowledge ❋ */}
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-soul-400/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-spirit-400/10 blur-3xl pointer-events-none" />

          <div className="relative flex items-center gap-2 mb-2">
            <span className="relative flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-soul-400 animate-pulse-soul" />
              <span className="w-px h-3 bg-soul-400/30" />
              <span className="w-1.5 h-1.5 rounded-full bg-spirit-400 animate-pulse-soul" />
            </span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-bark-300/40">
              loop × knowledge
            </span>
          </div>

          <div className="relative font-display text-xl text-bark-300 truncate group-hover:text-soul-200 transition-colors">
            {w.name}
          </div>
          {w.domain && (
            <div className="relative mt-0.5 text-[11px] uppercase tracking-widest text-spirit-400/80">
              {w.domain}
            </div>
          )}
          {w.summary && (
            <div className="relative mt-3 text-sm text-bark-300/75 line-clamp-2">{w.summary}</div>
          )}

          <div className="relative mt-5 grid grid-cols-3 gap-3 text-xs">
            <Metric label="agents" value={w.agent_count ?? 0} />
            <Metric label="memories" value={w.memory_count ?? 0} />
            <Metric label="clones" value={w.clones ?? 0} />
          </div>

          {(w.tags ?? []).length > 0 && (
            <div className="relative mt-4 flex flex-wrap gap-1.5">
              {(w.tags ?? []).slice(0, 4).map((t: string) => (
                <span key={t} className="px-2 py-0.5 rounded-full bg-soul-400/10 text-[10px] text-soul-300/80">
                  {t}
                </span>
              ))}
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}

function AgentsTab({ agents }: { agents: any[] }) {
  if (agents.length === 0) {
    return <EmptyPane hint="No standalone agents yet. From Claude Code: /lumid xp publish <agent-id>" />;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {agents.map((a) => (
        <Link
          key={`${a.owner_sub}/${a.agent_id}`}
          to={`/marketplace/agents/${encodeURIComponent(a.owner_sub)}/${encodeURIComponent(a.agent_id)}`}
          className="relative rounded-2xl border border-soul-400/15 bg-night-800/40 backdrop-blur p-5 hover:border-soul-400/35 transition-colors overflow-hidden"
        >
          <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-atokirina-400/10 blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-atokirina-400 animate-pulse-soul" />
            <span className="font-display text-lg text-bark-300 truncate">{a.agent_id}</span>
          </div>
          {a.domain && (
            <div className="relative mt-0.5 text-[10px] uppercase tracking-widest text-atokirina-400/80">{a.domain}</div>
          )}
          {a.summary && (
            <div className="relative mt-3 text-sm text-bark-300/75 line-clamp-2">{a.summary}</div>
          )}
          <div className="relative mt-4 flex items-center gap-3 text-xs text-bark-300/60">
            <span>{a.memory_count ?? 0} memories</span>
            {a.subscribers !== undefined && <span>· {a.subscribers} subscribers</span>}
          </div>
        </Link>
      ))}
    </div>
  );
}

function AppsTab({ apps }: { apps: any[] }) {
  if (apps.length === 0) {
    return <EmptyPane hint="Catalog is warming up — ongoing competitions and workflows will appear here." />;
  }
  const byGroup: Record<string, any[]> = {};
  for (const a of apps) {
    const k = a.source || "other";
    (byGroup[k] = byGroup[k] || []).push(a);
  }
  return (
    <div className="space-y-8">
      {Object.entries(byGroup).map(([source, items]) => (
        <div key={source}>
          <div className="font-display text-xs uppercase tracking-[0.25em] text-soul-300/70 mb-3">
            {source === "quantarena" ? "◈ QuantArena competitions" : source === "flowmesh" ? "△ FlowMesh workflows" : source}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((a, i) => (
              <a
                key={i}
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-soul-400/15 bg-night-800/40 p-4 hover:border-soul-400/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-bark-300 truncate">{a.name}</span>
                  <span className="text-[11px] uppercase tracking-widest text-soul-300/80 shrink-0 ml-2">open →</span>
                </div>
                {a.description && (
                  <div className="mt-1 text-xs text-bark-300/55 line-clamp-2">{a.description}</div>
                )}
                {Array.isArray(a.symbols) && a.symbols.length > 0 && (
                  <div className="mt-2 text-[11px] text-bark-300/40">{a.symbols.slice(0, 8).join(" · ")}</div>
                )}
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-widest text-bark-300/40">{label}</div>
      <div className="mt-0.5 font-display text-base text-bark-300">{value}</div>
    </div>
  );
}

function EmptyPane({ hint }: { hint: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-soul-400/15 bg-night-800/20 p-10 text-center">
      <div className="font-display text-2xl text-soul-300/40">∅</div>
      <div className="mt-3 text-sm text-bark-300/55 max-w-md mx-auto">{hint}</div>
    </div>
  );
}
