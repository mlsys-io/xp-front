// Phase A1 — xp.io/go composer
//
// One page; two columns. Left = "Your AI" (three role tiles, live-updates
// as the user picks skills on the right). Right = "Add a skill" (curated
// catalog, default-filtered to personal-agent-compatible skills, ordered
// by an opaque relevance the user never sees).
//
// Start handoff lives on lum.id. The xp.io domain can't read lum.id's
// HttpOnly session cookie, so the install is done server-side over there:
// we redirect to `lum.id/app/loops?install=personal-agent&skills=…&as=…`
// and the loops page does the /me/apps POST under the same-origin cookie.
// That redirect also covers the signup path — lum.id redirects through
// its own auth gate when no session is present.
//
// The catalog is hardcoded here as the boot-from-zero shape. Phase B6
// replaces this with `GET /api/v1/skills/catalog?for_app=personal-agent`
// without touching the UI — same {name, display_name, summary, tags,
// needs_secrets} payload.

import { useEffect, useMemo, useState } from "react";
import { SkillCard, type SkillCardData } from "../components/SkillCard";

// ── Bootstrap catalog (8 entries, scoped to personal-agent + shared) ─
//
// Phase B6 swaps this for the live catalog endpoint. Until then the
// curation lives here so the funnel works end-to-end without depending
// on the skill-roster crawler. The data shape is the contract.
//
// `needs_secrets` is informational — Connect surfaces only the keys
// the user-picked skills actually need.

type SkillEntry = SkillCardData & {
  category: string;
  needs_secrets?: string[];
  role_hint?: "assistant" | "watcher" | "philosopher";
};

const BOOTSTRAP_CATALOG: SkillEntry[] = [
  {
    name: "gmail-mcp",
    display_name: "Gmail",
    summary: "Read, draft, and send email through your Google account.",
    tags: ["email", "google"],
    category: "email",
    needs_secrets: ["GOOGLE_OAUTH"],
    role_hint: "assistant",
  },
  {
    name: "gcal-mcp",
    display_name: "Google Calendar",
    summary: "Check availability, propose meeting times, book events.",
    tags: ["calendar", "google"],
    category: "calendar",
    needs_secrets: ["GOOGLE_OAUTH"],
    role_hint: "assistant",
  },
  {
    name: "tavily-search",
    display_name: "Tavily Search",
    summary: "Real-time web search for grounded answers.",
    tags: ["web", "search"],
    category: "web",
    needs_secrets: ["TAVILY_API_KEY"],
    role_hint: "assistant",
  },
  {
    name: "fetch",
    display_name: "Fetch URL",
    summary: "Read web pages on demand.",
    tags: ["web"],
    category: "web",
    role_hint: "assistant",
  },
  {
    name: "github-mcp",
    display_name: "GitHub",
    summary: "Read repos, issues, and PRs you have access to.",
    tags: ["code", "git"],
    category: "code",
    needs_secrets: ["GITHUB_TOKEN"],
    role_hint: "assistant",
  },
  {
    name: "slack-mcp",
    display_name: "Slack",
    summary: "Read your DMs and channels; post in your name.",
    tags: ["messaging"],
    category: "messaging",
    needs_secrets: ["SLACK_OAUTH"],
    role_hint: "assistant",
  },
  {
    name: "arxiv-search",
    display_name: "arXiv",
    summary: "Search research papers.",
    tags: ["research", "papers"],
    category: "web",
    role_hint: "philosopher",
  },
  {
    name: "wikipedia",
    display_name: "Wikipedia",
    summary: "Look up facts and background.",
    tags: ["research", "knowledge"],
    category: "web",
    role_hint: "philosopher",
  },
];

const TAG_FILTERS: { label: string; tag: string | null }[] = [
  { label: "All", tag: null },
  { label: "Email", tag: "email" },
  { label: "Calendar", tag: "calendar" },
  { label: "Web", tag: "web" },
  { label: "Code", tag: "code" },
  { label: "Research", tag: "research" },
];

