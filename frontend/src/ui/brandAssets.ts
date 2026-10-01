/**
 * Approved brand files, discovered at build time from `src/assets/brand/`.
 *
 * The App never draws or approximates a crest or a third-party logo: a slot is
 * filled only by a file someone dropped in that folder. An empty folder is a
 * valid state and every consumer renders a generic fallback for it.
 */
const FILES = import.meta.glob('../assets/brand/*.{svg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export type BrandAssetName =
  | 'anu-crest'
  | 'anu-crest-dark'
  | 'anuhub'
  | 'mytimetable'
  | 'canvas'
  | 'anu-careers';

/** The URL of the approved asset for `name`, or `null` when none was supplied. */
export function brandAsset(name: BrandAssetName): string | null {
  for (const [path, url] of Object.entries(FILES)) {
    const file = path.slice(path.lastIndexOf('/') + 1);
    if (file.slice(0, file.lastIndexOf('.')) === name) {
      return url;
    }
  }
  return null;
}
