# Biển Edu V6.1 — content integration and release continuation

## A. Status and actual baseline

**PARTIAL**, not a complete conversion of all 39 topics. Final command results are recorded in `.audit/source-first-v5/release-v61/final-report.json`; technical rendering is not human mathematical/editorial approval.

Recovery found that the user had applied V6.0 after the preceding handoff. Its actual active manifest is `0E16FE41B291BDB0D6BDA1B3DC93A6A1351F5441FDE245588A0F5FC258656E44`. Its immutable apply journal, dependency hashes, foundation after-bytes and activation after-bytes match. Therefore the 26 V5.6 physical changes are now present **as part of the active V6.0 release**, not pending on the actual website. The nine V5.5 corrections remain present. The historical V5.6 standalone plan/backup and V6.0 manifest are not edited.

V6.1 is a separately prepared child. No real learner-data apply/rollback is performed by this task. Four runtime files are staged, not silently changed: `documents-v6.js`, `knowledge-v6.js`, `learning-v6.js`, and `local-release.js`. The foundation file needs no second application.

## B. Systematic source conversion

All **1,080** explicitly identified statement/solution pairs in the four new independent PDFs are examined. Identities come from the full source section and example number, not paragraph positions or duplicated headings. Continued table-of-contents pages do not change the solution phase.

| Measure | Count | Meaning |
| --- | ---: | --- |
| Examined candidate pairs | 1,080 | All four new PDFs, including the existing ten-example pilot |
| Canonical pairs passing supported structure checks | 535 | Not 535 independently proved or human-approved examples |
| Already available in active V6.0 | 10 | CD17.1, retained unchanged |
| Newly prepared examples / source solutions | 209 / 209 | Included in 29 eligible knowledge/method groups |
| Newly prepared knowledge groups | 29 | Complete supported theory/method text for admitted examples |
| New standalone practice | 0 | Only worked examples were identified; no distractors or grading keys invented |
| Mathematical structure / context blocked | 540 | Exact per-record reasons retained |
| Supported pair, but knowledge/method group unresolved | 309 | Not admitted as a misleadingly complete learning group |
| Independent calculus edition/runtime mapping unresolved | 12 | Existing calculus records are not overwritten |
| Remaining unprocessed candidates | 0 | Examined does not mean converted or approved |
| Remaining candidates not added to learner batch | 861 | 540 + 309 + 12; not hidden or counted as complete |

No records are excluded merely as duplicate filenames. Different calculus editions and PDF/TEX sources remain independent. Existing CD20/CD21 and unpublished CD23 are unchanged.

The converter uses the original positioned PDF glyphs and font identities for a deliberately bounded subset: linear mathematical expressions and unambiguous superscripts/subscripts. It recovers Vietnamese spaces from explicit glyph gaps, not a language-model rewrite. It rejects ambiguous baselines, fraction/overbar structure, radicals, extensible operators, unsupported accents/glyphs and graphical content requiring independent specifications. It does not infer missing fractions, radical scope or a curve from pixels. Source hashes, pages, glyph hashes and original text remain available for every candidate, including rejected records.

Source inspection caught and fixed an important adapter error before release: source `·` was initially mapped to `\times`, which is not equivalent for vectors. It now maps to `\cdot`; genuine source `×` remains `\times`. Source-bound vector examples and MathML operator assertions protect the distinction, in addition to the glyph-unit tests. Roman-font function names are recognized from positioned glyph runs, not a broad replacement of italic variable sequences.

Canonical v1 text/math/rich-text nodes are validated through the existing V5.7 validator and Common KaTeX Renderer. No additional formula renderer, PDF image conversion, browser PDF parser, SymPy browser package or executable imported expression is introduced.

`content-evidence.json` stores the source projection; `content.json` stores canonical records, eligibility decisions and exact blockers. A successful KaTeX parse is not mathematical proof. Numeric SymPy checks only claim the supported numeric scope. Flagged false equalities need context: a source contradiction such as `0=2` may be an intentional no-solution argument; a fragment adjoining prose `cos` is not a confirmed arithmetic error. Neither is auto-corrected into a new educational assertion. Existing 88 source ambiguities, five mapping ambiguities, nine calculus answer conflicts and four unsupported native TEX cases remain unresolved.

## C. All 39 topics

“Existing” below means present in the runtime, **not** blanket certification that every formula has been independently verified. New numbers are prepared, unapplied V6.1 examples with matching solutions.

