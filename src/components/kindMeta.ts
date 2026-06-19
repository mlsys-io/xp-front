// Single source of truth for per-kind identity: glyph, label, and the
// accent color used to give the catalog visual rhythm (HF/GitHub-style).
// Used by the marketspace sidebar + RepoCard so a kind looks the same
// everywhere. "strategy" intentionally folds into the workflow identity.
//
// Phase 4 rename (app→agent): per docs/architecture/unified-components.md the
// deployable ACTOR is the `agent` (was `app`); the bank/knowledge slice is
// `memory` (was the old `agent` kind). The marketplace server NORMALIZES kinds
// before they reach the UI (kind:app → agent, old kind:agent → memory), so in
// the UI we treat the wire string "agent" as the ACTOR (Agents/⁂) and "memory"
// as knowledge (Memories/❋). `app` is kept in the union as a DUAL-READ alias
// that maps to the agent identity so any un-normalized legacy card still
// renders correctly.
export type KindId = "agent" | "app" | "workflow" | "skill" | "dataset" | "memory" | "strategy";

export type KindMeta = {
  glyph: string;
  label: string;
  text: string;     // glyph text color
  dot: string;      // small status/identity dot bg
  accent: string;   // left-border accent on cards
  tile: string;     // tinted icon-tile background on cards
};

// The agent identity (actor) — the glyph/label/accent that used to belong to
// `app`. Both `agent` (canonical) and `app` (legacy alias) point at this.
const AGENT_META: KindMeta = { glyph: "⁂", label: "Agents", text: "text-soul-400", dot: "bg-soul-400", accent: "border-l-soul-400", tile: "bg-soul-400/10" };

export const KIND_META: Record<KindId, KindMeta> = {
  agent:    AGENT_META,                  // the ACTOR (canonical; was `app`)
  app:      AGENT_META,                  // legacy alias → agent identity (dual-read)
  workflow: { glyph: "▷", label: "Workflows",  text: "text-blue-500",   dot: "bg-blue-500",   accent: "border-l-blue-400",   tile: "bg-blue-500/10" },
  strategy: { glyph: "◈", label: "Strategies", text: "text-blue-500",   dot: "bg-blue-500",   accent: "border-l-blue-400",   tile: "bg-blue-500/10" },
  skill:    { glyph: "⌘", label: "Skills",     text: "text-violet-500", dot: "bg-violet-500", accent: "border-l-violet-400", tile: "bg-violet-500/10" },
  dataset:  { glyph: "◫", label: "Datasets",    text: "text-amber-500",  dot: "bg-amber-500",  accent: "border-l-amber-400",  tile: "bg-amber-500/10" },
  memory:   { glyph: "❋", label: "Memories",   text: "text-pink-500",   dot: "bg-pink-500",   accent: "border-l-pink-400",   tile: "bg-pink-500/10" },
};

export function kindMetaOf(kind: string): KindMeta {
  // Default to the agent (actor) identity for unknown/un-normalized kinds —
  // the actor is the most common card kind and the old `app` default.
  return KIND_META[(kind as KindId)] ?? KIND_META.agent;
}
