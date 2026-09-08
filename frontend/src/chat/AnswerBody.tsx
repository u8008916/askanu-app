import { Fragment } from 'react';
import { toAnswerBlocks } from './answerBlocks';
import type { Span } from './answerBlocks';
import styles from './AnswerBody.module.css';

/**
 * Renders one answer string as paragraphs and lists.
 *
 * Every piece of text below is a React child, never markup: `answer` is an
 * untrusted model string, so `<script>` in it must appear on screen as those
 * characters. There is no `dangerouslySetInnerHTML` here and no markdown
 * renderer behind it — `answerBlocks.ts` returns plain data and this component
 * chooses the elements.
 *
 * `size` picks the answer scale or the compact notice scale. It changes type
 * size and spacing only; the same block structure is produced either way, so a
 * two-paragraph abstention reads as two paragraphs without growing into an
 * answer-sized block.
 */
interface AnswerBodyProps {
  answer: string;
  size?: 'answer' | 'compact';
}

/**
 * Ordinary text is emitted as a text node, not wrapped in an element: the
 * paragraph or list item stays the only element carrying that text, which keeps
 * the accessible name and the DOM as simple as the single `<p>` this replaced.
 */
function Spans({ spans }: { spans: Span[] }) {
  return (
    <>
      {spans.map((span, index) =>
        span.strong ? (
          <strong key={index}>{span.text}</strong>
        ) : (
          <Fragment key={index}>{span.text}</Fragment>
        ),
      )}
    </>
  );
}

export function AnswerBody({ answer, size = 'answer' }: AnswerBodyProps) {
  const blocks = toAnswerBlocks(answer);

  // An answer that is only whitespace produces no blocks. Callers decide what
  // to show instead; rendering an empty container here would add stray spacing.
  if (blocks.length === 0) {
    return null;
  }

  return (
    <div
      className={`${styles.root} ${size === 'compact' ? styles.compact : ''}`}
    >
      {blocks.map((block, index) => {
        if (block.kind === 'paragraph') {
          return (
            <p className={styles.paragraph} key={index}>
              <Spans spans={block.spans} />
            </p>
          );
        }

        const List = block.kind === 'bullets' ? 'ul' : 'ol';

        return (
          <List className={styles.list} key={index}>
            {block.items.map((item, itemIndex) => (
              <li className={styles.item} key={itemIndex}>
                <Spans spans={item} />
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
