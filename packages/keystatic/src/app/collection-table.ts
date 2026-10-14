// FORK (devinchaloux): how a collection's table reads. Pure, so it is tested
// (collection-table.test.ts) apart from the React that renders it.
//
// Upstream lists every entry by its slug first, then the configured columns
// as raw strings: a definition shows `accumulative-form` beside "Accumulative
// form", a draft reads `true`, a date `2026-09-06`, and the order is the
// slug's. These helpers make the table lead with what a person recognises.

export const SLUG_COLUMN = '@@slug';

/** Matches the value a `fields.date` stores; nothing else stores this shape. */
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Whether the table needs its own Slug column. Not when the slug field is
 * already a column: a slug is derived from that field's text, so showing
 * both repeats the title in kebab case. Its column then leads the row.
 */
export function showSlugColumn(columns: readonly string[], slugField: string) {
  return !columns.includes(slugField);
}

/** The first column whose loaded values are all dates, if any. */
export function findDateColumn(
  columns: readonly string[],
  rows: readonly (Record<string, unknown> | undefined)[]
): string | undefined {
  return columns.find(column => {
    let seen = false;
    for (const row of rows) {
      const value = row?.[column];
      if (value == null || value === '') continue;
      if (typeof value !== 'string' || !DATE.test(value)) return false;
      seen = true;
    }
    return seen;
  });
}

export type Sort = {
  column: string;
  direction: 'ascending' | 'descending';
};

/**
 * Where a table starts when the person hasn't chosen: newest first when there
 * is a date column (what was just written is what gets reopened), otherwise
 * alphabetical by the column that leads the row.
 */
export function defaultSort(
  columns: readonly string[],
  slugField: string,
  dateColumn: string | undefined
): Sort {
  if (dateColumn) return { column: dateColumn, direction: 'descending' };
  if (!showSlugColumn(columns, slugField)) {
    return { column: slugField, direction: 'ascending' };
  }
  return { column: SLUG_COLUMN, direction: 'ascending' };
}

/** Search the slug and every shown column, not the slug alone. */
export function matchesSearch(
  slug: string,
  data: Record<string, unknown> | undefined,
  columns: readonly string[],
  term: string
) {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  if (slug.toLowerCase().includes(needle)) return true;
  return columns.some(column => {
    const value = data?.[column];
    return value != null && String(value).toLowerCase().includes(needle);
  });
}

export type CellDisplay =
  | { kind: 'empty' }
  | { kind: 'badge'; text: string }
  | { kind: 'text'; text: string };

/**
 * How one value shows in the table. A checkbox that is on becomes a badge
 * carrying the column's name ("Draft"), and one that is off shows nothing,
 * so the exceptions stand out instead of a column of true/false. A date
 * reads as a date.
 */
export function cellDisplay(
  value: unknown,
  columnLabel: string,
  locale: string
): CellDisplay {
  if (value == null || value === '' || value === false) {
    return { kind: 'empty' };
  }
  if (value === true) return { kind: 'badge', text: columnLabel };
  // A list (tags, a multi-select): its items, comma-separated.
  if (Array.isArray(value)) {
    const items = value.filter(item => item != null && item !== '');
    return items.length
      ? { kind: 'text', text: items.join(', ') }
      : { kind: 'empty' };
  }
  if (typeof value === 'string' && DATE.test(value)) {
    // UTC on both sides, so the day never shifts with the reader's timezone.
    const date = new Date(`${value}T00:00:00Z`);
    if (!Number.isNaN(date.getTime())) {
      return {
        kind: 'text',
        text: new Intl.DateTimeFormat(locale, {
          dateStyle: 'medium',
          timeZone: 'UTC',
        }).format(date),
      };
    }
  }
  return { kind: 'text', text: String(value) };
}

// ── Remembering the person's sort ────────────────────────────────────────────

const storageKey = (collection: string) => `keystatic-fork:sort:${collection}`;

export function loadSort(collection: string): Sort | null {
  try {
    const raw = localStorage.getItem(storageKey(collection));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.column === 'string' &&
      (parsed.direction === 'ascending' || parsed.direction === 'descending')
    ) {
      return parsed;
    }
  } catch {
    // Storage blocked or the value is corrupt: fall back to the default.
  }
  return null;
}

export function saveSort(collection: string, sort: Sort) {
  try {
    localStorage.setItem(storageKey(collection), JSON.stringify(sort));
  } catch {
    // Storage blocked: the sort still applies, it just isn't remembered.
  }
}

// ── Choosing columns ─────────────────────────────────────────────────────────

type FieldLike = { kind: string; formKind?: string; label?: string };

/**
 * The fields a table can show: single-valued form fields (text, dates,
 * checkboxes, selects, numbers, pickers, the slug field). Content, images
 * and nested lists or objects don't fit in a cell.
 */
