//ui.tsx

import { TextField } from '@keystar/ui/text-field';
import { useReducer } from 'react';
import { validateDatetime } from './validateDatetime';
import { FormFieldInputProps } from '../../api';
import { useFieldHelp } from '../field-help';

export function DatetimeFieldInput(
  props: FormFieldInputProps<string | null> & {
    label: string;
    description?: string;
    validation?: { isRequired?: boolean; min?: string; max?: string };
  }
) {
  const [blurred, onBlur] = useReducer(() => true, false);

  // FORK (devinchaloux): description inline or as an ⓘ tooltip.
  const help = useFieldHelp(props.description);
  return (
    <TextField
      label={props.label}
      {...help}
      type="datetime-local"
      onChange={val => {
        props.onChange(val === '' ? null : val);
      }}
      autoFocus={props.autoFocus}
      value={props.value === null ? '' : props.value}
      onBlur={onBlur}
      isRequired={props.validation?.isRequired}
      errorMessage={
        blurred || props.forceValidation
          ? validateDatetime(props.validation, props.value, props.label)
          : undefined
      }
    />
  );
}
