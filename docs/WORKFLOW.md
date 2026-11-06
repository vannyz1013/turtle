# Workflow

## Branches

| Branch | Purpose |
|---|---|
| `main` | Stable. Every push here deploys to GitHub Pages. Only merge finished, tested work. |
| `dev` | Day-to-day work. Commit freely. |

## Releasing

1. On `dev`: `npm run build` passes and the site looks right in `npm run preview`.
2. Merge `dev` into `main` and push `main`.
3. The **Deploy to GitHub Pages** action builds and publishes. Check <https://vannyz1013.github.io/turtle/>.

## Rules

- Nothing is pushed or published without the owner's explicit OK.
- This repo is public: no secrets, no `.env`, no private notes. Personal words for the letter
  live in `src/data/greeting.ts` and are visible on the site anyway.
- New third-party assets get a row in [ASSETS.md](ASSETS.md) first.

## One-time GitHub setup (when publishing for the first time)

1. Create the public repo `vannyz1013/turtle` and push `main` and `dev`.
2. Settings → Pages → Source: **GitHub Actions**.
