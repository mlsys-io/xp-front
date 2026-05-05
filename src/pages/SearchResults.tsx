import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  searchRepos,
  type Repo, type RepoKind,
} from "../api/client";
import { Header } from "../components/Header";
import { RepoCard } from "../components/RepoCard";

// We render results via the existing RepoCard (no fork) — keeping the
// "reuse cards" rule cleanly. Highlight-on-match is therefore scoped
// to the section header / repo name preview (handled by the server's
// exact-match-first sort, which already surfaces the strongest hits
// at the top of each kind group).

// Group order + headings for the result list. Apps lead because
// they're the headline asset on xp.io; agents trail because the
// AgenticKG pieces are smaller-grained and read better as a
// supporting band underneath the apps/skills/datasets that consume
// them.
const KIND_ORDER: RepoKind[] = ["app", "skill", "dataset", "agent"];
const KIND_LABEL: Record<RepoKind, string> = {
  app: "⁂ Applications",
  skill: "⌘ Skills",
  dataset: "▤ Datasets",
  agent: "❋ Agents",
};

/**
 * `/search?q=<text>&kind=<optional-kind>` — marketspace-wide search results.
 *
 * Reads the query from URL params (so deep-linking + back-button work),
 * fetches `/api/v1/repos/search`, and renders the results grouped by kind
 * using the same RepoCard component the kind-landing pages use.
 */
export function SearchResults() {
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const kind = (params.get("kind") || "") as RepoKind | "";

  const [results, setResults] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    searchRepos({ q, kind: kind || undefined, limit: 100 })
      .then(setResults)
      .catch((e) => {
        setErr(e?.response?.data?.detail || e?.message || "search failed");
        setResults([]);
      })
      .finally(() => setLoading(false));
  }, [q, kind]);

  // Group by kind, preserving server-side order within each group.
  const groups = useMemo(() => {
    const by: Record<string, Repo[]> = {};
    for (const r of results) (by[r.kind] = by[r.kind] || []).push(r);
    return KIND_ORDER
      .map((k) => ({ kind: k, repos: by[k] || [] }))
      .filter((g) => g.repos.length > 0);
  }, [results]);

  return (
    <div className="min-h-screen">
      <Header variant="searchResults" />

      <main className="mx-auto max-w-6xl px-8 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            Search results for <span className="text-soul-300">"{q}"</span>
            {kind && <span className="ml-2 text-sm text-gray-500 uppercase tracking-widest">· {kind}</span>}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {loading ? "searching the Tree…"
              : err ? <span className="text-atokirina-400">{err}</span>
              : `${results.length} match${results.length === 1 ? "" : "es"}`}
          </p>
        </header>

        {!loading && !err && results.length === 0 && q.trim() && (
          <EmptyState />
        )}

        {!q.trim() && (
          <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-600">
            Type a query into the search bar above to begin.
          </div>
        )}

        {groups.map((g) => (
          <section key={g.kind} className="mb-10">
            <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-3 border-b border-gray-100 pb-1">
              {KIND_LABEL[g.kind]} <span className="text-gray-400">({g.repos.length})</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {g.repos.map((r) => (
                <RepoCard key={`${r.owner_sub}/${r.name}`} repo={r} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
      <div className="text-gray-700 text-sm font-medium">No matches</div>
      <p className="mt-2 text-xs text-gray-500">
        Nothing matched all of those tokens. Try fewer / broader terms,
        or browse by kind:
      </p>
      <div className="mt-4 flex items-center justify-center gap-4 flex-wrap text-[11px] uppercase tracking-widest text-gray-500">
        <Link to="/apps" className="hover:text-soul-300 transition-colors">⁂ apps</Link>
        <Link to="/skills" className="hover:text-soul-300 transition-colors">⌘ skills</Link>
        <Link to="/datasets" className="hover:text-soul-300 transition-colors">▤ datasets</Link>
        <Link to="/agents" className="hover:text-soul-300 transition-colors">❋ agents</Link>
      </div>
    </div>
  );
}

