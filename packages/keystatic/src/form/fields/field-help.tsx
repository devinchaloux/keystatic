// FORK (devinchaloux): field help text as a tooltip, not a paragraph.
//
// Upstream prints every field's `description` under its label. A form with
// careful descriptions becomes a wall of grey text, and the fields themselves
// get hard to find (Devin, 2026-10-14: keep help text to a minimum, "stuff it
// in a tooltip"). With `ui.fieldHelp: 'tooltip'` in the config, a description
// becomes an ⓘ button beside the label that opens it in a popover: one tap
// away, out of the way otherwise, and reachable by keyboard and on a phone,
// which a hover-only tooltip would not be.

import { ReactElement, useContext } from 'react';
import { ContextualHelp } from '@keystar/ui/contextual-help';
import { HStack } from '@keystar/ui/layout';
import { Content } from '@keystar/ui/slots';
import { Text } from '@keystar/ui/typography';
import { ConfigContext } from '../../app/shell/context';

/** Whether descriptions should be tooltips. Null-safe outside the app. */
export function useHelpAsTooltip(): boolean {
  return useContext(ConfigContext)?.ui?.fieldHelp === 'tooltip';
}

/** Whether forms should be compact (`ui.density: 'compact'`). */
export function useCompactForms(): boolean {
  return useContext(ConfigContext)?.ui?.density === 'compact';
}

/** The ⓘ button holding one description. */
export function FieldHelp(props: { children: string }) {
  return (
    <ContextualHelp variant="info">
      <Content>
        <Text>{props.children}</Text>
      </Content>
    </ContextualHelp>
  );
}

/**
 * Props for a UI-kit field that takes `description` and `contextualHelp`:
 * spread in place of `description={…}`.
 */
export function useFieldHelp(description: string | undefined): {
  description?: string;
  contextualHelp?: ReactElement;
} {
  const asTooltip = useHelpAsTooltip();
  if (!description) return {};
  if (!asTooltip) return { description };
  return { contextualHelp: <FieldHelp>{description}</FieldHelp> };
}

/**
 * A field's label with its ⓘ beside it, for fields that lay out their own
 * label. Renders the label alone when there's no description or help is
 * inline, so those fields look exactly as upstream draws them.
 */
export function LabelRow(props: {
  description: string | undefined;
  children: ReactElement;
}) {
  const asTooltip = useHelpAsTooltip();
  if (!props.description || !asTooltip) return props.children;
  return (
    <HStack gap="small" alignItems="center">
      {props.children}
      <FieldHelp>{props.description}</FieldHelp>
    </HStack>
  );
}
