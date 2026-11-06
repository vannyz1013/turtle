# A Little Sunshine

An interactive 3D get-well-soon garden, made as a gift for a teacher.
Warm, cute, dreamy and healing: a magical garden with an original blue companion robot,
a magical door, a surprise box, flowers that respond to you, and a personal letter.

**Live:** <https://vannyz1013.github.io/turtle/> (once published)

## Tech

TypeScript · Vite · Three.js · GSAP. Free tools and services only; hosted on GitHub Pages.

## Develop

```sh
npm install
npm run dev        # local dev server
npm run typecheck  # types only
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build locally
```

## Layout

| Path | What lives there |
|---|---|
| `src/main.ts` | Entry point |
| `src/scene/` | Renderer, camera, lights, the garden ground |
| `src/objects/` | Robot, magical door, surprise box, flowers |
| `src/animation/` | GSAP timelines |
| `src/ui/` | The letter and on-screen hints |
| `src/data/greeting.ts` | Every word the visitor reads |
| `src/styles/` | CSS |
| `public/` | Models, textures, audio and fonts, copied as-is |
| `docs/` | [Design](docs/DESIGN.md), [asset sources and licences](docs/ASSETS.md), [workflow](docs/WORKFLOW.md) |

## Deploy

Merging into `main` runs `.github/workflows/deploy.yml`, which builds and publishes to GitHub Pages.
Day-to-day work happens on `dev`. See [docs/WORKFLOW.md](docs/WORKFLOW.md).
