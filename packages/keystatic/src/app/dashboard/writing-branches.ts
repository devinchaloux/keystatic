// FORK (devinchaloux): the writing branches handed to `ui.desk`, so a site
// can list what isn't published yet.

/** A branch under `storage.branchPrefix`, with when it last changed. */
export type WritingBranch = {
  name: string;
  /** The date of the branch's latest commit (ISO 8601). */
  updatedAt: string;
};

// Every branch other than the default one counts when no prefix is set,
// because then any branch could be a writing branch. Newest first, so a
// branch left alone for a while sinks to the foot of the list.
export function writingBranches(
  branches: ReadonlyMap<string, { committedAt: string }>,
  defaultBranch: string | undefined,
  branchPrefix: string | undefined
): WritingBranch[] {
  const out: WritingBranch[] = [];
  for (const [name, info] of branches) {
    if (name === defaultBranch) continue;
    if (branchPrefix && !name.startsWith(branchPrefix)) continue;
    out.push({ name, updatedAt: info.committedAt });
  }
  return out.sort(
    (a, b) =>
      b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name)
  );
}
