# BienEdu V5.2 — review preparation and safe release workflow

Date: 2026-11-05. This continues V5/V5.1 in the existing working tree. It does not rebuild the conversion engine, create another review application/queue, or change the student Learning Experience.

## Recovered state and current outcome

The recovered V5.1 checkpoint reports 141 passing Node tests, six passing dedicated LaTeX tests, 1,668 formula slots and 4,710 rendered fields checked, and 40 machine-validated benchmark expressions. The snapshot remains `A85EEEC7635DED245F75BEB8A07FA2E0780F9E2B07803C5D331607033341C41D`. Source evidence and the prior 40-item comparison sheets are reused while their identity/render dependencies remain unchanged.

Current figures come from `review-preparation-v5.2.json`, derived from the existing identities and actual stored review history:

| Measure | Current value |
|---|---:|
| Unique tracked review entities | 1,512 |
| Benchmark records prepared | 40 |
| Benchmark syntax/source-structure/render checks passed | 40 |
| Real human source approvals | 0 |
| Real human mathematical approvals | 0 |
| Real saved needs-correction/ambiguity decisions | 0 / 0 |
| Approved but unpublished benchmark changes | 0 |
| Newly published corrections | 0 |
| Recognized formula release targets | 5 |
| Benchmark items without an allowed exact release mapping | 35 |
| Figure assets in the existing queue | 188 |
| New agent visual figure comparisons | 8 |
| Distinct agent figure comparisons including V5.1 | 16 |
| Human figure approvals inferred | 0 |
| Slash/fraction flags still pending | 180 |
| CD12–CD14 answer conflicts still pending | 9 |
| Topics without supplied authoritative sources | 21 |
| New mathematical importer corrections in V5.2 | 0 |

These categories overlap and must not be summed. The original `reviewEntities` mapping remains the source of deduplication; the preparation file adds a view of those records, not another queue. Existing runtime data still contains 181 Knowledge records and 1,313 Examples. Three immutable legacy agent approval records are retained; they are not counted as human approvals.

**No release has been completed.** The engineering/preparation workflow is implemented, but actual human review and explicit publication authorization are absent. All 40 dry-run items remain blocked and runtime writes remain zero. Missing authoritative sources are CD15–CD19 and CD24–CD39. CD23 has native source evidence but remains unpublished.

## What each reviewer now receives

Each of the 40 prepared records includes source file/hash, section, exact native location or PDF page/crop region, original expression, candidate LaTeX, explicit condition evidence, current item version/hash, previous structural comparison, current machine checks, source warnings and editorial questions. Native expressions reuse the exact prior comparison when unchanged; PDF interpretations retain their original crop/context and pending human state.

Nine native expressions match the reference MathML exactly. CD20.4's literal source ellipsis remains flagged against the reference's `\cdots`; it is not silently rewritten. The preparation checklist explicitly asks reviewers to compare symbols/grouping, conditions in the full source context, and the correct learner target/current rendering.

Five CD22 formula fields have an explicit target (`22.1`, `22.2`, `22.4`, `22.5`, `22.7`, first formula value). Studio can display their current runtime formula using the same Markdown/KaTeX renderer and show the exact learner route/version. The other 35 records are not claimed to have a verified release mapping. Existing website browser suites verify actual learner rendering; a staging preview alone is not labelled as an approved website correction.

## Review decisions and persistence

The existing Studio retains its source/render comparison, crop zoom, full PDF page context, native section context, editor and before/after diff. Refinements are limited to:

- A compact, expandable source-review checklist and current-website formula preview.
- Separate **Xuất: Chưa rõ**, **Xuất: Cần sửa**, and **Xuất: Đã đối chiếu** actions.
- Filters for unresolved ambiguity, needs correction and pending mathematical approval.
- **Đọc lại quyết định đã lưu** after applying a local patch.
- **Mục chưa xử lý tiếp** / `Alt+N`, with previous/next `Alt+Left` / `Alt+Right` retained.
- Editing LaTeX clears earlier source/editorial confirmation boxes, so the changed expression must be explicitly compared again.

An ambiguity decision must preserve the candidate; an edited draft uses needs-correction. Neither state can carry mathematical approval. Exporting any patch does not save an approval or remove the item from the real pending count. Session navigation may skip exported drafts, while persisted status changes only after the CLI saves a valid event.

