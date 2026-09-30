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

Status (30 Sep 2026): **no brand file is bundled.** A crest and a Canvas icon were tried
from logo.wine-style downloads and removed again because their provenance was not
confirmed as approved. Until official ANU and Instructure files are supplied, the App
shows the generic placeholder mark and icon fallbacks, all in the same fixed boxes.
Approved files need only be dropped in with the names above; no code change is needed.
