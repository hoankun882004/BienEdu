# BienEdu V5.7 — canonical mathematical content

## Scope and verification

This is an incremental architecture integration, not a mathematical publication or a migration of all 39 topics. The implementation preserves all existing mathematical data, progress IDs, exercise generation/scoring, source files, and the V5.5/V5.6 authorization chain.

Final machine results are recorded in `.audit/source-first-v5/canonical-v5.7/verification-exits.json`, `browser.json`, `dom.json`, and `final-report.json`. A successful earlier log is not a substitute for these final exit codes. Run the suites sequentially with:

```powershell
node scripts/source-first/verify-v57.mjs
```

## Independent source inventory

Final verification on 2026-11-06 completed sequentially:

| Command | Passed | Failed | Exit code |
| --- | ---: | ---: | ---: |
| `npm.cmd run verify` | 212 Node + 6 dedicated LaTeX | 0 | 0 |
| `npm.cmd run test:source-first` | 63 | 0 | 0 |
| `npm.cmd run test:canonical` | 24 | 0 | 0 |

Browser validation passed 58 learner states (including isolated V5.6 apply/rollback fixtures) and two additional DOM/scoring viewport checks at 1366x768 and 390x844. Correct and incorrect answers, progress reload persistence, safe invalid-input fallback, duplicate rendering and page overflow were checked. Desktop and mobile screenshots were inspected. `git diff --check` passed. The source-review assertion passed at 40/40; the original failed item's identity remains unknown.

The inventory is a read-only projection of the existing source-first registry, not a second source/review database. Original hashes and paths are recorded in `inventory.json`. PDF/TEX are never treated as equivalent editions or automatically merged.

| Existing source identity | Actual coverage | Pages | Section headings |
| --- | --- | ---: | ---: |
| cd01-cd07-functions | CD01–CD07 | 98 | 71 |
| cd08-cd11-exponential-logarithm | CD08–CD11 | 78 | 50 |
| cd12-cd14-calculus | CD12–CD14 | 49 | 26 |
| cd20-cd21-theory | CD20–CD21 only | 18 | 25 |
| cd20-cd23-native-latex | CD20–CD23 | Native TEX | 46 |

Overlapping section numbers are reported as nominal overlap only. The 39-topic report has 17 `LEGACY_SUPPORTED` topics, 21 `SOURCE_MISSING` topics (CD15–CD19, CD24–CD39), and CD23 `IMPORT_BLOCKED`. These are compatibility statuses, not mathematical approval.

PDF inventory examples/exercises/solution markers are detected **occurrences**, not a count of unique paired problems. For example, the functions source contains both statements and solutions labelled “Ví dụ”. Zero detected exercise/solution markers does not prove that the document has no exercises/solutions; typography and source conventions vary. Full raw blocks and page/rectangle locations remain available.

## Canonical Math Format v1

Schema identifier: `bienedu.canonical-math.v1`.

Supported content nodes:

```json
{"type":"text","value":"Cho "}
{"type":"math","latex":"f(x)=\\frac{x}{x^2-1}","display":false}
{"type":"rich-text","segments":[{"type":"text","value":"Với "},{"type":"math","latex":"x\\ne\\pm1","display":false}]}
{"type":"unresolved","original":"x x2-1","reason":"PDF mathematical structure requires source evidence"}
```

The record envelope stores `schemaVersion`, source-namespaced `id`, unchanged `legacyId`, `sourceId`, `sourceHash`, `location`, `content`, and conversion/provenance metadata. Formula values contain LaTeX, never rendered HTML, images, or dollar delimiters. Source evidence remains in the existing registry/audit files; it is referenced, not converted into a new approval system.

`canonical-math.js` supplies `normalizeMath`, `validateMath`, `parseRichText`, `mathNode`, `validateContent`, `canonicalRecord`, and deterministic `serializeCanonical`. Normalization preserves groupings, exponents, roots, inequalities and domain restrictions. It consumes TeX comments and normalizes mathematical line breaks without joining control words to variables. It does not infer fraction bars, radicals, operators, or missing conditions from PDF text.

Validation rejects malformed grouping, empty/missing fraction and radical operands, unsupported commands, unsafe commands, unknown node types, and missing source identity. Canonical fraction/radical arguments must be braced; shorthand is flagged rather than guessed. Supported named macro expansion is bounded to 100 expansions and 20,000 characters, with up to three explicit braced arguments. Native layout macros remain outside KaTeX.

## One rendering engine, incremental compatibility

`canonical-math-renderer.js` is a facade over the **existing** `markdown-math-renderer.js` and vendored KaTeX. It does not import a second KaTeX dependency or create a parallel renderer. The existing strict validation, `trust: false`, HTML + MathML output and mathematical configuration remain authoritative.

APIs: `renderMath`, `renderRichText`, `renderMathContent`, `mathContentMarkup`, and `validateMath`. Canonical input is validated and escaped. Invalid or unresolved content displays a visible safe fallback, not red raw KaTeX markup or executable HTML. A bounded 256-entry markup cache and unchanged-markup check avoid unnecessary repeated DOM replacement. No global DOM rescanning is introduced.

`documents.html` maps the curriculum's existing versioned renderer import to the new facade through a native import map. This is deliberate: `curriculum.js` and the legacy renderer are hash-bound rollback dependencies. Neither was modified by V5.7.

Existing explicit-math example, solution, practice and answer paragraphs use canonical boundaries through the facade. Existing structured Knowledge pages and curated plain-text formula representations retain the old compatibility path through the same KaTeX engine. They are **not** claimed to have all been rewritten into stored canonical records. Other public pages are not redesigned.

