import { ColorScheme } from '@keystar/ui/types';
import { ReactElement } from 'react';

import { ComponentSchema, FormField, SlugFormField } from './form/api';
import type { Locale } from './app/l10n/locales';
import { RepoConfig } from './app/repo-config';

// Common
// ----------------------------------------------------------------------------

export type DataFormat = 'json' | 'yaml';
export type Format =
  | DataFormat
  | {
      data?: DataFormat;
      contentField?: string | [string, ...string[]];
    };
export type EntryLayout = 'content' | 'form';
export type Glob = '*' | '**';
export type Collection<
  Schema extends Record<string, ComponentSchema>,
  SlugField extends string,
> = {
  label: string;
  path?: `${string}/${Glob}` | `${string}/${Glob}/${string}`;
  entryLayout?: EntryLayout;
  format?: Format;
  previewUrl?: string;
  columns?: string[];
  template?: string;
  parseSlugForSort?: (slug: string) => string | number;
  slugField: SlugField;
  schema: Schema;
};

export type Singleton<Schema extends Record<string, ComponentSchema>> = {
  label: string;
  path?: string;
  entryLayout?: EntryLayout;
  format?: Format;
  previewUrl?: string;
  schema: Schema;
};

type CommonConfig<Collections, Singletons> = {
  locale?: Locale;
  cloud?: { project: string };
  ui?: UserInterface<Collections, Singletons>;
};

type CommonRemoteStorageConfig = {
  pathPrefix?: string;
  branchPrefix?: string;
};

// Interface
// ----------------------------------------------------------------------------

type BrandMark = (props: {
  colorScheme: Exclude<ColorScheme, 'auto'>; // we resolve "auto" to "light" or "dark" on the client
}) => ReactElement;
export const NAVIGATION_DIVIDER_KEY = '---';
type UserInterface<Collections, Singletons> = {
  brand?: {
    mark?: BrandMark;
    name: string;
  };
  navigation?: Navigation<
    | (keyof Collections & string)
    | (keyof Singletons & string)
    | typeof NAVIGATION_DIVIDER_KEY
  >;
  /**
   * FORK (devinchaloux): dress the admin UI in the site's own look.
   *
   * The UI kit reads every colour, font and radius from `--kui-*` custom
   * properties, so a site can retheme it by overriding those, without
   * touching a component. The values belong to the site (they mirror its
   * design tokens), so they live in its config, not in this package.
   */
  theme?: {
    /** CSS added after the UI kit's own; typically `--kui-*` overrides. */
    css?: string;
    /** Stylesheet URL for the fonts `css` names. Replaces the default Inter. */
    fonts?: string;
  };
  /**
   * FORK (devinchaloux): where field descriptions go. `'tooltip'` puts each
   * behind an ⓘ button beside its label; the default prints it inline.
   */
  fieldHelp?: 'inline' | 'tooltip';
  /**
   * FORK (devinchaloux): `'compact'` tightens long forms: list fields use
   * short rows, and a multi-relationship (tags) shows its picks as
   * removable chips rather than a tall reorderable list.
   */
  density?: 'regular' | 'compact';
  /**
   * FORK (devinchaloux): typing `[[` in a Markdoc field opens a list of this
   * collection's entries by name; choosing one inserts `component` with
   * `entryField` pointing at it and `textField` holding the words. A last
   * option parks the words, inserting the component with no entry yet.
   */
  referenceShortcut?: {
    component: string;
    collection: string;
    entryField: string;
    textField: string;
  };
  /**
   * FORK (devinchaloux): a URL pasted on its own into prose may become a
   * component: return its name and the values the URL gives, or nothing to
   * paste it as usual. Its form opens for the rest.
   */
  onPasteUrl?: (
    url: string
  ) => { component: string; props: Record<string, unknown> } | null | undefined;
  /**
   * FORK (devinchaloux): a Preview button on entries, showing the page the
   * entry will become beside the prose as it's edited. The site draws it:
   * the entry, unsaved, is POSTed to `url` as JSON `{ collection, slug, text }`
   * (`text` is the file a save would write) and the HTML response is shown.
   * A response header `X-Preview-Problems` (URI-encoded JSON list of
   * strings) is shown above the page.
   */
  livePreview?: { url: string };
  /**
   * FORK (devinchaloux): a site's own panel at the top of the dashboard (the
   * collection cards stay below it). `navigate` moves within the admin
   * without a page load; `basePath` is where the admin lives, e.g.
   * "/keystatic".
   */
  desk?: (props: {
    basePath: string;
    navigate: (href: string) => void;
  }) => ReactElement | null;
  /**
   * FORK (devinchaloux): write on branches, publish with a button. GitHub
   * storage only. Saving on the default branch (which the live site is built
   * from) asks for a writing branch instead, named under
   * `storage.branchPrefix`. On any other branch the sidebar has a Publish
   * button, which merges the branch into the default branch and deletes it.
   * `site` names the live site in the messages ("devinchaloux.com").
   */
  publishing?: { site?: string };
  /**
   * FORK (devinchaloux): the site's own checks, run on an entry as it's
   * edited. The entry, unsaved, is POSTed to `url` as JSON
   * `{ collection, slug, text, slugs }`, where `slugs` maps each collection
   * in `slugsOf` to its entries' slugs on the current branch. The response is
   * JSON `{ problems: string[] }`. Problems show beside Save, and saving with
   * any asks first.
   */
  entryChecks?: { url: string; slugsOf?: string[] };
  /**
   * FORK (devinchaloux): a site's own panel under an entry's fields (or
   * under the form, for an entry without a content field).
   */
  entryAside?: (props: {
    collection: string;
    slug: string;
    basePath: string;
    navigate: (href: string) => void;
  }) => ReactElement | null;
  /**
   * FORK (devinchaloux): adjust an existing entry just before it's saved,
   * for a value that should follow from the edit (a "last updated" date).
   * Given the entry as opened and as it stands; returns what to save. The
   * form shows the saved values once the save lands.
   */
  beforeSave?: (args: {
    collection: string;
    initialState: Record<string, unknown>;
    state: Record<string, unknown>;
  }) => Record<string, unknown>;
  /**
   * FORK (devinchaloux): collections written by something else (a sync),
   * shown but never saved from the admin. Maps each collection to the
   * sentence shown on its entries, e.g. "Sylloge writes these."
   */
  readOnly?: Partial<Record<keyof Collections & string, string>>;
};

