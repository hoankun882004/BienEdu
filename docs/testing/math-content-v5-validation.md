# BienEdu V5 — Math content validation report

Validation date: 2026-11-04

## Baseline

Before V5 changes, the existing full `npm run verify` pipeline passed: 117 Node tests plus the existing LaTeX and Playwright suites. This established the V4.2 state before correcting CD22.7.

## Added automated coverage

`tests/math-content-v5.test.js` verifies:

1. exact CD22.7 structured LaTeX and source line mapping;
2. display and inline KaTeX output with no red fallback, including `B_j` in CD22.5;
3. fractions, powers, indices, Greek symbols, radicals and conditions;
4. independent source-fidelity and mathematical-review gates;
5. Knowledge → Example navigation and stable IDs;
6. conservative practice publication and CD12 grading exclusions;
7. checkpoint integrity, source checksums and figure presence.

`.audit/math-content-v5.mjs` checks the learner UI at 1920×1080, 1366×768, 768×1024 and 390×844. It asserts:

- source-aware badge and exact CD22.7 title;
- inline and display KaTeX presence;
- fraction structure;
- no `.math-render-error` or `.katex-error`;
- no page-level overflow or unnecessary equation overflow;
- no PDF controls;
- no generic “Điểm 1/2” labels;
- final mobile content clears the sticky navigation;
- the source Example exposes provenance and does not invent a solution.

## Final result

- 1,668 formula/expression slots scanned.
- 459 expressions rendered as mathematics; 459 valid.
- 4,710 Knowledge/Example fields rendered through their production path; 0 fallback errors.
- 0 parse failures.
- 188 referenced figures; 0 missing files.
- 5 source documents; 5 checksum matches.
- CD22.7 and the CD22.5 inline-index conversion corrected; CD22.7 visually inspected at all four required viewport widths.
- 180 conservative fraction candidates retained for human review rather than auto-rewritten.
- 18 native CD22 units remain explicitly queued for mathematical review.

The complete `npm run verify` pipeline passed after the V5 corrections:

- source check: 40 JavaScript files and 5 HTML entries;
- content scan and registry validation: passed;
- main Node suite: 125/125 passed;
- dedicated LaTeX suite: 6/6 passed;
- native-LaTeX V4.2 and Math V5 Playwright suites: passed at 1920, 1366, 768 and 390 pixels;
- V13 native learning, V15 workspace, V4 navigation, V16 onboarding/registration, homepage scrolling and polish regression suites: passed;
- 0 desktop equation overflows; 2 genuinely long legacy equations use contained mobile equation scrolling; 0 page-level horizontal overflow in the V5 route.

## Commands

```text
npm run content:latex:pilot
npm run content:math:audit
node --test tests/math-content-v5.test.js
npm run test:v5
npm run verify
git diff --check
```

No commit, push or deployment was performed.

