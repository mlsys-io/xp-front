import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  listRepos, listMarketspaceLoops, logout, whoami,
  type Repo, type RepoKind, type Me, type MarketspaceLoop,
} from "../api/client";
import { RepoCard } from "../components/RepoCard";

// "agentic_kg" is a virtual tab id — not a real kind enum value;
// resolved client-side to a union of kind=agent and kind=skill repos.
type KindTab = "" | RepoKind | "agentic_kg";

// Two top-level peers — Application (which contains its own loops and
// dataset pins) and Agentic KG (memory snapshots + procedural skills).
// AutoResearch loops live INSIDE applications (browsable from an app's
// detail page); standalone autoresearch repos are still creatable but
// surface in the All tab. Datasets are typically pinned by a loop and
// followed via the application's "depends on" links.
const TABS: { id: KindTab | "agentic_kg"; label: string }[] = [
  { id: "", label: "◎ All" },
  { id: "app", label: "⁂ Applications" },
  { id: "agentic_kg", label: "❋ Agentic KG" },
];

const SORTS: { id: string; label: string }[] = [
  { id: "updated", label: "Recently updated" },
  { id: "stars", label: "Most stars" },
  { id: "forks", label: "Most forks" },
  { id: "created", label: "Newest" },
  { id: "name", label: "Name" },
];

/**
 * Public marketspace — the xp.io landing page.
 *
 * Anonymous browse: everyone sees public repos. Clicking into a repo, forking,
 * starring, or creating redirects to sign-in (that's enforced at the API layer,
 * we just soft-promote sign-in here).
 */
