import { useContext, useState } from 'react';
import { FormFieldInputProps } from '../../api';
import { TextArea, TextField } from '@keystar/ui/text-field';
import { validateText } from './validateText';
import { PathContext, SlugFieldContext } from './path-slug-context';
import { useFieldHelp } from '../field-help';

export function TextFieldInput(
  props: FormFieldInputProps<string> & {
    multiline: boolean;
    label: string;
    description: string | undefined;
    min: number;
    max: number;
    pattern: { regex: RegExp; message?: string } | undefined;
  }
) {
  const TextFieldComponent = props.multiline ? TextArea : TextField;
  const [blurred, setBlurred] = useState(false);
  const slugContext = useContext(SlugFieldContext);
  const path = useContext(PathContext);
  // FORK (devinchaloux): description inline or as an ⓘ tooltip.
  const help = useFieldHelp(props.description);
  return (
    <TextFieldComponent
      label={props.label}
      {...help}
      autoFocus={props.autoFocus}
      value={props.value}
      onChange={props.onChange}
      onBlur={() => setBlurred(true)}
      isRequired={props.min > 0}
      errorMessage={
        props.forceValidation || blurred
          ? validateText(
              props.value,
              props.min,
              props.max,
              props.label,
              path.length === 1 && slugContext?.field === path[0]
                ? slugContext
                : undefined,
              props.pattern
            )
          : undefined
      }
    />
  );
}
