# BienEdu V5.1 — source verification and controlled release preparation

Date: 2026-11-05. This extends the existing V5 staging pipeline and Review Studio. Existing working-tree changes, source documents, reviewed records and student content are retained.

> Continued in [V5.2 review preparation and release safeguards](./source-review-v5.2.md). V5.1 results below are retained as historical evidence; V5.2 uses version-bound V3 patches and richer dry-runs without real publication.

## Recovered baseline

The existing snapshot contains 40 benchmark expressions (10 native TeX, 30 PDF regions), 235 native structural blocks, 9 physical source files representing 5 unique source identities, and layout evidence covering 243 PDF pages. The recovered snapshot digest was `E94F8D534E957D92A1CC54A73A181BED135FF615BB17E4BDD6CD9185962F41F1`; its unchanged file is retained locally at `.content-work/source-first-v5/history/snapshot-before-v51-source-warning.json`. One source-warning correction described below produces the current deterministic snapshot `A85EEEC7635DED245F75BEB8A07FA2E0780F9E2B07803C5D331607033341C41D`.

There are 181 existing Knowledge records, 1,313 existing Examples and three immutable legacy approval records. The latter name Codex as reviewer; they are retained as legacy agent evidence, not counted as human approval. No real human review events were present or created during this work. Tests use explicitly named synthetic editors in temporary fixture directories only.

## Current counts and identity policy

| Measure | Result |
|---|---:|
| Unique tracked review records | 1,512 |
| Benchmark expressions machine checked | 40 / 40 |
| Human source approvals in this batch | 0 |
| Human mathematical editorial approvals | 0 |
| Benchmark expressions pending human source review | 40 |
| CD22 source units compared | 18: 9 Knowledge + 9 Examples |
| Figure assets checked for source identity/page/region | 188 |
| Figure comparisons visually inspected by the agent | 8 |
| Figure comparisons pending human approval | 188 |
| Existing slash/fraction candidates | 180 |
| Existing CD12–CD14 answer conflicts | 9 |
| Topics missing source documents | 21 |
| Approved but unpublished benchmark items | 0 |
| Newly published items | 0 |
| Newly confirmed source-warning conversion fixes in V5.1 staging | 1 |

Counts are not additive. `reviewEntities` in the JSON report merges facets by canonical `knowledge:<code>`, `example:<id>` and `exercise:<id>` identities. Source expressions without a reliable runtime identity remain distinct source items. Figures, benchmark samples and fraction flags attach to existing identities where known. The 235 raw native blocks are an overlapping extraction queue, not 235 additional verified formulas. “Machine checked” counts here refer to the 40-expression batch, not all 1,512 historical records.

Missing source topics are CD15–CD19 and CD24–CD39. CD23 has native source evidence but remains unpublished.

## Benchmark and mathematical findings

Every benchmark candidate was rendered through the existing Markdown/KaTeX renderer. Checks validate original source/crop SHA-256, source location and section identity, LaTeX syntax, explicit conditions and structural references. All 40 passed these machine gates. Ten source/render comparison sheets were inspected. This establishes comparison evidence, not human mathematical sign-off or a numerical accuracy score.

Nine of ten native MathML references match exactly. CD20.4 retains the source's literal three-period ellipsis rather than silently changing it to `\cdots`; the difference stays flagged. All 30 PDF expressions retain a warning that layout/source comparison is required. The existing denominator-factorial, cardinality-bar, conditional-bar and mathematical-table-pipe corrections remain covered by regression tests and survive deterministic rebuilds. No new broad string rewrite was added.

One additional source-fidelity defect was found visually in `pdf-exponent-warning` (original CD08–CD11 PDF, page 9). The source says “Không biến” the sum `a^α + a^β` “thành” `a^(α+β)`: a warning against an invalid general rewrite. The old benchmark transcription turned this into a universal `\ne` assertion. For `a=2, α=β=1`, both sides equal 4, so that stronger assertion is unsupported. The source-specific PDF transcription fixture now retains the exact warning words in `\text{...}` around the unchanged expressions. No global inequality rewrite, runtime publication or human approval was added. Before/after, source hash/location and cause are retained in `stagingCorrections` and the benchmark's regression metadata. Tests check the source phrase, the counterexample, valid KaTeX and re-import persistence.

