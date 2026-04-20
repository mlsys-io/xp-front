import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { beginLogin } from "../lib/pkce";
import { whoami } from "../api/client";
import { AtokirinaField } from "../components/Atokirina";
import { TreeOfSouls } from "../components/TreeOfSouls";

export function Landing() {
  const nav = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    whoami().then(() => nav("/dashboard")).catch(() => setChecking(false));
  }, [nav]);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center text-soul-400/60 font-soft">
        listening to the Tree…
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* starfield behind everything */}
      <div className="absolute inset-0 starfield opacity-60" aria-hidden="true" />

      {/* floating atokirina seeds */}
      <AtokirinaField count={22} />

      {/* the Mother Tree itself, bleeding into the background */}
      <TreeOfSouls className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[42%] w-[900px] max-w-none opacity-70 animate-breathe pointer-events-none" />

      {/* top-right nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2 text-soul-300 font-display tracking-[0.3em] text-sm">
          xp.io
        </div>
        <a
          href="https://github.com/mlsys-io"
          className="text-xs uppercase tracking-widest text-bark-300/60 hover:text-soul-300 transition-colors"
        >
          github
        </a>
      </nav>

      {/* hero */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 pt-24 pb-32 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-soul-400/25 bg-night-800/40 px-4 py-1.5 text-[11px] uppercase tracking-[0.3em] text-soul-300 backdrop-blur">
          <span className="w-1.5 h-1.5 rounded-full bg-soul-400 animate-pulse-soul" />
          the Mother Tree
        </div>

        <h1 className="font-display text-5xl md:text-7xl font-normal text-bark-300 leading-tight tracking-wide max-w-4xl">
          Every memory,
          <br />
          <span className="bg-gradient-to-r from-soul-300 via-spirit-300 to-atokirina-300 bg-clip-text text-transparent">
            rooted in the same tree.
          </span>
        </h1>

        <p className="mt-8 max-w-xl text-base md:text-lg text-bark-300/75 leading-relaxed">
          xp.io is the knowledge layer of LumidOS. Your auto-research loops
          learn here. Your applications share memories here. Your personal AI
          remembers across every device, because every thread ties back to
          the Tree.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => beginLogin()}
            className="soul-ring group relative rounded-full bg-night-800/80 px-8 py-3.5 text-sm font-medium tracking-wide text-bark-300 transition-transform hover:scale-[1.02]"
          >
            <span className="relative flex items-center gap-2">
              Sign in with lum.id
              <span className="text-soul-300 group-hover:translate-x-0.5 transition-transform">→</span>
            </span>
          </button>
          <a
            href="https://lum.id/start"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-soul-400/25 bg-transparent px-8 py-3.5 text-sm font-medium tracking-wide text-bark-300/80 hover:text-soul-300 hover:border-soul-400/50 transition-colors"
          >
            Plant a seed (install)
          </a>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl text-left">
          {[
            {
              title: "Knowledge",
              body: "Every agent is a root. Memories pulse through Thompson-sampled retrieval. Push to the Tree, pull across devices — no GitHub, no keys.",
              glow: "from-soul-400/20 to-transparent",
              dot: "bg-soul-400",
            },
            {
              title: "Applications",
              body: "Your strategies on QuantArena. Your workflows on FlowMesh. Your jobs on Lumilake. Every branch connected to the same trunk.",
              glow: "from-spirit-400/20 to-transparent",
              dot: "bg-spirit-400",
            },
            {
              title: "Auto-research",
              body: "Observe → hypothesize → act → analyze → learn. Your research loops deposit their findings back into the roots. Nothing is lost.",
              glow: "from-atokirina-400/20 to-transparent",
              dot: "bg-atokirina-400",
            },
          ].map((c) => (
            <div
              key={c.title}
              className={`group relative rounded-2xl border border-soul-400/15 bg-night-800/40 p-6 backdrop-blur overflow-hidden`}
            >
              <div
                className={`absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-to-br ${c.glow} opacity-60 blur-3xl pointer-events-none`}
              />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-1.5 h-1.5 rounded-full ${c.dot} animate-pulse-soul`} />
                  <span className="font-display text-sm tracking-widest uppercase text-soul-300">
                    {c.title}
                  </span>
                </div>
                <div className="text-bark-300/80 text-[15px] leading-relaxed">{c.body}</div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-24 text-xs uppercase tracking-[0.35em] text-bark-300/50">
          Identity by{" "}
          <a href="https://lum.id" className="hover:text-soul-300 transition-colors">
            lum.id
          </a>
          {" · "}No xp.io password{" · "}Every seed belongs to you
        </p>
      </main>
    </div>
  );
}
