import { useEffect, useMemo, useRef, useState } from "react";
import {
  Link, useLocation, useNavigate, useParams, useSearchParams,
} from "react-router-dom";
import {
  closePull,
  deleteRepo,
  forkRepo,
  getBlob,
  getPull,
  getPullDiff,
  getRepo,
  getTree,
  isUnauthorized,
  listBranches,
  listPulls,
  mergePull,
  openPull,
  patchRepo,
  pushCommit,
  starRepo,
  whoami,
  type Branch,
  type Me,
  type PR,
  type PRDiff,
  type Repo as RepoT,
  type TreeEntry,
  type Visibility,
} from "../api/client";

type Tab = "code" | "branches" | "pulls" | "settings";

const KIND_GLYPH: Record<string, string> = { app: "⁂", autoresearch: "⋯", agent: "❋" };
const KIND_LABEL: Record<string, string> = {
  app: "Application", autoresearch: "AutoResearch", agent: "Agentic KG",
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
  const mode: "tree" | "blob" | "blob-edit" | "branches" | "pulls" | "pull-detail" | "pull-new" | "settings" =
    pathname === `${prefix}/branches`
      ? "branches"
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
                : "tree";

  const tab: Tab = mode === "branches"
    ? "branches"
    : mode.startsWith("pull")
      ? "pulls"
      : mode === "settings"
        ? "settings"
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
    return <Shell><div className="py-16 text-center text-bark-300/40 text-sm">listening to the Tree…</div></Shell>;
  }
  if (repo === "missing") {
    return (
      <Shell>
        <div className="py-16 text-center">
          <div className="font-display text-2xl text-bark-300/80">not found</div>
          <div className="mt-2 text-sm text-bark-300/50">No such repo here.</div>
          <Link to="/" className="mt-6 inline-block text-xs uppercase tracking-widest text-soul-300 hover:text-soul-400">
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

      <div className="mt-8 border-b border-soul-400/10 flex gap-6">
        <TabLink to={`/${enc(owner)}/${enc(name)}`} active={tab === "code"}>Code</TabLink>
        <TabLink to={`/${enc(owner)}/${enc(name)}/branches`} active={tab === "branches"}>Branches</TabLink>
        <TabLink to={`/${enc(owner)}/${enc(name)}/pulls`} active={tab === "pulls"}>Pull Requests</TabLink>
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

  return (
    <div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-bark-300/40">
        <span>{repo.owner_sub.slice(0, 10)}</span>
        <span>/</span>
        <span className="text-bark-300/80">{repo.name}</span>
        {repo.visibility === "private" && (
          <span className="ml-2 text-[10px] uppercase tracking-wider text-atokirina-400">private</span>
        )}
      </div>
      <div className="mt-1 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl text-bark-300">
            <span className="text-soul-400/60 mr-2">{KIND_GLYPH[repo.kind]}</span>
            {repo.display_name || repo.name}
          </h1>
          <div className="mt-1 text-xs uppercase tracking-widest text-soul-400/60">
            {KIND_LABEL[repo.kind] || repo.kind}
            {repo.fork_of && (
              <span className="ml-3 text-spirit-300/70">
                ⑂ forked from{" "}
                <Link to={`/${repo.fork_of}`} className="hover:text-soul-300">{repo.fork_of}</Link>
              </span>
            )}
          </div>
          {repo.summary && (
            <p className="mt-3 text-sm text-bark-300/70 max-w-2xl">{repo.summary}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onStar}
            className="px-3 py-1.5 text-xs uppercase tracking-widest border border-soul-400/20 rounded-full text-bark-300/80 hover:border-atokirina-400/60 hover:text-atokirina-400 transition-colors"
          >
            <span className="text-atokirina-400 mr-1">★</span>
            {repo.stars}
          </button>
          {!isOwner && (
            <button
              disabled={busy}
              onClick={onFork}
              className="px-3 py-1.5 text-xs uppercase tracking-widest border border-soul-400/20 rounded-full text-bark-300/80 hover:border-spirit-400/60 hover:text-spirit-300 transition-colors disabled:opacity-50"
            >
              <span className="text-spirit-400 mr-1">⑂</span>
              {busy ? "forking…" : `Fork (${repo.forks})`}
            </button>
          )}
        </div>
      </div>
      {repo.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {repo.tags.map((t) => (
            <span key={t} className="text-[10px] uppercase tracking-widest text-bark-300/50 border border-soul-400/10 rounded-full px-2 py-0.5">
              {t}
            </span>
          ))}
        </div>
      )}
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
            <div className="text-xs text-bark-300/60 font-mono">
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
        <div className="rounded-xl border border-soul-400/10 overflow-hidden">
          {entries === null ? (
            <div className="px-4 py-6 text-sm text-bark-300/40">loading…</div>
          ) : entries.length === 0 ? (
            <div className="px-4 py-6 text-sm text-bark-300/40">{err || "empty"}</div>
          ) : (
            <ul className="divide-y divide-soul-400/5">
              {[...entries].sort(sortEntries).map((e) => (
                <li key={e.name} className="px-4 py-2 text-sm flex items-center justify-between">
                  <Link
                    to={
                      e.type === "tree"
                        ? `/${enc(repo.owner_sub)}/${enc(repo.name)}/tree/${enc(branch)}/${joinPath(path, e.name)}`
                        : `/${enc(repo.owner_sub)}/${enc(repo.name)}/blob/${enc(branch)}/${joinPath(path, e.name)}`
                    }
                    className="flex items-center gap-2 text-bark-300/80 hover:text-soul-300 truncate"
                  >
                    <span className="text-soul-400/60">{e.type === "tree" ? "▸" : "◦"}</span>
                    <span className="truncate">{e.name}</span>
                  </Link>
                  {e.type === "blob" && (
                    <span className="text-[11px] text-bark-300/30 tabular-nums">{e.size}B</span>
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
          <div className="rounded-xl border border-dashed border-soul-400/10 p-6 text-sm text-bark-300/40">
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
  const other = list.filter((b) => b.name !== branch);
  const count = branches.length || 1;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 bg-night-800/80 border border-soul-400/20 hover:border-soul-400/50 rounded-md px-3 py-1.5 text-xs text-bark-300/90 transition-colors"
      >
        <span className="text-soul-400/70">⎇</span>
        <span className="font-mono">{branch}</span>
        <span className="text-bark-300/40">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 w-72 rounded-lg border border-soul-400/20 bg-night-800/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-bark-300/50 border-b border-soul-400/10">
            Switch branch ({count})
          </div>
          <ul className="max-h-72 overflow-y-auto">
            {other.map((b) => (
              <li key={b.name}>
                <button
                  onClick={() => {
                    setOpen(false);
                    nav(`/${enc(repo.owner_sub)}/${enc(repo.name)}/tree/${enc(b.name)}${path ? "/" + path : ""}`);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-bark-300/85 hover:bg-soul-400/10 flex items-center justify-between gap-3"
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
            className="block px-3 py-2 text-[11px] uppercase tracking-widest text-soul-300 hover:text-soul-400 border-t border-soul-400/10"
          >
            View all branches →
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
    return <div className="py-10 text-center text-sm text-bark-300/40">{err || "loading…"}</div>;
  }

  const canCreatePR = !!me;

  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-bark-300/50 mb-3">
        {branches.length} branch{branches.length === 1 ? "" : "es"}
      </div>
      <ul className="rounded-xl border border-soul-400/10 divide-y divide-soul-400/5 overflow-hidden">
        {branches.map((b) => (
          <li key={b.name} className="px-4 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to={`/${enc(repo.owner_sub)}/${enc(repo.name)}/tree/${enc(b.name)}`}
                  className="font-mono text-sm text-bark-300/90 hover:text-soul-300 truncate"
                >
                  {b.name}
                </Link>
                {b.is_default && (
                  <span className="text-[10px] uppercase tracking-wider text-soul-400/70 border border-soul-400/30 rounded-full px-2 py-0.5">default</span>
                )}
                {!b.is_default && (b.ahead !== undefined || b.behind !== undefined) && (
                  <span className="text-[11px] tabular-nums text-bark-300/60">
                    <span className="text-soul-400">↑{b.ahead ?? 0}</span>
                    <span className="mx-1.5 text-bark-300/30">·</span>
                    <span className="text-atokirina-400/80">↓{b.behind ?? 0}</span>
                  </span>
                )}
              </div>
              {b.last_commit && (
                <div className="mt-1 text-[11px] text-bark-300/50 truncate">
                  <code className="font-mono text-bark-300/70 mr-2">{b.last_commit.short_sha}</code>
                  {b.last_commit.message_summary}
                  <span className="mx-2 text-bark-300/30">·</span>
                  <span title={b.last_commit.author}>
                    {b.last_commit.author.slice(0, 14)}
                  </span>
                  <span className="mx-1.5 text-bark-300/30">·</span>
                  <span>{formatRelative(b.last_commit.date)}</span>
                </div>
              )}
            </div>
            {!b.is_default && canCreatePR && (b.ahead ?? 0) > 0 && (
              <button
                onClick={() =>
                  nav(`/${enc(repo.owner_sub)}/${enc(repo.name)}/pulls/new?head=${encodeURIComponent(b.name)}`)
                }
                className="shrink-0 px-3 py-1.5 text-[11px] uppercase tracking-widest rounded-full border border-soul-400/40 text-soul-300 hover:text-soul-400 hover:border-soul-400/70"
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
    <div className="rounded-xl border border-soul-400/10 bg-night-800/40 p-5 overflow-auto max-h-[70vh]">
      <pre className="text-xs text-bark-300/85 font-mono whitespace-pre-wrap break-words leading-relaxed">
        {text}
      </pre>
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
        <div className="text-xs text-bark-300/60 font-mono">
          <Link to={`/${enc(repo.owner_sub)}/${enc(repo.name)}/tree/${enc(branch)}`} className="hover:text-soul-300">
            {repo.name}
          </Link>
          {splitPath(path).map((seg, i, arr) => (
            <span key={i}>
              {" / "}
              {i === arr.length - 1 ? (
                <span className="text-bark-300/85">{seg}</span>
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
            className="text-[11px] uppercase tracking-widest text-soul-300 hover:text-soul-400"
          >
            ✎ edit
          </Link>
        )}
      </div>
      <div className="rounded-xl border border-soul-400/10 bg-night-800/40 p-5 overflow-auto max-h-[80vh]">
        {text === null ? (
          <div className="text-sm text-bark-300/40">{err || "loading…"}</div>
        ) : (
          <pre className="text-xs text-bark-300/85 font-mono whitespace-pre-wrap break-words leading-relaxed">
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
      <div className="text-xs text-bark-300/60 font-mono mb-3">
        ✎ editing {path} on <span className="text-bark-300/85">{branch}</span>
      </div>
      {original === null ? (
        <div className="text-sm text-bark-300/40 py-10 text-center">loading…</div>
      ) : (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full min-h-[50vh] bg-night-800/60 border border-soul-400/15 rounded-md p-3 font-mono text-xs text-bark-300/90 focus:outline-none focus:border-soul-400/40"
          />
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Commit message">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-night-800/60 border border-soul-400/15 rounded-md px-3 py-2 text-sm text-bark-300/90 w-full"
              />
            </Field>
            <Field label={`Branch (blank = ${branch})`}>
              <input
                value={newBranch}
                onChange={(e) => setNewBranch(e.target.value)}
                placeholder={`new-branch (else commits to ${branch})`}
                className="bg-night-800/60 border border-soul-400/15 rounded-md px-3 py-2 text-sm text-bark-300/90 w-full"
              />
            </Field>
          </div>
          {err && <div className="mt-2 text-xs text-atokirina-400">{err}</div>}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={submit}
              disabled={busy || !message.trim()}
              className="px-4 py-2 text-xs uppercase tracking-widest rounded-full border border-soul-400/40 text-soul-300 hover:text-soul-400 hover:border-soul-400/70 disabled:opacity-50"
            >
              {busy ? "committing…" : "✦ commit"}
            </button>
            <Link
              to={`/${enc(repo.owner_sub)}/${enc(repo.name)}/blob/${enc(branch)}/${pathEnc(path)}`}
              className="text-xs uppercase tracking-widest text-bark-300/40 hover:text-bark-300/70"
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
        <div className="flex items-center gap-4 text-xs uppercase tracking-widest">
          {(["open", "merged", "closed", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setState(s)}
              className={`pb-1 transition-colors ${
                state === s ? "text-soul-300 border-b border-soul-400" : "text-bark-300/40 hover:text-bark-300/70"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {me && (
          <Link
            to={`/${enc(repo.owner_sub)}/${enc(repo.name)}/pulls/new`}
            className="px-3 py-1.5 text-xs uppercase tracking-widest rounded-full border border-soul-400/40 text-soul-300 hover:text-soul-400 hover:border-soul-400/70"
          >
            + new pr
          </Link>
        )}
      </div>
      {pulls === null ? (
        <div className="text-sm text-bark-300/40 py-10 text-center">loading…</div>
      ) : pulls.length === 0 ? (
        <div className="rounded-xl border border-dashed border-soul-400/10 py-10 text-center text-sm text-bark-300/40">
          No {state === "all" ? "" : state} pull requests.
        </div>
      ) : (
        <ul className="divide-y divide-soul-400/10 rounded-xl border border-soul-400/10">
          {pulls.map((p) => (
            <li key={p.number} className="px-5 py-3">
              <Link
                to={`/${enc(repo.owner_sub)}/${enc(repo.name)}/pulls/${p.number}`}
                className="block"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm text-bark-300/85 truncate hover:text-soul-300">
                      <span className="text-bark-300/40 mr-2">#{p.number}</span>
                      {p.title}
                    </div>
                    <div className="mt-0.5 text-[11px] text-bark-300/40">
                      {p.head_owner.slice(0, 10)}:{p.head_branch} → {p.base_branch}
                    </div>
                  </div>
                  <div className="shrink-0 text-[10px] uppercase tracking-widest">
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
      <div className="rounded-xl border border-dashed border-soul-400/10 p-6 text-sm text-bark-300/60">
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
      <div className="text-sm text-bark-300/70 mb-2">
        Propose merging{" "}
        <span className="font-mono text-bark-300/90">
          {(headOwner || "…").slice(0, 10)}/{headName || "…"}:{headBranch || "…"}
        </span>
        {" "}into{" "}
        <span className="font-mono text-bark-300/90">
          {repo.owner_sub.slice(0, 10)}/{repo.name}:{baseBranch}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Base branch">
          <select
            value={baseBranch}
            onChange={(e) => setBaseBranch(e.target.value)}
            className="bg-night-800/60 border border-soul-400/15 rounded-md px-3 py-2 text-sm text-bark-300/90 w-full"
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
            className="bg-night-800/60 border border-soul-400/15 rounded-md px-3 py-2 text-sm text-bark-300/90 w-full font-mono text-xs"
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
            className="bg-night-800/60 border border-soul-400/15 rounded-md px-3 py-2 text-sm text-bark-300/90 w-full"
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
          className="bg-night-800/60 border border-soul-400/15 rounded-md px-3 py-2 text-sm text-bark-300/90 w-full"
        />
      </Field>

      <Field label="Description">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          className="bg-night-800/60 border border-soul-400/15 rounded-md px-3 py-2 text-sm text-bark-300/90 w-full"
        />
      </Field>

      {err && <div className="text-xs text-atokirina-400">{err}</div>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy || !title.trim() || !headBranch.trim() || !headOwner}
          className="px-4 py-2 text-xs uppercase tracking-widest rounded-full border border-soul-400/40 text-soul-300 hover:text-soul-400 hover:border-soul-400/70 disabled:opacity-50"
        >
          {busy ? "opening…" : "✦ open pr"}
        </button>
        <Link
          to={`/${enc(repo.owner_sub)}/${enc(repo.name)}/pulls`}
          className="text-xs uppercase tracking-widest text-bark-300/40 hover:text-bark-300/70"
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

  if (pr === null) return <div className="text-sm text-bark-300/40 py-10 text-center">loading…</div>;
  if (pr === "missing") return <div className="text-sm text-bark-300/40 py-10 text-center">PR not found</div>;

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
          <div className="text-xs uppercase tracking-widest text-bark-300/40">
            <Link to={`/${enc(repo.owner_sub)}/${enc(repo.name)}/pulls`} className="hover:text-soul-300">
              ← pulls
            </Link>
          </div>
          <h2 className="mt-1 font-display text-2xl text-bark-300">
            <span className="text-bark-300/40 mr-2">#{pr.number}</span>
            {pr.title}
          </h2>
          <div className="mt-1 text-xs text-bark-300/50 flex items-center gap-3 flex-wrap">
            <StateBadge state={pr.state} />
            <span>
              <span className="text-bark-300/85 font-mono">{pr.author_sub.slice(0, 10)}</span> wants to merge
            </span>
            <span className="font-mono text-bark-300/80">{pr.head_owner.slice(0, 10)}:{pr.head_branch}</span>
            <span>→</span>
            <span className="font-mono text-bark-300/80">{pr.base_branch}</span>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {canMerge && (
            <>
              <button
                onClick={() => doMerge("merge")}
                disabled={busy}
                className="px-3 py-1.5 text-xs uppercase tracking-widest rounded-full border border-soul-400/40 text-soul-300 hover:text-soul-400 hover:border-soul-400/70 disabled:opacity-50"
              >
                {busy ? "merging…" : "✦ merge"}
              </button>
              <button
                onClick={() => doMerge("ff-only")}
                disabled={busy}
                className="px-3 py-1.5 text-xs uppercase tracking-widest rounded-full border border-spirit-400/40 text-spirit-300 hover:border-spirit-400/70 disabled:opacity-50"
              >
                ff only
              </button>
            </>
          )}
          {canClose && (
            <button
              onClick={doClose}
              disabled={busy}
              className="px-3 py-1.5 text-xs uppercase tracking-widest rounded-full border border-atokirina-400/40 text-atokirina-400 hover:bg-atokirina-400/10 disabled:opacity-50"
            >
              close
            </button>
          )}
        </div>
      </div>

      {err && <div className="mt-2 text-xs text-atokirina-400">{err}</div>}

      {pr.body && (
        <div className="mt-4 rounded-xl border border-soul-400/10 bg-night-800/40 p-4">
          <pre className="text-xs text-bark-300/80 font-sans whitespace-pre-wrap">{pr.body}</pre>
        </div>
      )}

      <div className="mt-8">
        <div className="text-xs uppercase tracking-widest text-bark-300/50 mb-2">
          Files changed {diff?.files.length ? `(${diff.files.length})` : ""}
        </div>
        {!diff ? (
          <div className="text-sm text-bark-300/40">loading diff…</div>
        ) : diff.files.length === 0 ? (
          <div className="text-sm text-bark-300/40">no changes</div>
        ) : (
          <div className="space-y-4">
            <ul className="rounded-xl border border-soul-400/10 divide-y divide-soul-400/5">
              {diff.files.map((f) => (
                <li key={f.path} className="px-4 py-2 text-xs flex items-center justify-between">
                  <span className="font-mono text-bark-300/85 truncate">{f.path}</span>
                  <span className="shrink-0 ml-4 space-x-2 tabular-nums">
                    <span className="text-soul-300">+{f.added}</span>
                    <span className="text-atokirina-400">−{f.deleted}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="rounded-xl border border-soul-400/10 bg-night-800/40 p-4 overflow-auto max-h-[70vh]">
              <pre className="text-[11px] font-mono leading-relaxed">
                {diff.unified_diff.split("\n").map((line, i) => (
                  <div
                    key={i}
                    className={
                      line.startsWith("+++") || line.startsWith("---") || line.startsWith("diff ") || line.startsWith("@@ ")
                        ? "text-bark-300/50"
                        : line.startsWith("+")
                          ? "text-soul-300"
                          : line.startsWith("-")
                            ? "text-atokirina-400"
                            : "text-bark-300/70"
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
    state === "open" ? "text-soul-300 border-soul-400/40"
      : state === "merged" ? "text-spirit-300 border-spirit-400/40"
        : "text-bark-300/40 border-bark-300/20";
  return <span className={`border rounded-full px-2 py-0.5 ${color}`}>{state}</span>;
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
            className="bg-night-800/60 border border-soul-400/15 rounded-md px-3 py-2 text-sm text-bark-300/90 w-full font-mono"
          />
          {name.trim() && name.trim() !== repo.name && (
            <div className="mt-1 text-[11px] text-bark-300/50">
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
            className="bg-night-800/60 border border-soul-400/15 rounded-md px-3 py-2 text-sm text-bark-300/90 w-full"
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
            className="bg-night-800/60 border border-soul-400/15 rounded-md px-3 py-2 text-sm text-bark-300/90 w-full"
          />
        </Field>
        <Field label="Tags (comma-separated)">
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="bg-night-800/60 border border-soul-400/15 rounded-md px-3 py-2 text-sm text-bark-300/90 w-full"
          />
        </Field>
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={busy}
            className="px-4 py-2 text-xs uppercase tracking-widest rounded-full border border-soul-400/40 text-soul-300 hover:text-soul-400 hover:border-soul-400/70 disabled:opacity-50"
          >
            {busy ? "saving…" : "save"}
          </button>
          {msg && <span className="text-xs text-bark-300/60">{msg}</span>}
        </div>
        <div className="border-t border-atokirina-400/15 pt-6 mt-10">
          <div className="text-xs uppercase tracking-widest text-atokirina-400 mb-2">Danger zone</div>
          <button
            onClick={() => setDeleteOpen(true)}
            disabled={busy}
            className="px-4 py-2 text-xs uppercase tracking-widest rounded-full border border-atokirina-400/50 text-atokirina-400 hover:bg-atokirina-400/10 disabled:opacity-50"
          >
            Delete repo
          </button>
        </div>
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
        className="relative z-[110] w-full max-w-md rounded-2xl border border-atokirina-400/30 bg-night-800/95 backdrop-blur-xl shadow-2xl p-6"
      >
        <div className="text-xs uppercase tracking-[0.3em] text-atokirina-400 mb-2">
          ⚠ Delete repo
        </div>
        <div className="text-sm text-bark-300/85">
          This deletes <span className="font-mono text-bark-300">{repo.owner_sub.slice(0, 10)}/{repo.name}</span>
          {" "}and all of its branches, PRs, and stars. It cannot be undone.
        </div>
        <div className="mt-4 text-xs text-bark-300/55">
          Type <span className="font-mono text-atokirina-400">{repo.name}</span> to confirm:
        </div>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={repo.name}
          autoFocus
          className="mt-2 bg-night-900/60 border border-atokirina-400/30 rounded-md px-3 py-2 text-sm text-bark-300/90 w-full font-mono"
        />
        {err && <div className="mt-2 text-xs text-atokirina-400">{err}</div>}
        <div className="mt-5 flex items-center gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={busy}
            className="text-xs uppercase tracking-widest text-bark-300/50 hover:text-bark-300/80 px-2 py-2"
          >
            cancel
          </button>
          <button
            onClick={confirm}
            disabled={busy || typed !== repo.name}
            className="px-4 py-2 text-xs uppercase tracking-widest rounded-full border border-atokirina-400/60 text-atokirina-400 hover:bg-atokirina-400/15 disabled:opacity-40 disabled:cursor-not-allowed"
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
      <div className="text-[11px] uppercase tracking-widest text-bark-300/50 mb-1">{label}</div>
      {children}
    </div>
  );
}

// ── Shell + helpers ──────────────────────────────────────────────

function Shell({ children, me }: { children: React.ReactNode; me?: Me | null }) {
  return (
    <div className="min-h-screen relative">
      <div className="absolute inset-0 starfield opacity-20 pointer-events-none" aria-hidden="true" />
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-soul-400/10">
        <Link to="/" className="text-soul-300 font-display tracking-[0.35em] text-sm">
          <span className="w-1.5 h-1.5 inline-block align-middle rounded-full bg-soul-400 shadow-[0_0_8px_rgba(62,212,193,0.9)] animate-pulse-soul mr-3" />
          xp.io
        </Link>
        <div className="flex items-center gap-6 text-[11px] uppercase tracking-widest">
          {me ? (
            <Link to="/dashboard" className="text-bark-300/70 hover:text-soul-300">dashboard</Link>
          ) : null}
        </div>
      </nav>
      <main className="relative z-10 mx-auto max-w-6xl px-8 py-10">{children}</main>
    </div>
  );
}

function TabLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={`pb-3 text-xs uppercase tracking-widest transition-colors ${
        active ? "text-soul-300 border-b border-soul-400" : "text-bark-300/50 hover:text-bark-300/80"
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
