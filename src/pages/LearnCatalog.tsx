import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AuthorBadge } from "../components/AuthorBadge";
import { DeprecationBanner } from "../components/DeprecationBanner";
import { Header } from "../components/Header";
import {
  DisagreementMatrix,
  type DisagreementHit,
  discoverDisagreement,
} from "../components/DisagreementMatrix";

// Live demo wrapper — points the matrix at mbb-ai's published cycle.
const MBB_AI_OWNER = "ceba53d6-f253-4d22-803a-fdd1ba077626";
const MBB_AI_NAME = "mbb-ai";
const MBB_AI_BRANCH = "main";

function MbbAiMatrixDemo() {
  const [hit, setHit] = useState<DisagreementHit | null | "loading">("loading");

  useEffect(() => {
    let alive = true;
    discoverDisagreement(MBB_AI_OWNER, MBB_AI_NAME, MBB_AI_BRANCH)
      .then((h) => { if (alive) setHit(h); })
      .catch(() => { if (alive) setHit(null); });
    return () => { alive = false; };
  }, []);

  if (hit === "loading") {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 text-xs text-gray-500">
        Loading the latest mbb-ai cycle artifact…
      </div>
    );
  }
  if (hit === null) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 text-xs text-gray-500">
        No disagreement_bench.json found in mbb-ai's published bundle yet.
      </div>
    );
  }
  return (
    <DisagreementMatrix
      bench={hit.bench}
      owner={MBB_AI_OWNER}
      name={MBB_AI_NAME}
      branch={MBB_AI_BRANCH}
      filePath={hit.filePath}
    />
  );
}

