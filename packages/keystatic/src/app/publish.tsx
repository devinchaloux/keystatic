// FORK (devinchaloux): Publish — a writing branch goes live in one press.
//
// With `ui.publishing` in the config, saving on the default branch asks for
// a writing branch instead (updating.tsx), so nothing reaches the live site
// by accident. This is the other half: on a writing branch, the sidebar has
// a Publish button. Pressed, it says what will go live and whether the
// site's checks passed, then merges the branch into the default branch and
// deletes it.
//
// It merges with GitHub's `mergeBranch`, not a pull request, because that
// needs only the permission saving already uses (contents: write); the
// Keystatic GitHub App holds pull requests read-only. The merge commit
// names the branch and every entry it changed, so the default branch's
// history reads as a list of publications.

import { gql } from '@ts-gql/tag/no-transform';
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'urql';

import { Button, ButtonGroup } from '@keystar/ui/button';
import { Dialog, DialogContainer } from '@keystar/ui/dialog';
import { Icon } from '@keystar/ui/icon';
import { uploadCloudIcon } from '@keystar/ui/icon/icons/uploadCloudIcon';
import { Flex } from '@keystar/ui/layout';
import { Notice } from '@keystar/ui/notice';
import { ProgressCircle } from '@keystar/ui/progress';
import { Content } from '@keystar/ui/slots';
import { Heading, Text } from '@keystar/ui/typography';

import { useRouter } from './router';
import { useConfig } from './shell/context';
import { useBranches, useCurrentBranch, useRepoInfo } from './shell/data';
import { getRepoUrl } from './utils';

// ── What the branch holds ────────────────────────────────────────────────────

/**
 * The entries a branch changed, from its commits' headlines: Keystatic
 * writes "Update <path>" and "Delete <path>"; anything else (a bot's
 * commit) is listed as it reads. In order of first change, without repeats.
 */
