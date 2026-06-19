import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "../components/Header";

export function Git() {
  return (
    <div className="min-h-screen">
      <Header variant="learn" />

      <main className="mx-auto max-w-3xl px-8 py-12">

        {/* ── Hero ── */}
        <header className="mb-12">
          <p className="text-[11px] uppercase tracking-[0.3em] text-soul-300 mb-3">
            ◎ xp.io / git
          </p>
          <h1 className="text-4xl font-semibold text-gray-900 leading-tight">
            Every repo is a real Git repo.
          </h1>
          <p className="mt-5 text-base text-gray-700 leading-relaxed">
            Clone, push, and pull with any Git tool you already know.
            xp.io speaks the standard{" "}
            <span className="font-mono text-[15px] text-gray-800">git-http-backend</span>{" "}
            Smart HTTP protocol — no custom CLI required.
          </p>
        </header>

        {/* ── 1. Get a PAT ── */}
        <Section number="1" title="Get a Personal Access Token">
          <p className="text-sm text-gray-700 leading-relaxed mb-4">
            Git uses HTTP Basic auth. The password is your Lumid PAT —
            the username is ignored (use any string, e.g.{" "}
            <code className="font-mono bg-gray-100 px-1 rounded">x</code>).
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://lum.id/dashboard/tokens"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-soul-400 text-white text-sm font-medium hover:bg-soul-500 transition-colors"
            >
              Mint a PAT at lum.id ↗
            </a>
            <a
              href="https://xp.io/dashboard/tokens"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              xp.io dashboard tokens ↗
            </a>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Your PAT starts with{" "}
            <code className="font-mono bg-gray-100 px-1 rounded">lm_pat_live_</code>.
            Keep it secret — it has the same access as your login session.
          </p>
        </Section>

        {/* ── 2. Find the clone URL ── */}
        <Section number="2" title="Find your repo's clone URL">
          <p className="text-sm text-gray-700 leading-relaxed mb-4">
            Open any repo on xp.io. The clone URL appears just below the
            description — click the copy button next to it.
          </p>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
            <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">URL shape</p>
            <code className="font-mono text-gray-800 break-all">
              https://xp.io/<span className="text-soul-400">{"{owner_sub}"}</span>/<span className="text-soul-400">{"{name}"}</span>.git
            </code>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            <span className="font-mono text-gray-700">{"{owner_sub}"}</span> is the owner UUID
            shown in the URL bar when you visit a repo —{" "}
            e.g.{" "}
            <span className="font-mono text-gray-700">a3f48236-ffe9-4fb9-...</span>.
            Pretty owner handles are coming; the UUID works today.
          </p>
        </Section>

        {/* ── 3. Clone ── */}
        <Section number="3" title="Clone a repo">
          <p className="text-sm text-gray-700 leading-relaxed mb-3">
            Embed the PAT in the URL (simplest):
          </p>
          <CopyBlock
            label="Clone with embedded PAT"
            code={`git clone https://x:YOUR_PAT@xp.io/{owner}/{name}.git`}
          />
          <p className="mt-4 text-sm text-gray-700 leading-relaxed mb-3">
            Or set up <code className="font-mono bg-gray-100 px-1 rounded">~/.netrc</code> once
            so you never type the token again (recommended):
          </p>
          <CopyBlock
            label="~/.netrc entry (run once)"
            code={`echo "machine xp.io login x password YOUR_PAT" >> ~/.netrc\nchmod 600 ~/.netrc`}
          />
          <p className="mt-3 text-sm text-gray-700 leading-relaxed">
            Then plain <code className="font-mono bg-gray-100 px-1 rounded">git clone https://xp.io/{"{owner}/{name}"}.git</code> works
            without embedding the token anywhere.
          </p>
        </Section>

        {/* ── 4. Push ── */}
        <Section number="4" title="Push changes">
          <p className="text-sm text-gray-700 leading-relaxed mb-3">
            You can push only to repos you own. After cloning:
          </p>
          <CopyBlock
            label="Push to xp.io"
            code={`git add .\ngit commit -m "update"\ngit push`}
          />
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 leading-relaxed">
            <strong>Version bump required on content changes.</strong>{" "}
            If the repo contains a manifest (
            <code className="font-mono text-[12px]">xpcloud.yaml</code> /{" "}
            <code className="font-mono text-[12px]">manifest.yaml</code>),
            the push is rejected when content changes without a version bump.
            This protects downstream consumers from silent updates.
          </div>
        </Section>

        {/* ── 5. Pull ── */}
        <Section number="5" title="Pull updates">
          <p className="text-sm text-gray-700 leading-relaxed mb-3">
            Standard pull — works for both public and private repos you have access to:
          </p>
          <CopyBlock label="Pull latest" code={`git pull`} />
        </Section>

        {/* ── 6. Auth summary table ── */}
        <section className="mb-10">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Auth rules at a glance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-6 text-xs uppercase tracking-wider text-gray-400 font-normal">Operation</th>
                  <th className="text-left py-2 pr-6 text-xs uppercase tracking-wider text-gray-400 font-normal">Public repo</th>
                  <th className="text-left py-2 text-xs uppercase tracking-wider text-gray-400 font-normal">Private repo</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-6 font-mono text-[12px]">git clone / pull</td>
                  <td className="py-2 pr-6 text-gray-500">No auth required</td>
                  <td className="py-2">PAT required (owner only)</td>
                </tr>
                <tr>
                  <td className="py-2 pr-6 font-mono text-[12px]">git push</td>
                  <td className="py-2 pr-6">PAT required (owner only)</td>
                  <td className="py-2">PAT required (owner only)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ── 7. CI ── */}
        <section className="mb-10">
          <h2 className="text-base font-semibold text-gray-900 mb-2">
            CI — run tests on every push
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed mb-4">
            Drop a <code className="font-mono bg-gray-100 px-1 rounded text-[12px]">.xpio/ci.yml</code>{" "}
            in your repo root. xp.io picks it up automatically on the next push and runs each step in order.
            Results appear on the repo&rsquo;s CI tab and as a small dot on the marketplace card.
          </p>
          <CopyBlock
            label=".xpio/ci.yml — minimal example"
            code={`on: [push, manual]\n\njobs:\n  test:\n    steps:\n      - name: Install\n        run: pip install -e ".[dev]" -q\n      - name: Test\n        run: pytest tests/ -v --tb=short`}
          />
          <div className="mt-4 space-y-2 text-sm text-gray-700 leading-relaxed">
            <p>
              <strong>on:</strong>{" "}
              <code className="font-mono bg-gray-100 px-1 rounded text-[12px]">push</code> triggers on every push.{" "}
              <code className="font-mono bg-gray-100 px-1 rounded text-[12px]">manual</code> adds a
              &ldquo;Run CI&rdquo; button on the CI tab.
            </p>
            <p>
              <strong>steps</strong> run as shell commands (
              <code className="font-mono bg-gray-100 px-1 rounded text-[12px]">sh -c</code>) in
              a fresh clone of your repo at the pushed commit. The working directory is your repo
              root. Step execution stops at the first failure.
            </p>
            <p>
              <strong>Timeouts:</strong> each step defaults to 120 s; the whole job defaults to 600 s.
              Override per-job with{" "}
              <code className="font-mono bg-gray-100 px-1 rounded text-[12px]">timeout: 300</code>.
            </p>
            <p>
              <strong>Environment:</strong> only{" "}
              <code className="font-mono bg-gray-100 px-1 rounded text-[12px]">CI=1</code>,{" "}
              <code className="font-mono bg-gray-100 px-1 rounded text-[12px]">XPIO_SHA</code>,{" "}
              <code className="font-mono bg-gray-100 px-1 rounded text-[12px]">XPIO_BRANCH</code>, and{" "}
              <code className="font-mono bg-gray-100 px-1 rounded text-[12px]">XPIO_RUN_ID</code>{" "}
              are set by default. Add extra vars with{" "}
              <code className="font-mono bg-gray-100 px-1 rounded text-[12px]">env:</code> in the job.
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs font-semibold text-gray-600 mb-2">Full config reference</p>
            <CopyBlock
              label="all fields shown"
              code={`on: [push, manual]\n\njobs:\n  build:                    # job name (one job in v1)\n    timeout: 600            # seconds, default 600\n    env:\n      MY_VAR: "value"\n    steps:\n      - name: Install deps\n        run: npm ci\n      - name: Lint\n        run: npm run lint\n      - name: Test\n        run: npm test`}
            />
          </div>

          <p className="mt-3 text-xs text-gray-500">
            CI logs and run history are visible on the{" "}
            <strong>CI tab</strong> of every repo page.
            Public repo CI logs are readable by anyone; private repo logs require auth.
          </p>
        </section>

        {/* ── 8. VS Code / IDE ── */}
        <section className="mb-10">
          <h2 className="text-base font-semibold text-gray-900 mb-2">Works with any Git client</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            GitHub Desktop, VS Code Source Control, JetBrains VCS, Tower, GitKraken —
            any client that speaks HTTPS. When prompted for credentials enter{" "}
            <code className="font-mono bg-gray-100 px-1 rounded text-[12px]">x</code> as the
            username and your PAT as the password. Use a credential manager or{" "}
            <code className="font-mono bg-gray-100 px-1 rounded text-[12px]">~/.netrc</code>{" "}
            so you only type it once.
          </p>
        </section>

        {/* ── Footer links ── */}
        <div className="border-t border-gray-200 pt-8 mt-4 flex flex-col items-center gap-3 text-center">
          <Link to="/" className="text-sm text-gray-500 hover:text-soul-300 underline-offset-2 hover:underline">
            ← Marketspace
          </Link>
          <p className="text-[11px] text-gray-400 uppercase tracking-widest">
            sign-in is only required for private repos and push
          </p>
        </div>
      </main>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Section({ number, title, children }: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-[11px] uppercase tracking-widest text-soul-300 w-4 shrink-0">{number}</span>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="ml-7">{children}</div>
    </section>
  );
}

function CopyBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code.replace(/\\n/g, "\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const lines = code.split("\\n");
  return (
    <div className="rounded-xl border border-gray-200 bg-night-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800/50 bg-gray-900/30">
        <span className="text-[10px] uppercase tracking-wider text-gray-500">{label}</span>
        <button
          onClick={copy}
          className="text-[11px] text-gray-500 hover:text-soul-300 transition-colors"
        >
          {copied ? "✓ copied" : "copy"}
        </button>
      </div>
      <div className="px-4 py-3 font-mono text-[12.5px] leading-6 text-gray-300">
        {lines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
}
