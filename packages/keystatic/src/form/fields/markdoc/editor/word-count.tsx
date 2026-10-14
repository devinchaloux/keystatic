// FORK (devinchaloux): a live word count for the piece being written.
//
// A quiet line pinned to the bottom of the editor: "1,114 words", or "41 of
// 1,114 words" while text is selected. Not in the toolbar, where it pushed
// buttons out of sight. Counts the words of the prose as it reads: runs of letters or digits, with
// apostrophes and hyphens kept inside a word ("don't", "drum-and-bass" are
// one each). Components drawn as chips (citations, examples, footnotes) are
// not prose and don't count.

import { Node } from 'prosemirror-model';
import { useMemo } from 'react';
import { css, tokenSchema } from '@keystar/ui/style';

import { useEditorState } from './editor-view';

const WORD = /[\p{L}\p{N}]+(?:['’\-‐][\p{L}\p{N}]+)*/gu;

/** The number of words in a run of text. */
export function countWords(text: string): number {
  return text.match(WORD)?.length ?? 0;
}

/** Words in a document, or in part of it between two positions. */
export function countDocWords(
  doc: Node,
  from = 0,
  to = doc.content.size
): number {
  // Blocks and leaf nodes become spaces, so words either side of a paragraph
  // break or a chip don't run together.
  return countWords(doc.textBetween(from, to, ' ', ' '));
}

const wordFormat = new Intl.NumberFormat();
const words = (n: number) => wordFormat.format(n);

export function WordCount() {
  const { doc, selection } = useEditorState();
  const total = useMemo(() => countDocWords(doc), [doc]);
  const selected = useMemo(
    () =>
      selection.empty ? null : countDocWords(doc, selection.from, selection.to),
    [doc, selection]
  );
  return (
    <div
      data-keystatic-editor="word-count"
      className={css({
        position: 'sticky',
        bottom: 0,
        display: 'flex',
        justifyContent: 'flex-end',
        pointerEvents: 'none',
        marginTop: 'auto',
      })}
    >
      <span
        className={css({
          backgroundColor: tokenSchema.color.background.canvas,
          borderStartStartRadius: tokenSchema.size.radius.medium,
          color: tokenSchema.color.foreground.neutralTertiary,
          fontFamily: tokenSchema.typography.fontFamily.base,
          fontSize: tokenSchema.typography.text.small.size,
          paddingBlock: tokenSchema.size.space.small,
          paddingInline: tokenSchema.size.space.medium,
          whiteSpace: 'nowrap',
        })}
      >
        {selected === null
          ? `${words(total)} ${total === 1 ? 'word' : 'words'}`
          : `${words(selected)} of ${words(total)} words`}
      </span>
    </div>
  );
}
