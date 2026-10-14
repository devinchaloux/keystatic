// FORK (devinchaloux): tests for reference-menu.tsx's text rule.
import { expect, test } from 'vitest';
import { inSentence } from './reference-menu';

test('a title goes into a sentence lower-cased, an acronym does not', () => {
  expect(inSentence('Melodic primacy')).toBe('melodic primacy');
  expect(inSentence('EDM anthem')).toBe('EDM anthem');
  expect(inSentence('anthemic resonance')).toBe('anthemic resonance');
  expect(inSentence('A')).toBe('A');
});
