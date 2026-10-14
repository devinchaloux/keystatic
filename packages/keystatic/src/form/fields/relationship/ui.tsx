import { Item } from 'react-stately/Item';
import { Combobox } from '@keystar/ui/combobox';
import { useReducer, useMemo, useState, useEffect } from 'react';
import { useSlugsInCollection } from '../../../app/useSlugsInCollection';
import { useEntryLabels } from '../../../app/useEntryLabels';
import { Text } from '@keystar/ui/typography';
import { FormFieldInputProps } from '../../api';
import { useFieldHelp } from '../field-help';

export function RelationshipInput(
  props: FormFieldInputProps<string | null> & {
    collection: string;
    validation: { isRequired?: boolean } | undefined;
    label: string;
    description: string | undefined;
  }
) {
  const [blurred, onBlur] = useReducer(() => true, false);
  const slugs = useSlugsInCollection(props.collection);
  // FORK (devinchaloux): list entries by name, not slug. See useEntryLabels.
  const labels = useEntryLabels(props.collection);
  const options = useMemo(() => {
    return slugs.map(slug => ({ slug, label: labels.get(slug) ?? slug }));
  }, [slugs, labels]);

  const _errorMessage =
    (props.forceValidation || blurred) &&
    props.validation?.isRequired &&
    props.value === null
      ? `${props.label} is required`
      : undefined;
  // this state & effect shouldn't really exist
  // it's here because react-aria/stately calls onChange with null
  // after selecting an item if we immediately remove the error message
  // so we delay it with an effect
  const [errorMessage, setErrorMessage] = useState(_errorMessage);
  useEffect(() => {
    setErrorMessage(_errorMessage);
  }, [_errorMessage]);

  // FORK (devinchaloux): description inline or as an ⓘ tooltip.
  const help = useFieldHelp(props.description);
  return (
    <Combobox
      label={props.label}
      {...help}
      value={props.value}
      onChange={key => {
        if (typeof key === 'string' || key === null) {
          props.onChange(key);
        }
      }}
      onBlur={onBlur}
      autoFocus={props.autoFocus}
      defaultItems={options}
      isRequired={props.validation?.isRequired}
      errorMessage={errorMessage}
      width="auto"
    >
      {item => (
        <Item key={item.slug} textValue={item.label}>
          {item.label === item.slug ? (
            item.label
          ) : (
            <>
              <Text>{item.label}</Text>
              <Text slot="description">{item.slug}</Text>
            </>
          )}
        </Item>
      )}
    </Combobox>
  );
}
