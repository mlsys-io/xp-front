import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  listRepos, whoami,
  type Repo, type RepoKind, type Me,
} from "../api/client";
import { RepoCard } from "../components/RepoCard";
import { WorkflowNodeFlow } from "../components/WorkflowNodeBadge";

type KindTab = "" | RepoKind | "agentic_kg";

const TABS: { id: KindTab; label: string; icon: string }[] = [
  { id: "workflow",   label: "Workflows", icon: "▷" },
  { id: "app",        label: "Apps",      icon: "⁂" },
  { id: "strategy",   label: "Strategies","icon": "◈" },
  { id: "skill",      label: "Skills",    icon: "⌘" },
  { id: "agentic_kg", label: "Knowledge", icon: "❋" },
  { id: "dataset",    label: "Datasets",  icon: "◫" },
  { id: "",           label: "All",       icon: "" },
];

const SORTS = [
  { id: "updated", label: "Recently updated" },
  { id: "stars",   label: "Stars" },
  { id: "forks",   label: "Forks" },
  { id: "created", label: "Newest" },
];

const SCENARIOS = [
  {
    icon: "📈",
    label: "Finance",
    color: "border-amber-100 bg-gradient-to-br from-amber-50 to-white hover:border-amber-200",
    accent: "text-amber-700",
    desc: "Quant signals, factor mining, live trading bots",
    intent: "research momentum signals and automate trading in US equities and crypto",
    q: "quant",
    examples: ["trading-agents", "llm-factor-miner", "crypto-momentum-regime"],
  },
  {
    icon: "📅",
    label: "Personal",
    color: "border-teal-100 bg-gradient-to-br from-teal-50 to-white hover:border-teal-200",
    accent: "text-teal-700",
    desc: "Email triage, morning briefs, weekly reflection",
    intent: "automate my morning brief, email triage, and weekly reflection",
    q: "personal",
    examples: ["morning-brief", "email-triage", "weekly-reflection"],
  },
  {
    icon: "⚙️",
    label: "Systems",
    color: "border-purple-100 bg-gradient-to-br from-purple-50 to-white hover:border-purple-200",
    accent: "text-purple-700",
    desc: "Benchmark and optimize any AI pipeline",
    intent: "continuously benchmark and optimize an AI pipeline configuration",
    q: "systems",
    examples: ["nl2sql-optimizer", "dspy-prompt-optimizer", "autoresearch-ml"],
  },
];

