# Brand assets

Only approved, official brand files belong in this directory. The App discovers
supported SVG, PNG and WebP files at build time through `src/ui/brandAssets.ts`.
Brand marks are never redrawn or approximated by hand.

| File (svg, png or webp)       | Used for |
| ----------------------------- | -------- |
| `anu-logo.*`                  | Header ANU horizontal logo |
| `anu-crest.*` (optional)      | Header crest fallback when no horizontal logo is supplied |
| `anu-crest-dark.*` (optional) | Dark-theme crest fallback |
| `anuhub.*`                    | Quick Link: AnuHub |
| `mytimetable.*` (optional)    | Quick Link: MyTimetable |
| `canvas.*`                    | Quick Link: Canvas |
| `anu-careers.*` (optional)    | Quick Link: ANU Careers |

Header resolution order is `anu-logo` first, then the approved crest assets,
then the generic placeholder. Missing Quick Link assets use their generic icon
fallbacks.

Status (2 Oct 2026): `anu-logo.png` is bundled from the official ANU Imagebank
colour-logo resource. AnuHub, MyTimetable, Canvas and ANU Careers brand files
have not been supplied, so those links continue to use the generic fallbacks.

ANU logo source:
https://imagebank.anu.edu.au/anulogocolourpng
