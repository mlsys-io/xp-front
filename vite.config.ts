import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  resolve: { alias: { "@": resolve(__dirname, "src") } },
  plugins: [react()],
  build: { outDir: "dist", sourcemap: true },
  server: { port: 5173, host: true },
});
