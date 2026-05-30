import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  listRepos, listMarketCollections, whoami,
  type Repo, type RepoKind, type Me, type MarketCollection,
} from "../api/client";
import { Header } from "../components/Header";
import { RepoCard } from "../components/RepoCard";

// "agentic_kg" is a virtual tab — merges kind=agent + kind=skill.
type KindTab = "" | RepoKind | "agentic_kg";

// Workflow comes first — it's the primary output of the intent flow.
const TABS: { id: KindTab; label: string; icon: string }[] = [
  { id: "",           label: "All",       icon: "" },
  { id: "workflow",   label: "Workflows", icon: "▷" },
  { id: "app",        label: "Apps",      icon: "⁂" },
  { id: "agentic_kg", label: "Knowledge", icon: "❋" },
  { id: "skill",      label: "Skills",    icon: "⌘" },
  { id: "dataset",    label: "Datasets",  icon: "◫" },
];

const SORTS = [
  { id: "updated", label: "Recently updated" },
  { id: "stars",   label: "Most stars" },
  { id: "forks",   label: "Most forks" },
  { id: "created", label: "Newest" },
  { id: "name",    label: "Name" },
];

// Three scenario starters — each pre-fills the intent input.
const SCENARIOS = [
  {
    icon: "📈",
    label: "Finance",
    desc: "Quant signals, portfolio, trading bots",
    intent: "research momentum signals and automate trading in US equities and crypto",
    q: "quant",
  },
  {
    icon: "📅",
    label: "Personal",
    desc: "Email triage, calendar, daily briefs",
    intent: "automate my morning brief, email triage, and weekly reflection",
    q: "personal",
  },
  {
    icon: "⚙️",
    label: "Systems",
    desc: "Optimize any pipeline, model, or tool",
    intent: "continuously benchmark and optimize an AI pipeline configuration",
    q: "systems",
  },
];

