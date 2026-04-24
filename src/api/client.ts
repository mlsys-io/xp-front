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

export type RepoKind = "app" | "autoresearch" | "agent" | "skill";
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
  from_upstream?: boolean;        // true for fork branches that match upstream
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
  include_forks?: boolean;
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

// ── Commits / contributors / forks / watchers ─────────────────────

export type Commit = {
  sha: string;
  short_sha: string;
  author: string;
  email: string;
  timestamp: number;              // unix seconds
  subject: string;
  body: string;
};

export type CommitDetail = Commit & { stat: string };

export async function listCommits(
  owner: string, name: string,
  opts: { ref?: string; path?: string; limit?: number; offset?: number } = {},
): Promise<Commit[]> {
  const r = await anonApi.get(
    `/api/v1/repos/${enc(owner)}/${enc(name)}/commits`,
    { params: opts },
  );
  return (r.data?.commits || []) as Commit[];
}

export async function getCommit(
  owner: string, name: string, sha: string,
): Promise<CommitDetail> {
  const r = await anonApi.get(
    `/api/v1/repos/${enc(owner)}/${enc(name)}/commits/${enc(sha)}`,
  );
  return r.data as CommitDetail;
}

export type Contributor = { author: string; email: string; commits: number };

export async function listContributors(
  owner: string, name: string,
): Promise<Contributor[]> {
  const r = await anonApi.get(
    `/api/v1/repos/${enc(owner)}/${enc(name)}/contributors`,
  );
  return (r.data?.contributors || []) as Contributor[];
}

export async function listForks(owner: string, name: string): Promise<Repo[]> {
  const r = await anonApi.get(`/api/v1/repos/${enc(owner)}/${enc(name)}/forks`);
  return (r.data?.forks || []) as Repo[];
}

export type WatchState = { watching: boolean; watchers: number };

export async function getWatchers(
  owner: string, name: string,
): Promise<WatchState> {
  try {
    const r = await api.get(`/api/v1/repos/${enc(owner)}/${enc(name)}/watchers`);
    return r.data as WatchState;
  } catch {
    return { watching: false, watchers: 0 };
  }
}

export async function toggleWatch(
  owner: string, name: string,
): Promise<WatchState> {
  const r = await api.post(`/api/v1/repos/${enc(owner)}/${enc(name)}/watch`);
  return r.data as WatchState;
}

// ── Activity feed ─────────────────────────────────────────────────

export type Activity = {
  ts: number;
  kind: string;
  actor_sub: string;
  target: string;
  detail?: Record<string, unknown>;
};

export async function listActivity(
  opts: { kind?: string; actor?: string; limit?: number; offset?: number } = {},
): Promise<Activity[]> {
  const r = await anonApi.get("/api/v1/activity", { params: opts });
  return (r.data?.events || []) as Activity[];
}

// ── PR comments ───────────────────────────────────────────────────

export type PRComment = {
  id: string;
  author_sub: string;
  author_email: string | null;
  body: string;
  file: string | null;
  line: number | null;
  side: "left" | "right";
  created_at: number;
};

export async function listPRComments(
  owner: string, name: string, number: number,
): Promise<PRComment[]> {
  const r = await anonApi.get(
    `/api/v1/repos/${enc(owner)}/${enc(name)}/pulls/${number}/comments`,
  );
  return (r.data?.comments || []) as PRComment[];
}

export async function addPRComment(
  owner: string, name: string, number: number,
  body: { body: string; file?: string | null; line?: number | null;
          side?: "left" | "right" },
): Promise<PRComment> {
  const r = await api.post(
    `/api/v1/repos/${enc(owner)}/${enc(name)}/pulls/${number}/comments`,
    body,
  );
  return r.data as PRComment;
}

// ── Collaborators ─────────────────────────────────────────────────

export type CollaboratorRole = "read" | "triage" | "write" | "admin";
export type Collaborator = { user_sub: string; role: CollaboratorRole };

export async function listCollaborators(
  owner: string, name: string,
): Promise<Collaborator[]> {
  const r = await api.get(
    `/api/v1/repos/${enc(owner)}/${enc(name)}/collaborators`,
  );
  return (r.data?.collaborators || []) as Collaborator[];
}

export async function setCollaborator(
  owner: string, name: string, user_sub: string, role: CollaboratorRole,
): Promise<{ ok: boolean; user_sub: string; role: string }> {
  const r = await api.put(
    `/api/v1/repos/${enc(owner)}/${enc(name)}/collaborators`,
    { user_sub, role },
  );
  return r.data;
}

export async function removeCollaborator(
  owner: string, name: string, collab_sub: string,
): Promise<{ ok: boolean; removed: boolean }> {
  const r = await api.delete(
    `/api/v1/repos/${enc(owner)}/${enc(name)}/collaborators/${enc(collab_sub)}`,
  );
  return r.data;
}

// ── Discussions (Community) ───────────────────────────────────────

export type DiscussionSummary = {
  id: string;
  title: string;
  author_sub: string;
  created_at: number;
  state: "open" | "closed";
  comment_count: number;
};

export type DiscussionComment = {
  id: string;
  author_sub: string;
  body: string;
  created_at: number;
};

