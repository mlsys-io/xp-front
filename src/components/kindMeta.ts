// Single source of truth for per-kind identity: glyph, label, and the
// accent color used to give the catalog visual rhythm (HF/GitHub-style).
// Used by the marketspace sidebar + RepoCard so a kind looks the same
// everywhere. "strategy" intentionally folds into the workflow identity.
export type KindId = "app" | "workflow" | "skill" | "dataset" | "agent" | "strategy";

export type KindMeta = {
  glyph: string;
  label: string;
  text: string;     // glyph text color
  dot: string;      // small status/identity dot bg
  accent: string;   // left-border accent on cards
  tile: string;     // tinted icon-tile background on cards
};

export const KIND_META: Record<KindId, KindMeta> = {
  app:      { glyph: "⁂", label: "Apps",       text: "text-soul-400",   dot: "bg-soul-400",   accent: "border-l-soul-400",   tile: "bg-soul-400/10" },
  workflow: { glyph: "▷", label: "Workflows",  text: "text-blue-500",   dot: "bg-blue-500",   accent: "border-l-blue-400",   tile: "bg-blue-500/10" },
  strategy: { glyph: "◈", label: "Strategies", text: "text-blue-500",   dot: "bg-blue-500",   accent: "border-l-blue-400",   tile: "bg-blue-500/10" },
  skill:    { glyph: "⌘", label: "Skills",     text: "text-violet-500", dot: "bg-violet-500", accent: "border-l-violet-400", tile: "bg-violet-500/10" },
  dataset:  { glyph: "◫", label: "Experiments", text: "text-amber-500",  dot: "bg-amber-500",  accent: "border-l-amber-400",  tile: "bg-amber-500/10" },
  agent:    { glyph: "❋", label: "Agents",     text: "text-pink-500",   dot: "bg-pink-500",   accent: "border-l-pink-400",   tile: "bg-pink-500/10" },
};

export function kindMetaOf(kind: string): KindMeta {
  return KIND_META[(kind as KindId)] ?? KIND_META.app;
}
