import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  listRepos, whoami,
  type Me, type Repo, type RepoKind,
} from "../api/client";
import { Header } from "../components/Header";
import { RepoCard } from "../components/RepoCard";

type SortKey = "name" | "version" | "updated";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "name", label: "Name" },
  { id: "version", label: "Version (newest first)" },
  { id: "updated", label: "Recently updated" },
];

export type KindBrowseProps = {
  kind: RepoKind;
  glyph: string;
  title: string;
  blurb: string;
};

/**
 * Shared layout for the four kind-scoped landing pages
 * (`/apps`, `/skills`, `/datasets`, `/agents`).
 *
 * Wraps the Marketspace card grid with a kind-specific header, tag
 * filter chips derived client-side from the loaded repos, and a sort
 * selector. The list_repos endpoint already supports a `kind` filter;
 * we ask the server to sort by name and let the client take over once
 * a different sort is chosen, so chip-toggling never refetches.
 */
export function KindBrowse({ kind, glyph, title, blurb }: KindBrowseProps) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => { whoami().then(setMe).catch(() => setMe(null)); }, []);

  useEffect(() => {
    setLoading(true);
    listRepos({ q, kind, sort: "name", limit: 120, include_forks: false })
      .then(setRepos)
      .catch(() => setRepos([]))
      .finally(() => setLoading(false));
  }, [q, kind]);

  // Drop the active tag if it's no longer present in the loaded set
  // (e.g. after a search that filtered it out).
  useEffect(() => {
    if (activeTag && !repos.some((r) => (r.tags || []).includes(activeTag))) {
      setActiveTag(null);
    }
  }, [repos, activeTag]);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of repos) {
      for (const t of r.tags || []) counts.set(t, (counts.get(t) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag, n]) => ({ tag, n }));
  }, [repos]);

  const visible = useMemo(() => {
    const base = activeTag
      ? repos.filter((r) => (r.tags || []).includes(activeTag))
      : repos;
    const out = [...base];
    out.sort((a, b) => {
      if (sort === "name") return (a.display_name || a.name).localeCompare(b.display_name || b.name);
      if (sort === "version") return compareSemverDesc(a.version || "", b.version || "");
      return (b.updated_at || 0) - (a.updated_at || 0);
    });
    return out;
  }, [repos, activeTag, sort]);

  const chip = (active: boolean) =>
    `text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
      active
        ? "border-soul-400 bg-soul-400/15 text-soul-700"
        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
    }`;

  return (
    <div className="min-h-screen">
      <Header variant="kindBrowse" />

      <main className="mx-auto max-w-6xl px-8 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900">
            <span className="mr-3">{glyph}</span>{title}
          </h1>
          <p className="mt-2 text-sm text-gray-600 max-w-2xl">{blurb}</p>
        </header>

        <div className="max-w-xl mb-6">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`search ${title.toLowerCase()}…`}
            className="w-full bg-gray-50 border border-gray-200 rounded-full px-5 py-2.5 text-sm text-bark-300 placeholder:text-gray-500 focus:outline-none focus:border-gray-300 transition-colors"
          />
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-1.5 flex-wrap">
            {allTags.length === 0 ? (
              <span className="text-[11px] text-gray-400 italic">no tags yet</span>
            ) : (
              <>
                <button onClick={() => setActiveTag(null)} className={chip(activeTag === null)}>all</button>
                {allTags.slice(0, 24).map(({ tag, n }) => (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                    title={`${n} repo${n === 1 ? "" : "s"}`}
                    className={chip(activeTag === tag)}
                  >
                    {tag}<span className="ml-1 text-gray-400">{n}</span>
                  </button>
                ))}
              </>
            )}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-8 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-gray-500 bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20fill%3D%22%23374151%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20d%3D%22M5.5%208l4.5%204.5L14.5%208z%22/%3E%3C/svg%3E')] bg-no-repeat bg-right-0.5 bg-[length:1.25rem]"
          >
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="text-center text-sm text-gray-500 py-16">listening to the Tree…</div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
            <div className="text-gray-600 text-sm">
              {repos.length === 0 ? `No ${title.toLowerCase()} published yet.` : "Nothing matches that filter."}
            </div>
            {me && repos.length === 0 && (
              <Link to="/new" className="mt-4 inline-block text-sm text-soul-300 hover:text-soul-400">
                ✦ plant the first seed
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((r) => <RepoCard key={`${r.owner_sub}/${r.name}`} repo={r} />)}
          </div>
        )}
      </main>
    </div>
  );
}

// Compare semver-ish strings, descending. Empty strings sort last.
// Non-numeric segments fall back to reverse string compare — good
// enough for catalog browse, not strict semver.
function compareSemverDesc(a: string, b: string): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const pa = a.split(/[.\-+]/);
  const pb = b.split(/[.\-+]/);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const sa = pa[i] ?? "", sb = pb[i] ?? "";
    const na = Number(sa), nb = Number(sb);
    if (Number.isFinite(na) && Number.isFinite(nb)) {
      if (na !== nb) return nb - na;
      continue;
    }
    const cmp = sb.localeCompare(sa);
    if (cmp !== 0) return cmp;
  }
  return 0;
}
