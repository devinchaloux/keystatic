# This fork

Devin Chaloux's fork of [Keystatic](https://github.com/Thinkmill/keystatic), the
editor behind `devinchaloux.com/keystatic`. It exists so the editor can be
shaped around one person's writing: dense cross-references, music examples,
citations, records from a research corpus. Upstream Keystatic is built for
general use and changes slowly, so the site now owns its copy.

**Current release:** `devinchaloux.1`, based on `@keystatic/core@0.6.9`.

The site that uses it is private (`devinchaloux/devinchaloux-site`). This repo
holds only editor code, never site content.

---

## Branches

| Branch         | What it is                                                                     |
| -------------- | ------------------------------------------------------------------------------ |
| `main`         | Upstream, untouched. GitHub's **Sync fork** button keeps it current.           |
| `devinchaloux` | Our changes, on top of the upstream release the site runs. **Default branch.** |

Why two: Sync fork can only fast-forward a branch with no commits of its own.
Keeping `main` pristine means pulling upstream is always one click, and taking
an upstream change into our branch is a deliberate merge.

## Our changes

Every change is marked `FORK (devinchaloux)` in a comment at the site of the
change, so `git grep "FORK (devinchaloux)"` lists them all. Each has a test.

| Release        | Change                                                                                                                                                                                                                                                          | Where                                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| devinchaloux.1 | **Inserting an inline component opens its form.** Upstream drops an empty chip and needs two clicks (select it, then the pencil) before you can fill it in. Previously a find-and-replace patch on the compiled code, applied at install time in the site repo. | `packages/keystatic/src/form/fields/markdoc/editor/commands/misc.ts` (+ `misc.test.ts`), `.../popovers/index.tsx` |
| devinchaloux.1 | `forkRelease` field in `packages/keystatic/package.json`, so the site can check which build it has.                                                                                                                                                             | `packages/keystatic/package.json`                                                                                 |
| devinchaloux.1 | The release workflow.                                                                                                                                                                                                                                           | `.github/workflows/fork-release.yml`                                                                              |

Only `@keystatic/core` is forked so far. The site still installs
`@keystatic/astro` from npm, because nothing in it has needed to change.

---

## Making a release

Releases are built by GitHub, not by hand: `.github/workflows/fork-release.yml`
runs when a tag like `devinchaloux.2` is pushed. It checks the tag matches
`forkRelease`, type-checks, runs the `@keystatic/core` tests, builds, and
publishes a GitHub Release carrying `keystatic-core-<version>.tgz` and its
SHA-256. The site installs that file by URL, so every step from commit to
running editor can be traced.

1. On `devinchaloux`, bump `forkRelease` in `packages/keystatic/package.json`
   (`devinchaloux.1` → `devinchaloux.2`) and add the change to the table above.
2. Commit, then tag that commit with the same name and push both:
   `git tag devinchaloux.2 && git push origin devinchaloux devinchaloux.2`
3. When the workflow finishes, point the site at the new release: in the site
   repo, change `@keystatic/core` in `package.json` to the release URL
   (`https://github.com/devinchaloux/keystatic/releases/download/devinchaloux.2/keystatic-core-0.6.9.tgz`)
   and run `npm install`. The lockfile records the file's fingerprint, so a
   release can't change underneath the site. `npm run check:keystatic` in the
   site confirms which release is installed.

**Building locally** (to try a change before releasing it). Needs Node 22+ and
pnpm, pinned in `package.json`; `npx` fetches the right version.

```sh
npx -y pnpm@11.20.0 install --frozen-lockfile --ignore-scripts
node design-system/pkg/build-l10n.mts                      # translations for the UI kit
(cd packages/keystatic && npx -y pnpm@11.20.0 run setup)   # generated GraphQL types, l10n, syntax colours
npx -y pnpm@11.20.0 exec tsc --noEmit                      # type check
npx -y pnpm@11.20.0 exec vitest run --project keystatic    # the package's tests
npx -y pnpm@11.20.0 exec preconstruct build                # compile
```

The design system's own tests (`--project keystar/ui`) are not part of a
release: the site takes `@keystar/ui` from npm unchanged, and 16 of them (toast,
router, drag-and-drop) already failed on untouched 0.6.9.

**One-time GitHub settings** for this fork: Actions enabled (GitHub disables
them on new forks); upstream's _Build and deploy Cloudflare Workers_ and
_Version Packages_ workflows disabled, since they run on every push to `main`,
Sync fork included, and need upstream's secrets; default branch set to
`devinchaloux`.

## Taking an upstream update

1. On GitHub, **Sync fork** on `main`.
2. Merge the upstream release tag (e.g. `@keystatic/core@0.6.10`) into
   `devinchaloux`. Resolve conflicts in favour of keeping each `FORK` change
   working; the tests say whether it does.
3. Bump `forkRelease`, tag, and ship as above.

Upstream sees a few dozen commits a year, mostly maintenance, so this is
occasional. There is no need to take every release.

## Checked when the fork was made (2026-10-14)

Building `@keystatic/core@0.6.9` from this source produced output
**byte-identical** to the npm release (all 91 files of `dist/`), so the fork
started as exactly the editor the site already ran.
