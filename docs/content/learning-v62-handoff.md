# Biển Edu V6.2 — advanced source conversion and safe continuation

Status is **PARTIAL** for the complete migration. Read the generated final results, not a development-attempt count:

- `.audit/source-first-v5/release-v62/final-report.md`: all 39 topics, actual totals, sequential test logs, CLS and exact local commands.
- `.audit/source-first-v5/release-v62/final-report.json`: machine-readable results and before/after target hashes.
- `.audit/source-first-v5/release-v62/inventory.json`: current prepared manifest and preview URL.

Prepared, technically checked content is not production publication or human editorial approval.

## 1. Actual recovered baseline

Filesystem inspection found V6.1 **active**, not merely prepared. Its hash is `D80BF69A98028804C1D79C65D6580BB52F1E6832AFDBA2284A51514ABAF2C7C9`. Its four after-files, dependency hashes, immutable backups and actual apply journal match. The nine V5.5 corrections and 26 V5.6 physical corrections already incorporated into V6.0 remain present. All 35 V6.0 correction fields, 209 V6.1 examples and ten V6.0 examples are retained.

V6.2 is a newly prepared child. No real V6.1/V6.2 apply or rollback is run by this task. Original sources, V6.0/V6.1 code and staging, historical plans and journals are not edited. The original package scripts/dependencies are unchanged on disk until the user explicitly applies the staged child.

`protected-baseline.json` records the original parent/source/history fingerprints. The sequential verifier checks them after every command. Its strict before-state check remains distinct from the version-aware post-application assertions: a legitimate applied child must have exact after-bytes and its authenticated execution journal.

## 2. Source conversion

The exact **861** unresolved V6.1 IDs are loaded from the frozen cohort: 540 structure/context, 309 knowledge/method and 12 edition/mapping records. Their full explicit section/example IDs, original source SHA-256, page associations and glyph hashes are compared with V6.1. Extraction reuses V6.1's immutable heading/identity reader; only its conversion hook is substituted in the new isolated Python process. There is no second source registry or content database.

The four PDFs still contain 1,080 source pairs. All eight PDFs and the native TEX remain nine independent sources. Matching topic numbers do not imply matching editions. The missing-source topics remain CD24–CD27 and CD34–CD39. CD23 is unpublished and CD20/CD21 remain protected.

### Geometry-aware intermediate representation

`layout-v62.py` reconstructs a bounded intermediate layout tree from positioned glyphs and original vector bars. It retains original text, font, size, origin, actual glyph bounding boxes, page coordinates, bar geometry, source hash and input glyph hashes. The layout tree is evidence, not a new permanent learner schema.

Supported source shapes include uniquely owned fractions and nested fractions, polynomial numerators/denominators, fractions in scripts/radicals, radical scope from the original overbar, nested/indexed radicals, nested scripts, sequence indices, negative exponents, explicit vector arrows, middle-dot versus cross operators, selected large operators and distinct physical equation rows.

Fractions require numerator/denominator ownership on opposite sides of an actual bar, horizontal containment and consistent baselines/scripts. Roots require the exact radical glyph and contiguous source overbar. A following term outside that bar is not brought into the root. Closely overlapping body baselines are not silently treated as separate equations. Ambiguous operators, scripts, accents, matrix/system delimiters, missing glyphs, figure-dependent questions and unresolved bar roles fail closed.

The CMEX display/inline operator baseline is determined from uniquely aligned neighboring source glyphs, not from guessed function values. Fractions retain exponent glyphs in their numerator instead of flattening or dropping them. LaTeX command/variable boundaries remain explicit: `\int P`, not `\intP`; source `·` remains `\cdot`, while `×` remains `\times`.

An advanced-reader failure does not discard a previously supported linear field. The exact frozen V6.1 canonical field may be reused **only** when its source glyph hash is identical and the old field has no conversion errors. Such fields are marked `frozen-linear-v6.1`; rejected geometric attempts remain in their evidence. This is not an OCR or guessed nonlinear fallback.

Every accepted and rejected ID has a decision, original cohort, before-evidence reference, new source/canonical states and actionable blocker. `source-evidence.json` preserves the source projection; `content.json` contains the canonical batch and decision ledger. No original PDF/TEX is rewritten.

### Verification levels

