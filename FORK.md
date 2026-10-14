# This fork

Devin Chaloux's fork of [Keystatic](https://github.com/Thinkmill/keystatic), the
editor behind `devinchaloux.com/keystatic`. It exists so the editor can be
shaped around one person's writing: dense cross-references, music examples,
citations, records from a research corpus. Upstream Keystatic is built for
general use and changes slowly, so the site now owns its copy.

**Current release:** `devinchaloux.4`, based on `@keystatic/core@0.6.9`.

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

| Release        | Change                                                                                                                                                                                                                                                                                                                                 | Where                                                                                                             |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| devinchaloux.1 | **Inserting an inline component opens its form.** Upstream drops an empty chip and needs two clicks (select it, then the pencil) before you can fill it in. Previously a find-and-replace patch on the compiled code, applied at install time in the site repo.                                                                        | `packages/keystatic/src/form/fields/markdoc/editor/commands/misc.ts` (+ `misc.test.ts`), `.../popovers/index.tsx` |
| devinchaloux.1 | `forkRelease` field in `packages/keystatic/package.json`, so the site can check which build it has.                                                                                                                                                                                                                                    | `packages/keystatic/package.json`                                                                                 |
| devinchaloux.1 | The release workflow.                                                                                                                                                                                                                                                                                                                  | `.github/workflows/fork-release.yml`                                                                              |
| devinchaloux.2 | **`ui.theme` config option.** The site passes CSS (overrides of the UI kit's `--kui-*` variables) and a font stylesheet, so the admin wears the site's palette and type. The values live in the site repo.                                                                                                                             | `packages/keystatic/src/config.tsx`, `src/app/provider.tsx`                                                       |
| devinchaloux.2 | **Collection tables read like a list of writing.** No Slug column when the slug's own field is shown; on-checkboxes as badges ("Draft"), off ones blank; dates as "Sep 6, 2026"; newest first when there's a date, else by the leading column; the chosen sort remembered per collection; search across every column; regular density. | `src/app/collection-table.ts` (+ `.test.ts`), `src/app/CollectionPage.tsx`                                        |
| devinchaloux.2 | **Pickers list entries by name.** Relationship and multi-relationship pickers show each entry's slug-field text ("Sandstorm — Darude (1999)") with the slug beneath, and search by name.                                                                                                                                               | `src/app/useEntryLabels.ts`, `src/form/fields/relationship/ui.tsx`, `src/form/fields/multiRelationship/ui.tsx`    |
| devinchaloux.3 | **`ui.fieldHelp: 'tooltip'`.** Field descriptions become an ⓘ button beside the label, opening a popover, instead of paragraphs under every field; in entry forms and component dialogs alike.                                                                                                                                         | `src/form/fields/field-help.tsx`, every field `ui.tsx` that renders a description                                 |
| devinchaloux.3 | **Columns and filters on collection tables.** A Columns menu (any single-valued field, remembered per collection) and a Filter menu built from the data (checkboxes, tags, short pick-lists), active filters as removable chips, and an entry count.                                                                                   | `src/app/collection-toolbar.tsx`, `src/app/collection-table.ts` (+ tests), `src/app/CollectionPage.tsx`           |
| devinchaloux.3 | **`ui.density: 'compact'`.** List fields use short rows, and a multi-relationship (tags) shows its picks as removable chips.                                                                                                                                                                                                           | `src/form/fields/array/ui.tsx`, `src/form/fields/multiRelationship/ui.tsx`                                        |
| devinchaloux.4 | **`useCollectionEntries` / `useEntryLabels`, exported.** A site's chip views and dashboard can read the entries of any collection (fields and raw text) in the admin; server builds get empty stand-ins via the `#entry-hooks` import condition.                                                                                       | `src/app/useEntryLabels.ts`, `src/app/entry-hooks*.ts`, `src/index.ts`, `package.json` (`imports`)                |
| devinchaloux.4 | **One popover per selected chip.** The insert-opens-form change only fired for the first chip inserted, because React kept one popover as the selection moved; keyed per node now.                                                                                                                                                     | `src/form/fields/markdoc/editor/popovers/index.tsx`                                                               |
| devinchaloux.4 | **`[[` references (`ui.referenceShortcut`).** `[[` opens a list of a collection's entries by name; choosing one inserts the configured component pointing at it (the name, sentence-cased, as its text); a last option parks the typed words with no entry. The list rebuilds as it narrows, so Enter takes the best match.            | `src/form/fields/markdoc/editor/autocomplete/reference-menu.tsx` (+ test), `.../inputrules/rules.ts`              |
| devinchaloux.4 | **`ui.desk`.** A site's own panel at the top of the dashboard, given `basePath` and an in-admin `navigate`.                                                                                                                                                                                                                            | `src/app/dashboard/DashboardPage.tsx`, `src/config.tsx`                                                           |
| devinchaloux.4 | **Fork CI** for pull requests and on demand (releases already run the same checks).                                                                                                                                                                                                                                                    | `.github/workflows/fork-ci.yml`                                                                                   |

Only `@keystatic/core` is forked so far. The site still installs
`@keystatic/astro` from npm, because nothing in it has needed to change.

---

## Making a release

Releases are built by GitHub, not by hand. `.github/workflows/fork-release.yml`
runs on every push to `devinchaloux` and reads `forkRelease`. When no release
has that name yet, it type-checks, runs the `@keystatic/core` tests, builds, and
publishes a GitHub Release (with a tag of the same name) carrying
`keystatic-core-<version>.tgz` and its SHA-256. When one already exists, it
stops after that check. The site installs the file by URL, so every step from
commit to running editor can be traced.

1. On `devinchaloux`, make the change, add it to the table above, and bump
   `forkRelease` in `packages/keystatic/package.json` (`devinchaloux.1` →
   `devinchaloux.2`). Bumping it is what makes a release; a push without a bump
   publishes nothing.
2. Push the branch. The Actions tab shows the release being built.
3. When it finishes, point the site at the new release: in the site repo, change
   `@keystatic/core` in `package.json` to the release URL
   (`https://github.com/devinchaloux/keystatic/releases/download/devinchaloux.2/keystatic-core-0.6.9.tgz`)
   and run `npm install`. The lockfile records the file's fingerprint, so a
   release can't change underneath the site. `npm run check:keystatic` in the
   site confirms which release is installed.

(The first version of the workflow ran on pushed tags. Claude's cloud sessions
can push branches but not tags, so the release step became the bump instead.)

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
2. Merge upstream's release into `devinchaloux`. Its tag
   (`@keystatic/core@0.6.10`) lives on Thinkmill/keystatic, not here (Sync fork
   copies commits, not tags), so fetch it from there, or merge the "Version
   Packages" commit on `main` that published it. Resolve conflicts in favour of
   keeping each `FORK` change working; the tests say whether it does.
3. Bump `forkRelease`, push, and ship as above.

Upstream sees a few dozen commits a year, mostly maintenance, so this is
occasional. There is no need to take every release.

## Checked when the fork was made (2026-10-14)

Building `@keystatic/core@0.6.9` from this source produced output
**byte-identical** to the npm release (all 91 files of `dist/`), so the fork
started as exactly the editor the site already ran.