export function changesFromHeadlines(headlines: string[]): string[] {
  const seen = new Set<string>();
  for (const headline of headlines) {
    const match = /^(?:Update|Delete) (.+)$/.exec(headline);
    seen.add(match ? match[1].replace(/^src\/content\//, '') : headline);
  }
  return [...seen];
}

/** The merge commit's message: what was published, and from where. */
export function publishMessage(branch: string, changes: string[]) {
  const headline = `Publish ${branch}`;
  return changes.length
    ? `${headline}\n\n${changes.map(c => `- ${c}`).join('\n')}\n`
    : `${headline}\n`;
}

/** A free branch name: `name`, or `name-2`, `name-3`… if that one exists. */
export function freeBranchName(
  name: string,
  prefix: string,
  branches: Map<string, unknown>
) {
  let candidate = name;
  for (let n = 2; branches.has(prefix + candidate); n++) {
    candidate = `${name}-${n}`;
  }
  return candidate;
}

const PublishSummaryQuery = gql`
  query PublishSummary(
    $owner: String!
    $name: String!
    $base: String!
    $head: String!
  ) {
    repository(owner: $owner, name: $name) {
      id
      ref(qualifiedName: $base) {
        id
        compare(headRef: $head) {
          id
          aheadBy
          behindBy
          commits(first: 100) {
            nodes {
              id
              messageHeadline
            }
          }
        }
      }
    }
  }
` as import('../../__generated__/ts-gql/PublishSummary').type;

// Asked separately: reading checks may need a permission the app lacks, and
// that shouldn't cost the summary.
const PublishChecksQuery = gql`
  query PublishChecks($owner: String!, $name: String!, $head: String!) {
    repository(owner: $owner, name: $name) {
      id
      ref(qualifiedName: $head) {
        id
        target {
          __typename
          id
          ... on Commit {
            statusCheckRollup {
              id
              state
            }
          }
        }
      }
    }
  }
` as import('../../__generated__/ts-gql/PublishChecks').type;

const PublishMergeMutation = gql`
  mutation PublishMerge($input: MergeBranchInput!) {
    mergeBranch(input: $input) {
      __typename
      mergeCommit {
        id
        oid
      }
    }
  }
` as import('../../__generated__/ts-gql/PublishMerge').type;

const PublishDeleteBranchMutation = gql`
  mutation PublishDeleteBranch($refId: ID!) {
    deleteRef(input: { refId: $refId }) {
      __typename
    }
  }
` as import('../../__generated__/ts-gql/PublishDeleteBranch').type;

// ── The sidebar button ───────────────────────────────────────────────────────

/** Publish, shown on a writing branch when `ui.publishing` is set. */
export function PublishButton() {
  const config = useConfig();
  const repoInfo = useRepoInfo();
  const currentBranch = useCurrentBranch();
  const [open, setOpen] = useState(false);
  if (
    config.storage.kind !== 'github' ||
    !config.ui?.publishing ||
    !repoInfo ||
    !currentBranch ||
    currentBranch === repoInfo.defaultBranch
  ) {
    return null;
  }
  return (
    <>
      <Button prominence="high" onPress={() => setOpen(true)}>
        <Icon src={uploadCloudIcon} />
        <Text>Publish</Text>
      </Button>
      <DialogContainer onDismiss={() => setOpen(false)}>
        {open && <PublishDialog onDismiss={() => setOpen(false)} />}
      </DialogContainer>
    </>
  );
}

// ── The dialog ───────────────────────────────────────────────────────────────

type Checks = 'passed' | 'running' | 'failed' | 'unknown';

function checksFrom(state: string | undefined | null): Checks {
  switch (state) {
    case 'SUCCESS':
      return 'passed';
    case 'PENDING':
    case 'EXPECTED':
      return 'running';
    case 'FAILURE':
    case 'ERROR':
      return 'failed';
    default:
      return 'unknown';
  }
}

function PublishDialog(props: { onDismiss: () => void }) {
  const config = useConfig();
  const repoInfo = useRepoInfo()!;
  const branches = useBranches();
  const branch = useCurrentBranch();
  const router = useRouter();
  const site =
    (config.ui?.publishing && config.ui.publishing.site) || 'the live site';
  const repo = { owner: repoInfo.owner, name: repoInfo.name };

  const [summary] = useQuery({
    query: PublishSummaryQuery,
    variables: {
      ...repo,
      base: `refs/heads/${repoInfo.defaultBranch}`,
      head: branch,
    },
    requestPolicy: 'network-only',
  });
  const [checksResult] = useQuery({
    query: PublishChecksQuery,
    variables: { ...repo, head: `refs/heads/${branch}` },
    requestPolicy: 'network-only',
  });
  const [, merge] = useMutation(PublishMergeMutation);
  const [, deleteBranch] = useMutation(PublishDeleteBranchMutation);
  const [state, setState] = useState<
    | { kind: 'idle' }
    | { kind: 'publishing' }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  const comparison = summary.data?.repository?.ref?.compare;
  const changes = useMemo(
    () =>
      changesFromHeadlines(
        (comparison?.commits.nodes ?? []).flatMap(node =>
          node ? [node.messageHeadline] : []
        )
      ),
    [comparison]
  );
  const target = checksResult.data?.repository?.ref?.target;
  const checks = checksFrom(
    target?.__typename === 'Commit' ? target.statusCheckRollup?.state : null
  );
  const commitsHref = `${getRepoUrl(repoInfo)}/commits/${encodeURIComponent(
    branch
  )}`;

  const onPublish = async () => {
    setState({ kind: 'publishing' });
    const merged = await merge({
      input: {
        repositoryId: repoInfo.id,
        base: repoInfo.defaultBranch,
        head: branch,
        commitMessage: publishMessage(branch, changes),
      },
    });
    if (merged.error || !merged.data?.mergeBranch) {
      const message = merged.error?.message ?? '';
      setState({
        kind: 'error',
        message: /conflict/i.test(message)
          ? `${repoInfo.defaultBranch} has changed the same lines since this branch began, so GitHub can't merge them by itself. Nothing was published. The branch is kept; ask Claude to merge ${repoInfo.defaultBranch} into it, then publish again.`
          : `Nothing was published. GitHub said: ${
              message || 'no reason given'
            }`,
      });
      return;
    }
    // Published. The branch has done its job; leaving it would only grow
    // the branch list. A failed delete is harmless, so it isn't reported.
    const ref = branches.get(branch);
    if (ref) await deleteBranch({ refId: ref.id });
    // A full load, so every list reads the default branch afresh.
    window.location.assign(
      router.href.replace(
        /\/branch\/[^/]+/,
        '/branch/' + encodeURIComponent(repoInfo.defaultBranch)
      )
    );
  };

  const busy = state.kind === 'publishing';
  const nothing = comparison && comparison.aheadBy === 0;

  return (
    <Dialog size="medium">
      <Heading>Publish {branch}</Heading>
      <Content>
        <Flex direction="column" gap="large">
          {summary.fetching && !comparison ? (
            <Flex gap="regular" alignItems="center">
              <ProgressCircle
                size="small"
                isIndeterminate
                aria-label="Reading the branch"
              />
              <Text>Reading what this branch changed…</Text>
            </Flex>
          ) : nothing ? (
            <Text>
              This branch has nothing that isn’t already on {site}. Press
              Publish to tidy it away.
            </Text>
          ) : (
            <Flex direction="column" gap="regular">
              <Text>
                This puts these on {site}, which updates a minute or two later:
              </Text>
              <ul style={{ margin: 0, paddingInlineStart: '1.25em' }}>
                {changes.map(change => (
                  <li key={change}>
                    <Text>{change}</Text>
                  </li>
                ))}
              </ul>
            </Flex>
          )}
          {!nothing && <ChecksLine checks={checks} href={commitsHref} />}
          {state.kind === 'error' && (
            <Notice tone="critical">{state.message}</Notice>
          )}
        </Flex>
      </Content>
      <ButtonGroup>
        {busy && (
          <ProgressCircle
            size="small"
            isIndeterminate
            aria-label="Publishing"
          />
        )}
        <Button onPress={props.onDismiss} isDisabled={busy}>
          Cancel
        </Button>
        <Button
          prominence="high"
          tone={checks === 'failed' ? 'critical' : undefined}
          isDisabled={busy || (summary.fetching && !comparison)}
          onPress={onPublish}
        >
          {checks === 'failed' ? 'Publish anyway' : 'Publish'}
        </Button>
      </ButtonGroup>
    </Dialog>
  );
}

function ChecksLine(props: { checks: Checks; href: string }) {
  const link = (
    <a href={props.href} target="_blank" rel="noopener noreferrer">
      the branch on GitHub
    </a>
  );
  switch (props.checks) {
    case 'passed':
      return (
        <Text color="positive">The site’s checks passed on the last save.</Text>
      );
    case 'running':
      return (
        <Text color="neutralSecondary">
          The site’s checks are still running on the last save ({link}). You can
          publish now; if they fail, the live site keeps its current version.
        </Text>
      );
    case 'failed':
      return (
        <Notice tone="caution">
          The site’s checks failed on the last save; {link} says why. Publishing
          anyway leaves the live site as it is until a fix follows, because the
          site won’t build.
        </Notice>
      );
    default:
      return (
        <Text color="neutralSecondary">
          The checks couldn’t be read from here; {link} shows them.
        </Text>
      );
  }
}
