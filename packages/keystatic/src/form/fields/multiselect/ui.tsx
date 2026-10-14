import { Checkbox } from '@keystar/ui/checkbox';
import { FieldLabel } from '@keystar/ui/field';
import { Flex } from '@keystar/ui/layout';
import { useId } from 'react';
import { FormFieldInputProps } from '../../api';
import { Text } from '@keystar/ui/typography';
import { LabelRow, useHelpAsTooltip } from '../field-help';

export function MultiselectFieldInput<Value extends string>(
  props: FormFieldInputProps<readonly Value[]> & {
    options: readonly { label: string; value: Value }[];
    label: string;
    description: string | undefined;
  }
) {
  const labelId = useId();
  const descriptionId = useId();
  const asTooltip = useHelpAsTooltip();
  return (
    <Flex
      role="group"
      aria-labelledby={labelId}
      aria-describedby={
        props.description && !asTooltip ? descriptionId : undefined
      }
      direction="column"
      gap="medium"
    >
      <LabelRow description={props.description}>
        <FieldLabel elementType="span" id={labelId}>
          {props.label}
        </FieldLabel>
      </LabelRow>
      {props.description && !asTooltip && (
        <Text id={descriptionId} size="small" color="neutralSecondary">
          {props.description}
        </Text>
      )}
      {props.options.map(option => (
        <Checkbox
          key={option.value}
          isSelected={props.value.includes(option.value)}
          onChange={() => {
            if (props.value.includes(option.value)) {
              props.onChange(props.value.filter(x => x !== option.value));
            } else {
              props.onChange([...props.value, option.value]);
            }
          }}
        >
          {option.label}
        </Checkbox>
      ))}
    </Flex>
  );
}
