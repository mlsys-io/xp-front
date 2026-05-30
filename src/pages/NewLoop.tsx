/**
 * /new/loop — 3-step intent-to-loop wizard.
 *
 * Step 1: user types intent → search existing community skills
 * Step 2: review matched skills, add/remove from the list
 * Step 3: name / schedule / visibility → dispatch to `lumid app_new_from_intent`
 *         via `POST /api/v1/repos` (scaffold a minimal app) then redirect to
 *         the new repo's page.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createRepo, searchRepos, type Repo } from "../api/client";

type Step = 1 | 2 | 3;

const SCHEDULES = [
  { label: "Daily at 8am", value: "0 8 * * *" },
  { label: "Daily at midnight", value: "0 0 * * *" },
  { label: "Hourly", value: "0 * * * *" },
  { label: "Weekly (Mon 8am)", value: "0 8 * * 1" },
  { label: "Manual only", value: "@trigger" },
];

export function NewLoop() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [intent, setIntent] = useState(params.get("intent") ?? "");
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<Repo[]>([]);

  // Step 2
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Step 3
  const [name, setName] = useState("");
  const [schedule, setSchedule] = useState("0 8 * * *");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Auto-search when intent is pre-filled from URL
  useEffect(() => {
    if (intent.trim().length > 8) {
      void runSearch(intent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSearch(q: string) {
    setSearching(true);
    try {
      const [skillRes, wfRes] = await Promise.all([
        searchRepos({ q, kind: "skill", limit: 6 }),
        searchRepos({ q, kind: "workflow", limit: 4 }),
      ]);
      const results = [...wfRes, ...skillRes];
      setCandidates(results);
      // Pre-select all results
      setSelected(new Set(results.map((r) => `${r.owner_sub}/${r.name}`)));
    } catch {
      setCandidates([]);
    } finally {
      setSearching(false);
    }
  }

  function toggleSkill(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }

  async function createLoop(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!name.trim()) { setErr("App name required"); return; }
    setBusy(true);
    try {
      const skillImports = Array.from(selected);
      // Build minimal xpcloud.yaml content as initial file
      const appName = name.trim().toLowerCase().replace(/\s+/g, "-");
      const yaml = buildYaml(appName, intent, schedule, visibility, skillImports);
      const rec = await createRepo({
        kind: "app",
        name: appName,
        visibility,
        display_name: name.trim(),
        summary: intent.slice(0, 200),
        tags: ["autoresearch", "loop"],
        initial_files: { "xpcloud.yaml": yaml },
      });
      nav(`/${encodeURIComponent(rec.owner_sub)}/${encodeURIComponent(rec.name)}`);
    } catch (e: any) {
      if (e?.response?.status === 401) {
        const { beginLogin } = await import("../lib/pkce");
        return beginLogin();
      }
      setErr(e?.response?.data?.detail || "create failed");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen relative">
      <div className="absolute inset-0 starfield opacity-25 pointer-events-none" aria-hidden="true" />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-16">
        <Link to="/" className="text-sm text-gray-500 hover:text-soul-400 mb-8 block">← Back to marketplace</Link>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-8">
          {([1, 2, 3] as Step[]).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold
                ${step === s ? "bg-soul-400 text-white" :
                  step > s ? "bg-soul-400/30 text-soul-400" : "bg-gray-200 text-gray-500"}`}>
                {s}
              </div>
              {s < 3 && <div className={`h-px w-8 ${step > s ? "bg-soul-400/50" : "bg-gray-200"}`} />}
            </div>
          ))}
          <span className="ml-2 text-xs text-gray-500">
            {step === 1 ? "Describe your intent" : step === 2 ? "Choose skills" : "Configure & create"}
          </span>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">What do you want to research or automate?</h1>
            <p className="text-sm text-gray-500 mb-6">
              Describe your goal in plain English. xp.io will find matching community skills to get you started.
            </p>
            <textarea
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              rows={4}
              placeholder="e.g. Track mentions of my company on Twitter and summarise sentiment daily"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-soul-400/30 focus:border-soul-400 resize-none"
            />
            <button
              disabled={intent.trim().length < 5 || searching}
              onClick={async () => { await runSearch(intent); setStep(2); }}
              className="mt-4 w-full bg-soul-400 hover:bg-soul-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors"
            >
              {searching ? "Searching skills…" : "Find skills →"}
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <h1 className="text-xl font-semibold text-gray-900 mb-1">Choose skills for your loop</h1>
            <p className="text-sm text-gray-500 mb-6">
              These community skills matched your intent. Toggle any off, or add others later via "Add to app".
            </p>

            {candidates.length === 0 ? (
              <div className="text-sm text-gray-500 py-4 text-center">
                No community skills found yet — your loop will start with a minimal scaffold.
                You can add skills later.
              </div>
            ) : (
              <ul className="space-y-2 mb-6">
                {candidates.map((r) => {
                  const slug = `${r.owner_sub}/${r.name}`;
                  const on = selected.has(slug);
                  return (
                    <li key={slug}
                      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors
                        ${on ? "border-soul-300 bg-soul-400/5" : "border-gray-200 hover:border-gray-300"}`}
                      onClick={() => toggleSkill(slug)}>
                      <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0
                        ${on ? "border-soul-400 bg-soul-400" : "border-gray-300"}`}>
                        {on && <span className="text-white text-[10px] leading-none">✓</span>}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-mono font-medium text-gray-900 truncate">
                          {r.kind === "workflow" ? "▷" : r.kind === "strategy" ? "◈" : "⌘"} {r.display_name || r.name}
                        </div>
                        {r.summary && (
                          <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.summary}</div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 border border-gray-300 text-gray-700 text-sm rounded-lg py-2 hover:bg-gray-50 transition-colors">
                ← Back
              </button>
              <button onClick={() => setStep(3)}
                className="flex-1 bg-soul-400 hover:bg-soul-500 text-white text-sm font-medium rounded-lg py-2 transition-colors">
                Configure →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <form onSubmit={createLoop} className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <h1 className="text-xl font-semibold text-gray-900 mb-6">Configure your loop</h1>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Loop name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="my-research-loop"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-soul-400/30 focus:border-soul-400 font-mono"
                />
                <p className="mt-1 text-[11px] text-gray-400">Lowercase letters, numbers, hyphens only</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Schedule</label>
                <select
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-soul-400/30 focus:border-soul-400"
                >
                  {SCHEDULES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Visibility</label>
                <div className="flex gap-3">
                  {(["private", "public"] as const).map((v) => (
                    <label key={v}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm transition-colors
                        ${visibility === v ? "border-soul-300 bg-soul-400/5 text-soul-400" : "border-gray-200 text-gray-700 hover:border-gray-300"}`}>
                      <input type="radio" name="visibility" value={v}
                        checked={visibility === v} onChange={() => setVisibility(v)}
                        className="sr-only" />
                      {v === "private" ? "🔒 Private" : "🌍 Public"}
                    </label>
                  ))}
                </div>
              </div>

              {selected.size > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-1">Skills ({selected.size})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(selected).map((slug) => {
                      const short = slug.split("/").pop() || slug;
                      return (
                        <span key={slug} className="inline-flex items-center gap-1 text-[10px] border border-gray-200 rounded-full px-2 py-0.5 text-gray-600">
                          ⌘ {short}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <details className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
              <summary className="px-3 py-2 text-xs text-gray-500 cursor-pointer hover:bg-gray-50 select-none bg-white">
                Preview xpcloud.yaml
              </summary>
              <pre className="text-[10px] font-mono bg-gray-50 p-3 overflow-auto max-h-48 text-gray-700 leading-relaxed">
                {name ? buildYaml(name, intent, schedule, visibility, Array.from(selected)) : "(enter a name above to preview)"}
              </pre>
            </details>

            {err && <p className="mt-4 text-sm text-red-600">{err}</p>}

            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setStep(2)}
                className="flex-1 border border-gray-300 text-gray-700 text-sm rounded-lg py-2 hover:bg-gray-50 transition-colors">
                ← Back
              </button>
              <button type="submit" disabled={busy}
                className="flex-1 bg-soul-400 hover:bg-soul-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors">
                {busy ? "Creating…" : "Create loop ✓"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Minimal xpcloud.yaml scaffold for a new loop
// ---------------------------------------------------------------------------

function buildYaml(
  name: string,
  intent: string,
  schedule: string,
  visibility: "public" | "private",
  skillImports: string[],
): string {
  const agentId = `${name}-researcher`;
  const skills = skillImports.length
    ? skillImports.map((s) => `  - ${s}`).join("\n")
    : "  []";
  return `name: ${name}
display_name: "${name}"
kind: app
fork_of: null
version: 0.1.0
visibility: ${visibility}
summary: >
  ${intent.slice(0, 200)}
tags: [autoresearch, loop]

roles:
  - name: researcher
    memory_agent: ${agentId}

memory_agents:
  - id: ${agentId}
    description: "Tracks findings for ${name}"

skill_imports:
${skills}

auto_publish:
  memories:
    - agent: ${agentId}
      every: 1

approval_policy: auto

loops:
  - name: research
    primary_role: researcher
    knowledge_agent: ${agentId}
    description: "${intent.slice(0, 100)}"
    schedule: "${schedule}"
    skills: [research_step]
    steps:
      - name: research_step
        skill: lumid-claude
        stage: act
        params:
          prompt: "Research: ${intent.slice(0, 100)}"
`;
}
