// FORK (devinchaloux): several starting points for a new entry.
//
// Upstream lets a collection name one `template`, an entry new ones start
// from. `ui.templates` gives a collection several, each a stored entry with a
// label: the collection's Add button becomes a menu (Blank first, then each
// template), and `…/create?template=<key>` starts the new entry from that one.
// The key is the template's label as a slug, so a link reads `?template=talk`.

import { Config } from '../config';

export type EntryTemplate = {
  /** The menu item, e.g. "Talk". */
  label: string;
  /** The template entry's directory, as for a collection's `template`. */
  path: string;
  /** A line under the label in the menu. */
  description?: string;
};

/** A template's key in the create address: its label, lowercased, hyphenated. */
export function templateKey(template: Pick<EntryTemplate, 'label'>): string {
  return template.label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** The templates a collection offers, in the order the config lists them. */
export function templatesFor(
  config: Pick<Config, 'ui'>,
  collection: string
): EntryTemplate[] {
  const all = config.ui?.templates as
    | Record<string, EntryTemplate[] | undefined>
    | undefined;
  return all?.[collection] ?? [];
}

/** The template the create address names, or undefined for none or an unknown key. */
export function chosenTemplate(
  config: Pick<Config, 'ui'>,
  collection: string,
  key: string | null
): EntryTemplate | undefined {
  if (!key) return undefined;
  return templatesFor(config, collection).find(t => templateKey(t) === key);
}
