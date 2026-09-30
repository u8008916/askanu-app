# Brand assets

Drop **approved, official** files here and the App picks them up with no code
change (`src/ui/brandAssets.ts` globs this folder at build time). Nothing in
here may be redrawn or approximated by hand.

| File (svg, png or webp)        | Used for                                   |
| ------------------------------ | ------------------------------------------ |
| `anu-crest.*`                  | Header crest (light mode)                  |
| `anu-crest-dark.*` (optional)  | Header crest when the dark theme is active |
| `anuhub.*`                     | Quick Link: AnuHub                         |
| `mytimetable.*` (optional)     | Quick Link: MyTimetable                    |
| `canvas.*`                     | Quick Link: Canvas                         |
| `anu-careers.*` (optional)     | Quick Link: ANU Careers                    |

A missing file falls back to the generic placeholder mark or icon, in the same
fixed-size box, so the layout does not change when an asset lands.

Status (30 Sep 2026):

| Slot | State |
| ---- | ----- |
| `anu-crest.png` | Present. Copied unmodified from the file supplied as `Australian_National_University-Logo.wine.png`. |
| `canvas.png` | Present. `Canvas_LMS.png` trimmed to its round icon (no recolour, no redraw). |
| `anu-crest-dark`, `anuhub`, `mytimetable`, `anu-careers` | Not supplied; the App shows the generic placeholder or icon in the same fixed box. |

**Provenance is unconfirmed.** Both present files came from logo.wine-style downloads, not an ANU or Instructure brand portal. Confirm they are approved for use before merge; deleting a file restores its fallback with no code change.
