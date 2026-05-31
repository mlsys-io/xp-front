import { useNavigate } from "react-router-dom";
import type { Repo } from "../api/client";
import { AuthorBadge } from "./AuthorBadge";
import { isRepoTaggedDeprecated } from "./DeprecationBanner";
import { kindMetaOf } from "./kindMeta";
import { timeAgo } from "../lib/time";

const COMMUNITY_OWNER = "00000000-0000-0000-0000-000000000001";

// Compact, scannable card: a kind-colored icon tile anchors each row,
// with title + author meta, a 2-line summary, and a tiny freshness/metrics
// footer. Metrics render ONLY when > 0 (catalog stars/forks are mostly 0),
// so a quiet repo shows just "updated · vX". Tags / adapter-status /
// upstream-health moved to the detail page — noise at grid scale.
export function RepoCard({ repo }: { repo: Repo }) {
  const nav = useNavigate();
  const {
    owner_sub, name, display_name, summary, tags, stars, forks, kind, fork_of,
    consumers_count, downloads, version, updated_at,
  } = repo;
  const deprecated = isRepoTaggedDeprecated(tags);
  const isCommunity = owner_sub === COMMUNITY_OWNER;
  const m = kindMetaOf(kind);
  const updated = timeAgo(updated_at);

  const openRepo = () =>
    nav(`/${encodeURIComponent(owner_sub)}/${encodeURIComponent(name)}`);

  return (
    <div
      onClick={openRepo}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openRepo(); }
      }}
      role="link"
      tabIndex={0}
      className={`group rounded-lg border border-gray-200 border-l-2 ${m.accent} bg-white px-3.5 py-3 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer focus:outline-none focus:border-soul-400`}
    >
      <div className="flex items-start gap-3">
        <span className={`shrink-0 w-8 h-8 rounded-md grid place-items-center text-sm ${m.tile} ${m.text}`}>
          {m.glyph}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-semibold text-[15px] leading-tight text-gray-900">
              {display_name || name}
            </h3>
            {fork_of && <span title="fork" className="shrink-0 text-gray-300 text-xs">⑂</span>}
            {deprecated && (
              <span title="deprecated" className="shrink-0 text-[9px] uppercase tracking-wide rounded border border-amber-300 bg-amber-50 text-amber-700 px-1">
                dep
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5">
            <span className="font-mono">{kind}</span>
            <span>·</span>
            {isCommunity ? <span className="text-sky-600">community</span> : <AuthorBadge owner_sub={owner_sub} />}
          </div>
        </div>
      </div>

      {summary && (
        <p className="mt-2 text-[12.5px] text-gray-600 leading-snug line-clamp-2">{summary}</p>
      )}

      <div className="mt-2 flex items-center gap-2.5 text-[11px] text-gray-400">
        {updated && <span>{updated}</span>}
        {version && <span className="font-mono">v{version}</span>}
        {(consumers_count ?? 0) > 0 && <span title="apps using this skill">⌘ {consumers_count}</span>}
        {stars > 0 && <span title="stars">★ {stars}</span>}
        {forks > 0 && <span title="forks">⑂ {forks}</span>}
        {(downloads ?? 0) > 0 && <span title="installs">↓ {downloads}</span>}
      </div>
    </div>
  );
}
