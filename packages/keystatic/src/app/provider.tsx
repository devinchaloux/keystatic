import {
  ClientSideOnlyDocumentElement,
  KeystarProvider,
} from '@keystar/ui/core';
import { injectGlobal } from '@keystar/ui/style';
import { Toaster } from '@keystar/ui/toast';
import { useMemo, type JSX } from 'react';
import {
  Provider as UrqlProvider,
  createClient,
  fetchExchange,
  Client,
} from 'urql';
import { cacheExchange } from '@urql/exchange-graphcache';
import { authExchange } from '@urql/exchange-auth';
import { getAuth, getSyncAuth } from './auth';
import { CloudAppShellQuery, GitHubAppShellQuery } from './shell/data';
import { persistedExchange } from '@urql/exchange-persisted';
import { relayPagination } from '@urql/exchange-graphcache/extras';

import {
  KEYSTATIC_CLOUD_API_URL,
  KEYSTATIC_CLOUD_HEADERS,
  redirectToCloudAuth,
} from './utils';
import { Config } from '../config';
import { ThemeProvider, useTheme } from './shell/theme';
import { parseRepoConfig } from './repo-config';
import { useRouter } from './router';
import { setPasteUrlHandler } from '../form/fields/markdoc/editor/paste-url';

// NOTE: scroll behaviour is handled by shell components
injectGlobal({ body: { overflow: 'hidden' } });

export function createUrqlClient(config: Config): Client {
  const repo =
    config.storage.kind === 'github'
      ? parseRepoConfig(config.storage.repo)
      : { owner: 'repo-owner', name: 'repo-name' };
  return createClient({
    url:
      config.storage.kind === 'github'
        ? 'https://api.github.com/graphql'
        : `${KEYSTATIC_CLOUD_API_URL}/v1/github/graphql`,
    requestPolicy: 'cache-and-network',
    exchanges: [
      authExchange(async utils => {
        let authState = await getAuth(config);
        return {
          addAuthToOperation(operation) {
            authState = getSyncAuth(config);
            if (!authState) {
              return operation;
            }
            return utils.appendHeaders(operation, {
              Authorization: `Bearer ${authState.accessToken}`,
              ...(config.storage.kind === 'cloud'
                ? KEYSTATIC_CLOUD_HEADERS
                : {}),
            });
          },
          didAuthError() {
            return false;
          },
          willAuthError(operation) {
            authState = getSyncAuth(config);
            if (
              operation.query.definitions[0].kind === 'OperationDefinition' &&
              operation.query.definitions[0].name?.value.includes('AppShell') &&
              !authState
            ) {
              if (config.storage.kind === 'github') {
                window.location.href = '/api/keystatic/github/login';
              } else {
                redirectToCloudAuth('', config);
              }
              return true;
            }
            if (!authState) {
              return true;
            }
            return false;
          },
          async refreshAuth() {
            authState = await getAuth(config);
          },
        };
      }),
      cacheExchange({
        resolvers: {
          Repository: {
            refs: relayPagination(),
          },
        },
        updates: {
          Mutation: {
            createRef(result, args, cache, _info) {
              cache.updateQuery(
                {
                  query:
                    config.storage.kind === 'github'
                      ? GitHubAppShellQuery
                      : CloudAppShellQuery,
                  variables: repo,
                },
                data => {
                  if (
                    data?.repository?.refs?.nodes &&
                    result.createRef &&
                    typeof result.createRef === 'object' &&
                    'ref' in result.createRef
                  ) {
                    return {
                      ...data,
                      repository: {
                        ...data.repository,
                        refs: {
                          ...data.repository.refs,
                          nodes: [
                            ...data.repository.refs.nodes,
                            result.createRef.ref,
                          ],
                        },
                      },
                    };
                  }
                  return data;
                }
              );
            },
            deleteRef(result, args, cache, _info) {
              cache.updateQuery(
                {
                  query:
                    config.storage.kind === 'github'
                      ? GitHubAppShellQuery
                      : CloudAppShellQuery,
                  variables: repo,
                },
                data => {
                  if (
                    data?.repository?.refs?.nodes &&
                    result.deleteRef &&
                    typeof result.deleteRef === 'object' &&
                    '__typename' in result.deleteRef &&
                    typeof args.input === 'object' &&
                    args.input !== null &&
                    'refId' in args.input &&
                    typeof args.input.refId === 'string'
                  ) {
                    const refId = args.input.refId;
                    return {
                      ...data,
                      repository: {
                        ...data.repository,
                        refs: {
                          ...data.repository.refs,
                          nodes: data.repository.refs.nodes.filter(
                            x => x?.id !== refId
                          ),
                        },
                      },
                    };
                  }
                  return data;
                }
              );
            },
          },
        },
      }),
      ...(config.storage.kind === 'github'
        ? []
        : [
            persistedExchange({
              enableForMutation: true,
              enforcePersistedQueries: true,
            }),
          ]),
      fetchExchange,
    ],
  });
}