export function eligibleColumns(schema: Record<string, FieldLike>): string[] {
  return Object.keys(schema).filter(key => {
    const field = schema[key];
    return (
      field.kind === 'form' &&
      (field.formKind === undefined || field.formKind === 'slug')
    );
  });
}

/**
 * The columns to show: the person's choice, kept to fields that still exist
 * and in the schema's order; else the config's `columns`. Never empty.
 */
export function visibleColumns(
  chosen: readonly string[] | null,
  configured: readonly string[],
  eligible: readonly string[]
): string[] {
  if (chosen) {
    const kept = eligible.filter(key => chosen.includes(key));
    if (kept.length) return kept;
  }
  return [...configured];
}

// ── Filters ──────────────────────────────────────────────────────────────────

/** One active filter: the field, and the value a row must have (or contain). */
export type Filter = { field: string; value: string | boolean };

export type FilterGroup = {
  field: string;
  label: string;
  options: { key: string; label: string; filter: Filter }[];
};

/** A stable key for a filter, for menus and chips. */
export function filterKey(filter: Filter) {
  return JSON.stringify([filter.field, filter.value]);
}

/** A pick-list has few distinct values; past this it's free text, not a category. */
const MAX_CATEGORIES = 24;

/**
 * Filters the data can support, built from the values actually present:
 * a checkbox gives "Draft" / "Not draft"; a list (tags) gives each item; a
 * short text field with few distinct values (a status) gives each value.
 * Dates, numbers, the slug field and free text give none.
 */
export function filterGroups(
  columns: readonly string[],
  labelOf: (field: string) => string,
  rows: readonly (Record<string, unknown> | undefined)[],
  slugField: string
): FilterGroup[] {
  const groups: FilterGroup[] = [];
  for (const field of columns) {
    if (field === slugField) continue;
    const label = labelOf(field);
    const values = rows
      .map(row => row?.[field])
      .filter(value => value != null && value !== '');
    if (!values.length) continue;

    if (values.every(value => typeof value === 'boolean')) {
      const options = [true, false].map(value => {
        const filter = { field, value };
        return {
          key: filterKey(filter),
          label: value ? label : `Not ${label.toLowerCase()}`,
          filter,
        };
      });
      groups.push({ field, label, options });
      continue;
    }

    let distinct: string[] = [];
    if (values.every(value => Array.isArray(value))) {
      distinct = [...new Set((values as unknown[][]).flat().map(String))];
    } else if (
      values.every(value => typeof value === 'string' && !DATE.test(value))
    ) {
      distinct = [...new Set(values as string[])];
      // Every row different (titles, notes) means free text, not a category.
      if (distinct.length === values.length && values.length > 3) continue;
    } else {
      continue;
    }
    if (!distinct.length || distinct.length > MAX_CATEGORIES) continue;
    distinct.sort((a, b) => a.localeCompare(b));
    groups.push({
      field,
      label,
      options: distinct.map(value => {
        const filter = { field, value };
        return { key: filterKey(filter), label: value, filter };
      }),
    });
  }
  return groups;
}

/** Whether a row passes every filter: all must hold (AND). */
export function passesFilters(
  data: Record<string, unknown> | undefined,
  filters: readonly Filter[]
) {
  return filters.every(({ field, value }) => {
    const actual = data?.[field];
    if (Array.isArray(actual)) {
      return actual.map(String).includes(String(value));
    }
    if (typeof value === 'boolean') return (actual ?? false) === value;
    return actual === value;
  });
}

/**
 * Choosing a filter: the same one again turns it off; another value for a
 * field already filtered replaces it, since a row has one value per field.
 * A list field (tags) can hold several, so its filters add up instead.
 */
export function toggleFilter(
  filters: readonly Filter[],
  next: Filter,
  isListField: boolean
): Filter[] {
  const key = filterKey(next);
  if (filters.some(filter => filterKey(filter) === key)) {
    return filters.filter(filter => filterKey(filter) !== key);
  }
  return [
    ...filters.filter(filter => isListField || filter.field !== next.field),
    next,
  ];
}

// ── Remembering the person's columns ─────────────────────────────────────────

const columnsKey = (collection: string) =>
  `keystatic-fork:columns:${collection}`;

export function loadColumns(collection: string): string[] | null {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(columnsKey(collection)) ?? 'null'
    );
    return Array.isArray(parsed) && parsed.every(x => typeof x === 'string')
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function saveColumns(collection: string, columns: readonly string[]) {
  try {
    localStorage.setItem(columnsKey(collection), JSON.stringify(columns));
  } catch {
    // Storage blocked: the choice applies, it just isn't remembered.
  }
}
