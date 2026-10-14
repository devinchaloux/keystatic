import { FormFieldInputProps } from '../../api';
import { Checkbox } from '@keystar/ui/checkbox';
import { Flex } from '@keystar/ui/layout';
import { Text } from '@keystar/ui/typography';
import { FieldHelp, useHelpAsTooltip } from '../field-help';

export function CheckboxFieldInput(
  props: FormFieldInputProps<boolean> & {
    label: string;
    description?: string;
  }
) {
  // FORK (devinchaloux): as a tooltip, the ⓘ sits beside the checkbox, not
  // inside its label, where pressing it would toggle the box.
  const asTooltip = useHelpAsTooltip();
  const checkbox = (
    <Checkbox
      isSelected={props.value}
      onChange={props.onChange}
      autoFocus={props.autoFocus}
    >
      <Text>{props.label}</Text>
      {props.description && !asTooltip && (
        <Text slot="description">{props.description}</Text>
      )}
    </Checkbox>
  );
  if (!props.description || !asTooltip) return checkbox;
  return (
    <Flex alignItems="center" gap="small">
      {checkbox}
      <FieldHelp>{props.description}</FieldHelp>
    </Flex>
  );
}