// FORK (devinchaloux): the compact sidebar menu. The UI kit's nav list sets
// its own padding (a 32px minimum row, 8px around group headings, a gap
// between groups); these rules tighten it. They key on the class the sidebar
// adds when `ui.density` is 'compact', and outrank the kit's single-class
// rules by specificity, not !important.
const COMPACT_NAV_CSS = `
.ks-fork-compact-nav nav li > a { padding-block: 0; }
.ks-fork-compact-nav nav li > a > div { min-height: 28px; padding-block: 3px; }
.ks-fork-compact-nav nav h3 { padding-block: 4px 2px; }
.ks-fork-compact-nav nav ul > li:has(> h3):not(:first-child) { margin-block-start: 14px; }
.ks-fork-compact-nav nav ul > li:has(> h3):not(:last-child) { margin-block-end: 0; }
`;

export default function Provider({
  children,
  config,
}: {
  children: JSX.Element;
  config: Config;
}) {
  // FORK (devinchaloux): hand the site's paste rule to the editor plugin.
  setPasteUrlHandler(config.ui?.onPasteUrl);
  const themeContext = useTheme();
  const { push, replace } = useRouter();
  const keystarRouter = useMemo(
    () => ({
      navigate(href: string, options?: { replace?: boolean }) {
        return options?.replace ? replace(href) : push(href);
      },
      // These hooks are consumed lazily by @keystar/ui/router.
      // eslint-disable-next-line react-compiler/react-compiler
      usePathname: useKeystaticPathname,
      // eslint-disable-next-line react-compiler/react-compiler
      useSearch: useKeystaticSearch,
    }),
    [push, replace]
  );

  return (
    <ThemeProvider value={themeContext}>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <KeystarProvider
        locale={config.locale || 'en-US'}
        colorScheme={themeContext.theme}
        router={keystarRouter}
      >
        <ClientSideOnlyDocumentElement bodyBackground="surface" />
        <link
          href={
            config.ui?.theme?.fonts ??
            'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
          }
          rel="stylesheet"
        />
        {/* FORK (devinchaloux): the site's theme, after the UI kit's tokens
            in document order so equal-specificity overrides win. */}
        {config.ui?.theme?.css && (
          <style
            data-keystatic-theme=""
            dangerouslySetInnerHTML={{ __html: config.ui.theme.css }}
          />
        )}
        {config.ui?.density === 'compact' && (
          <style
            data-keystatic-compact=""
            dangerouslySetInnerHTML={{ __html: COMPACT_NAV_CSS }}
          />
        )}
        <UrqlProvider value={useMemo(() => createUrqlClient(config), [config])}>
          {children}
        </UrqlProvider>
        <Toaster />
      </KeystarProvider>
    </ThemeProvider>
  );
}

function useKeystaticPathname() {
  return useRouter().pathname;
}

function useKeystaticSearch() {
  return useRouter().search;
}
