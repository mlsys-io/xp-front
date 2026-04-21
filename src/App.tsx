import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Landing } from "./pages/Landing";
import { AuthCallback } from "./pages/AuthCallback";
import { DashboardLayout } from "./pages/Dashboard";
import { Overview } from "./pages/Overview";
import { Knowledge } from "./pages/Knowledge";
import { Apps } from "./pages/Apps";
import { Research } from "./pages/Research";
import { Marketplace } from "./pages/Marketplace";
import { MarketplaceWorkflow } from "./pages/MarketplaceWorkflow";
import { MarketplaceAgent } from "./pages/MarketplaceAgent";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/marketplace/workflows/:workflowId" element={<MarketplaceWorkflow />} />
        <Route path="/marketplace/agents/:owner/:agentId" element={<MarketplaceAgent />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Overview />} />
          <Route path="knowledge" element={<Knowledge />} />
          <Route path="apps" element={<Apps />} />
          <Route path="research" element={<Research />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