// The developer/publisher reference. Split out of Learn.tsx so the newcomer
// pitch stays a ~1.5-screen read; this page is the deep dive on how the
// catalog itself works — kinds, search, trust signals, the dependency graph,
// the disagreement matrix, the authoring loop, and the install path.
export function LearnCatalog() {
  return (
    <div className="min-h-screen">
      <Header variant="learn" />

      <main className="mx-auto max-w-3xl px-8 py-12">

        <header className="mb-12">
          <p className="text-[11px] uppercase tracking-[0.3em] text-soul-300 mb-3">
            catalog reference
          </p>
          <h1 className="text-3xl font-semibold text-gray-900 leading-tight">
            How the catalog works.
          </h1>
          <p className="mt-4 text-base text-gray-700 leading-relaxed">
            For developers and publishers — the primitives, the trust signals,
            and the wiring underneath the marketspace.{" "}
            <Link to="/learn" className="text-soul-300 hover:text-soul-400 underline-offset-2 hover:underline">
              ← back to the overview
            </Link>
          </p>
        </header>

        {/* 1. Browse by kind */}
        <Section
          eyebrow="browse"
          title="Four kinds, one catalog."
          body={`The marketspace splits into four primitives. Apps are
            the headline asset — domain goals with their own
            autoresearch loops and pinned datasets. Skills are
            procedural know-how that any app can import. Datasets carry
            inputs plus a benchmark so two users running the same loop
            see identical scoring. Agents are memory snapshots —
            bank.jsonl plus bandit state from a working role, ready to
            seed an app's knowledge.`}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-12">
          <KindCard
            to="/apps"
            glyph="⁂"
            label="Applications"
            sub="Domain goal · roles · loops · datasets"
          />
          <KindCard
            to="/skills"
            glyph="⌘"
            label="Skills"
            sub="SKILL.md · imported via skill_imports[]"
          />
          <KindCard
            to="/datasets"
            glyph="▤"
            label="Datasets"
            sub="Inputs + benchmark, pinned by a loop"
          />
          <KindCard
            to="/agents"
            glyph="❋"
            label="Agents"
            sub="Memory snapshot · bank.jsonl + bandit"
          />
        </div>

        {/* 2. Search. */}
        <Section
          eyebrow="search"
          title="Find anything by name, summary, or tag."
          body={`Type a query into the search bar at the top of every
            page. The server scores by exact-name match first, then
            falls back to summary and tag content. Results are grouped
            by kind so you can scan a single domain quickly. Optionally
            scope the kind via the dropdown to the left of the input.`}
        />
        <SearchMock />

        {/* 3. Trust signals — three cards. */}
        <Section
          eyebrow="trust"
          title="Read the signals before you install."
          body={`Every repo carries three signals you can read at a
            glance: the author tier (who published it), the version
            history (whether it follows semver), and a deprecation
            banner (whether it's still the current canonical version).
            None of these need a backend round-trip — they're
            classified from the manifest and rendered the same way
            across cards and detail pages.`}
        />

        <SubHead>Author badges</SubHead>
        <p className="text-gray-700 leading-relaxed mb-3">
          Three tiers, classified by owner. <strong>First-party</strong>{" "}
          repos are published by the Lumid catalog team — the canonical
          baseline for any kind. <strong>Verified</strong> repos are
          staff-vouched community publishers. <strong>Community</strong>{" "}
          is everyone else; the badge is neutral, not a warning. The
          same pill renders next to repo titles and on every card.
        </p>
        <div className="rounded-xl border border-gray-200 bg-night-800 p-5 mb-8">
          <div className="text-[11px] uppercase tracking-widest text-gray-500 mb-3">
            live preview · the same component the rest of the site uses
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <BadgeRow
              label="admin@lumid.market"
              owner_sub="70f192ce-97f3-5d9e-4324-8a557ea72900"
            />
            <BadgeRow
              label="admin@lum.id"
              owner_sub="e6f31d99-442f-4864-a3e1-2807ea73553f"
            />
            <BadgeRow
              label="any-other-user"
              owner_sub="00000000-0000-0000-0000-000000000000"
            />
          </div>
        </div>

        <SubHead>Semver enforcement</SubHead>
        <p className="text-gray-700 leading-relaxed mb-8">
          A push that changes content but leaves the manifest's{" "}
          <code className="bg-gray-100 px-1 rounded text-[12px]">version</code>{" "}
          field untouched is rejected at the API. This isn't a polite
          suggestion — it's the gate that makes the catalog's history
          legible. If you want to ship a change, bump the version. If
          you want to fix a typo, bump the patch. The result is that
          every repo's commit log lines up with its release timeline,
          and consumers downstream can pin to a version with confidence
          that the bytes don't shift under them.
        </p>

        <SubHead>Deprecation notices</SubHead>
        <p className="text-gray-700 leading-relaxed mb-3">
          When a repo is replaced — by a successor, by a merger into
          another, or simply by being retired — the maintainer sets{" "}
          <code className="bg-gray-100 px-1 rounded text-[12px]">deprecated: true</code>{" "}
          (and ideally a{" "}
          <code className="bg-gray-100 px-1 rounded text-[12px]">replaced_by: owner/name</code>{" "}
          pointer) in the manifest. Every detail page then renders the
          banner below at the top, so anyone who follows an old link
          lands on the new home in one click. Cards get a subtle
          "deprecated" tag too.
        </p>
        <div className="mb-12">
          <DeprecationBanner
            fields={{
              deprecated: true,
              deprecated_at: "2026-03-15",
              replaced_by: "admin@lumid.market/mbb-ai-v2",
              deprecation_reason:
                "Folded into the v2 release; v1 stays readable for history.",
            }}
          />
          <p className="text-[11px] text-gray-500 italic">
            example only — the banner above renders against a real
            manifest in production
          </p>
        </div>

        <SubHead>Compatibility attestations</SubHead>
        <p className="text-gray-700 leading-relaxed mb-8">
          Skill repos can publish a{" "}
          <code className="bg-gray-100 px-1 rounded text-[12px]">tested_with[]</code>{" "}
          block listing every consumer app and the versions known to
          pass that consumer's regression suite. The compat runner
          executes this on a sandboxed fresh HOME for every consumer
          on every push, so the badges on a skill's repo page
          ("✓ mbb-ai 0.6.2", "↑ stale on auto-quant") reflect the
          actual current state of the catalog rather than a manual
          claim. If the skill ships a new version and a downstream
          consumer's tests fail, the row goes red on both repos at
          once — you see the breakage before pulling the skill in.
        </p>

        {/* 4. Dependency graph. */}
        <Section
          eyebrow="dependency graph"
          title="Skills are reused. The graph shows you who reuses what."
          body={`On any kind=skill repo's page, look for the "Consumed
            by N apps" section in the right rail. It lists every app
            that pulls the skill in via skill_imports[] in its
            manifest. The relationship is the connective tissue of the
            catalog — fixing a bug in a widely-imported skill cascades
            outward instead of stalling on a fork. Inversely, an app's
            page shows the skills it depends on, so you can read its
            full chain before you install.`}
        />

        {/* 5. Disagreement matrix + κ. */}
        <Section
          eyebrow="disagreement matrix"
          title="Trust the score — when do the methods agree?"
          body={`A single LLM judge can be confident and wrong. Apps
            running in triangulation mode score the same answer along
            multiple independent columns (LLM judge, programmatic
            check, embedding match, structural rule, human audit) and
            publish a per-cycle JSON artifact with the disagreement
            cells flagged. The UI renders it as a heatmap below.
            Bright off-diagonal cells are the cells worth looking at;
            everything else is consensus. Apps that run multiple
            judges also report Cohen's κ between every judge pair —
            "agreed" (≥0.65) means the rubric is stable, "moderate"
            (0.4–0.65) is a flag-for-audit band, "discordant" (<0.4)
            means the rubric itself is unstable, not the candidate.
            mbb-ai is the working reference.`}
        />
        <div className="mb-12 space-y-2">
          <div className="text-[11px] uppercase tracking-widest text-gray-500">
            live demo — mbb-ai's most recent published cycle
          </div>
          <MbbAiMatrixDemo />
          <p className="text-xs text-gray-600 leading-relaxed">
            This is the actual matrix from{" "}
            <Link
              to={`/${MBB_AI_OWNER}/${MBB_AI_NAME}`}
              className="text-soul-300 hover:text-soul-400 underline-offset-2 hover:underline"
            >
              {MBB_AI_OWNER.slice(0, 8)}…/{MBB_AI_NAME}
            </Link>
            's bundle on xp.io — Q-types as rows, disagreement-flag
            types as columns, cell brightness scales with the
            count. The columns reorder by total count, so the
            busiest column is leftmost: that's the methodology gap
            the LLM-as-judge alone would have hidden. Click "Download
            artifact" on the heatmap to grab the raw JSON.
          </p>
        </div>

        {/* 5b. Authoring loop — Lumid Studio. */}
        <Section
          eyebrow="authoring"
          title="The system proposes the next change. You review."
          body={`Lumid Studio is the authoring layer that watches a
            running app's cycles and drafts the change it thinks
            should happen next — a new candidate skill, a tightened
            judge prompt, a new rubric memo. Drafts come from three
            sources: the cycle itself (validator gaps + insights
            candidates + bandit signals), the human web form at
            lum.id/dashboard/skills/new, and sub-agents inside Claude
            Code. Each draft runs through draft → validate → review →
            apply. The approval policy in the app's xpcloud.yaml says
            which classes auto-apply, which stage for human review,
            and which always force review (e.g. judge prompt edits in
            a paper-grade benchmark).`}
        />
        <div className="rounded-xl border border-gray-200 bg-white p-5 mb-12 text-sm text-gray-700 leading-relaxed">
          <p className="mb-2"><strong>The steady-state flow.</strong> After every cycle you wake up to drafts in your inbox: <em>"new skill: revenue_brainstorm"</em>, <em>"prompt edit: judge_score_qual.md"</em>, <em>"new memory: Q4 quantitative answers without ground-truth check should release before scoring"</em>. Open each, see the diff inline, edit if you want, click Approve. The next cycle picks up the patch.</p>
          <p>Open <Link to="/dashboard/inbox" className="text-soul-300 hover:text-soul-400 underline-offset-2 hover:underline">your inbox</Link> for staged drafts, or <Link to="/dashboard/skills/new" className="text-soul-300 hover:text-soul-400 underline-offset-2 hover:underline">draft a skill from scratch</Link> when you have an idea before the AI's seen enough cycles to suggest one.</p>
        </div>

        {/* 5c. Cross-team knowledge primitives. */}
        <Section
          eyebrow="shared knowledge"
          title="Memories move between teammates without copy-paste."
          body={`Every published agent ships its memory bank with
            provenance. Four CLI commands let you move memories
            between people — by tag, by quality score, by recency,
            by chain depth — without ever rewriting a JSON file.
            Each imported memory remembers where it came from, so the
            verification chain compounds rather than resets. As more
            teams pull a memo in, its "verified by N agents" stat
            climbs; the memos that prove themselves rise to the top
            of every bandit ranking.`}
        />
        <div className="rounded-xl border border-gray-200 bg-night-800 p-5 mb-12 font-mono text-[12.5px] leading-relaxed">
          <div className="text-gray-500"># import filtered memos from a teammate (one-shot, AND-filtered):</div>
          <div className="text-gray-900">lumid xp merge ceba53d6-…/mbb-ai-judge mbb-ai-judge \</div>
          <div className="text-gray-900 ml-6">--tag=rubric --min-bandit=0.7 --max=25</div>
          <div className="mt-3 text-gray-500"># follow a teammate's bank (cursor-based — pulls only NEW memos as they're added):</div>
          <div className="text-gray-900">lumid xp subscribe mbb-ai-judge ceba53d6-…/mbb-ai-judge</div>
          <div className="mt-3 text-gray-500"># snapshot someone else's whole bank into a fresh agent (no filters, no overlap with yours):</div>
          <div className="text-gray-900">lumid xp fork mbb-ai-judge-imported ceba53d6-…/mbb-ai-judge</div>
          <div className="mt-3 text-gray-500"># inspect quality stats — verified-by counts, max chain depth, source breakdown:</div>
          <div className="text-gray-900">lumid xp signals --agent mbb-ai-judge</div>
          <div className="mt-3 text-gray-500"># find agent dirs on disk that aren't in the registry (orphans from older SDK versions or docker runs):</div>
          <div className="text-gray-900">lumid xp scan-orphans            <span className="text-gray-500"># list-only</span></div>
          <div className="text-gray-900">lumid xp scan-orphans --register <span className="text-gray-500"># bring them all back into the registry</span></div>
        </div>

        {/* 6. Install path. */}
        <Section
          eyebrow="install"
          title="One CLI line, no UUID."
          body={`The bare slug is enough — the resolver walks
            first-party owners first, then falls back to a search.
            Anonymous install works for any public repo, so you can
            try a community app without an account. Once you've signed
            in and minted a Personal Access Token, the same install
            command works against private repos you own or have been
            invited to.`}
        />
        <div className="rounded-xl border border-gray-300 bg-night-800 p-5 font-mono text-[13px] leading-relaxed mb-12">
          <div className="text-gray-500"># bare slug — works without an owner UUID</div>
          <div className="text-gray-900">lumid app_install mbb-ai</div>
          <div className="mt-3 text-gray-500"># or fully-qualified, identical effect</div>
          <div className="text-gray-900">lumid app_install ceba53d6-5f97-…/mbb-ai</div>
        </div>

        {/* 7. Reuse — narrative paragraph, not numbers. */}
        <Section
          eyebrow="reuse"
          title="The catalog is wired together."
          body={`A single observability skill, written once, ends up
            imported by every loop that wants structured run logs.
            One market-data skill is shared across the trading apps. A
            handful of agents bundle the strongest replay banks so a
            new app starts with someone else's accumulated wisdom
            instead of from zero. The payoff is that improvements move
            sideways across the catalog: fixing a skill helps every
            app that pulls it; pulling a sharper agent updates every
            seed that depends on it.`}
        />
        <div className="rounded-xl border border-gray-200 bg-white p-5 mb-12">
          <p className="text-sm text-gray-700 leading-relaxed">
            Browse the shared substrate at{" "}
            <Link to="/skills" className="text-soul-300 hover:text-soul-400 underline-offset-2 hover:underline">⌘ /skills</Link>{" "}
            (procedural know-how) and{" "}
            <Link to="/agents" className="text-soul-300 hover:text-soul-400 underline-offset-2 hover:underline">❋ /agents</Link>{" "}
            (memory snapshots). The consumers are at{" "}
            <Link to="/apps" className="text-soul-300 hover:text-soul-400 underline-offset-2 hover:underline">⁂ /apps</Link>{" "}
            — open any one and scroll to its dependency list to see the
            graph from the other side. Datasets sit at{" "}
            <Link to="/datasets" className="text-soul-300 hover:text-soul-400 underline-offset-2 hover:underline">▤ /datasets</Link>{" "}
            and are typically pinned by a single loop, so the
            connection is one-to-many rather than many-to-many.
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-8 mt-4 text-center">
          <p className="text-sm text-gray-600">
            <Link to="/learn" className="text-soul-300 hover:text-soul-400 underline-offset-2 hover:underline">
              ← back to the overview
            </Link>
            {"  ·  "}
            <Link to="/" className="text-soul-300 hover:text-soul-400 underline-offset-2 hover:underline">
              browse the marketspace →
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

// ── local helpers ───────────────────────────────────────────────────────

function Section({
  eyebrow, title, body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <section className="mb-5">
      <p className="text-[11px] uppercase tracking-[0.25em] text-soul-300 mb-2">
        {eyebrow}
      </p>
      <h2 className="text-2xl font-semibold text-gray-900 leading-snug mb-3">
        {title}
      </h2>
      <p className="text-base text-gray-700 leading-relaxed">{body}</p>
    </section>
  );
}

function SubHead({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-6 mb-2 text-lg font-semibold text-gray-900">{children}</h3>
  );
}

function KindCard({
  to, glyph, label, sub,
}: {
  to: string;
  glyph: string;
  label: string;
  sub: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-soul-300 transition-colors flex items-center gap-3"
    >
      <span className="text-2xl text-soul-300 leading-none w-8 text-center">{glyph}</span>
      <span className="flex flex-col">
        <span className="text-sm font-semibold text-gray-900">{label}</span>
        <span className="text-[12px] text-gray-600">{sub}</span>
      </span>
    </Link>
  );
}

function SearchMock() {
  return (
    <div className="rounded-xl border border-gray-200 bg-night-800 p-5 mb-12">
      <div className="text-[11px] uppercase tracking-widest text-gray-500 mb-3">
        example · what you'd see typing "mbb"
      </div>
      <div className="flex items-center gap-2">
        <span className="appearance-none bg-white border border-gray-200 rounded-full pl-3 pr-7 py-1.5 text-[11px] uppercase tracking-widest text-gray-700 select-none">
          all
        </span>
        <span className="bg-white border border-gray-300 rounded-full px-4 py-1.5 text-xs text-bark-300 w-64 select-none">
          mbb
        </span>
        <span className="text-[11px] uppercase tracking-widest text-soul-300 select-none">
          go →
        </span>
      </div>
      <p className="mt-3 text-xs text-gray-600 leading-relaxed">
        Hits in <strong>names</strong> outrank hits in summaries; hits
        in summaries outrank hits in tags. Results group by kind so a
        scan of "apps that mention mbb" is a single section.
      </p>
    </div>
  );
}

function BadgeRow({
  label, owner_sub,
}: {
  label: string;
  owner_sub: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <AuthorBadge owner_sub={owner_sub} size="header" />
      <span className="text-[11px] text-gray-500">{label}</span>
    </div>
  );
}
