// FORK (devinchaloux): with `ui.publishing`, the default branch is the live
// site, so neither a save nor a delete commits to it directly; both go to a
// writing branch first. Shared by useUpsertItem and useDeleteItem.

export function needsWritingBranch(args: {
  storageKind: 'github' | 'cloud' | 'local';
  publishing: boolean;
  branch: string;
  defaultBranch: string | undefined;
}): boolean {
  return (
    args.storageKind === 'github' &&
    args.publishing &&
    args.defaultBranch !== undefined &&
    args.branch === args.defaultBranch
  );
}