const COMPOSER_STORAGE_KEY = "xpio_go_composition_v1";

// Friendly labels for the Connect step. The actual OAuth/secret entry
// happens on lum.id where the user's session cookie lives.
const SECRET_LABELS: Record<string, { label: string; flow: "oauth" | "vault" }> = {
  GOOGLE_OAUTH: { label: "Connect Google (Gmail + Calendar)", flow: "oauth" },
  SLACK_OAUTH: { label: "Connect Slack", flow: "oauth" },
  GITHUB_TOKEN: { label: "Add GitHub token", flow: "vault" },
  TAVILY_API_KEY: { label: "Add Tavily API key", flow: "vault" },
};

// lum.id host — surfaced for redirects. Vite envs override in dev.
const LUMID_BASE: string =
  (import.meta as any).env?.VITE_LUMID_BASE || "https://lum.id";

// ── Page ───────────────────────────────────────────────────────────

export function Go() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);

  // Rehydrate prior composition on mount so a signup round-trip
  // through lum.id doesn't lose the user's picks.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(COMPOSER_STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        if (Array.isArray(arr)) setSelected(new Set(arr));
      }
    } catch {
      /* ignore — fresh composer */
    }
  }, []);

  // Persist on every change. sessionStorage (not localStorage): we want
  // the picks alive for this browser tab/round-trip, not forever.
  useEffect(() => {
    try {
      sessionStorage.setItem(
        COMPOSER_STORAGE_KEY,
        JSON.stringify(Array.from(selected)),
      );
    } catch {
      /* quota or privacy mode — quietly degrade */
    }
  }, [selected]);

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BOOTSTRAP_CATALOG.filter((s) => {
      if (tag && !(s.tags || []).includes(tag)) return false;
      if (!q) return true;
      const hay = [s.name, s.display_name, s.summary, ...(s.tags || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [query, tag]);

  // The Connect step shows only the secrets the picked skills need —
  // and only once each, even if multiple skills share a secret.
  const requiredSecrets = useMemo(() => {
    const set = new Set<string>();
    for (const s of BOOTSTRAP_CATALOG) {
      if (selected.has(s.name)) {
        for (const k of s.needs_secrets || []) set.add(k);
      }
    }
    return Array.from(set);
  }, [selected]);

  // Per-role chips on the left column. Skills with role_hint=assistant
  // surface on the assistant tile; others fall through to the role that
  // claims them. Skills without a hint render on the assistant tile
  // (the default voice of the personal-agent fork).
  const roleChips = useMemo(() => {
    const buckets: Record<"assistant" | "watcher" | "philosopher", SkillEntry[]> = {
      assistant: [],
      watcher: [],
      philosopher: [],
    };
    for (const s of BOOTSTRAP_CATALOG) {
      if (!selected.has(s.name)) continue;
      const r = s.role_hint || "assistant";
      buckets[r].push(s);
    }
    return buckets;
  }, [selected]);

  const start = () => {
    // The handoff. lum.id has the cookie + session-bound auth; we just
    // pass the picks in the URL. lum.id/app/loops is supposed to detect
    // ?install=... and POST /me/apps server-side (Phase A4 wiring).
    const skills = Array.from(selected).join(",");
    const params = new URLSearchParams({
      install: "personal-agent",
      as: "pa",
      skills,
    });
    window.location.href = `${LUMID_BASE}/app/loops?${params.toString()}`;
  };

  // Connect uses the same redirect — lum.id has the OAuth + secrets UI
  // already. We add a `then=go` hint so lum.id can bounce back to xp.io/go
  // after every secret/grant is in place.
  const openConnect = (key: string) => {
    const params = new URLSearchParams({
      need: key,
      then: "go",
    });
    window.location.href = `${LUMID_BASE}/app/connect?${params.toString()}`;
  };

  const canStart = selected.size > 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <nav className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-8 py-5 flex items-center justify-between">
          <a
            href="/"
            className="text-soul-300 font-display tracking-[0.35em] text-sm"
          >
            <span className="w-1.5 h-1.5 inline-block align-middle rounded-full bg-soul-400 shadow-[0_0_8px_rgba(62,212,193,0.9)] animate-pulse-soul mr-3" />
            xp.io / go
          </a>
          <a
            href={`${LUMID_BASE}/auth/login?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "/")}`}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Sign in
          </a>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-8 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900">Set up your AI</h1>
          <p className="mt-2 text-gray-600">
            Pick the skills you want. We&apos;ll connect what&apos;s needed,
            then your AI starts working for you.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left — "Your AI" preview ────────────────────────────── */}
          <section className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Your AI
            </h2>

            <RoleTile
              name="Assistant"
              description="Drafts emails, proposes meetings, summarises your day."
              skills={roleChips.assistant}
            />
            <RoleTile
              name="Watcher"
              description="Quietly learns from how you work so the assistant gets better."
              skills={roleChips.watcher}
              hint="Local-only · requires CLI"
            />
            <RoleTile
              name="Philosopher"
              description="Weekly reflection. Surfaces patterns the assistant should remember."
              skills={roleChips.philosopher}
              hint="Local-only · requires CLI"
            />
          </section>

          {/* Right — Marketplace ──────────────────────────────────── */}
          <section className="lg:col-span-3 space-y-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Add a skill
            </h2>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-soul-300/40 focus:border-soul-300"
            />

            <div className="flex items-center gap-2 flex-wrap">
              {TAG_FILTERS.map((f) => (
                <button
                  key={f.label}
                  onClick={() => setTag(f.tag)}
                  className={[
                    "px-3 py-1 rounded-full text-xs transition-colors",
                    tag === f.tag
                      ? "bg-gray-900 text-white"
                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visible.map((s) => (
                <SkillCard
                  key={s.name}
                  skill={s}
                  selected={selected.has(s.name)}
                  onToggle={() => toggle(s.name)}
                />
              ))}
              {visible.length === 0 && (
                <div className="col-span-full text-sm text-gray-500 italic px-2 py-6 text-center">
                  No skills match — try a different filter.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Sticky footer — Connect + Start ──────────────────────────── */}
      <footer
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-1px_2px_rgba(0,0,0,0.03)]"
        role="contentinfo"
      >
        <div className="mx-auto max-w-6xl px-8 py-4 flex items-center justify-between gap-4">
          <div className="text-sm text-gray-600 min-w-0 flex-1">
            {selected.size === 0 ? (
              <span>Pick at least one skill to start.</span>
            ) : (
              <span>
                <strong>{selected.size}</strong> skill{selected.size === 1 ? "" : "s"}
                {requiredSecrets.length > 0 && (
                  <> · {requiredSecrets.length} to connect</>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {requiredSecrets.map((k) => {
              const meta = SECRET_LABELS[k] || { label: k, flow: "vault" };
              return (
                <button
                  key={k}
                  onClick={() => openConnect(k)}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                >
                  {meta.label}
                </button>
              );
            })}
            <button
              onClick={start}
              disabled={!canStart}
              className={[
                "px-5 py-2 text-sm font-semibold rounded-lg transition-colors",
                canStart
                  ? "bg-soul-300 text-white hover:bg-soul-400"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed",
              ].join(" ")}
            >
              Start
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Role tile ──────────────────────────────────────────────────────

function RoleTile({
  name,
  description,
  skills,
  hint,
}: {
  name: string;
  description: string;
  skills: SkillEntry[];
  hint?: string;
}) {
  return (
    <div className="p-4 rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
        {hint && (
          <span className="text-[10px] uppercase tracking-wide text-gray-400">
            {hint}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-600 leading-relaxed">{description}</p>
      {skills.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          {skills.map((s) => (
            <span
              key={s.name}
              className="px-2 py-0.5 rounded-full text-[11px] bg-soul-50 text-soul-400 border border-soul-300/30"
            >
              {s.display_name || s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default Go;