| Topic | Existing state | V6.1 examples | V6.1 knowledge groups |
| --- | --- | ---: | ---: |
| CD01 | Existing; partial verification | 0 | 0 |
| CD02 | Existing; partial verification | 0 | 0 |
| CD03 | Existing; partial verification | 0 | 0 |
| CD04 | Existing; partial verification | 0 | 0 |
| CD05 | Existing; partial verification | 0 | 0 |
| CD06 | Existing; native graph pilot active in V6.0 | 0 | 0 |
| CD07 | Existing; partial verification | 0 | 0 |
| CD08 | Existing; partial verification | 0 | 0 |
| CD09 | Existing; partial verification | 0 | 0 |
| CD10 | Existing; partial verification | 0 | 0 |
| CD11 | Existing; partial verification | 0 | 0 |
| CD12 | Existing; new independent edition not merged | 0 | 0 |
| CD13 | Existing; new independent edition not merged | 0 | 0 |
| CD14 | Existing; new independent edition not merged | 0 | 0 |
| CD15 | Source available; partially converted | 9 | 1 |
| CD16 | Source available; partially converted | 4 | 2 |
| CD17 | Ten CD17.1 examples active in V6.0 | 15 | 2 |
| CD18 | Source available; partially converted | 26 | 3 |
| CD19 | Source available; partially converted | 18 | 2 |
| CD20 | Protected existing PDF/TEX coverage | 0 | 0 |
| CD21 | Protected existing PDF/TEX coverage | 0 | 0 |
| CD22 | Existing native TEX content; partial verification | 0 | 0 |
| CD23 | Source available, unpublished/blocked | 0 | 0 |
| CD24 | Missing authoritative source | 0 | 0 |
| CD25 | Missing authoritative source | 0 | 0 |
| CD26 | Missing authoritative source | 0 | 0 |
| CD27 | Missing authoritative source | 0 | 0 |
| CD28 | Source available; partially converted | 24 | 3 |
| CD29 | Source available; partially converted | 18 | 3 |
| CD30 | Source available; partially converted | 23 | 3 |
| CD31 | Source available; partially converted | 28 | 4 |
| CD32 | Source available; partially converted | 16 | 2 |
| CD33 | Source available; partially converted | 28 | 4 |
| CD34 | Missing authoritative source | 0 | 0 |
| CD35 | Missing authoritative source | 0 | 0 |
| CD36 | Missing authoritative source | 0 | 0 |
| CD37 | Missing authoritative source | 0 | 0 |
| CD38 | Missing authoritative source | 0 | 0 |
| CD39 | Missing authoritative source | 0 | 0 |

The machine-readable matrix in `inventory.json` also retains source IDs, current example/knowledge/practice counts, protected states and active V6.0 overlays. It is not a claim that all source paragraphs are complete educational records.

## D. Learner integration and mathematical preservation

- The actual learner interface, routing and existing import-map adapters are reused. No React migration or new database.
- New stable IDs are source-specific, e.g. `cd28-cd33-vector-2026:28.3:example:10`. Original example numbers remain visible even when blocked source examples create gaps. Existing progress identifiers and scoring code are unchanged.
- Knowledge and method wording is source-preserved. The vector PDF's combined “Kiến thức và cách làm” paragraph is explicitly supported, not silently discarded.
- Full source solutions remain paired by exact IDs. A separate answer is not fabricated when only a worked solution exists; the original result remains within that solution.
- V6.0's 35 correction fields, ten CD17.1 examples, source solutions and six visualization specifications are retained in the cumulative bundle.
- Source-specific metadata fixes the previous hardcoded sequence-PDF filename when newly sourced vector/trigonometry topics are displayed.
- Incremental content checks work at **example** level, not just group level. An existing partial group is not counted as if all ten source examples were available. New examples append without reordering prior route/progress positions. Empty releases are rejected.

## E. Graphs and tables

The native pilot remains five source-backed JSXGraph functions and one semantic variation table. All six original specifications and source associations are retained, with no additional guessed replacements. The canonical queue remains 188 records: 80 function graphs, 40 variation tables and 68 text-containing assets. The remaining 75 graphs and 39 tables are not certified replacements.

The new converter does not treat source illustration labels as ordinary mathematical prose. Unsupported diagrams remain blocked. No new PDF crop, rasterized mathematical table, image-to-SVG graph imitation or generated graph image is used. Legacy assets are not deleted.

Recognition graphs do not reveal the selected equation or a derived answer legend. Shared library loading, discontinuity/domain handling, board disposal, source-backed values and native table behavior are checked through the original tests and the child release's learner interface.

## F. Mobile and accessibility

The existing BienEdu fonts, palette and compact educational layout are preserved. The `redesign-existing-projects` audit led to a targeted fix: the current example number is scrolled into view inside its horizontal strip only, without using page-level `scrollIntoView` or jumping the outer document.

The new batch is checked on desktop/mobile learner routes, not only its consolidated preview. Annotation comparisons detect missing or duplicate formulas; prose comparisons protect the original statements and solutions. Additional cases cover all eight requested viewport sizes, source-example navigation/history/keyboard arrows, progress reload, practice feedback, graph controls and locally scrolling tables. Exact results and screenshots are in the final report.

This is Chromium desktop/mobile/touch emulation, not real-device iOS Safari/WebKit certification, exhaustive WCAG conformance or production Core Web Vitals certification. Performance observations are reported as local measurements, not an unmeasured speedup.