export function Marketspace() {
  const nav = useNavigate();
  const [tab, setTab]         = useState<KindTab>("workflow");
  const [q, setQ]             = useState("");
  const [sort, setSort]       = useState("updated");
  const [repos, setRepos]     = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe]           = useState<Me | null>(null);
  const [intentQ, setIntentQ] = useState("");
  const [collections, setCollections] = useState<MarketCollection[]>([]);

  useEffect(() => {
    listMarketCollections().then(setCollections).catch(() => setCollections([]));
  }, []);

  useEffect(() => {
    whoami().then(setMe).catch(() => setMe(null));
  }, []);

  useEffect(() => {
    setLoading(true);
    if (tab === "agentic_kg") {
      Promise.all([
        listRepos({ q, kind: "agent", sort: sort as any, limit: 60, include_forks: true }),
        listRepos({ q, kind: "skill", sort: sort as any, limit: 60, include_forks: true }),
      ])
        .then(([a, s]) => {
          const merged = [...a, ...s];
          merged.sort((x, y) => (y.updated_at || 0) - (x.updated_at || 0));
          setRepos(merged.slice(0, 60));
        })
        .catch(() => setRepos([]))
        .finally(() => setLoading(false));
    } else {
      listRepos({ q, kind: tab as RepoKind | "", sort: sort as any, limit: 60, include_forks: true })
        .then(setRepos)
        .catch(() => setRepos([]))
        .finally(() => setLoading(false));
    }
  }, [q, tab, sort]);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (intentQ.trim().length >= 5) {
      nav(`/new/loop?intent=${encodeURIComponent(intentQ.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Header variant="marketspace" />

      <main className="mx-auto max-w-5xl px-6 py-10">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="mb-10">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
              Describe what you want.{" "}
              <span className="text-soul-300">Get a workflow.</span>
            </h1>
            <p className="mt-1.5 text-sm text-gray-500 max-w-lg mx-auto">
              A workflow is a sequence of agents, LLMs, and operations that
              runs on a schedule and learns. Browse the community library —
              or generate one from your intent.
            </p>
          </div>

          {/* Intent input — primary action */}
          <form onSubmit={handleGenerate} className="max-w-2xl mx-auto">
            <div className="flex gap-2 shadow-sm">
              <input
                value={intentQ}
                onChange={(e) => setIntentQ(e.target.value)}
                placeholder="e.g. research momentum signals in US equities every 12 hours"
                className="flex-1 bg-white border border-gray-300 rounded-l-lg px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-soul-400/30 focus:border-soul-400 transition-colors"
              />
              <button
                type="submit"
                disabled={intentQ.trim().length < 5}
                className="shrink-0 bg-soul-400 hover:bg-soul-500 disabled:opacity-40 text-white text-sm font-medium rounded-r-lg px-5 py-3 transition-colors whitespace-nowrap"
              >
                Generate workflow →
              </button>
            </div>
          </form>

          {/* Scenario tiles */}
          <div className="max-w-2xl mx-auto mt-4 grid grid-cols-3 gap-2">
            {SCENARIOS.map((s) => (
              <button
                key={s.label}
                onClick={() => {
                  setIntentQ(s.intent);
                  setQ(s.q);
                  setTab("workflow");
                }}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left hover:border-soul-400/50 hover:shadow-sm transition-all group"
              >
                <span className="text-lg">{s.icon}</span>
                <div>
                  <div className="text-xs font-medium text-gray-900 group-hover:text-soul-300 transition-colors">{s.label}</div>
                  <div className="text-[11px] text-gray-500 leading-tight">{s.desc}</div>
                </div>
              </button>
            ))}
          </div>

          {!me && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <HeroSignIn />
              <span className="text-xs text-gray-400">or browse anonymously</span>
            </div>
          )}
        </section>

        {/* ── Collections row ────────────────────────────────────── */}
        {collections.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 mb-6">
            {collections.map((c) => (
              <button
                key={c.id}
                onClick={() => { setQ(c.tags[0] || c.label.toLowerCase()); setTab(""); }}
                title={c.description}
                className="flex flex-col items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-2.5 text-center hover:border-soul-300 hover:shadow-sm transition-all group"
              >
                <span className="text-lg">{c.icon}</span>
                <span className="text-[11px] font-medium text-gray-700 group-hover:text-soul-400 transition-colors">{c.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Browse bar ─────────────────────────────────────────── */}
        <div className="mb-6">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search workflows, apps, skills, tags…"
            className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-300 transition-colors"
          />
        </div>

        {/* ── Tabs + sort ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6 border-b border-gray-200 pb-3">
          <div className="flex items-center gap-1 flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.id || "all"}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${
                  tab === t.id
                    ? "bg-soul-400/10 text-soul-300 font-medium"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {t.icon && <span className="text-[13px]">{t.icon}</span>}
                {t.label}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-md pl-3 pr-7 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-gray-400 bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20fill%3D%22%23374151%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20d%3D%22M5.5%208l4.5%204.5L14.5%208z%22/%3E%3C/svg%3E')] bg-no-repeat bg-right-0.5 bg-[length:1.25rem]"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* ── Grid ─────────────────────────────────────────────────── */}
        {loading ? (
          <div className="text-center text-sm text-gray-400 py-16">Loading…</div>
        ) : repos.length === 0 ? (
          <EmptyState tab={tab} me={me} onGenerate={() => nav(`/new/loop?intent=${encodeURIComponent(intentQ || "")}`)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {repos.map((r) => (
              <RepoCard key={`${r.owner_sub}/${r.name}`} repo={r} />
            ))}
          </div>
        )}

        <VersionPill />
      </main>
    </div>
  );
}

function EmptyState({ tab, me, onGenerate }: { tab: KindTab; me: Me | null; onGenerate: () => void }) {
  const isWorkflow = tab === "workflow";
  return (
    <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center">
      {isWorkflow ? (
        <>
          <div className="text-3xl mb-3">▷</div>
          <div className="text-gray-700 text-sm font-medium">No workflows here yet.</div>
          <div className="text-gray-500 text-xs mt-1 max-w-xs mx-auto">
            Describe your intent above to generate one, or publish a workflow from the CLI.
          </div>
          <button
            onClick={onGenerate}
            className="mt-4 inline-flex items-center gap-2 text-sm text-soul-300 hover:text-soul-400 transition-colors"
          >
            Generate a workflow →
          </button>
        </>
      ) : (
        <>
          <div className="text-gray-500 text-sm">Nothing here yet.</div>
          {me ? (
            <Link to="/new" className="mt-4 inline-block text-sm text-soul-300 hover:text-soul-400">
              Publish the first →
            </Link>
          ) : (
            <div className="mt-4 text-[11px] text-gray-400 uppercase tracking-widest">sign in to publish</div>
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
      anonApi.get("/api/v1/version")
        .then((r: any) => setVer(r.data?.version || null))
        .catch(() => setVer(null));
    });
  }, []);
  if (!ver) return null;
  return (
    <div className="mt-12 text-center text-[11px] text-gray-400">
      xpcloud v{ver}
    </div>
  );
}

function HeroSignIn() {
  const onClick = async () => {
    const { beginLogin } = await import("../lib/pkce");
    await beginLogin();
  };
  return (
    <button
      onClick={onClick}
      className="soul-ring inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-soul-400/15 border border-soul-400/50 text-soul-300 hover:bg-soul-400/25 hover:border-soul-400 transition-colors text-xs font-medium shadow-soul"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-soul-400 animate-pulse-soul" />
      Sign in with lum.id
    </button>
  );
}
