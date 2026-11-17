// FORK (devinchaloux): every entry in a collection, read once and shared.
//
// Upstream's relationship pickers list slugs, because the only thing they
// load is the file tree. For a collection whose slug is its title that's
// tolerable; for one keyed by number (a corpus track lives at `16.yaml`) the
// picker is a column of numbers. `useCollectionEntries` reads each entry's
// file so the admin can show what entries are, not what they're called on
// disk: pickers use its names (`useEntryLabels`); a site's chip views and
// dashboard use the fields and the raw text (it is exported publicly).
//
// Blobs are cached by hash (fetchBlob), so every chip and picker on a page,
// however many, reads each file once.

import { useCallback, useMemo } from 'react';
import { useConfig } from './shell/context';
import { useBaseCommit, useRepoInfo, useTree } from './shell/data';
import {
  getCollectionFormat,
  getCollectionItemPath,
  getEntriesInCollectionWithTreeKey,
  getEntryDataFilepath,
} from './utils';
import { fetchBlob } from './useItemData';
import { loadDataFile } from './required-files';
import { useData } from './useData';

/** One entry as read from its file. */
export type EntryRecord = {
  /** The file's fields (frontmatter, or the YAML/JSON object). */
  data: Record<string, unknown>;
  /** The whole file as text: for a Markdoc entry, frontmatter and body. */
  text: string;
};

const EMPTY_ENTRIES = new Map<string, EntryRecord>();
const decoder = new TextDecoder();

/** slug → entry, for entries whose file could be read; others are absent. */
export function useCollectionEntries(
  collection: string
): Map<string, EntryRecord> {
  return useCollectionEntriesState(collection).entries;
}

// FORK (devinchaloux): the same, saying whether the files have been read.
// A picker filters on the names, and until they arrive each option's text is
// its slug, so a search typed at once matched nothing and the menu closed for
// good (react-stately reopens it only on the next keystroke). Pickers use
// `loaded` to show "Loading…" instead (see relationshipPicker).
export function useCollectionEntriesState(collection: string): {
  entries: Map<string, EntryRecord>;
  loaded: boolean;
} {
  const config = useConfig();
  const tree = useTree().current;
  const baseCommit = useBaseCommit();
  const repoInfo = useRepoInfo();

  const state = useData(
    useCallback(async () => {
      if (tree.kind !== 'loaded') return EMPTY_ENTRIES;
      if (!config.collections?.[collection]) return EMPTY_ENTRIES;
      const formatInfo = getCollectionFormat(config, collection);
      const entries = getEntriesInCollectionWithTreeKey(
        config,
        collection,
        tree.data.tree
      );
      const records = new Map<string, EntryRecord>();
      await Promise.all(
        entries.map(async entry => {
          try {
            const blob = await fetchBlob(
              config,
              entry.sha,
              getEntryDataFilepath(
                getCollectionItemPath(config, collection, entry.slug),
                formatInfo
              ),
              baseCommit,
              repoInfo
            );
            const { loaded } = loadDataFile(blob, formatInfo);
            records.set(entry.slug, {
              data: (loaded ?? {}) as Record<string, unknown>,
              text: decoder.decode(blob),
            });
          } catch {
            // Unreadable entry: left out; callers fall back to its slug.
          }
        })
      );
      return records;
    }, [config, collection, tree, baseCommit, repoInfo])
  );

  return {
    entries: state.kind === 'loaded' ? state.data : EMPTY_ENTRIES,
    // An unreadable collection counts as loaded: its pickers fall back to
    // slugs rather than spin forever.
    loaded: tree.kind !== 'loading' && state.kind !== 'loading',
  };
}

/** slug → name (the slug field's text), for the entries that have one. */
export function useEntryLabels(collection: string): Map<string, string> {
  return useEntryLabelsState(collection).labels;
}

// FORK (devinchaloux): the names, and whether they have been read yet.
export function useEntryLabelsState(collection: string): {
  labels: Map<string, string>;
  loaded: boolean;
} {
  const config = useConfig();
  const { entries, loaded } = useCollectionEntriesState(collection);
  const slugField = config.collections?.[collection]?.slugField;
  const labels = useMemo(() => {
    const labels = new Map<string, string>();
    if (!slugField) return labels;
    for (const [slug, entry] of entries) {
      // A slug field stores the text the slug came from under its own key.
      const name = entry.data[slugField];
      if (typeof name === 'string' && name.trim()) {
        labels.set(slug, name.trim());
      }
    }
    return labels;
  }, [entries, slugField]);
  return { labels, loaded };
}
