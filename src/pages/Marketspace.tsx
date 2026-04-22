import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listRepos, whoami, type Repo, type RepoKind, type Me } from "../api/client";
import { AtokirinaField } from "../components/Atokirina";
import { RepoCard } from "../components/RepoCard";

type KindTab = "" | RepoKind;

const TABS: { id: KindTab; label: string }[] = [
  { id: "", label: "◎ All" },
  { id: "app", label: "⁂ Applications" },
  { id: "autoresearch", label: "⋯ AutoResearch" },
  { id: "agent", label: "❋ Agents" },
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
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    whoami().then(setMe).catch(() => setMe(null));
  }, []);

  useEffect(() => {
    setLoading(true);
    listRepos({ q, kind: tab, sort: sort as any, limit: 60 })
      .then(setRepos)
      .catch(() => setRepos([]))
      .finally(() => setLoading(false));
  }, [q, tab, sort]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 starfield opacity-40" aria-hidden="true" />
      <AtokirinaField count={10} />

      {/* Top nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-soul-400/10">
        <Link to="/" className="text-soul-300 font-display tracking-[0.35em] text-sm">
          <span className="w-1.5 h-1.5 inline-block align-middle rounded-full bg-soul-400 shadow-[0_0_8px_rgba(62,212,193,0.9)] animate-pulse-soul mr-3" />
          xp.io
        </Link>
        <div className="flex items-center gap-6 text-[11px] uppercase tracking-widest">
          {me ? (
            <>
              <Link to="/new" className="text-soul-300 hover:text-soul-400 transition-colors">
                + new
              </Link>
              <Link to="/dashboard" className="text-bark-300/70 hover:text-soul-300 transition-colors">
                dashboard
              </Link>
            </>
          ) : (
            <SignInLink />
          )}
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-6xl px-8 py-12">
        <header className="text-center mb-10">
          <h1 className="font-display text-4xl tracking-wide text-bark-300">
            The Marketspace
          </h1>
          <p className="mt-3 text-sm text-bark-300/60 max-w-xl mx-auto">
            Applications, AutoResearch loops, and knowledge agents — versioned in git,
            forkable, pullable, mergeable.
          </p>
        </header>

        {/* Search bar */}
        <div className="max-w-xl mx-auto mb-6">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="search repos, tags, descriptions…"
            className="w-full bg-night-800/60 border border-soul-400/15 rounded-full px-5 py-2.5 text-sm text-bark-300 placeholder:text-bark-300/30 focus:outline-none focus:border-soul-400/40 transition-colors"
          />
        </div>

        {/* Tabs + sort */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div className="flex items-center gap-5 flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.id || "all"}
                onClick={() => setTab(t.id)}
                className={`font-display text-sm tracking-[0.25em] uppercase transition-colors pb-1 ${
                  tab === t.id
                    ? "text-soul-300 border-b border-soul-400"
                    : "text-bark-300/40 hover:text-bark-300/70"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-night-800/60 border border-soul-400/15 rounded-md px-3 py-1.5 text-xs text-bark-300/80 focus:outline-none focus:border-soul-400/40"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center text-sm text-bark-300/40 py-16">
            listening to the Tree…
          </div>
        ) : repos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-soul-400/15 py-16 text-center">
            <div className="text-bark-300/50 text-sm">Nothing here yet.</div>
            {me ? (
              <Link
                to="/new"
                className="mt-4 inline-block font-display text-xs uppercase tracking-[0.3em] text-soul-300 hover:text-soul-400"
              >
                ✦ plant the first seed
              </Link>
            ) : (
              <div className="mt-4 text-[11px] text-bark-300/40 uppercase tracking-widest">
                sign in to publish
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {repos.map((r) => (
              <RepoCard key={`${r.owner_sub}/${r.name}`} repo={r} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function SignInLink() {
  return (
    <button
      onClick={async () => {
        const { beginLogin } = await import("../lib/pkce");
        await beginLogin();
      }}
      className="text-soul-300 hover:text-soul-400 transition-colors uppercase tracking-widest text-[11px]"
    >
      sign in
    </button>
  );
}
