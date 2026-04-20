import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { beginLogin } from "../lib/pkce";
import { whoami } from "../api/client";
import { Brain, Github } from "lucide-react";

export function Landing() {
  const nav = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    whoami().then(() => nav("/dashboard")).catch(() => setChecking(false));
  }, [nav]);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        checking session…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-8 py-6 flex items-center justify-between border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-indigo-600" />
          <span className="font-semibold tracking-tight">xp.io</span>
        </div>
        <a href="https://github.com/mlsys-io"
           className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1">
          <Github className="w-4 h-4" /> github
        </a>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl text-center">
          <h1 className="text-5xl font-bold tracking-tight text-slate-900">
            Your knowledge graph, in the cloud.
          </h1>
          <p className="mt-6 text-lg text-slate-600 leading-relaxed">
            xp.io is the knowledge layer of LumidOS. Your auto-research loops
            learn here. Your applications share memories here. Your personal AI
            remembers across every device here.
          </p>

          <div className="mt-10 flex items-center justify-center gap-3">
            <button
              onClick={() => beginLogin()}
              className="rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm"
            >
              Sign in with lum.id
            </button>
            <a
              href="https://lum.id/start"
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Install LumidOS
            </a>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
            {[
              {
                t: "Knowledge",
                d: "Git-backed agents per domain. Thompson-sampled retrieval. Push to the cloud, pull across devices.",
              },
              {
                t: "Applications",
                d: "QuantArena strategies, FlowMesh workflows, Lumilake jobs — all visible from one dashboard.",
              },
              {
                t: "Auto-research",
                d: "Your 5-phase research loops, their cycle counts, health, and emitted memories.",
              },
            ].map((c) => (
              <div key={c.t} className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="font-semibold text-slate-900">{c.t}</div>
                <div className="mt-1 text-sm text-slate-600 leading-relaxed">{c.d}</div>
              </div>
            ))}
          </div>

          <p className="mt-14 text-xs text-slate-400">
            Identity by{" "}
            <a href="https://lum.id" className="underline hover:text-slate-600">
              lum.id
            </a>{" "}
            · No xp.io password · Your PAT works everywhere
          </p>
        </div>
      </main>
    </div>
  );
}
