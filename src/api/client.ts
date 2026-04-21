import axios from "axios";

// Same-origin in prod (xp.io/api/*); override with VITE_API_BASE in dev.
const base = (import.meta as any).env?.VITE_API_BASE || "";

export const api = axios.create({
  baseURL: base,
  withCredentials: true,   // send xp_session cookie
  timeout: 30_000,
});

// anonymous instance for marketplace browse — no credentials, no auth header
export const anonApi = axios.create({
  baseURL: base,
  withCredentials: false,
  timeout: 30_000,
});

export async function whoami() {
  const r = await api.get("/api/v1/me");
  return r.data as { sub: string; email: string | null; scope: string; source: string };
}

export async function listAgents() {
  const r = await api.get("/api/v1/agents");
  return r.data as { private: any[]; shared: any[] };
}

export async function listMemories(agentId: string, since = 0, limit = 200) {
  const r = await api.get(`/api/v1/agents/${encodeURIComponent(agentId)}/memories`, {
    params: { since, limit },
  });
  return r.data as { agent_id: string; memories: any[]; count: number };
}

export async function listApps() {
  const r = await api.get("/api/v1/apps");
  return r.data as { apps: any[] };
}

export async function listLoops() {
  const r = await api.get("/api/v1/loops");
  return r.data as { loops: any[]; synced_at: number | null };
}

export async function exchangeCode(code: string, codeVerifier: string) {
  const r = await api.post("/api/v1/auth/exchange", { code, code_verifier: codeVerifier });
  return r.data;
}

export async function logout() {
  const r = await api.post("/api/v1/auth/logout");
  return r.data;
}

// ── Marketplace (anonymous) ──────────────────────────────────────

export async function browseMarketplaceAgents(domain = "", q = "", sort = "recent") {
  const r = await anonApi.get("/api/v1/marketplace/agents", { params: { domain, q, sort } });
  return r.data as { agents: any[] };
}

export async function getMarketplaceAgent(owner: string, agentId: string) {
  const r = await anonApi.get(
    `/api/v1/marketplace/agents/${encodeURIComponent(owner)}/${encodeURIComponent(agentId)}`
  );
  return r.data as any;
}

export async function getMarketplaceAgentMemories(owner: string, agentId: string, limit = 50) {
  const r = await api.get(
    `/api/v1/marketplace/agents/${encodeURIComponent(owner)}/${encodeURIComponent(agentId)}/memories`,
    { params: { limit } }
  );
  return r.data as { memories: any[]; count: number; previews_only: boolean };
}

export async function browseMarketplaceWorkflows(domain = "", q = "") {
  const r = await anonApi.get("/api/v1/marketplace/workflows", { params: { domain, q } });
  return r.data as { workflows: any[] };
}

export async function getMarketplaceWorkflow(workflowId: string) {
  const r = await anonApi.get(`/api/v1/marketplace/workflows/${encodeURIComponent(workflowId)}`);
  return r.data as { workflow: any };
}

export async function browseMarketplaceApps() {
  const r = await anonApi.get("/api/v1/marketplace/apps");
  return r.data as { apps: any[] };
}

// ── Marketplace (authed) ─────────────────────────────────────────

export async function setAgentVisibility(
  agentId: string,
  visibility: "public" | "private",
  summary = "",
  tags: string[] = []
) {
  const r = await api.put(`/api/v1/agents/${encodeURIComponent(agentId)}/visibility`, {
    visibility,
    summary,
    tags,
  });
  return r.data;
}

export async function subscribeAgent(owner: string, agentId: string) {
  const r = await api.post(
    `/api/v1/marketplace/agents/${encodeURIComponent(owner)}/${encodeURIComponent(agentId)}/subscribe`,
    {}
  );
  return r.data;
}

export async function unsubscribeAgent(owner: string, agentId: string) {
  const r = await api.delete(
    `/api/v1/marketplace/agents/${encodeURIComponent(owner)}/${encodeURIComponent(agentId)}/subscribe`
  );
  return r.data;
}

export async function listMySubscriptions() {
  const r = await api.get("/api/v1/marketplace/subscriptions");
  return r.data as { subscriptions: any[] };
}

export async function unpublishWorkflow(workflowId: string) {
  const r = await api.delete(`/api/v1/workflows/${encodeURIComponent(workflowId)}`);
  return r.data;
}
