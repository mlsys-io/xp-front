import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  resolve: { alias: { "@": resolve(__dirname, "src") } },
  plugins: [react()],
  build: {
    outDir: "dist",
    // Source maps off in prod — 3.6MB of `.js.map` was being deployed
    // alongside the bundle. Set VITE_SOURCEMAP=true at build time when
    // debugging minified stack traces.
    sourcemap: process.env.VITE_SOURCEMAP === "true",
    rollupOptions: {
      output: {
        // Manual vendor chunks so heavy deps cache independently of
        // app code. Without this, an app-code change invalidates the
        // entire ~800KB bundle. With splitting, vendor chunks cache
        // for a year (the immutable filename hash) and only the small
        // app chunk re-downloads on deploy.
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "router-vendor": ["react-router-dom"],
          "markdown-vendor": [
            "react-markdown",
            "rehype-highlight",
            "rehype-sanitize",
            "remark-gfm",
          ],
          "icons-vendor": ["lucide-react"],
        },
      },
    },
  },
  server: { port: 5173, host: true },
});
