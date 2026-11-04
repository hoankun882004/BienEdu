# Native LaTeX conversion pilot — CD22

Pilot date: 2026-11-03  
Status: imported into the existing content registry; no deployment performed

## Source inspection

One source file was found in `file tài liệu latex`:

- `Ly_thuyet_To_hop_Xac_suat_Thong_ke_CD20_CD23.tex`
- SHA-256: `BD4F99C88A8852A8AB2FD0AF9F07C63491039F1AED0DC0FA1E04F98D0BA5FF99`
- 1,068 physical lines, 59,239 bytes
- Main document: `article`, title `Lý thuyết Tổ hợp - Xác suất - Thống kê CD20-CD23`
- Chapters: CD20 (line 175), CD21 (500), CD22 (631), CD23 (790)

No `.sty`, `.cls`, `.bib`, image, SVG, included TeX, or other supporting asset exists in this source directory. The document has no `\input`, `\include`, `\includegraphics`, TikZ, or PGFPlots dependency. It is therefore self-contained for this pilot.

Packages discovered: `geometry`, `fontspec`, `amsmath`, `amssymb`, `array`, `booktabs`, `tabularx`, `longtable`, `enumitem`, `tcolorbox`, `xcolor`, `titlesec`, `fancyhdr`, `hyperref`, and `microtype`.

Relevant custom structure includes `\chaptertitle`, `\topic`, `leadbox`, `formulabox`, `examplebox`, `tipbox`, `warningbox`, `notebox`, and `keypoints`. The parser resolves balanced command arguments and environment boundaries instead of applying document-wide regex substitutions.

## Topic mapping and exclusions

- CD20 and CD21 are hard-excluded at the write layer. Their existing Knowledge, Examples, IDs, validation state, and progress model were not rewritten.
- CD22 was missing before the pilot and maps exactly to the nine registry entries 22.1–22.9.
- CD23 also maps with high confidence, but remains read-only because this task permits one pilot topic only.
- No other registry topic appears in the supplied LaTeX source.

The detailed 39-topic audit is in [latex-topic-coverage.md](./latex-topic-coverage.md).

## Conversion results

Selected topic: **CD22 — Xác suất có điều kiện**.

| Item | Result |
|---|---:|
| Registry sections imported | 9 |
| Source examples imported | 9 |
| Source solutions imported | 0 |
| KaTeX-rendered symbolic expressions | 6 |
| Source formula statements kept as readable text | 1 |
| Figures / external images | 0 |
| Tables requiring conversion | 0 |
| Unsupported commands in published math | 0 |
| Conversion errors | 0 |

Every example remains in source order and has a stable ID such as `22.5-native-example-1`. The source provides example statements but no reliably separable worked solutions, so `steps` stays empty and `answer` stays `null`. The UI explicitly reports that no source-backed solution was mapped; no solution was invented.

The converter preserves symbolic expressions as LaTeX and validates them with the installed KaTeX renderer. Top-level source fractions are normalized to `\frac{...}{...}`, conditional-probability bars use `\mid`, and coefficients, indices, intersections, and conditions remain attached to their source sections.

One source statement is intentionally not passed to KaTeX:

- 22.3 is a natural-language rule inside a formula box, not a standalone symbolic expression.

CD22.7 is rendered as structured LaTeX with `\text{bệnh}`, `\mid`, and `\frac`. The strict policy permits Vietnamese fallback glyphs only when every non-ASCII character is confined to an explicit `\text{...}` command; unsupported Unicode outside text mode remains an error.

## Accuracy results

- CD22 section codes, titles, order, and line ranges were compared directly with source lines 631–789.
- All six symbolic expressions parse successfully with source-aware strict KaTeX validation.
- All nine example blocks were associated with the enclosing source topic and preserve source line provenance.
- No equation, paragraph, example, solution, table, or figure was inferred from another topic.
- The browser exposes no PDF viewer or raw `.tex` processing path.
- CD22.5 Bayes was visually checked for fraction structure and responsive overflow; CD22.7 was checked for exact readable source text and zero math-error elements.

