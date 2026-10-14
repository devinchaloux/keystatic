import { useMemo } from 'react';

import { EditorPopover } from '@keystar/ui/editor';

import { useEditorViewRef } from '../editor-view';
import { useEditorKeydownListener } from '../keydown';
import { useEditorReferenceElement } from '../popovers/reference';
import { EditorListboxProps, useEditorListbox } from './EditorListbox';

export function EditorAutocomplete<Item extends object>(
  props: Omit<EditorListboxProps<Item>, 'listenerRef'> & {
    from: number;
    to: number;
  }
) {
  const viewRef = useEditorViewRef();
  const referenceElement = useEditorReferenceElement(props.from, props.to);
  const listenerRef = useMemo(() => {
    return {
      get current() {
        return viewRef.current?.dom ?? null;
      },
    };
  }, [viewRef]);
  const { keydownListener, listbox } = useEditorListbox({
    listenerRef,
    ...props,
    // FORK (devinchaloux): a capped height. Upstream stretches the menu to
    // fill all the room above or below the cursor, so a "/" near the bottom
    // of a long piece opened a list taller than the screen.
    UNSAFE_style: { width: 320, maxHeight: 320, ...props.UNSAFE_style },
  });
  useEditorKeydownListener(event => {
    keydownListener(event);
    return event.defaultPrevented;
  });

  return (
    referenceElement && (
      <EditorPopover
        adaptToBoundary="stretch"
        portal={false}
        minWidth="element.medium"
        placement="bottom-start"
        reference={referenceElement}
        // FORK (devinchaloux): above the editor's sticky toolbar (z-index
        // 2). When the menu opens upward it otherwise slides underneath it.
        UNSAFE_style={{ zIndex: 3 }}
      >
        {listbox}
      </EditorPopover>
    )
  );
}
