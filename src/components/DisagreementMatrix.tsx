import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getBlob,
  getTree,
  type Repo as RepoT,
  type TreeEntry,
} from "../api/client";

// ── Disagreement matrix (kind=app artifact viewer) ──────────────
//
// mbb-ai (and any app following the same convention) writes
// `disagreement_bench.json` per cycle under
// `data/outbox/<case_stem>/<ts>/disagreement_bench.json`. There's no
// `list-tree-recursive` blob endpoint, so the discovery walk crawls
// `data/outbox/` → case dirs → ts dirs → bench file. Most-recent ts
// wins (lex-sorted; the agent writes ISO-like stamps so lex == time).
// If anything is missing the whole section silently disappears — it's
// purely additive surface for apps that publish the artefact.
//
// This module exports two shapes:
//   <DisagreementMatrix bench={…} owner repo branch filePath />
//     pure renderer, takes raw bench data and renders the heatmap.
//   <DisagreementMatrixForRepo repo branch />
//     wrapper that does the discovery walk on a published repo, then
//     delegates to the renderer. Used on Repo.tsx (overview) and on
//     Learn.tsx (live mini-demo against mbb-ai).
//
// Pulling them apart lets /learn pin a fixed example without forcing a
// 24-GET discovery walk every time the onboarding page loads, and lets
// future callers feed in synthetic bench blobs (e.g. for screenshots).

export type DisagreementBench = {
  ts: string;
  version: string;
  case_id: string;
  row_count: number;
  flag_counts: Record<string, number>;
  rows: Array<{
    case_id?: string;
    q_id?: string;
    q_type?: string;
    keypoint?: string;
    disagreement_flags?: string[];
  }>;
};

export type DisagreementHit = {
  bench: DisagreementBench;
  bundlePath: string;     // e.g. data/outbox/case-foo/2026-04-30T12-00-00
  filePath: string;       // bundlePath + /disagreement_bench.json
};

// ── Discovery walk ──────────────────────────────────────────────

export async function discoverDisagreement(
  owner: string, name: string, branch: string,
): Promise<DisagreementHit | null> {
  // 1. Walk data/outbox/.
  let outbox: TreeEntry[];
  try {
    outbox = await getTree(owner, name, branch, "data/outbox");
  } catch {
    return null;
  }
  const caseDirs = outbox
    .filter((e) => e.type === "tree")
    .map((e) => e.name)
    .sort()
    .reverse();
  if (caseDirs.length === 0) return null;

  // 2. For each case dir, walk timestamp dirs (most recent first), and
  //    return the first disagreement_bench.json we can fetch. Bound the
  //    search so a pathological repo doesn't burn a thousand requests.
  let scanned = 0;
  const MAX_SCANS = 24;
  for (const caseStem of caseDirs) {
    if (scanned >= MAX_SCANS) break;
    let tsEntries: TreeEntry[];
    try {
      tsEntries = await getTree(owner, name, branch, `data/outbox/${caseStem}`);
    } catch {
      continue;
    }
    const tsDirs = tsEntries
      .filter((e) => e.type === "tree")
      .map((e) => e.name)
      .sort()
      .reverse();
    for (const ts of tsDirs) {
      if (scanned >= MAX_SCANS) break;
      scanned++;
      const bundlePath = `data/outbox/${caseStem}/${ts}`;
      const filePath = `${bundlePath}/disagreement_bench.json`;
      try {
        const blob = await getBlob(owner, name, branch, filePath);
        const parsed = JSON.parse(blob.content) as DisagreementBench;
        return { bench: parsed, bundlePath, filePath };
      } catch {
        continue;
      }
    }
  }
  return null;
}

// ── Pure renderer ──────────────────────────────────────────────
//
// Takes a parsed `DisagreementBench` plus enough context to build a
// "↓ Download artifact" link back to the repo's blob view. The link is
// optional — when `owner`/`name`/`branch`/`filePath` are omitted the
// footer just shows the case_id and skips the link. That keeps this
// renderer usable against synthetic data where there's no underlying
// repo to point back to.

