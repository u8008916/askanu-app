/**
 * SECURITY_BASELINE.md: source URLs come from stored records, and stored
 * records are untrusted text. A `javascript:` or `data:` href would execute in
 * the page on click, so a URL is only rendered as a link once it has parsed as
 * `http:` or `https:`.
 *
 * This is a guard, not a rewriter: a URL that fails is shown as plain text, and
 * the App never repairs or guesses a replacement.
 */
export function isSafeHttpUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    // Relative or malformed. The contract stores canonical absolute URLs, so
    // anything unparseable is not a source we can safely link to.
    return false;
  }
  return parsed.protocol === 'http:' || parsed.protocol === 'https:';
}
