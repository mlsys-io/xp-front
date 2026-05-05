/* eslint-disable react-refresh/only-export-components */
// Yellow/amber banner that announces a repo as deprecated.
//
// Reads four optional fields from the repo's manifest:
//   deprecated:         bool — explicit boolean flag
//   deprecated_at:      ISO-ish date string (YYYY-MM-DD or full ISO)
//   replaced_by:        "<owner>/<name>" pointing at the successor
//   deprecation_reason: free-form prose, single line preferred
//
// Either `deprecated: true` OR a parseable `deprecated_at` is enough to
// trigger the banner. All other fields gracefully degrade.
//
// Display-only: the manifest object is loaded by the parent (KindCard does
// the fetch on Repo.tsx, then the parsed object is passed in). No network
// calls here.
import { Link } from "react-router-dom";

export type DeprecationFields = {
  deprecated?: boolean;
  deprecated_at?: string | number;
  replaced_by?: string;
  deprecation_reason?: string;
};

/**
 * Extract deprecation fields from a manifest object. Tolerant of:
 *   - parsed JSON (real object — pull keys directly)
 *   - raw YAML (KindCard wraps it as { raw: string, _source }) — we crudely
 *     scan top-level keys via regex; good enough for the four fields we want
 *     and avoids pulling a YAML parser into the SPA bundle for a banner.
 */
