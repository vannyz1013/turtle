import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// The edition (words, colours, fonts, optional extensions) is resolved through the
// "@edition" alias. By default this is the public edition in src/edition.
// A private edition repository includes this engine as a pinned git submodule and builds
// it with SUNSHINE_EDITION=<path to its own edition folder>. Nothing flows back here.
const edition = process.env.SUNSHINE_EDITION
  ? resolve(process.env.SUNSHINE_EDITION)
  : fileURLToPath(new URL("./src/edition", import.meta.url));

// A relative base means the build works at any GitHub Pages path,
// so the site keeps working even if the repo is renamed.
export default defineConfig({
  base: "./",
  // dedupe: an edition folder outside this repo must use this engine's single copy of three and gsap.
  resolve: { alias: { "@edition": edition }, dedupe: ["three", "gsap"] },
  // Allow the dev server to read an edition folder that lives outside this repository.
  server: { fs: { allow: [".", edition] } },
  // three.js is ~200 kB gzipped; it loads lazily behind the loading screen.
  build: { target: "es2020", chunkSizeWarningLimit: 900 },
});
