import axios from "axios";

// Same-origin in prod (xp.io/api/*); override with VITE_API_BASE in dev.
const base = (import.meta as any).env?.VITE_API_BASE || "";

export const api = axios.create({
  baseURL: base,
  withCredentials: true,   // send xp_session cookie
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
