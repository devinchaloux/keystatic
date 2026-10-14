// FORK (devinchaloux): a pasted URL can become a component.
//
// A site's `ui.onPasteUrl` looks at a URL pasted on its own into prose and
// may answer with a component and some of its values: a YouTube link with a
// timestamp becomes a music example with its ID and start filled in. The
// component goes in where the cursor was, selected, with its form open for
// whatever the URL couldn't say (the track, the artist). Anything the
// handler declines is pasted as before (a link, or plain text).
//
// The editor's plugins are built before it can see the config, so the app's
// provider hands the handler over here (setPasteUrlHandler) and the plugin
// reads it at paste time.

import { NodeSelection, Plugin } from 'prosemirror-state';
import { getInitialPropsValue } from '../../../initial-values';
import { armAutoOpen } from './commands/misc';
import { toSerialized } from './props-serialization';
import { EditorSchema } from './schema';

export type PasteUrlHandler = (
  url: string
) => { component: string; props: Record<string, unknown> } | null | undefined;

let handler: PasteUrlHandler | undefined;

export function setPasteUrlHandler(next: PasteUrlHandler | undefined) {
  handler = next;
}

const singleUrl = /^https?:\/\/\S+$/;

export function pasteUrlComponents(schema: EditorSchema) {
  return new Plugin({
    props: {
      handlePaste(view, event) {
        const plain = event.clipboardData?.getData('text/plain')?.trim();
        if (!handler || !plain || !singleUrl.test(plain)) return false;
        const result = handler(plain);
        if (!result) return false;
        const component = schema.components[result.component];
        const nodeType = schema.schema.nodes[result.component];
        if (!component || component.kind !== 'inline' || !nodeType) {
          return false;
        }
        const value = {
          ...(getInitialPropsValue({
            kind: 'object',
            fields: component.schema,
          }) as Record<string, unknown>),
          ...result.props,
        };
        const node = nodeType.create({
          props: toSerialized(value, component.schema),
        });
        const tr = view.state.tr.replaceSelectionWith(node, false);
        const pos = tr.selection.from - node.nodeSize;
        if (pos >= 0 && tr.doc.nodeAt(pos)?.type === nodeType) {
          tr.setSelection(NodeSelection.create(tr.doc, pos));
          armAutoOpen();
        }
        view.dispatch(tr.scrollIntoView());
        return true;
      },
    },
  });
}
