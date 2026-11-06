# Editions

This repository is the **shared engine** and the **public edition**. Other editions (for example a
personalised private gift) live in **separate private repositories**. They include this engine as a
pinned git submodule and supply their own edition folder. The dependency is one-way: nothing from a
private edition is ever added here.

## What an edition folder contains

The build resolves `@edition` to the edition folder (`src/edition/` by default; see `vite.config.ts`).
Types for every file are in `src/core/edition.ts`.

| File | Required | Purpose |
|---|---|---|
| `greeting.ts` | yes | `greeting`: every word on screen (`EditionGreeting`) |
| `palette.ts` | yes | `C`, `FLOWER_TONES`: colours of the 3D world (`EditionPalette`) |
| `theme.css` | yes | Interface colour and font tokens, font imports |
| `extensions.ts` | yes (may be `{}`) | `extensions`: optional additions below (`EditionExtensions`) |

## Optional extensions

All fields are optional. `{}` gives the public experience exactly.

| Field | Default | What it does |
|---|---|---|
| `companion` | Sunny | Replaces the guide character. Must implement `Companion`. Third-party characters must include `licence` |
| `props` | none | Extra **original** 3D objects; may be tappable (`interact`) and animated (`update`) |
| `decorations` | none | Extra static scene objects |
| `flowers.tones` | 12 pastel tones | Wish flower colours. Messages are `greeting.flowerMessages` |
| `effects.bloom` | 0.32 / 0.45 / 1.2 | Bloom strength, radius, threshold |
| `effects.sparkleColors` | warm pastel set | Tap sparkle colours |
| `effects.petalColors` | pink, ivory, yellow | Finale petal colours |

Edition code receives an `EditionEnv` with: reduced-motion state, ground height, named story spots,
per-frame ticks, sparkle bursts, speech bubbles and sounds.

## Building another edition

From the private repository (with this engine checked out as a submodule at `engine/`):

```sh
cd engine
SUNSHINE_EDITION=../edition npx vite build --outDir ../dist
```

`npm run build` in **this** repository refuses to run when `SUNSHINE_EDITION` is set, so GitHub Pages
can only ever publish the public edition.

## Licensed character assets

`src/objects/gltfCompanion.ts` (`GltfCompanion`) is the integration point for a character supplied as
a rigged glTF/GLB model. It:

- requires a complete `AssetLicence` record (owner, licensee, reference, scope) and refuses to load without one;
- scales the model to a set height, maps its animation clips (`idle`, `wave`, `react`, `happy`) to the
  story's actions, and falls back to gentle procedural motion for missing clips;
- is imported only by editions that use it, so the public bundle does not include GLTFLoader.

The engine contains **no third-party characters** and will not generate imitations of one. Until an
edition has properly licensed official assets, its character slot stays a documented placeholder.

### What needs authorisation from the rights holder

Anything taken from, or recognisably reproducing, a third-party franchise, including:

- the character's 3D model, 2D artwork, face, silhouette, colour scheme or signature accessories;
- other characters from the franchise;
- logos, title lettering, official illustrations, screenshots, stills;
- theme songs, background music, sound effects, voice clips;
- recognisable designs of the franchise's gadgets or locations.

Each such asset needs a row in that edition's own `ASSETS.md` with its licence reference. Private
distribution does not by itself grant permission.

## Safeguards in this repository

- `npm run check:public` (runs before every build): fails on third-party character names in `src/`,
  `public/` or `index.html`; on any term listed in a local, git-ignored `.private-terms` file; on files in
  `public/` without a licence row in `docs/ASSETS.md`; and when `SUNSHINE_EDITION` is set.
- `.gitignore` excludes `.private-terms`, `private/`, `edition-private/` and `*.private.*`.
