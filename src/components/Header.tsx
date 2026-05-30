import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { logout, whoami, type Me } from "../api/client";
import { SearchBar } from "./SearchBar";

/**
 * Variant matrix:
 *   marketspace   — root /             back link → ← lum.id, sign-in is the primary pill
 *   kindBrowse    — /apps, /skills…    back link → ← marketspace, plain sign-in
 *   searchResults — /search            back link → ← marketspace, plain sign-in
 *   learn         — /learn             back link → ← marketspace, plain sign-in
 *
 * The repo detail page has a much richer, domain-specific header
 * (kind glyph, owner badge, fork/star, branch picker) so it does
 * not use this component; extracting it would have hurt the page
 * more than it helped.
 */
export type HeaderVariant = "marketspace" | "kindBrowse" | "searchResults" | "learn";

/**
 * Shared top nav for the public marketspace shell pages.
 * Renders logo + SearchBar + auth-aware right-hand links.
 */
export function Header({ variant }: { variant: HeaderVariant }) {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    whoami().then(setMe).catch(() => setMe(null));
  }, []);

  const signOut = async () => {
    try { await logout(); } catch { /* cookie cleared server-side */ }
    window.location.href = "/";
  };

  return (
    <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-200 gap-4">
      <Link to="/" className="text-soul-300 font-display tracking-[0.35em] text-sm shrink-0">
        <span className="w-1.5 h-1.5 inline-block align-middle rounded-full bg-soul-400 shadow-[0_0_8px_rgba(62,212,193,0.9)] animate-pulse-soul mr-3" />
        xp.io
      </Link>
      <SearchBar />
      <div className="flex items-center gap-4 text-xs">
        <Link
          to="/workflows"
          className="text-gray-700 hover:text-soul-300 transition-colors text-xs"
          title="Browse community workflows"
        >
          ▷ workflows
        </Link>
        {variant !== "learn" && (
          <Link
            to="/learn"
            className="text-gray-700 hover:text-soul-300 transition-colors uppercase tracking-widest text-[11px]"
            title="What is xp.io? Five-minute tour."
          >
            learn
          </Link>
        )}
        {variant === "marketspace" ? (
          <a
            href="https://lum.id"
            className="text-gray-500 hover:text-soul-300 transition-colors"
            title="The Lumid ecosystem — xp.io is the marketspace tier"
          >
            ← lum.id
          </a>
        ) : (
          <Link to="/" className="text-gray-500 hover:text-soul-300 transition-colors">
            ← marketspace
          </Link>
        )}
        {me ? (
          <>
            <Link to="/new" className="text-soul-300 hover:text-soul-400 transition-colors">
              + new
            </Link>
            <Link
              to={`/${encodeURIComponent(me.sub)}`}
              className="text-gray-700 hover:text-soul-300 transition-colors"
            >
              profile
            </Link>
            <Link to="/dashboard" className="text-gray-700 hover:text-soul-300 transition-colors">
              dashboard
            </Link>
            <button
              onClick={signOut}
              className="text-gray-700 hover:text-atokirina-400 transition-colors uppercase tracking-widest text-[11px]"
            >
              sign out
            </button>
          </>
        ) : (
          <SignInLink variant={variant === "marketspace" ? "primary" : "nav"} />
        )}
      </div>
    </nav>
  );
}

function SignInLink({ variant }: { variant: "nav" | "primary" }) {
  const onClick = async () => {
    const { beginLogin } = await import("../lib/pkce");
    await beginLogin();
  };
  if (variant === "primary") {
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-soul-400/15 border border-gray-300 text-soul-300 hover:bg-soul-400/25 hover:border-soul-400 transition-colors uppercase tracking-widest text-[11px]"
      >
        sign up · sign in
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className="text-gray-700 hover:text-soul-300 transition-colors uppercase tracking-widest text-[11px]"
    >
      sign in
    </button>
  );
}
