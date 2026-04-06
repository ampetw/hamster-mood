import { defineConfig } from "vite";

// Relative base so /hamsters/* works on GitHub Pages (…/repo/) and at domain root.
export default defineConfig({
  base: "./",
  server: {
    port: 5173,
  },
});
