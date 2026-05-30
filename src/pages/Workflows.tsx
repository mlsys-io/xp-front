// Workflows — /workflows
//
// First-tier marketplace landing for kind=workflow repos.
// A workflow is a sequence of agents / LLMs / operations that the user
// installs into their app or runs standalone. Editing happens in
// LumidOS / Claude Code — NOT here. xp.io is browse + install only.
//
// Top of page: intent input → AI generates workflow (→ /new/loop?intent=).
// Below: the full community workflow catalog with tag/sort filters.

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  listRepos, whoami,
  type Me, type Repo,
} from "../api/client";
import { Header } from "../components/Header";
import { RepoCard } from "../components/RepoCard";

type SortKey = "updated" | "stars" | "name";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "updated", label: "Recently updated" },
  { id: "stars",   label: "Most stars" },
  { id: "name",    label: "Name" },
];

// Scenario starters — pre-fill intent input.
const STARTERS = [
  { icon: "📈", label: "Quant signals",    intent: "research momentum signals in US equities and crypto every 12 hours" },
  { icon: "📅", label: "Morning brief",    intent: "summarise my email and calendar each morning and suggest priorities" },
  { icon: "⚙️", label: "Pipeline opt.",   intent: "continuously benchmark and improve an NL-to-SQL pipeline" },
  { icon: "📰", label: "News digest",      intent: "track news and sentiment for a list of companies every hour" },
  { icon: "🔬", label: "Literature watch", intent: "monitor arxiv for new papers on a topic and summarise weekly" },
  { icon: "📊", label: "Data quality",     intent: "monitor a database for schema drift and data anomalies daily" },
];

export function Workflows() {
  const nav = useNavigate();
  const [q, setQ]             = useState("");
  const [sort, setSort]       = useState<SortKey>("updated");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [repos, setRepos]     = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe]           = useState<Me | null>(null);
  const [intentQ, setIntentQ] = useState("");

  useEffect(() => { whoami().then(setMe).catch(() => setMe(null)); }, []);

  useEffect(() => {
    setLoading(true);
    listRepos({ q, kind: "workflow", sort: "updated", limit: 120, include_forks: true })
      .then(setRepos)
      .catch(() => setRepos([]))
      .finally(() => setLoading(false));
  }, [q]);

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
      if (sort === "stars") return (b.stars || 0) - (a.stars || 0);
      return (b.updated_at || 0) - (a.updated_at || 0);
    });
    return out;
  }, [repos, activeTag, sort]);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (intentQ.trim().length >= 5) {
      nav(`/new/loop?intent=${encodeURIComponent(intentQ.trim())}`);
    }
  };

  const chip = (active: boolean) =>
    `text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
      active
        ? "border-soul-400 bg-soul-400/15 text-soul-700"
        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
    }`;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Header variant="kindBrowse" />

      <main className="mx-auto max-w-5xl px-6 py-10">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2.5">
            <span className="text-soul-300">▷</span> Workflows
          </h1>
          <p className="mt-1 text-sm text-gray-500 max-w-xl">
            A workflow is a sequence of agents, LLMs, and operations — installed into your
            app and scheduled to run. Workflows learn over time via xp.io knowledge banks.
            <br />
            <span className="text-gray-400 text-xs">
              Workflows are authored in{" "}
              <a href="https://lum.id" className="text-soul-300 hover:underline">LumidOS / Claude Code</a>,
              not edited here.
            </span>
          </p>
        </div>

        {/* ── Intent → generate ───────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 mb-6">
          <div className="text-xs font-medium text-gray-700 mb-3 uppercase tracking-wider">
            Generate a workflow from your intent
          </div>
          <form onSubmit={handleGenerate} className="flex gap-2">
            <input
              value={intentQ}
              onChange={(e) => setIntentQ(e.target.value)}
              placeholder="What do you want to research or automate?"
              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-soul-400/20 focus:border-soul-400 transition-colors"
            />
            <button
              type="submit"
              disabled={intentQ.trim().length < 5}
              className="shrink-0 bg-soul-400 hover:bg-soul-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors whitespace-nowrap"
            >
              Generate →
            </button>
          </form>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {STARTERS.map((s) => (
              <button
                key={s.label}
                onClick={() => setIntentQ(s.intent)}
                className="inline-flex items-center gap-1.5 text-[11px] border border-gray-200 rounded-full px-2.5 py-1 text-gray-600 hover:border-soul-400/50 hover:text-soul-400 transition-colors bg-white"
              >
                <span>{s.icon}</span> {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Search ──────────────────────────────────────────────── */}
        <div className="mb-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search community workflows…"
            className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-300 transition-colors"
          />
        </div>

        {/* ── Tag chips + sort ────────────────────────────────────── */}
        {!loading && repos.length > 0 && (
          <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => setActiveTag(null)} className={chip(activeTag === null)}>all</button>
              {allTags.slice(0, 20).map(({ tag, n }) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  title={`${n} workflow${n === 1 ? "" : "s"}`}
                  className={chip(activeTag === tag)}
                >
                  {tag}<span className="ml-1 text-gray-400">{n}</span>
                </button>
              ))}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="appearance-none bg-white border border-gray-200 rounded-md pl-3 pr-7 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-gray-400 bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20fill%3D%22%23374151%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20d%3D%22M5.5%208l4.5%204.5L14.5%208z%22/%3E%3C/svg%3E')] bg-no-repeat bg-right-0.5 bg-[length:1.25rem]"
            >
              {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        )}

        {/* ── Grid ────────────────────────────────────────────────── */}
        {loading ? (
          <div className="text-center text-sm text-gray-400 py-16">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center">
            <div className="text-4xl mb-3">▷</div>
            <div className="text-gray-700 text-sm font-medium">
              {repos.length === 0 ? "No workflows published yet." : "Nothing matches that filter."}
            </div>
            <div className="text-gray-400 text-xs mt-1 max-w-xs mx-auto">
              Describe your intent above to generate one, or publish via the CLI.
            </div>
            {me && (
              <div className="mt-4 text-xs text-gray-400 font-mono bg-gray-50 border border-gray-200 rounded px-3 py-2 inline-block">
                lumid app_push my-workflow
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {visible.map((r) => <RepoCard key={`${r.owner_sub}/${r.name}`} repo={r} />)}
          </div>
        )}

        {/* Back link */}
        <div className="mt-10 text-center">
          <Link to="/" className="text-xs text-gray-400 hover:text-soul-300 transition-colors">
            ← back to marketplace
          </Link>
        </div>
      </main>
    </div>
  );
}
