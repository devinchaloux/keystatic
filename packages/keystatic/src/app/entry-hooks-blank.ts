// FORK (devinchaloux): server stand-ins for entry-hooks.ts. The admin never
// renders on the server, so these only have to exist and return nothing.
import type { EntryRecord } from './useEntryLabels';

export type { EntryRecord };

export function useCollectionEntries(
  _collection: string
): Map<string, EntryRecord> {
  return new Map();
}

export function useEntryLabels(_collection: string): Map<string, string> {
  return new Map();
}
