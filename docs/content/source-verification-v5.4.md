# V5.4 — Evidence-assisted mathematical verification and local release

V5.4 extends the existing source-first engine, 40-item benchmark, runtime mappings, Review Studio and immutable review storage. It does not replace the Learning Experience, curriculum, renderer or review queue. **Actual human field approvals: 0. Actual locally published corrections: 0.** The three V5.3 defects remain visible in unchanged runtime until real approvals and separate publication authorization exist.

## Recovered state and scope

`recovery-v5.4.json` records the pre-change dirty worktree, snapshot identity, original document hashes and runtime hashes. Baseline `npm.cmd run verify` exited 0 before implementation. No existing dirty changes were reset or overwritten.

The V5.3 mapping remains **15 exact, 19 multiple-valid-target and 6 ambiguous source items**, with **64 legitimate usages**. V5.4 works on the same identities. The operational comparison below is a different dimension: a reliable runtime mapping does not prove a PDF transcription is correct.

The existing backlog remains 1,512 unique review entities, 180 fraction/slash flags, 188 pending figure reviews, nine disputed calculus answer keys excluded from automatic grading, and 21 topics without supplied authoritative documents. CD20/CD21 remain protected; CD23 remains unpublished. No broad re-import, diagram regeneration or external document upload occurred.

## Automated comparison

The implementation is `scripts/source-first/comparison.mjs`, invoked by the existing preparation command. Detailed per-item evidence is in `.audit/source-first-v5/comparison-v5.4.json`.

| Operational classification | Items | Treatment |
| --- | ---: | --- |
| MACHINE_MATCHED | 5 | Supported source-normalization/structure match; available for sampling, without human approval |
| CONFIRMED_CONVERSION_DEFECT | 3 | Existing source-bound pilot corrections; exact fields require final human review |
| AMBIGUOUS | 32 | Keep human attention; do not guess from flattened PDF text |

The deterministic queue order is priority 1 ambiguity, priority 2 confirmed conversion defects, then priority 3 machine matches; stable item ID breaks ties. All 40 remain in the same queue. Filters hide/show categories without deleting evidence or fabricating completed review states.

For each item, the evidence preserves source file/hash/location, untouched original expression, extracted text, normalized candidate, current/proposed runtime values, MathML structure, variable/operator/number tokens, fraction/radical/script counts, printed conditions, render result, uncertainties and human requirements. Source/crop hashes and section boundaries are validated before comparison. Unsupported syntax remains unresolved.

The five matches are CD22's published native-source formulas. Their original TeX formula boxes contain Unicode/plaintext probability notation and text-subscript macros. The existing source-specific `sourceFormulaToLatex` adapter normalizes those supported notations, including balanced right-hand-side fractions. Full MathML and token/shape comparisons then check the normalized source, candidate and runtime formula. Printed CD22.1 conditioning probability is checked against both original source context and runtime detail. Source normalization is recorded; it is not presented as untouched native mathematical TeX or an independent mathematical proof.

The 32 ambiguous cases include the six V5.3 mapping ambiguities plus 26 PDF transcriptions whose layout/grouping cannot independently be established by the installed deterministic tools. Equality with a manually prepared benchmark candidate is **not** treated as independent PDF ground truth. The five protected native CD20/CD21 expressions are not silently mapped across source editions; the legacy CD20.1 Example is not targeted by an array index.

No supported `ollama`/`llama-cli` executable was found through the inspected CLI configuration. No local vision/CAS model or external service was invoked. Agent inspection of original PDF images supplies explicitly labelled evidence, not human approval. No confidence percentages are generated.

Independent finite-difference regression checks corroborate the two derivative candidates at interior sample points, including the rational result −5/9. They do not prove an identity, validate all domains, or substitute for source review. The root function domain remains [−2;2]; the derivative condition remains −2<x<2, with no endpoint derivative claim. The unchanged V5.1 editorial questions about unstated probability conditions remain separate from source-fidelity matching.

## The three pilot corrections

