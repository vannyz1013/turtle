import { defineConfig } from "vite";

// A relative base means the build works at any GitHub Pages path,
// so the site keeps working even if the repo is renamed.
export default defineConfig({
  base: "./",
  build: { target: "es2020" },
});
