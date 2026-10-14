import { Badge } from '@keystar/ui/badge';
import { ActionButton } from '@keystar/ui/button';
import { Icon } from '@keystar/ui/icon';
import { plusIcon } from '@keystar/ui/icon/icons/plusIcon';
import { Divider, Flex } from '@keystar/ui/layout';
import { Text } from '@keystar/ui/typography';
import { useRouter } from '../router';
import { css, tokenSchema } from '@keystar/ui/style';
import { useCompactForms } from '../../form/fields/field-help';

import { Item, ItemOrGroup, useNavItems } from '../useNavItems';
import { pluralize } from '../pluralize';
import {
  DashboardCard,
  DashboardGrid,
  DashboardSection,
  FILL_COLS,
} from './components';

export function DashboardCards() {
  const navItems = useNavItems();
  // FORK (devinchaloux): a compact index instead of cards when the admin
  // is compact. See CompactIndex below.
  const compact = useCompactForms();
  const hasSections = navItems.some(item => 'children' in item);
  if (compact) return <CompactIndex items={navItems} />;
  const items = navItems.map(item => renderItemOrGroup(item));

  return hasSections ? (
    <>{items}</>
  ) : (
    <DashboardSection title="Content">
      <DashboardGrid>{items}</DashboardGrid>
    </DashboardSection>
  );
}

let dividerCount = 0;
function renderItemOrGroup(itemOrGroup: ItemOrGroup) {
  if (itemOrGroup.isDivider) {
    return (
      <Flex key={dividerCount++} gridColumn={FILL_COLS}>
        <Divider
          alignSelf="center"
          size="medium"
          width="alias.singleLineWidth"
        />
      </Flex>
    );
  }

  if (itemOrGroup.children) {
    return (
      <DashboardSection key={itemOrGroup.title} title={itemOrGroup.title}>
        <DashboardGrid>
          {itemOrGroup.children.map(child => renderItemOrGroup(child))}
        </DashboardGrid>
      </DashboardSection>
    );
  }

  let changeElement = (() => {
    if (!itemOrGroup.changed) {
      return undefined;
    }

    return typeof itemOrGroup.changed === 'number' ? (
      <Badge tone="accent" marginStart="auto">
        {pluralize(itemOrGroup.changed, {
          singular: 'change',
          plural: 'changes',
        })}
      </Badge>
    ) : (
      <Badge tone="accent">Changed</Badge>
    );
  })();

  let endElement = (() => {
    // entry counts are only available for collections
    if (typeof itemOrGroup.entryCount !== 'number') {
      return changeElement;
    }

    return (
      <Flex gap="medium" alignItems="center">
        {changeElement}
        <ActionButton aria-label="Add" href={`${itemOrGroup.href}/create`}>
          <Icon src={plusIcon} />
        </ActionButton>
      </Flex>
    );
  })();

  return (
    <DashboardCard
      label={itemOrGroup.label}
      key={itemOrGroup.key}
      href={itemOrGroup.href}
      endElement={endElement}
    >
      {typeof itemOrGroup.entryCount === 'number' ? (
        <Text color="neutralSecondary">
          {pluralize(itemOrGroup.entryCount, {
            singular: 'entry',
            plural: 'entries',
          })}
        </Text>
      ) : null}
    </DashboardCard>
  );
}

// ── FORK (devinchaloux): the compact index ──────────────────────────────────
//
// The cards give each collection a 64px box, so the dashboard's lower half is
// a wall of boxes that mostly say "N entries". With `ui.density: 'compact'`
// it becomes an index: one row per navigation group, each collection a link
// with its count and a small "+" to add one. Same links, a fraction of the
// height, and it reads as a list rather than a grid to scan.

type Entry = Extract<ItemOrGroup, { href: string }>;

function flatten(items: (ItemOrGroup | Item)[]): Entry[] {
  return items.filter(
    (item): item is Entry => !item.isDivider && !item.children
  );
}

function CompactIndex(props: { items: ItemOrGroup[] }) {
  const groups: { title: string; items: Entry[] }[] = [];
  const loose = flatten(props.items);
  if (loose.length) groups.push({ title: 'Content', items: loose });
  for (const item of props.items) {
    if (item.children) {
      groups.push({ title: item.title, items: flatten(item.children) });
    }
  }
  // Plain text that underlines on hover: a row of underlined accent links
  // read as noise.
  // Plain anchors sit outside the kit's Text, so they take its font and size
  // explicitly; without it they fall back to the browser's serif.
  const type = {
    fontFamily: tokenSchema.typography.fontFamily.base,
    fontSize: tokenSchema.typography.text.regular.size,
  };
  const link = css({
    ...type,
    color: tokenSchema.color.foreground.neutralEmphasis,
    textDecoration: 'none',
    '&:hover': { textDecoration: 'underline' },
  });
  const add = css({
    ...type,
    color: tokenSchema.color.foreground.neutralTertiary,
    textDecoration: 'none',
    '&:hover': { color: tokenSchema.color.foreground.accent },
  });
  // Plain spans, like the links: the kit's Text trims its line box, which
  // knocks it off the links' line when they sit side by side.
  const count = css({
    ...type,
    fontSize: tokenSchema.typography.text.small.size,
    color: tokenSchema.color.foreground.neutralTertiary,
  });
  const label = css({
    ...type,
    fontSize: tokenSchema.typography.text.small.size,
    color: tokenSchema.color.foreground.neutralSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  });
  const row = css({
    display: 'grid',
    gridTemplateColumns: '7rem 1fr',
    alignItems: 'center',
    gap: tokenSchema.size.space.medium,
    paddingBlock: tokenSchema.size.space.regular,
    borderTop: `1px solid ${tokenSchema.color.border.muted}`,
  });
  return (
    <section aria-label="All content">
      {groups.map(group => (
        <div key={group.title} className={row}>
          <span className={label}>{group.title}</span>
          <Flex gap="large" wrap alignItems="center">
            {group.items.map(item => (
              <Flex key={item.key} gap="small" alignItems="center">
                <IndexLink href={item.href} className={link}>
                  {item.label}
                </IndexLink>
                {typeof item.entryCount === 'number' && (
                  <>
                    <span className={count}>{item.entryCount}</span>
                    <IndexLink
                      href={`${item.href}/create`}
                      aria-label={`Add to ${item.label}`}
                      className={add}
                    >
                      +
                    </IndexLink>
                  </>
                )}
              </Flex>
            ))}
          </Flex>
        </div>
      ))}
    </section>
  );
}

/** A plain link that moves within the admin; a modified click is the browser's. */
function IndexLink(props: {
  href: string;
  className: string;
  children: string;
  'aria-label'?: string;
}) {
  const router = useRouter();
  return (
    <a
      href={props.href}
      className={props.className}
      aria-label={props['aria-label']}
      onClick={event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button) {
          return;
        }
        event.preventDefault();
        router.push(props.href);
      }}
    >
      {props.children}
    </a>
  );
}
