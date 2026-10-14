// FORK (devinchaloux): type `[[` to reference an entry without leaving the
// sentence.
//
// Typing `[[melod` opens a list of the configured collection's entries
// (definitions, say) matching "melod", by name. Choosing one inserts the
// configured inline component (a `term`) pointing at it, with the typed words
// as its display text, or the entry's name if nothing was typed. The last
// option parks the words instead: the component goes in pointing at nothing
// yet, a promise of a piece to write, which a site can list and fill later.
//
// Configured by `ui.referenceShortcut`; without it, `[[` is ordinary text.
// Built on the same autocomplete decoration as the `/` insert menu.

import { Text } from '@keystar/ui/typography';
import { matchSorter } from 'match-sorter';
import { Command } from 'prosemirror-state';
import { useContext, useEffect, useMemo } from 'react';

import { ConfigContext } from '../../../../../app/shell/context';
import { useEntryLabels } from '../../../../../app/useEntryLabels';
import { getInitialPropsValue } from '../../../../initial-values';
import {
  useEditorDispatchCommand,
  useEditorSchema,
  useEditorState,
  useEditorViewRef,
} from '../editor-view';
import { InputRule } from '../inputrules/inputrules';
import { toSerialized } from '../props-serialization';
import {
  addAutocompleteDecoration,
  removeAutocompleteDecoration,
  removeAutocompleteDecorationAndContent,
} from './decoration';
import { EditorAutocomplete } from './autocomplete';
import { Item } from './EditorListbox';

export const referenceMenuInputRule: InputRule = {
  pattern: /\[\[$/,
  handler(state, _match, _start, end) {
    // The decoration covers both brackets; the query is what follows.
    return addAutocompleteDecoration(
      state.tr,
      ReferenceMenu,
      end - 2,
      end,
      undefined
    );
  },
};

type Option = {
  id: string;
  label: string;
  description?: string;
  /** The entry to point at, or null to park. */
  slug: string | null;
  text: string;
};

const PARK = '@@park';

/**
 * An entry's name as it sits mid-sentence: "Melodic primacy" → "melodic
 * primacy". A leading capital followed by a capital ("EDM anthem") is an
 * acronym or a proper name, and stays.
 */
export function inSentence(name: string) {
  return /^[A-Z][a-z]/.test(name)
    ? name[0].toLowerCase() + name.slice(1)
    : name;
}

function ReferenceMenu(props: { query: string; from: number; to: number }) {
  const shortcut = useContext(ConfigContext)?.ui?.referenceShortcut;
  const viewRef = useEditorViewRef();
  const dispatchCommand = useEditorDispatchCommand();
  const schema = useEditorSchema();
  const editorState = useEditorState();
  const labels = useEntryLabels(shortcut?.collection ?? '');
  // The decoration's text after its first character: "[" plus the query.
  const typed = props.query.replace(/^\[/, '');
  const query = typed.trim();

  const component = shortcut ? schema.components[shortcut.component] : null;
  const nodeType = shortcut ? schema.schema.nodes[shortcut.component] : null;

  // Not configured (or misconfigured): `[[` is just text.
  useEffect(() => {
    if (!component || !nodeType) {
      viewRef.current?.dispatch(removeAutocompleteDecoration(editorState.tr));
    }
  }, [component, nodeType, viewRef, editorState]);

  // The entries arrive a moment after `[[` opens. Offer nothing until they
  // do: otherwise "Park" is the only option at first, takes the keyboard
  // focus, keeps it when the matches arrive, and Enter parks the fragment.
  const loaded = labels.size > 0;

  const options = useMemo((): Option[] => {
    if (!loaded) return [];
    const entries = [...labels].map(([slug, name]) => ({ slug, name }));
    const matches = query
      ? matchSorter(entries, query, { keys: ['name', 'slug'] })
      : entries.sort((a, b) => a.name.localeCompare(b.name));
    const found: Option[] = matches.slice(0, 12).map(({ slug, name }) => ({
      id: slug,
      label: name,
      slug,
      // The entry's name, not the fragment typed to find it.
      text: inSentence(name),
    }));
    const exact = matches.some(
      ({ name }) => name.toLowerCase() === query.toLowerCase()
    );
    if (query && !exact) {
      found.push({
        id: PARK,
        label: `Park “${query}”`,
        description: 'Not written yet: plain text until you pick one',
        slug: null,
        text: query,
      });
    }
    return found;
  }, [labels, loaded, query]);

  if (!shortcut || !component || !nodeType) return null;

  const insert =
    (option: Option): Command =>
    (state, dispatch) => {
      const cleared = removeAutocompleteDecorationAndContent(state);
      if (!cleared) return false;
      const value = getInitialPropsValue({
        kind: 'object',
        fields: component.schema,
      }) as Record<string, unknown>;
      value[shortcut.entryField] = option.slug;
      value[shortcut.textField] = option.text;
      const node = nodeType.create({
        props: toSerialized(value, component.schema),
      });
      if (dispatch) dispatch(cleared.replaceSelectionWith(node, false));
      return true;
    };

  return (
    <EditorAutocomplete
      // A fresh list whenever the options change, so the keyboard focus is
      // always on the best match. The list focuses its first item only when
      // it mounts; as typing narrows it, a focused item that drops out passes
      // focus to the last one, which is "Park", and Enter would park the
      // fragment instead of picking the definition.
      key={options.map(o => o.id).join('|')}
      from={props.from}
      to={props.to}
      aria-label="Reference"
      items={options}
      children={option => (
        <Item key={option.id} textValue={option.label}>
          <Text>{option.label}</Text>
          {option.description && (
            <Text slot="description">{option.description}</Text>
          )}
        </Item>
      )}
      onEscape={() => {
        // Escape leaves the typed `[[…` as text, as the `/` menu does.
        viewRef.current?.dispatch(removeAutocompleteDecoration(editorState.tr));
      }}
      onAction={key => {
        const option = options.find(o => o.id === key);
        if (option) dispatchCommand(insert(option));
      }}
    />
  );
}
