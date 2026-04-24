import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listRepos, logout, whoami, type Repo, type RepoKind, type Me } from "../api/client";
import { RepoCard } from "../components/RepoCard";

type KindTab = "" | RepoKind;

const TABS: { id: KindTab; label: string }[] = [
  { id: "", label: "◎ All" },
  { id: "app", label: "⁂ Applications" },
  { id: "autoresearch", label: "⋯ AutoResearch" },
  { id: "agent", label: "❋ Agentic KG" },
  { id: "skill", label: "⌘ Skills" },
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
    // Public marketspace hides forks — they duplicate upstream with no
    // differentiating content. Forks are still discoverable via the
    // upstream's header link and the user's own dashboard.
    listRepos({ q, kind: tab, sort: sort as any, limit: 60,
                include_forks: false })
      .then(setRepos)
      .catch(() => setRepos([]))
      .finally(() => setLoading(false));
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

      <main className="mx-auto max-w-6xl px-8 py-12">
        <header className="text-center mb-10">
          <h1 className="text-3xl font-semibold text-gray-900">
            The Marketspace
          </h1>
          <p className="mt-3 text-sm text-gray-700 max-w-xl mx-auto">
            Applications, AutoResearch loops, skills, and Agentic KGs — versioned in git,
            forkable, pullable, mergeable.
          </p>
          {!me && (
            <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
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
      </main>
    </div>
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
