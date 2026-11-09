# BienEdu V5 — Mathematical content rendering

> V5.1 supersedes the historical badge policy below: import, source mapping, legacy agent reviews and rendering checks produce no visible verification badge. Only explicit human evidence bound to the exact content/version/source may show source verification or mathematical approval. See [the V5.1 report](../content/source-verification-v5.1.md).

## Shared rendering boundary

All imported Knowledge formulas and inline mathematical fragments continue through `assets/js/components/markdown-math-renderer.js`. V5 does not add a second rendering component or a PDF fallback.

The renderer now applies one source-aware strict policy:

- ordinary unsupported commands, malformed syntax and unsupported Unicode remain hard failures;
- non-ASCII source text is allowed only when it is fully enclosed by explicit `\text{...}` commands;
- `renderAsMath: true` forces a source-verified expression through KaTeX instead of re-running a weaker visual heuristic;
- unset legacy values keep the existing heuristic, preserving explanatory text that should not become mathematics.

This boundary fixes the CD22.7 Vietnamese probability formula without weakening validation for unrelated expressions.

## Content behavior

- Conditional probability uses `\mid` rather than a plain vertical bar.
- Division in the verified CD22.7 formula uses `\frac{...}{...}`.
- Sensitivity, specificity, prevalence and warning text use inline KaTeX delimiters.
- Unicode source indices such as `Bⱼ` remain symbolic and normalize to `B_{j}` before prose-label detection.
- Empty source labels render no decorative label; the UI does not manufacture “Điểm 1/2”.
- Review badges expose the strongest completed gate only:
  - `Đã kiểm duyệt` for fully verified legacy/approved records;
  - `Đã đối chiếu nguồn` for source-verified native imports;
  - `Đã kiểm tra hiển thị` when only rendering is validated;
  - `Chờ kiểm duyệt toán học` otherwise.

## Responsive behavior

The existing Learning Workspace composition is retained. At 1920, 1366 and 768 pixels, the normal CD22.7 equation fits without an equation scrollbar. At 390 pixels it remains inside the formula card and does not create page-level horizontal overflow. Equation-level scrolling remains available only for expressions that are genuinely wider than their container.

Playwright screenshots:

- `.audit/math-content-v5-cd22-7-1920x1080.png`
- `.audit/math-content-v5-cd22-7-1366x768.png`
- `.audit/math-content-v5-cd22-7-768x1024.png`
- `.audit/math-content-v5-cd22-7-390x844.png`
- mobile/tablet bottom-state screenshots with the same prefix and `-bottom`

The targeted layout review kept BienEdu typography, colors, sidebar, progress model and navigation unchanged. It only removed unsupported generic labels and made the corrected mathematical hierarchy readable within the existing component system. A full field-level pass rendered 4,710 Knowledge and Example fields with zero fallback errors.