These are separate fields, never one `verified` Boolean:

1. Bounded source-structure support from glyph/vector evidence.
2. Canonical syntax and existing Common KaTeX/MathML parsing.
3. Supported mathematical checks only.
4. Actual learner/browser rendering, recorded in plan-bound QA reports.
5. Editorial review, still absent unless a real reviewer performs it.

The existing isolated SymPy environment and its existing non-evaluating grammar are reused. Checks cover supported arithmetic, fractions, radicals, polynomial identities and selected explicit antiderivative/derivative identities, with domains reported where supported. Polynomial constraints such as `2x=2` are equation context, not failed identities. Intentional contradictions such as `0=2` and numeric fragments adjoining prose are not auto-corrected. Adverse supported numeric/identity checks are held for contextual review.

No `eval`, imported executable function, paid API, external source upload or large ML installation is introduced. OCR was not selected: these source PDFs expose glyph/vector evidence, and untrusted OCR output would not certify missing scope. Unsupported cases remain explicit.

## 3. Knowledge, methods, examples and editions

The learner model now admits a source-backed example-only state. Two exact guards in the existing renderer/topic entry are extended to recognize real examples, and an ES Module slide adapter omits a missing knowledge slide instead of fabricating it. Topic links select an actually available knowledge/method/example phase. Missing knowledge/method status is visible; unavailable practice remains disabled.

Complete recovered knowledge/method material populates the existing sections. Incomplete material is not replaced by another lesson's theory. New standalone practice count remains zero: source-authored worked examples are not transformed into invented questions, distractors or grading keys.

The independent calculus document is mapped to catalog **problem types**, not claimed equivalent to existing examples. Explicit aliases are enumerated where source/catalog titles differ semantically only by wording. New IDs stay source-namespaced. The original examples remain first and byte-equivalent; new independent examples append. The learner can switch between “Nguồn trước” and “Nguồn bổ sung” using ordinary existing routes. Original example numbers are retained, including gaps. Accessible labels distinguish duplicate numbers belonging to different sources.

Existing calculus knowledge is not overwritten. Supported knowledge/method content from the supplementary document is separately accessible in its source-context disclosures, with field-specific source evidence. Primary knowledge/method additions and independent-edition contexts are counted separately in the final report.

Existing route positions are append-only. Consequently source numbers can be non-monotonic when filling an earlier partial group; they are never silently relabelled. Method-card example/solution counts are derived from the actual cumulative examples, while original method wording and identities remain intact.

The registry compatibility adapter fixes each new example's provenance rather than assigning it the old calculus document's pages/hash. Original unit IDs, progress keys, exercise scoring and question generation remain unchanged. Re-import tests verify both deterministic replay and no duplicate candidates when the cumulative bundle is supplied.

## 4. Graphs and mobile stability

The existing five source-backed functions and one native variation table are retained exactly. The canonical 188-figure queue is unchanged: no second figure-review database, new guessed graph or PDF crop is created. The remaining 75 function references and 39 table references are not certified replacements.

The `redesign-existing-projects` audit was used narrowly: preserve fonts, palette, routing and educational hierarchy; diagnose actual shifts and inspect learner screenshots. Confirmed causes included late header insertion, late CSS/font changes, scrollbar width changes and the temporary coexistence of legacy and native graph layout.

Staged changes reserve the header/loading and exact source-mapped graph slots, load the existing reading/graph CSS before first learner render, avoid duplicate stylesheet fetches, use stable scrollbar space and a bounded existing-font readiness gate with failure fallback. Graph library loading remains lazy. No hidden/invisible learner content is used to manufacture a zero CLS score. Native controls, coordinate behavior and graph disposal remain the existing implementation.

Source labels were compacted after inspecting real mobile images. Details and full filenames remain available without occupying most of the reader viewport. Focus inside a variation table consumes horizontal arrows even when that table currently fits, avoiding accidental lesson navigation. Outside mathematical scroll controls, the original lesson keyboard navigation is preserved.

Official responsive checks use 320×568, 360×800, 390×844, 430×932, 768×1024, 1024×768, 1366×768 and 844×390. Paired CLS diagnostics use matching fresh contexts, height 844, network-idle/fonts-ready plus 200 ms and no user input. Raw shift sums are reported explicitly; they are not production field Core Web Vitals or physical iOS Safari certification. Font stability can trade a bounded initial wait for reduced movement.

