import { useEffect, useMemo, useRef, useState } from "react";
import {
  Link, useLocation, useNavigate, useParams, useSearchParams,
} from "react-router-dom";
import {
  acceptTransfer,
  addDiscussionComment,
  addIssueComment,
  closeIssue,
  reopenIssue,
  addPRComment,
  closeDiscussion,
  closePull,
  createDiscussion,
  createIssue,
  deleteRepo,
  forkRepo,
  getBlob,
  getDiscussion,
  getIssue,
  getPendingTransfer,
  getPull,
  getPullDiff,
  getRepo,
  getTree,
  getWatchers,
  initiateTransfer,
  isUnauthorized,
  listAttestations,
  listBranches,
  listCollaborators,
  listCommits,
  listConsumers,
  listContributors,
  listDiscussions,
  listForks,
  listIssueComments,
  listIssues,
  listPRComments,
  listPulls,
  mergePull,
  openPull,
  patchIssue,
  patchRepo,
  pushCommit,
  removeCollaborator,
  setCollaborator,
  starRepo,
  toggleWatch,
  whoami,
  addSkillToApp,
  getDatasetSchema,
  getDatasetPreview,
  getLineage,
  getLoopMetrics,
  listMyApps,
  type DatasetField,
  type DatasetPreview,
  type DatasetSchema,
  type LineageRecord,
  type MetricPoint,
  type Attestation,
  type Branch,
  type Collaborator,
  type CollaboratorRole,
  type Commit,
  type Consumer,
  type Contributor,
  type Discussion,
  type DiscussionSummary,
  type Issue,
  type IssueComment,
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
import { AuthorBadge } from "../components/AuthorBadge";
import { RepoDeprecationBanner } from "../components/DeprecationBanner";
import { DisagreementMatrixForRepo } from "../components/DisagreementMatrix";

type Tab = "code" | "commits" | "branches" | "issues" | "pulls" | "community"
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
            | "community" | "discussion-detail" | "forks"
            | "issues" | "issue-new" | "issue-detail" =
    pathname === `${prefix}/branches`
      ? "branches"
      : pathname === `${prefix}/commits` || pathname.startsWith(`${prefix}/commits/`)
        ? "commits"
        : pathname === `${prefix}/forks`
          ? "forks"
          : pathname === `${prefix}/issues/new`
            ? "issue-new"
            : pathname === `${prefix}/pulls/new`
              ? "pull-new"
              : pathname.startsWith(`${prefix}/issues/`) && numberParam
                ? "issue-detail"
                : pathname === `${prefix}/issues`
                  ? "issues"
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
        : mode.startsWith("issue")
          ? "issues"
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
      <RepoDeprecationBanner
        owner_sub={repo.owner_sub}
        name={repo.name}
        head_ref={repo.head_ref}
        kind={repo.kind}
      />
      <RepoHeader repo={repo} me={me} isOwner={isOwner} onChange={setRepo} />

      <div className="mt-8 border-b border-gray-200 flex gap-6 overflow-x-auto">
        <TabLink to={`/${enc(owner)}/${enc(name)}`} active={tab === "code"}>Code</TabLink>
        <TabLink to={`/${enc(owner)}/${enc(name)}/commits`} active={tab === "commits"}>Commits</TabLink>
        <TabLink to={`/${enc(owner)}/${enc(name)}/branches`} active={tab === "branches"}>Branches</TabLink>
        <TabLink to={`/${enc(owner)}/${enc(name)}/issues`} active={tab === "issues"}>Issues</TabLink>
        <TabLink to={`/${enc(owner)}/${enc(name)}/pulls`} active={tab === "pulls"}>Pull Requests</TabLink>
        <TabLink to={`/${enc(owner)}/${enc(name)}/community`} active={tab === "community"}>
          {repo.kind === "skill" ? "Consumers" : "Community"}
          {repo.kind === "skill" && (repo.consumers_count ?? 0) > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 text-[10px] text-gray-700 tabular-nums">
              {repo.consumers_count}
            </span>
          )}
        </TabLink>
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
        {mode === "issues" && <IssuesTab repo={repo} me={me} isOwner={isOwner} />}
        {mode === "issue-new" && <IssueNew repo={repo} me={me} />}
        {mode === "issue-detail" && numberParam && (
          <IssueDetail repo={repo} number={Number(numberParam)} me={me} isOwner={isOwner} />
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
        <AuthorBadge owner_sub={repo.owner_sub} size="header" className="ml-1" />
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
          <span
            title="Total installs (incremented by `/lumid app install`)"
            className="px-2.5 py-1 text-xs rounded-md border border-gray-200 text-bark-300 inline-flex items-center"
          >
            <span className="text-soul-400 mr-1">↓</span>
            Installs{" "}
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 text-[10px] text-gray-700 tabular-nums">
              {repo.downloads ?? 0}
            </span>
          </span>
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
          {isOwner && (
            <a
              href={`https://lum.id/auth/account/dashboard?app=${encodeURIComponent(repo.name)}`}
              target="_blank"
              rel="noreferrer"
              title="Open the lum.id authoring dashboard for this app (Phase 3 will swap in an in-place editor)"
              className="px-2.5 py-1 text-xs rounded-md border border-gray-300 text-bark-300 hover:border-soul-400 hover:bg-gray-50 transition-colors"
            >
              <span className="text-soul-400 mr-1">✎</span>
              Edit
            </a>
          )}
          {repo.kind === "app" && (
            <a
              href={`https://lum.id/dashboard/skills/new?app=${encodeURIComponent(repo.name)}`}
              target="_blank"
              rel="noreferrer"
              title="Draft a new skill prefilled to import into this app (sign in to lum.id required)"
              className="px-2.5 py-1 text-xs rounded-md border border-gray-300 text-bark-300 hover:border-soul-400 hover:bg-gray-50 transition-colors"
            >
              <span className="text-soul-400 mr-1">+</span>
              Add skill draft
            </a>
          )}
          {repo.kind === "skill" && (
            <AddToAppButton skillOwner={repo.owner_sub} skillName={repo.name} />
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
      const tryFiles = repo.kind === "skill"
        ? ["manifest.json", "manifest.yaml", "SKILL.md"]
        : repo.kind === "dataset"
          ? ["manifest.json", "manifest.yaml", "dataset.yaml", "xpcloud.yaml"]
          : ["manifest.json", "manifest.yaml", "xpcloud.yaml"];
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

  // Linked refs for kind=app: when the manifest declares datasets[]
  // or skill_imports[], render them as clickable cards below the pill
  // strip so users can click through to the dependency repos. Memory
  // agents from roles[].memory_agent are surfaced as Agentic KG
  // badges — they're local-id references today, but the Browse link
  // takes users to the marketspace's kind=agent + kind=skill view.
  const refLinks: Array<{ label: string; repo: string; version?: string; glyph: string }> = [];
  const memAgents: string[] = [];
  if (repo.kind === "app") {
    for (const d of (manifest.datasets || []) as any[]) {
      if (d?.repo) refLinks.push({
        label: d.id || d.repo, repo: d.repo, version: d.version, glyph: "▤",
      });
    }
    for (const im of (manifest.skill_imports || []) as any[]) {
      if (im?.repo) refLinks.push({
        label: im.repo.split("/").pop() || im.repo,
        repo: im.repo, version: im.version, glyph: "⌘",
      });
    }
    for (const r of (manifest.roles || []) as any[]) {
      const ma = r?.memory_agent;
      if (ma && typeof ma === "string" && !memAgents.includes(ma)) {
        memAgents.push(ma);
      }
    }
  }

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
    if (Array.isArray(manifest.loops)) {
      pills.push(["loops", manifest.loops.length === 1
        ? String((manifest.loops[0] as any)?.name || 1)
        : `${manifest.loops.length} loops`]);
    }
  } else if (repo.kind === "agent") {
    pills.push(["kind", "knowledge bundle"]);
    if (manifest.agent_id) pills.push(["agent", String(manifest.agent_id)]);
    if (manifest.domain) pills.push(["domain", String(manifest.domain)]);
  } else if (repo.kind === "skill") {
    if (manifest.inputs) pills.push(["inputs", Object.keys(manifest.inputs).join(", ")]);
    if (manifest.outputs) pills.push(["outputs", Object.keys(manifest.outputs).join(", ")]);
    if (manifest.language) pills.push(["lang", String(manifest.language)]);
  } else if (repo.kind === "dataset") {
    if (manifest.version) pills.push(["version", String(manifest.version)]);
    if (manifest.schema?.format) pills.push(["format", String(manifest.schema.format)]);
    if (Array.isArray(manifest.schema?.fields) && manifest.schema.fields.length) {
      pills.push(["fields", manifest.schema.fields.slice(0, 6).join(" · ") +
        (manifest.schema.fields.length > 6 ? ` · +${manifest.schema.fields.length - 6}` : "")]);
    }
    if (manifest.size_bytes) {
      const mb = (Number(manifest.size_bytes) / (1024 * 1024)).toFixed(1);
      pills.push(["size", `${mb} MB`]);
    }
    if (manifest.license) pills.push(["license", String(manifest.license)]);
    if (manifest.storage?.inline) pills.push(["storage", "inline (git)"]);
    else if (manifest.storage?.url) pills.push(["storage", "external pointer"]);
  }

  if (pills.length === 0 && refLinks.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      {pills.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px]">
          {pills.map(([k, v]) => (
            <span key={k} className="text-gray-900">
              <span className="text-gray-600 mr-1.5">{k}:</span>
              <span className="font-mono">{v}</span>
            </span>
          ))}
        </div>
      )}
      {(refLinks.length > 0 || memAgents.length > 0) && (
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">
            depends on
          </div>
          <div className="flex flex-wrap gap-2">
            {refLinks.map((r) => {
              const [owner, name] = r.repo.split("/", 2);
              const href = `/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
              return (
                <Link
                  key={`${r.repo}-${r.label}`}
                  to={href}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-gray-200 hover:border-soul-300 transition-colors text-[12px]"
                  title={r.repo + (r.version ? ` @ ${r.version}` : "")}
                >
                  <span>{r.glyph}</span>
                  <span className="font-mono text-gray-900">{r.label}</span>
                  {r.version && (
                    <span className="text-[10px] text-gray-500">@{r.version}</span>
                  )}
                </Link>
              );
            })}
            {memAgents.map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-gray-200 bg-gray-50 text-[12px]"
                title={`Local KG agent — accumulated as cycles run. Browse all published Agentic KG with the link below.`}
              >
                <span>❋</span>
                <span className="font-mono text-gray-900">{a}</span>
              </span>
            ))}
          </div>
          {memAgents.length > 0 && (
            <div className="mt-2 text-[11px] text-gray-500">
              <Link
                to="/?kind=agent"
                className="text-soul-300 hover:text-soul-400 underline-offset-2 hover:underline"
              >
                Browse Agentic KG →
              </Link>{" "}
              to seed these with someone else's accumulated wisdom (kind=agent snapshots).
            </div>
          )}
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

  // Show overview-only sections (consumers, disagreement) when this is
  // the top-level Code view — i.e. no sub-path is being browsed.
  const isOverview = !path;

  return (
    <div className="space-y-6">
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
    {isOverview && repo.kind === "skill" && <LineageSection repo={repo} />}
    {isOverview && repo.kind === "skill" && <TestedWithSection repo={repo} />}
    {isOverview && repo.kind === "skill" && <ConsumersSection repo={repo} />}
    {isOverview && repo.kind === "app" && <LoopMetricsSection repo={repo} />}
    {isOverview && repo.kind === "app" && <DisagreementMatrixForRepo repo={repo} branch={branch} />}
    {isOverview && repo.kind === "dataset" && <DatasetPreviewSection repo={repo} />}
    </div>
  );
}

// ── Tested-with section (kind=skill only) ──────────────────────
//
// Lists every consumer that has declared an attestation against this
// skill (i.e. has run its integration test against one or more
// versions). Distinct from ConsumersSection — that one shows everyone
// who *imports* the skill; this one shows everyone who has actually
// validated their integration. Hidden entirely when there are no
// attestations (empty box would be noise on a fresh skill).
//
// Each row resolves the consumer's display_name via getRepo() so we
// show a friendly label instead of the slug. Failures fall back to
// the slug — no UI error state, just degrade quietly.

type EnrichedAttestation = Attestation & {
  consumer_display_name?: string;
  consumer_owner_sub?: string;
  consumer_name?: string;
};

function TestedWithSection({ repo }: { repo: RepoT }) {
  const [attestations, setAttestations] = useState<EnrichedAttestation[] | null>(null);

  useEffect(() => {
    setAttestations(null);
    let cancelled = false;
    (async () => {
      const raw = await listAttestations(repo.owner_sub, repo.name).catch(() => [] as Attestation[]);
      // Resolve display_name per attestation in parallel. Failures
      // fall through with no display_name; we'll render the slug.
      const enriched = await Promise.all(raw.map(async (a) => {
        const [ownerSub, consumerName] = a.repo.split("/", 2);
        if (!ownerSub || !consumerName) return { ...a } as EnrichedAttestation;
        const cr = await getRepo(ownerSub, consumerName).catch(() => null);
        return {
          ...a,
          consumer_display_name: cr?.display_name,
          consumer_owner_sub: ownerSub,
          consumer_name: consumerName,
        } as EnrichedAttestation;
      }));
      if (!cancelled) setAttestations(enriched);
    })();
    return () => { cancelled = true; };
  }, [repo.owner_sub, repo.name]);

  if (attestations === null) return null;     // suppress flicker while loading
  if (attestations.length === 0) return null; // empty state: hide entirely

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900">
          Tested with {attestations.length} consumer{attestations.length === 1 ? "" : "s"}
        </h2>
        <span className="text-[11px] text-gray-500">
          declared integration attestations
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {attestations.map((a) => (
          <AttestationRow key={a.repo} att={a} />
        ))}
      </ul>
    </div>
  );
}

function AttestationRow({ att }: { att: EnrichedAttestation }) {
  const ownerSub = att.consumer_owner_sub
    || att.repo.split("/", 2)[0]
    || "";
  const consumerName = att.consumer_name
    || att.repo.split("/", 2)[1]
    || att.repo;
  const label = att.consumer_display_name || consumerName;
  const href = ownerSub && consumerName ? `/${enc(ownerSub)}/${enc(consumerName)}` : "#";

  return (
    <li className="rounded-lg border border-gray-200 px-3 py-2 hover:border-soul-300 transition-colors">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            to={href}
            className="text-sm font-medium text-gray-900 hover:text-soul-400 truncate"
            title={att.repo}
          >
            {label}
          </Link>
          <StatusPill status={att.status} />
        </div>
        <div className="text-[11px] text-gray-500 shrink-0" title={att.last_run}>
          {formatRelative(att.last_run)}
        </div>
      </div>
      <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[11px]">
        <span className="text-gray-500 mr-1">tested:</span>
        {att.versions.length === 0 ? (
          <span className="text-gray-400 italic">none</span>
        ) : (
          att.versions.map((v) => (
            <span
              key={v}
              className={`px-1.5 py-0.5 rounded font-mono ${
                v === att.current_version
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "bg-gray-100 text-gray-700"
              }`}
              title={v === att.current_version ? "currently pinned" : undefined}
            >
              {v}
            </span>
          ))
        )}
        {att.is_stale && att.current_version && (
          <span
            className="ml-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 font-mono"
            title={`Currently pinned ${att.current_version} — not in tested list`}
          >
            stale ↑ {att.current_version}
          </span>
        )}
      </div>
    </li>
  );
}

function StatusPill({ status }: { status: Attestation["status"] }) {
  const styles =
    status === "pass" ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
    : status === "fail" ? "bg-rose-100 text-rose-800 border border-rose-200"
    : "bg-gray-100 text-gray-600 border border-gray-200";
  return (
    <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${styles}`}>
      {status}
    </span>
  );
}

// ── Add to app button (kind=skill only) ─────────────────────────

function AddToAppButton({ skillOwner, skillName }: { skillOwner: string; skillName: string }) {
  const [apps, setApps] = useState<RepoT[] | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const toggle = () => {
    if (!open && apps === null) {
      listMyApps().then(setApps).catch(() => setApps([]));
    }
    setOpen((v) => !v);
  };

  const install = async (app: RepoT) => {
    setBusy(app.name);
    try {
      await addSkillToApp(app.owner_sub, app.name, `${skillOwner}/${skillName}`);
      setDone(app.name);
    } catch {
      setDone(null);
    } finally {
      setBusy(null);
      setOpen(false);
    }
  };

  if (done) {
    return (
      <span className="px-2.5 py-1 text-xs rounded-md border border-soul-300 text-soul-400 bg-soul-400/5">
        ✓ Added to {done}
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="px-2.5 py-1 text-xs rounded-md border border-soul-300 text-soul-400 hover:bg-soul-400/5 transition-colors font-medium"
      >
        + Add to app ▾
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
          {apps === null ? (
            <div className="px-3 py-2 text-xs text-gray-500">Loading your apps…</div>
          ) : apps.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-500">No published apps found. Run <code>app_publish</code> first.</div>
          ) : (
            apps.map((app) => (
              <button
                key={app.name}
                disabled={busy === app.name}
                onClick={() => install(app)}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 text-gray-800 disabled:opacity-50 transition-colors"
              >
                {busy === app.name ? "Adding…" : app.display_name || app.name}
              </button>
            ))
          )}
          <div className="border-t border-gray-100 px-3 pt-1.5 pb-1">
            <span className="text-[10px] text-gray-400 font-mono">
              lumid app_add_skill &lt;app&gt; {skillOwner}/{skillName}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Lineage section (community skills) ──────────────────────────

function LineageSection({ repo }: { repo: RepoT }) {
  const [lineage, setLineage] = useState<LineageRecord | null | undefined>(undefined);

  useEffect(() => {
    setLineage(undefined);
    getLineage(repo.owner_sub, repo.name).then(setLineage);
  }, [repo.owner_sub, repo.name]);

  if (lineage === undefined) return null;  // loading
  if (!lineage) return null;               // no lineage record

  const healthColor = {
    green: "text-emerald-600",
    yellow: "text-yellow-600",
    red: "text-red-500",
    unknown: "text-gray-400",
  }[lineage.upstream_health ?? "unknown"];

  const healthDot = {
    green: "🟢", yellow: "🟡", red: "🔴", unknown: "⚪",
  }[lineage.upstream_health ?? "unknown"];

  const adapterBadge: Record<string, string> = {
    generated: "bg-blue-50 text-blue-600 border-blue-200",
    verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
    broken: "bg-red-50 text-red-600 border-red-200",
    stale: "bg-yellow-50 text-yellow-700 border-yellow-200",
    deprecated: "bg-gray-100 text-gray-500 border-gray-200",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-3">Lineage</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
        {lineage.source && (
          <>
            <dt className="text-gray-500">Source</dt>
            <dd className="text-gray-900 font-mono">{lineage.source}</dd>
          </>
        )}
        {lineage.source_url && (
          <>
            <dt className="text-gray-500">Upstream</dt>
            <dd>
              <a href={lineage.source_url} target="_blank" rel="noreferrer"
                 className="text-soul-400 hover:underline font-mono truncate block max-w-xs">
                {lineage.source_url.replace(/^https?:\/\//, "")}
              </a>
            </dd>
          </>
        )}
        {lineage.upstream_health && (
          <>
            <dt className="text-gray-500">Health</dt>
            <dd className={`font-medium ${healthColor}`}>{healthDot} {lineage.upstream_health}</dd>
          </>
        )}
        {lineage.adapter_status && (
          <>
            <dt className="text-gray-500">Adapter</dt>
            <dd>
              <span className={`px-1.5 py-0.5 rounded border text-[10px] uppercase tracking-wide ${adapterBadge[lineage.adapter_status] ?? ""}`}>
                {lineage.adapter_status}
              </span>
            </dd>
          </>
        )}
        {lineage.trust_score != null && (
          <>
            <dt className="text-gray-500">Trust score</dt>
            <dd className="tabular-nums">{(lineage.trust_score * 100).toFixed(0)}%</dd>
          </>
        )}
        {lineage.scraped_at && (
          <>
            <dt className="text-gray-500">Scraped</dt>
            <dd className="text-gray-600">{new Date(lineage.scraped_at * 1000).toLocaleDateString()}</dd>
          </>
        )}
      </dl>
    </div>
  );
}

// ── Consumers section (kind=skill only) ─────────────────────────
//
// ── Loop metrics spark lines (kind=app, Stage 2-C) ─────────────────

function LoopMetricsSection({ repo }: { repo: RepoT }) {
  const [metrics, setMetrics] = useState<MetricPoint[] | null>(null);

  useEffect(() => {
    setMetrics(null);
    getLoopMetrics(repo.owner_sub, repo.name)
      .then((pts) => setMetrics(pts))
      .catch(() => setMetrics([]));
  }, [repo.owner_sub, repo.name]);

  if (!metrics || metrics.length === 0) return null;

  // Group by metric name
  const byMetric = new Map<string, MetricPoint[]>();
  for (const pt of metrics) {
    const key = pt.metric;
    if (!byMetric.has(key)) byMetric.set(key, []);
    byMetric.get(key)!.push(pt);
  }

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Loop Metrics</span>
      </div>
      <div className="px-4 py-3 space-y-3">
        {Array.from(byMetric.entries()).map(([name, pts]) => {
          const sorted = [...pts].sort((a, b) => a.ts - b.ts);
          const values = sorted.map((p) => p.value);
          const min = Math.min(...values);
          const max = Math.max(...values);
          const range = max - min || 1;
          const latest = values[values.length - 1];
          const prev = values.length > 1 ? values[values.length - 2] : null;
          const trend = prev != null ? (latest > prev ? "↑" : latest < prev ? "↓" : "→") : "";

          // SVG spark line
          const W = 120, H = 28;
          const pts_svg = values.map((v, i) => {
            const x = values.length === 1 ? W / 2 : (i / (values.length - 1)) * W;
            const y = H - ((v - min) / range) * (H - 4) - 2;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          }).join(" ");

          return (
            <div key={name} className="flex items-center gap-3">
              <div className="text-xs font-mono text-gray-600 w-28 truncate">{name}</div>
              <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="shrink-0">
                <polyline
                  points={pts_svg}
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-xs font-mono text-indigo-600 font-medium">
                {latest.toFixed(3)}{" "}
                <span className={trend === "↑" ? "text-emerald-500" : trend === "↓" ? "text-red-400" : "text-gray-400"}>
                  {trend}
                </span>
              </div>
              <div className="text-[10px] text-gray-400">{sorted.length} pts</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Dataset preview panel (kind=dataset, Stage 2-D) ────────────
//
// Shows schema fields (name + type) and a scrollable preview table
// with the first 10 rows from the primary data file. Rendered only
// in the Overview tab; hidden until data loads, silently empty on
// errors (dataset repos are optional — not every kind=dataset has
// committed JSONL files).

function DatasetPreviewSection({ repo }: { repo: RepoT }) {
  const [schema, setSchema] = useState<DatasetSchema | null>(null);
  const [preview, setPreview] = useState<DatasetPreview | null>(null);

  useEffect(() => {
    setSchema(null);
    setPreview(null);
    Promise.all([
      getDatasetSchema(repo.owner_sub, repo.name),
      getDatasetPreview(repo.owner_sub, repo.name),
    ]).then(([s, p]) => {
      setSchema(s);
      setPreview(p);
    }).catch(() => {
      setSchema({ fields: [] });
      setPreview({ rows: [], columns: [], total_rows: 0 });
    });
  }, [repo.owner_sub, repo.name]);

  if (!schema && !preview) return null;

  const hasSchema = schema && schema.fields.length > 0;
  const hasPreview = preview && preview.rows.length > 0;

  if (!hasSchema && !hasPreview) return null;

  const cols = (preview?.columns?.length ? preview.columns : schema?.fields.map((f) => f.name)) ?? [];

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Dataset</span>
        <div className="flex items-center gap-3 text-[11px] text-gray-500">
          {schema?.format && <span className="px-1.5 py-0.5 rounded bg-gray-100 font-mono">{schema.format}</span>}
          {schema?.row_count != null && <span>{schema.row_count.toLocaleString()} rows</span>}
          {schema?.source_file && <span className="font-mono truncate max-w-[140px]">{schema.source_file}</span>}
        </div>
      </div>

      {hasSchema && (
        <div className="px-4 pt-3 pb-2">
          <div className="text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Schema</div>
          <div className="flex flex-wrap gap-1.5">
            {schema!.fields.map((f: DatasetField) => (
              <span key={f.name}
                className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-mono">
                <span className="text-gray-800">{f.name}</span>
                {f.type && <span className="text-gray-400">{f.type}</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasPreview && cols.length > 0 && (
        <div className="px-4 pb-3 pt-2 overflow-x-auto">
          <div className="text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
            Preview — {preview!.rows.length} of {preview!.total_rows.toLocaleString()} rows
          </div>
          <table className="min-w-full text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                {cols.map((c) => (
                  <th key={c} className="px-2 py-1 text-left font-semibold text-gray-500 whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview!.rows.map((row, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  {cols.map((c) => {
                    const v = row[c];
                    const display = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
                    return (
                      <td key={c} className="px-2 py-1 text-gray-700 font-mono max-w-[200px] truncate" title={display}>
                        {display}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Reverse-resolves who imports this skill via the public
// `/repos/{o}/{n}/consumers` endpoint. Hidden silently while loading
// and on errors; the empty state still renders so authors get
// affirmative feedback that nobody has wired their skill in yet.

function ConsumersSection({ repo }: { repo: RepoT }) {
  const [consumers, setConsumers] = useState<Consumer[] | null>(null);

  useEffect(() => {
    setConsumers(null);
    listConsumers(repo.owner_sub, repo.name)
      .then(setConsumers)
      .catch(() => setConsumers([]));
  }, [repo.owner_sub, repo.name]);

  if (consumers === null) return null;  // suppress flicker while loading

  const count = consumers.length;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900">
          Consumed by {count} app{count === 1 ? "" : "s"}
        </h2>
        <span className="text-[11px] text-gray-500">
          public apps that import this skill
        </span>
      </div>
      {count === 0 ? (
        <div className="text-sm text-gray-500">No public consumers yet.</div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {consumers.map((c) => {
            const slug = `${c.owner_sub}/${c.name}`;
            return (
              <li key={slug}>
                <Link
                  to={`/${enc(c.owner_sub)}/${enc(c.name)}`}
                  className="block rounded-lg border border-gray-200 hover:border-soul-300 transition-colors px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      <span className="text-soul-400/60 mr-1">
                        {KIND_GLYPH[c.kind] || "◦"}
                      </span>
                      {c.display_name || c.name}
                    </span>
                    {c.version && (
                      <span className="text-[10px] text-gray-500 font-mono shrink-0">
                        @{c.version}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] text-gray-500 font-mono truncate">
                    {c.kind} · {slug}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
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

// ── Issues tab ───────────────────────────────────────────────────

function IssuesTab({
  repo, me, isOwner,
}: { repo: RepoT; me: Me | null; isOwner: boolean }) {
  const nav = useNavigate();
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [state, setState] = useState<"open" | "closed" | "all">("open");

  useEffect(() => {
    listIssues(repo.owner_sub, repo.name, state)
      .then(setIssues)
      .catch(() => setIssues([]));
  }, [repo.owner_sub, repo.name, state]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-4 text-xs">
          {(["open", "closed", "all"] as const).map((s) => (
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
        {(isOwner || !!me) && (
          <button
            onClick={() => nav(`/${enc(repo.owner_sub)}/${enc(repo.name)}/issues/new`)}
            className="px-3 py-1.5 text-xs rounded-full border border-gray-300 text-soul-300 hover:text-soul-400 hover:border-soul-400"
          >
            + new issue
          </button>
        )}
      </div>
      {issues === null ? (
        <div className="text-sm text-gray-500 py-10 text-center">loading…</div>
      ) : issues.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
          <div className="text-2xl text-gray-300 mb-2">◉</div>
          <div className="text-sm text-gray-500">No {state === "all" ? "" : state + " "}issues yet.</div>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {issues.map((iss) => (
            <li key={iss.number}>
              <Link
                to={`/${enc(repo.owner_sub)}/${enc(repo.name)}/issues/${iss.number}`}
                className="flex items-start justify-between gap-4 border border-gray-200 rounded-lg px-4 py-3 hover:border-gray-300 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-gray-400 text-xs">#{iss.number}</span>
                    <span className="text-sm text-gray-900 hover:text-soul-300 truncate">{iss.title}</span>
                    {iss.labels.map((lbl) => (
                      <span
                        key={lbl}
                        className="text-[10px] tracking-wider uppercase border rounded px-1.5 py-0.5 bg-soul-400/10 text-soul-300 border-soul-300/30"
                      >
                        {lbl}
                      </span>
                    ))}
                  </div>
                  <div className="mt-0.5 text-[11px] text-gray-500">
                    opened by <span className="font-mono">{iss.author_sub.slice(0, 10)}</span>
                    {" · "}{relTime(iss.opened_at)}
                    {iss.comment_count > 0 && (
                      <span className="ml-2">· {iss.comment_count} comment{iss.comment_count !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 pt-0.5">
                  <IssueBadge state={iss.state} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── New issue form ────────────────────────────────────────────────

function IssueNew({ repo, me }: { repo: RepoT; me: Me | null }) {
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (!me) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 p-6 text-sm text-gray-700">
        Sign in to open an issue.{" "}
        <button
          onClick={async () => { const { beginLogin } = await import("../lib/pkce"); beginLogin(); }}
          className="text-soul-300 hover:text-soul-400"
        >
          Sign in →
        </button>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const iss = await createIssue(repo.owner_sub, repo.name, { title: title.trim(), body });
      nav(`/${enc(repo.owner_sub)}/${enc(repo.name)}/issues/${iss.number}`);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "failed to open issue");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-4">
      <div className="text-sm text-gray-700 mb-2">Open a new issue</div>

      <Field label="Title">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Short, descriptive title"
          className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 w-full"
        />
      </Field>

      <Field label="Description">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          placeholder="Describe the issue (markdown)"
          className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 w-full font-mono"
        />
      </Field>

      {err && <div className="text-xs text-atokirina-400">{err}</div>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="px-4 py-2 text-xs rounded-full border border-gray-300 text-soul-300 hover:text-soul-400 hover:border-soul-400 disabled:opacity-50"
        >
          {busy ? "opening…" : "◉ open issue"}
        </button>
        <Link
          to={`/${enc(repo.owner_sub)}/${enc(repo.name)}/issues`}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          cancel
        </Link>
      </div>
    </form>
  );
}

// ── Issue detail ──────────────────────────────────────────────────

function IssueDetail({
  repo, number, me, isOwner,
}: { repo: RepoT; number: number; me: Me | null; isOwner: boolean }) {
  const [issue, setIssue] = useState<Issue | null | "missing">(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const reload = async () => {
    try {
      const iss = await getIssue(repo.owner_sub, repo.name, number);
      setIssue(iss);
    } catch {
      setIssue("missing");
    }
  };
  useEffect(() => { reload(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [repo.owner_sub, repo.name, number]);

  if (issue === null) return <div className="text-sm text-gray-500 py-10 text-center">loading…</div>;
  if (issue === "missing") return <div className="text-sm text-gray-500 py-10 text-center">Issue not found</div>;

  const canAct = isOwner || (!!me && me.sub === issue.author_sub);

  const startEdit = () => {
    setEditTitle(issue.title);
    setEditBody(issue.body);
    setEditing(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    setBusy(true);
    setErr("");
    try {
      const updated = await patchIssue(repo.owner_sub, repo.name, number, {
        title: editTitle.trim(), body: editBody,
      });
      setIssue(updated);
      setEditing(false);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "save failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleState = async () => {
    setBusy(true);
    setErr("");
    try {
      const fn = issue.state === "open" ? closeIssue : reopenIssue;
      const updated = await fn(repo.owner_sub, repo.name, number);
      setIssue(updated);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {/* Back link */}
      <div className="text-xs text-gray-500 mb-4">
        <Link to={`/${enc(repo.owner_sub)}/${enc(repo.name)}/issues`} className="hover:text-soul-300">
          ← back to issues
        </Link>
      </div>

      {editing ? (
        <form onSubmit={saveEdit} className="max-w-2xl space-y-3 mb-6">
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
            className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 w-full font-semibold"
          />
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={6}
            className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 w-full font-mono"
          />
          {err && <div className="text-xs text-atokirina-400">{err}</div>}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={busy || !editTitle.trim()}
              className="px-3 py-1.5 text-xs rounded-full border border-gray-300 text-soul-300 hover:border-soul-400 disabled:opacity-50"
            >
              {busy ? "saving…" : "save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-bark-300">
              <span className="text-gray-500 mr-2">#{issue.number}</span>
              {issue.title}
            </h2>
            <div className="mt-1 text-xs text-gray-600 flex items-center gap-3 flex-wrap">
              <IssueBadge state={issue.state} />
              <span>
                opened by{" "}
                <span className="font-mono text-gray-900">{issue.author_sub.slice(0, 10)}</span>
              </span>
              <span>{relTime(issue.opened_at)}</span>
              {issue.labels.map((lbl) => (
                <span
                  key={lbl}
                  className="text-[10px] tracking-wider uppercase border rounded px-1.5 py-0.5 bg-soul-400/10 text-soul-300 border-soul-300/30"
                >
                  {lbl}
                </span>
              ))}
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {canAct && (
              <button
                onClick={startEdit}
                className="px-3 py-1.5 text-xs rounded-full border border-gray-300 text-bark-300 hover:border-gray-400"
              >
                edit
              </button>
            )}
            {canAct && (
              <button
                onClick={toggleState}
                disabled={busy}
                className={`px-3 py-1.5 text-xs rounded-full border disabled:opacity-50 ${
                  issue.state === "open"
                    ? "border-atokirina-400/40 text-atokirina-400 hover:bg-atokirina-400/10"
                    : "border-soul-300/40 text-soul-300 hover:bg-soul-400/10"
                }`}
              >
                {busy ? "…" : issue.state === "open" ? "close" : "reopen"}
              </button>
            )}
          </div>
        </div>
      )}

      {err && !editing && <div className="mb-3 text-xs text-atokirina-400">{err}</div>}

      {issue.body && !editing && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 mb-2">
          <pre className="text-sm text-gray-900/90 whitespace-pre-wrap font-sans leading-relaxed">{issue.body}</pre>
        </div>
      )}

      <IssueCommentsBlock repo={repo} number={number} me={me} />
    </div>
  );
}

function IssueBadge({ state }: { state: Issue["state"] }) {
  const cls = state === "open"
    ? "bg-soul-400/15 text-soul-300 border-soul-300/30"
    : "bg-gray-200 text-gray-500 border-gray-300/30";
  return (
    <span className={`text-[10px] tracking-wider uppercase border rounded px-1.5 py-0.5 ${cls}`}>
      {state}
    </span>
  );
}

function IssueCommentsBlock({
  repo, number, me,
}: { repo: RepoT; number: number; me: Me | null }) {
  const [comments, setComments] = useState<IssueComment[] | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = () => {
    listIssueComments(repo.owner_sub, repo.name, number)
      .then(setComments)
      .catch(() => setComments([]));
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
      await addIssueComment(repo.owner_sub, repo.name, number, body);
      setBody("");
      reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="text-xs text-gray-600 mb-3">
        Comments {comments?.length ? `(${comments.length})` : ""}
      </div>
      {!comments ? (
        <div className="text-sm text-gray-500">loading…</div>
      ) : comments.length === 0 ? (
        <div className="text-sm text-gray-500 italic">No comments yet.</div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-[11px] text-gray-600 mb-2 flex items-center gap-2">
                <span className="font-mono text-gray-900">{c.author_sub.slice(0, 10)}</span>
                <span>{relTime(c.created_at)}</span>
              </div>
              <pre className="text-sm text-gray-900/90 whitespace-pre-wrap font-sans leading-relaxed">{c.body}</pre>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={onSubmit} className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="leave a comment"
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
          <a
            href="https://lum.id"
            className="text-gray-500 hover:text-soul-300 transition-colors"
            title="The Lumid ecosystem — xp.io is the marketspace tier"
          >
            ← lum.id
          </a>
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

// ── Attestations table (kind=skill, Community tab) ───────────────

function AttestationsTable({ repo }: { repo: RepoT }) {
  type EnrichedAtt = Attestation & { _consumer_name?: string };
  const [atts, setAtts] = useState<EnrichedAtt[] | null>(null);

  useEffect(() => {
    setAtts(null);
    listAttestations(repo.owner_sub, repo.name)
      .then((raw) => setAtts(raw as EnrichedAtt[]))
      .catch(() => setAtts([]));
  }, [repo.owner_sub, repo.name]);

  if (!atts || atts.length === 0) return null;

  // Aggregate by consumer: most recent per consumer
  const byConsumer = new Map<string, EnrichedAtt>();
  for (const a of atts) {
    const key = `${a.consumer_owner}/${a.consumer_name}`;
    const prev = byConsumer.get(key);
    if (!prev || (a.attested_at || "") > (prev.attested_at || "")) {
      byConsumer.set(key, a);
    }
  }
  const rows = [...byConsumer.values()].sort((a, b) =>
    (b.attested_at || "").localeCompare(a.attested_at || ""));

  const total = rows.length;
  const passing = rows.filter((r) => r.status === "pass").length;
  const successRate = total > 0 ? Math.round((passing / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden mb-6">
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Attestations</span>
        <span className="text-xs text-gray-500">
          {passing}/{total} passing · {successRate}% success
        </span>
      </div>
      <table className="min-w-full text-[12px]">
        <thead>
          <tr className="border-b border-gray-100 text-gray-500">
            <th className="px-4 py-2 text-left font-medium">Consumer</th>
            <th className="px-4 py-2 text-left font-medium">Skill version</th>
            <th className="px-4 py-2 text-left font-medium">Status</th>
            <th className="px-4 py-2 text-left font-medium">When</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a, i) => {
            const slug = `${a.consumer_owner}/${a.consumer_name}`;
            return (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link to={`/${enc(a.consumer_owner)}/${enc(a.consumer_name)}`}
                    className="text-soul-500 hover:underline font-mono text-[11px]">
                    {a.consumer_name || slug}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-600 font-mono">{a.skill_version || "—"}</td>
                <td className="px-4 py-2">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    a.status === "pass"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : a.status === "fail"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-gray-50 text-gray-600 border border-gray-200"
                  }`}>{a.status || "unknown"}</span>
                </td>
                <td className="px-4 py-2 text-gray-500">{relTime(a.attested_at || "")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

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
        {/* Skill-specific: Consumers + Attestations at the top */}
        {repo.kind === "skill" && <ConsumersSection repo={repo} />}
        {repo.kind === "skill" && <AttestationsTable repo={repo} />}

        {discussions === null ? (
          <div className="py-10 text-center text-gray-500 text-sm">loading…</div>
        ) : discussions.length === 0 ? (
          <div className={`py-10 text-center text-gray-500 text-sm ${repo.kind === "skill" ? "mt-6" : ""}`}>
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
