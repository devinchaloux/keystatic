import { setBlockType } from 'prosemirror-commands';
import { NodeType } from 'prosemirror-model';
import { Command, NodeSelection } from 'prosemirror-state';
import { getEditorSchema } from '../schema';

// FORK (devinchaloux): inserting an inline component opens its form.
//
// Upstream drops an empty chip and stops: the cursor lands after the node, so
// nothing is selected and no popover shows (click one), and the popover's
// dialog always mounts closed (click two). Here insertNode selects the new
// inline atom and raises this flag; InlineComponentPopover consumes it on
// mount and opens the dialog straight away. Read-and-clear, so a flag left
// by an insert that never produced a popover is dropped by the next one.
let autoOpenNextInlinePopover = false;

export function consumeAutoOpen(
  componentSchema: Record<string, unknown> | undefined
): boolean {
  if (!autoOpenNextInlinePopover) return false;
  autoOpenNextInlinePopover = false;
  // A component with no fields has nothing to show; an empty dialog would be
  // worse than the chip it replaced.
  return !!componentSchema && Object.keys(componentSchema).length > 0;
}

export function insertNode(nodeType: NodeType): Command {
  return (state, dispatch) => {
    if (
      state.selection instanceof NodeSelection &&
      state.selection.node.type === nodeType
    ) {
      return false;
    }
    if (dispatch) {
      const node = nodeType.createAndFill()!;
      const tr = state.tr.replaceSelectionWith(node);
      // FORK: inline atoms only. A wrapper or block has its own chrome and you
      // type inside it, where a NodeSelection would fight the cursor.
      if (nodeType.isAtom && nodeType.isInline) {
        // replaceSelectionWith leaves the cursor just after the node, so the
        // node starts one nodeSize back. Checked before trusting it.
        const pos = tr.selection.from - node.nodeSize;
        if (pos >= 0 && tr.doc.nodeAt(pos)?.type === nodeType) {
          tr.setSelection(NodeSelection.create(tr.doc, pos));
          autoOpenNextInlinePopover = true;
        }
      }
      dispatch(tr);
    }
    return true;
  };
}

export function toggleCodeBlock(
  codeBlock: NodeType,
  paragraph: NodeType
): Command {
  return (state, dispatch, view) => {
    const codeBlockPositions: [start: number, end: number][] = [];
    for (const range of state.selection.ranges) {
      state.doc.nodesBetween(range.$from.pos, range.$to.pos, (node, pos) => {
        if (node.type === codeBlock) {
          codeBlockPositions.push([pos, pos + node.nodeSize]);
        }
      });
    }
    if (!codeBlockPositions.length) {
      return setBlockType(codeBlock)(state, dispatch, view);
    }
    if (dispatch) {
      const tr = state.tr;
      for (const [start, end] of codeBlockPositions) {
        tr.setBlockType(start, end, paragraph);
      }
      dispatch(tr);
    }
    return true;
  };
}

export function insertTable(tableType: NodeType): Command {
  const rowType = tableType.contentMatch.defaultType!;
  const cellType = rowType.contentMatch.defaultType!;
  const headerType = getEditorSchema(tableType.schema).nodes.table_header!;
  return (state, dispatch) => {
    const header = headerType.createAndFill()!;
    const cell = cellType.createAndFill()!;
    const headerRow = rowType.create(undefined, [header, header, header]);
    const row = rowType.create(undefined, [cell, cell, cell]);
    dispatch?.(
      state.tr.replaceSelectionWith(
        tableType.create(undefined, [headerRow, row, row])
      )
    );

    return true;
  };
}
