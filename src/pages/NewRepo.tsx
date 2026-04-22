import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createRepo, type RepoKind, type Visibility } from "../api/client";

const KINDS: { id: RepoKind; label: string; glyph: string; blurb: string }[] = [
  { id: "app", glyph: "⁂", label: "Application",
    blurb: "A Claude Code app — manifest + procedures + prompts. Installable." },
  { id: "autoresearch", glyph: "⋯", label: "AutoResearch",
    blurb: "A loop that runs on a schedule and accumulates knowledge." },
  { id: "agent", glyph: "❋", label: "Agent",
    blurb: "A memory bundle — an accumulating knowledge graph you can share." },
];

export function NewRepo() {
  const nav = useNavigate();
  const [kind, setKind] = useState<RepoKind>("app");
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [summary, setSummary] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const rec = await createRepo({
        kind, name: name.trim(), visibility,
        display_name: displayName.trim(),
        summary: summary.trim(),
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
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
  };

  return (
    <div className="min-h-screen relative">
      <div className="absolute inset-0 starfield opacity-25 pointer-events-none" aria-hidden="true" />
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-soul-400/10">
        <Link to="/" className="text-soul-300 font-display tracking-[0.35em] text-sm">xp.io</Link>
      </nav>
      <main className="relative z-10 mx-auto max-w-2xl px-8 py-12">
        <h1 className="font-display text-3xl text-bark-300 mb-2">Plant a new seed</h1>
        <p className="text-sm text-bark-300/60 mb-10">
          Every repo on xp.io is a git repo — versioned, forkable, mergeable.
        </p>

        <form onSubmit={submit} className="space-y-6">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-bark-300/50 mb-2">Kind</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {KINDS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setKind(k.id)}
                  className={`text-left p-4 rounded-xl border transition-colors ${
                    kind === k.id
                      ? "border-soul-400/60 bg-night-800/60"
                      : "border-soul-400/10 bg-night-800/30 hover:border-soul-400/30"
                  }`}
                >
                  <div className="font-display text-sm text-bark-300">
                    <span className="text-soul-400/70 mr-1">{k.glyph}</span>
                    {k.label}
                  </div>
                  <div className="mt-1 text-xs text-bark-300/55">{k.blurb}</div>
                </button>
              ))}
            </div>
          </div>

          <Field label="Name (lowercase, alnum + . _ -)">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="my-cool-thing"
              className="bg-night-800/60 border border-soul-400/15 rounded-md px-3 py-2 text-sm text-bark-300/90 w-full"
            />
          </Field>

          <Field label="Display name (optional)">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="My Cool Thing"
              className="bg-night-800/60 border border-soul-400/15 rounded-md px-3 py-2 text-sm text-bark-300/90 w-full"
            />
          </Field>

          <Field label="Summary">
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              placeholder="one-line description"
              className="bg-night-800/60 border border-soul-400/15 rounded-md px-3 py-2 text-sm text-bark-300/90 w-full"
            />
          </Field>

          <Field label="Tags (comma-separated)">
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="trading, nlp"
              className="bg-night-800/60 border border-soul-400/15 rounded-md px-3 py-2 text-sm text-bark-300/90 w-full"
            />
          </Field>

          <Field label="Visibility">
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as Visibility)}
              className="bg-night-800/60 border border-soul-400/15 rounded-md px-3 py-2 text-sm text-bark-300/90 w-full"
            >
              <option value="public">public — shows on the marketspace</option>
              <option value="private">private — only you</option>
            </select>
          </Field>

          {err && <div className="text-xs text-atokirina-400">{err}</div>}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="px-5 py-2 text-xs uppercase tracking-widest rounded-full border border-soul-400/40 text-soul-300 hover:text-soul-400 hover:border-soul-400/70 disabled:opacity-50"
            >
              {busy ? "planting…" : "✦ create"}
            </button>
            <Link to="/" className="text-xs uppercase tracking-widest text-bark-300/40 hover:text-bark-300/70">
              cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-widest text-bark-300/50 mb-1">{label}</div>
      {children}
    </div>
  );
}
