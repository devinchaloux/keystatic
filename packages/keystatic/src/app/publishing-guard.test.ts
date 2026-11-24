import { expect, test } from 'vitest';

import { needsWritingBranch } from './publishing-guard';

const base = {
  storageKind: 'github' as const,
  publishing: true,
  branch: 'main',
  defaultBranch: 'main',
};

test('the default branch needs a writing branch when publishing is on', () => {
  expect(needsWritingBranch(base)).toBe(true);
});

test('a writing branch commits directly', () => {
  expect(needsWritingBranch({ ...base, branch: 'writing/essay' })).toBe(false);
});

test('without publishing, the default branch commits directly', () => {
  expect(needsWritingBranch({ ...base, publishing: false })).toBe(false);
});

test('local and cloud storage are never redirected', () => {
  expect(needsWritingBranch({ ...base, storageKind: 'local' })).toBe(false);
  expect(needsWritingBranch({ ...base, storageKind: 'cloud' })).toBe(false);
});

test('an unknown default branch is never redirected', () => {
  expect(needsWritingBranch({ ...base, defaultBranch: undefined })).toBe(false);
});