V3 patches bind the item version, source identity hash (including source location and section), untouched original-expression hash, base item hash, source SHA-256, before/after and reviewed content/conditions hash. Approval requires explicit human source confirmation and separate mathematical confirmation/reviewer data. No real reviewer identity, approval or human timestamp was created by the agent. Browser/unit fixtures use explicitly synthetic identities and isolated temporary stores; exported browser fixtures are never applied to real staging.

V1/V2 event history remains readable and is replayed without rewriting old events. A legacy human-attested V2 record may retain its historical source/math state, but cannot become release-eligible until an actual V3 version-bound follow-up is supplied. Existing source-verified expressions stay immutable. Before mathematical approval, an unchanged **unresolved ambiguity** follow-up can record an editorial question without erasing the genuine source comparison; publication remains blocked. A later explicit mathematical decision may resolve it without changing the source expression. Fully approved records cannot be silently overwritten.

New CLI events are written to a temporary file, flushed and exposed through an atomic non-overwriting hard link. Interrupted `.tmp` files are ignored by replay. Reapplication is idempotent; stale patches, version/source mismatches and branching histories fail closed. This is atomic **review-event persistence**, not a real runtime publication operation.

## Dry-run and approved-record integration preview

Dry-run remains the default and the only implemented source-first publication mode. It now reports:

- Exact topic/section/field and before/after.
- Current runtime record hash/version and full source provenance.
- Source/editorial approval evidence and immutable patch hashes.
- Syntax, structural, consistency, dependency and source-conflict checks.
- Exact inverse field rollback and, when eligible, a complete record preview with original-record rollback.
- A deterministic plan hash and optional checks against a previously saved plan.

The runtime target is read fresh from the generator's JSON exports on disk. The reader handles quoted/escaped braces and never evaluates JavaScript. This closes a V5.1 dry-run weakness: hashing fresh file bytes while reading the before-value from a cached ESM import could produce a stale preview.

Only the five canonical CD22 mappings are accepted. Arbitrary IDs, fields, files, source metadata mismatches, target-version changes, old review versions, stale runtime/dependency hashes, source conflicts and protected topics are blocked. Dependency evidence covers the current content loader, renderer, curriculum integration and KaTeX module.

For a properly approved synthetic fixture, the existing runtime record is cloned, the exact formula field changes, and a deterministic content version plus field-scoped review evidence is previewed. Unrelated prose, notes, numbering and examples remain unchanged. A review of one formula does **not** certify the whole Knowledge lesson: a stale lesson-level verification object is removed from the proposal and no whole-lesson “Đã kiểm duyệt” badge is created. Full-record human badges continue to use the existing exact-content/version/source checks.

This exercises integration with the existing loader/data shape/renderer without creating another content store. The preview does not modify runtime files. There is no new source-first publish command, no atomic runtime write operation and no real rollback execution because human approvals/authorization are unavailable. No older independent PDF-pipeline publish operation was invoked.

## Practical local workflow

```powershell
npm.cmd run content:source:prepare
npm.cmd run content:review
```

Open `http://127.0.0.1:8765`, select an item, compare the original source and conditions, inspect the current website formula when a target exists, edit confirmed errors, enter the actual reviewer/reason, and export an explicit decision. Actual human source and mathematical confirmations are separate. Copy the downloaded patch into `.content-work/source-first-v5/`, then use the exact apply command generated by Studio:

```powershell
npm.cmd run content:source:apply -- --patch PATH --reviewer 'Name exactly matching the exported patch'
npm.cmd run content:source:prepare
npm.cmd run content:source:release-dry-run
```

Back in Studio, use **Đọc lại quyết định đã lưu** and **Mục chưa xử lý tiếp**. Unexported changed drafts block refresh to avoid losing them. Exported drafts do not masquerade as saved decisions. Studio HTTP remains loopback/session protected and read-only.

To validate a plan against a previous saved preview, copy that report to a separate local file and run:

```powershell
npm.cmd run content:source:release-dry-run -- --base-plan PATH_TO_SAVED_PLAN
```

The plan hash/version must be valid. Changed reviewed-item hashes, runtime bytes or dependency hashes add blockers rather than silently accepting a stale preview.

## Mathematical corrections and CD22

V5.2 found no new confirmed mathematical conversion defect requiring a source-data rewrite. The previously corrected V5.1 warning remains staged: the original “Không biến” a sum of powers “thành” a power with added exponents is preserved as a warning instead of a universal `\ne` assertion. It survives deterministic import and remains pending human review. Existing denominator-factorial, cardinality/conditional-bar and mathematical-table-pipe regression fixtures continue to pass; no heuristic global rewrite was added.

