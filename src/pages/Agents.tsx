import { KindBrowse } from "./KindBrowse";

/**
 * `/agents` — knowledge-bank ("memory") landing.
 *
 * Memory snapshots (bank.jsonl + bandit.json) committed from a working
 * agent. Subscribe to one to seed an agent's knowledge with someone
 * else's accumulated wisdom.
 *
 * Phase 4 (app→agent, docs/architecture/unified-components.md): this page
 * browses the KNOWLEDGE-BANK kind, renamed `agent → memory`. The deployable
 * ACTOR is now the `agent` kind (see /apps → "Agents"). The query stays
 * `kind=agent` for dual-read while the server normalizes old `agent` banks to
 * `memory`.
 * TODO(phase4): once the server emits `kind=memory` for banks, switch the
 *   query to kind="memory" and host this under a /memory route; the actor
 *   marketplace should own the /agents path.
 */
export function Agents() {
  return (
    <KindBrowse
      kind="agent"
      glyph="❋"
      title="Memory"
      blurb="Shareable memory snapshots committed from working agents. Subscribe to one to seed an agent's knowledge with someone else's accumulated wisdom."
    />
  );
}
