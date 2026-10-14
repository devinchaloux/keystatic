// FORK (devinchaloux): the entry hooks a site's own admin code may use (chip
// views, a custom dashboard). Browser builds get the real ones; server builds
// get entry-hooks-blank.ts, via the `#entry-hooks` import condition, so
// importing them from a config file costs the server nothing.
export { useCollectionEntries, useEntryLabels } from './useEntryLabels';
export type { EntryRecord } from './useEntryLabels';
