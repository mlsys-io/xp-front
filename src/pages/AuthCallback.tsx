import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { exchangeCode } from "../api/client";
import { takeReturnTo, takeVerifier } from "../lib/pkce";
import { AtokirinaField } from "../components/Atokirina";

export function AuthCallback() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get("code");
    const err = params.get("error");
    if (err) {
      setErr(err);
      return;
    }
    if (!code) {
      setErr("missing code");
      return;
    }
    const { verifier } = takeVerifier();
    if (!verifier) {
      setErr("PKCE verifier missing — retry sign in");
      return;
    }
    exchangeCode(code, verifier)
      .then(() => {
        // Return the user to wherever they were before the OAuth hop (fork
        // button, star, New-PR form). Fall back to /dashboard when we have
        // no memory of the original intent (e.g. cold /auth/callback visit).
        const returnTo = takeReturnTo();
        nav(returnTo && !returnTo.startsWith("/auth/") ? returnTo : "/dashboard");
      })
      .catch((e) => setErr(String(e?.response?.data?.detail ?? e)));
  }, [nav, params]);

  return (
    <div className="flex h-screen items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 starfield opacity-40" />
      <AtokirinaField count={10} />
      {err ? (
        <div className="relative z-10 max-w-md rounded-2xl border border-atokirina-400/40 bg-white backdrop-blur p-6 text-atokirina-300">
          <div className="font-display tracking-widest text-xs uppercase mb-2 text-atokirina-400">
            Connection lost
          </div>
          <div className="text-gray-900 text-sm">{err}</div>
          <a href="/" className="mt-4 inline-block text-sm text-soul-300 hover:text-soul-400 transition-colors">
            ← return to the Tree
          </a>
        </div>
      ) : (
        <div className="relative z-10 text-center">
          <div className="font-display tracking-[0.35em] text-xs uppercase text-soul-300/80">
            Connecting
          </div>
          <div className="mt-3 w-10 h-10 mx-auto rounded-full border-2 border-gray-300 border-t-soul-400 animate-spin" />
        </div>
      )}
    </div>
  );
}