export function extractDeprecation(
  manifest: Record<string, any> | null | undefined,
): DeprecationFields {
  if (!manifest) return {};
  // Parsed JSON path.
  if (typeof manifest.raw !== "string") {
    const out: DeprecationFields = {};
    if (manifest.deprecated === true) out.deprecated = true;
    if (manifest.deprecated_at) out.deprecated_at = manifest.deprecated_at;
    if (manifest.replaced_by) out.replaced_by = String(manifest.replaced_by);
    if (manifest.deprecation_reason) {
      out.deprecation_reason = String(manifest.deprecation_reason);
    }
    return out;
  }
  // YAML-as-raw path. Match top-level keys only (line starts with key:).
  // Block-scalar (`|`) bodies for deprecation_reason are flattened to a single
  // line of joined non-empty content — fine for a single-line banner.
  const raw = manifest.raw as string;
  const out: DeprecationFields = {};
  const flag = /^\s*deprecated\s*:\s*(true|false)\s*$/m.exec(raw);
  if (flag && flag[1] === "true") out.deprecated = true;
  const at = /^\s*deprecated_at\s*:\s*["']?([^"'\n#]+?)["']?\s*(#.*)?$/m.exec(raw);
  if (at) out.deprecated_at = at[1].trim();
  const rb = /^\s*replaced_by\s*:\s*["']?([^"'\n#]+?)["']?\s*(#.*)?$/m.exec(raw);
  if (rb) out.replaced_by = rb[1].trim();
  // Reason can be a quoted string or a `|` block scalar; grab block scalar
  // greedily until dedent or EOF.
  const reasonInline = /^\s*deprecation_reason\s*:\s*["']?([^"'\n#][^\n]*?)["']?\s*(#.*)?$/m
    .exec(raw);
  if (reasonInline && !/^\|\s*$/.test(reasonInline[1].trim())) {
    out.deprecation_reason = reasonInline[1].trim();
  } else {
    const block = /^\s*deprecation_reason\s*:\s*\|\s*\n((?:[ \t]+[^\n]*\n?)+)/m.exec(raw);
    if (block) {
      out.deprecation_reason = block[1]
        .split("\n").map((s) => s.trim()).filter(Boolean).join(" ");
    }
  }
  return out;
}

export function isDeprecated(d: DeprecationFields): boolean {
  return !!(d.deprecated || d.deprecated_at);
}

// Compact relative-time formatter — "2 weeks ago", "yesterday", "today".
// Falls back to the raw string if we can't parse a date.
function formatRelative(input: string | number): string | null {
  let ms: number;
  if (typeof input === "number") {
    // Heuristic: accept seconds-since-epoch (10 digits) or millis.
    ms = input < 1e12 ? input * 1000 : input;
  } else {
    const s = String(input).trim();
    // YYYY-MM-DD → assume UTC midnight to avoid TZ surprises.
    const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (ymd) {
      ms = Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    } else {
      const t = Date.parse(s);
      if (Number.isNaN(t)) return null;
      ms = t;
    }
  }
  const diff = Date.now() - ms;
  const day = 86400_000;
  if (Math.abs(diff) < day) return "today";
  const days = Math.round(diff / day);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.round(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

export function DeprecationBanner({
  fields,
}: {
  fields: DeprecationFields;
}) {
  if (!isDeprecated(fields)) return null;
  const replacedBy = fields.replaced_by?.trim();
  const reason = fields.deprecation_reason?.trim();
  const rel = fields.deprecated_at ? formatRelative(fields.deprecated_at) : null;

  // Replaced-by may be `owner/name` — link to the repo if it parses.
  let replacedNode: React.ReactNode = null;
  if (replacedBy) {
    const m = /^([^/\s]+)\/([^/\s]+)$/.exec(replacedBy);
    replacedNode = m ? (
      <Link
        to={`/${encodeURIComponent(m[1])}/${encodeURIComponent(m[2])}`}
        className="font-mono underline decoration-dotted underline-offset-2 hover:decoration-solid"
      >
        {replacedBy}
      </Link>
    ) : (
      <span className="font-mono">{replacedBy}</span>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-4 rounded-md border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-sm"
    >
      <div className="font-semibold flex items-center gap-2">
        <span aria-hidden>⚠</span>
        This repo is deprecated.
      </div>
      {(replacedNode || reason) && (
        <div className="mt-1 text-amber-800/90">
          {replacedNode && (
            <>Replaced by {replacedNode}{reason ? " — " : "."}</>
          )}
          {reason && <span>{reason}</span>}
        </div>
      )}
      {rel && (
        <div className="mt-1 text-xs text-amber-700/80">Deprecated {rel}</div>
      )}
    </div>
  );
}

/**
 * Tag-driven heuristic for Marketspace + KindBrowse cards: the index records
 * surfaced by `listRepos` don't currently include manifest fields, so the
 * convention is to add `tags: [..., "deprecated"]` when deprecating an app.
 * The detail page still reads the canonical manifest fields and renders the
 * full banner.
 */
export function isRepoTaggedDeprecated(tags: string[] | undefined): boolean {
  return !!tags?.includes("deprecated");
}

// Self-loading wrapper for the repo detail page: fetches the manifest blob
// (same heuristic as KindCard — we accept either parsed JSON or YAML-as-raw)
// and renders the banner if any deprecation field is present. The detail
// page already pays for an identical fetch in KindCard; the duplication is
// cheap (server caches blobs) and keeps these two trust-signals decoupled.
import { useEffect, useState } from "react";
import { getBlob } from "../api/client";

export function RepoDeprecationBanner({
  owner_sub, name, head_ref, kind,
}: {
  owner_sub: string;
  name: string;
  head_ref?: string;
  kind: string;
}) {
  const [fields, setFields] = useState<DeprecationFields>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const branch = head_ref || "main";
      const tryFiles = kind === "skill"
        ? ["manifest.json", "manifest.yaml"]
        : kind === "dataset"
          ? ["manifest.json", "manifest.yaml", "dataset.yaml", "xpcloud.yaml"]
          : ["manifest.json", "manifest.yaml", "xpcloud.yaml"];
      for (const f of tryFiles) {
        try {
          const blob = await getBlob(owner_sub, name, branch, f);
          if (cancelled) return;
          let parsed: Record<string, any>;
          try {
            parsed = JSON.parse(blob.content);
          } catch {
            parsed = { raw: blob.content, _source: f };
          }
          const out = extractDeprecation(parsed);
          if (isDeprecated(out)) setFields(out);
          return;
        } catch { /* try next */ }
      }
    })();
    return () => { cancelled = true; };
  }, [owner_sub, name, head_ref, kind]);

  if (!isDeprecated(fields)) return null;
  return <DeprecationBanner fields={fields} />;
}
