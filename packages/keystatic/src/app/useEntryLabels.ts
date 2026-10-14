// FORK (devinchaloux): the human name of every entry in a collection.
//
// Upstream's relationship pickers list slugs, because the only thing they
// load is the file tree. For a collection whose slug is its title that's
// tolerable; for one keyed by number (a corpus track lives at `16.yaml`) the
// picker is a column of numbers. This reads each entry's slug field (the
// text its slug was made from, e.g. "Sandstorm — Darude (1999)") so pickers
// can show that instead.
//
// Blobs are cached by hash (fetchBlob), so several pickers on one page, or
// one opened many times, read each file once.

import { useCallback } from 'react';
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

const EMPTY = new Map<string, string>();

/** slug → name, for the entries whose name could be read; others are absent. */
export function useEntryLabels(collection: string): Map<string, string> {
  const config = useConfig();
  const tree = useTree().current;
  const baseCommit = useBaseCommit();
  const repoInfo = useRepoInfo();

  const state = useData(
    useCallback(async () => {
      if (tree.kind !== 'loaded') return EMPTY;
      const collectionConfig = config.collections?.[collection];
      if (!collectionConfig) return EMPTY;
      const formatInfo = getCollectionFormat(config, collection);
      const entries = getEntriesInCollectionWithTreeKey(
        config,
        collection,
        tree.data.tree
      );
      const labels = new Map<string, string>();
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
            // A slug field stores the text the slug came from under its own key.
            const name = (loaded as Record<string, unknown> | null)?.[
              collectionConfig.slugField
            ];
            if (typeof name === 'string' && name.trim()) {
              labels.set(entry.slug, name.trim());
            }
          } catch {
            // Unreadable entry: the picker falls back to its slug.
          }
        })
      );
      return labels;
    }, [config, collection, tree, baseCommit, repoInfo])
  );

  return state.kind === 'loaded' ? state.data : EMPTY;
}