## 5. Safe release and test continuation

V6.2 reuses the authenticated local protocol with a version-specific extension, not edited ancestor hashes. The active parent is verified before preparation and again before plan creation. All targets have exact parent-bound before bytes. Source, implementation, parent manifests, backups, journals and frozen V6.1 staging are dependency-bound.

The staged targets are `package.json`, the knowledge/examples facades, curriculum guard/entry selection, accessibility refinements, graph stylesheet reuse, reading CSS, `documents.html`, and the activation module. Changes are not written to the real runtime during preparation. Activation is last; rollback reverses order. Atomicity is **per file only**, not a batch transaction.

The existing cross-version lock is reused. Live/different-plan locks are rejected; only a confirmed dead same-plan owner can be recovered. Unknown target edits, stale sources, corrupt backups/manifests and unknown temporary bytes fail closed. Tests cover interruption at every boundary, reverse rollback recovery, idempotence and child-before-parent rollback.

The staged package changes only command entry points, not dependencies. Version-aware wrappers keep the original npm suites usable after V6.2 activation. Their original historical assertions run unchanged in disposable V5.5 benchmark copies, with the real active V6.1/V6.2 never rolled back. Dedicated V6.2 tests separately apply the actual planned after-files in isolated fixtures and exercise real learner routes. The final verifier also exercises the new wrapper before release.

The full six required npm suites run sequentially, followed by dedicated Node/Python, learner content/mobile/graph and matched CLS tests. Full logs, exits, assertions and exact manifest hashes are retained by attempt. Failed attempts are not represented as final passing runs.

The initial direct `npm.cmd run verify` exposed an existing historical-fixture leak (252 pass, one fail): `content:release:preview` regenerated the disposable V6.0 inventory, while the V6.1 fixture copied only its explicit original parent manifest. After parent rollback, status discovery used that unrelated mutable index and returned `UNKNOWN`. The new wrapper binds **only the copied fixture inventory** to its verified parent; original assertions and immutable ancestor modules are unchanged. A dedicated regression reproduces the wrong index and verifies `ROLLED_BACK` after binding. The six exact npm commands are rerun sequentially inside that corrected disposable baseline, through the V6.2 wrapper. The currently active parent package still uses its historical wrapper until an explicitly authorized child application; its old failure is retained in the report, not silently claimed fixed on disk.

## 6. Local use

```powershell
cd D:\BienEdu
node scripts/source-first/preview-v62.mjs --port 8002
```

Open `http://127.0.0.1:8002/.audit/source-first-v5/release-v62/preview.html`. This is a read-only overlay server serving the proposed after-bytes through actual learner routes. Its runtime-status endpoint reports the actual activation state. It never executes a release. A regular port-8000 server still shows V6.1 until the user explicitly applies V6.2.

Use the exact fresh `applyCommand` and `rollbackCommand` from the final report/current preview. Both require the full matching hash, `--development` and `--execute`. No real-data command has been automatically executed. Backups/journals live in the hash-specific `.content-work/release-v62/` directory. Roll the child back before its parent. If sources or bound implementation change, generate and verify a fresh preview; do not reuse an old authorization.

After an authorized application, read-only smoke validation is also available with:

```powershell
node .audit/v62-browser.mjs --smoke --actual
```

The CLI performs actual learner checks after explicit apply/rollback and reports the matching rollback command if validation fails; it does not automatically roll data back.

## 7. Limits and exact files

All 861 candidates were examined, not all were recovered. Remaining fraction/overbar ownership, operator/script scopes, unsupported notation/canonical syntax, figure-dependent content and contextual issues require further work. These are not all inherent flaws in the source books. Missing-source topics are not invented, CD23 remains unpublished, and CD20/CD21 remain protected.

Canonical rendering success is not mathematical proof. Most existing content/figures are not independently certified merely because their old browser tests pass. No human source/editorial approvals were fabricated.

`final-report.json` lists every new implementation/test module and staged target. Existing unrelated dirty changes are preserved. No new npm dependency, React migration, original-source modification, commit, push or deployment occurs. The existing ES Module architecture remains appropriate: a framework rewrite would not solve source fidelity, identity or release authorization.
