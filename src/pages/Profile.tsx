import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  listRepos,
  logout,
  whoami,
  type Me,
  type Repo as RepoT,
} from "../api/client";
import { AtokirinaField } from "../components/Atokirina";
import { RepoCard } from "../components/RepoCard";

/**
 * /:owner — profile page for a user. Shows their public repos (or all, if
 * the caller IS the owner). owner_sub is a UUID; pretty handles are a
 * future concern.
 */
export function Profile() {
  const { owner = "" } = useParams();
  const [me, setMe] = useState<Me | null>(null);
  const [repos, setRepos] = useState<RepoT[] | null>(null);

  useEffect(() => {
    whoami().then(setMe).catch(() => setMe(null));
  }, []);

  useEffect(() => {
    setRepos(null);
    listRepos({ owner, limit: 200, include_forks: true })
      .then(setRepos)
      .catch(() => setRepos([]));
  }, [owner]);

  const isMe = !!me && me.sub === owner;
  const initials = owner.slice(0, 2).toUpperCase();
  const shortSub = owner.length > 12 ? owner.slice(0, 12) + "…" : owner;

  const byKind = {
    app: repos?.filter((r) => r.kind === "app").length ?? 0,
    autoresearch: repos?.filter((r) => r.kind === "autoresearch").length ?? 0,
    agent: repos?.filter((r) => r.kind === "agent").length ?? 0,
    skill: repos?.filter((r) => r.kind === "skill").length ?? 0,
  };
  const totalStars = repos?.reduce((a, r) => a + (r.stars || 0), 0) ?? 0;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 starfield opacity-30" aria-hidden="true" />
      <AtokirinaField count={6} />

      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-gray-200">
        <Link to="/" className="text-soul-300 font-display tracking-[0.35em] text-sm">
          <span className="w-1.5 h-1.5 inline-block align-middle rounded-full bg-soul-400 shadow-[0_0_8px_rgba(62,212,193,0.9)] animate-pulse-soul mr-3" />
          xp.io
        </Link>
        <div className="flex items-center gap-6 text-[11px] uppercase tracking-widest">
          {me ? (
            <>
              <Link to="/dashboard" className="text-gray-700 hover:text-soul-300">dashboard</Link>
              <button
                onClick={async () => {
                  try { await logout(); } catch { /* cookie cleared server-side */ }
                  window.location.href = "/";
                }}
                className="text-gray-700 hover:text-atokirina-400 transition-colors uppercase tracking-widest text-[11px]"
              >
                sign out
              </button>
            </>
          ) : null}
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-5xl px-8 py-12">
        {/* Header */}
        <header className="flex items-start gap-6 mb-10 flex-wrap">
          <div className="shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-spirit-400 to-soul-400 flex items-center justify-center text-2xl font-semibold text-night-900 shadow-soul">
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-3xl text-bark-300">
              {shortSub}
              {isMe && (
                <span className="ml-3 text-[11px] uppercase tracking-widest text-soul-400/70">
                  ← that's you
                </span>
              )}
            </h1>
            <div className="mt-1 text-xs text-gray-500 font-mono break-all">
              {owner}
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-700">
              <span>
                <span className="text-gray-900 font-display text-base mr-1">
                  {repos?.length ?? "—"}
                </span>
                repo{repos?.length === 1 ? "" : "s"}
              </span>
              <span className="flex items-center gap-1">
                <span className="text-atokirina-400">★</span>
                {totalStars}
              </span>
            </div>
          </div>
          {isMe && (
            <div className="ml-auto">
              <Link
                to="/dashboard/repos"
                className="px-4 py-2 text-xs uppercase tracking-widest rounded-full border border-gray-300 text-soul-300 hover:text-soul-400 hover:border-soul-400"
              >
                go to dashboard
              </Link>
            </div>
          )}
        </header>

        {/* Stat strip */}
        {repos && repos.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2 text-[11px] uppercase tracking-widest text-gray-600">
            <span className="border border-gray-200 rounded-full px-3 py-1">
              <span className="text-soul-300 mr-1">⁂</span> {byKind.app} app{byKind.app === 1 ? "" : "s"}
            </span>
            <span className="border border-gray-200 rounded-full px-3 py-1">
              <span className="text-soul-300 mr-1">⋯</span> {byKind.autoresearch} autoresearch
            </span>
            <span className="border border-gray-200 rounded-full px-3 py-1">
              <span className="text-soul-300 mr-1">❋</span> {byKind.agent} agentic kg
            </span>
            <span className="border border-gray-200 rounded-full px-3 py-1">
              <span className="text-soul-300 mr-1">⌘</span> {byKind.skill} skill{byKind.skill === 1 ? "" : "s"}
            </span>
          </div>
        )}

        {/* Repo grid */}
        {repos === null ? (
          <div className="py-16 text-center text-sm text-gray-500">listening to the Tree…</div>
        ) : repos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center">
            <div className="text-gray-700 text-sm">
              {isMe ? "You don't have any repos yet." : "No public repos here."}
            </div>
            {isMe && (
              <Link
                to="/new"
                className="mt-4 inline-block font-display text-xs uppercase tracking-[0.3em] text-soul-300 hover:text-soul-400"
              >
                ✦ plant your first seed
              </Link>
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
