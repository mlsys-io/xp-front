import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { exchangeCode } from "../api/client";
import { takeVerifier } from "../lib/pkce";

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
      .then(() => nav("/dashboard"))
      .catch((e) => setErr(String(e?.response?.data?.detail ?? e)));
  }, [nav, params]);

  return (
    <div className="flex h-screen items-center justify-center">
      {err ? (
        <div className="max-w-md rounded-md border border-rose-200 bg-rose-50 p-5 text-rose-800">
          <div className="font-semibold">Sign-in failed</div>
          <div className="mt-2 text-sm">{err}</div>
          <a href="/" className="mt-4 inline-block text-sm text-rose-700 underline">
            Try again
          </a>
        </div>
      ) : (
        <div className="text-slate-500">Completing sign-in…</div>
      )}
    </div>
  );
}
