import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  listActivity, listTrending,
  type Activity, type Repo, type RepoKind,
} from "../api/client";

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
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 starfield opacity-40" aria-hidden="true" />
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-soul-400/10">
        <Link to="/" className="text-soul-300 font-display tracking-[0.35em] text-sm">
          <span className="w-1.5 h-1.5 inline-block align-middle rounded-full bg-soul-400 shadow-[0_0_8px_rgba(62,212,193,0.9)] animate-pulse-soul mr-3" />
          xp.io
        </Link>
        <div className="flex items-center gap-4 text-xs">
          <Link to="/" className="text-bark-300/70 hover:text-soul-300">marketspace</Link>
          <Link to="/explore" className="text-soul-300">explore</Link>
        </div>
      </nav>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-bark-200">Explore</h1>
          <p className="mt-2 text-sm text-bark-300/60">
            Trending repos and a live feed of what the xp.io community is doing.
          </p>
        </header>

        {/* Trending */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-sm font-medium text-bark-300/80">
              ✦ Trending
            </h2>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex gap-3">
                {KIND_TABS.map((t) => (
                  <button
                    key={t.id || "all"}
                    onClick={() => setKind(t.id)}
                    className={kind === t.id ? "text-soul-300" : "text-bark-300/50 hover:text-bark-300/80"}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <select
                value={window}
                onChange={(e) => setWindow(e.target.value as any)}
                className="bg-night-800/60 border border-soul-400/15 rounded-md px-2 py-1 text-xs text-bark-300/80 focus:outline-none"
              >
                {WINDOWS.map((w) => (
                  <option key={w.id} value={w.id}>{w.label}</option>
                ))}
              </select>
            </div>
          </div>
          {trending === null ? (
            <div className="text-sm text-bark-300/40 py-6">listening…</div>
          ) : trending.length === 0 ? (
            <div className="text-sm text-bark-300/40 py-6">
              Nothing's trending in this window yet.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {trending.map((r) => (
                <Link
                  key={`${r.owner_sub}/${r.name}`}
                  to={`/${encodeURIComponent(r.owner_sub)}/${encodeURIComponent(r.name)}`}
                  className="rounded-xl border border-soul-400/10 bg-night-800/40 p-4 hover:border-soul-400/30 transition-colors"
                >
                  <div className="text-[11px] text-bark-300/55 mb-1">
                    {KIND_EMOJI[r.kind] || "◎"} {r.kind}
                  </div>
                  <div className="font-mono text-sm text-bark-300 truncate">
                    {r.owner_sub.slice(0, 10)} / <span className="text-soul-300">{r.name}</span>
                  </div>
                  {r.summary && (
                    <div className="text-xs text-bark-300/60 mt-2 line-clamp-2">{r.summary}</div>
                  )}
                  <div className="text-[11px] text-bark-300/40 mt-3">
                    ★ {r.stars} · ⑂ {r.forks}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Activity feed */}
        <section>
          <h2 className="text-sm font-medium text-bark-300/80 mb-4">
            ⌘ Activity
          </h2>
          {activity === null ? (
            <div className="text-sm text-bark-300/40 py-6">listening…</div>
          ) : activity.length === 0 ? (
            <div className="text-sm text-bark-300/40 py-6">No activity recorded yet.</div>
          ) : (
            <div className="rounded-xl border border-soul-400/10 bg-night-800/40 divide-y divide-soul-400/10">
              {activity.map((e, i) => {
                const verb = ACTION_TEMPLATE[e.kind] || e.kind;
                return (
                  <div key={i} className="flex items-center justify-between p-3">
                    <div className="min-w-0 text-sm">
                      <Link
                        to={`/${encodeURIComponent(e.actor_sub)}`}
                        className="font-mono text-bark-300/80 hover:text-soul-300"
                      >
                        {e.actor_sub.slice(0, 10)}
                      </Link>{" "}
                      <span className="text-bark-300/60">{verb}</span>{" "}
                      <Link
                        to={`/${e.target}`}
                        className="font-mono text-soul-300 hover:underline"
                      >
                        {e.target}
                      </Link>
                    </div>
                    <div className="text-[11px] text-bark-300/40 shrink-0">{relTime(e.ts)}</div>
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
