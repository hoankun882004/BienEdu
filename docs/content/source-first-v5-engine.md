# BienEdu V5 — source-first mathematical content engine

Date: 2026-11-05.

> Continued in [V5.1 source verification](./source-verification-v5.1.md): explicit human source/editorial gates, append-only review events, source zoom/context, before/after diff, deduplicated queues and a publication dry-run. Historical V5 counts and results below remain the original checkpoint.

## Outcome and scope

The prototype now extracts exact native TeX locations, preserves PDF layout evidence, builds a 40-expression review batch, and provides a local Math Review Studio with controlled patch application. It uses the existing Markdown/KaTeX renderer. Staging does not publish or overwrite student content.

Initial findings were recorded before the implementation in [source-first-v5-audit.md](./source-first-v5-audit.md). Complete machine-readable inventory, benchmark, tool comparison and unresolved queue are in `.audit/source-first-v5/`.

## 1. Root causes and confirmed narrow corrections

| Defect | Origin | Resolution |
|---|---|---|
| CD22.7 appeared as plain prose | Native formula classifier rejected Vietnamese labels even inside `\text{}` | Existing V5 fix is retained and tested against line 743 inside section 739–755 |
| `B_j` became invalid `\text{B_j}` | Text macro flattening before symbol classification | Existing fix retained; new scanner preserves explicit scripts instead of flattening them to Unicode |
| `n!/(n-k)!` could become `\frac{n!}{(n-k)}!` | Generic fraction conversion consumed the denominator group before its postfix factorial | Normalize the source quotient before generic conversion; preserve postfix factorial and the next equality separately |
| Cardinality bars became conditional bars | Global replacement of every `|` with `\mid` | Restrict conditional-bar conversion to the arguments of `P(...)`; preserve `|A|/|Ω|` |
| A table cell containing `\(P(A|B)\)` split into extra columns | Markdown table split ignored mathematical delimiters | Scan cells while respecting inline math and escaped pipes |
| A crop omitted part of a stacked fraction | PDF layout places one expression in multiple adjacent blocks | Preserve the matched block metadata, show a wider source context band and flag failed anchors |
| A short anchor selected an earlier similar example | Ambiguous text match | Use original example-number anchors for the affected benchmark items |

The new quotient and cardinality corrections are importer-level changes. Protected CD20/CD21 runtime content is unchanged; no broad re-import was performed. All source files and immutable approved records remain intact.

## 2. Benchmark and tool decision

There are 40 actual-source fixtures: ten native TeX expressions and thirty PDF regions. They cover powers, nested powers, fractions, roots, logarithms, integrals, inequalities, conditional probability, geometric notation, simultaneous constraints and graph-associated formulas. References are explicit transcriptions, not automatically approved answers.

The source contains simultaneous equations in prose for `b=-3, 3a+b=3`; the fixture preserves this arrangement and does not invent a system brace. The graph-associated sample retains the formula and its source explanation; it is not a newly generated graph.

| Approach | Execution in this task | Evidence and constraints | Decision |
|---|---|---|---|
| Native TeX | Exact-offset scan of 235 structural blocks; ten source-dialect formula candidates | Raw bytes, TeX offsets/lines, original expressions and surrounding conditions retained. Balanced script macros and delimited math are supported. This source often puts informal math inside `\textbf`, so source-dialect handling remains bounded | First choice when trusted native source exists; no PDF/OCR round trip |
| Existing PDF pipeline / PyMuPDF 2.0 | Thirty regions replayed through existing `block_text`; all 243 PDF pages inspected for layout metadata | Span text, origins, font sizes, bounding boxes, crop hashes and existing normalized candidates retained. PDF reference LaTeX is a region transcription candidate, not an automatic OCR success | Layout is evidence; difficult grouping requires source comparison |
| Marker 1.10.2 | Existing local runs inspected, no fresh inference run | Historical runs for 12.1, 20.1 and 20.2 retained. The 12.1 run has an `uncertain-formula` table flag. These runs are not a 40-item accuracy benchmark | Optional region recognizer; never overwrite approved content |
| MinerU | Installation probe only; not installed | No model output or correctness score claimed. Official local setup requires a separate install/runtime selection | Defer a heavy install until unresolved crop cases justify it |
| Docling formula enrichment | Installation probe only; not installed | Formula enrichment is optional and requires an additional model stage | Same deferred evaluation policy |
| Mathpix | Not executed | External processing/costs have no explicit authorization | Requires explicit authorization before any upload |

