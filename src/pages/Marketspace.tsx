import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  listRepos, whoami,
  type Repo, type RepoKind, type Me,
} from "../api/client";
import { Header } from "../components/Header";
import { RepoCard } from "../components/RepoCard";

// "agentic_kg" is a virtual tab — not a real kind enum value;
// resolved client-side to a union of kind=agent and kind=skill repos.
type KindTab = "" | RepoKind | "agentic_kg";

const TABS: { id: KindTab; label: string }[] = [
  { id: "", label: "All" },
  { id: "app", label: "⁂ Apps" },
  { id: "agentic_kg", label: "❋ Knowledge" },
];

const SORTS = [
  { id: "updated", label: "Recently updated" },
  { id: "stars", label: "Most stars" },
  { id: "forks", label: "Most forks" },
  { id: "created", label: "Newest" },
  { id: "name", label: "Name" },
];

export function Marketspace() {
  const [tab, setTab] = useState<KindTab>("app");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("updated");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    whoami().then(setMe).catch(() => setMe(null));
  }, []);

  useEffect(() => {
    setLoading(true);
    if (tab === "agentic_kg") {
      // Merge kind=agent (memory snapshots) and kind=skill (procedural
      // know-how) under one tab; sort the merged list client-side.
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

  return (
    <div className="min-h-screen">
      <Header variant="marketspace" />

      <main className="mx-auto max-w-6xl px-8 py-10">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-gray-900">
            The open{" "}
            <span className="text-soul-300">AutoResearch</span>{" "}
            marketplace.
          </h1>
          <p className="mt-2 text-sm text-gray-600 max-w-xl mx-auto">
            Browse public repos. Install with one CLI line. Fork anything.{" "}
            <Link
              to="/learn"
              className="text-soul-300 hover:text-soul-400 underline-offset-2 hover:underline"
            >
              How it works →
            </Link>
          </p>
          {!me && (
            <div className="mt-5 flex items-center justify-center gap-4 flex-wrap">
              <HeroSignIn />
              <span className="text-xs text-gray-500">browse anonymously</span>
            </div>
          )}
        </header>

        {/* Search */}
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
          <div className="flex items-center gap-5">
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
          <div className="text-center text-sm text-gray-500 py-16">Loading…</div>
        ) : repos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
            <div className="text-gray-600 text-sm">Nothing here yet.</div>
            {me ? (
              <Link
                to="/new"
                className="mt-4 inline-block text-sm text-soul-300 hover:text-soul-400"
              >
                Publish the first →
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
      className="soul-ring inline-flex items-center gap-3 px-6 py-3 rounded-full bg-soul-400/20 border border-soul-400 text-soul-200 hover:text-bark-300 hover:bg-soul-400/30 transition-colors uppercase tracking-[0.25em] text-xs shadow-soul"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-soul-400 animate-pulse-soul" />
      sign in with lum.id
    </button>
  );
}
