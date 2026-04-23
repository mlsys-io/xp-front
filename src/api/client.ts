import axios, { AxiosError } from "axios";

// Same-origin in prod (xp.io/api/*); override with VITE_API_BASE in dev.
const base = (import.meta as any).env?.VITE_API_BASE || "";

export const api = axios.create({
  baseURL: base,
  withCredentials: true,   // send xp_session cookie
  timeout: 30_000,
});

// Anonymous instance for public marketspace browse — no credentials.
// Private repos 404 for this instance (backend enforces).
export const anonApi = axios.create({
  baseURL: base,
  withCredentials: false,
  timeout: 30_000,
});

// ── Auth ─────────────────────────────────────────────────────────

export type Me = { sub: string; email: string | null; scope: string; source: string };

export async function whoami(): Promise<Me> {
  const r = await api.get("/api/v1/me");
  return r.data;
}

export async function exchangeCode(code: string, codeVerifier: string) {
  const r = await api.post("/api/v1/auth/exchange", { code, code_verifier: codeVerifier });
  return r.data;
}

export async function logout() {
  const r = await api.post("/api/v1/auth/logout");
  return r.data;
}

// ── Repos ────────────────────────────────────────────────────────

export type RepoKind = "app" | "autoresearch" | "agent";
export type Visibility = "public" | "private";

export type Repo = {
  owner_sub: string;
  name: string;
  kind: RepoKind;
  visibility: Visibility;
  display_name: string;
  summary: string;
  tags: string[];
  fork_of: string | null;
  stars: number;
  forks: number;
  head_ref: string;
  head_sha: string;
  published_at: number;
  updated_at: number;
};

export type Branch = {
  name: string;
  sha: string;
  is_default?: boolean;
  ahead?: number;
  behind?: number;
  last_commit?: {
    sha: string;
    short_sha: string;
    author: string;
    email: string;
    date: string;                // ISO-8601 with timezone
    message_summary: string;
  };
};

export type TreeEntry = {
  name: string;
  type: "blob" | "tree" | "commit";
  sha: string;
  size: number;
  mode: string;
};

export type Blob = { path: string; ref: string; content: string };

export type RepoChange = { path: string; op: "upsert" | "delete"; content?: string };

export type ListReposParams = {
  q?: string;
  kind?: RepoKind | "";
  owner?: string;
  sort?: "updated" | "created" | "stars" | "forks" | "name";
  limit?: number;
};

/** Anonymous — returns only public repos unless the user is signed in. */
export async function listRepos(params: ListReposParams = {}): Promise<Repo[]> {
  const client = params.owner ? api : anonApi;  // owned view always via authed client
  const r = await client.get("/api/v1/repos", { params });
  return (r.data?.repos || []) as Repo[];
}

export async function getRepo(owner: string, name: string): Promise<Repo | null> {
  try {
    const r = await anonApi.get(`/api/v1/repos/${enc(owner)}/${enc(name)}`);
    return r.data as Repo;
  } catch (e) {
    if (is404(e)) return null;
    throw e;
  }
}

export async function createRepo(input: {
  kind: RepoKind;
  name: string;
  visibility?: Visibility;
  display_name?: string;
  summary?: string;
  tags?: string[];
  initial_files?: Record<string, string>;
}): Promise<Repo> {
  const r = await api.post("/api/v1/repos", input);
  return r.data.repo as Repo;
}

export async function patchRepo(
  owner: string, name: string,
  patch: Partial<Pick<Repo, "name" | "visibility" | "display_name" | "summary" | "tags">>,
): Promise<Repo> {
  const r = await api.patch(`/api/v1/repos/${enc(owner)}/${enc(name)}`, patch);
  return r.data.repo as Repo;
}

export async function deleteRepo(owner: string, name: string): Promise<void> {
  await api.delete(`/api/v1/repos/${enc(owner)}/${enc(name)}`);
}

export async function listBranches(owner: string, name: string): Promise<Branch[]> {
  const r = await anonApi.get(`/api/v1/repos/${enc(owner)}/${enc(name)}/branches`);
  return (r.data?.branches || []) as Branch[];
}

