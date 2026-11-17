// FORK (devinchaloux): what a relationship picker lists, and whether it is
// still waiting for the names.
//
// Pickers list entries by name (`useEntryLabels`), but the names are read from
// each entry's file, after the picker has its slugs. Until they arrive an
// option's text is its slug, so a search typed straight away ("darude" for
// `16.yaml`) matched nothing and the menu closed; react-stately reopens it
// only on the next keystroke, so the names arriving changed nothing on
// screen. While the names load, the picker is an async combobox: its menu
// stays open on "Loading…" and fills in when they land.

export type PickerOption = { slug: string; label: string };

export function relationshipPicker(
  slugs: readonly string[],
  labels: ReadonlyMap<string, string>,
  labelsLoaded: boolean
): { options: PickerOption[]; loadingState: 'loading' | undefined } {
  return {
    options: slugs.map(slug => ({ slug, label: labels.get(slug) ?? slug })),
    // Only while there is something to name: an empty collection isn't loading.
    loadingState: !labelsLoaded && slugs.length > 0 ? 'loading' : undefined,
  };
}
