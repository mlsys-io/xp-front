// PKCE helpers for the xp OAuth flow (lum.id is the authorization server).

function base64urlEncode(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomString(n = 64): string {
  const arr = new Uint8Array(n);
  crypto.getRandomValues(arr);
  return base64urlEncode(arr);
}

export async function sha256base64(verifier: string): Promise<string> {
  const bytes = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return base64urlEncode(new Uint8Array(hash));
}

const VERIFIER_KEY = "xp:pkce:verifier";
const STATE_KEY = "xp:pkce:state";
const RETURN_TO_KEY = "xp:pkce:return_to";

export async function beginLogin(
  returnTo?: string,
  lumidHost = "https://lum.id",
) {
  const verifier = randomString(64);
  const state = randomString(16);
  const challenge = await sha256base64(verifier);
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);
  // Capture where the user was before the OAuth hop so AuthCallback can put
  // them back. Default: current path + search (but strip /auth/* to avoid
  // bouncing through the callback again).
  const fallback = typeof window !== "undefined"
    ? window.location.pathname + window.location.search
    : "/";
  const target = (returnTo || fallback);
  if (target && !target.startsWith("/auth/")) {
    sessionStorage.setItem(RETURN_TO_KEY, target);
  }
  const params = new URLSearchParams({
    client_id: "xp",
    redirect_uri: "https://xp.io/auth/callback",
    response_type: "code",
    scope: "openid email profile xp:read xp:write",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  window.location.href = `${lumidHost}/oauth/authorize?${params.toString()}`;
}

export function takeVerifier(): { verifier: string | null; state: string | null } {
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  const state = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  return { verifier, state };
}

export function takeReturnTo(): string | null {
  const t = sessionStorage.getItem(RETURN_TO_KEY);
  sessionStorage.removeItem(RETURN_TO_KEY);
  return t;
}
