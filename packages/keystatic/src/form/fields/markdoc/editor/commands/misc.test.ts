/** @vitest-environment jsdom */
// FORK (devinchaloux): tests for "inserting an inline component opens its
// form". See consumeAutoOpen in ./misc.ts.
import { expect, test } from 'vitest';
import { EditorState, NodeSelection, TextSelection } from 'prosemirror-state';
import { createEditorSchema } from '../schema';
import { editorOptionsToConfig } from '../../config';
import { inline, wrapper } from '../../../../../content-components';
import { fields } from '../../../../..';
import { consumeAutoOpen, insertNode } from './misc';

const editorSchema = createEditorSchema(
  editorOptionsToConfig({}),
  {
    cite: inline({
      label: 'Citation',
      schema: { key: fields.text({ label: 'Key' }) },
    }),
    bare: inline({ label: 'No fields', schema: {} }),
    aside: wrapper({ label: 'Aside', schema: {} }),
  },
  false
);
const { schema } = editorSchema;

function stateWithCursorInText() {
  const doc = schema.nodes.doc.create(
    null,
    schema.nodes.paragraph.create(null, schema.text('Hello'))
  );
  // Position 6 is the end of "Hello" inside the paragraph.
  return EditorState.create({
    doc,
    selection: TextSelection.create(doc, 6),
  });
}

function insert(name: string) {
  let next: EditorState | undefined;
  insertNode(schema.nodes[name])(stateWithCursorInText(), tr => {
    next = stateWithCursorInText().apply(tr);
  });
  return next!;
}

test('inserting an inline component selects it and arms the form', () => {
  consumeAutoOpen(undefined); // clear anything a previous test left behind
  const state = insert('cite');
  expect(state.selection).toBeInstanceOf(NodeSelection);
  expect((state.selection as NodeSelection).node.type.name).toBe('cite');
  // The popover reads the flag once: the first mount opens, later ones don't.
  expect(consumeAutoOpen({ key: {} })).toBe(true);
  expect(consumeAutoOpen({ key: {} })).toBe(false);
});

test('a component with no fields is selected but does not open a form', () => {
  insert('bare');
  expect(consumeAutoOpen({})).toBe(false);
});

test('a wrapper is left alone, so you can type inside it', () => {
  consumeAutoOpen(undefined);
  const state = insert('aside');
  expect(state.selection).not.toBeInstanceOf(NodeSelection);
  expect(consumeAutoOpen({ anything: {} })).toBe(false);
});
