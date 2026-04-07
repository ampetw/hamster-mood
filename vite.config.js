import { defineConfig } from "vite";
import { resolve } from "node:path";

// Use a relative base in production so the built `docs/` output
// works for forks and different GitHub Pages repo names.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "./" : "/",
  build: {
    outDir: "docs",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        billboard: resolve(__dirname, "billboard.html"),
      },
    },
  },
  server: {
    port: 5173,
  },
}));
