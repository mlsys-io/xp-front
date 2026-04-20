import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Brain, Database, Grid3x3, FlaskConical, LogOut } from "lucide-react";
import { whoami, logout } from "../api/client";

export function DashboardLayout() {
  const nav = useNavigate();
  const [me, setMe] = useState<{ email?: string | null; sub: string } | null>(null);

  useEffect(() => {
    whoami().then(setMe).catch(() => nav("/"));
  }, [nav]);

  if (!me) {
    return <div className="p-10 text-slate-500">loading…</div>;
  }

  const link = ({ to, icon: Icon, label }: any) => (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive
            ? "bg-indigo-50 text-indigo-700"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`
      }
    >
      <Icon className="w-4 h-4" />
      {label}
    </NavLink>
  );

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 border-r border-slate-200 bg-white flex flex-col">
        <div className="px-5 py-5 border-b border-slate-100 flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-600" />
          <span className="font-semibold tracking-tight">xp.io</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {link({ to: "/dashboard", icon: Grid3x3, label: "Overview" })}
          {link({ to: "/dashboard/knowledge", icon: Brain, label: "Knowledge" })}
          {link({ to: "/dashboard/apps", icon: Database, label: "Applications" })}
          {link({ to: "/dashboard/research", icon: FlaskConical, label: "Auto-research" })}
        </nav>
        <div className="p-3 border-t border-slate-100 text-xs text-slate-500 truncate">
          <div className="font-medium text-slate-700 truncate">{me.email || me.sub.slice(0, 8)}</div>
          <button
            onClick={async () => {
              await logout();
              nav("/");
            }}
            className="mt-2 flex items-center gap-1 text-slate-500 hover:text-slate-900"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 max-w-6xl">
        <Outlet />
      </main>
    </div>
  );
}
