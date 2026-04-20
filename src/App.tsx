import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Landing } from "./pages/Landing";
import { AuthCallback } from "./pages/AuthCallback";
import { DashboardLayout } from "./pages/Dashboard";
import { Overview } from "./pages/Overview";
import { Knowledge } from "./pages/Knowledge";
import { Apps } from "./pages/Apps";
import { Research } from "./pages/Research";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
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
