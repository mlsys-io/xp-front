import { Link } from "react-router-dom";
import type { Repo } from "../api/client";

const KIND_GLYPH: Record<string, string> = {
  app: "⁂",
  autoresearch: "⋯",
  agent: "❋",
};

const KIND_LABEL: Record<string, string> = {
  app: "Application",
  autoresearch: "AutoResearch",
  agent: "Agent",
};

export function RepoCard({ repo }: { repo: Repo }) {
  const { owner_sub, name, display_name, summary, tags, stars, forks, kind, fork_of } = repo;
  const ownerShort = owner_sub.slice(0, 8);

  return (
    <Link
      to={`/${encodeURIComponent(owner_sub)}/${encodeURIComponent(name)}`}
      className="group block rounded-2xl border border-soul-400/15 bg-night-800/60 backdrop-blur px-5 py-4 hover:border-soul-400/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display text-xs uppercase tracking-[0.3em] text-soul-400/60">
              {KIND_GLYPH[kind] || "◇"} {KIND_LABEL[kind] || kind}
            </span>
            {fork_of && (
              <span className="text-[10px] uppercase tracking-wider text-spirit-300/70">
                fork
              </span>
            )}
          </div>
          <div className="mt-1 font-display text-lg text-bark-300 truncate">
            {display_name || name}
          </div>
          <div className="text-[11px] text-bark-300/40 truncate">
            {ownerShort}…/{name}
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
        <div className="mt-3 text-sm text-bark-300/70 line-clamp-2">
          {summary}
        </div>
      )}

      {tags && tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.slice(0, 5).map((t) => (
            <span
              key={t}
              className="text-[10px] uppercase tracking-widest text-bark-300/50 border border-soul-400/10 rounded-full px-2 py-0.5"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
