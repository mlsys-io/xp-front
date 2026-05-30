import { Link, useNavigate } from "react-router-dom";
import type { Repo } from "../api/client";
import { AuthorBadge } from "./AuthorBadge";
import { isRepoTaggedDeprecated } from "./DeprecationBanner";
import { WorkflowNodeFlow } from "./WorkflowNodeBadge";

const KIND_GLYPH: Record<string, string> = {
  app:          "⁂",
  autoresearch: "↻",
  agent:        "❋",
  skill:        "⌘",
  workflow:     "▷",
  dataset:      "◫",
};

const COMMUNITY_OWNER = "00000000-0000-0000-0000-000000000001";

const HEALTH_DOT: Record<string, string> = {
  green: "bg-emerald-400",
  yellow: "bg-amber-400",
  red: "bg-red-400",
  unknown: "bg-gray-300",
};

const ADAPTER_BADGE: Record<string, { label: string; cls: string }> = {
  verified: { label: "✓", cls: "text-emerald-600 border-emerald-200 bg-emerald-50" },
  generated: { label: "~", cls: "text-gray-500 border-gray-200 bg-gray-50" },
  broken:    { label: "✗", cls: "text-red-600 border-red-200 bg-red-50" },
  stale:     { label: "!", cls: "text-amber-700 border-amber-200 bg-amber-50" },
  deprecated:{ label: "–", cls: "text-gray-400 border-gray-200 bg-gray-50" },
};

export function RepoCard({ repo }: { repo: Repo }) {
  const nav = useNavigate();
  const {
    owner_sub, name, display_name, summary, tags, stars, forks, kind, fork_of,
    adapter_status, upstream_health, consumers_count,
  } = repo;
  const ownerShort = owner_sub.slice(0, 8);
  const deprecated = isRepoTaggedDeprecated(tags);
  const isCommunity = owner_sub === COMMUNITY_OWNER;

  const openRepo = () =>
    nav(`/${encodeURIComponent(owner_sub)}/${encodeURIComponent(name)}`);

  const adapterBadge = adapter_status ? ADAPTER_BADGE[adapter_status] : null;
  const healthCls = upstream_health ? HEALTH_DOT[upstream_health] : null;

  return (
    <div
      onClick={openRepo}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openRepo();
        }
      }}
      role="link"
      tabIndex={0}
      className="group block rounded-lg border border-gray-200 bg-white px-4 py-3.5 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer focus:outline-none focus:border-soul-400"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap text-xs text-gray-700">
            <span>{KIND_GLYPH[kind] || "◇"}</span>
            <span className="font-mono lowercase">{kind}</span>
            {isCommunity && (
              <span className="inline-flex items-center text-[10px] uppercase tracking-wider rounded-full border border-sky-200 bg-sky-50 text-sky-700 px-1.5 py-0.5">
                community
              </span>
            )}
            {kind === "workflow" && (
              <span className="inline-flex items-center text-[10px] uppercase tracking-wider rounded-full border border-gray-200 bg-gray-100 text-gray-500 px-1.5 py-0.5">
                template
              </span>
            )}
            {fork_of && (
              <span className="text-spirit-300/70">· fork</span>
            )}
            {!isCommunity && <AuthorBadge owner_sub={owner_sub} />}
            {deprecated && (
              <span
                title="This repo is deprecated"
                className="inline-flex items-center text-[10px] uppercase tracking-wider rounded-full border border-amber-300 bg-amber-50 text-amber-800 px-1.5 py-0.5"
              >
                deprecated
              </span>
            )}
            {adapterBadge && (
              <span
                title={`Adapter: ${adapter_status}`}
                className={`inline-flex items-center text-[10px] font-mono rounded border px-1.5 py-0.5 ${adapterBadge.cls}`}
              >
                {adapterBadge.label}
              </span>
            )}
            {healthCls && (
              <span
                title={`Upstream health: ${upstream_health}`}
                className={`inline-block w-2 h-2 rounded-full ${healthCls}`}
              />
            )}
            {kind === "strategy" && (
              summary && summary.includes("UNVERIFIED") ? (
                <span
                  title="Backtest proof not verified"
                  className="inline-flex items-center text-[10px] uppercase tracking-wider rounded-full border border-amber-300 bg-amber-50 text-amber-700 px-1.5 py-0.5"
                >
                  unverified
                </span>
              ) : (
                <span
                  title="Backtest proof verified"
                  className="inline-flex items-center text-[10px] uppercase tracking-wider rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 px-1.5 py-0.5"
                >
                  verified
                </span>
              )
            )}
          </div>
          <div className="mt-0.5 text-base font-semibold text-gray-900 truncate">
            {display_name || name}
          </div>
          <div className="text-[12px] text-gray-600 truncate font-mono">
            {isCommunity ? (
              <span className="text-sky-600">community</span>
            ) : (
              <Link
                to={`/${encodeURIComponent(owner_sub)}`}
                onClick={(e) => e.stopPropagation()}
                className="hover:text-soul-300 transition-colors"
              >
                {ownerShort}…
              </Link>
            )}
            /{name}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-3 text-xs text-gray-700">
          {kind === "workflow" ? (
            <Link
              to={`/${encodeURIComponent(owner_sub)}/${encodeURIComponent(name)}/fork`}
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] text-soul-400 hover:text-soul-300 transition-colors whitespace-nowrap"
              title="Fork this template to start using it"
            >
              fork to customize →
            </Link>
          ) : (
            <>
              {consumers_count != null && consumers_count > 0 && (
                <span title="apps using this skill" className="flex items-center gap-1 text-gray-500">
                  <span>⌘</span>
                  {consumers_count}
                </span>
              )}
              <span title="stars" className="flex items-center gap-1">
                <span className="text-atokirina-400">★</span>
                {stars}
              </span>
              <span title="forks" className="flex items-center gap-1">
                <span className="text-spirit-400">⑂</span>
                {forks}
              </span>
            </>
          )}
        </div>
      </div>

      {summary && (
        <div className="mt-2 text-sm text-gray-700 line-clamp-2">
          {summary}
        </div>
      )}

      {(kind === "workflow" || kind === "strategy") && (
        <div className="mt-2">
          <WorkflowNodeFlow tags={tags || []} />
        </div>
      )}

      {tags && tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {tags.filter(t => !t.startsWith("nodes:")).slice(0, 5).map((t) => (
            <Link
              key={t}
              to={`/search?q=${encodeURIComponent(t)}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] text-gray-600 border border-gray-200 bg-gray-50 hover:border-soul-400/40 hover:text-soul-300 hover:bg-soul-400/5 rounded px-1.5 py-0.5 transition-colors"
            >
              {t}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
