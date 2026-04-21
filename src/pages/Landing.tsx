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
    return <div className="h-screen" />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 starfield opacity-60" aria-hidden="true" />
      <AtokirinaField count={22} />
      <TreeOfSouls className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[45%] w-[900px] max-w-none opacity-70 animate-breathe pointer-events-none" />

      <nav className="relative z-10 flex items-center justify-between px-8 py-5">
        <span className="text-soul-300 font-display tracking-[0.35em] text-sm">xp.io</span>
        <a
          href="https://github.com/mlsys-io"
          className="text-[11px] uppercase tracking-widest text-bark-300/50 hover:text-soul-300 transition-colors"
        >
          github
        </a>
      </nav>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-24">
        <h1 className="font-display text-3xl md:text-4xl text-bark-300 tracking-wide text-center max-w-md">
          The Mother Tree for LumidOS
        </h1>
        <p className="mt-3 text-sm text-bark-300/60 text-center max-w-md">
          Your agents, applications, and auto-research, in one place.
        </p>

        <button
          onClick={() => beginLogin()}
          className="soul-ring mt-10 rounded-full bg-night-800/80 px-10 py-4 text-sm tracking-widest uppercase text-bark-300 hover:scale-[1.02] transition-transform"
        >
          Sign in
        </button>
      </main>
    </div>
  );
}
