// FORK (devinchaloux): tests for publish.tsx's pure parts.
import { expect, test } from 'vitest';
import {
  changesFromHeadlines,
  freeBranchName,
  jobChecks,
  publishMessage,
} from './publish';

test('changes are the entries the commits touched, once each, in order', () => {
  expect(
    changesFromHeadlines([
      'Update src/content/definitions/melodic-primacy',
      'Update src/content/definitions/edm-anthem',
      'Update src/content/definitions/melodic-primacy',
      'Delete src/content/notes/old-note',
    ])
  ).toEqual([
    'definitions/melodic-primacy',
    'definitions/edm-anthem',
    'notes/old-note',
  ]);
});

test("a commit Keystatic didn't write is listed as it reads", () => {
  expect(
    changesFromHeadlines(['chore(refs): rebuild the corpus ledger'])
  ).toEqual(['chore(refs): rebuild the corpus ledger']);
});

test('the merge message names the branch and lists the changes', () => {
  expect(publishMessage('writing/groove', ['definitions/groove'])).toBe(
    'Publish writing/groove\n\n- definitions/groove\n'
  );
  expect(publishMessage('writing/empty', [])).toBe('Publish writing/empty\n');
});

test('a branch name is numbered only when the name is taken', () => {
  const branches = new Map([
    ['writing/groove', {}],
    ['writing/groove-2', {}],
  ]);
  expect(freeBranchName('drop', 'writing/', branches)).toBe('drop');
  expect(freeBranchName('groove', 'writing/', branches)).toBe('groove-3');
});

// ── jobChecks: where the check job stands on a commit ─────────────────────────

const run = (
  name: string,
  status: string,
  conclusion: string | null,
  startedAt: string
) => ({ name, status, conclusion, startedAt });

test("the job hasn't run when no check run has its name", () => {
  expect(jobChecks([run('Vercel', 'COMPLETED', 'SUCCESS', '1')], 'build')).toBe(
    null
  );
  expect(jobChecks([], 'build')).toBe(null);
});

test('a job still going is running, whatever else has finished', () => {
  expect(
    jobChecks(
      [
        run('Vercel', 'COMPLETED', 'SUCCESS', '2026-11-22T10:00:00Z'),
        run('build', 'IN_PROGRESS', null, '2026-11-22T10:00:01Z'),
      ],
      'build'
    )
  ).toBe('running');
  expect(jobChecks([run('build', 'QUEUED', null, '')], 'build')).toBe(
    'running'
  );
});

test('a finished job passes or fails on its conclusion', () => {
  expect(jobChecks([run('build', 'COMPLETED', 'SUCCESS', '1')], 'build')).toBe(
    'passed'
  );
  expect(jobChecks([run('build', 'COMPLETED', 'FAILURE', '1')], 'build')).toBe(
    'failed'
  );
  expect(
    jobChecks([run('build', 'COMPLETED', 'TIMED_OUT', '1')], 'build')
  ).toBe('failed');
  expect(
    jobChecks([run('build', 'COMPLETED', 'CANCELLED', '1')], 'build')
  ).toBe('unknown');
});

test('after a re-run, the latest run counts', () => {
  expect(
    jobChecks(
      [
        run('build', 'COMPLETED', 'SUCCESS', '2026-11-22T10:05:00Z'),
        run('build', 'COMPLETED', 'FAILURE', '2026-11-22T10:00:00Z'),
      ],
      'build'
    )
  ).toBe('passed');
});
