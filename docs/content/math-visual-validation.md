# Mathematical and visual validation

Generated: 2026-10-28

## Automated checks

- 1,662 imported Knowledge/Example formula slots are passed through the shared math renderer.
- Control-word boundary regressions (`\intP`, `\suma`, `\intu`) are tested.
- Nested PDF span markers, superscript decimals/fractions, composition notation and simple fractions are normalized before KaTeX parsing.
- Unsupported expressions fail closed as a review notice rather than red raw KaTeX output.

## Source figures

188 example regions were extracted from the immutable PDF at 2.4× resolution. Each asset stores:

- document ID;
- problem type and original example number;
- source page;
- PDF clip coordinates;
- `source-extracted-needs-visual-review` status.

The original region is retained instead of reconstructing graphs or geometry. No generative image system was used.

## Validation status

Automated checks establish renderability and traceability, not mathematical proof. The 188 figure assets and 1,210 worked solutions remain `NEEDS_REVIEW` until a tutor compares labels, signs, coordinates and solution meaning against the recorded PDF page.
