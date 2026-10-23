# BienEdu V13.1 — LaTeX QA report

Date: 2026-10-23

## Result

- 357 Knowledge/Example formula records were inspected across CD12, CD13, CD14, CD20 and CD21.
- 302 live mathematical expressions and 8 approved raw-LaTeX expressions passed strict KaTeX parsing (`throwOnError: true`, `strict: "error"`). The remaining 55 formula-card values are instructional text and intentionally stay as text.
- 1,438 generated/source-practice prompt, option, solution and answer fields were regression-rendered without learner-visible KaTeX errors.
- 61 unique formula records were corrected or standardized:
  - 53 records depended on safe TeX control-word boundaries (`\int P`, `\sum a`, `\int u`, and related commands).
  - 5 source records had bounds or indices restored directly from the PDF source.
  - 9 records were normalized to explicit `\frac{...}{...}` notation; 6 of these overlap the 53 boundary-affected records.
- Unresolved LaTeX cases: 0.
- Existing unrelated source-answer conflicts: 9. They remain marked `needs-review` and are not auto-graded.

## Root cause and remediation

The Unicode-to-LaTeX converter emitted control words immediately before ASCII variables. TeX consumes adjacent letters as part of the command, turning valid source such as `∫P`, `Σa` and `∫u` into unsupported commands such as `\intP`, `\suma` and `\intu`.

The renderer now creates semantic command boundaries, preserves Unicode subscripts/superscripts, converts unambiguous fractions, and validates every resulting expression with strict KaTeX before rendering. Unsupported input is surfaced as a neutral review notice rather than red KaTeX error text. Source expressions whose bounds or grouping could not be reconstructed safely by a tokenizer were corrected directly with `String.raw` values after PDF comparison.

## Source verification

The corrected bounds, coefficients, indices and conditions were checked against the mirrored source PDFs. No missing expression was invented.

- `bienedu-nguyen-ham-tich-phan-cd12-cd14.pdf`
  - SHA-256: `4E65F476DA0A1B817A05B6E829737100B753A2E5219236F719ACAB016F221E59`
- `ly-thuyet-to-hop-xac-suat-thong-ke-cd20-cd23.pdf`
  - SHA-256: `66B1D93392F834CA8659902CE7F1020F7CB3220C758DF1D697837340840E9293`

## Layout QA

- Playwright inspected 102 Knowledge routes and 188 Example routes at 1440×900 and 390×844.
- No page-level horizontal overflow, runtime error, `.katex-error`, or `.math-render-error` was found.
- Ordinary desktop equations fit naturally. Only 2 genuinely long CD12.1 equations use equation-level scrolling on desktop.
- On mobile, 21 long equations use contained equation-level scrolling without widening the page.
- Four representative screenshots are stored under `.audit/v13-1-latex-*.png`.

## Automated verification

`npm run verify` passed in full:

- source check: 36 JavaScript files and 5 HTML entries
- content scan: 2 source PDFs
- content registry validation: passed
- unit/regression suite: 72/72 passed
- focused LaTeX suite: 6/6 passed
- V13 native learning QA: 51 lessons, 8 representative routes, 7 viewports
- homepage scroll QA: passed across 7 responsive viewports
- polish QA: passed across 10 viewports

No PDF viewer was restored, and no deployment or push was performed.
