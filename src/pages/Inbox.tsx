import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client";

type InboxMessage = {
  id: string;
  app: string;
  loop: string;
  kind: string;
  payload: Record<string, unknown>;
  posted_at: number;
  seen_at: number | null;
};

type MessagesResp = {
  messages: InboxMessage[];
  total: number;
  unread: number;
};

function fmtAge(posted_at: number): string {
  const secs = Math.floor(Date.now() / 1000 - posted_at);
  if (secs < 120) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function appGlyph(app: string): string {
  if (app.includes("ops")) return "◈";
  if (app.includes("quant") || app.includes("trading")) return "◆";
  if (app.includes("agent") || app.includes("personal")) return "❋";
  if (app.includes("mbb")) return "⁂";
  return "◉";
}

function appDot(app: string): string {
  if (app.includes("ops")) return "bg-orange-400";
  if (app.includes("quant") || app.includes("trading")) return "bg-soul-400";
  if (app.includes("agent") || app.includes("personal")) return "bg-atokirina-400";
  if (app.includes("mbb")) return "bg-spirit-400";
  return "bg-bark-400";
}

function DecisionBadge({ kind }: { kind: string }) {
  const color =
    kind.includes("crit") || kind.includes("down") || kind.includes("fail")
      ? "bg-red-500/15 text-red-400 border-red-400/30"
      : kind.includes("stale") || kind.includes("warn")
      ? "bg-orange-400/15 text-orange-300 border-orange-300/30"
      : "bg-soul-400/15 text-soul-300 border-soul-300/30";
  return (
    <span
      className={`inline-block text-[10px] tracking-wider uppercase border rounded px-1.5 py-0.5 ${color}`}
    >
      {kind}
    </span>
  );
}

function PayloadView({ payload, app }: { payload: Record<string, unknown>; app: string }) {
  const decisions = payload.decisions as Array<{ kind: string; reason: string }> | undefined;
  const byKind = payload.by_kind as Record<string, number> | undefined;
  const suggestions = payload.suggestions as string[] | undefined;
  const certExpiring = payload.cert_expiring as Record<string, number> | undefined;
  const backupStale = payload.backup_stale as Record<string, number> | undefined;
  const apiProbesFailed = payload.api_probes_failed as string[] | undefined;
  const flags = payload.flags as string[] | undefined;
  const draftsPending = payload.drafts_pending as Array<{ draft_id: string; skill_id: string }> | undefined;
  const decisionsToday = payload.decisions_today as number | undefined;

  const lines: React.ReactNode[] = [];

  // ops-style cycle summary
  if (typeof decisionsToday === "number") {
    lines.push(
      <div key="dt" className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">decisions today</span>
        <span className={`font-medium ${decisionsToday > 0 ? "text-orange-300" : "text-soul-300"}`}>
          {decisionsToday}
        </span>
        {byKind &&
          Object.entries(byKind).map(([k, n]) => (
            <span key={k} className="flex items-center gap-1">
              <DecisionBadge kind={k} />
              <span className="text-xs text-gray-600">×{n}</span>
            </span>
          ))}
      </div>
    );
  }

  if (certExpiring && Object.keys(certExpiring).length > 0) {
    lines.push(
      <div key="cert" className="text-sm text-orange-300">
        ⏰ Certs expiring:{" "}
        {Object.entries(certExpiring)
          .map(([d, n]) => `${d} (${n}d)`)
          .join(", ")}
      </div>
    );
  }

  if (backupStale && Object.keys(backupStale).length > 0) {
    lines.push(
      <div key="bk" className="text-sm text-orange-300">
        🔥 Stale backups:{" "}
        {Object.entries(backupStale)
          .map(([j, h]) => `${j} (${Math.round(h)}h)`)
          .join(", ")}
      </div>
    );
  }

  if (apiProbesFailed && apiProbesFailed.length > 0) {
    lines.push(
      <div key="api" className="text-sm text-red-400">
        ✗ API probes failed: {apiProbesFailed.join(", ")}
      </div>
    );
  }

  if (decisions && decisions.length > 0) {
    lines.push(
      <ul key="dec" className="mt-1 space-y-0.5">
        {decisions.slice(0, 5).map((d, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
            <DecisionBadge kind={d.kind} />
            <span className="leading-relaxed">{d.reason}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (flags && flags.length > 0) {
    lines.push(
      <ul key="fl" className="mt-1 space-y-0.5">
        {flags.map((f, i) => (
          <li key={i} className="text-xs text-orange-300">
            ⚑ {f}
          </li>
        ))}
      </ul>
    );
  }

  if (draftsPending && draftsPending.length > 0) {
    lines.push(
      <div key="dp" className="text-sm text-atokirina-300">
        📝 {draftsPending.length} draft(s) pending review
      </div>
    );
  }

  if (suggestions && suggestions.length > 0) {
    lines.push(
      <details key="sug" className="mt-1">
        <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-400">
          {suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""}
        </summary>
        <ul className="mt-1 space-y-0.5 pl-3">
          {suggestions.map((s, i) => (
            <li key={i} className="text-xs text-gray-600">
              → {s}
            </li>
          ))}
        </ul>
      </details>
    );
  }

  // brief / step_recap (personal-agent, auto-quant)
  const stepRecap = payload.step_recap as Array<{ step_id: string; recap: string }> | undefined;
  if (stepRecap && stepRecap.length > 0) {
    lines.push(
      <ul key="sr" className="mt-1 space-y-0.5">
        {stepRecap.map((s, i) => (
          <li key={i} className="text-xs text-gray-600">
            <span className="text-soul-300/70">{s.step_id}</span>{" "}
            <span>{s.recap}</span>
          </li>
        ))}
      </ul>
    );
  }

  const recap = payload.recap as string | undefined;
  if (recap) {
    lines.push(
      <p key="rc" className="text-sm text-gray-600">
        {recap}
      </p>
    );
  }

  if (lines.length === 0) {
    lines.push(
      <p key="raw" className="text-xs text-gray-600 font-mono">
        {JSON.stringify(payload).slice(0, 200)}
      </p>
    );
  }

  return <div className="space-y-1">{lines}</div>;
}

function MessageCard({
  msg,
  onSeen,
  onDelete,
}: {
  msg: InboxMessage;
  onSeen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const unread = !msg.seen_at;

  const handleClick = () => {
    if (unread) onSeen(msg.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(msg.id);
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative rounded-xl border transition-all cursor-pointer ${
        unread
          ? "border-soul-400/30 bg-gray-50 hover:border-soul-400/50"
          : "border-gray-200 bg-gray-50/50 hover:border-gray-300"
      }`}
    >
      {unread && (
        <span className="absolute top-3.5 right-4 w-1.5 h-1.5 rounded-full bg-soul-400 animate-pulse-soul" />
      )}
      <button
        onClick={handleDelete}
        className="absolute top-2.5 right-8 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400 text-xs px-1"
        title="Delete"
      >
        ✕
      </button>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 text-lg ${appDot(msg.app).replace("bg-", "text-")}`}>
            {appGlyph(msg.app)}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-bark-300 text-sm">{msg.app}</span>
              <span className="text-gray-400 text-xs">/</span>
              <span className="text-gray-600 text-xs">{msg.loop}</span>
              <span className="ml-auto text-[10px] text-gray-400 shrink-0">
                {fmtAge(msg.posted_at)}
              </span>
            </div>
            <div className="mt-2">
              <PayloadView payload={msg.payload} app={msg.app} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InboxPage() {
  const [data, setData] = useState<MessagesResp | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("unread");
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (filter === "unread") params.set("unread_only", "true");
      const r = await api.get(`/api/v1/inbox/messages?${params}`);
      setData(r.data);
    } catch {
      setData({ messages: [], total: 0, unread: 0 });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const markSeen = useCallback(
    async (id: string) => {
      try {
        await api.post(`/api/v1/inbox/${id}/seen`);
        setData((prev) =>
          prev
            ? {
                ...prev,
                messages: prev.messages.map((m) =>
                  m.id === id ? { ...m, seen_at: Date.now() / 1000 } : m
                ),
                unread: Math.max(0, prev.unread - 1),
              }
            : prev
        );
      } catch {
        // ignore
      }
    },
    []
  );

  const markAllSeen = useCallback(async () => {
    if (!data) return;
    const unseen = data.messages.filter((m) => !m.seen_at);
    await Promise.all(unseen.map((m) => api.post(`/api/v1/inbox/${m.id}/seen`).catch(() => {})));
    setData((prev) =>
      prev
        ? {
            ...prev,
            messages: prev.messages.map((m) => ({ ...m, seen_at: m.seen_at ?? Date.now() / 1000 })),
            unread: 0,
          }
        : prev
    );
  }, [data]);

  const deleteMessage = useCallback(
    async (id: string) => {
      try {
        await api.delete(`/api/v1/inbox/${id}`);
        setData((prev) => {
          if (!prev) return prev;
          const msg = prev.messages.find((m) => m.id === id);
          return {
            ...prev,
            messages: prev.messages.filter((m) => m.id !== id),
            total: Math.max(0, prev.total - 1),
            unread: msg && !msg.seen_at ? Math.max(0, prev.unread - 1) : prev.unread,
          };
        });
      } catch {
        // ignore
      }
    },
    []
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl tracking-wide text-bark-300">Inbox</h1>
          {data && data.unread > 0 && (
            <span className="text-xs font-medium bg-soul-400/20 text-soul-300 border border-soul-400/30 rounded-full px-2 py-0.5">
              {data.unread} unread
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {(["unread", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 uppercase tracking-wider transition-colors ${
                  filter === f
                    ? "bg-soul-400/15 text-soul-300"
                    : "text-gray-600 hover:text-bark-300"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          {data && data.unread > 0 && (
            <button
              onClick={markAllSeen}
              className="text-xs text-gray-500 hover:text-bark-300 transition-colors px-2 py-1.5"
            >
              mark all read
            </button>
          )}
          <button
            onClick={fetch}
            className="text-xs text-gray-500 hover:text-soul-300 transition-colors px-2 py-1.5"
          >
            ↻ refresh
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="py-16 text-center text-soul-400/50 font-soft text-sm">
            reading the stream…
          </div>
        ) : !data || data.messages.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <div className="text-soul-400/40 font-display text-4xl">◉</div>
            <p className="text-sm text-gray-500">
              {filter === "unread"
                ? "No unread messages. All loops are quiet."
                : "No messages yet. Enable inbox_publish in your app's xpcloud.yaml."}
            </p>
          </div>
        ) : (
          data.messages.map((m) => (
            <MessageCard key={m.id} msg={m} onSeen={markSeen} onDelete={deleteMessage} />
          ))
        )}
      </div>
    </div>
  );
}