`canonical-math.css` scopes changes to canonical formulas: inherited BienEdu typography, baseline-compatible inline containers, local scrolling for genuinely long equations, and reachable leading symbols. No formula image generation, diagram conversion or graph pipeline changes occur.

## PDF and TEX adapters

`canonical-pdf.py` reuses the existing PyMuPDF/foundation `page_blocks` extractor. It reads the original documents, verifies hashes, records actual headings/locations and preserves extracted content. Unresolved text-layer mathematical structure remains unresolved. Source-backed V5.6 pilot formulas are read from the existing correction registry, never recreated by hand; the PDF bytes must match their source hash.

`canonical-adapters.mjs` uses the existing balanced TEX scanner and native-dialect converter. It supports explicit inline/display delimiters, equation/align/gather variants, supported arrays inside math, and safely resolvable local macros. Generic TEX documents are restricted to their document body rather than rendering preamble declarations as educational content. Raw source/locations remain attached.

The generated preview contains 7,172 source records (6,937 PDF extraction blocks and 235 TEX educational elements), 62 native mathematical nodes, and all 35 V5.5/V5.6 pilot fields. **6,941 unresolved nodes are not 6,941 confirmed formula errors**: they consist of conservative PDF block staging plus four native conversion cases. PDF paragraph/layout segmentation is retained as extraction evidence; this is not a full educational-content auto-import.

Four native conversion cases remain visibly unresolved: prose formula boxes in 20.10 and 22.3, `\ensuremath` in 21.5, and the existing native converter's `\text{...}` around indexed probability expressions in 21.8. They are reported, not silently rewritten or published. Custom TEX layout/prose commands may remain visible in source previews; this is not a full TEX typesetter.

## Source-first count mismatch investigation

The interrupted run failed at `machineCheckedExpressions === 40` with 39. The original assertion logged no failing item ID, so the exact historical crop cannot be identified retrospectively. A later standalone rerun passed all nine V5.2 tests.

Code inspection establishes a shared-artifact race: `tests/source-first.test.js` calls `build()` against the real generated staging directory, while other file workers call `prepareReviewBatch()`/`validateItem()` and hash those same crop files. The old extractor saved PNGs directly to their final paths. Concurrent external suites amplified this exposure, but worker-level concurrency alone was also unsafe.

`artifact-race-check.py` demonstrates the invalid-hash write window in an isolated crop, exercises the actual PyMuPDF save/read interaction on Windows, and checks that atomic replacement leaves the old complete destination visible until replacement. Scheduling-dependent read/write failures are reported, not asserted as a deterministic count. This confirms the unsafe mechanism; it does not fabricate an identity for the unlogged historical failure.

Fixes:

- `artifact_io.py` writes generated PNG bytes to a temporary sibling, flushes/fsyncs, then atomically replaces the target. Identical bytes are not rewritten.
- Both Node test commands serialize file workers because legacy tests regenerate shared audit reports as well as crops. No test is removed.
- The 40-item assertion remains unchanged in strength and now includes failing-item diagnostics.
- `verify-v57.mjs` runs full suites sequentially and persists actual exit codes and complete logs.

## V5.5/V5.6 safety

V5.5's nine corrected fields remain applied. V5.6's 26 fields remain prepared, not applied to the real site. Isolated browser fixtures exercise apply, idempotent validation and rollback without altering real runtime data. The immutable plans, backups, source hashes and journals remain intact. Final validation checks their existing dependency hashes rather than generating replacement authorizations.

The original 88 source ambiguities, five mapping ambiguities, four deferred correction groups, 188 figure-review items and nine calculus answer conflicts remain outside automatic correction. CD20/CD21 are protected; CD23 is unpublished. There are no new human approvals, commits, pushes or deployments.

## Files belonging to V5.7

Modified existing files:

- `documents.html`: versioned facade import map and scoped mathematical stylesheet.
- `package.json`: canonical preview/test commands and serialized test workers.
- `scripts/check-source.mjs`: validates and follows import-map entry points.
- `scripts/source-first/pdf-extract.py`: atomic generated-crop writes.
- `tests/source-review-v52.test.js`: preserves the assertion and adds failure details.

New implementation and validation files:

- `assets/js/components/canonical-math.js`
- `assets/js/components/canonical-math-renderer.js`
- `assets/canonical-math.css`
- `scripts/source-first/canonical-adapters.mjs`
- `scripts/source-first/canonical-build.mjs`
- `scripts/source-first/canonical-pdf.py`
- `scripts/source-first/artifact_io.py`
- `scripts/source-first/artifact-race-check.py`
- `scripts/source-first/verify-v57.mjs`
- `scripts/source-first/report-v57.mjs`
- `tests/canonical-math-v57.test.js`
- `.audit/canonical-v57-browser.mjs`
- `.audit/canonical-v57-dom.mjs`
- `docs/content/canonical-math-v5.7.md`

Generated outputs are under `.audit/source-first-v5/canonical-v5.7/`. Existing full-suite audit screenshots/reports are regenerated by their original commands. The repository had extensive pre-existing dirty changes; those are not attributed to or reset by V5.7.

## Local preview

```powershell
cd D:\BienEdu
python -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/documents.html?grade=12&topic=CD01&type=1.2&section=example&item=5` for the real learner route. The canonical source preview is `http://127.0.0.1:8000/.audit/source-first-v5/canonical-v5.7/preview.html`.

Regenerate only the read-only preview with `npm.cmd run content:canonical:preview`; run focused/browser coverage with `npm.cmd run test:canonical`. Neither applies V5.6 data.