| Stable record | Exact source | Corrected candidate and scope |
| --- | --- | --- |
| `1.2-source-example-5` | CD01–CD07 PDF, statement p.5, solution p.66; SHA `2EBC6F3ABB4558E84237FC2C45DBBC20353B0A6C435E193D6B4A264A17433CA0` | \(f(x)=\frac{x}{x^2-1}\), \(f'(x)=\frac{-x^2-1}{(x-1)^2(x+1)^2}\), \(x\ne\pm1\), \(f'(2)=-\frac59\) |
| `1.3-source-example-4` | Same original PDF/pages/hash | \(y=\sqrt{4-x^2}\), \(D=[-2;2]\), \(y'=-\frac{x}{\sqrt{4-x^2}}\) for \(-2<x<2\); original endpoint restriction retained |
| `knowledge:14.1` | CD12–CD14 PDF, p.34; SHA `4E65F476DA0A1B817A05B6E829737100B753A2E5219236F719ACAB016F221E59` | Restore the printed \(a<b\) only in the area-with-Ox formula detail |

The two Examples each change title, statement, answer and the named source-solution expression: eight string fields. The Knowledge correction changes one detail. Total: **nine fields, seven mathematical fields**, three defect groups. The two titles become the original Example numbers rather than repeating flattened mathematical fragments.

Original statement p.5, original solution p.66 and the area p.34 crop were inspected again. Fractions, squared denominator factors, radical grouping, signs, constants and conditions agree with the staged V5.3 candidates. No additional mathematical content was invented.

The durable fixes remain in `corrections-v53.json`, the guarded normalizer and the existing foundation importer's `--review-candidates` path. Exact source hash, record/source identity, field, before and after values guard each transformation; no broad regex inference was added. Original extracted fields and source regions remain available. Deterministic PDF replay agrees with the fields actually published **inside isolated test fixtures**. The curated Knowledge correction uses the same source-bound registry and a narrow source adapter. Default unreviewed foundation regeneration remains blocked, preventing a legacy broad import from silently overwriting reviewed corrections.

## Field-scoped human review

`field-review.mjs` extends the existing `review-events` storage under `review-events/fields/<target-hash>/`. It is not a second content queue. Each immutable event stores:

- Item, record, semantic field and target identities; item/content versions and record hash.
- Source identity, file/hash and actual source-block identity when one exists.
- Origin file/hash, candidate hash, before hash, after hash and conditions hash.
- Explicit source and mathematical decisions, named human reviewer, reason and timestamp.
- Parent event hash and immutable review event hash.

The legacy curated 14.1 runtime record has no physical `sourceBlockId`; it remains null. Its stable `knowledge:14.1` identity, source/page, named formula role, exact literal and origin hash are used instead. The registry's logical source-block label is not misrepresented as an existing runtime ID.

Decisions can record source verification while mathematical approval remains pending. Mathematical approval requires an explicit source decision. Agent/missing identities, wrong versions, changed conditions, stale source/runtime hashes and stale parent events are rejected. Reapplying the same event is idempotent. Events are exposed atomically as complete immutable files, with a cooperative write lock preventing review-history branching.

Studio displays automatic evidence and priority filters, plus separate source/math confirmations and an export button for each changed field. An expression-level patch cannot approve a statement, an answer, another solution field or an entire lesson. Editing the candidate clears every confirmation, marks comparison evidence stale and disables field export until the prepared candidate is restored. Downloading a patch alone saves no approval. Existing benchmark source/math decisions, ambiguity actions, source context, refresh and navigation remain available.

## Local publication capability

The existing CLI now supports `field-apply`, `local-release-dry-run`, `local-release` and `local-rollback`. Real publication was **not executed** in this task. Synthetic decisions/releases were confined to temporary fixture roots, never passed to a publisher operating on the real student runtime.

Two narrow adapters are supported:

1. Generated foundation Examples: resolve `id` and `sourceBlockId`, then a named field or uniquely named source-solution step. A JSON token scanner replaces only the resolved string spans. It preserves untouched bytes, including CRLF, numeric spellings such as `149.0`, figure metadata and unrelated Examples. Resolved array paths are transient, never permanent identities.
2. Curated Knowledge 14.1: uniquely identify the stable record boundary and named formula row, then replace only the guarded `detail` string. Unknown storage shapes, fields or ambiguous occurrences fail closed. JavaScript is never evaluated.

Each deterministic manifest binds exact field diffs, before/after file hashes, source hashes, human event hashes and loader/renderer dependency hashes. Execution rechecks all of them, the correction registry and protected-topic rules. It requires `--execute`, a named human publisher and explicit authorization of the exact manifest hash. Otherwise it remains a dry-run.

One transaction updates **one runtime file**. The two CD01 Examples can be released together because their eight fields share one generated file. The CD14 detail is a separate transaction. A manifest spanning both files is explicitly blocked: two ordinary filesystem renames cannot provide all-or-nothing publication across separate JavaScript modules. No multi-file atomicity is claimed.

Before the single same-directory atomic rename, the publisher creates a hash-checked immutable backup and intent containing the manifest and explicit authorization. It flushes temporary file content, revalidates source/approval/dependency evidence, and rechecks the destination hash immediately before replacement. A workspace lock coordinates this publisher's writers; arbitrary external editors do not participate in that lock. Runtime/dependency edits observed during preparation or before commit abort the transaction.

Receipts and hash reconciliation make retry idempotent, including a simulated interruption after replacement but before receipt creation. Rollback verifies the backup and current after-hash before atomically restoring the exact original bytes. Subsequent unrelated changes block rollback. A rolled-back manifest cannot silently be reapplied; new version-bound review is required. Active local-publication counts are derived from valid intent/authorization/receipts and actual file hashes, not from machine classifications or exported patches.

An abrupt process kill can leave the cooperative lock file. It is deliberately not deleted based on a timeout. An operator must stop/verify the relevant CLI writers, inspect the saved intent and file hashes, and explicitly clear a confirmed abandoned lock before retrying the same manifest. Invalid evidence, uncertain locks, changed runtime, changed source/dependencies and damaged backups fail closed.

## Commands and remaining human actions

Prepare current evidence and open the existing Studio:

```powershell
npm.cmd run content:source:integrate
npm.cmd run content:source:prepare
npm.cmd run content:review
```

For each changed field, inspect both source pages where applicable, the full before/after text, mathematical grouping and conditions. Enter the actual reviewer identity/reason, make the separate source/math decisions and export the field patch. Copy the downloaded patch into the workspace and run the exact `content:source:field-apply` command displayed by Studio. Refresh to confirm the decision was actually saved.

Create one manifest per file after the required decisions:

```powershell
npm.cmd run content:source:local-plan -- --file assets/js/data/foundation-lessons.generated.js --output .audit/source-first-v5/local-foundation-v5.4.json
npm.cmd run content:source:local-plan -- --file assets/js/data/calculus-knowledge-details.js --output .audit/source-first-v5/local-calculus-v5.4.json
```

Current manifests are blocked by eight missing field approvals for foundation and one for calculus. Real source/math decisions and separate publication authorization are the remaining normal release gates. These commands do not publish:

```powershell
npm.cmd run content:source:local-release -- --plan .audit/source-first-v5/local-foundation-v5.4.json
npm.cmd run content:source:local-release -- --plan .audit/source-first-v5/local-calculus-v5.4.json
```

Only after actual field approvals and an explicit user instruction to publish, the execution form adds `--execute --authorize PLAN_HASH --reviewer "actual publisher"` to the command. `PLAN_HASH` must be the freshly generated manifest's exact hash. Do not run that execution form against the currently unapproved manifests. Rollback uses `content:source:local-rollback` with the same saved manifest, separate `--execute` authorization and actual publisher identity. Keep the original manifest and backup; do not regenerate an after-state plan as a substitute for the rollback record.

## Actual validation

Baseline and post-implementation `npm.cmd run verify` both exited **0**. Final Node rerun: **169/169**; dedicated LaTeX: **6/6**; final source-first suite: **44/44**, plus browser checks. Post-implementation source-first tests include native/source comparison, grouping-sensitive MathML, conditions, exact field review, stale parent/version/hash/dependency rejection, missing approvals, protected content, deterministic re-import, narrow string replacement, authorization, atomic rename, concurrent-edit detection, corrupt-backup rejection, idempotence, interruption recovery, release-state evidence and byte-exact rollback. Existing suites cover progress, navigation, solution reveal and exercises.

The V5.4 browser harness reuses the existing real learner renderer/loader and covers **40 before/staged learner states** at **1920×1080, 1366×768, 768×1024 and 390×844**. Studio filters, field-patch export, candidate-change invalidation and zero saved approvals are also checked at all four sizes. Original V5.3 comparison sheets are reused rather than falsely claiming another independent review of the same material.

Actual screenshots were inspected, including the rational denominator/result, radical scope/domain/endpoint restriction, restored area condition and field-review controls. Staged screenshots are labelled **LOCAL STAGED PREVIEW — NOT PUBLISHED**. Runtime errors, KaTeX errors and page-level horizontal overflow are absent in these checks. No whole-lesson human-verification badge is added by a field approval.

Final evidence is in `.audit/source-first-v5/validation-v5.4.json`, `comparison-v5.4.json`, `local-release-v5.4.json`, the two file-specific manifests, `studio-v5.4.json`, `browser-v5.4.json`, and the baseline/final test logs. All nine recovered original physical source hashes and the five tracked runtime module hashes remain unchanged. No real review events, release transactions, progress migrations, exercise changes, commit, push or deployment were created.

V5.5 adds a separate machine-supported local experimentation path with one batch action; see [development-corrections-v5.5.md](development-corrections-v5.5.md). The formal human-review gates described here remain intact and are not prerequisites for that separately labelled development experiment.
