# CLAUDE.md

Instructions for Claude Code in this repository. They apply to anyone working
on this fork with Claude; the maintainer's own session instructions load from a
private file through the import at the end.

**Current state:** `FORK.md` — the branches, every change this fork makes to
upstream Keystatic, and how a release is made. Read it first.

---

## What this is

A fork of [Keystatic](https://github.com/Thinkmill/keystatic) that shapes the
editor around one site's writing. Only `@keystatic/core` is changed. The site
installs each release from a GitHub Release URL, never from npm.

## Working in this repo

- **Branch from `devinchaloux`**, the default branch, and open pull requests
  into it. `main` mirrors upstream untouched, so GitHub's Sync fork stays a
  one-click fast-forward; never commit to it.
- **Mark every change.** A `FORK (devinchaloux)` comment where the change
  lives, a test beside it, and a row in `FORK.md`'s table.
- **A release is a version bump.** Merging to `devinchaloux` publishes a
  release only when `forkRelease` in `packages/keystatic/package.json` has a
  new value (`devinchaloux.12` → `devinchaloux.13`). Bump it in the pull
  request that should ship.
- **Keep upstream mergeable.** Prefer a new option or a small, marked edit
  over restructuring upstream code, so taking an upstream release stays a
  merge rather than a rewrite.
- **Never add site content** (entries, the site's config values, its theme
  files). The site passes those in through the options this fork adds.

### Checks

Fork CI runs these on every pull request; run them before pushing (setup
commands: `FORK.md` → Building locally):

```sh
npx -y pnpm@11.20.0 exec tsc --noEmit
npx -y pnpm@11.20.0 exec eslint packages/keystatic/src
npx -y pnpm@11.20.0 exec vitest run --project keystatic
```

### Commit messages

Conventional Commits: `<type>(<scope>): <summary>`, then a body saying why.
Types: `feat`, `fix`, `refactor`, `docs`, `chore`.

## Maintainer instructions

@../research/keystatic/maintainer.md
