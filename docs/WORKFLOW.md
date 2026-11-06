# Workflow

## Branches

| Branch | Purpose |
|---|---|
| `main` | Stable. Every push here deploys to GitHub Pages. Only merge finished, tested work. |
| `dev` | Day-to-day work. Commit freely. Pushing `dev` never deploys (the workflow only runs for `main`). |

## Releasing

1. On `dev`: `npm run build` passes and the site looks right in `npm run preview`.
2. Merge `dev` into `main` and push `main`.
3. The **Deploy to GitHub Pages** action builds and publishes. Check <https://vannyz1013.github.io/turtle/>.

## Rules

- Nothing is pushed or published without the owner's explicit OK.
- This repo is public: no secrets, no `.env`, no private notes. Personal words for the letter
  live in a private edition repository, never here. The public text in
  `src/edition/greeting.ts` stays generic; `npm run check:public` enforces this.
- New third-party assets get a row in [ASSETS.md](ASSETS.md) first.

- Commits are public. Use your GitHub no-reply address as the commit email
  (`git config user.email "<id>+<username>@users.noreply.github.com"`), not a personal one.

## Engine releases for other editions

Private editions pin this repository as a git submodule. Give each engine revision they depend on an
annotated tag (for example `engine-v0.2.0`) on `dev` or `main`, and push the tag.

## One-time GitHub setup (when publishing for the first time)

1. Create the public repo `vannyz1013/turtle` **without** pushing (`gh repo create ... --source=. --remote=origin`, no `--push`).
2. Push `dev` only: `git push -u origin dev`. This does not deploy.
3. When ready to publish: push `main`, then Settings → Pages → Source: **GitHub Actions**, and set the
   default branch as preferred.
