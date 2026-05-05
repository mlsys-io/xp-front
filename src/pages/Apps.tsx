import { KindBrowse } from "./KindBrowse";

/**
 * `/apps` — kind=app landing.
 *
 * Applications are the top-tier asset on xp.io: each holds its own
 * autoresearch loops, role definitions, and pinned datasets.
 */
export function Apps() {
  return (
    <KindBrowse
      kind="app"
      glyph="⁂"
      title="Applications"
      blurb="Domain-goal bundles that hold their own autoresearch loops, role definitions, and pinned datasets — the top-tier asset on xp.io."
    />
  );
}
