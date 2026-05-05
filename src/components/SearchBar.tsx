import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { RepoKind } from "../api/client";

type KindFilter = "" | RepoKind;

const KINDS: { id: KindFilter; label: string }[] = [
  { id: "", label: "all" },
  { id: "app", label: "app" },
  { id: "skill", label: "skill" },
  { id: "dataset", label: "dataset" },
  { id: "agent", label: "agent" },
];

/**
 * Global header search bar. Lives in the top nav of every marketspace
 * shell page (Marketspace landing + KindBrowse pages + SearchResults).
 * Submits to `/search?q=<query>&kind=<optional-kind>`.
 *
 * Distinct from the in-page Marketspace search box (which filters the
 * already-loaded grid client-side); this hits the new server endpoint
 * and queries across all kinds.
 */
export function SearchBar() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [kind, setKind] = useState<KindFilter>(
    (params.get("kind") || "") as KindFilter,
  );

  // Preserve the input value across navigations: when the URL's
  // ?q / ?kind change (e.g. user lands on /search via a deep link or
  // the back button), pull them into local state so the input shows
  // the current query.
  useEffect(() => {
    setQ(params.get("q") || "");
    setKind((params.get("kind") || "") as KindFilter);
  }, [params]);

  const submit = () => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const sp = new URLSearchParams({ q: trimmed });
    if (kind) sp.set("kind", kind);
    nav(`/search?${sp.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value as KindFilter)}
        aria-label="Filter by kind"
        className="appearance-none bg-white border border-gray-200 rounded-full pl-3 pr-7 py-1.5 text-[11px] uppercase tracking-widest text-gray-700 focus:outline-none focus:border-gray-400 bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20fill%3D%22%23374151%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20d%3D%22M5.5%208l4.5%204.5L14.5%208z%22/%3E%3C/svg%3E')] bg-no-repeat bg-right-0.5 bg-[length:1.1rem]"
      >
        {KINDS.map((k) => (
          <option key={k.id || "all"} value={k.id}>{k.label}</option>
        ))}
      </select>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="search the marketspace…"
        aria-label="Search the marketspace"
        className="bg-gray-50 border border-gray-200 rounded-full px-4 py-1.5 text-xs text-bark-300 placeholder:text-gray-500 focus:outline-none focus:border-gray-300 transition-colors w-48 md:w-64"
      />
      <button
        onClick={submit}
        disabled={!q.trim()}
        className="text-[11px] uppercase tracking-widest text-gray-700 hover:text-soul-300 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        go
      </button>
    </div>
  );
}
