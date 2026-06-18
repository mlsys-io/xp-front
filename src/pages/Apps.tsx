import { KindBrowse } from "./KindBrowse";

/**
 * `/apps` — kind=app landing. Phase 4 (app→agent): the actor is now the
 * "Agent" (was "Application"/"app"); the kind query stays "app" (server
 * normalizes to agent on read). See docs/architecture/unified-components.md.
 *
 * Agents are the top-tier asset on xp.io: each holds its own autoresearch
 * loops, role definitions, and pinned datasets.
 */
export function Apps() {
  return (
    <KindBrowse
      kind="app"
      glyph="⁂"
      title="Agents"
      blurb="Domain-goal bundles that hold their own autoresearch loops, role definitions, and pinned datasets — the top-tier asset on xp.io."
    />
  );
}