CD22 Knowledge lead/formulae/points/note and source Example prompts were compared to the existing adapter output from the untouched original TeX. This detects stale imported content; equality to the adapter is not independent proof of mathematical correctness. The original section context is available in the Studio, including introductory conditions, examples and warnings.

For CD22.7, the original section (lines 739–755; formula line 743; medical example line 750) distinguishes sensitivity `P(+|bệnh)`, specificity `P(-|không bệnh)`, false-positive rate `1 − specificity`, and prevalence. Independent arithmetic gives:

- Prevalence 0.01, sensitivity 0.95, specificity 0.90, false-positive rate 0.10.
- `P(+) = 0.01 × 0.95 + 0.99 × 0.10 = 0.1085`.
- Posterior `0.0095 / 0.1085`, rounding to the source's 8.76%.

Positive conditioning-event probabilities are not explicitly printed in the CD22.5 and CD22.7 formula boxes. These are recorded as editorial questions, not invented additions to student theory. CD22.1 retains its explicitly printed `P(B)>0`. CD22 tables and conditional notation continue through the existing renderer and dedicated regression fixtures.

The 180 fraction candidates and nine calculus answer conflicts remain pending. They are not automatically corrected based on ambiguous slash patterns. Conflicting source practice remains excluded from auto-grading. No external OCR tool, paid service or document upload was needed for this batch.

## Figure evidence

All 188 asset records now retain file/hash, source PDF/hash, page/region, original Example number, statement/solution page associations, text extracted from the source region and region drawing/image counts. Original files and crops are unchanged.

Eight existing assets were compared against original full-page context in two screenshot sheets. The report explicitly separates agent visual observations from human approval:

- `1.10-example-10-figure-1` contains a textual derivative-data question with no visible diagram; its classification needs review. Region vector/image counts are both zero.
- Seven CD2.3 variation tables preserve their visible critical points, signs, values and excluded-point notation. Several crops also contain the next Example heading; this is flagged as a crop-boundary issue, not silently removed.

The remainder still needs direct figure comparison, including labels, axes, curves, dimensions and conditions. Finding the expected Example number inside a crop alone does not verify the figure. No approximate or AI-generated mathematical diagram was introduced.

## Review Studio changes

The existing local application now provides side-by-side source/render preview, zoomable PDF crops, full original-page context rendered in memory, full native TeX section context, before/after character diff, topic/category/status filters, previous/next controls and `Alt+Left` / `Alt+Right` navigation outside input controls. Mobile stacks the comparison columns without page-level overflow; the zoom viewport scrolls within its modal.

Four independent states remain visible: machine syntax, machine structure/provenance, human source verification and human mathematical editorial approval. A downloaded patch leaves the queue pending until applied by the local CLI. Source and editorial decisions have separate explicit confirmations and reviewer fields.

V2 patches bind source identity/hash, base item hash, before/after expression, exact content/conditions hash, reviewer identity and timestamp. V1 patches remain readable but cannot confer human status. Immutable review-event files preserve history and allow a subsequent unchanged editorial decision. Branches, stale histories, mismatched reviewers and stale content hashes are rejected; repeated application is idempotent.

The HTTP server remains loopback-only, session-token protected and read-only. Crop/context/figure endpoints return original evidence only. No student-facing PDF viewer or review link is added.

## Publication dry-run

Publication authority and required human approvals are absent, so this implementation deliberately exposes a dry-run only. Run:

```powershell
npm.cmd run content:source:verify
npm.cmd run content:review
# Open http://127.0.0.1:8765 and perform an actual source review.
# Copy the exported patch into .content-work/source-first-v5/ before applying:
npm.cmd run content:source:apply -- --patch .content-work/source-first-v5/ITEM.review-patch.json --reviewer 'Actual reviewer name'
npm.cmd run content:source:release-dry-run
```

The plan targets only five explicitly bound CD22 formula fields. It validates source and content identity, source hash, actual human source/editorial evidence, approved patch history, syntax, structure, known consistency conflicts, stale reviews/runtime hash and protected-topic rules. CD20/CD21 are protected; CD23 and unknown bindings are blocked. Every record shows exact before/after, blockers, source/content hashes and inverse rollback preview.

The actual plan has **0 eligible previews, 40 blocked, 0 runtime writes**. Synthetic unit tests exercise an eligible exact change, repeated simulation, inverse rollback and stale/conflict rejection. There is no new runtime publication command. The older independent PDF-pipeline command is outside this dry-run workflow and was not invoked.

