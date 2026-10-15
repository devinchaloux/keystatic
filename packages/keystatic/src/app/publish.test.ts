// FORK (devinchaloux): tests for publish.tsx's pure parts.
import { expect, test } from 'vitest';
import {
  changesFromHeadlines,
  freeBranchName,
  publishMessage,
} from './publish';

test('changes are the entries the commits touched, once each, in order', () => {
  expect(
    changesFromHeadlines([
      'Update src/content/definitions/melodic-primacy',
      'Update src/content/definitions/edm-anthem',
      'Update src/content/definitions/melodic-primacy',
      'Delete src/content/notes/old-note',
    ])
  ).toEqual([
    'definitions/melodic-primacy',
    'definitions/edm-anthem',
    'notes/old-note',
  ]);
});

test("a commit Keystatic didn't write is listed as it reads", () => {
  expect(
    changesFromHeadlines(['chore(refs): rebuild the corpus ledger'])
  ).toEqual(['chore(refs): rebuild the corpus ledger']);
});

test('the merge message names the branch and lists the changes', () => {
  expect(publishMessage('writing/groove', ['definitions/groove'])).toBe(
    'Publish writing/groove\n\n- definitions/groove\n'
  );
  expect(publishMessage('writing/empty', [])).toBe('Publish writing/empty\n');
});

test('a branch name is numbered only when the name is taken', () => {
  const branches = new Map([
    ['writing/groove', {}],
    ['writing/groove-2', {}],
  ]);
  expect(freeBranchName('drop', 'writing/', branches)).toBe('drop');
  expect(freeBranchName('groove', 'writing/', branches)).toBe('groove-3');
});
