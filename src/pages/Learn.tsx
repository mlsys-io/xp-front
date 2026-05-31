import { Link } from "react-router-dom";
import { Header } from "../components/Header";

export function Learn() {
  return (
    <div className="min-h-screen">
      <Header variant="learn" />

      <main className="mx-auto max-w-3xl px-8 py-12">

        {/* ── Hero ── */}
        <header className="mb-14">
          <p className="text-[11px] uppercase tracking-[0.3em] text-soul-300 mb-3">
            ◎ xp.io
          </p>
          <h1 className="text-4xl font-semibold text-gray-900 leading-tight">
            Become a super individual.
          </h1>
          <p className="mt-5 text-base text-gray-700 leading-relaxed">
            One person. AI-powered. Running an end-to-end operation that
            used to require a full team. xp.io is the marketspace where
            you find, install, and share the apps that make it happen —
            and the platform that keeps them learning.
          </p>
        </header>

        {/* ── The loop: assemble → adapt → compound ── */}
        <Section
          eyebrow="how it works"
          title="One loop. Three stages."
          body="Every app on xp.io runs the same loop — it assembles from the marketspace, adapts to your intent on a schedule, and compounds what it learns back into the catalog."
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StageCard
            number="1"
            title="Assemble"
            body="Install an app in one CLI line — or generate one from a sentence. It assembles from the marketspace's skills, datasets, and memory agents, and starts running your domain on a schedule while you sleep."
          />
          <StageCard
            number="2"
            title="Adapt"
            body="Every cycle the app adapts to your intent: it deposits what it learned into a memory bank, surfaces insights you didn't ask for, and tunes itself tighter to your domain. The curve compounds automatically."
          />
          <StageCard
            number="3"
            title="Compound"
            body="Distilled knowledge — never raw data — flows back to xp.io. Forks start where you left off. The more people run LumidOS, the smarter everyone's apps get."
          />
        </div>

        {/* Privacy differentiator — the trust line that makes stage 3 safe. */}
        <div className="rounded-xl border border-soul-400/30 bg-soul-400/5 px-5 py-4 mb-12 text-sm text-gray-700 leading-relaxed">
          <strong className="text-gray-900">Your raw data never leaves your machine.</strong>{" "}
          Only the knowledge you explicitly mark for sharing is published — an
          allowlist, not a denylist. Private agents (raw transcripts, code, secrets)
          stay on disk forever.
        </div>

        {/* ── Five demo apps ── */}
        <Section
          eyebrow="demo apps"
          title="Pick your domain."
          body="Each of these runs end-to-end today. Install any of them in one line and watch the knowledge bank grow."
        />
        <div className="space-y-3 mb-12">
          <DemoCard
            glyph="⁂"
            name="auto-quant"
            domain="Quantitative trading"
            body="A quant team that learns — write your strategy in five sentences. Trader, Risk Officer, and Analyst roles run paper + live cycles; the knowledge bank builds alpha patterns across every run."
          />
          <DemoCard
            glyph="⁂"
            name="mbb-ai"
            domain="Consulting / analysis"
            body="18-skill parallel case analysis. Nightly regression sweep catches quality drift before you see it. Pattern library grows with each case."
          />
          <DemoCard
            glyph="⁂"
            name="personal-agent"
            domain="Personal productivity"
            body="Morning brief, hourly triage, Gmail + Calendar. Watches your Claude Code sessions to learn how you think. Your raw knowledge stays private forever."
          />
          <DemoCard
            glyph="⁂"
            name="auto-sysresearch"
            domain="Systems / optimization"
            body="Deploys containerised system variants, benchmarks each, and uses an LLM optimizer to propose what to try next. Fork it by swapping in your own system + benchmark."
          />
          <DemoCard
            glyph="⁂"
            name="eventx"
            domain="Data annotation"
            body="Per-task active-learning labeling — a pipeline DAG with idempotency gates. Generic enough to point at any annotation problem."
          />
        </div>

        {/* ── When device isn't enough ── */}
        <Section
          eyebrow="cloud"
          title="When your device isn't enough, we have the rest."
          body="Heavy compute bursts to cloud GPU automatically. Lumilake's HALO optimizer assigns pipeline stages to the right hardware and learns from execution history. Expert knowledge agents on xp.io let your loops start where someone else's left off. You bring the domain — we bring the compute, the analytics, and the collective knowledge."
        />
        <div className="rounded-xl border border-gray-200 bg-night-800 p-5 mb-12 font-mono text-[12.5px] leading-relaxed">
          <div className="text-gray-500"># install an app — one line, no UUID</div>
          <div className="text-gray-900">lumid app install auto-quant</div>
          <div className="mt-3 text-gray-500"># query the knowledge graph</div>
          <div className="text-gray-900">lumid xp ask "what alpha patterns worked this week?"</div>
          <div className="mt-3 text-gray-500"># subscribe to a published knowledge delta</div>
          <div className="text-gray-900">lumid xp subscribe my-trader-agent lumid/auto-quant-trader</div>
        </div>

        {/* Footer — quiet outro + the one link to the developer reference. */}
        <div className="border-t border-gray-200 pt-8 mt-4 flex flex-col items-center gap-3 text-center">
          <Link
            to="/learn/catalog"
            className="text-sm text-soul-300 hover:text-soul-400 underline-offset-2 hover:underline"
          >
            For developers &amp; publishers — how the catalog works →
          </Link>
          <p className="text-sm text-gray-600">
            Or just{" "}
            <Link to="/" className="text-soul-300 hover:text-soul-400 underline-offset-2 hover:underline">
              look around the marketspace →
            </Link>
          </p>
          <p className="text-[11px] text-gray-400 uppercase tracking-widest">
            sign-in is only required for actions — browse anonymously
          </p>
        </div>
      </main>
    </div>
  );
}

// Section header — small eyebrow + title + opening paragraph.
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
      {body && <p className="text-base text-gray-700 leading-relaxed">{body}</p>}
    </section>
  );
}

function StageCard({
  number, title, body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 flex flex-col gap-2">
      <span className="text-[11px] uppercase tracking-widest text-soul-300">{number}</span>
      <span className="text-base font-semibold text-gray-900">{title}</span>
      <span className="text-[13px] text-gray-600 leading-relaxed">{body}</span>
    </div>
  );
}

function DemoCard({
  glyph, name, domain, body,
}: {
  glyph: string;
  name: string;
  domain: string;
  body: string;
}) {
  return (
    <Link
      to={`/search?q=${name}`}
      className="rounded-xl border border-gray-200 bg-white px-5 py-4 flex gap-4 hover:border-soul-300 transition-colors"
    >
      <span className="text-xl text-soul-300 leading-none w-6 mt-0.5 shrink-0 text-center">{glyph}</span>
      <span className="flex flex-col gap-1">
        <span className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-gray-900">{name}</span>
          <span className="text-[11px] text-gray-500 uppercase tracking-widest">{domain}</span>
        </span>
        <span className="text-[13px] text-gray-600 leading-relaxed">{body}</span>
      </span>
    </Link>
  );
}
