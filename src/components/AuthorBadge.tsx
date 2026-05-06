// Trust-signal pill that classifies a repo's owner. Three tiers:
//
//   first-party  — admin@lumid.market, the canonical Lumid catalog owner.
//                  Indigo / soul-300 tint.
//   verified     — staff-verified accounts (super-admin sub today). Could be
//                  promoted to a data-driven set later; v1 is a hardcoded
//                  allowlist so we don't need a backend round-trip.
//   community    — everything else. Neutral gray.
//
// Display-only: reads owner_sub off the existing index record and renders an
// inline pill. No network calls.
//
// Surfaced on the repo detail header (Repo.tsx → RepoHeader) and the
// marketspace cards (RepoCard) — same component, identical visual weight in
// both places so the trust signal stays recognisable.
import type { CSSProperties } from "react";

// Canonical owner subs. Hardcoded for v1; promote to a server-side flag
// (or a `verified_at` column) once the verified set grows past a handful.
const FIRST_PARTY_SUBS = new Set<string>([
  "70f192ce-97f3-5d9e-4324-8a557ea72900", // admin@lumid.market
]);

const VERIFIED_SUBS = new Set<string>([
  "e6f31d99-442f-4864-a3e1-2807ea73553f", // admin@lum.id
]);

export type AuthorTier = "first-party" | "verified" | "community";

export function classifyAuthor(owner_sub: string): AuthorTier {
  if (FIRST_PARTY_SUBS.has(owner_sub)) return "first-party";
  if (VERIFIED_SUBS.has(owner_sub)) return "verified";
  return "community";
}

const TIER_STYLE: Record<AuthorTier, { className: string; title: string }> = {
  // soul-300 is teal-700 (#0f766e) — the primary accent on this site, doubles
  // as our "Lumid first-party" tone since first-party owners ARE Lumid.
  "first-party": {
    className: "border-soul-400/40 bg-soul-300/10 text-soul-300",
    title: "First-party — published by the Lumid catalog team",
  },
  // emerald is from Tailwind's default palette — close to soul but distinct
  // enough to read as "different tier" at a glance.
  verified: {
    className: "border-emerald-400/50 bg-emerald-50 text-emerald-700",
    title: "Verified — staff-vouched community publisher",
  },
  community: {
    className: "border-gray-200 bg-gray-50 text-gray-600",
    title: "Community — published by an external author",
  },
};

const TIER_LABEL: Record<AuthorTier, string> = {
  "first-party": "first-party",
  verified: "verified",
  community: "community",
};

export type AuthorBadgeProps = {
  owner_sub: string;
  /**
   * `inline` is the default — small pill suitable for cards.
   * `header` is a shade larger for use next to repo titles.
   */
  size?: "inline" | "header";
  className?: string;
  style?: CSSProperties;
};

export function AuthorBadge({
  owner_sub, size = "inline", className = "", style,
}: AuthorBadgeProps) {
  const tier = classifyAuthor(owner_sub);
  const tone = TIER_STYLE[tier];
  // ~10-11px text, uppercase letter-spacing — matches the existing kind/visibility
  // micro-labels in RepoHeader.
  const sizeCls = size === "header"
    ? "text-[11px] px-2 py-0.5"
    : "text-[10px] px-1.5 py-0.5";
  return (
    <span
      title={tone.title}
      style={style}
      className={[
        "inline-flex items-center rounded-full border font-medium uppercase tracking-wider",
        sizeCls,
        tone.className,
        className,
      ].filter(Boolean).join(" ")}
    >
      {TIER_LABEL[tier]}
    </span>
  );
}