XeLaTeX is not installed in the project environment, so a freshly compiled PDF reference was not claimed. Accuracy validation used the original TeX text, source line boundaries, KaTeX parse output, registry mapping, and browser screenshots. The main remaining review item is mathematical editorial review of the source itself; successful KaTeX parsing alone is not treated as proof that the authorial mathematics is correct.

## Implementation

Created:

- `scripts/latex-pilot/parser.mjs` — structure-aware inspection, normalization, validation, and staging serialization.
- `scripts/latex-pilot/import.mjs` — deterministic, guarded import generator.
- `assets/js/data/latex-pilot.generated.js` — immutable CD22 runtime records.
- `docs/content/staging/latex-pilot-cd22.json`
- `docs/content/staging/latex-pilot-cd22.md`
- `tests/latex-import-pilot.test.js`
- `.audit/latex-v4-2-pilot.mjs`

Modified existing adapters only:

- `assets/js/data/knowledge-content.js`
- `assets/js/data/example-content.js`
- `assets/js/data/knowledge-slides.js`
- `assets/js/data/document-mappings.js`
- `assets/js/data/content-registry.js`
- `assets/js/components/markdown-math-renderer.js`
- `assets/js/curriculum.js`
- focused registry/content tests and `package.json`

The student page reads generated JavaScript through the existing content registry and Markdown/KaTeX renderer. It does not parse TeX at runtime and no duplicate renderer, curriculum model, or lesson component was added.

### Protection and rollback

The writer refuses CD20/CD21, refuses any topic other than CD22 in this pilot, and refuses existing Knowledge or Examples. Before and after generation, it hashes the protected runtime stores:

- CD20/CD21 Knowledge snapshot: `E8EDAF64EF1123D766C60E4AAA78E284AB6D6D034F5E492E27B1C165E6187B1F`
- CD20/CD21 Examples snapshot: `643381D15693A29304E91F2D51A44FCFEDFBBE779D3F9853884E115F23B84D3B`
- Combined runtime protection hash asserted by tests: `1B2045924453E31F5ADA62644B290C6A8BC07BFD7164D57EB6887E3B914C070B`

Rollback is limited to removing the three pilot imports/mapping entries and the generated/staging files. Existing unit IDs retain their legacy format, no localStorage key changed, and no progress reset is needed.

## Testing

Focused conversion and registry tests cover source inspection, balanced structure conversion, formula preservation, mapping, absence of figures, exclusions, existing-content protection, missing-topic detection, deterministic idempotence, stable IDs, line provenance, and no invented solutions.

Playwright checks the actual lesson in installed Chrome/Edge at:

- 1920×1080 — `.audit/latex-v4-2-cd22-1920x1080.png`
- 1366×768 — `.audit/latex-v4-2-cd22-1366x768.png`
- 768×1024 — `.audit/latex-v4-2-cd22-768x1024.png`
- 390×844 — `.audit/latex-v4-2-cd22-390x844.png`
- mobile bottom-clearance checks — `.audit/latex-v4-2-cd22-768x1024-bottom.png`, `.audit/latex-v4-2-cd22-390x844-bottom.png`

The browser assertions verify KaTeX output, Bayes fraction structure, no red math errors, no page overflow, no unnecessary equation overflow, no PDF controls, source provenance, no invented solution panel, and final-content clearance above the mobile sticky navigation.

Final verification:

- `npm run verify` — **passed**.
- Source check — 40 JavaScript files and 5 HTML entries passed.
- Content registry validation — passed with native-LaTeX hash and line-range verification.
- Main Node suite — 117/117 passed.
- Focused native-LaTeX suite — 9/9 passed, including figure/include absence and missing-topic detection.
- Strict LaTeX suite — 6/6 passed; 1,667 renderable Knowledge/Example formula slots checked.
- Native LaTeX pilot tests — passed at 1920, 1366, 768, and 390 px.
- Existing V13, V15, V4.1, V16.1, homepage-scroll, and polish browser regressions — passed.

No commit, push, deployment, paid API, or external write was performed.
