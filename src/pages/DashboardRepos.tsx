import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listRepos, whoami, type Repo, type RepoKind } from "../api/client";
import { RepoCard } from "../components/RepoCard";

type KindTab = "" | RepoKind;

/** /dashboard/repos — my repos (all kinds + all visibility). */
export function DashboardRepos() {
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [tab, setTab] = useState<KindTab>("");

  useEffect(() => {
    (async () => {
      const me = await whoami().catch(() => null);
      if (!me) {
        setRepos([]);
        return;
      }
      const all = await listRepos({ owner: me.sub, limit: 200 }).catch(() => []);
      setRepos(all);
    })();
  }, []);

  const filtered = repos
    ? (tab ? repos.filter((r) => r.kind === tab) : repos)
    : null;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl text-bark-300">My repos</h1>
          <p className="text-sm text-bark-300/55 mt-1">
            Every app, AutoResearch loop, and agent you own.
          </p>
        </div>
        <Link
          to="/new"
          className="px-4 py-2 text-xs uppercase tracking-widest rounded-full border border-soul-400/40 text-soul-300 hover:text-soul-400 hover:border-soul-400/70"
        >
          + new repo
        </Link>
      </div>

      <div className="flex items-center gap-5 mb-6 flex-wrap">
        {([
          { id: "" as KindTab, label: "◎ All" },
          { id: "app" as KindTab, label: "⁂ Apps" },
          { id: "autoresearch" as KindTab, label: "⋯ AutoResearch" },
          { id: "agent" as KindTab, label: "❋ Agentic KG" },
        ]).map((t) => (
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

      {filtered === null ? (
        <div className="py-16 text-center text-sm text-bark-300/40">loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-soul-400/15 py-16 text-center">
          <div className="text-bark-300/55 text-sm">No repos yet.</div>
          <Link
            to="/new"
            className="mt-4 inline-block font-display text-xs uppercase tracking-[0.3em] text-soul-300 hover:text-soul-400"
          >
            ✦ plant your first seed
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((r) => (
            <RepoCard key={`${r.owner_sub}/${r.name}`} repo={r} />
          ))}
        </div>
      )}
    </div>
  );
}