## G. Test execution and benchmark isolation

Run the six required npm commands in order, or use `node scripts/source-first/verify-v61.mjs`. Full logs and actual exits are preserved by attempt under `verification/<timestamp>/`.

The old source-first/V6.0 tests deliberately assert a V5.5-applied, V5.6-prepared benchmark. Running them against a user's already activated V6.0 is a baseline mismatch. The compatibility runner copies the unchanged historical cohort into a disposable workspace and replays those assertions **without rolling back the real site**. Actual V6.1 file application/rollback and learner browser tests are additional, separately identified tests, not substitutes for the historical assertions. No assertions are removed or weakened.

The first full attempt caught a genuine source-check configuration omission: the new preview was not a declared HTML entry. The fix registers the real preview entry and resolves each HTML asset relative to its document. The failure log is retained. Verification also protects the existing immutable parent artifacts and real runtime hashes after every suite.

Two test-harness issues were also corrected without changing existing learner behavior: the isolated copy now includes the CDP helper imported by the original onboarding/home/polish tests; and the new mobile test uses the actual `data-history-back` control. It establishes real 9 → 10 history before testing Back/Forward, rather than incorrectly assuming the history-aware Previous control is a slide-index button on a direct deep link. All original assertions remain; the new navigation, scroll, keyboard and persistence assertions still run at every requested viewport.

## H. Exact implementation files

Modified existing files:

- `package.json`
- `scripts/check-source.mjs`

New implementation and test files:

- `scripts/source-first/content-v61.py`
- `scripts/source-first/content-v61.mjs`
- `scripts/source-first/check-content-v61.py`
- `scripts/source-first/release-chain-v61.mjs`
- `scripts/source-first/release-v61.mjs`
- `scripts/source-first/preview-v61.mjs`
- `scripts/source-first/compat-suites-v61.mjs`
- `scripts/source-first/verify-v61.mjs`
- `scripts/source-first/report-v61.mjs`
- `scripts/source-first/runtime-v61/documents-v6.js`
- `scripts/source-first/runtime-v61/knowledge-v6.js`
- `assets/js/release-preview-v61.js`
- `tests/helpers/release-v61.mjs`
- `tests/content-v61.test.js`
- `tests/source-glyph-v61.py`
- `.audit/v61-browser.mjs`
- `docs/content/learning-v61-handoff.md`

Generated artifacts include content-addressed learning bundles, `.audit/source-first-v5/release-v61/` and immutable `.content-work/release-v61/<HASH>/` plans/backups. Earlier prepared plans are retained. Existing unrelated dirty changes are preserved. No npm dependency is added or reinstalled; JSXGraph remains exactly 1.14.2.

## I. Preview, authorization and rollback

```powershell
cd D:\BienEdu
npm.cmd run content:release:status
npm.cmd run content:release:preview
node scripts/source-first/preview-v61.mjs --port 8001
```

Open `http://127.0.0.1:8001/.audit/source-first-v5/release-v61/preview.html`.

Port 8001 is a **read-only overlay preview server**. It serves planned after-bytes for the four explicit runtime targets but never applies them to disk. Its links open actual learner pages with the proposed bundle. Ordinary port-8000 hosting continues to show the currently active release until the user authorizes application. Do not mistake a preview for an applied release.

The exact fresh apply and rollback commands are stored in `inventory.json` and `final-report.json` and displayed on the preview. They require the matching full manifest hash, `--development` and `--execute`; otherwise the operation is a dry run. Do not reuse a prior hash after implementation/source changes.

V6.1 reads the current active parent, checks its manifest/dependencies and before/after backup bytes, and creates a new immutable child directory. It reuses the V6.0 cross-version lock and refuses different-plan/live-process locks. Atomicity is **per file only**, not a batch transaction. Known partial states can resume; corrupt/unknown edits or temporary bytes fail closed. Code is applied first, activation last; rollback reverses the order. A child must be rolled back before its parent. Tests cover interrupted apply/rollback, idempotence, stale inputs, unknown edits, corrupt manifests, dead-owner recovery and a later child built from the verified active V6.1 baseline.

Do not mix standalone V5.6/V5.8 operations with the consolidated active chain. New version-specific continuation code/data must be introduced through a freshly verified plan rather than editing a bound ancestor dependency and overriding its hashes.

## J. Remaining gaps

- This is **not** a completed 1,070-pair migration. The 861 blocked records need structural conversion, source-context adjudication, complete knowledge support or an explicit independent-edition mapping.
- Ten topics have no source: CD24–CD27 and CD34–CD39. No curriculum is fabricated for them.
- CD23 remains unpublished. CD20/CD21 remain protected.
- Most graphs/diagrams are not yet reconstructable through the verified pilot's activated scope.
- Current batches are machine-checked local experiments, not fabricated human approvals.
- A real V6.1 release still requires the manifest-specific user action. No commit, push or deployment is performed.
