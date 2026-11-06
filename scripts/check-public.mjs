// Public-edition guard. Runs before every build (and so in the GitHub Pages workflow).
//
// It fails the build when the public repository contains:
//   1. Names of third-party characters that must never ship here (see docs/DESIGN.md).
//   2. Personal terms listed in an optional local file `.private-terms` (one per line).
//      That file is git-ignored, so personal names never need to be written into this repo.
//   3. Any file in public/ that is not registered in docs/ASSETS.md.
//
// Usage: node scripts/check-public.mjs

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

// `npm run build` in this repository always builds the public edition, so GitHub Pages can
// never publish another edition by accident. Private repositories run `vite build` themselves.
if (process.env.SUNSHINE_EDITION) {
  console.error("Public-edition check failed: SUNSHINE_EDITION is set. This repository only builds the public edition.");
  process.exit(1);
}

// Third-party character IP that belongs only in separately licensed, private editions.
const THIRD_PARTY = ["doraemon", "ドラえもん", "哆啦", "叮当猫", "nobita", "野比"];

const localFile = join(root, ".private-terms");
const PRIVATE = existsSync(localFile)
  ? readFileSync(localFile, "utf8")
      .split(/\r?\n/)
      .map((t) => t.trim())
      .filter((t) => t && !t.startsWith("#"))
  : [];

const TEXT = new Set([".ts", ".js", ".mjs", ".css", ".html", ".json", ".svg", ".txt", ".md", ".glsl"]);
const SCAN = ["src", "public", "index.html"];

function* walk(path) {
  if (!existsSync(path)) return;
  if (statSync(path).isDirectory()) {
    for (const name of readdirSync(path)) yield* walk(join(path, name));
  } else {
    yield path;
  }
}

const problems = [];
const terms = [...THIRD_PARTY.map((t) => [t, "third-party character"]), ...PRIVATE.map((t) => [t, "private term"])];

for (const entry of SCAN) {
  for (const file of walk(join(root, entry))) {
    const rel = relative(root, file).replaceAll("\\", "/");
    if (!TEXT.has(extname(file).toLowerCase())) continue;
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      const lower = line.toLowerCase();
      for (const [term, kind] of terms) {
        if (lower.includes(term.toLowerCase())) problems.push(`${rel}:${i + 1}  ${kind} found`);
      }
    });
  }
}

// Every file shipped from public/ must have a licence row in docs/ASSETS.md.
const assetsDoc = existsSync(join(root, "docs/ASSETS.md")) ? readFileSync(join(root, "docs/ASSETS.md"), "utf8") : "";
for (const file of walk(join(root, "public"))) {
  const name = basename(file);
  if (name === ".gitkeep") continue;
  if (!assetsDoc.includes(name)) problems.push(`${relative(root, file).replaceAll("\\", "/")}  not registered in docs/ASSETS.md`);
}

if (problems.length) {
  console.error("Public-edition check failed. This repository is public; remove or move these:\n");
  for (const p of problems) console.error("  " + p);
  console.error("\nPersonalised content belongs in a private edition repository.");
  process.exit(1);
}
console.log(`Public-edition check passed (${THIRD_PARTY.length} third-party terms, ${PRIVATE.length} local private terms).`);
