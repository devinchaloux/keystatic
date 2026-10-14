/** @vitest-environment jsdom */
/** @jsxRuntime classic */
/** @jsx jsx */
import { expect, test } from 'vitest';
import { jsx, renderEditor, undo } from './utils';

// FORK (devinchaloux): the closed-dash rule in inputrules/shortcuts.ts.

function typed(before: string) {
  const { state, user } = renderEditor(
    <doc>
      <paragraph>
        <text>
          {before}
          <cursor />
        </text>
      </paragraph>
    </doc>
  );
  return { state, user };
}

const paragraph = (text: string) => (
  <doc>
    <paragraph>
      <text>
        {text}
        <cursor />
      </text>
    </paragraph>
  </doc>
);

test('two hyphens between words become an em dash', async () => {
  const { state, user } = typed('melody--');
  await user.keyboard('n');
  expect(state()).toEqual(paragraph('melody—n'));
});

test('between numbers they become an en dash', async () => {
  const { state, user } = typed('2004--');
  await user.keyboard('6');
  expect(state()).toEqual(paragraph('2004–6'));
});

test('undo gives the hyphens back', async () => {
  const { state, user } = typed('melody--');
  await user.keyboard('n');
  await undo(user);
  expect(state()).toEqual(paragraph('melody--n'));
});

test('three hyphens are left alone', async () => {
  const { state, user } = typed('a--');
  await user.keyboard('-');
  expect(state()).toEqual(paragraph('a---'));
});

test('an arrow is left to the arrow shortcut', async () => {
  const { state, user } = typed('a--');
  await user.keyboard('>');
  expect(state()).toEqual(paragraph('a-->'));
});