export async function getTree(
  owner: string, name: string, ref: string, path = "",
): Promise<TreeEntry[]> {
  const url = path
    ? `/api/v1/repos/${enc(owner)}/${enc(name)}/tree/${enc(ref)}/${pathEnc(path)}`
    : `/api/v1/repos/${enc(owner)}/${enc(name)}/tree/${enc(ref)}`;
  const r = await anonApi.get(url);
  return (r.data?.entries || []) as TreeEntry[];
}

export async function getBlob(
  owner: string, name: string, ref: string, path: string,
): Promise<Blob> {
  const r = await anonApi.get(
    `/api/v1/repos/${enc(owner)}/${enc(name)}/blob/${enc(ref)}/${pathEnc(path)}`,
  );
  return r.data as Blob;
}

export async function pushCommit(
  owner: string, name: string,
  args: { branch: string; parent_sha?: string | null; message: string; changes: RepoChange[] },
): Promise<{ branch: string; sha: string; committed: boolean }> {
  const r = await api.post(`/api/v1/repos/${enc(owner)}/${enc(name)}/push`, args);
  return r.data;
}

export async function forkRepo(
  owner: string, name: string, newName?: string,
): Promise<Repo> {
  const r = await api.post(`/api/v1/repos/${enc(owner)}/${enc(name)}/fork`, {
    name: newName,
  });
  return r.data.repo as Repo;
}

export async function starRepo(
  owner: string, name: string,
): Promise<{ starred: boolean; count: number }> {
  const r = await api.post(`/api/v1/repos/${enc(owner)}/${enc(name)}/star`);
  return r.data;
}

// ── Pull requests ────────────────────────────────────────────────

export type PR = {
  number: number;
  state: "open" | "merged" | "closed";
  base_owner: string;
  base_name: string;
  base_branch: string;
  base_sha_at_open: string;
  head_owner: string;
  head_name: string;
  head_branch: string;
  head_sha_at_open: string;
  title: string;
  body: string;
  author_sub: string;
  opened_at: number;
  merged_at: number | null;
  merge_sha: string | null;
  closed_at: number | null;
};

export type PRDiff = {
  base_sha: string;
  head_sha: string;
  files: { path: string; added: number; deleted: number }[];
  unified_diff: string;
};

export async function listPulls(
  owner: string, name: string, state: "all" | "open" | "merged" | "closed" = "all",
): Promise<PR[]> {
  const r = await anonApi.get(`/api/v1/repos/${enc(owner)}/${enc(name)}/pulls`, {
    params: { state },
  });
  return (r.data?.pulls || []) as PR[];
}

export async function openPull(
  baseOwner: string, baseName: string,
  args: {
    base_branch?: string;
    head_owner: string;
    head_name?: string;
    head_branch: string;
    title: string;
    body?: string;
  },
): Promise<PR> {
  const r = await api.post(`/api/v1/repos/${enc(baseOwner)}/${enc(baseName)}/pulls`, args);
  return r.data.pr as PR;
}

export async function getPull(
  owner: string, name: string, number: number,
): Promise<PR> {
  const r = await anonApi.get(`/api/v1/repos/${enc(owner)}/${enc(name)}/pulls/${number}`);
  return r.data as PR;
}

export async function getPullDiff(
  owner: string, name: string, number: number,
): Promise<PRDiff> {
  const r = await anonApi.get(`/api/v1/repos/${enc(owner)}/${enc(name)}/pulls/${number}/diff`);
  return r.data as PRDiff;
}

export async function mergePull(
  owner: string, name: string, number: number, method: "merge" | "ff-only" = "merge",
): Promise<PR> {
  const r = await api.post(
    `/api/v1/repos/${enc(owner)}/${enc(name)}/pulls/${number}/merge`,
    { method },
  );
  return r.data as PR;
}

export async function closePull(
  owner: string, name: string, number: number,
): Promise<PR> {
  const r = await api.post(
    `/api/v1/repos/${enc(owner)}/${enc(name)}/pulls/${number}/close`,
  );
  return r.data as PR;
}

// ── helpers ──────────────────────────────────────────────────────

function enc(s: string): string {
  return encodeURIComponent(s);
}

function pathEnc(path: string): string {
  // Preserve '/' in multi-segment paths; encode each segment otherwise.
  return path.split("/").map(encodeURIComponent).join("/");
}

function is404(e: unknown): boolean {
  return (e as AxiosError)?.response?.status === 404;
}

export function isUnauthorized(e: unknown): boolean {
  return (e as AxiosError)?.response?.status === 401;
}
