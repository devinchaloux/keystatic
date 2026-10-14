// FORK (devinchaloux): tests for collection-table.ts.
import { expect, test } from 'vitest';
import {
  SLUG_COLUMN,
  cellDisplay,
  eligibleColumns,
  filterGroups,
  passesFilters,
  toggleFilter,
  visibleColumns,
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

test('cells: a list shows its items; an empty list shows nothing', () => {
  expect(cellDisplay(['edm', 'methodology'], 'Tags', 'en-US')).toEqual({
    kind: 'text',
    text: 'edm, methodology',
  });
  expect(cellDisplay([], 'Tags', 'en-US')).toEqual({ kind: 'empty' });
});

test('columns: only single-valued form fields can be shown', () => {
  const schema = {
    title: { kind: 'form', formKind: 'slug' },
    date: { kind: 'form' },
    content: { kind: 'form', formKind: 'content' },
    image: { kind: 'form', formKind: 'asset' },
    sections: { kind: 'array' },
  };
  expect(eligibleColumns(schema)).toEqual(['title', 'date']);
});

test("columns: the person's choice, in schema order, else the config's", () => {
  const eligible = ['title', 'date', 'updatedDate', 'draft', 'tags'];
  expect(
    visibleColumns(['tags', 'title'], ['title', 'date'], eligible)
  ).toEqual(['title', 'tags']);
  expect(visibleColumns(null, ['title', 'date'], eligible)).toEqual([
    'title',
    'date',
  ]);
  // A remembered column that no longer exists can't empty the table.
  expect(visibleColumns(['gone'], ['title'], eligible)).toEqual(['title']);
});

const rows = [
  {
    title: 'Drop',
    date: '2026-09-06',
    draft: true,
    tags: ['edm'],
    status: 'open',
  },
  {
    title: 'Groove',
    date: '2026-10-01',
    draft: false,
    tags: ['edm', 'methodology'],
    status: 'open',
  },
  {
    title: 'Hook',
    date: '2026-10-02',
    draft: true,
    tags: [],
    status: 'parked',
  },
  {
    title: 'Riser',
    date: '2026-10-03',
    draft: false,
    tags: ['methodology'],
    status: 'open',
  },
];
const labelOf = (field: string) =>
  ({ draft: 'Draft', tags: 'Tags', status: 'Status' })[field] ?? field;

test('filters come from the data: checkboxes, list items, short pick-lists', () => {
  const groups = filterGroups(
    ['title', 'date', 'draft', 'tags', 'status'],
    labelOf,
    rows,
    'title'
  );
  expect(groups.map(g => g.field)).toEqual(['draft', 'tags', 'status']);
  expect(groups[0].options.map(o => o.label)).toEqual(['Draft', 'Not draft']);
  expect(groups[1].options.map(o => o.label)).toEqual(['edm', 'methodology']);
  expect(groups[2].options.map(o => o.label)).toEqual(['open', 'parked']);
});

test('filters: all must hold; a list matches if it contains the value', () => {
  const draft = { field: 'draft', value: true };
  const edm = { field: 'tags', value: 'edm' };
  expect(rows.filter(r => passesFilters(r, [draft])).map(r => r.title)).toEqual(
    ['Drop', 'Hook']
  );
  expect(
    rows.filter(r => passesFilters(r, [draft, edm])).map(r => r.title)
  ).toEqual(['Drop']);
  // A checkbox never set counts as off.
  expect(passesFilters({}, [{ field: 'draft', value: false }])).toBe(true);
});

test('toggling: again turns off; a new value replaces; list filters add up', () => {
  const draft = { field: 'draft', value: true };
  const notDraft = { field: 'draft', value: false };
  expect(toggleFilter([draft], draft, false)).toEqual([]);
  expect(toggleFilter([draft], notDraft, false)).toEqual([notDraft]);
  const edm = { field: 'tags', value: 'edm' };
  const method = { field: 'tags', value: 'methodology' };
  expect(toggleFilter([edm], method, true)).toEqual([edm, method]);
});
