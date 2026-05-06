import { KindBrowse } from "./KindBrowse";

/**
 * `/agents` — kind=agent landing.
 *
 * Memory snapshots (bank.jsonl + bandit.json) committed from a working
 * agent. Pull one to seed an application's knowledge with someone
 * else's accumulated wisdom. (The standalone `kind=autoresearch` repo
 * type was retired in xp.io 0.3 — autoresearch loops now live inside
 * an application's manifest, browsable from each app's detail page.)
 */
export function Agents() {
  return (
    <KindBrowse
      kind="agent"
      glyph="❋"
      title="Agentic KG"
      blurb="Shareable memory snapshots committed from working agents. Pull one to seed an application's knowledge with someone else's accumulated wisdom."
    />
  );
}