export function Marketspace() {
  const [tab, setTab] = useState<KindTab>("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("updated");
  const [repos, setRepos] = useState<Repo[]>([]);
  // AutoResearch tab unions standalone kind=autoresearch repos with
  // loops aggregated out of kind=app manifests. Stored separately so
  // the rest of the marketspace (which is repo-shaped) doesn't need
  // to type-narrow.
  const [loops, setLoops] = useState<MarketspaceLoop[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    whoami().then(setMe).catch(() => setMe(null));
  }, []);

  useEffect(() => {
    setLoading(true);
    // Public marketspace hides forks — they duplicate upstream with no
    // differentiating content. Forks are still discoverable via the
    // upstream's header link and the user's own dashboard.
    if (tab === "agentic_kg") {
      // Merge kind=agent (memory snapshots) + kind=skill (procedural
      // know-how). Both are flavors of knowledge — surface them
      // together under one tab. Sort the merged list client-side.
      Promise.all([
        listRepos({ q, kind: "agent", sort: sort as any, limit: 60, include_forks: false }),
        listRepos({ q, kind: "skill", sort: sort as any, limit: 60, include_forks: false }),
      ])
        .then(([a, s]) => {
          const merged = [...a, ...s];
          merged.sort((x, y) => (y.updated_at || 0) - (x.updated_at || 0));
          setRepos(merged.slice(0, 60));
        })
        .catch(() => setRepos([]))
        .finally(() => setLoading(false));
    } else {
      listRepos({ q, kind: tab as RepoKind | "", sort: sort as any, limit: 60,
                  include_forks: false })
        .then(setRepos)
        .catch(() => setRepos([]))
        .finally(() => setLoading(false));
    }
  }, [q, tab, sort]);

  return (
    <div className="min-h-screen">
      {/* Top nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-200">
        <Link to="/" className="text-soul-300 font-display tracking-[0.35em] text-sm">
          <span className="w-1.5 h-1.5 inline-block align-middle rounded-full bg-soul-400 shadow-[0_0_8px_rgba(62,212,193,0.9)] animate-pulse-soul mr-3" />
          xp.io
        </Link>
        <div className="flex items-center gap-4 text-xs">
          <a
            href="https://lum.id"
            className="text-gray-500 hover:text-soul-300 transition-colors"
            title="The Lumid ecosystem — xp.io is the marketspace tier"
          >
            ← lum.id
          </a>
          {me ? (
            <>
              <Link to="/new" className="text-soul-300 hover:text-soul-400 transition-colors">
                + new
              </Link>
              <Link
                to={`/${encodeURIComponent(me.sub)}`}
                className="text-gray-700 hover:text-soul-300 transition-colors"
              >
                profile
              </Link>
              <Link to="/dashboard" className="text-gray-700 hover:text-soul-300 transition-colors">
                dashboard
              </Link>
              <SignOutLink />
            </>
          ) : (
            <SignInLink variant="primary" />
          )}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-8 py-10">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-gray-900">
            The Marketspace
          </h1>
          <p className="mt-2 text-sm text-gray-600 max-w-2xl mx-auto">
            Two things to browse: <strong>⁂ Applications</strong> (each
            holds its own ↻ AutoResearch loops and ▤ datasets) and{" "}
            <strong>❋ Agentic KG</strong> (shareable memory + skills).{" "}
            <ModelToggle />
          </p>
          {!me && (
            <div className="mt-5 flex items-center justify-center gap-4 flex-wrap">
              <SignInLink variant="hero" />
              <span className="text-xs text-gray-500">
                or keep browsing anon
              </span>
            </div>
          )}
        </header>

        {/* Search bar */}
        <div className="max-w-xl mx-auto mb-6">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="search repos, tags, descriptions…"
            className="w-full bg-gray-50 border border-gray-200 rounded-full px-5 py-2.5 text-sm text-bark-300 placeholder:text-gray-500 focus:outline-none focus:border-gray-300 transition-colors"
          />
        </div>

        {/* Tabs + sort */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div className="flex items-center gap-5 flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.id || "all"}
                onClick={() => setTab(t.id)}
                className={`text-sm transition-colors pb-1 border-b-2 ${
                  tab === t.id
                    ? "text-gray-900 border-soul-400 font-medium"
                    : "text-gray-700 border-transparent hover:text-gray-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-8 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-gray-500 bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20fill%3D%22%23374151%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20d%3D%22M5.5%208l4.5%204.5L14.5%208z%22/%3E%3C/svg%3E')] bg-no-repeat bg-right-0.5 bg-[length:1.25rem]"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center text-sm text-gray-500 py-16">
            listening to the Tree…
          </div>
        ) : repos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
            <div className="text-gray-600 text-sm">Nothing here yet.</div>
            {me ? (
              <Link
                to="/new"
                className="mt-4 inline-block text-sm text-soul-300 hover:text-soul-400"
              >
                ✦ plant the first seed
              </Link>
            ) : (
              <div className="mt-4 text-[11px] text-gray-500 uppercase tracking-widest">
                sign in to publish
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

// Tiny version pill anchored at the bottom of the marketspace.
// Reads /api/v1/version once and displays "xpcloud v0.2.0" so the
// schema generation is identifiable at a glance. Silent failure if
// the endpoint isn't reachable — UI never depends on it.
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
      xpcloud v{ver} · 5-primitive schema
    </div>
  );
}

// Inline "What's an Application?" toggle. Keeps the marketspace
// header clean by default; expands to the 5-primitive crib sheet
// only when a curious visitor clicks.
function ModelToggle() {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-soul-300 hover:text-soul-400 underline-offset-2 hover:underline"
      >
        What's an Application?
      </button>
    );
  }
  return (
    <span className="block mt-3 mx-auto max-w-2xl text-left rounded-lg border border-gray-200 bg-white p-3 text-[12px]">
      <button
        onClick={() => setOpen(false)}
        className="float-right text-gray-400 hover:text-gray-700 -mt-0.5"
        aria-label="Hide"
      >
        ✕
      </button>
      <pre className="font-mono leading-snug text-[11.5px] text-gray-700 overflow-x-auto m-0">{`Two things on the marketspace:

  ⁂ Application                ← top tier
   ├── domain goal             what it exists to get better at
   ├── roles[]                 LLM personas + their knowledge banks
   ├── ↻ autoresearch loops    one or more (the moat — runs on a
   │     ├── steps[]           schedule, learns, compounds)
   │     └── ▤ datasets        loop-pinned for reproducibility
   │                           (each dataset carries its own
   │                            benchmark / scoring contract)
   └── human_inbox             expert PRs

  ❋ Agentic KG                 ← top tier (peer of Application)
   ├── memory snapshots         bank.jsonl + bandit.json — pull to
   │                            seed an app's knowledge agent
   └── ⌘ skills                 SKILL.md + Python impl — imported
                                into apps via skill_imports[]`}</pre>
      <p className="mt-2 text-[11px] text-gray-500">
        Everything's a git repo — forkable, pullable, mergeable.
        AutoResearch is the moat: a loop keeps refining itself across
        cycles and the knowledge sticks. Datasets travel with the loop
        that pins them so two users running the same benchmark see
        identical inputs.
      </p>
    </span>
  );
}

// Compact card for a single autoresearch loop — works whether the loop
// ships standalone (kind=autoresearch repo) or lives inside a published
// app's manifest. Click takes you to the host repo so you can read the
// full spec / install / fork.
function LoopCard({ loop }: { loop: MarketspaceLoop }) {
  const repoHref = `/${encodeURIComponent(loop.repo_owner)}/${encodeURIComponent(loop.repo_name)}`;
  return (
    <Link
      to={repoHref}
      className="rounded-xl border border-gray-200 bg-white p-4 hover:border-soul-300 transition-colors flex flex-col gap-2"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-gray-900">↻ {loop.display_name}</span>
        <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
          loop.source === "standalone"
            ? "bg-soul-100 text-soul-700"
            : "bg-gray-100 text-gray-600"
        }`}>
          {loop.source === "standalone" ? "template" : `in ${loop.repo_name}`}
        </span>
      </div>
      {loop.summary && (
        <p className="text-xs text-gray-600 line-clamp-2">{loop.summary}</p>
      )}
      <div className="flex flex-wrap gap-1.5 text-[10px] text-gray-500 mt-auto">
        {loop.schedule && <span className="px-1.5 py-0.5 rounded bg-gray-100">⏱ {loop.schedule}</span>}
        {loop.primary_role && <span className="px-1.5 py-0.5 rounded bg-gray-100">role: {loop.primary_role}</span>}
        {loop.benchmark_set && <span className="px-1.5 py-0.5 rounded bg-gray-100">vs {loop.benchmark_set}</span>}
        {loop.mode && loop.mode !== "paper" && (
          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">{loop.mode}</span>
        )}
      </div>
    </Link>
  );
}

function SignOutLink() {
  return (
    <button
      onClick={async () => {
        try { await logout(); } catch { /* ignore; cookie is cleared server-side */ }
        // Land back on the public marketspace, signed out.
        window.location.href = "/";
      }}
      className="text-gray-700 hover:text-atokirina-400 transition-colors uppercase tracking-widest text-[11px]"
    >
      sign out
    </button>
  );
}

function SignInLink({ variant = "nav" }: { variant?: "nav" | "primary" | "hero" }) {
  const onClick = async () => {
    const { beginLogin } = await import("../lib/pkce");
    await beginLogin();
  };
  if (variant === "primary") {
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-soul-400/15 border border-gray-300 text-soul-300 hover:bg-soul-400/25 hover:border-soul-400 transition-colors uppercase tracking-widest text-[11px]"
      >
        sign up · sign in
      </button>
    );
  }
  if (variant === "hero") {
    return (
      <button
        onClick={onClick}
        className="soul-ring inline-flex items-center gap-3 px-6 py-3 rounded-full bg-soul-400/20 border border-soul-400 text-soul-200 hover:text-bark-300 hover:bg-soul-400/30 transition-colors uppercase tracking-[0.25em] text-xs shadow-soul"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-soul-400 animate-pulse-soul" />
        sign in with lum.id
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className="text-gray-700 hover:text-soul-300 transition-colors uppercase tracking-widest text-[11px]"
    >
      sign in
    </button>
  );
}
