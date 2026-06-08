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
    <nav className="sticky top-0 z-20 flex items-center justify-between px-6 h-12 border-b border-gray-200 bg-white/90 backdrop-blur-sm gap-4">
      <Link to="/" className="flex items-center gap-2 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-soul-400 shadow-[0_0_6px_rgba(20,184,166,0.7)] animate-pulse-soul" />
        <span className="font-display tracking-[0.3em] text-sm text-soul-300">xp.io</span>
      </Link>
      {/* kindBrowse pages (/apps, /workflows, …) have their own in-page
          filter, so the global search bar here would be a second box at the
          top. Hide it there; keep it on searchResults / learn. */}
      <div className="flex-1 max-w-sm hidden sm:block">
        {variant !== "kindBrowse" && <SearchBar />}
      </div>
      <div className="flex items-center gap-4 text-xs shrink-0">
        <Link to="/workflows" className="text-gray-600 hover:text-soul-300 transition-colors flex items-center gap-1">
          <span className="text-[11px]">▷</span> Workflows
        </Link>
        {variant !== "learn" && (
          <Link to="/learn" className="text-gray-500 hover:text-soul-300 transition-colors hidden sm:block">
            How it works
          </Link>
        )}
        <Link to="/git" className="text-gray-500 hover:text-soul-300 transition-colors hidden sm:block">
          Git
        </Link>
        {variant !== "marketspace" && (
          <Link to="/" className="text-gray-400 hover:text-soul-300 transition-colors hidden sm:block">
            ← marketspace
          </Link>
        )}
        {me ? (
          <>
            <Link to="/new" className="text-soul-300 hover:text-soul-400 transition-colors">+ new</Link>
            <Link to="/dashboard" className="text-gray-600 hover:text-soul-300 transition-colors">dashboard</Link>
            <button onClick={signOut} className="text-gray-500 hover:text-red-400 transition-colors">sign out</button>
          </>
        ) : (
          <SignInLink />
        )}
      </div>
    </nav>
  );
}

function SignInLink() {
  const onClick = async () => {
    const { beginLogin } = await import("../lib/pkce");
    await beginLogin();
  };
  return (
    <button onClick={onClick} className="text-gray-600 hover:text-soul-300 transition-colors">
      Sign in
    </button>
  );
}