Primary tool references checked on the audit date: [MinerU official repository](https://github.com/opendatalab/MinerU), [Docling formula enrichment documentation](https://docling-project.github.io/docling/usage/enrichments/).

The deterministic MathML comparison matches nine native candidate structures exactly. The remaining 20.4 difference is the three-period source ellipsis versus the reference's `\cdots`; its denominator factorial is separately checked by regression and integer substitutions. This is a structural comparison, not a mathematical accuracy percentage. All forty candidates parse, and all source anchors resolve. Every new candidate remains in the human-review queue.

## 3. Source inventory and coverage

Nine physical files represent five unique sources: four original PDFs, four byte-identical mirrors and one native `.tex`. No additional supplied TeX/PDF was found.

| Source family | Unique pages / lines | Coverage |
|---|---:|---|
| Hàm số–Đạo hàm | 98 PDF pages | CD01–07 |
| Mũ–Logarit | 78 PDF pages | CD08–11 |
| Nguyên hàm–Tích phân | 49 PDF pages | CD12–14 |
| Tổ hợp–Xác suất PDF | 18 PDF pages | Actual lesson content CD20–21 |
| Tổ hợp–Xác suất native TeX | 1,068 lines | Source CD20–23; current publication pilot CD22 |

`.audit/source-first-v5/checkpoint.json` lists full filenames, hashes, page-by-page metadata and source/publication topic mappings. CD23 has source text but is not automatically published. CD15–19 and CD24–39 have no supplied authoritative source.

## 4. Structured staging model

Each batch item stores topic/section ID, content kind, source file/hash, exact TeX offsets/lines or PDF page/bounding box, original expression/context, normalized LaTeX, source conditions, conversion method, asset references and checksums, original example association where known, review state, publication state, version and audit history.

The scanner separates Knowledge, methodology, notes and Examples by their enclosing source sections. It never synthesizes solutions. Explicit `\(...\)`, `\[...\]`, `$...$` and `$$...$$` math is preserved without passing through Unicode reconstruction. The current informal TeX dialect uses its bounded source adapter; untranscribed structural blocks remain raw evidence.

Generated snapshot and PDF geometry live under `.content-work/source-first-v5/`. Building is deterministic. Review envelopes live in a separate `reviews/` directory and survive a rebuild; stale reviews are not overlaid on a changed snapshot.

## 5. Four independent checks

| Check | What runs | What it does not imply |
|---|---|---|
| A: syntax | Shared KaTeX validator, including stored conditions | Correct mathematics or source fidelity |
| B: structure | Required metadata, source/crop hashes, exact TeX slices, topic/section boundaries and asset existence | Correct interpretation of a PDF fraction |
| C: fidelity | Original TeX/crop displayed to editor; patch requires source-comparison attestation | Mathematical editorial approval |
| D: consistency | Small arithmetic grammar evaluates the factorial quotient at five valid integer pairs; unsupported cases stay pending | A general CAS or proof |

The factorial regression rejects the old parse-valid but incorrect structure. Remaining symbolic consistency questions require review. Rendering success sets `render-valid` only; it does not set `source-verified` or `published`.

## 6. Local review workflow

```powershell
npm.cmd run content:source:build
npm.cmd run content:review
```

Open `http://127.0.0.1:8765`. Select a topic/item, compare the original TeX or PDF crop, edit LaTeX, enter the reviewer and reason, then export either a confirmed-error patch or a source-verified correction. The latter also requires explicit source-comparison confirmation. Use “Mục chưa duyệt tiếp” for the next unresolved item.

Copy the downloaded patch into `.content-work/source-first-v5/`, then run:

```powershell
npm.cmd run content:source:apply -- --patch .content-work/source-first-v5/ITEM.review-patch.json --reviewer "Tên người đối chiếu"
npm.cmd run content:source:status
```

The CLI requires the same reviewer identity as the patch, checks the base snapshot/raw expression/source hash, validates provenance and syntax, rejects a failed known consistency check, then saves an immutable local review envelope. `confirmed-error` is allowed to retain invalid LaTeX for investigation. A source-verified review still remains unpublished and its mathematical-review status is independent. Rebuilding never alters reviewed runtime records. No publication command is provided by this prototype.

HTTP is read-only, binds only to `127.0.0.1`, validates Host and Origin, and requires a per-process session token for source APIs. All mutating HTTP verbs are rejected. Ordinary student pages have no link to the studio. `.vercelignore` excludes the studio implementation, local staging, audit and review data from a future Vercel upload. Access to the local filesystem is the controlled editor authority; there is no frontend-only write authorization or cloud database.

## 7. Review queue and limits

- Forty benchmark items still need an editor's source decision; none was automatically approved or published.
- All 235 native structural elements are retained as raw evidence; ten selected expressions have staging candidates. The block review queue overlaps these candidates and is not an additional 235 completed formula imports.
- The legacy audit's 180 slash/fraction candidates, 188 figure comparisons and eighteen native-CD22 mathematical review items remain unresolved; this prototype does not reclassify them as completed.
- The nine CD12–CD14 source answer conflicts remain excluded from auto-grading.
- PDF formula recognition remains a bounded region-review workflow. MinerU/Docling have not been installed or benchmarked on these sources.
- A qualified editor is still needed for mathematical sign-off. No accuracy percentage is inferred from KaTeX or screenshots.

## 8. Validation artifacts

Run `npm.cmd run test:source-first` for source preservation, macro handling, denominator/cardinality/table regressions, stale patch rejection, independent states, section protection, import idempotency, local HTTP protections and desktop/mobile studio checks. `npm.cmd run verify` also includes the new staging build and browser suite along with existing V4–V16 regressions.

Screenshots are in `.audit/source-first-v5/`: desktop/mobile TeX and PDF studio screens, plus ten comparison sheets for all forty candidates. `.audit/source-first-v5/browser-results.json` records patch-export validation and rejected HTTP writes. Actual source comparisons were visually inspected; the screenshots remain comparison evidence, not automatic approval.

Final results on 2026-11-05:

- `npm.cmd run verify`: passed, including 133/133 Node tests and 6/6 dedicated LaTeX tests.
- Existing V4.1 navigation, V4.2 native pilot, V5 math, V13 learning, V15 workspace, V16 registration/onboarding, homepage scrolling and polish browser suites: passed.
- Local Review Studio: desktop 1366px and mobile 390px passed; TeX and PDF views, editable preview, downloaded patch provenance and read-only HTTP verified.
- Forty batch candidates parse; source/crop hashes and source anchors resolve. All ten source/render comparison sheets were inspected.
- Idempotent staging rebuild and protection of approved runtime records: passed.
- `git diff --check`: passed.

No heavy dependency, cloud service, external document upload, production write, commit, push or deployment was performed.