export type Discussion = DiscussionSummary & {
  author_email: string | null;
  comments: DiscussionComment[];
};

export async function listDiscussions(
  owner: string, name: string, state: "all" | "open" | "closed" = "all",
): Promise<DiscussionSummary[]> {
  const r = await anonApi.get(
    `/api/v1/repos/${enc(owner)}/${enc(name)}/discussions`, { params: { state } },
  );
  return (r.data?.discussions || []) as DiscussionSummary[];
}

export async function createDiscussion(
  owner: string, name: string, body: { title: string; body?: string },
): Promise<Discussion> {
  const r = await api.post(
    `/api/v1/repos/${enc(owner)}/${enc(name)}/discussions`, body,
  );
  return r.data as Discussion;
}

export async function getDiscussion(
  owner: string, name: string, disc_id: string,
): Promise<Discussion> {
  const r = await anonApi.get(
    `/api/v1/repos/${enc(owner)}/${enc(name)}/discussions/${enc(disc_id)}`,
  );
  return r.data as Discussion;
}

export async function addDiscussionComment(
  owner: string, name: string, disc_id: string, body: string,
): Promise<DiscussionComment> {
  const r = await api.post(
    `/api/v1/repos/${enc(owner)}/${enc(name)}/discussions/${enc(disc_id)}/comments`,
    { body },
  );
  return r.data as DiscussionComment;
}

export async function closeDiscussion(
  owner: string, name: string, disc_id: string,
): Promise<Discussion> {
  const r = await api.post(
    `/api/v1/repos/${enc(owner)}/${enc(name)}/discussions/${enc(disc_id)}/close`,
  );
  return r.data as Discussion;
}

// ── Trending ──────────────────────────────────────────────────────

export async function listTrending(
  opts: { kind?: RepoKind | ""; window?: "day" | "week" | "month";
          limit?: number } = {},
): Promise<Repo[]> {
  const r = await anonApi.get("/api/v1/trending", { params: opts });
  return (r.data?.repos || []) as Repo[];
}

// ── Collections ───────────────────────────────────────────────────

export type Collection = {
  id: string;
  name: string;
  description: string;
  repo_slugs: string[];
  created_at: number;
};

export async function listCollections(owner_sub: string): Promise<Collection[]> {
  const r = await anonApi.get(`/api/v1/users/${enc(owner_sub)}/collections`);
  return (r.data?.collections || []) as Collection[];
}

export async function createCollection(
  name: string, description = "",
): Promise<Collection> {
  const r = await api.post("/api/v1/user/collections", { name, description });
  return r.data as Collection;
}

export async function deleteCollection(id: string): Promise<{ ok: boolean }> {
  const r = await api.delete(`/api/v1/user/collections/${enc(id)}`);
  return r.data;
}

export async function addToCollection(
  id: string, repo_slug: string,
): Promise<Collection> {
  const r = await api.post(
    `/api/v1/user/collections/${enc(id)}/items`, { repo_slug },
  );
  return r.data as Collection;
}

export async function removeFromCollection(
  id: string, owner: string, name: string,
): Promise<Collection> {
  const r = await api.delete(
    `/api/v1/user/collections/${enc(id)}/items/${enc(owner)}/${enc(name)}`,
  );
  return r.data as Collection;
}

// ── Repo transfer ─────────────────────────────────────────────────

export type Transfer = {
  old_owner_sub: string;
  name: string;
  new_owner_sub: string;
  initiated_by: string;
  initiated_at: number;
};

export async function initiateTransfer(
  owner: string, name: string, new_owner_sub: string,
): Promise<{ ok: boolean; transfer: Transfer }> {
  const r = await api.post(
    `/api/v1/repos/${enc(owner)}/${enc(name)}/transfer`,
    { new_owner_sub },
  );
  return r.data;
}

export async function acceptTransfer(
  owner: string, name: string,
): Promise<{ ok: boolean; old_slug: string; new_slug: string; repo: Repo }> {
  const r = await api.post(
    `/api/v1/repos/${enc(owner)}/${enc(name)}/transfer/accept`,
  );
  return r.data;
}

export async function getPendingTransfer(
  owner: string, name: string,
): Promise<Transfer | null> {
  try {
    const r = await api.get(
      `/api/v1/repos/${enc(owner)}/${enc(name)}/transfer/pending`,
    );
    return r.data as Transfer;
  } catch (e) {
    if (is404(e)) return null;
    throw e;
  }
}

export async function listIncomingTransfers(): Promise<Transfer[]> {
  const r = await api.get("/api/v1/user/transfers/incoming");
  return (r.data?.transfers || []) as Transfer[];
}

// ── Audit / export ────────────────────────────────────────────────

export async function readUserAudit(
  opts: { since?: number; limit?: number } = {},
): Promise<Array<{
  ts: number; actor_sub: string | null; actor_ip: string | null;
  action: string; target: string; detail: Record<string, unknown>;
  status: string;
}>> {
  const r = await api.get("/api/v1/user/audit", { params: opts });
  return r.data?.events || [];
}

export async function exportUserData(): Promise<unknown> {
  const r = await api.get("/api/v1/user/export");
  return r.data;
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