export function DisagreementMatrix({
  bench, owner, name, branch, filePath,
}: {
  bench: DisagreementBench;
  owner?: string;
  name?: string;
  branch?: string;
  filePath?: string;
}) {
  // Q-types present in the rows (preserves input order, dedups).
  const qTypes: string[] = [];
  for (const r of bench.rows) {
    const t = (r.q_type || "unknown").trim() || "unknown";
    if (!qTypes.includes(t)) qTypes.push(t);
  }
  // Flag columns — sorted by total count desc so the busiest column is
  // leftmost, which makes the "where is the friction" read trivial.
  const flagCols: string[] = Object.entries(bench.flag_counts || {})
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);

  // Per-(qType, flag) counts.
  const cell = (qt: string, flag: string): number => {
    let n = 0;
    for (const r of bench.rows) {
      const t = (r.q_type || "unknown").trim() || "unknown";
      if (t !== qt) continue;
      if ((r.disagreement_flags || []).includes(flag)) n++;
    }
    return n;
  };

  // Color cells by intensity relative to the hottest cell. Tailwind can't
  // do dynamic class names, so use inline opacity on a fixed soul-tinted
  // background. 0 → empty cell; 1+ → tinted.
  let hottest = 0;
  for (const qt of qTypes) for (const f of flagCols) {
    const v = cell(qt, f);
    if (v > hottest) hottest = v;
  }
  const intensity = (v: number): string => {
    if (v <= 0 || hottest <= 0) return "rgba(0,0,0,0)";
    const a = 0.12 + 0.55 * (v / hottest);
    // soul-400 is ~ #3ed4c1 in the existing palette.
    return `rgba(62, 212, 193, ${a.toFixed(3)})`;
  };

  const blobHref = (owner && name && branch && filePath)
    ? `/${enc(owner)}/${enc(name)}/blob/${enc(branch)}/${pathEnc(filePath)}`
    : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-gray-900">DisagreementBench</h2>
        <div className="text-[11px] text-gray-500">
          {bench.row_count} row{bench.row_count === 1 ? "" : "s"}
          {" · latest cycle "}
          <span className="font-mono">{bench.ts}</span>
        </div>
      </div>
      {flagCols.length === 0 || qTypes.length === 0 ? (
        <div className="text-sm text-gray-500">
          No disagreement flags recorded in the latest cycle.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="text-[12px] border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[11px] font-medium text-gray-600 px-2 py-1.5"></th>
                {flagCols.map((f) => (
                  <th
                    key={f}
                    className="text-left text-[11px] font-medium text-gray-700 px-2 py-1.5 font-mono whitespace-nowrap"
                    title={`${f} — total ${bench.flag_counts[f]} across all Q-types`}
                  >
                    {f}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {qTypes.map((qt) => (
                <tr key={qt} className="border-t border-gray-100">
                  <td className="text-[11px] text-gray-700 font-mono px-2 py-1.5 whitespace-nowrap">
                    {qt}
                  </td>
                  {flagCols.map((f) => {
                    const v = cell(qt, f);
                    return (
                      <td
                        key={f}
                        className="px-2 py-1.5 text-center tabular-nums text-gray-900"
                        style={{ backgroundColor: intensity(v), minWidth: "3ch" }}
                        title={`${qt} × ${f}: ${v}`}
                      >
                        {v || ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3 text-[11px] text-gray-500 flex items-center gap-3 flex-wrap">
        <span>case: <span className="font-mono">{bench.case_id}</span></span>
        {blobHref && (
          <Link to={blobHref} className="text-soul-300 hover:text-soul-400">
            ↓ Download artifact
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Discovery wrapper ─────────────────────────────────────────────
//
// Runs `discoverDisagreement` against the given repo+branch and renders
// the matrix. Hides itself silently while loading and on a miss — same
// behaviour as the inline version that lived in Repo.tsx so the overview
// stays additive.

export function DisagreementMatrixForRepo({
  repo, branch,
}: {
  repo: RepoT;
  branch: string;
}) {
  const [hit, setHit] = useState<DisagreementHit | null | "loading">("loading");

  useEffect(() => {
    let alive = true;
    setHit("loading");
    discoverDisagreement(repo.owner_sub, repo.name, branch)
      .then((h) => { if (alive) setHit(h); })
      .catch(() => { if (alive) setHit(null); });
    return () => { alive = false; };
  }, [repo.owner_sub, repo.name, branch]);

  if (hit === "loading" || hit === null) return null;
  return (
    <DisagreementMatrix
      bench={hit.bench}
      owner={repo.owner_sub}
      name={repo.name}
      branch={branch}
      filePath={hit.filePath}
    />
  );
}

// ── helpers (mirrored from Repo.tsx; kept private) ──────────────

function enc(s: string): string {
  return encodeURIComponent(s);
}

function pathEnc(p: string): string {
  return p.split("/").map(encodeURIComponent).join("/");
}
