import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
// Marketspace is the landing route — eager-load so the first paint
// after the JS shell parses doesn't add another network round-trip.
import { Marketspace } from "./pages/Marketspace";

// Every other page is lazy-loaded so they ship in their own chunk and
// don't bloat the first-load bundle. Vite generates per-chunk hashes,
// so once a page is fetched it's cached as `public, immutable` per
// the nginx config in /etc/nginx/conf.d/default.conf.
const Agents          = lazy(() => import("./pages/Agents").then(m => ({ default: m.Agents })));
const Workflows       = lazy(() => import("./pages/Workflows").then(m => ({ default: m.Workflows })));
const Apps            = lazy(() => import("./pages/Apps").then(m => ({ default: m.Apps })));
const AuthCallback    = lazy(() => import("./pages/AuthCallback").then(m => ({ default: m.AuthCallback })));
const DashboardLayout = lazy(() => import("./pages/Dashboard").then(m => ({ default: m.DashboardLayout })));
const DashboardRepos  = lazy(() => import("./pages/DashboardRepos").then(m => ({ default: m.DashboardRepos })));
const Datasets        = lazy(() => import("./pages/Datasets").then(m => ({ default: m.Datasets })));
const InboxPage       = lazy(() => import("./pages/Inbox").then(m => ({ default: m.InboxPage })));
const Explore         = lazy(() => import("./pages/Explore").then(m => ({ default: m.Explore })));
const Learn           = lazy(() => import("./pages/Learn").then(m => ({ default: m.Learn })));
const NewRepo         = lazy(() => import("./pages/NewRepo").then(m => ({ default: m.NewRepo })));
const Overview        = lazy(() => import("./pages/Overview").then(m => ({ default: m.Overview })));
const Profile         = lazy(() => import("./pages/Profile").then(m => ({ default: m.Profile })));
const Repo            = lazy(() => import("./pages/Repo").then(m => ({ default: m.Repo })));
const SearchResults   = lazy(() => import("./pages/SearchResults").then(m => ({ default: m.SearchResults })));
const Skills          = lazy(() => import("./pages/Skills").then(m => ({ default: m.Skills })));
const NewLoop         = lazy(() => import("./pages/NewLoop").then(m => ({ default: m.NewLoop })));
// /go — the Phase-A1 composer; the one intentional entrance into the
// "set up your AI" funnel. Lives alongside the GitHub-shaped marketspace
// at /, not replacing it. Lazy-loaded like everything else outside the
// landing.
const Go              = lazy(() => import("./pages/Go").then(m => ({ default: m.Go })));

// Minimal fallback — most chunks land in <100ms so anything heavier
// would just flash. The transparent div preserves layout height.
const RouteFallback = () => <div style={{ minHeight: "100vh" }} aria-busy="true" />;

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Landing = public marketspace (anon browse). Sign-in only on actions. */}
          <Route path="/" element={<Marketspace />} />
          {/* /go — the composer (Phase A1). Anonymous browse; Start
              redirects to lum.id where the install happens server-side
              under the user's session cookie. */}
          <Route path="/go" element={<Go />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/learn" element={<Learn />} />

          {/* Phase 2 marketspace category landings — kind-scoped browses
              that share the <KindBrowse> shell. /marketspace stays as the
              multi-kind view above. */}
          <Route path="/workflows" element={<Workflows />} />
          <Route path="/apps" element={<Apps />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/datasets" element={<Datasets />} />
          <Route path="/agents" element={<Agents />} />

          {/* Marketspace-wide search results page (anonymous; reads
              ?q + ?kind from the URL). Distinct from the in-page search
              box on /; this hits the dedicated /api/v1/repos/search endpoint. */}
          <Route path="/search" element={<SearchResults />} />

          {/* Auth + dashboard */}
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/new/loop" element={<NewLoop />} />
          <Route path="/new" element={<NewRepo />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Overview />} />
            <Route path="repos" element={<DashboardRepos />} />
            <Route path="inbox" element={<InboxPage />} />
            {/* Legacy aliases — keep links from old docs working. */}
            <Route path="apps" element={<Navigate to="/dashboard/repos" replace />} />
            <Route path="research" element={<Navigate to="/dashboard/repos" replace />} />
            <Route path="knowledge" element={<Navigate to="/dashboard/repos" replace />} />
          </Route>

          {/* Legacy /marketplace → new landing (keep deep links working for a grace period). */}
          <Route path="/marketplace" element={<Navigate to="/" replace />} />
          <Route path="/marketplace/*" element={<Navigate to="/" replace />} />

          {/* Profile page for an owner. Registered AFTER the static routes
              (/new, /dashboard, /explore, /marketplace, /auth) so they win
              the match — React Router prefers exact over dynamic. */}
          <Route path="/:owner" element={<Profile />} />

          {/* Repo detail + sub-views. Catch-all paths live at /tree/:branch/* and /blob/:branch/*. */}
          <Route path="/:owner/:name" element={<Repo />} />
          <Route path="/:owner/:name/branches" element={<Repo />} />
          <Route path="/:owner/:name/settings" element={<Repo />} />
          <Route path="/:owner/:name/flow" element={<Repo />} />
          <Route path="/:owner/:name/issues" element={<Repo />} />
          <Route path="/:owner/:name/issues/new" element={<Repo />} />
          <Route path="/:owner/:name/issues/:number" element={<Repo />} />
          <Route path="/:owner/:name/pulls" element={<Repo />} />
          <Route path="/:owner/:name/pulls/:number" element={<Repo />} />
          <Route path="/:owner/:name/commits" element={<Repo />} />
          <Route path="/:owner/:name/commits/*" element={<Repo />} />
          <Route path="/:owner/:name/forks" element={<Repo />} />
          <Route path="/:owner/:name/community" element={<Repo />} />
          <Route path="/:owner/:name/discussions" element={<Repo />} />
          <Route path="/:owner/:name/discussions/*" element={<Repo />} />
          <Route path="/:owner/:name/tree/:branch" element={<Repo />} />
          <Route path="/:owner/:name/tree/:branch/*" element={<Repo />} />
          <Route path="/:owner/:name/blob/:branch/*" element={<Repo />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
