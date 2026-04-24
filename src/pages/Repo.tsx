import { useEffect, useMemo, useRef, useState } from "react";
import {
  Link, useLocation, useNavigate, useParams, useSearchParams,
} from "react-router-dom";
import {
  acceptTransfer,
  addDiscussionComment,
  addPRComment,
  closeDiscussion,
  closePull,
  createDiscussion,
  deleteRepo,
  forkRepo,
  getBlob,
  getDiscussion,
  getPendingTransfer,
  getPull,
  getPullDiff,
  getRepo,
  getTree,
  getWatchers,
  initiateTransfer,
  isUnauthorized,
  listBranches,
  listCollaborators,
  listCommits,
  listContributors,
  listDiscussions,
  listForks,
  listPRComments,
  listPulls,
  mergePull,
  openPull,
  patchRepo,
  pushCommit,
  removeCollaborator,
  setCollaborator,
  starRepo,
  toggleWatch,
  whoami,
  type Branch,
  type Collaborator,
  type CollaboratorRole,
  type Commit,
  type Contributor,
  type Discussion,
  type DiscussionSummary,
  type Me,
  type PR,
  type PRComment,
  type PRDiff,
  type Repo as RepoT,
  type Transfer,
  type TreeEntry,
  type Visibility,
} from "../api/client";
import { Markdown } from "../components/Markdown";

type Tab = "code" | "commits" | "branches" | "pulls" | "community"
         | "forks" | "settings";

const KIND_GLYPH: Record<string, string> = { app: "⁂", autoresearch: "⋯", agent: "❋", skill: "⌘" };
const KIND_LABEL: Record<string, string> = {
  app: "Application", autoresearch: "AutoResearch", agent: "Agentic KG", skill: "Skill",
};

/**
 * Unified repo detail page. Decides what to render from the URL:
 *   /:owner/:name                   → Code tab, main branch
 *   /:owner/:name/tree/:branch/*    → Code tab, named branch, subpath
 *   /:owner/:name/blob/:branch/*    → File view
 *   /:owner/:name/pulls             → Pulls tab (list)
 *   /:owner/:name/settings          → Settings tab (owner only)
 */
export function Repo() {
  const { owner = "", name = "", branch: branchParam, number: numberParam, "*": splat = "" } = useParams();
  const location = useLocation();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();

  // Route discrimination — React Router can't give us named route ids here,
  // so we read the pathname. Order matters: /pulls/new before /pulls/:n.
  const pathname = location.pathname;
  const prefix = `/${owner}/${name}`;
  const mode: "tree" | "blob" | "blob-edit" | "branches" | "pulls"
            | "pull-detail" | "pull-new" | "settings" | "commits"
            | "community" | "discussion-detail" | "forks" =
    pathname === `${prefix}/branches`
      ? "branches"
      : pathname === `${prefix}/commits` || pathname.startsWith(`${prefix}/commits/`)
        ? "commits"
        : pathname === `${prefix}/forks`
          ? "forks"
          : pathname === `${prefix}/pulls/new`
            ? "pull-new"
            : numberParam
              ? "pull-detail"
              : pathname.startsWith(`${prefix}/pulls`)
                ? "pulls"
                : pathname.startsWith(`${prefix}/blob/`)
                  ? (searchParams.get("edit") === "1" ? "blob-edit" : "blob")
                  : pathname.startsWith(`${prefix}/settings`)
                    ? "settings"
                    : pathname.startsWith(`${prefix}/discussions/`)
                      ? "discussion-detail"
                      : pathname === `${prefix}/discussions`
                                || pathname === `${prefix}/community`
                        ? "community"
                        : "tree";

  const tab: Tab = mode === "branches"
    ? "branches"
    : mode === "commits"
      ? "commits"
      : mode === "forks"
        ? "forks"
        : mode.startsWith("pull")
          ? "pulls"
          : mode === "settings"
            ? "settings"
            : mode === "community" || mode === "discussion-detail"
              ? "community"
              : "code";
  const branch = branchParam || "main";

  const [me, setMe] = useState<Me | null>(null);
  const [repo, setRepo] = useState<RepoT | null | "missing">(null);

  useEffect(() => {
    whoami().then(setMe).catch(() => setMe(null));
  }, []);

  useEffect(() => {
    getRepo(owner, name)
      .then((r) => setRepo(r ?? "missing"))
      .catch(() => setRepo("missing"));
  }, [owner, name]);

  if (repo === null) {
    return <Shell><div className="py-16 text-center text-gray-500 text-sm">listening to the Tree…</div></Shell>;
  }
  if (repo === "missing") {
    return (
      <Shell>
        <div className="py-16 text-center">
          <div className="text-xl font-semibold text-gray-900">not found</div>
          <div className="mt-2 text-sm text-gray-600">No such repo here.</div>
          <Link to="/" className="mt-6 inline-block text-xs text-soul-300 hover:text-soul-400">
            ← back to the marketspace
          </Link>
        </div>
      </Shell>
    );
  }

  const isOwner = !!me && me.sub === repo.owner_sub;

  return (
    <Shell me={me}>
      <RepoHeader repo={repo} me={me} isOwner={isOwner} onChange={setRepo} />

      <div className="mt-8 border-b border-gray-200 flex gap-6 overflow-x-auto">
        <TabLink to={`/${enc(owner)}/${enc(name)}`} active={tab === "code"}>Code</TabLink>
        <TabLink to={`/${enc(owner)}/${enc(name)}/commits`} active={tab === "commits"}>Commits</TabLink>
        <TabLink to={`/${enc(owner)}/${enc(name)}/branches`} active={tab === "branches"}>Branches</TabLink>
        <TabLink to={`/${enc(owner)}/${enc(name)}/pulls`} active={tab === "pulls"}>Pull Requests</TabLink>
        <TabLink to={`/${enc(owner)}/${enc(name)}/community`} active={tab === "community"}>Community</TabLink>
        <TabLink to={`/${enc(owner)}/${enc(name)}/forks`} active={tab === "forks"}>Forks</TabLink>
        {isOwner && (
          <TabLink to={`/${enc(owner)}/${enc(name)}/settings`} active={tab === "settings"}>
            Settings
          </TabLink>
        )}
      </div>

      <div className="mt-6">
        {mode === "tree" && <CodeTab repo={repo} branch={branch} path={branchParam ? splat : ""} isOwner={isOwner} />}
        {mode === "blob" && <BlobView repo={repo} branch={branch} path={splat} isOwner={isOwner} />}
        {mode === "blob-edit" && <BlobEditor repo={repo} branch={branch} path={splat} />}
        {mode === "branches" && <BranchesTab repo={repo} me={me} />}
        {mode === "commits" && <CommitsTab repo={repo} branch={branch} />}
        {mode === "forks" && <ForksTab repo={repo} />}
        {mode === "community" && <CommunityTab repo={repo} me={me} />}
        {mode === "discussion-detail" && (
          <DiscussionDetail repo={repo} me={me} isOwner={isOwner} />
        )}
        {mode === "pulls" && <PullsTab repo={repo} me={me} />}
        {mode === "pull-new" && <NewPullForm repo={repo} me={me} />}
        {mode === "pull-detail" && numberParam && (
          <PullDetail repo={repo} number={Number(numberParam)} me={me} isOwner={isOwner} />
        )}
        {mode === "settings" && isOwner && (
          <SettingsTab repo={repo} onChange={setRepo} onDeleted={() => nav("/")} />
        )}
      </div>
    </Shell>
  );
}

