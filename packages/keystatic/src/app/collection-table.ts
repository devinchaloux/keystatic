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
