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

| Branch | What it is |
|---|---|
| `main` | Upstream, untouched. GitHub's **Sync fork** button keeps it current. |
| `devinchaloux` | Our changes, on top of the upstream release the site runs. **Default branch.** |

Why two: Sync fork can only fast-forward a branch with no commits of its own.
Keeping `main` pristine means pulling upstream is always one click, and taking
an upstream change into our branch is a deliberate merge.

## Our changes

Every change is marked `FORK (devinchaloux)` in a comment at the site of the
change, so `git grep "FORK (devinchaloux)"` lists them all. Each has a test.

| Release | Change | Where |
|---|---|---|
| devinchaloux.1 | **Inserting an inline component opens its form.** Upstream drops an empty chip and needs two clicks (select it, then the pencil) before you can fill it in. Previously a find-and-replace patch on the compiled code, applied at install time in the site repo. | `packages/keystatic/src/form/fields/markdoc/editor/commands/misc.ts` (+ `misc.test.ts`), `.../popovers/index.tsx` |
| devinchaloux.1 | `forkRelease` field in `packages/keystatic/package.json`, so the site can check which build it has. | `packages/keystatic/package.json` |

Only `@keystatic/core` is forked so far. The site still installs
`@keystatic/astro` from npm, because nothing in it has needed to change.

---

## Building a release

Needs Node 22+ (24 per `.nvmrc`) and pnpm, pinned in `package.json`. `npx`
fetches the right pnpm version, so nothing has to be installed globally.

```sh
npx -y pnpm@11.20.0 install --frozen-lockfile --ignore-scripts
node design-system/pkg/build-l10n.mts                  # translations for the UI kit
(cd packages/keystatic && npx -y pnpm@11.20.0 run setup)   # generated GraphQL types, l10n, syntax colours
npx -y pnpm@11.20.0 exec tsc --noEmit                  # type check
npx -y pnpm@11.20.0 exec vitest run packages/keystatic/src/form/fields/markdoc   # editor tests
npx -y pnpm@11.20.0 exec preconstruct build             # compile
(cd packages/keystatic && npx -y pnpm@11.20.0 pack --pack-destination ../../release)
```

`--ignore-scripts` skips the repo's own postinstall, which runs the same setup
steps; running them by hand makes a failure say which step it was.

The last line writes `release/keystatic-core-0.6.9.tgz`. **Before packing a
new release, bump `forkRelease`** in `packages/keystatic/package.json`
(`devinchaloux.1` → `devinchaloux.2`).

**Shipping it to the site:** copy the tarball into the site repo's `vendor/`
folder, named for the release (`keystatic-core-0.6.9-devinchaloux.2.tgz`),
point `package.json` at it, run `npm install` to update the lockfile, and
delete the old tarball. The site's `vendor/README.md` has the steps and the
check that confirms it worked.

## Taking an upstream update

1. On GitHub, **Sync fork** on `main`.
2. Merge the upstream release tag (e.g. `@keystatic/core@0.6.10`) into
   `devinchaloux`. Resolve conflicts in favour of keeping each `FORK` change
   working; the tests say whether it does.
3. Build, bump `forkRelease`, ship as above.

Upstream sees a few dozen commits a year, mostly maintenance, so this is
occasional. There is no need to take every release.

## Checked when the fork was made (2026-10-14)

Building `@keystatic/core@0.6.9` from this source produced output
**byte-identical** to the npm release (all 91 files of `dist/`), so the fork
started as exactly the editor the site already ran.
