// FORK (devinchaloux): the live preview — the page beside the prose.
//
// With `ui.livePreview: { url }` in the config, an entry's header gets a
// Preview button. Pressed, the fields panel gives way to the page the entry
// will become, redrawn as you type. The site draws it: this posts the entry,
// unsaved, as the file a save would write ({ collection, slug, text }) to
// `url`, and shows the HTML that comes back. So the preview is the site's
// own page, not an imitation of it, and this package knows nothing about how
// the site renders.
//
// The first page is loaded whole; later ones replace only its <body>, so the
// stylesheets and fonts stay loaded and the scroll position stays put. Links
// in it open in a new tab. Problems the site reports (the response's
// X-Preview-Problems header, a URI-encoded JSON list) show above the page.
// Remembered across reloads, as focus mode is.

import {
  ReactElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import { ActionButton } from '@keystar/ui/button';
import { Icon } from '@keystar/ui/icon';
import { eyeIcon } from '@keystar/ui/icon/icons/eyeIcon';
import { eyeOffIcon } from '@keystar/ui/icon/icons/eyeOffIcon';
import { Flex } from '@keystar/ui/layout';
import { css, tokenSchema } from '@keystar/ui/style';
import { Tooltip, TooltipTrigger } from '@keystar/ui/tooltip';
import { Text } from '@keystar/ui/typography';

import { Config } from '../config';
import { serializeEntryToFiles } from './updating';
import {
  getCollectionFormat,
  getCollectionItemPath,
  getSlugFromState,
} from './utils';

// ── Open or closed ───────────────────────────────────────────────────────────

const KEY = 'keystatic-fork:live-preview';
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

let open = typeof window === 'undefined' ? false : read();

export function toggleLivePreview() {
  open = !open;
  try {
    localStorage.setItem(KEY, open ? '1' : '0');
  } catch {
    // Storage blocked: the pane still opens, it just isn't remembered.
  }
  listeners.forEach(listener => listener());
}

/** Whether the preview pane is open; re-renders when it changes. */
export function useLivePreviewOpen(): boolean {
  return useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => open,
    () => false
  );
}

// ── On an entry page ─────────────────────────────────────────────────────────

/**
 * The live preview for an entry being edited or created: whether the site
 * offers one, whether it's open, and the pane to show in place of the fields.
 * The entry is sent as the file a save would write, at its current slug.
 */
export function useLivePreview(args: {
  config: Config;
  collection: string;
  state: Record<string, unknown>;
}): { available: boolean; open: boolean; pane: ReactElement | undefined } {
  const { config, collection, state } = args;
  const url = config.ui?.livePreview?.url;
  const open = useLivePreviewOpen() && !!url;
  const collectionConfig = config.collections![collection];
  const slug = getSlugFromState(collectionConfig, state);
  const text = useMemo(() => {
    if (!open) return '';
    const [file] = serializeEntryToFiles({
      basePath: getCollectionItemPath(config, collection, slug),
      format: getCollectionFormat(config, collection),
      schema: collectionConfig.schema,
      slug: { field: collectionConfig.slugField, value: slug },
      state,
    });
    return new TextDecoder().decode(file.contents);
  }, [open, config, collection, slug, collectionConfig, state]);
  return {
    available: !!url,
    open,
    pane:
      open && url ? (
        <LivePreviewPane
          url={url}
          collection={collection}
          slug={slug}
          text={text}
        />
      ) : undefined,
  };
}

/** The header button that opens and closes the pane. */
export function LivePreviewButton(props: { open: boolean }) {
  return (
    <TooltipTrigger>
      <ActionButton
        prominence="low"
        aria-label={props.open ? 'Hide live preview' : 'Live preview'}
        aria-pressed={props.open}
        onPress={toggleLivePreview}
      >
        <Icon src={props.open ? eyeOffIcon : eyeIcon} />
      </ActionButton>
      <Tooltip>
        {props.open
          ? 'Hide preview (show the fields)'
          : 'Preview the page as you write'}
      </Tooltip>
    </TooltipTrigger>
  );
}

