import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  listActivity, listTrending,
  type Activity, type Repo, type RepoKind,
} from "../api/client";
import { RepoCard } from "../components/RepoCard";

const KIND_TABS: { id: "" | RepoKind; label: string }[] = [
  { id: "", label: "All" },
  { id: "app", label: "Apps" },
  { id: "autoresearch", label: "AutoResearch" },
  { id: "agent", label: "Agents" },
  { id: "skill", label: "Skills" },
];

const WINDOWS: { id: "day" | "week" | "month"; label: string }[] = [
  { id: "day", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
];

const KIND_EMOJI: Record<string, string> = {
  app: "⁂",
  autoresearch: "⋯",
  agent: "❋",
  skill: "⌘",
};

const ACTION_TEMPLATE: Record<string, string> = {
  push: "pushed to",
  star: "starred",
  fork: "forked",
  watch: "watched",
  pr_opened: "opened a PR on",
  pr_merged: "merged a PR on",
  pr_closed: "closed a PR on",
  repo_created: "created",
  transfer_accepted: "accepted transfer of",
};

function relTime(unixSec: number): string {
  const s = Math.floor(Date.now() / 1000 - unixSec);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(unixSec * 1000).toISOString().slice(0, 10);
}

export function Explore() {
  const [kind, setKind] = useState<"" | RepoKind>("");
  const [window, setWindow] = useState<"day" | "week" | "month">("week");
  const [trending, setTrending] = useState<Repo[] | null>(null);
  const [activity, setActivity] = useState<Activity[] | null>(null);

  useEffect(() => {
    setTrending(null);
    listTrending({ kind, window, limit: 12 })
      .then(setTrending)
      .catch(() => setTrending([]));
  }, [kind, window]);

  useEffect(() => {
    setActivity(null);
    listActivity({ limit: 40 })
      .then(setActivity)
      .catch(() => setActivity([]));
  }, []);

  return (
    <div className="min-h-screen">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-200">
        <Link to="/" className="text-soul-300 font-display tracking-[0.35em] text-sm">
          <span className="w-1.5 h-1.5 inline-block align-middle rounded-full bg-soul-400 shadow-[0_0_8px_rgba(62,212,193,0.9)] animate-pulse-soul mr-3" />
          xp.io
        </Link>
        <div className="flex items-center gap-4 text-xs">
          <Link to="/" className="text-gray-700 hover:text-soul-300">marketspace</Link>
          <Link to="/explore" className="text-soul-300">explore</Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Explore</h1>
          <p className="mt-2 text-sm text-gray-700">
            Trending repos and a live feed of what the xp.io community is doing.
          </p>
        </header>

        {/* Trending */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-sm font-medium text-gray-900">
              ✦ Trending
            </h2>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex gap-3">
                {KIND_TABS.map((t) => (
                  <button
                    key={t.id || "all"}
                    onClick={() => setKind(t.id)}
                    className={kind === t.id ? "text-soul-300" : "text-gray-600 hover:text-gray-900"}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <select
                value={window}
                onChange={(e) => setWindow(e.target.value as any)}
                className="appearance-none bg-white border border-gray-300 rounded-md pl-2 pr-7 py-1 text-xs text-gray-900 focus:outline-none focus:border-gray-500 bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20fill%3D%22%23374151%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20d%3D%22M5.5%208l4.5%204.5L14.5%208z%22/%3E%3C/svg%3E')] bg-no-repeat bg-right-0.5 bg-[length:1.1rem]"
              >
                {WINDOWS.map((w) => (
                  <option key={w.id} value={w.id}>{w.label}</option>
                ))}
              </select>
            </div>
          </div>
          {trending === null ? (
            <div className="text-sm text-gray-500 py-6">listening…</div>
          ) : trending.length === 0 ? (
            <div className="text-sm text-gray-500 py-6">
              Nothing's trending in this window yet.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {trending.map((r) => (
                <RepoCard key={`${r.owner_sub}/${r.name}`} repo={r} />
              ))}
            </div>
          )}
        </section>

        {/* Activity feed */}
        <section>
          <h2 className="text-sm font-medium text-gray-900 mb-4">
            ⌘ Activity
          </h2>
          {activity === null ? (
            <div className="text-sm text-gray-500 py-6">listening…</div>
          ) : activity.length === 0 ? (
            <div className="text-sm text-gray-500 py-6">No activity recorded yet.</div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-200">
              {activity.map((e, i) => {
                const verb = ACTION_TEMPLATE[e.kind] || e.kind;
                return (
                  <div key={i} className="flex items-center justify-between p-3">
                    <div className="min-w-0 text-sm">
                      <Link
                        to={`/${encodeURIComponent(e.actor_sub)}`}
                        className="font-mono text-gray-900 hover:text-soul-300"
                      >
                        {e.actor_sub.slice(0, 10)}
                      </Link>{" "}
                      <span className="text-gray-700">{verb}</span>{" "}
                      <Link
                        to={`/${e.target}`}
                        className="font-mono text-soul-300 hover:underline"
                      >
                        {e.target}
                      </Link>
                    </div>
                    <div className="text-[11px] text-gray-500 shrink-0">{relTime(e.ts)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
