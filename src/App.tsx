import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthCallback } from "./pages/AuthCallback";
import { DashboardLayout } from "./pages/Dashboard";
import { DashboardRepos } from "./pages/DashboardRepos";
import { Marketspace } from "./pages/Marketspace";
import { NewRepo } from "./pages/NewRepo";
import { Overview } from "./pages/Overview";
import { Repo } from "./pages/Repo";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing = public marketspace (anon browse). Sign-in only on actions. */}
        <Route path="/" element={<Marketspace />} />
        <Route path="/explore" element={<Marketspace />} />

        {/* Auth + dashboard */}
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/new" element={<NewRepo />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Overview />} />
          <Route path="repos" element={<DashboardRepos />} />
          {/* Legacy aliases — keep links from old docs working. */}
          <Route path="apps" element={<Navigate to="/dashboard/repos" replace />} />
          <Route path="research" element={<Navigate to="/dashboard/repos" replace />} />
          <Route path="knowledge" element={<Navigate to="/dashboard/repos" replace />} />
        </Route>

        {/* Legacy /marketplace → new landing (keep deep links working for a grace period). */}
        <Route path="/marketplace" element={<Navigate to="/" replace />} />
        <Route path="/marketplace/*" element={<Navigate to="/" replace />} />

        {/* Repo detail + sub-views. Catch-all paths live at /tree/:branch/* and /blob/:branch/*. */}
        <Route path="/:owner/:name" element={<Repo />} />
        <Route path="/:owner/:name/settings" element={<Repo />} />
        <Route path="/:owner/:name/pulls" element={<Repo />} />
        <Route path="/:owner/:name/pulls/:number" element={<Repo />} />
        <Route path="/:owner/:name/tree/:branch" element={<Repo />} />
        <Route path="/:owner/:name/tree/:branch/*" element={<Repo />} />
        <Route path="/:owner/:name/blob/:branch/*" element={<Repo />} />
      </Routes>
    </BrowserRouter>
  );
}
