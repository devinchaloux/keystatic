// FORK (devinchaloux): the bar above a collection's table, for when a
// collection grows past what one screen of rows can show: choose the columns,
// filter by what the data holds, and see how many entries are showing.
//
// Active filters show as removable chips beside the buttons, so a short list
// always says why it's short. The logic (which fields, which filters, how
// they combine) is in collection-table.ts, tested there.

import { Key } from 'react';
import { ActionButton } from '@keystar/ui/button';
import { Icon } from '@keystar/ui/icon';
import { columns3Icon } from '@keystar/ui/icon/icons/columns3Icon';
import { listFilterIcon } from '@keystar/ui/icon/icons/listFilterIcon';
import { Flex } from '@keystar/ui/layout';
import { Item, Menu, MenuTrigger, Section } from '@keystar/ui/menu';
import { breakpointQueries, css, tokenSchema } from '@keystar/ui/style';
import { TagGroup } from '@keystar/ui/tag';
import { Text } from '@keystar/ui/typography';

import { Filter, FilterGroup, filterKey } from './collection-table';

/** The Set a multiple-selection menu reports, as plain string keys. */
function keysOf(selection: 'all' | Set<Key>, all: string[]): Set<string> {
  return selection === 'all'
    ? new Set(all)
    : new Set([...selection].map(String));
}

export function CollectionToolbar(props: {
  columns: { key: string; label: string }[];
  visible: string[];
  onVisibleChange: (keys: string[]) => void;
  groups: FilterGroup[];
  filters: Filter[];
  onToggle: (filter: Filter) => void;
  onRemove: (filter: Filter) => void;
  shown: number;
  total: number;
}) {
  const options = props.groups.flatMap(group => group.options);
  const byKey = new Map(options.map(option => [option.key, option]));
  const activeKeys = props.filters.map(filterKey);
  const chips = props.filters.map(filter => {
    const option = byKey.get(filterKey(filter));
    const group = props.groups.find(g => g.field === filter.field);
    const label =
      option && group && typeof filter.value !== 'boolean'
        ? `${group.label}: ${option.label}`
        : option?.label ?? String(filter.value);
    return { key: filterKey(filter), label, filter };
  });

  return (
    <Flex
      gap="regular"
      alignItems="center"
      wrap
      marginTop={{ tablet: 'large' }}
      UNSAFE_className={css({
        marginInline: tokenSchema.size.space.regular,
        [breakpointQueries.above.mobile]: {
          marginInline: tokenSchema.size.space.xlarge,
        },
        [breakpointQueries.above.tablet]: {
          marginInline: tokenSchema.size.space.xxlarge,
        },
      })}
    >
      <MenuTrigger closeOnSelect={false}>
        <ActionButton prominence="low">
          <Icon src={columns3Icon} />
          <Text>Columns</Text>
        </ActionButton>
        <Menu
          aria-label="Columns to show"
          items={props.columns}
          selectionMode="multiple"
          disallowEmptySelection
          selectedKeys={props.visible}
          onSelectionChange={selection => {
            const chosen = keysOf(
              selection,
              props.columns.map(c => c.key)
            );
            // Keep the schema's order, whatever order they were ticked in.
            props.onVisibleChange(
              props.columns.map(c => c.key).filter(key => chosen.has(key))
            );
          }}
        >
          {item => <Item key={item.key}>{item.label}</Item>}
        </Menu>
      </MenuTrigger>

      {props.groups.length > 0 && (
        <MenuTrigger closeOnSelect={false}>
          <ActionButton prominence="low">
            <Icon src={listFilterIcon} />
            <Text>Filter</Text>
          </ActionButton>
          <Menu
            aria-label="Filter entries"
            selectionMode="multiple"
            selectedKeys={activeKeys}
            onSelectionChange={selection => {
              const next = keysOf(selection, [...byKey.keys()]);
              // One item changed: the one present in exactly one of the sets.
              const changed =
                [...next].find(key => !activeKeys.includes(key)) ??
                activeKeys.find(key => !next.has(key));
              const option = changed ? byKey.get(changed) : undefined;
              if (option) props.onToggle(option.filter);
            }}
          >
            {props.groups.map(group => (
              <Section key={group.field} title={group.label}>
                {group.options.map(option => (
                  <Item key={option.key}>{option.label}</Item>
                ))}
              </Section>
            ))}
          </Menu>
        </MenuTrigger>
      )}

      {chips.length > 0 && (
        <TagGroup
          aria-label="Active filters"
          items={chips}
          onRemove={keys => {
            for (const key of keys) {
              const chip = chips.find(c => c.key === String(key));
              if (chip) props.onRemove(chip.filter);
            }
          }}
        >
          {chip => <Item key={chip.key}>{chip.label}</Item>}
        </TagGroup>
      )}

      <Text
        color="neutralSecondary"
        size="small"
        UNSAFE_className={css({ marginInlineStart: 'auto' })}
      >
        {props.shown === props.total
          ? `${props.total} ${props.total === 1 ? 'entry' : 'entries'}`
          : `${props.shown} of ${props.total}`}
      </Text>
    </Flex>
  );
}
