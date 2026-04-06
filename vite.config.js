import { defineConfig } from "vite";

// GitHub project Pages URL: https://<user>.github.io/hamster-mood/
// Relative "./" breaks when the site is opened without a trailing slash (script → /assets/… 404).
// Dev keeps base "/" so http://localhost:5173/ works; production build uses the repo path.
const REPO_NAME = "hamster-mood";

export default defineConfig(({ command }) => ({
  base: command === "build" ? `/${REPO_NAME}/` : "/",
  build: {
    outDir: "docs",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
}));
