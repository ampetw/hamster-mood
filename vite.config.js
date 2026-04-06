import { defineConfig } from "vite";

// Relative base so /hamsters/* works on GitHub Pages (…/repo/) and at domain root.
// Build output in /docs so Pages can use "Deploy from branch → /docs" without Actions.
export default defineConfig({
  base: "./",
  build: {
    outDir: "docs",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});