export function Marketspace() {
  const nav = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab]         = useState<KindTab>("workflow");
  const [q, setQ]             = useState("");
  const [sort, setSort]       = useState("updated");
  const [repos, setRepos]     = useState<Repo[]>([]);
  const [counts, setCounts]   = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [me, setMe]           = useState<Me | null>(null);
  const [intentQ, setIntentQ] = useState("");
  const [featured, setFeatured] = useState<Record<string, Repo[]>>({});

  useEffect(() => { whoami().then(setMe).catch(() => setMe(null)); }, []);

  // Load per-kind counts for tab badges
  useEffect(() => {
    const kinds: Array<KindTab> = ["workflow", "app", "strategy", "skill", "dataset"];
    Promise.all(
      kinds.map(k =>
        listRepos({ kind: k as RepoKind, limit: 100, include_forks: true })
          .then(r => [k, r.length] as [string, number])
          .catch(() => [k, 0] as [string, number])
      )
    ).then(pairs => setCounts(Object.fromEntries(pairs)));
  }, []);

  // Load featured workflows for each scenario
  useEffect(() => {
    Promise.all(
      SCENARIOS.map(s =>
        listRepos({ q: s.q, kind: "workflow" as RepoKind, limit: 3, include_forks: true })
          .then(r => [s.label, r] as [string, Repo[]])
          .catch(() => [s.label, []] as [string, Repo[]])
      )
    ).then(pairs => setFeatured(Object.fromEntries(pairs)));
  }, []);

  useEffect(() => {
    setLoading(true);
    if (tab === "agentic_kg") {
      Promise.all([
        listRepos({ q, kind: "agent", sort: sort as any, limit: 60, include_forks: true }),
        listRepos({ q, kind: "skill", sort: sort as any, limit: 60, include_forks: true }),
      ]).then(([a, s]) => {
        const merged = [...a, ...s];
        merged.sort((x, y) => (y.updated_at || 0) - (x.updated_at || 0));
        setRepos(merged.slice(0, 60));
      }).catch(() => setRepos([])).finally(() => setLoading(false));
    } else {
      listRepos({ q, kind: tab as RepoKind | "", sort: sort as any, limit: 60, include_forks: true })
        .then(setRepos).catch(() => setRepos([])).finally(() => setLoading(false));
    }
  }, [q, tab, sort]);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (intentQ.trim().length >= 5) nav(`/new/loop?intent=${encodeURIComponent(intentQ.trim())}`);
  };

  const totalWorkflows = counts["workflow"] || 0;
  const totalApps      = counts["app"] || 0;
  const totalSkills    = counts["skill"] || 0;

  return (
    <div className="min-h-screen bg-[#fafafa]">

      {/* ── Top nav ──────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-12 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-soul-400 shadow-[0_0_6px_rgba(20,184,166,0.7)] animate-pulse-soul" />
            <span className="font-display tracking-[0.3em] text-sm text-soul-300">xp.io</span>
          </Link>

          {/* Inline search */}
          <form className="flex-1 max-w-sm hidden sm:block" onSubmit={e => { e.preventDefault(); searchRef.current?.blur(); }}>
            <input
              ref={searchRef}
              value={q}
              onChange={e => { setQ(e.target.value); setTab(""); }}
              placeholder="Search workflows, skills, apps…"
              className="w-full bg-gray-50 border border-gray-200 rounded-full px-4 py-1.5 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-gray-300 focus:bg-white transition-colors"
            />
          </form>

          <div className="flex items-center gap-4 text-xs shrink-0">
            <Link to="/workflows" className="text-gray-600 hover:text-soul-300 transition-colors flex items-center gap-1">
              <span className="text-[11px]">▷</span> Workflows
            </Link>
            <Link to="/learn" className="text-gray-500 hover:text-soul-300 transition-colors hidden sm:block">Learn</Link>
            <a href="https://lum.id" className="text-gray-400 hover:text-soul-300 transition-colors hidden sm:block">← lum.id</a>
            {me ? (
              <>
                <Link to="/new" className="text-soul-300 hover:text-soul-400">+ new</Link>
                <Link to="/dashboard" className="text-gray-600 hover:text-soul-300">dashboard</Link>
              </>
            ) : (
              <SignInBtn />
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────*/}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-14 md:py-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs text-soul-300 border border-soul-400/30 bg-soul-400/8 rounded-full px-3 py-1 mb-5 font-medium tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-soul-400 animate-pulse-soul" />
              Open AutoResearch Marketplace
            </div>

            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-gray-900 leading-tight">
              AutoResearch<br />
              <span className="text-soul-300">for any domain.</span>
            </h1>

            <p className="mt-4 text-base text-gray-500 leading-relaxed max-w-lg">
              Describe your research goal. Get a workflow that runs on a schedule,
              adapts to your intent, and compounds knowledge over time.
            </p>

            <form onSubmit={handleGenerate} className="mt-7 flex gap-0 max-w-xl shadow-sm">
              <input
                value={intentQ}
                onChange={e => setIntentQ(e.target.value)}
                placeholder="e.g. research momentum signals in US equities every 12 hours"
                className="flex-1 bg-white border border-gray-300 border-r-0 rounded-l-xl px-5 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-soul-400/20 focus:border-soul-400 transition-colors"
              />
              <button
                type="submit"
                disabled={intentQ.trim().length < 5}
                className="shrink-0 bg-soul-400 hover:bg-soul-500 active:bg-soul-600 disabled:opacity-40 text-white text-sm font-medium rounded-r-xl px-6 py-3.5 transition-colors whitespace-nowrap"
              >
                Generate →
              </button>
            </form>

            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400">Try:</span>
              {SCENARIOS.map(s => (
                <button
                  key={s.label}
                  onClick={() => setIntentQ(s.intent)}
                  className="inline-flex items-center gap-1.5 text-xs border border-gray-200 rounded-full px-3 py-1 text-gray-600 hover:border-soul-400/50 hover:text-soul-400 transition-colors bg-white"
                >
                  <span>{s.icon}</span> {s.label}
                </button>
              ))}
            </div>

            {!me && (
              <div className="mt-6 flex items-center gap-3">
                <SignInBtn variant="pill" />
                <span className="text-xs text-gray-400">or browse anonymously below</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────*/}
      {(totalWorkflows + totalApps + totalSkills) > 0 && (
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-6 py-2.5 flex items-center gap-5 text-xs text-gray-500 overflow-x-auto">
            {totalWorkflows > 0 && <span><b className="text-gray-700">{totalWorkflows}</b> workflows</span>}
            {totalApps > 0      && <span><b className="text-gray-700">{totalApps}</b> apps</span>}
            {totalSkills > 0    && <span><b className="text-gray-700">{totalSkills}</b> skills</span>}
            <span className="text-gray-300">·</span>
            <span className="text-gray-400">community-built · MIT / Apache-2.0 · fully forkable</span>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-6 py-10">

        {/* ── Scenario showcase ───────────────────────────────────── */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-widest">
              Explore scenarios
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SCENARIOS.map(s => {
              const wfs = featured[s.label] || [];
              return (
                <div
                  key={s.label}
                  className={`rounded-xl border p-5 transition-all cursor-pointer ${s.color}`}
                  onClick={() => { setQ(s.q); setTab("workflow"); }}
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="text-2xl">{s.icon}</span>
                    <div>
                      <div className={`text-sm font-semibold ${s.accent}`}>{s.label}</div>
                      <div className="text-[11px] text-gray-500">{s.desc}</div>
                    </div>
                  </div>

                  {/* Example workflows */}
                  <div className="space-y-1.5">
                    {wfs.length > 0 ? wfs.map(r => (
                      <Link
                        key={r.name}
                        to={`/${encodeURIComponent(r.owner_sub)}/${r.name}`}
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1.5 group"
                      >
                        <span className="text-[11px] text-gray-400">▷</span>
                        <span className="text-xs text-gray-700 group-hover:text-soul-300 transition-colors truncate">
                          {r.display_name || r.name}
                        </span>
                      </Link>
                    )) : s.examples.map(name => (
                      <div key={name} className="flex items-center gap-1.5">
                        <span className="text-[11px] text-gray-300">▷</span>
                        <span className="text-xs text-gray-400 font-mono">{name}</span>
                      </div>
                    ))}
                  </div>

                  <div className={`mt-4 text-[11px] font-medium ${s.accent} flex items-center gap-1`}>
                    Browse {s.label} workflows →
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Browse ──────────────────────────────────────────────── */}
        <section>
          {/* Tabs row */}
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              {TABS.map(t => {
                const count = t.id === "agentic_kg"
                  ? (counts["agent"] || 0) + (counts["skill"] || 0)
                  : t.id ? (counts[t.id as string] || 0) : 0;
                return (
                  <button
                    key={t.id || "all"}
                    onClick={() => setTab(t.id)}
                    className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-all ${
                      tab === t.id
                        ? "bg-soul-400 text-white border-soul-400 font-medium shadow-sm"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-900"
                    }`}
                  >
                    {t.icon && <span className="opacity-80">{t.icon}</span>}
                    {t.label}
                    {count > 0 && (
                      <span className={`text-[10px] rounded-full px-1 min-w-[1rem] text-center ${
                        tab === t.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search…"
                className="w-40 bg-white border border-gray-200 rounded-full px-3 py-1.5 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-gray-300 focus:w-56 transition-all"
              />
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-full pl-3 pr-6 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-gray-300 bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20fill%3D%22%23374151%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20d%3D%22M5.5%208l4.5%204.5L14.5%208z%22/%3E%3C/svg%3E')] bg-no-repeat bg-right bg-[length:1rem]"
              >
                {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : repos.length === 0 ? (
            <EmptyBrowse tab={tab} me={me} intentQ={intentQ} onGenerate={() => nav(`/new/loop?intent=${encodeURIComponent(intentQ || "")}`)} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {repos.map(r => (
                <RepoCard key={`${r.owner_sub}/${r.name}`} repo={r} />
              ))}
            </div>
          )}
        </section>

        <VersionPill />
      </main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function SignInBtn({ variant = "nav" }: { variant?: "nav" | "pill" }) {
  const onClick = async () => {
    const { beginLogin } = await import("../lib/pkce");
    await beginLogin();
  };
  if (variant === "pill") {
    return (
      <button
        onClick={onClick}
        className="soul-ring inline-flex items-center gap-2 px-5 py-2 rounded-full bg-soul-400/10 border border-soul-400/50 text-soul-300 hover:bg-soul-400/20 transition-colors text-xs font-medium"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-soul-400 animate-pulse-soul" />
        Sign in with lum.id
      </button>
    );
  }
  return (
    <button onClick={onClick} className="text-gray-600 hover:text-soul-300 transition-colors text-xs">
      Sign in
    </button>
  );
}

function EmptyBrowse({ tab, me, intentQ, onGenerate }: {
  tab: KindTab; me: Me | null; intentQ: string; onGenerate: () => void;
}) {
  const isWorkflow = tab === "workflow";
  return (
    <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center">
      {isWorkflow ? (
        <>
          <div className="text-3xl mb-3">▷</div>
          <div className="text-sm font-medium text-gray-700">No workflows found.</div>
          <div className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
            Try a broader search, or generate a new workflow from your intent.
          </div>
          <button
            onClick={onGenerate}
            className="mt-4 text-sm text-soul-300 hover:text-soul-400 transition-colors"
          >
            Generate a workflow →
          </button>
        </>
      ) : (
        <>
          <div className="text-sm text-gray-500">Nothing here yet.</div>
          {me ? (
            <Link to="/new" className="mt-3 inline-block text-sm text-soul-300 hover:text-soul-400">
              Publish the first →
            </Link>
          ) : (
            <div className="mt-3 text-[11px] text-gray-400 uppercase tracking-widest">sign in to publish</div>
          )}
        </>
      )}
    </div>
  );
}

function VersionPill() {
  const [ver, setVer] = useState<string | null>(null);
  useEffect(() => {
    import("../api/client").then(({ anonApi }: any) => {
      anonApi.get("/api/v1/version").then((r: any) => setVer(r.data?.version || null)).catch(() => {});
    });
  }, []);
  if (!ver) return null;
  return <div className="mt-16 text-center text-[11px] text-gray-300">xpcloud v{ver}</div>;
}
