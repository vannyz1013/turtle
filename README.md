# A Little Sunshine

An interactive 3D get-well-soon garden for anyone who is resting and recovering.
Warm, cute, dreamy and healing: a magical garden with Sunny, an original blue companion robot,
a magical door, a pocket full of happiness, flowers that respond to you, and a little letter.
The on-screen text is Simplified Chinese with a few English touches.

**Live:** <https://vannyz1013.github.io/turtle/> (once published)

## Tech

TypeScript · Vite · Three.js · GSAP. Free tools and services only; hosted on GitHub Pages.

## Develop

```sh
npm install
npm run dev           # local dev server
npm run typecheck     # types only
npm run check:public  # public-edition guard (no private terms, third-party characters or unregistered assets)
npm run build         # guard + typecheck + production build into dist/
npm run preview       # serve the production build locally
```

## Layout

| Path | What lives there |
|---|---|
| `src/main.ts` | Entry: loading screen, WebGL check, lazy-loads the 3D experience |
| `src/experience.ts` | Builds the world and interface, then starts the story |
| `src/core/` | Renderer and frame loop, camera rig, tap/hover picking, reduced motion |
| `src/scene/` | Sky, light, islands, plants, clouds, particles; `layout.ts` holds positions and camera shots |
| `src/objects/` | Sunny the robot, magical door, happiness pocket, wish flowers, sparkle bursts |
| `src/story/` | The six scenes (`chapters/`) and the director that plays them in order |
| `src/ui/` | Caption panel, speech bubbles, letter, loader, sound toggle, 2D fallback |
| `src/audio/` | Generated music and sound effects |
| `src/edition/` | **The public edition**: `greeting.ts` (every word the visitor reads), `palette.ts` (3D colours), `theme.css` (UI colours and fonts), `extensions.ts` (optional extras; empty here). Resolved as `@edition` |
| `src/core/edition.ts` | The contract an edition must satisfy, including optional extensions |
| `src/core/editionRuntime.ts` | Applies an edition's optional extensions |
| `src/objects/gltfCompanion.ts` | Integration point for a licensed glTF character (unused by the public edition) |
| `scripts/check-public.mjs` | Guard that runs before every build: blocks third-party character names, local private terms and unregistered assets |
| `src/styles/` | CSS |
| `public/` | Static files copied as-is (currently none; each needs a row in `docs/ASSETS.md`) |
| `docs/` | [Design](docs/DESIGN.md), [editions](docs/EDITIONS.md), [asset sources and licences](docs/ASSETS.md), [workflow](docs/WORKFLOW.md) |

## Editions

This repository is the **public edition** and the shared engine. All edition-specific content goes
through the `@edition` alias (see `vite.config.ts` and `src/core/edition.ts`):

- `@edition/greeting`: every word on screen
- `@edition/palette`: colours of the 3D world
- `@edition/theme.css`: interface colours and fonts
- `@edition/extensions`: optional extras (another guide character, props, decorations, flower colours, effects); `{}` here

Full details: [docs/EDITIONS.md](docs/EDITIONS.md).

Personalised editions live in **separate private repositories** that include this engine as a pinned
git submodule and point `@edition` at their own folder. The dependency is one-way: nothing from a
private edition is ever added here.

`npm run build` first runs `npm run check:public`. It fails if the source contains third-party character
names, any term listed in a local, git-ignored `.private-terms` file, or a file in `public/` without a
licence row in `docs/ASSETS.md`.

## Deploy

Pushing `main` runs `.github/workflows/deploy.yml`, which builds and publishes to GitHub Pages.
Pushing `dev` never deploys. Day-to-day work happens on `dev`. See [docs/WORKFLOW.md](docs/WORKFLOW.md).

## Accessibility and fallback

- Every 3D interaction also has an on-screen button, so the journey works with a keyboard.
- `prefers-reduced-motion` (or `?motion=reduced`): camera flights become fades, idle motion is calmer.
- Browsers without WebGL 2 (or `?no3d`) get a 2D page with the same wishes and letter.
- Music is generated in code and only plays after the visitor presses the music button.