## Student verification labels

Import, KaTeX syntax, machine source mapping and legacy agent reviews no longer produce a visible mathematical verification badge. Human evidence must match the exact source hash, content version and reviewed content. A source-only human decision can show “Đã đối chiếu nguồn”; an additional human mathematical decision can show “Đã kiểm duyệt”. Changing reviewed content invalidates the badge. Existing data/history is retained.

Source Example footers use neutral “Tài liệu LaTeX nguồn” or “Tài liệu PDF nguồn” unless explicit human evidence exists. A contextual source note is labelled “Lưu ý từ tài liệu”. Navigation, viewed-example tracking, progress, practice, solutions and authentication are not changed.

## Validation and artifacts

Dedicated source tests cover exact source/render evidence, prior conversion regressions, state separation, legacy-review migration, identity/provenance, stale patches, immutable history, deterministic imports, protected records, CD22 arithmetic, figure associations, dry-run rollback/idempotency and content-bound student badges. Browser checks exercise desktop 1366×900 and mobile 390×844, source zoom/context, filters, keyboard navigation, immediate preview/diff, patch export and rejected HTTP writes.

Final execution results are recorded in `.audit/source-first-v5/verify-v51-final.log` and `browser-results.json`. The full `npm.cmd run verify` suite includes source validation, Node tests, LaTeX tests and existing V4–V16, scrolling and polish regressions. A prior V13 browser assertion expecting automatic legacy approval was updated to require the truthful pending state.

The broad rendering audit covers 1,668 formula slots and 4,710 rendered fields with zero rendering failures; these are rendering checks, not 1,668 human mathematical approvals. Existing browser coverage reports zero desktop equation overflows and two mobile equation-level scrolling cases, with page-level overflow checks passing. Studio comparison sheets and the corrected warning's render were visually inspected.

When capturing verification output on Windows PowerShell, use `cmd.exe /d /c "npm.cmd run verify > .audit\source-first-v5\verify-v51-final.log 2>&1"`. The expected warning about nine retained answer conflicts otherwise becomes a PowerShell `NativeCommandError` under direct `2>&1` redirection, even when the Node/browser suites pass. It is not a failed mathematical test or a reason to remove the conflict gate.

Final results:

| Check | Result |
|---|---|
| Full `npm.cmd run verify` | Passed, exit 0 |
| Node suite | 141 / 141 passed, including 16 source-first/V5.1 tests |
| Dedicated LaTeX suite | 6 / 6 passed |
| Existing V4.1/V4.2/V5/V13/V15/V16 and homepage/polish browser checks | Passed |
| Review Studio desktop/mobile | Passed, 1366×900 and 390×844, zero page/runtime/math fallback errors |
| Original physical source hashes against recovered snapshot | 9 / 9 unchanged |
| Runtime mathematical data diff | None |
| `git diff --check` | Passed |

Primary artifacts:

- `.audit/source-first-v5/verification-v5.1.json`: per-expression checks, CD22 comparisons, deduplicated identities, honest counts.
- `.audit/source-first-v5/figure-review-v5.1.json`: 188 source associations and eight agent observations.
- `.audit/source-first-v5/release-dry-run.json`: exact proposed changes and blockers.
- `.audit/source-first-v5/checkpoint.json`: retained baseline with appended V5.1 summary.
- `.audit/source-first-v5/validation-v5.1.json`: final test results and source-preservation summary.
- `.audit/source-first-v5/studio-{tex,pdf}-{1366,390}.png`, `studio-{zoom,context}-v51-{1366,390}.png`.
- `.audit/source-first-v5/benchmark-sheet-01.png` through `-10.png` and `figure-comparison-v51-{1,2}.png`.

Implementation files are in the existing `scripts/source-first/` directory: `model.mjs`, `review-store.mjs`, `verify.mjs`, `source-view.py`, `publication.mjs`, `server.mjs`, `cli.mjs`, the Studio files and checkpoint preservation in `build.mjs`. Shared student-label changes are limited to `markdown-math-renderer.js` and `curriculum.js`. Package commands, source tests and affected legacy badge assertions were updated.

No source document, reviewed mathematical content, student progress or unrelated page was replaced. No human approval was fabricated. No commit, push or deployment was performed. Remaining source and mathematical sign-off requires actual human review through the existing local workflow.