function RepoHeader({
  repo, me, isOwner, onChange,
}: {
  repo: RepoT;
  me: Me | null;
  isOwner: boolean;
  onChange: (r: RepoT) => void;
}) {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  const onFork = async () => {
    if (!me) {
      const { beginLogin } = await import("../lib/pkce");
      return beginLogin();
    }
    setBusy(true);
    try {
      const fork = await forkRepo(repo.owner_sub, repo.name);
      nav(`/${enc(fork.owner_sub)}/${enc(fork.name)}`);
    } catch (e) {
      if (isUnauthorized(e)) {
        const { beginLogin } = await import("../lib/pkce");
        return beginLogin();
      }
      alert((e as any).response?.data?.detail || "fork failed");
    } finally {
      setBusy(false);
    }
  };

  const onStar = async () => {
    if (!me) {
      const { beginLogin } = await import("../lib/pkce");
      return beginLogin();
    }
    try {
      const s = await starRepo(repo.owner_sub, repo.name);
      onChange({ ...repo, stars: s.count });
    } catch (e) {
      if (isUnauthorized(e)) {
        const { beginLogin } = await import("../lib/pkce");
        beginLogin();
      }
    }
  };

  const [watch, setWatch] = useState<{ watching: boolean; watchers: number }>({
    watching: false, watchers: 0,
  });
  useEffect(() => {
    getWatchers(repo.owner_sub, repo.name)
      .then(setWatch)
      .catch(() => setWatch({ watching: false, watchers: 0 }));
  }, [repo.owner_sub, repo.name]);

  const onWatch = async () => {
    if (!me) {
      const { beginLogin } = await import("../lib/pkce");
      return beginLogin();
    }
    try {
      setWatch(await toggleWatch(repo.owner_sub, repo.name));
    } catch (e) {
      if (isUnauthorized(e)) {
        const { beginLogin } = await import("../lib/pkce");
        beginLogin();
      }
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-600 font-mono">
        <Link
          to={`/${enc(repo.owner_sub)}`}
          className="hover:text-soul-300 transition-colors"
        >
          {repo.owner_sub.slice(0, 10)}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-semibold">{repo.name}</span>
        {repo.visibility === "private" && (
          <span className="ml-2 text-[10px] uppercase tracking-wider text-atokirina-400">private</span>
        )}
      </div>
      <div className="mt-1 flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-soul-400/50 text-base">{KIND_GLYPH[repo.kind]}</span>
            {repo.display_name || repo.name}
          </h1>
          <div className="mt-1 text-xs text-gray-700">
            <span className="font-mono lowercase">{repo.kind}</span>
            {repo.fork_of && (
              <span className="ml-3">
                ⑂ forked from{" "}
                <Link to={`/${repo.fork_of}`} className="font-mono hover:text-soul-300">{repo.fork_of}</Link>
              </span>
            )}
          </div>
          {repo.summary && (
            <p className="mt-2 text-sm text-gray-700 max-w-2xl">{repo.summary}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onWatch}
            className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
              watch.watching
                ? "border-spirit-400/40 text-spirit-300 bg-spirit-400/5"
                : "border-gray-300 text-bark-300 hover:border-gray-400 hover:bg-gray-50"
            }`}
          >
            {watch.watching ? "Watching" : "Watch"}{" "}
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 text-[10px] text-gray-700 tabular-nums">
              {watch.watchers}
            </span>
          </button>
          <button
            onClick={onStar}
            className="px-2.5 py-1 text-xs rounded-md border border-gray-300 text-bark-300 hover:border-gray-400 hover:bg-gray-50 transition-colors"
          >
            <span className="text-atokirina-400 mr-1">★</span>
            Star{" "}
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 text-[10px] text-gray-700 tabular-nums">
              {repo.stars}
            </span>
          </button>
          {!isOwner && (
            <button
              disabled={busy}
              onClick={onFork}
              className="px-2.5 py-1 text-xs rounded-md border border-gray-300 text-bark-300 hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {busy ? "Forking…" : "Fork"}{" "}
              {!busy && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 text-[10px] text-gray-700 tabular-nums">
                  {repo.forks}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
      {repo.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {repo.tags.map((t) => (
            <span key={t} className="text-[10px] text-gray-600 border border-gray-200 rounded-full px-2 py-0.5">
              {t}
            </span>
          ))}
        </div>
      )}
      <KindCard repo={repo} />
    </div>
  );
}

// ── Kind-specific card (HuggingFace-style metadata strip) ───────

function KindCard({ repo }: { repo: RepoT }) {
  const [manifest, setManifest] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    // Try manifest.json first, then manifest.yaml. Small lookup — if
    // neither exists the card just stays collapsed.
    (async () => {
      const branch = repo.head_ref || "main";
      const tryFiles = repo.kind === "autoresearch"
        ? ["manifest.json", "manifest.yaml", "autoresearch.yaml"]
        : repo.kind === "skill"
          ? ["manifest.json", "manifest.yaml", "SKILL.md"]
          : ["manifest.json", "manifest.yaml"];
      for (const f of tryFiles) {
        try {
          const blob = await getBlob(repo.owner_sub, repo.name, branch, f);
          try {
            setManifest(JSON.parse(blob.content));
            return;
          } catch {
            // Not JSON — show raw text under a `raw` key.
            setManifest({ raw: blob.content, _source: f });
            return;
          }
        } catch { /* next */ }
      }
      setManifest({});
    })();
  }, [repo.owner_sub, repo.name, repo.head_ref, repo.kind]);

  if (manifest === null) return null;

  const pills: Array<[string, string]> = [];
  if (repo.kind === "app") {
    if (Array.isArray(manifest.skills_required)) {
      pills.push(["skills", manifest.skills_required.join(" · ")]);
    }
    if (Array.isArray(manifest.tools)) {
      // Prefer showing names (flat strings or {name} objects) over a
      // bare count — "tools: file_bug · file_feature" is much more
      // informative than "tools: 2".
      const names = (manifest.tools as any[])
        .map((t) => (typeof t === "string" ? t : t?.name))
        .filter(Boolean);
      pills.push([
        "tools",
        names.length ? names.join(" · ") : String(manifest.tools.length),
      ]);
    }
    if (manifest.thresholds && typeof manifest.thresholds === "object") {
      pills.push(["thresholds",
        Object.entries(manifest.thresholds).map(([k, v]) => `${k}=${v}`).join(" · ")]);
    }
  } else if (repo.kind === "autoresearch") {
    if (manifest.schedule) pills.push(["schedule", String(manifest.schedule)]);
    if (Array.isArray(manifest.skills)) {
      pills.push(["skills", manifest.skills.join(" · ")]);
    }
    if (manifest.domain) pills.push(["domain", String(manifest.domain)]);
  } else if (repo.kind === "agent") {
    pills.push(["kind", "knowledge bundle"]);
    if (manifest.agent_id) pills.push(["agent", String(manifest.agent_id)]);
    if (manifest.domain) pills.push(["domain", String(manifest.domain)]);
  } else if (repo.kind === "skill") {
    if (manifest.inputs) pills.push(["inputs", Object.keys(manifest.inputs).join(", ")]);
    if (manifest.outputs) pills.push(["outputs", Object.keys(manifest.outputs).join(", ")]);
    if (manifest.language) pills.push(["lang", String(manifest.language)]);
  }

  if (pills.length === 0) return null;

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px]">
      {pills.map(([k, v]) => (
        <span key={k} className="text-gray-900">
          <span className="text-gray-600 mr-1.5">{k}:</span>
          <span className="font-mono">{v}</span>
        </span>
      ))}
    </div>
  );
}

// ── Code tab: file tree + README preview ────────────────────────

function CodeTab({ repo, branch, path, isOwner }: {
  repo: RepoT; branch: string; path: string; isOwner?: boolean;
}) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [entries, setEntries] = useState<TreeEntry[] | null>(null);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    listBranches(repo.owner_sub, repo.name).then(setBranches).catch(() => setBranches([]));
  }, [repo.owner_sub, repo.name]);

  useEffect(() => {
    setEntries(null);
    getTree(repo.owner_sub, repo.name, branch, path)
      .then(setEntries)
      .catch((e) => {
        setErr(e?.response?.data?.detail || "failed to load");
        setEntries([]);
      });
  }, [repo.owner_sub, repo.name, branch, path]);

  const readmeEntry = entries?.find((e) => e.name.toLowerCase() === "readme.md" && e.type === "blob");

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-6">
      <div>
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <BranchPicker
            repo={repo}
            branches={branches}
            branch={branch}
            path={path}
          />
          {path && (
            <div className="text-xs text-gray-700 font-mono">
              <Link to={`/${enc(repo.owner_sub)}/${enc(repo.name)}/tree/${enc(branch)}`} className="hover:text-soul-300">
                {repo.name}
              </Link>
              {splitPath(path).map((seg, i, arr) => (
                <span key={i}>
                  {" / "}
                  <Link
                    to={`/${enc(repo.owner_sub)}/${enc(repo.name)}/tree/${enc(branch)}/${arr.slice(0, i + 1).join("/")}`}
                    className="hover:text-soul-300"
                  >
                    {seg}
                  </Link>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          {entries === null ? (
            <div className="px-4 py-6 text-sm text-gray-500">loading…</div>
          ) : entries.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-500">{err || "empty"}</div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {[...entries].sort(sortEntries).map((e) => (
                <li key={e.name} className="px-4 py-2 text-sm flex items-center justify-between">
                  <Link
                    to={
                      e.type === "tree"
                        ? `/${enc(repo.owner_sub)}/${enc(repo.name)}/tree/${enc(branch)}/${joinPath(path, e.name)}`
                        : `/${enc(repo.owner_sub)}/${enc(repo.name)}/blob/${enc(branch)}/${joinPath(path, e.name)}`
                    }
                    className="flex items-center gap-2 text-gray-900 hover:text-soul-300 truncate"
                  >
                    <span className="text-soul-400/60">{e.type === "tree" ? "▸" : "◦"}</span>
                    <span className="truncate">{e.name}</span>
                  </Link>
                  {e.type === "blob" && (
                    <span className="text-[11px] text-gray-500 tabular-nums">{e.size}B</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div>
        {readmeEntry ? (
          <ReadmePreview repo={repo} branch={branch} path={joinPath(path, readmeEntry.name)} />
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 p-6 text-sm text-gray-500">
            No README at this level.
          </div>
        )}
      </div>
    </div>
  );
}

function BranchPicker({
  repo, branches, branch, path,
}: {
  repo: RepoT; branches: Branch[]; branch: string; path: string;
}) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Close on outside-click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const list = branches.length ? branches : [{ name: branch, sha: "" } as Branch];
  // The Code tab isn't the place to enumerate every branch — the Branches
  // tab is. Filter out fork-inherited branches (same tip as upstream),
  // exclude the current one, and cap the shortlist for quick-switch.
  const other = list.filter(
    (b) => b.name !== branch && !b.from_upstream,
  );
  const count = branches.length || 1;
  const SHORTLIST = 6;
  const shortlist = other.slice(0, SHORTLIST - 1);
  const hidden = Math.max(0, count - 1 - shortlist.length);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-soul-400 rounded-md px-3 py-1.5 text-xs text-gray-900 transition-colors"
      >
        <span className="text-soul-400/70">⎇</span>
        <span className="font-mono">{branch}</span>
        <span className="text-gray-500">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 w-72 rounded-lg border border-gray-200 bg-white/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="px-3 py-2 text-[10px] text-gray-600 border-b border-gray-200">
            Switch branch ({count})
          </div>
          <ul>
            {shortlist.map((b) => (
              <li key={b.name}>
                <button
                  onClick={() => {
                    setOpen(false);
                    nav(`/${enc(repo.owner_sub)}/${enc(repo.name)}/tree/${enc(b.name)}${path ? "/" + path : ""}`);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-gray-900 hover:bg-soul-400/10 flex items-center justify-between gap-3"
                >
                  <span className="font-mono truncate">{b.name}</span>
                  {b.is_default && (
                    <span className="text-[10px] uppercase tracking-wider text-soul-400/70 shrink-0">default</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <Link
            to={`/${enc(repo.owner_sub)}/${enc(repo.name)}/branches`}
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-[11px] text-soul-300 hover:text-soul-400 border-t border-gray-200"
          >
            {hidden > 0 ? `View all ${count} branches →` : "View all branches →"}
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Branches tab ──────────────────────────────────────────────────

function BranchesTab({ repo, me }: { repo: RepoT; me: Me | null }) {
  const nav = useNavigate();
  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    listBranches(repo.owner_sub, repo.name)
      .then(setBranches)
      .catch((e) => setErr(e?.response?.data?.detail || "failed to load"));
  }, [repo.owner_sub, repo.name]);

  if (branches === null) {
    return <div className="py-10 text-center text-sm text-gray-500">{err || "loading…"}</div>;
  }

  const canCreatePR = !!me;

  return (
    <div>
      <div className="text-xs text-gray-600 mb-3">
        {branches.length} branch{branches.length === 1 ? "" : "es"}
      </div>
      <ul className="rounded-xl border border-gray-200 divide-y divide-gray-200 overflow-hidden">
        {branches.map((b) => (
          <li key={b.name} className="px-4 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to={`/${enc(repo.owner_sub)}/${enc(repo.name)}/tree/${enc(b.name)}`}
                  className="font-mono text-sm text-gray-900 hover:text-soul-300 truncate"
                >
                  {b.name}
                </Link>
                {b.is_default && (
                  <span className="text-[10px] uppercase tracking-wider text-soul-400/70 border border-gray-300 rounded-full px-2 py-0.5">default</span>
                )}
                {!b.is_default && (b.ahead !== undefined || b.behind !== undefined) && (
                  <span className="text-[11px] tabular-nums text-gray-700">
                    <span className="text-soul-400">↑{b.ahead ?? 0}</span>
                    <span className="mx-1.5 text-gray-500">·</span>
                    <span className="text-atokirina-400/80">↓{b.behind ?? 0}</span>
                  </span>
                )}
              </div>
              {b.last_commit && (
                <div className="mt-1 text-[11px] text-gray-600 truncate">
                  <code className="font-mono text-gray-700 mr-2">{b.last_commit.short_sha}</code>
                  {b.last_commit.message_summary}
                  <span className="mx-2 text-gray-500">·</span>
                  <span title={b.last_commit.author}>
                    {b.last_commit.author.slice(0, 14)}
                  </span>
                  <span className="mx-1.5 text-gray-500">·</span>
                  <span>{formatRelative(b.last_commit.date)}</span>
                </div>
              )}
            </div>
            {!b.is_default && canCreatePR && (b.ahead ?? 0) > 0 && (
              <button
                onClick={() =>
                  nav(`/${enc(repo.owner_sub)}/${enc(repo.name)}/pulls/new?head=${encodeURIComponent(b.name)}`)
                }
                className="shrink-0 px-3 py-1.5 text-[11px] rounded-full border border-gray-300 text-soul-300 hover:text-soul-400 hover:border-soul-400"
              >
                New PR
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatRelative(iso: string): string {
  try {
    const then = new Date(iso).getTime();
    const diff = (Date.now() - then) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return iso;
  }
}

function ReadmePreview({ repo, branch, path }: { repo: RepoT; branch: string; path: string }) {
  const [text, setText] = useState<string>("");
  useEffect(() => {
    getBlob(repo.owner_sub, repo.name, branch, path)
      .then((b) => setText(b.content))
      .catch(() => setText(""));
  }, [repo.owner_sub, repo.name, branch, path]);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 overflow-auto max-h-[70vh]">
      <Markdown className="text-sm text-gray-900/90 leading-relaxed">{text}</Markdown>
    </div>
  );
}

// ── Blob view ────────────────────────────────────────────────────

function BlobView({ repo, branch, path, isOwner }: {
  repo: RepoT; branch: string; path: string; isOwner?: boolean;
}) {
  const [text, setText] = useState<string | null>(null);
  const [err, setErr] = useState<string>("");
  useEffect(() => {
    setText(null);
    getBlob(repo.owner_sub, repo.name, branch, path)
      .then((b) => setText(b.content))
      .catch((e) => setErr(e?.response?.data?.detail || "failed"));
  }, [repo.owner_sub, repo.name, branch, path]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-xs text-gray-700 font-mono">
          <Link to={`/${enc(repo.owner_sub)}/${enc(repo.name)}/tree/${enc(branch)}`} className="hover:text-soul-300">
            {repo.name}
          </Link>
          {splitPath(path).map((seg, i, arr) => (
            <span key={i}>
              {" / "}
              {i === arr.length - 1 ? (
                <span className="text-gray-900">{seg}</span>
              ) : (
                <Link
                  to={`/${enc(repo.owner_sub)}/${enc(repo.name)}/tree/${enc(branch)}/${arr.slice(0, i + 1).join("/")}`}
                  className="hover:text-soul-300"
                >
                  {seg}
                </Link>
              )}
            </span>
          ))}
        </div>
        {isOwner && (
          <Link
            to={`/${enc(repo.owner_sub)}/${enc(repo.name)}/blob/${enc(branch)}/${pathEnc(path)}?edit=1`}
            className="text-[11px] text-soul-300 hover:text-soul-400"
          >
            ✎ edit
          </Link>
        )}
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-5 overflow-auto max-h-[80vh]">
        {text === null ? (
          <div className="text-sm text-gray-500">{err || "loading…"}</div>
        ) : path.toLowerCase().endsWith(".md") ? (
          <Markdown className="text-sm text-gray-900/90 leading-relaxed">{text}</Markdown>
        ) : (
          <pre className="text-xs text-gray-900 font-mono whitespace-pre-wrap break-words leading-relaxed">
            {text}
          </pre>
        )}
      </div>
    </div>
  );
}

// ── Blob editor: in-browser file edit → commit → push ────────────

function BlobEditor({ repo, branch, path }: { repo: RepoT; branch: string; path: string }) {
  const nav = useNavigate();
  const [original, setOriginal] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [branchHead, setBranchHead] = useState<string>("");
  const [newBranch, setNewBranch] = useState("");
  const [message, setMessage] = useState("update " + path.split("/").slice(-1)[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    // Parallel: load blob + resolve branch head. repo.head_sha is the default
    // branch's head — editing a feature branch needs THAT branch's head as
    // parent_sha, otherwise the server rejects the push as stale.
    getBlob(repo.owner_sub, repo.name, branch, path)
      .then((b) => { setOriginal(b.content); setText(b.content); })
      .catch((e) => setErr(e?.response?.data?.detail || "failed to load"));
    listBranches(repo.owner_sub, repo.name)
      .then((bs) => {
        const b = bs.find((x) => x.name === branch);
        setBranchHead(b?.sha || "");
      })
      .catch(() => setBranchHead(""));
  }, [repo.owner_sub, repo.name, branch, path]);

  const submit = async () => {
    setErr("");
    setBusy(true);
    try {
      const targetBranch = newBranch.trim() || branch;
      // Same branch → use THIS branch's head as parent_sha (not repo.head_sha,
      // which is the default branch). New branch → null; server forks it off
      // main.
      const parent = targetBranch === branch ? (branchHead || null) : null;
      const out = await pushCommit(repo.owner_sub, repo.name, {
        branch: targetBranch,
        parent_sha: parent,
        message,
        changes: [{ path, op: "upsert", content: text }],
      });
      if (!out.committed) {
        setErr("no changes to commit");
        setBusy(false);
        return;
      }
      nav(`/${enc(repo.owner_sub)}/${enc(repo.name)}/blob/${enc(targetBranch)}/${pathEnc(path)}`);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "push failed");
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="text-xs text-gray-700 font-mono mb-3">
        ✎ editing {path} on <span className="text-gray-900">{branch}</span>
      </div>
      {original === null ? (
        <div className="text-sm text-gray-500 py-10 text-center">loading…</div>
      ) : (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full min-h-[50vh] bg-gray-50 border border-gray-200 rounded-md p-3 font-mono text-xs text-gray-900 focus:outline-none focus:border-gray-300"
          />
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Commit message">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 w-full"
              />
            </Field>
            <Field label={`Branch (blank = ${branch})`}>
              <input
                value={newBranch}
                onChange={(e) => setNewBranch(e.target.value)}
                placeholder={`new-branch (else commits to ${branch})`}
                className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 w-full"
              />
            </Field>
          </div>
          {err && <div className="mt-2 text-xs text-atokirina-400">{err}</div>}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={submit}
              disabled={busy || !message.trim()}
              className="px-4 py-2 text-xs rounded-full border border-gray-300 text-soul-300 hover:text-soul-400 hover:border-soul-400 disabled:opacity-50"
            >
              {busy ? "committing…" : "✦ commit"}
            </button>
            <Link
              to={`/${enc(repo.owner_sub)}/${enc(repo.name)}/blob/${enc(branch)}/${pathEnc(path)}`}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              cancel
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

// ── Pulls tab ────────────────────────────────────────────────────

function PullsTab({ repo, me }: { repo: RepoT; me: Me | null }) {
  const [pulls, setPulls] = useState<PR[] | null>(null);
  const [state, setState] = useState<"all" | "open" | "merged" | "closed">("open");

  useEffect(() => {
    listPulls(repo.owner_sub, repo.name, state)
      .then(setPulls)
      .catch(() => setPulls([]));
  }, [repo.owner_sub, repo.name, state]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-4 text-xs">
          {(["open", "merged", "closed", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setState(s)}
              className={`pb-1 transition-colors ${
                state === s ? "text-soul-300 border-b border-soul-400" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {me && (
          <Link
            to={`/${enc(repo.owner_sub)}/${enc(repo.name)}/pulls/new`}
            className="px-3 py-1.5 text-xs rounded-full border border-gray-300 text-soul-300 hover:text-soul-400 hover:border-soul-400"
          >
            + new pr
          </Link>
        )}
      </div>
      {pulls === null ? (
        <div className="text-sm text-gray-500 py-10 text-center">loading…</div>
      ) : pulls.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-500">
          No {state === "all" ? "" : state} pull requests.
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200">
          {pulls.map((p) => (
            <li key={p.number} className="px-5 py-3">
              <Link
                to={`/${enc(repo.owner_sub)}/${enc(repo.name)}/pulls/${p.number}`}
                className="block"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm text-gray-900 truncate hover:text-soul-300">
                      <span className="text-gray-500 mr-2">#{p.number}</span>
                      {p.title}
                    </div>
                    <div className="mt-0.5 text-[11px] text-gray-500">
                      {p.head_owner.slice(0, 10)}:{p.head_branch} → {p.base_branch}
                    </div>
                  </div>
                  <div className="shrink-0 text-[10px]">
                    <StateBadge state={p.state} />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── New PR form ──────────────────────────────────────────────────

function NewPullForm({ repo, me }: { repo: RepoT; me: Me | null }) {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  // Prefilled via ?head=<branch> when coming from the Branches tab's
  // "New PR" quickshot.
  const preHead = searchParams.get("head") || "";
  const [baseBranch, setBaseBranch] = useState("main");
  const [baseBranches, setBaseBranches] = useState<Branch[]>([]);
  // Candidates for the head repo: this same repo (same-owner branches) plus
  // any repo of mine that's a fork of this one.
  const [candidates, setCandidates] = useState<RepoT[]>([]);
  const [headSlug, setHeadSlug] = useState("");  // "owner/name"
  const [headBranches, setHeadBranches] = useState<Branch[]>([]);
  const [headBranch, setHeadBranch] = useState(preHead);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Load base branches.
  useEffect(() => {
    listBranches(repo.owner_sub, repo.name)
      .then(setBaseBranches)
      .catch(() => setBaseBranches([]));
  }, [repo.owner_sub, repo.name]);

  // Load candidate head repos: same repo + my forks of it.
  useEffect(() => {
    if (!me) return;
    (async () => {
      const mine = await import("../api/client")
        .then((m) => m.listRepos({ owner: me.sub, limit: 200 }))
        .catch(() => [] as RepoT[]);
      const wantedFork = `${repo.owner_sub}/${repo.name}`;
      const forks = mine.filter((r) => r.fork_of === wantedFork);
      const list = [repo, ...forks];
      setCandidates(list);
      // Default: prefer my fork over the upstream repo (matches GitHub UX).
      const def = forks[0] || repo;
      setHeadSlug(`${def.owner_sub}/${def.name}`);
    })();
  }, [me, repo.owner_sub, repo.name]);

  // When head-repo changes, reload its branches.
  useEffect(() => {
    if (!headSlug) return;
    const [o, n] = headSlug.split("/", 2);
    listBranches(o, n)
      .then((bs) => {
        setHeadBranches(bs);
        // Default to a non-main branch if one exists, else main.
        const nonMain = bs.find((b) => b.name !== baseBranch);
        setHeadBranch((prev) => prev || nonMain?.name || bs[0]?.name || "");
      })
      .catch(() => setHeadBranches([]));
  }, [headSlug, baseBranch]);

  if (!me) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 p-6 text-sm text-gray-700">
        Sign in to open a pull request.
      </div>
    );
  }

  const [headOwner, headName] = headSlug.split("/", 2);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const pr = await openPull(repo.owner_sub, repo.name, {
        base_branch: baseBranch.trim() || "main",
        head_owner: headOwner,
        head_name: headName,
        head_branch: headBranch.trim(),
        title: title.trim(),
        body,
      });
      nav(`/${enc(repo.owner_sub)}/${enc(repo.name)}/pulls/${pr.number}`);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "open failed");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-4">
      <div className="text-sm text-gray-700 mb-2">
        Propose merging{" "}
        <span className="font-mono text-gray-900">
          {(headOwner || "…").slice(0, 10)}/{headName || "…"}:{headBranch || "…"}
        </span>
        {" "}into{" "}
        <span className="font-mono text-gray-900">
          {repo.owner_sub.slice(0, 10)}/{repo.name}:{baseBranch}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Base branch">
          <select
            value={baseBranch}
            onChange={(e) => setBaseBranch(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 w-full"
          >
            {(baseBranches.length ? baseBranches : [{ name: "main", sha: "" }]).map((b) => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Head repo">
          <select
            value={headSlug}
            onChange={(e) => { setHeadSlug(e.target.value); setHeadBranch(""); }}
            className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 w-full font-mono text-xs"
          >
            {candidates.map((r) => {
              const slug = `${r.owner_sub}/${r.name}`;
              const isFork = r.fork_of === `${repo.owner_sub}/${repo.name}`;
              const label = isFork
                ? `your fork (${r.owner_sub.slice(0, 8)}/${r.name})`
                : `this repo (${r.owner_sub.slice(0, 8)}/${r.name})`;
              return <option key={slug} value={slug}>{label}</option>;
            })}
          </select>
        </Field>
        <Field label="Head branch">
          <select
            value={headBranch}
            onChange={(e) => setHeadBranch(e.target.value)}
            required
            className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 w-full"
          >
            <option value="">— pick a branch —</option>
            {headBranches.map((b) => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Title">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 w-full"
        />
      </Field>

      <Field label="Description">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 w-full"
        />
      </Field>

      {err && <div className="text-xs text-atokirina-400">{err}</div>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy || !title.trim() || !headBranch.trim() || !headOwner}
          className="px-4 py-2 text-xs rounded-full border border-gray-300 text-soul-300 hover:text-soul-400 hover:border-soul-400 disabled:opacity-50"
        >
          {busy ? "opening…" : "✦ open pr"}
        </button>
        <Link
          to={`/${enc(repo.owner_sub)}/${enc(repo.name)}/pulls`}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          cancel
        </Link>
      </div>
    </form>
  );
}

// ── PR detail ────────────────────────────────────────────────────

function PullDetail({
  repo, number, me, isOwner,
}: {
  repo: RepoT; number: number; me: Me | null; isOwner: boolean;
}) {
  const nav = useNavigate();
  const [pr, setPr] = useState<PR | null | "missing">(null);
  const [diff, setDiff] = useState<PRDiff | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const reload = async () => {
    try {
      const p = await getPull(repo.owner_sub, repo.name, number);
      setPr(p);
      if (p.state === "open") {
        getPullDiff(repo.owner_sub, repo.name, number).then(setDiff).catch(() => setDiff(null));
      } else {
        getPullDiff(repo.owner_sub, repo.name, number).then(setDiff).catch(() => setDiff(null));
      }
    } catch {
      setPr("missing");
    }
  };
  useEffect(() => { reload(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [repo.owner_sub, repo.name, number]);

  if (pr === null) return <div className="text-sm text-gray-500 py-10 text-center">loading…</div>;
  if (pr === "missing") return <div className="text-sm text-gray-500 py-10 text-center">PR not found</div>;

  const canMerge = isOwner && pr.state === "open";
  const canClose = pr.state === "open" && !!me && (me.sub === pr.author_sub || me.sub === pr.base_owner);

  const doMerge = async (method: "merge" | "ff-only") => {
    setErr("");
    setBusy(true);
    try {
      await mergePull(repo.owner_sub, repo.name, number, method);
      await reload();
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "merge failed");
    } finally {
      setBusy(false);
    }
  };
  const doClose = async () => {
    setErr("");
    setBusy(true);
    try {
      await closePull(repo.owner_sub, repo.name, number);
      await reload();
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "close failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="text-xs text-gray-500">
            <Link to={`/${enc(repo.owner_sub)}/${enc(repo.name)}/pulls`} className="hover:text-soul-300">
              ← pulls
            </Link>
          </div>
          <h2 className="mt-1 text-xl font-semibold text-bark-300">
            <span className="text-gray-500 mr-2">#{pr.number}</span>
            {pr.title}
          </h2>
          <div className="mt-1 text-xs text-gray-600 flex items-center gap-3 flex-wrap">
            <StateBadge state={pr.state} />
            <span>
              <span className="text-gray-900 font-mono">{pr.author_sub.slice(0, 10)}</span> wants to merge
            </span>
            <span className="font-mono text-gray-900">{pr.head_owner.slice(0, 10)}:{pr.head_branch}</span>
            <span>→</span>
            <span className="font-mono text-gray-900">{pr.base_branch}</span>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {canMerge && (
            <>
              <button
                onClick={() => doMerge("merge")}
                disabled={busy}
                className="px-3 py-1.5 text-xs rounded-full border border-gray-300 text-soul-300 hover:text-soul-400 hover:border-soul-400 disabled:opacity-50"
              >
                {busy ? "merging…" : "✦ merge"}
              </button>
              <button
                onClick={() => doMerge("ff-only")}
                disabled={busy}
                className="px-3 py-1.5 text-xs rounded-full border border-spirit-400/40 text-spirit-300 hover:border-spirit-400/70 disabled:opacity-50"
              >
                ff only
              </button>
            </>
          )}
          {canClose && (
            <button
              onClick={doClose}
              disabled={busy}
              className="px-3 py-1.5 text-xs rounded-full border border-atokirina-400/40 text-atokirina-400 hover:bg-atokirina-400/10 disabled:opacity-50"
            >
              close
            </button>
          )}
        </div>
      </div>

      {err && <div className="mt-2 text-xs text-atokirina-400">{err}</div>}

      {pr.body && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <Markdown className="text-sm text-gray-900/90">{pr.body}</Markdown>
        </div>
      )}

      <PRCommentsBlock repo={repo} number={number} me={me} />

      <div className="mt-8">
        <div className="text-xs text-gray-600 mb-2">
          Files changed {diff?.files.length ? `(${diff.files.length})` : ""}
        </div>
        {!diff ? (
          <div className="text-sm text-gray-500">loading diff…</div>
        ) : diff.files.length === 0 ? (
          <div className="text-sm text-gray-500">no changes</div>
        ) : (
          <div className="space-y-4">
            <ul className="rounded-xl border border-gray-200 divide-y divide-gray-200">
              {diff.files.map((f) => (
                <li key={f.path} className="px-4 py-2 text-xs flex items-center justify-between">
                  <span className="font-mono text-gray-900 truncate">{f.path}</span>
                  <span className="shrink-0 ml-4 space-x-2 tabular-nums">
                    <span className="text-soul-300">+{f.added}</span>
                    <span className="text-atokirina-400">−{f.deleted}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="rounded-xl border border-gray-200 bg-white p-4 overflow-auto max-h-[70vh]">
              <pre className="text-[11px] font-mono leading-relaxed">
                {diff.unified_diff.split("\n").map((line, i) => (
                  <div
                    key={i}
                    className={
                      line.startsWith("+++") || line.startsWith("---") || line.startsWith("diff ") || line.startsWith("@@ ")
                        ? "text-gray-600"
                        : line.startsWith("+")
                          ? "text-soul-300"
                          : line.startsWith("-")
                            ? "text-atokirina-400"
                            : "text-gray-700"
                    }
                  >
                    {line || " "}
                  </div>
                ))}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StateBadge({ state }: { state: PR["state"] }) {
  const color =
    state === "open" ? "text-soul-300 border-gray-300"
      : state === "merged" ? "text-spirit-300 border-spirit-400/40"
        : "text-gray-500 border-bark-300/20";
  return <span className={`border rounded-full px-2 py-0.5 ${color}`}>{state}</span>;
}

function PRCommentsBlock({
  repo, number, me,
}: {
  repo: RepoT; number: number; me: Me | null;
}) {
  const [comments, setComments] = useState<PRComment[] | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = () => {
    listPRComments(repo.owner_sub, repo.name, number).then(setComments).catch(() => setComments([]));
  };
  useEffect(reload, [repo.owner_sub, repo.name, number]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me) {
      const { beginLogin } = await import("../lib/pkce");
      return beginLogin();
    }
    if (!body.trim()) return;
    setBusy(true);
    try {
      await addPRComment(repo.owner_sub, repo.name, number, { body });
      setBody("");
      reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="text-xs text-gray-600 mb-3">
        Conversation {comments?.length ? `(${comments.length})` : ""}
      </div>
      {!comments ? (
        <div className="text-sm text-gray-500">loading…</div>
      ) : comments.length === 0 ? (
        <div className="text-sm text-gray-500 italic">Quiet here. First comment sets the tone.</div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-[11px] text-gray-600 mb-2 flex items-center gap-2">
                <span className="font-mono text-gray-900">{c.author_sub.slice(0, 10)}</span>
                {c.file && (
                  <code className="text-gray-600">
                    on {c.file}
                    {c.line != null ? `:${c.line}` : ""}
                  </code>
                )}
                <span>{relTime(c.created_at)}</span>
              </div>
              <Markdown className="text-sm text-gray-900/90">{c.body}</Markdown>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={onSubmit} className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="leave a review comment (markdown)"
          className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-bark-300 placeholder:text-gray-500 mb-2 font-mono"
        />
        <button
          disabled={busy || !body.trim()}
          className="px-3 py-1.5 text-[11px] border border-gray-300 rounded text-soul-300 hover:border-soul-400 disabled:opacity-40"
        >
          {busy ? "posting…" : "comment"}
        </button>
      </form>
    </div>
  );
}

// ── Settings tab ─────────────────────────────────────────────────

function SettingsTab({
  repo, onChange, onDeleted,
}: {
  repo: RepoT;
  onChange: (r: RepoT) => void;
  onDeleted: () => void;
}) {
  const nav = useNavigate();
  const [name, setName] = useState(repo.name);
  const [visibility, setVisibility] = useState<Visibility>(repo.visibility);
  const [summary, setSummary] = useState(repo.summary);
  const [tags, setTags] = useState(repo.tags.join(", "));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const save = async () => {
    setBusy(true);
    setMsg("");
    const trimmedName = name.trim();
    const renaming = trimmedName && trimmedName !== repo.name;
    try {
      const patch: any = {
        visibility,
        summary,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      };
      if (renaming) patch.name = trimmedName;
      const updated = await patchRepo(repo.owner_sub, repo.name, patch);
      onChange(updated);
      if (renaming && updated.name !== repo.name) {
        // Slug changed — URL must follow.
        nav(`/${enc(updated.owner_sub)}/${enc(updated.name)}/settings`,
            { replace: true });
        return;
      }
      setMsg("saved.");
    } catch (e: any) {
      setMsg(e?.response?.data?.detail || "save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="max-w-xl space-y-6">
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="lowercase, alnum + . _ -"
            className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 w-full font-mono"
          />
          {name.trim() && name.trim() !== repo.name && (
            <div className="mt-1 text-[11px] text-gray-600">
              Renaming updates every PR and fork pointer. New URL:
              {" "}
              <span className="font-mono text-soul-300/80">
                /{repo.owner_sub.slice(0, 10)}/{name.trim()}
              </span>
            </div>
          )}
        </Field>
        <Field label="Visibility">
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}
            className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 w-full"
          >
            <option value="public">public — anyone can browse</option>
            <option value="private">private — only you</option>
          </select>
        </Field>
        <Field label="Summary">
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={2}
            className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 w-full"
          />
        </Field>
        <Field label="Tags (comma-separated)">
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 w-full"
          />
        </Field>
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={busy}
            className="px-4 py-2 text-xs rounded-full border border-gray-300 text-soul-300 hover:text-soul-400 hover:border-soul-400 disabled:opacity-50"
          >
            {busy ? "saving…" : "save"}
          </button>
          {msg && <span className="text-xs text-gray-700">{msg}</span>}
        </div>
      </div>

      <CollaboratorsSection repo={repo} />
      <TransferSection repo={repo} />

      <div className="max-w-xl border-t border-atokirina-400/15 pt-6 mt-10">
        <div className="text-xs text-atokirina-400 mb-2">Danger zone</div>
        <button
          onClick={() => setDeleteOpen(true)}
          disabled={busy}
          className="px-4 py-2 text-xs rounded-full border border-atokirina-400/50 text-atokirina-400 hover:bg-atokirina-400/10 disabled:opacity-50"
        >
          Delete repo
        </button>
      </div>
      <DeleteModal
        open={deleteOpen}
        repo={repo}
        onClose={() => setDeleteOpen(false)}
        onDeleted={onDeleted}
      />
    </>
  );
}

function CollaboratorsSection({ repo }: { repo: RepoT }) {
  const [collabs, setCollabs] = useState<Collaborator[] | null>(null);
  const [newSub, setNewSub] = useState("");
  const [newRole, setNewRole] = useState<CollaboratorRole>("write");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const reload = () => {
    listCollaborators(repo.owner_sub, repo.name).then(setCollabs).catch(() => setCollabs([]));
  };
  useEffect(reload, [repo.owner_sub, repo.name]);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSub.trim()) return;
    setBusy(true);
    setMsg("");
    try {
      await setCollaborator(repo.owner_sub, repo.name, newSub.trim(), newRole);
      setNewSub("");
      reload();
    } catch (err: any) {
      setMsg(err?.response?.data?.detail || "failed");
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async (sub: string) => {
    if (!confirm(`Remove ${sub.slice(0, 10)}?`)) return;
    await removeCollaborator(repo.owner_sub, repo.name, sub);
    reload();
  };

  return (
    <div className="max-w-xl border-t border-gray-200 pt-6 mt-10">
      <div className="text-xs text-soul-300 mb-3">Collaborators</div>
      {collabs === null ? (
        <div className="text-xs text-gray-500">loading…</div>
      ) : collabs.length === 0 ? (
        <div className="text-xs text-gray-500 mb-3">No collaborators yet.</div>
      ) : (
        <div className="mb-3 divide-y divide-gray-200 rounded border border-gray-200">
          {collabs.map((c) => (
            <div key={c.user_sub} className="flex items-center justify-between p-2">
              <div className="font-mono text-xs text-gray-900">{c.user_sub.slice(0, 18)}…</div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-gray-600">{c.role}</span>
                <button
                  onClick={() => onRemove(c.user_sub)}
                  className="text-[11px] text-atokirina-400 hover:text-atokirina-300"
                >
                  remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={onAdd} className="flex flex-wrap items-center gap-2">
        <input
          value={newSub}
          onChange={(e) => setNewSub(e.target.value)}
          placeholder="user sub (lum.id uuid)"
          className="flex-1 min-w-[12rem] bg-gray-50 border border-gray-200 rounded px-3 py-1.5 text-xs text-gray-900 font-mono"
        />
        <select
          value={newRole}
          onChange={(e) => setNewRole(e.target.value as CollaboratorRole)}
          className="bg-gray-50 border border-gray-200 rounded px-3 py-1.5 text-xs text-gray-900"
        >
          <option value="read">read</option>
          <option value="triage">triage</option>
          <option value="write">write</option>
          <option value="admin">admin</option>
        </select>
        <button
          disabled={busy || !newSub.trim()}
          className="px-3 py-1.5 text-[11px] border border-gray-300 rounded text-soul-300 hover:border-soul-400 disabled:opacity-40"
        >
          add
        </button>
      </form>
      {msg && <div className="mt-2 text-xs text-atokirina-400">{msg}</div>}
    </div>
  );
}

function TransferSection({ repo }: { repo: RepoT }) {
  const [pending, setPending] = useState<Transfer | null>(null);
  const [newOwner, setNewOwner] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const reload = () => {
    getPendingTransfer(repo.owner_sub, repo.name).then(setPending).catch(() => setPending(null));
  };
  useEffect(reload, [repo.owner_sub, repo.name]);

  const onInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOwner.trim()) return;
    if (!confirm(`Transfer this repo to ${newOwner.slice(0, 10)}? They must accept.`)) return;
    setBusy(true);
    setMsg("");
    try {
      await initiateTransfer(repo.owner_sub, repo.name, newOwner.trim());
      setNewOwner("");
      reload();
      setMsg("pending — waiting for new owner to accept.");
    } catch (err: any) {
      setMsg(err?.response?.data?.detail || "failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl border-t border-gray-200 pt-6 mt-10">
      <div className="text-xs text-soul-300 mb-3">Transfer ownership</div>
      {pending ? (
        <div className="rounded border border-atokirina-400/30 bg-atokirina-400/5 p-3 text-xs text-gray-900">
          Transfer pending → <span className="font-mono">{pending.new_owner_sub.slice(0, 12)}…</span>
          <br />
          They need to accept before the move completes.
        </div>
      ) : (
        <form onSubmit={onInitiate} className="flex flex-wrap items-center gap-2">
          <input
            value={newOwner}
            onChange={(e) => setNewOwner(e.target.value)}
            placeholder="new owner sub (lum.id uuid)"
            className="flex-1 min-w-[14rem] bg-gray-50 border border-gray-200 rounded px-3 py-1.5 text-xs text-gray-900 font-mono"
          />
          <button
            disabled={busy || !newOwner.trim()}
            className="px-3 py-1.5 text-[11px] border border-atokirina-400/40 rounded text-atokirina-400 hover:border-atokirina-400/70 disabled:opacity-40"
          >
            initiate transfer
          </button>
        </form>
      )}
      {msg && <div className="mt-2 text-xs text-gray-700">{msg}</div>}
    </div>
  );
}

function DeleteModal({
  open, repo, onClose, onDeleted,
}: {
  open: boolean;
  repo: RepoT;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) {
      setTyped("");
      setErr("");
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  const confirm = async () => {
    if (typed !== repo.name) return;
    setBusy(true);
    setErr("");
    try {
      await deleteRepo(repo.owner_sub, repo.name);
      onDeleted();
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "delete failed");
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-night-900/80 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-[110] w-full max-w-md rounded-2xl border border-atokirina-400/30 bg-white/95 backdrop-blur-xl shadow-2xl p-6"
      >
        <div className="text-xs uppercase tracking-[0.3em] text-atokirina-400 mb-2">
          ⚠ Delete repo
        </div>
        <div className="text-sm text-gray-900">
          This deletes <span className="font-mono text-bark-300">{repo.owner_sub.slice(0, 10)}/{repo.name}</span>
          {" "}and all of its branches, PRs, and stars. It cannot be undone.
        </div>
        <div className="mt-4 text-xs text-gray-700">
          Type <span className="font-mono text-atokirina-400">{repo.name}</span> to confirm:
        </div>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={repo.name}
          autoFocus
          className="mt-2 bg-night-900/60 border border-atokirina-400/30 rounded-md px-3 py-2 text-sm text-gray-900 w-full font-mono"
        />
        {err && <div className="mt-2 text-xs text-atokirina-400">{err}</div>}
        <div className="mt-5 flex items-center gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={busy}
            className="text-xs text-gray-600 hover:text-gray-900 px-2 py-2"
          >
            cancel
          </button>
          <button
            onClick={confirm}
            disabled={busy || typed !== repo.name}
            className="px-4 py-2 text-xs rounded-full border border-atokirina-400/60 text-atokirina-400 hover:bg-atokirina-400/15 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? "deleting…" : "delete forever"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] text-gray-600 mb-1">{label}</div>
      {children}
    </div>
  );
}

// ── Shell + helpers ──────────────────────────────────────────────

function Shell({ children, me }: { children: React.ReactNode; me?: Me | null }) {
  return (
    <div className="min-h-screen relative">
      <div className="absolute inset-0 starfield opacity-20 pointer-events-none" aria-hidden="true" />
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-gray-200">
        <Link to="/" className="text-soul-300 font-display tracking-[0.35em] text-sm">
          <span className="w-1.5 h-1.5 inline-block align-middle rounded-full bg-soul-400 shadow-[0_0_8px_rgba(62,212,193,0.9)] animate-pulse-soul mr-3" />
          xp.io
        </Link>
        <div className="flex items-center gap-6 text-[11px]">
          {me ? (
            <>
              <Link to="/dashboard" className="text-gray-700 hover:text-soul-300">dashboard</Link>
              <button
                onClick={async () => {
                  try { const { logout } = await import("../api/client"); await logout(); } catch { /* cookie cleared server-side */ }
                  window.location.href = "/";
                }}
                className="text-gray-700 hover:text-atokirina-400 text-[12px]"
              >
                sign out
              </button>
            </>
          ) : null}
        </div>
      </nav>
      <main className="relative z-10 mx-auto max-w-6xl px-8 py-10">{children}</main>
    </div>
  );
}

function TabLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  // HF-style tabs — regular weight sentence-case, subtle active state.
  return (
    <Link
      to={to}
      className={`pb-3 text-sm transition-colors ${
        active
          ? "text-gray-900 border-b-2 border-soul-400 font-medium"
          : "text-gray-700 hover:text-gray-900 border-b-2 border-transparent"
      }`}
    >
      {children}
    </Link>
  );
}

function sortEntries(a: TreeEntry, b: TreeEntry) {
  if (a.type !== b.type) return a.type === "tree" ? -1 : 1;
  return a.name.localeCompare(b.name);
}

function splitPath(p: string): string[] {
  return p.split("/").filter(Boolean);
}

function joinPath(a: string, b: string): string {
  return a ? `${a}/${b}` : b;
}

function enc(s: string): string {
  return encodeURIComponent(s);
}

function pathEnc(p: string): string {
  return p.split("/").map(encodeURIComponent).join("/");
}

// ── Commits tab ─────────────────────────────────────────────────

function relTime(unixSec: number): string {
  const s = Math.floor(Date.now() / 1000 - unixSec);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(unixSec * 1000).toISOString().slice(0, 10);
}

function initial(name: string, email?: string): string {
  // Upstream commits are authored with GIT_AUTHOR_NAME=user_sub (a UUID),
  // so the raw first char is a hex digit. Prefer the email local-part
  // in that case — more likely to read as a real identity letter.
  const raw = (name || "").trim();
  const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(raw)
    || /^[0-9a-f]{6,}$/i.test(raw);
  if (looksLikeUuid && email) {
    const prefix = email.split("@")[0];
    if (prefix) return prefix.charAt(0).toUpperCase();
  }
  return raw.charAt(0).toUpperCase() || "?";
}

function CommitsTab({ repo, branch }: { repo: RepoT; branch: string }) {
  const [commits, setCommits] = useState<Commit[] | null>(null);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    setCommits(null);
    listCommits(repo.owner_sub, repo.name, { ref: branch, limit: 50 })
      .then(setCommits)
      .catch((e) => setErr(e?.response?.data?.detail || "failed"));
  }, [repo.owner_sub, repo.name, branch]);

  if (commits === null) {
    return <div className="py-10 text-center text-gray-500 text-sm">{err || "loading…"}</div>;
  }
  if (commits.length === 0) {
    return <div className="py-10 text-center text-gray-500 text-sm">No commits on this branch yet.</div>;
  }
  return (
    <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-200">
      {commits.map((c) => (
        <div key={c.sha} className="flex items-center gap-3 p-3">
          <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold flex items-center justify-center shrink-0">
            {initial(c.author, c.email)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-bark-300 truncate">{c.subject}</div>
            <div className="text-[11px] text-gray-600 mt-0.5">
              <span className="text-gray-700">{c.author}</span>
              {" · "}
              <span>{relTime(c.timestamp)}</span>
            </div>
          </div>
          <code className="text-[11px] font-mono text-gray-600 shrink-0">{c.short_sha}</code>
        </div>
      ))}
    </div>
  );
}

// ── Forks tab ──────────────────────────────────────────────────

function ForksTab({ repo }: { repo: RepoT }) {
  const [forks, setForks] = useState<RepoT[] | null>(null);
  useEffect(() => {
    listForks(repo.owner_sub, repo.name).then(setForks).catch(() => setForks([]));
  }, [repo.owner_sub, repo.name]);
  if (forks === null) return <div className="py-10 text-center text-gray-500 text-sm">loading…</div>;
  if (forks.length === 0) {
    return (
      <div className="py-10 text-center text-gray-500 text-sm">
        No one has forked this yet. Your copy could be the first.
      </div>
    );
  }
  return (
    <div className="grid gap-3">
      {forks.map((f) => (
        <Link
          key={`${f.owner_sub}/${f.name}`}
          to={`/${enc(f.owner_sub)}/${enc(f.name)}`}
          className="block rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-300"
        >
          <div className="font-mono text-sm text-bark-300">
            {f.owner_sub.slice(0, 10)} / <span className="text-soul-300">{f.name}</span>
          </div>
          {f.summary && <div className="text-xs text-gray-700 mt-1">{f.summary}</div>}
          <div className="text-[11px] text-gray-500 mt-2">
            ★ {f.stars} · ⑂ {f.forks} · updated {relTime(f.updated_at)}
          </div>
        </Link>
      ))}
    </div>
  );
}

// ── Community tab (discussions list + new thread) ──────────────

function CommunityTab({ repo, me }: { repo: RepoT; me: Me | null }) {
  const [discussions, setDiscussions] = useState<DiscussionSummary[] | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = () => {
    listDiscussions(repo.owner_sub, repo.name).then(setDiscussions).catch(() => setDiscussions([]));
  };
  useEffect(reload, [repo.owner_sub, repo.name]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me) {
      const { beginLogin } = await import("../lib/pkce");
      return beginLogin();
    }
    if (!title.trim()) return;
    setBusy(true);
    try {
      await createDiscussion(repo.owner_sub, repo.name, { title, body });
      setTitle(""); setBody("");
      reload();
    } catch (err: any) {
      alert(err.response?.data?.detail || "failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      <div>
        {discussions === null ? (
          <div className="py-10 text-center text-gray-500 text-sm">loading…</div>
        ) : discussions.length === 0 ? (
          <div className="py-10 text-center text-gray-500 text-sm">
            No discussions yet. Open the first thread on the right.
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-200">
            {discussions.map((d) => (
              <Link
                key={d.id}
                to={`/${enc(repo.owner_sub)}/${enc(repo.name)}/discussions/${enc(d.id)}`}
                className="flex items-center justify-between p-4 hover:bg-white"
              >
                <div className="min-w-0">
                  <div className="text-sm text-bark-300">
                    {d.state === "closed" && <span className="text-gray-500 mr-2">[closed]</span>}
                    {d.title}
                  </div>
                  <div className="text-[11px] text-gray-600 mt-0.5">
                    {d.author_sub.slice(0, 10)} · {relTime(d.created_at)} · {d.comment_count} comment{d.comment_count === 1 ? "" : "s"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <form onSubmit={onCreate} className="rounded-xl border border-gray-200 bg-white p-4 h-fit">
        <div className="text-xs text-soul-300 mb-3">Start a thread</div>
        <input
          type="text"
          placeholder="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-bark-300 placeholder:text-gray-500 mb-2"
        />
        <textarea
          placeholder="body (optional — markdown)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-bark-300 placeholder:text-gray-500 mb-2 font-mono"
        />
        <button
          disabled={busy || !title.trim()}
          className="w-full py-2 text-xs border border-gray-300 rounded text-soul-300 hover:border-soul-400 disabled:opacity-40"
        >
          {busy ? "opening…" : "open discussion"}
        </button>
      </form>
    </div>
  );
}

function DiscussionDetail({ repo, me, isOwner }: { repo: RepoT; me: Me | null; isOwner: boolean }) {
  const { "*": splat = "" } = useParams();
  const disc_id = splat.split("/")[0];
  const [disc, setDisc] = useState<Discussion | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = () => {
    if (!disc_id) return;
    getDiscussion(repo.owner_sub, repo.name, disc_id).then(setDisc).catch(() => setDisc(null));
  };
  useEffect(reload, [repo.owner_sub, repo.name, disc_id]);

  if (!disc) return <div className="py-10 text-center text-gray-500 text-sm">loading…</div>;

  const canClose = me && (me.sub === disc.author_sub || isOwner);

  const onReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me) {
      const { beginLogin } = await import("../lib/pkce");
      return beginLogin();
    }
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await addDiscussionComment(repo.owner_sub, repo.name, disc.id, reply);
      setReply("");
      reload();
    } finally {
      setBusy(false);
    }
  };

  const onClose = async () => {
    if (!confirm("Close this discussion?")) return;
    await closeDiscussion(repo.owner_sub, repo.name, disc.id);
    reload();
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-xl font-semibold text-bark-300">{disc.title}</h2>
        {canClose && disc.state === "open" && (
          <button onClick={onClose} className="text-xs text-gray-700 hover:text-atokirina-400">
            close thread
          </button>
        )}
      </div>
      <div className="space-y-3">
        {disc.comments.map((c) => (
          <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-[11px] text-gray-600 mb-2">
              <span className="text-gray-700">{c.author_sub.slice(0, 10)}</span> · {relTime(c.created_at)}
            </div>
            <Markdown className="text-sm text-gray-900/90">{c.body}</Markdown>
          </div>
        ))}
      </div>
      {disc.state === "open" && (
        <form onSubmit={onReply} className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <textarea
            placeholder="reply (markdown)"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={4}
            className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-bark-300 placeholder:text-gray-500 mb-2 font-mono"
          />
          <button
            disabled={busy || !reply.trim()}
            className="px-4 py-2 text-xs border border-gray-300 rounded text-soul-300 hover:border-soul-400 disabled:opacity-40"
          >
            {busy ? "posting…" : "reply"}
          </button>
        </form>
      )}
    </div>
  );
}
