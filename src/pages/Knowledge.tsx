import { useEffect, useState } from "react";
import { listAgents, listMemories } from "../api/client";
import { Brain, ChevronRight, Tag } from "lucide-react";

export function Knowledge() {
  const [agents, setAgents] = useState<{ private: any[]; shared: any[] }>({ private: [], shared: [] });
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [mems, setMems] = useState<any[]>([]);
  const [loadingMems, setLoadingMems] = useState(false);

  useEffect(() => {
    listAgents().then(setAgents).catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeAgent) return;
    setLoadingMems(true);
    listMemories(activeAgent, 0, 100)
      .then((r) => setMems(r.memories))
      .finally(() => setLoadingMems(false));
  }, [activeAgent]);

  const allAgents = [
    ...agents.private.map((a: any) => ({ ...a, _scope: "private" })),
    ...agents.shared.map((a: any) => ({ ...a, _scope: "shared" })),
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Brain className="w-4 h-4 text-indigo-600" /> Agents
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Push memories from <code>/lumid xp push-cloud</code>.
        </p>

        {allAgents.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
            No agents synced yet. Run{" "}
            <code className="px-1 bg-slate-100 rounded">/lumid xp push-cloud &lt;agent&gt;</code>{" "}
            in Claude Code.
          </div>
        ) : (
          <div className="mt-3 space-y-1.5">
            {allAgents.map((a: any) => (
              <button
                key={a.agent_id}
                onClick={() => setActiveAgent(a.agent_id)}
                className={`w-full text-left rounded-md border p-3 transition-colors ${
                  activeAgent === a.agent_id
                    ? "border-indigo-300 bg-indigo-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900 truncate">{a.agent_id}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
                <div className="mt-0.5 text-xs text-slate-500 flex items-center gap-2">
                  <span>{a.domain ?? "—"}</span>
                  <span>·</span>
                  <span>{a._scope}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="md:col-span-2">
        {!activeAgent ? (
          <div className="h-full rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            Select an agent to see its memories.
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{activeAgent}</h2>
            <p className="mt-1 text-xs text-slate-500">
              {loadingMems ? "loading…" : `${mems.length} memories`}
            </p>
            <div className="mt-4 space-y-2">
              {mems.map((m: any) => (
                <div
                  key={m.id}
                  className="rounded-md border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 bg-slate-100 text-slate-600">
                      <Tag className="w-3 h-3" /> {m.type ?? "memory"}
                    </span>
                    <span className="text-xs text-slate-400">
                      {m.created_at
                        ? new Date(m.created_at * 1000).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                  {m.title && (
                    <div className="mt-2 font-medium text-slate-900">{m.title}</div>
                  )}
                  <div className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
                    {m.content}
                  </div>
                </div>
              ))}
              {!loadingMems && mems.length === 0 && (
                <div className="rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                  No memories yet.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
