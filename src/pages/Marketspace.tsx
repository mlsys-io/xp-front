import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  listRepos, whoami,
  type Repo, type RepoKind, type Me,
} from "../api/client";
import { RepoCard } from "../components/RepoCard";
import { KIND_META, type KindId } from "../components/kindMeta";

const STUDIO_URL = "https://lum.id/studio/intents";
const PAGE_SIZE  = 24;

type KindTab = "" | RepoKind;

const SORTS = [
  { id: "updated", label: "Recently updated" },
  { id: "stars",   label: "Stars" },
  { id: "forks",   label: "Forks" },
  { id: "created", label: "Newest" },
];

// Internal ops loops — operational plumbing, not marketplace content.
// Hidden from no-query browse; still reachable by explicit search.
const INTERNAL_APPS = new Set(["ops", "xpio-ops"]);

// Cycle-output datasets (tagged "cycles") are per-run autoresearch telemetry —
// every app's loops auto-publish one per tenant, so the marketspace fills with
// near-duplicate "<app>-cycles" cards (e.g. 8× auto-quant-cycles). They aren't
// browsable/installable assets; they belong on each app's own page. They are
// "dataset"-kind repos, so they were cluttering the Datasets sidebar tab. Drop
// from browse + counts; genuine datasets (e.g. mbb-casebook) stay.
const hideCycles = (rs: Repo[]) => rs.filter(r => !(r.tags || []).includes("cycles"));

// Example discovery queries (NOT generation intents — they search the
// catalog). Generation lives in Studio.
const EXAMPLE_QUERIES = ["quant trading", "personal assistant", "consulting", "data labeling", "optimization"];

// Sidebar kind order. Agents appended dynamically only when non-empty.
const SIDEBAR_KINDS: KindTab[] = ["", "app", "workflow", "skill", "dataset"];

