// FORK (devinchaloux): tests for collection-table.ts.
import { expect, test } from 'vitest';
import {
  SLUG_COLUMN,
  cellDisplay,
  defaultSort,
  findDateColumn,
  matchesSearch,
  showSlugColumn,
} from './collection-table';

test('the slug column is dropped when the slug field is already shown', () => {
  expect(showSlugColumn(['title', 'date'], 'title')).toBe(false);
  expect(showSlugColumn(['date'], 'title')).toBe(true);
});

test('a date column is found from the values, and only all-date columns count', () => {
  const rows = [
    { title: 'Drop', date: '2026-09-06', draft: true },
    { title: 'Groove', date: '2026-10-01', draft: false },
    { title: 'Missing', date: undefined },
  ];
  expect(findDateColumn(['title', 'date', 'draft'], rows)).toBe('date');
  expect(findDateColumn(['title'], rows)).toBeUndefined();
  expect(findDateColumn(['date'], [undefined, { date: '' }])).toBeUndefined();
});

test('default sort: newest first, else by the leading column, else by slug', () => {
  expect(defaultSort(['title', 'date'], 'title', 'date')).toEqual({
    column: 'date',
    direction: 'descending',
  });
  expect(defaultSort(['label', 'recordNumber'], 'label', undefined)).toEqual({
    column: 'label',
    direction: 'ascending',
  });
  expect(defaultSort([], 'title', undefined)).toEqual({
    column: SLUG_COLUMN,
    direction: 'ascending',
  });
});

test('search reaches every shown column, ignoring case', () => {
  const data = { label: 'Sandstorm — Darude (1999)', recordNumber: 16 };
  expect(matchesSearch('16', data, ['label', 'recordNumber'], 'darude')).toBe(
    true
  );
  expect(matchesSearch('16', data, ['label'], '16')).toBe(true);
  expect(matchesSearch('16', data, ['label'], 'skrillex')).toBe(false);
  expect(matchesSearch('16', data, ['label'], '  ')).toBe(true);
});

test('cells: on-checkboxes become badges, off ones vanish, dates read as dates', () => {
  expect(cellDisplay(true, 'Draft', 'en-US')).toEqual({
    kind: 'badge',
    text: 'Draft',
  });
  expect(cellDisplay(false, 'Draft', 'en-US')).toEqual({ kind: 'empty' });
  expect(cellDisplay('2026-09-06', 'Date', 'en-US')).toEqual({
    kind: 'text',
    text: 'Sep 6, 2026',
  });
  expect(cellDisplay(16, 'Record number', 'en-US')).toEqual({
    kind: 'text',
    text: '16',
  });
  expect(cellDisplay(null, 'Date', 'en-US')).toEqual({ kind: 'empty' });
});
