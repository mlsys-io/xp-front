import { useEffect, useState } from "react";
import { listLoops } from "../api/client";

const STATUS_STYLE: Record<string, { dot: string; label: string; text: string }> = {
  HEALTHY:    { dot: "bg-soul-400",      label: "bg-soul-400/15 border-soul-400/30 text-soul-300",        text: "healthy" },
  STALE:      { dot: "bg-bark-400",      label: "bg-bark-400/10 border-bark-400/30 text-bark-300",        text: "stale" },
  DECLINING:  { dot: "bg-atokirina-400", label: "bg-atokirina-400/15 border-atokirina-400/30 text-atokirina-400", text: "declining" },
  DEAD:       { dot: "bg-night-600",     label: "bg-night-600/40 border-night-500/40 text-bark-300/50",   text: "dead" },
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
      <div className="pb-6 border-b border-soul-400/10">
        <div className="text-[10px] uppercase tracking-[0.4em] text-soul-300/70">
          — the loops that keep learning —
        </div>
        <h1 className="mt-2 font-display text-4xl tracking-wide text-bark-300">
          Auto-research
        </h1>
        <p className="mt-2 text-sm text-bark-300/50">
          {syncedAt
            ? `last heard from the scheduler ${new Date(syncedAt * 1000).toLocaleString()}`
            : "waiting for the scheduler to push state"}
        </p>
      </div>

      {loops.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-soul-400/25 bg-night-800/40 backdrop-blur p-10 text-center">
          <div className="font-display text-3xl text-soul-300/50">⋯</div>
          <div className="mt-3 font-display tracking-widest uppercase text-xs text-bark-300/70">
            no loops reporting in yet
          </div>
          <div className="mt-3 text-bark-300/60 text-sm max-w-md mx-auto leading-relaxed">
            Start one:{" "}
            <code className="rounded bg-night-900/80 px-1.5 py-0.5 text-soul-300 text-[13px]">
              /lumid research run AutoResearch-v1 --cycles 1
            </code>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
          {loops.map((l: any) => {
            const status = STATUS_STYLE[l.status] ?? STATUS_STYLE.STALE;
            return (
              <div
                key={l.name}
                className="relative rounded-2xl border border-soul-400/15 bg-night-800/50 backdrop-blur p-6 overflow-hidden"
              >
                <div className="absolute -top-20 -left-20 w-48 h-48 rounded-full bg-soul-400/10 blur-3xl pointer-events-none" />
                <div className="relative flex items-center justify-between">
                  <div className="font-display text-lg tracking-wide text-bark-300 truncate">
                    {l.name}
                  </div>
                  <span className={`text-[10px] font-medium uppercase tracking-widest rounded-full border px-2.5 py-0.5 inline-flex items-center gap-1.5 ${status.label}`}>
                    <span className={`w-1 h-1 rounded-full ${status.dot} animate-pulse-soul`} />
                    {status.text}
                  </span>
                </div>
                <div className="relative mt-1 text-xs uppercase tracking-widest text-bark-300/50">
                  {l.domain || "—"}
                </div>

                <div className="relative mt-5 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-bark-300/50">
                      cycles
                    </div>
                    <div className="mt-1 font-display text-2xl text-bark-300">
                      {l.cycles ?? 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-bark-300/50">
                      last pulse
                    </div>
                    <div className="mt-1 text-[13px] text-bark-300/90">
                      {l.last_run_at
                        ? new Date(l.last_run_at * 1000).toLocaleString()
                        : "never"}
                    </div>
                  </div>
                </div>

                {l.last_outcome && (
                  <div className="relative mt-4 text-xs text-bark-300/70 leading-relaxed bg-night-900/60 rounded-lg p-3 border border-soul-400/10 line-clamp-3">
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
