import { describe, expect, it } from 'vitest';
import { toAnswerBlocks, toSpans } from '../src/chat/answerBlocks';

/**
 * The formatter is the only new thing standing between an untrusted model
 * string and the DOM, so it is tested as a pure function first: what it returns
 * is data, and nothing it returns can be markup.
 */
describe('toSpans', () => {
  it('returns one plain span for text with no emphasis', () => {
    expect(toSpans('Plain text.')).toEqual([
      { text: 'Plain text.', strong: false },
    ]);
  });

  it('splits **emphasis** into a strong span', () => {
    expect(toSpans('**Prerequisites:** COMP1100')).toEqual([
      { text: 'Prerequisites:', strong: true },
      { text: ' COMP1100', strong: false },
    ]);
  });

  it('handles emphasis in the middle and at the end', () => {
    expect(toSpans('a **b** c **d**')).toEqual([
      { text: 'a ', strong: false },
      { text: 'b', strong: true },
      { text: ' c ', strong: false },
      { text: 'd', strong: true },
    ]);
  });

  it('leaves an unbalanced marker literal', () => {
    expect(toSpans('2 ** 3 is not emphasis')).toEqual([
      { text: '2 ** 3 is not emphasis', strong: false },
    ]);
  });

  it('leaves an empty **** literal', () => {
    expect(toSpans('before ****after')).toEqual([
      { text: 'before ****', strong: false },
      { text: 'after', strong: false },
    ]);
  });
});

describe('toAnswerBlocks', () => {
  it('renders an unstructured answer as a single paragraph', () => {
    expect(toAnswerBlocks('One sentence. Another sentence.')).toEqual([
      {
        kind: 'paragraph',
        spans: [{ text: 'One sentence. Another sentence.', strong: false }],
      },
    ]);
  });

  it('splits paragraphs on a blank line', () => {
    const blocks = toAnswerBlocks('First.\n\nSecond.');

    expect(blocks).toHaveLength(2);
    expect(blocks.every((block) => block.kind === 'paragraph')).toBe(true);
  });

  it('keeps a single newline as a line break inside one paragraph', () => {
    expect(toAnswerBlocks('Label:\nValue')).toEqual([
      { kind: 'paragraph', spans: [{ text: 'Label:\nValue', strong: false }] },
    ]);
  });

  it('groups consecutive bullet lines into one list', () => {
    const blocks = toAnswerBlocks('- one\n- two\n* three\n• four');

    expect(blocks).toEqual([
      {
        kind: 'bullets',
        items: [
          [{ text: 'one', strong: false }],
          [{ text: 'two', strong: false }],
          [{ text: 'three', strong: false }],
          [{ text: 'four', strong: false }],
        ],
      },
    ]);
  });

  it('groups numbered lines into one ordered list, keeping order', () => {
    const blocks = toAnswerBlocks('1. first\n2) second\n3. third');

    expect(blocks).toEqual([
      {
        kind: 'numbers',
        items: [
          [{ text: 'first', strong: false }],
          [{ text: 'second', strong: false }],
          [{ text: 'third', strong: false }],
        ],
      },
    ]);
  });

  it('treats a bullet list followed by a numbered list as two lists', () => {
    const blocks = toAnswerBlocks('- one\n1. two');

    expect(blocks.map((block) => block.kind)).toEqual(['bullets', 'numbers']);
  });

  it('handles a mixed answer: paragraph, list, paragraph', () => {
    const blocks = toAnswerBlocks(
      'Intro paragraph.\n\n- one\n- two\n\nClosing paragraph.',
    );

    expect(blocks.map((block) => block.kind)).toEqual([
      'paragraph',
      'bullets',
      'paragraph',
    ]);
  });

  it('does not treat a dash inside a sentence as a list', () => {
    const blocks = toAnswerBlocks('COMP1110 - Structured Programming');

    expect(blocks.map((block) => block.kind)).toEqual(['paragraph']);
  });

  it('returns no blocks for empty or whitespace-only text', () => {
    expect(toAnswerBlocks('')).toEqual([]);
    expect(toAnswerBlocks('   \n\n  ')).toEqual([]);
  });

  it('preserves every non-marker character of the answer', () => {
    const answer =
      'Intro **bold** text.\n\n- item one\n- item two\n\n1. step one';
    const blocks = toAnswerBlocks(answer);

    const rendered = blocks
      .flatMap((block) =>
        block.kind === 'paragraph' ? [block.spans] : block.items,
      )
      .map((spans) => spans.map((span) => span.text).join(''))
      .join(' ');

    expect(rendered).toBe('Intro bold text. item one item two step one');
  });

  it('never emits markup: hostile text stays exactly as written', () => {
    const hostile =
      '<img src=x onerror=alert(1)>\n\n- <script>alert(2)</script>\n- **<b>x</b>**';
    const texts = toAnswerBlocks(hostile)
      .flatMap((block) =>
        block.kind === 'paragraph' ? [block.spans] : block.items,
      )
      .flat()
      .map((span) => span.text);

    expect(texts).toEqual([
      '<img src=x onerror=alert(1)>',
      '<script>alert(2)</script>',
      '<b>x</b>',
    ]);
    // Angle brackets are carried through untouched — no escaping, no stripping,
    // no tag construction. React turns them into text at render time.
    expect(texts.join('')).not.toContain('&lt;');
  });
});
