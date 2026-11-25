import { expect, test } from 'vitest';

import { writingBranches } from './writing-branches';

const branches = new Map([
  ['main', { committedAt: '2026-11-24T10:00:00Z' }],
  ['writing/old-essay', { committedAt: '2026-11-10T09:00:00Z' }],
  ['writing/new-note', { committedAt: '2026-11-23T18:30:00Z' }],
  ['dependabot/npm', { committedAt: '2026-11-24T08:00:00Z' }],
]);

test('lists branches under the prefix, newest first, without the default branch', () => {
  expect(writingBranches(branches, 'main', 'writing/')).toEqual([
    { name: 'writing/new-note', updatedAt: '2026-11-23T18:30:00Z' },
    { name: 'writing/old-essay', updatedAt: '2026-11-10T09:00:00Z' },
  ]);
});

test('with no prefix, every branch but the default one counts', () => {
  expect(writingBranches(branches, 'main', undefined).map(b => b.name)).toEqual(
    ['dependabot/npm', 'writing/new-note', 'writing/old-essay']
  );
});

test('no branches gives an empty list', () => {
  expect(writingBranches(new Map(), 'main', 'writing/')).toEqual([]);
});