The actual native CD22 source remains authoritative. Existing 18 Knowledge/Example source comparisons and medical arithmetic are reused/revalidated through the existing suite. CD22.7 retains prevalence 0.01, sensitivity 0.95, specificity 0.90, false-positive rate 0.10, positive-test probability 0.1085 and posterior approximately 8.76%. Sensitivity and specificity are not swapped with posterior probability.

Positive conditioning-event requirements not explicitly printed in the CD22.5/CD22.7 formula boxes remain separate editorial questions. No missing domain conditions or new theory were invented. CD20/CD21 are protected from broad re-import and CD23 is still unpublished. The nine disputed calculus answer keys remain excluded from auto-grading.

## Figure review progress

The existing 188-item figure report supplies source/page/region and asset hashes. Preparation adds derived priorities for neighboring Example text, possible text-only detections and unresolved source association. Original assets are retained; nothing is cropped again, replaced or AI-generated.

Eight additional figures were compared visually with original full-page context, separate from the eight V5.1 observations:

- CD2.3 Examples 8–10: critical-point/excluded-point notation and derivative/function rows remain visible. Examples 8–9 include the next Example heading.
- CD2.4 Example 1: derivative graph is the horizontal line at 1; a fragment of preceding method text is included.
- CD2.4 Example 2: horizontal derivative line at −2; neighboring heading present.
- CD2.4 Examples 3–4: increasing/decreasing straight derivative graphs through the marked origin, with axes/ticks retained.
- CD2.4 Example 5: upward derivative parabola touches the horizontal axis at x=1; part of the next heading remains in the crop.

Per-figure observations are bound to original source/asset hashes in `figure-inspections-v5.2.json`. They are agent-assisted observations with human approval explicitly false. The first V5.1 text-only detection remains flagged; no queue item is falsely completed. All 188 still require human figure review.

## Tests, preservation and artifacts

Focused tests cover version/source/original binding, separate unresolved decisions, source-verified but mathematically unresolved follow-up, approved patch follow-up, atomic event storage, legacy replay, idempotency, stale plan/record/dependency rejection, exact target mapping, fresh disk reads, non-executing JSON parsing, reversible record previews and truthful badge scope. Read-only HTTP refresh is tested against an isolated saved fixture event; real staging receives no test approvals. Completed human gates display their own status rather than the machine consistency state; completed expressions are read-only in Studio, and the permitted pending editorial path remains available.

Dedicated source-first tests: **25/25 passed**, plus desktop 1366×900 and mobile 390×844 Studio browser checks. Actual screenshots were inspected. The unchanged ten benchmark sheets are reused; two new figure comparison sheets extend the evidence. The full project verification log is `.audit/source-first-v5/verify-v52.log`; final exit status and totals are recorded after completion in `validation-v5.2.json`.

Final results: `npm.cmd run verify` exited **0**, including **150/150 Node tests**, **6/6 dedicated LaTeX tests**, and existing learner/navigation/registration/homepage/polish browser regressions. After the final source/editorial-state refinement, the **25/25 source-first suite + Studio browser checks** and **150/150 Node suite** were rerun successfully. Completed-state UI checks use an isolated synthetic store, not real approvals. All nine original physical source hashes match the recovered snapshot; runtime mathematical data has no diff, and `git diff --check` passed.

Important artifacts, all within the existing audit directory:

- `review-preparation-v5.2.json`: current 40-item preparation, real workflow states, target readiness, derived figure priorities and accurate counts.
- `release-dry-run.json`: V5.2 hashed plan, gates, evidence, dependencies and rollback previews.
- `figure-inspections-v5.2.json` and `figure-comparison-v52-{1,2}.png`: eight additional agent comparisons.
- `browser-results.json` and updated Studio screenshots: actual desktop/mobile checks and evidence reuse.
- `checkpoint.json`: preserved V5/V5.1 state with appended V5.2 summary.

Implementation is limited to the existing `scripts/source-first/` model/store/server/Studio/CLI/build/publication files, new `runtime-target.mjs` and `prepare.mjs`, source-review tests, browser QA, package commands and documentation. No student-facing layout/rendering architecture, source PDF/TeX, exercises, solutions, authentication or progress keys were changed. No commit, push or deployment was performed.