// ── The pane ─────────────────────────────────────────────────────────────────

// Wait this long after the last keystroke before asking for a new page.
const DEBOUNCE_MS = 400;

type Status =
  | { kind: 'loading' }
  | { kind: 'ready'; problems: string[] }
  | { kind: 'error'; message: string };

function problemsFrom(response: Response): string[] {
  const header = response.headers.get('X-Preview-Problems');
  if (!header) return [];
  try {
    const list = JSON.parse(decodeURIComponent(header));
    return Array.isArray(list) ? list.map(String) : [];
  } catch {
    return [];
  }
}

// Links in the preview open in a new tab rather than navigating the pane.
function withNewTabLinks(html: string) {
  return html.replace(
    /<head(\s[^>]*)?>/i,
    match => `${match}<base target="_blank">`
  );
}

export function LivePreviewPane(props: {
  url: string;
  collection: string;
  slug: string;
  /** The entry as the file a save would write; a new text asks for a page. */
  text: string;
}) {
  const { url, collection, slug, text } = props;
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<Status>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      async () => {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ collection, slug, text }),
            signal: controller.signal,
          });
          const html = await response.text();
          if (!response.ok) {
            setStatus({ kind: 'error', message: html.slice(0, 400) });
            return;
          }
          show(frameRef.current, html);
          setStatus({ kind: 'ready', problems: problemsFrom(response) });
        } catch {
          if (controller.signal.aborted) return;
          setStatus({
            kind: 'error',
            message: 'The preview couldn’t be reached.',
          });
        }
      },
      frameRef.current?.dataset.loaded ? DEBOUNCE_MS : 0
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [url, collection, slug, text]);

  return (
    <Flex direction="column" height="100%" minHeight={0}>
      <PreviewStatus status={status} />
      <iframe
        ref={frameRef}
        title="Preview"
        data-keystatic-live-preview=""
        onLoad={event => {
          // The empty frame loads too, on mounting; only a page counts.
          const frame = event.currentTarget;
          if (frame.srcdoc) frame.dataset.loaded = '1';
        }}
        className={css({
          border: 0,
          flex: 1,
          minHeight: 0,
          width: '100%',
          backgroundColor: tokenSchema.color.background.canvas,
        })}
      />
    </Flex>
  );
}

/** Draw a page: whole the first time, its <body> only after that. */
function show(frame: HTMLIFrameElement | null, html: string) {
  if (!frame) return;
  const doc = frame.contentDocument;
  if (!frame.dataset.loaded || !doc?.body) {
    frame.srcdoc = withNewTabLinks(html);
    return;
  }
  const next = new DOMParser().parseFromString(html, 'text/html');
  const scrollY = frame.contentWindow?.scrollY ?? 0;
  doc.title = next.title;
  doc.body.replaceWith(doc.adoptNode(next.body));
  frame.contentWindow?.scrollTo(0, scrollY);
}

function PreviewStatus(props: { status: Status }) {
  const { status } = props;
  const message =
    status.kind === 'loading'
      ? 'Drawing the page…'
      : status.kind === 'error'
      ? status.message
      : status.problems.length
      ? status.problems.join(' · ')
      : null;
  if (!message) return null;
  return (
    <div
      role="status"
      className={css({
        borderBottom: `${tokenSchema.size.border.regular} solid ${tokenSchema.color.border.muted}`,
        paddingBlock: tokenSchema.size.space.small,
        paddingInline: tokenSchema.size.space.medium,
      })}
    >
      <Text
        size="small"
        color={
          status.kind === 'loading'
            ? 'neutralTertiary'
            : status.kind === 'error'
            ? 'critical'
            : 'caution'
        }
      >
        {message}
      </Text>
    </div>
  );
}
