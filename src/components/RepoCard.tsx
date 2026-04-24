import { Link, useNavigate } from "react-router-dom";
import type { Repo } from "../api/client";

const KIND_GLYPH: Record<string, string> = {
  app: "⁂",
  autoresearch: "⋯",
  agent: "❋",
  skill: "⌘",
};

const KIND_LABEL: Record<string, string> = {
  app: "Application",
  autoresearch: "AutoResearch",
  agent: "Agentic KG",
  skill: "Skill",
};

export function RepoCard({ repo }: { repo: Repo }) {
  const nav = useNavigate();
  const { owner_sub, name, display_name, summary, tags, stars, forks, kind, fork_of } = repo;
  const ownerShort = owner_sub.slice(0, 8);

  const openRepo = () =>
    nav(`/${encodeURIComponent(owner_sub)}/${encodeURIComponent(name)}`);

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
      className="group block rounded-lg border border-white/5 bg-white/[0.025] px-4 py-3.5 hover:border-white/20 transition-colors cursor-pointer focus:outline-none focus:border-soul-400/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap text-xs text-bark-300/55">
            <span>{KIND_GLYPH[kind] || "◇"}</span>
            <span className="font-mono lowercase">{kind}</span>
            {fork_of && (
              <span className="text-spirit-300/70">· fork</span>
            )}
          </div>
          <div className="mt-0.5 text-base font-semibold text-bark-200 truncate">
            {display_name || name}
          </div>
          <div className="text-[12px] text-bark-300/45 truncate font-mono">
            <Link
              to={`/${encodeURIComponent(owner_sub)}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:text-soul-300 transition-colors"
            >
              {ownerShort}…
            </Link>
            /{name}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-3 text-xs text-bark-300/60">
          <span title="stars" className="flex items-center gap-1">
            <span className="text-atokirina-400">★</span>
            {stars}
          </span>
          <span title="forks" className="flex items-center gap-1">
            <span className="text-spirit-400">⑂</span>
            {forks}
          </span>
        </div>
      </div>

      {summary && (
        <div className="mt-2 text-sm text-bark-300/70 line-clamp-2">
          {summary}
        </div>
      )}

      {tags && tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {tags.slice(0, 5).map((t) => (
            <span
              key={t}
              className="text-[11px] text-bark-300/60 border border-white/8 rounded px-1.5 py-0.5"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
