/**
 * Answer text -> display blocks.
 *
 * A grounded answer arrives as plain text in the response's `answer` field. It
 * often carries structure the writer intended to be read as structure: blank
 * lines between paragraphs, dashed or numbered lines for a list, `**label**`
 * for an emphasised lead-in.
 *
 * This module turns that text into *data* describing those blocks. It emits no
 * markup: no tag, no attribute, no href, and it never touches `<`, `>` or `&`.
 * `AnswerBody` renders the result as React text children, so nothing the model
 * or a stored record wrote can become an element. That is the same rule the
 * rest of the chat renders under (`SECURITY_BASELINE.md`: do not execute
 * model/scraped HTML/JS), and it is why no markdown library is used here — a
 * markdown renderer produces HTML, which is exactly what must not happen.
 *
 * The transform is presentation only. No text is dropped, reordered or
 * rewritten: every character of the answer that is not a structural marker
 * survives into a span. An answer with no structure becomes one paragraph,
 * which is what Day 2/3 already rendered.
 */

/** A run of answer text. `strong` marks a `**...**` emphasis span. */
export interface Span {
  text: string;
  strong: boolean;
}

export type Block =
  | { kind: 'paragraph'; spans: Span[] }
  | { kind: 'bullets'; items: Span[][] }
  | { kind: 'numbers'; items: Span[][] };

/** `- item`, `* item`, `• item`. A bare `-` with no text is not a marker. */
const BULLET = /^[-*•]\s+(.*)$/;
/** `1. item`, `2) item`. */
const NUMBER = /^\d{1,3}[.)]\s+(.*)$/;

/**
 * Splits on `**...**`.
 *
 * A marker only opens a span if a closing marker follows on the same line, so
 * an unbalanced or decorative `**` stays literal rather than swallowing the
 * rest of the answer. Empty `****` is left literal for the same reason.
 */
export function toSpans(text: string): Span[] {
  const spans: Span[] = [];
  let rest = text;

  while (rest !== '') {
    const open = rest.indexOf('**');

    if (open === -1) {
      spans.push({ text: rest, strong: false });
      break;
    }

    const close = rest.indexOf('**', open + 2);

    // No closing marker: the rest of the line is ordinary text, asterisks
    // included.
    if (close === -1) {
      spans.push({ text: rest, strong: false });
      break;
    }

    const inner = rest.slice(open + 2, close);

    if (inner === '') {
      // `****` — nothing to emphasise. Keep it literal and move past it.
      spans.push({ text: rest.slice(0, close + 2), strong: false });
      rest = rest.slice(close + 2);
      continue;
    }

    if (open > 0) {
      spans.push({ text: rest.slice(0, open), strong: false });
    }

    spans.push({ text: inner, strong: true });
    rest = rest.slice(close + 2);
  }

  return spans.filter((span) => span.text !== '');
}

/**
 * Groups the answer's lines into paragraphs and lists.
 *
 * Blank line ends the current block. Consecutive bullet lines form one bullet
 * list; consecutive numbered lines form one numbered list. Everything else
 * accumulates into a paragraph, where single newlines are kept as line breaks
 * because the service may use them for short labelled facts.
 */
export function toAnswerBlocks(answer: string): Block[] {
  const blocks: Block[] = [];
  // Normalise line endings only. Content is untouched.
  const lines = answer.replace(/\r\n?/g, '\n').split('\n');

  let paragraph: string[] = [];
  let items: string[] = [];
  let listKind: 'bullets' | 'numbers' | null = null;

  function flushParagraph() {
    if (paragraph.length === 0) {
      return;
    }
    blocks.push({ kind: 'paragraph', spans: toSpans(paragraph.join('\n')) });
    paragraph = [];
  }

  function flushList() {
    if (listKind === null) {
      return;
    }
    blocks.push({ kind: listKind, items: items.map(toSpans) });
    items = [];
    listKind = null;
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '') {
      flushParagraph();
      flushList();
      continue;
    }

    const bullet = BULLET.exec(trimmed);
    const numbered = bullet ? null : NUMBER.exec(trimmed);
    const kind = bullet ? 'bullets' : numbered ? 'numbers' : null;

    if (kind === null) {
      flushList();
      paragraph.push(trimmed);
      continue;
    }

    flushParagraph();

    // A bullet list directly followed by a numbered list is two lists, not one.
    if (listKind !== null && listKind !== kind) {
      flushList();
    }

    listKind = kind;
    items.push((bullet ?? numbered)![1].trim());
  }

  flushParagraph();
  flushList();

  return blocks;
}