type Navigation<K> = K[] | { [section: string]: K[] };

// Storage
// ----------------------------------------------------------------------------

type GitHubStorageConfig = {
  kind: 'github';
  repo: RepoConfig;
} & CommonRemoteStorageConfig;

export type GitHubConfig<
  Collections extends {
    [key: string]: Collection<Record<string, ComponentSchema>, string>;
  } = {
    [key: string]: Collection<Record<string, ComponentSchema>, string>;
  },
  Singletons extends {
    [key: string]: Singleton<Record<string, ComponentSchema>>;
  } = {
    [key: string]: Singleton<Record<string, ComponentSchema>>;
  },
> = {
  storage: GitHubStorageConfig;
  collections?: Collections;
  singletons?: Singletons;
} & CommonConfig<Collections, Singletons>;

type LocalStorageConfig = { kind: 'local' };

export type LocalConfig<
  Collections extends {
    [key: string]: Collection<Record<string, ComponentSchema>, string>;
  } = {
    [key: string]: Collection<Record<string, ComponentSchema>, string>;
  },
  Singletons extends {
    [key: string]: Singleton<Record<string, ComponentSchema>>;
  } = {
    [key: string]: Singleton<Record<string, ComponentSchema>>;
  },
> = {
  storage: LocalStorageConfig;
  collections?: Collections;
  singletons?: Singletons;
} & CommonConfig<Collections, Singletons>;

type CloudStorageConfig = { kind: 'cloud' } & CommonRemoteStorageConfig;

export type CloudConfig<
  Collections extends {
    [key: string]: Collection<Record<string, ComponentSchema>, string>;
  } = {
    [key: string]: Collection<Record<string, ComponentSchema>, string>;
  },
  Singletons extends {
    [key: string]: Singleton<Record<string, ComponentSchema>>;
  } = {
    [key: string]: Singleton<Record<string, ComponentSchema>>;
  },
> = {
  storage: CloudStorageConfig;
  cloud: { project: string };
  collections?: Collections;
  singletons?: Singletons;
} & CommonConfig<Collections, Singletons>;

export type Config<
  Collections extends {
    [key: string]: Collection<Record<string, ComponentSchema>, string>;
  } = {
    [key: string]: Collection<Record<string, ComponentSchema>, string>;
  },
  Singletons extends {
    [key: string]: Singleton<Record<string, ComponentSchema>>;
  } = {
    [key: string]: Singleton<Record<string, ComponentSchema>>;
  },
> = {
  storage: LocalStorageConfig | GitHubStorageConfig | CloudStorageConfig;
  collections?: Collections;
  singletons?: Singletons;
} & ({} extends Collections ? {} : { collections: Collections }) &
  ({} extends Singletons ? {} : { singletons: Singletons }) &
  CommonConfig<Collections, Singletons>;

// ============================================================================
// Functions
// ============================================================================

export function config<
  Collections extends {
    [key: string]: Collection<Record<string, ComponentSchema>, string>;
  },
  Singletons extends {
    [key: string]: Singleton<Record<string, ComponentSchema>>;
  },
>(config: Config<Collections, Singletons>) {
  return config;
}

export function collection<
  Schema extends Record<string, ComponentSchema>,
  SlugField extends {
    [K in keyof Schema]: Schema[K] extends SlugFormField<any, any, any, any>
      ? K
      : never;
  }[keyof Schema],
>(
  collection: Collection<Schema, SlugField & string> & {
    columns?: {
      [K in keyof Schema]: Schema[K] extends
        | FormField<
            any,
            any,
            string | number | boolean | Date | null | undefined
          >
        | SlugFormField<any, any, any, string>
        ? K & string
        : never;
    }[keyof Schema][];
  }
): Collection<Schema, SlugField & string> {
  return collection;
}

export function singleton<Schema extends Record<string, ComponentSchema>>(
  collection: Singleton<Schema>
): Singleton<Schema> {
  return collection;
}
