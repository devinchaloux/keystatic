// FORK (devinchaloux): see picker.ts.
import { expect, test } from 'vitest';
import { relationshipPicker } from './picker';

const slugs = ['16', '10'];
const labels = new Map([
  ['16', 'Sandstorm — Darude (1999)'],
  ['10', 'Faded — Alan Walker (2015)'],
]);

test('lists entries by name once the names have loaded', () => {
  expect(relationshipPicker(slugs, labels, true)).toEqual({
    options: [
      { slug: '16', label: 'Sandstorm — Darude (1999)' },
      { slug: '10', label: 'Faded — Alan Walker (2015)' },
    ],
    loadingState: undefined,
  });
});

test('says it is loading while the names are still being read', () => {
  const picker = relationshipPicker(slugs, new Map(), false);
  expect(picker.loadingState).toBe('loading');
  // The slugs stand in meanwhile, so nothing is missing from the list.
  expect(picker.options.map(o => o.label)).toEqual(['16', '10']);
});

test('an entry whose file could not be read keeps its slug', () => {
  const picker = relationshipPicker(slugs, new Map([['16', 'Sandstorm']]), true);
  expect(picker.options[1]).toEqual({ slug: '10', label: '10' });
});

test('an empty collection is not loading', () => {
  expect(relationshipPicker([], new Map(), false).loadingState).toBeUndefined();
});