export function Marketspace() {

  const [tab, setTab]         = useState<KindTab>("");   // default: All
  const [q, setQ]             = useState("");
  const [sort, setSort]       = useState("updated");
  const [repos, setRepos]     = useState<Repo[]>([]);
  const [counts, setCounts]   = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [me, setMe]           = useState<Me | null>(null);
  const [featured, setFeatured] = useState<Repo[]>([]);
  const [page, setPage]       = useState(0);

  useEffect(() => { whoami().then(setMe).catch(() => setMe(null)); }, []);

  // Per-kind counts for the sidebar + to decide whether to show Agents.
  useEffect(() => {
    const kinds: RepoKind[] = ["workflow", "app", "skill", "dataset", "agent", "strategy"];
    Promise.all(
      kinds.map(k =>
        listRepos({ kind: k, limit: 200, include_forks: true })
          .then(r => [k, hideCycles(r).length] as [string, number])
          .catch(() => [k, 0] as [string, number])
      )
    ).then(pairs => setCounts(Object.fromEntries(pairs)));
  }, []);

  // Featured apps — the headline assets, shown as a band on the All view.
  useEffect(() => {
    listRepos({ kind: "app", sort: "updated", limit: 12, include_forks: true })
      .then(rs => setFeatured(rs.filter(r => !INTERNAL_APPS.has(r.name)).slice(0, 3)))
      .catch(() => setFeatured([]));
  }, []);

  useEffect(() => {
    setPage(0);
    setLoading(true);
    const hideInternal = (rs: Repo[]) =>
      hideCycles(q.trim() ? rs : rs.filter(r => !INTERNAL_APPS.has(r.name)));

    if (tab === "workflow") {
      // Strategies fold into Workflows — fetch both, merge by recency.
      Promise.all([
        listRepos({ q, kind: "workflow" as RepoKind, sort: sort as any, limit: 200, include_forks: true }),
        listRepos({ q, kind: "strategy" as RepoKind, sort: sort as any, limit: 200, include_forks: true }),
      ]).then(([w, s]) => {
        const merged = [...w, ...s];
        merged.sort((x, y) => (y.updated_at || 0) - (x.updated_at || 0));
        setRepos(merged);
      }).catch(() => setRepos([])).finally(() => setLoading(false));
    } else {
      listRepos({ q, kind: tab as RepoKind | "", sort: sort as any, limit: 200, include_forks: true })
        .then(rs => setRepos(hideInternal(rs)))
        .catch(() => setRepos([])).finally(() => setLoading(false));
    }
  }, [q, tab, sort]);

  // Popular domains/tags computed from what's loaded (HF-style facets).
  const popularTags = useMemo(() => {
    const c = new Map<string, number>();
    for (const r of repos) for (const t of (r.tags || [])) {
      if (t.startsWith("nodes:")) continue;
      c.set(t, (c.get(t) || 0) + 1);
    }
    return [...c.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 14).map(([t]) => t);
  }, [repos]);

  const sidebarKinds = counts["agent"] > 0 ? [...SIDEBAR_KINDS, "agent" as KindTab] : SIDEBAR_KINDS;
  const browse = (k: KindTab, query = "") => { setTab(k); setQ(query); setPage(0); };
  const showFeatured = tab === "" && !q.trim() && featured.length > 0;
  // Don't repeat the featured apps in the grid below.
  const featuredKeys = new Set(featured.map(r => `${r.owner_sub}/${r.name}`));
  const gridRepos = showFeatured ? repos.filter(r => !featuredKeys.has(`${r.owner_sub}/${r.name}`)) : repos;
  const totalPages = Math.ceil(gridRepos.length / PAGE_SIZE);
  const pagedRepos = gridRepos.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalAll = (counts["app"] || 0) + (counts["workflow"] || 0) + (counts["strategy"] || 0)
                 + (counts["skill"] || 0) + (counts["dataset"] || 0) + (counts["agent"] || 0);

  const kindCount = (k: KindTab) =>
    k === "" ? totalAll
    : k === "workflow" ? (counts["workflow"] || 0) + (counts["strategy"] || 0)
    : (counts[k as string] || 0);

  return (
    <div className="min-h-screen bg-[#fafafa]">

      {/* ── Top nav ──────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-soul-400 shadow-[0_0_6px_rgba(20,184,166,0.7)] animate-pulse-soul" />
            <span className="font-display tracking-[0.3em] text-sm text-soul-300">xp.io</span>
          </Link>

          <div className="flex items-center gap-4 text-xs shrink-0">
            <Link to="/learn" className="text-gray-500 hover:text-soul-300 transition-colors hidden sm:block">How it works</Link>
            <Link to="/git" className="text-gray-500 hover:text-soul-300 transition-colors hidden sm:block">Git</Link>
            <a href={STUDIO_URL} className="text-gray-500 hover:text-soul-300 transition-colors hidden sm:block">Studio ↗</a>
            {me ? (
              <>
                <Link to="/new" className="text-soul-300 hover:text-soul-400">+ publish</Link>
                <Link to="/dashboard" className="text-gray-600 hover:text-soul-300">dashboard</Link>
              </>
            ) : (
              <SignInBtn />
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero — pitch (left) + discovery filling the width (right) ── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-7 flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-12">
          {/* Left: pitch */}
          <div className="lg:w-[28rem] shrink-0">
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900 leading-[1.1] lg:whitespace-nowrap">
              All about <span className="text-soul-300">AI workforce.</span>
            </h1>
            <p className="mt-2.5 text-sm text-gray-600 leading-relaxed">
              A marketspace for your AI — <span className="text-gray-900 font-medium">experiments, experience, expertise</span>.{" "}
              <Link to="/learn" className="text-soul-300 hover:text-soul-400 whitespace-nowrap">See how it works →</Link>
            </p>
          </div>

          {/* Right: search — fills the remaining width */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-end gap-1.5 mb-2 flex-wrap">
              <span className="text-xs text-gray-400 mr-1">Try:</span>
              {EXAMPLE_QUERIES.slice(0, 3).map(s => (
                <button
                  key={s}
                  onClick={() => browse("", s)}
                  className="text-xs border border-gray-200 rounded-full px-2.5 py-0.5 text-gray-500 hover:border-soul-400/50 hover:text-soul-400 transition-colors bg-white"
                >
                  {s}
                </button>
              ))}
            </div>
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">⌕</span>
                <input
                  value={q}
                  onChange={e => { setQ(e.target.value); setTab(""); }}
                  placeholder="What do you want to run? e.g. quant trading, morning brief, data labeling"
                  className="w-full bg-white border border-gray-300 rounded-xl pl-11 pr-10 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-soul-400/20 focus:border-soul-400 transition-colors shadow-sm"
                />
                {q && (
                  <button type="button" onClick={() => setQ("")}
                    aria-label="Clear" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">✕</button>
                )}
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* ── Catalog: sidebar facets + main grid ────────────────────── */}
      <main className="max-w-6xl mx-auto px-6 py-8 flex gap-8">

        {/* Sidebar */}
        <aside className="w-48 shrink-0 hidden md:block">
          <div className="text-[11px] uppercase tracking-widest text-gray-400 mb-2">Browse</div>
          <nav className="space-y-0.5 mb-6">
            {sidebarKinds.map(k => {
              const m = k ? KIND_META[k as KindId] : null;
              const active = tab === k;
              return (
                <button
                  key={k || "all"}
                  onClick={() => browse(k)}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                    active ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className={m ? m.text : "text-gray-400"}>{m ? m.glyph : "✦"}</span>
                    <span className="truncate">{m ? m.label : "All"}</span>
                  </span>
                  <span className="text-[11px] text-gray-400 tabular-nums">{kindCount(k)}</span>
                </button>
              );
            })}
          </nav>

          {popularTags.length > 0 && (
            <>
              <div className="text-[11px] uppercase tracking-widest text-gray-400 mb-2">Popular</div>
              <div className="flex flex-wrap gap-1.5">
                {popularTags.map(t => (
                  <button
                    key={t}
                    onClick={() => browse("", t)}
                    className="text-[11px] text-gray-600 border border-gray-200 bg-white hover:border-soul-400/40 hover:text-soul-300 rounded-full px-2 py-0.5 transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>

        {/* Main column */}
        <section className="flex-1 min-w-0">
          {/* Mobile kind chips (sidebar hidden on mobile) */}
          <div className="md:hidden flex items-center gap-1 flex-wrap mb-4">
            {sidebarKinds.map(k => {
              const m = k ? KIND_META[k as KindId] : null;
              return (
                <button
                  key={k || "all"}
                  onClick={() => browse(k)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    tab === k ? "bg-soul-400 text-white border-soul-400 font-medium" : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {m ? m.label : "All"} {kindCount(k) > 0 && <span className="opacity-70">{kindCount(k)}</span>}
                </button>
              );
            })}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="text-sm text-gray-500">
              {q.trim() ? (
                <>Results for <span className="text-gray-900 font-medium">&quot;{q.trim()}&quot;</span>
                  {repos.length > 0 && <span className="ml-1 text-gray-400">· {repos.length}</span>}
                </>
              ) : (
                <span className="text-gray-700 font-medium">
                  {tab ? KIND_META[tab as KindId]?.label : "Everything"}
                  {repos.length > 0 && !loading && (
                    <span className="ml-2 text-xs text-gray-400 font-normal tabular-nums">
                      {gridRepos.length} {totalPages > 1 && `· page ${page + 1} of ${totalPages}`}
                    </span>
                  )}
                </span>
              )}
            </div>
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="appearance-none bg-white border border-gray-200 rounded-full pl-3 pr-6 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-gray-300 bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20fill%3D%22%23374151%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20d%3D%22M5.5%208l4.5%204.5L14.5%208z%22/%3E%3C/svg%3E')] bg-no-repeat bg-right bg-[length:1rem]"
            >
              {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>

          {/* Featured agents band (All view, no query) */}
          {showFeatured && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <span className={KIND_META.agent.text}>{KIND_META.agent.glyph}</span>
                <h2 className="text-sm font-semibold text-gray-900">Featured agents</h2>
                <span className="text-xs text-gray-400">— install in one line, runs your domain on a schedule</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {featured.map(r => <RepoCard key={`f-${r.owner_sub}/${r.name}`} repo={r} />)}
              </div>
            </div>
          )}

          {/* Grid */}
          {showFeatured && gridRepos.length > 0 && (
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Recently updated</h2>
          )}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="h-32 rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : gridRepos.length === 0 ? (
            !showFeatured && <EmptyBrowse q={q} me={me} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pagedRepos.map(r => (
                <RepoCard key={`${r.owner_sub}/${r.name}`} repo={r} />
              ))}
            </div>
          )}

          {!loading && totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
          )}

          <div className="mt-6 text-xs text-gray-400">
            open source · MIT / Apache-2.0 · fork any of them
          </div>
          <VersionPill />
        </section>
      </main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function SignInBtn() {
  const onClick = async () => {
    const { beginLogin } = await import("../lib/pkce");
    await beginLogin();
  };
  return (
    <button onClick={onClick} className="text-gray-600 hover:text-soul-300 transition-colors text-xs">
      Sign in
    </button>
  );
}

function EmptyBrowse({ q, me }: { q: string; me: Me | null }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center">
      <div className="text-sm font-medium text-gray-700">
        {q.trim() ? <>No matches for "{q.trim()}".</> : <>Nothing here yet.</>}
      </div>
      <div className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
        Try a broader search, or build a new one in{" "}
        <a href={STUDIO_URL} className="text-soul-300 hover:text-soul-400">Studio ↗</a>.
      </div>
      {me && (
        <Link to="/new" className="mt-4 inline-block text-sm text-soul-300 hover:text-soul-400">
          Publish a repo →
        </Link>
      )}
    </div>
  );
}

function Pagination({ page, totalPages, onChange }: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  // Build visible page numbers with ellipsis: always show first, last, and
  // a window of 2 around the current page.
  const pages: (number | "…")[] = [];
  for (let i = 0; i < totalPages; i++) {
    const near = Math.abs(i - page) <= 1;
    const edge = i === 0 || i === totalPages - 1;
    if (near || edge) {
      if (pages.length && pages[pages.length - 1] !== "…" && (i as number) - (pages[pages.length - 1] as number) > 1) {
        pages.push("…");
      }
      pages.push(i);
    }
  }

  const btn = (label: React.ReactNode, target: number, disabled: boolean, active = false) => (
    <button
      key={String(label)}
      disabled={disabled}
      onClick={() => !disabled && onChange(target)}
      className={`min-w-[2rem] h-8 px-2 rounded-md text-xs transition-colors ${
        active
          ? "bg-soul-400 text-white font-medium"
          : disabled
          ? "text-gray-300 cursor-default"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mt-8 flex items-center justify-center gap-1">
      {btn("← Prev", page - 1, page === 0)}
      {pages.map((p, i) =>
        p === "…"
          ? <span key={`e${i}`} className="px-1 text-gray-400 text-xs select-none">…</span>
          : btn(p + 1, p as number, false, p === page)
      )}
      {btn("Next →", page + 1, page === totalPages - 1)}
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
  return <div className="mt-2 text-[11px] text-gray-300">xpcloud v{ver}</div>;
}
