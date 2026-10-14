import { expect, test } from 'vitest';
import { countWords } from './word-count';

test('counts words as they read', () => {
  expect(countWords('')).toBe(0);
  expect(countWords('   ')).toBe(0);
  expect(countWords('The anthem is the hook.')).toBe(5);
});

test('keeps apostrophes and hyphens inside a word', () => {
  expect(countWords("don't stop the drum-and-bass")).toBe(4);
  expect(countWords('it’s fine')).toBe(2);
});

test('ignores punctuation and dashes between words', () => {
  expect(countWords('melody — not the drop… (really)')).toBe(5);
  expect(countWords('2004, 45')).toBe(2);
});

test('counts letters beyond ASCII', () => {
  expect(countWords('Café Ünter naïve')).toBe(3);
});
