import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { whoami, logout } from "../api/client";

export function DashboardLayout() {
  const nav = useNavigate();
  const [me, setMe] = useState<{ email?: string | null; sub: string } | null>(null);

  useEffect(() => {
    whoami().then(setMe).catch(() => nav("/"));
  }, [nav]);

  if (!me) {
    return (
      <div className="flex h-screen items-center justify-center text-soul-400/60 font-soft">
        listening to the Tree…
      </div>
    );
  }

  const link = (to: string, label: string, glyph: string) => (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `group relative flex items-center gap-3 pl-6 pr-4 py-3 text-sm tracking-wide transition-colors ${
          isActive
            ? "text-soul-300"
            : "text-bark-300/60 hover:text-bark-300"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {/* glowing vertical rune that lights up on active */}
          <span
            className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-full transition-all ${
              isActive
                ? "bg-soul-400 shadow-[0_0_10px_rgba(62,212,193,0.9)]"
                : "bg-soul-400/20 group-hover:bg-soul-400/40"
            }`}
          />
          <span className="font-display text-xs uppercase tracking-[0.25em]">
            {glyph}
          </span>
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );

  const initials = (me.email || me.sub).slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* faint starfield + a few drifting seeds */}
      <div className="fixed inset-0 starfield opacity-30 pointer-events-none" />

      <div className="relative flex min-h-screen">
        <aside className="w-64 shrink-0 border-r border-soul-400/10 bg-night-800/50 backdrop-blur flex flex-col">
          <div className="px-6 py-6 border-b border-soul-400/10">
            <div className="flex items-center gap-2 font-display text-sm tracking-[0.35em] text-soul-300">
              <span className="w-1.5 h-1.5 rounded-full bg-soul-400 shadow-[0_0_8px_rgba(62,212,193,0.9)] animate-pulse-soul" />
              xp.io
            </div>
          </div>

          <nav className="flex-1 py-4 space-y-0.5">
            {link("/dashboard", "Overview", "◉")}
            {link("/dashboard/knowledge", "Knowledge", "❋")}
            {link("/dashboard/apps", "Applications", "⁂")}
            {link("/dashboard/research", "Auto-research", "⋯")}
            <NavLink
              to="/marketplace"
              className="group relative flex items-center gap-3 pl-6 pr-4 py-3 text-sm tracking-wide text-bark-300/60 hover:text-bark-300 transition-colors"
            >
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-full bg-soul-400/20 group-hover:bg-soul-400/40" />
              <span className="font-display text-xs uppercase tracking-[0.25em]">⟁</span>
              <span>Marketplace</span>
            </NavLink>
          </nav>

          <div className="p-4 border-t border-soul-400/10">
            <div className="flex items-center gap-3 px-2">
              <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-spirit-400 to-soul-400 flex items-center justify-center text-[11px] font-semibold text-night-900">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="text-xs text-bark-300/90 truncate">
                  {me.email || me.sub.slice(0, 12)}
                </div>
                <button
                  onClick={async () => {
                    await logout();
                    nav("/");
                  }}
                  className="text-[11px] uppercase tracking-widest text-bark-300/50 hover:text-atokirina-400 transition-colors"
                >
                  disconnect
                </button>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto max-w-6xl px-10 py-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
