import { useEffect, useState } from "react";
import { listLoops } from "../api/client";
import { FlaskConical } from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  HEALTHY: "bg-emerald-50 text-emerald-700 border-emerald-200",
  STALE: "bg-amber-50 text-amber-800 border-amber-200",
  DECLINING: "bg-orange-50 text-orange-800 border-orange-200",
  DEAD: "bg-rose-50 text-rose-700 border-rose-200",
};

export function Research() {
  const [loops, setLoops] = useState<any[]>([]);
  const [syncedAt, setSyncedAt] = useState<number | null>(null);

  useEffect(() => {
    listLoops()
      .then((r) => {
        setLoops(r.loops);
        setSyncedAt(r.synced_at);
      })
      .catch(() => setLoops([]));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
        <FlaskConical className="w-5 h-5 text-indigo-600" /> Auto-research
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Your observe → hypothesize → act → analyze → learn loops.{" "}
        {syncedAt
          ? `Last synced ${new Date(syncedAt * 1000).toLocaleString()}.`
          : "Sync state from the local scheduler."}
      </p>

      {loops.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          <div className="font-medium text-slate-700">No loops synced yet</div>
          <div className="mt-2 text-sm">
            Start one:{" "}
            <code className="px-1 bg-slate-100 rounded">/lumid research run AutoResearch-v1 --cycles 1</code>.
            The scheduler pushes state here on each cycle.
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {loops.map((l: any) => {
            const tone = STATUS_STYLE[l.status] ?? "bg-slate-50 text-slate-700 border-slate-200";
            return (
              <div key={l.name} className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-900 truncate">{l.name}</div>
                  <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${tone}`}>
                    {l.status ?? "?"}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500">{l.domain || "—"}</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-slate-500">Cycles</div>
                    <div className="font-semibold text-slate-900">
                      {l.cycles ?? 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Last run</div>
                    <div className="text-slate-900 text-xs">
                      {l.last_run_at
                        ? new Date(l.last_run_at * 1000).toLocaleString()
                        : "never"}
                    </div>
                  </div>
                </div>
                {l.last_outcome && (
                  <div className="mt-3 text-xs text-slate-600 line-clamp-3 bg-slate-50 rounded p-2">
                    {l.last_outcome}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
