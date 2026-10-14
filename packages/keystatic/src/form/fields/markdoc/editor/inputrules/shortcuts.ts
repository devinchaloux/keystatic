export const shortcuts: Record<string, string> = {
  '...': '…',
  '-->': '→',
  '->': '→',
  '<-': '←',
  '<--': '←',
  '--': '–',
  '(c)': '©',
  '(r)': '®',
  '(tm)': '™',
};

export const simpleMarkShortcuts = new Map([
  ['bold', ['**', '__']],
  ['italic', ['*', '_']],
  ['strikethrough', ['~~']],
  ['code', ['`']],
] as const);

// FORK (devinchaloux): closed dashes, typed as two hyphens. The rules above
// fire on a following space, so "melody--not", written closed as the site
// writes it, never became a dash. This fires on the character after the
// hyphens: an em dash between words ("melody—not"), an en dash between
// numbers ("2004–06"). Ctrl+Z gives the hyphens back. Arrows ("<--",
// "-->") are left to the rules above.
export const closedDashPattern = /([^\s<-])--([^\s>-])$/;

export function closedDash(before: string, after: string): string {
  return /\d/.test(before) && /\d/.test(after) ? '–' : '—';
}
