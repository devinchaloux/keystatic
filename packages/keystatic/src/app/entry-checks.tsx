// FORK (devinchaloux): the site's checks, before saving rather than after.
//
// With `ui.entryChecks: { url, slugsOf }`, an entry being edited is sent to
// the site a moment after each change, as the file a save would write, with
// the slugs of the collections in `slugsOf` as they stand on this branch (so
// a term can point at a definition written on the same branch). The site
// answers `{ problems: string[] }`.
//
// Problems show as a badge beside Save, which opens the list. Saving with
// any asks first; it never refuses, because the site's own checks still run
// after a save and the writer may know better (a draft is allowed to be
// rough).

import { ReactElement, useEffect, useMemo, useState } from 'react';

import { ActionButton } from '@keystar/ui/button';
import {
  AlertDialog,
  Dialog,
  DialogContainer,
  DialogTrigger,
} from '@keystar/ui/dialog';
import { Icon } from '@keystar/ui/icon';
import { alertTriangleIcon } from '@keystar/ui/icon/icons/alertTriangleIcon';
import { Content } from '@keystar/ui/slots';
import { Heading, Text } from '@keystar/ui/typography';

import { Config } from '../config';
import { useTree } from './shell/data';
import { serializeEntryToFiles } from './updating';
import {
  getCollectionFormat,
  getCollectionItemPath,
  getEntriesInCollectionWithTreeKey,
  getSlugFromState,
} from './utils';

// Wait this long after the last change before asking the site.
const DEBOUNCE_MS = 800;

/** The site's problems with an entry as it stands; empty when none or off. */
export function useEntryChecks(args: {
  config: Config;
  collection: string;
  state: Record<string, unknown>;
}): string[] {
  const { config, collection, state } = args;
  const checks = config.ui?.entryChecks;
  const collectionConfig = config.collections![collection];
  const tree = useTree().current;
  const slug = getSlugFromState(collectionConfig, state);

  const text = useMemo(() => {
    if (!checks) return '';
    const [file] = serializeEntryToFiles({
      basePath: getCollectionItemPath(config, collection, slug),
      format: getCollectionFormat(config, collection),
      schema: collectionConfig.schema,
      slug: { field: collectionConfig.slugField, value: slug },
      state,
    });
    return new TextDecoder().decode(file.contents);
  }, [checks, config, collection, collectionConfig, slug, state]);

  const slugs = useMemo(() => {
    const out: Record<string, string[]> = {};
    if (!checks?.slugsOf || tree.kind !== 'loaded') return out;
    for (const other of checks.slugsOf) {
      if (!config.collections?.[other]) continue;
      out[other] = getEntriesInCollectionWithTreeKey(
        config,
        other,
        tree.data.tree
      ).map(entry => entry.slug);
    }
    return out;
  }, [checks, config, tree]);

  const [problems, setProblems] = useState<string[]>([]);
  useEffect(() => {
    if (!checks) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(checks.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collection, slug, text, slugs }),
          signal: controller.signal,
        });
        if (!response.ok) {
          // The checker refusing the entry is itself the problem to show.
          setProblems([(await response.text()).slice(0, 300)]);
          return;
        }
        const body = await response.json();
        setProblems(
          Array.isArray(body?.problems) ? body.problems.map(String) : []
        );
      } catch {
        // Unreachable checker (offline, say): show nothing rather than
        // block writing; the checks after saving still run.
        if (!controller.signal.aborted) setProblems([]);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [checks, collection, slug, text, slugs]);

  return checks ? problems : [];
}

/** The badge beside Save: "2 problems", opening the list. */
export function EntryChecksBadge(props: { problems: string[] }) {
  const { problems } = props;
  if (!problems.length) return null;
  const label = `${problems.length} problem${problems.length === 1 ? '' : 's'}`;
  return (
    <DialogTrigger type="popover" mobileType="modal">
      <ActionButton
        prominence="low"
        aria-label={`${label} the site's checks found`}
      >
        <Icon src={alertTriangleIcon} color="caution" />
        <Text>{label}</Text>
      </ActionButton>
      <Dialog size="small">
        <Heading>What the site’s checks found</Heading>
        <Content>
          <ProblemList problems={problems} />
        </Content>
      </Dialog>
    </DialogTrigger>
  );
}

function ProblemList(props: { problems: string[] }) {
  return (
    <ul style={{ margin: 0, paddingInlineStart: '1.25em' }}>
      {props.problems.map((problem, i) => (
        <li key={i}>
          <Text>{problem}</Text>
        </li>
      ))}
    </ul>
  );
}

/**
 * Save, asking first when there are problems. Returns the press handler for
 * Save and the dialog to render; the dialog's "Save anyway" calls `save`.
 */
export function useCheckedSave(
  problems: string[],
  save: () => unknown
): { onSave: () => void; dialog: ReactElement } {
  const [asking, setAsking] = useState(false);
  return {
    onSave: () => (problems.length ? setAsking(true) : void save()),
    dialog: (
      <DialogContainer onDismiss={() => setAsking(false)}>
        {asking && (
          <AlertDialog
            title="Save with problems?"
            tone="neutral"
            cancelLabel="Keep editing"
            primaryActionLabel="Save anyway"
            autoFocusButton="cancel"
            onPrimaryAction={() => {
              setAsking(false);
              save();
            }}
          >
            <Text>The site’s checks found:</Text>
            <ProblemList problems={problems} />
          </AlertDialog>
        )}
      </DialogContainer>
    ),
  };
}
