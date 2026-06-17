# xp.io is now a Git remote + read-only API endpoint ONLY — the marketplace UI
# moved to lum.id (/explore public, /studio authed). The React SPA was retired
# 2026-06-17, so this image is nginx-only: it terminates TLS, proxies /api/v1 to
# xpcloud, serves Git smart-HTTP, and 302s everything else to lum.id. No build
# stage, no bundle. (SPA source is kept in src/ for history/rollback but unused.)
FROM --platform=linux/amd64 fholzer/nginx-brotli:v1.26.2
COPY nginx.conf /etc/nginx/conf.d/default.conf
