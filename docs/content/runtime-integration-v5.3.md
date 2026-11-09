# V5.3 — Source corrections and runtime integration

This increment preserves the existing V5.2 worktree, source snapshot and review queue. **No student-facing correction has been published.** Three confirmed defects have source-bound correction candidates, exact runtime diffs and browser-only previews. The original PDF/TeX documents, runtime mathematical data, progress keys and exercises remain unchanged. No commit, push or deployment was performed.

## Mapping results

The existing 40-item benchmark now has the following classifications:

| Classification | Source items | Meaning |
| --- | ---: | --- |
| EXACT_RUNTIME_MAPPING | 15 | One uniquely resolved source-backed field |
| MULTIPLE_VALID_TARGETS | 19 | Multiple legitimate usages of the same source expression |
| SOURCE_ONLY | 0 | No item requires this classification |
| AMBIGUOUS_MAPPING | 6 | Matching would require unapproved assumptions |
| MISSING_RUNTIME_CONTENT | 0 | No confirmed missing expression under the known source identity |

There are **34 mapped source items and 64 legitimate runtime usages**, not 64 independent reviewed source expressions. Every item, usage, current value, proposed value, source reference, reason and review status is recorded in [runtime-mappings-v5.3.json](../../.audit/source-first-v5/runtime-mappings-v5.3.json). Aliases include aggregate Knowledge, rendered reading pages, topic formula collections, methodology notes, Example statements and source-solution fields. Component mappings for equality chains do not substitute the complete worked answer into the question.

Five ambiguous items use the native CD20/CD21 edition, whereas the published counterpart is from the PDF edition. These are protected from cross-edition replacement. The sixth is the CD20.1 legacy Example: its fallback identity depends on array order and it has no stable `id`/`sourceBlockId`. Its observed counterpart is documented, without authorizing a positional overwrite. CD23 remains unpublished.

The former five CD22 publication bindings now name semantic field identities rather than permanent array offsets. Record ID, source identity/hash, source section, formula role and mathematical structure must resolve uniquely against the current runtime. Numeric paths in a dry-run are ephemeral resolution results. Duplicate formulas fail closed; a changed body is diagnostic evidence, not a successful match. Comparison MathML retains fraction, radical, grouping and script structure. Conditions remain separately visible and are never removed from stored content.

## Confirmed visible defects and source evidence

| Record | Current defect | Source-backed candidate | Original evidence |
| --- | --- | --- | --- |
| `1.2-source-example-5` | Detached denominator, flattened squares and final fraction | \(f(x)=\frac{x}{x^2-1}\); \(f'(x)=\frac{-x^2-1}{(x-1)^2(x+1)^2}\), \(x\ne\pm1\); \(f'(2)=-\frac59\) | CD01–CD07 PDF, statement p.5 and answer p.66 |
| `1.3-source-example-4` | Radical bar/grouping lost in statement and derivative | \(y=\sqrt{4-x^2}\); \(D=[-2;2]\); \(y'=-\frac{x}{\sqrt{4-x^2}}\) for \(-2<x<2\); no endpoint use | Same PDF, statement p.5 and answer p.66 |
| `knowledge:14.1` | Curated formula detail omitted printed bound order | Append the source-printed condition \(a<b\) to that detail | CD12–CD14 PDF, p.34 |

The first two defects originate in the PDF text layer and positional character flattening; the third was omitted during curated theory conversion. The registry at `scripts/source-first/corrections-v53.json` preserves exact before/after fields, source SHA-256, document identity, original Example number, stable source block and source pages. Nine field changes are staged: seven mathematical fields and two display titles. Titles become “Ví dụ 5” / “Ví dụ 4”, avoiding duplication of malformed extracted formula fragments.

The source hash for the two Examples is `2EBC6F3ABB4558E84237FC2C45DBBC20353B0A6C435E193D6B4A264A17433CA0`; the area source hash is `4E65F476DA0A1B817A05B6E829737100B753A2E5219236F719ACAB016F221E59`.

`normalizeBoundSourceField` accepts only the explicitly named record/field and exact source hash, with exact before/after guards. It rejects stale content and is idempotent. It never infers grouping from ambiguous PDF strings. The existing foundation importer now supports `--review-candidates`: it re-extracts only the relevant statement/answer pages, retains original extracted fields and source regions, applies these two scoped candidates and writes JSON to stdout. A direct unreviewed runtime regeneration is blocked while these corrections await review. It does not broadly re-import CD20/CD21 or regenerate figures. The area correction uses the same guarded normalization in the existing source-to-runtime preparation path.

Targeted replay is deterministic across two runs; it retains stable IDs and source associations. This is candidate generation, **not** a human-approved runtime re-import. No global slash/exponent replacements were added.

## CD22.7 and previous regressions

CD22.7 already matches the supplied native LaTeX: Bayes uses a true fraction and conditional bars; prevalence is 1%, sensitivity 95%, specificity 90%, false-positive probability 10%, positive-test probability 0.1085, and the printed posterior is approximately 8.76%. Its native Example already contains the numerical working in the statement and has no separate source solution block. No new solution or missing condition was invented. Desktop/mobile checks exercise both Knowledge and Example renderings.

The previously reported exponent-warning defect is already corrected in runtime: both Knowledge and methodology retain the warning that addition of powers cannot be converted to a single power by adding exponents. It is mapped as two usages, not counted as a new V5.3 correction. Editorial questions about conditioning-event positivity remain unresolved when the source does not print those conditions.

## Review and release behavior

The existing Math Review Studio shows all source-to-runtime usages, exact raw before/after values, rendered candidates, source block, version and condition context. For the two PDF Examples, its existing full-page tool can switch between p.5 and p.66. Only trusted evidence pages are available through the authenticated loopback endpoint; this adds no student PDF viewer.

The existing CLI review patches continue to attest the benchmark expression and its printed conditions. **They do not automatically approve entire prompts, solutions or companion conditions.** New multi-field targets therefore retain an explicit `exact-target-human-review-required` blocker. Their rollback previews and diffs can be reviewed before any release; source/formula attestation cannot accidentally certify an untouched lesson or approve additional fields.

All 40 source items remain blocked: real human source approvals **0**, mathematical approvals **0**, actual published corrections **0**. The existing five single-formula approved dry-run previews remain covered by isolated synthetic test fixtures; those fixtures create no approvals in the real review store. Preview-only mutation is reversible, idempotent and preserves unrelated record fields. Hash/version/source/dependency checks remain active. Actual publication is unavailable because no authorized, human-approved, atomic publisher across these heterogeneous source modules has been established. No unsafe writer was added to bypass that limitation.

Human action required:

1. Run `npm.cmd run content:source:integrate`, then `npm.cmd run content:source:prepare` and `npm.cmd run content:review`.
2. Inspect each source region/full page and compare every proposed runtime field, including statement, solution, domain conditions and repeated usages. Record an explicit source and mathematical decision using the existing patch export/CLI workflow.
3. Obtain field-scoped approval for the complete runtime diffs. Benchmark-expression patches alone are insufficient. Recompute the proposal against the current source, runtime record and version before release.
4. Explicitly authorize a subsequent release only after those approvals and an atomic, reversible application mechanism exist. This task does not execute that release.

The student website still contains the three defects above until that process is completed; staged screenshots are clearly marked **LOCAL STAGED PREVIEW — NOT PUBLISHED**.

## Validation and unchanged backlog

New regression tests cover all 40 classifications/64 usages, semantic resolution after reorder, ambiguous locator rejection, wrong source identity, stable Example/source-block matching, grouping-sensitive MathML comparison, source-bound exact normalization, stale values, reversible previews, deterministic original-PDF replay, the unreviewed importer-write guard, medical notation and source-page endpoint authorization.

The browser audit at `.audit/runtime-integration-v53.mjs` exercises five real learner routes at 1366×900 and 390×844, against both unchanged runtime and isolated candidate module overrides: **20 learner states**, plus the existing Studio runtime-diff panel at both sizes. It checks math parsing, fraction/radical structure, the restored condition, medical result, no page-level overflow and zero page errors. Original module/document hashes are checked after the run. Existing learner navigation, reveal, progress, protected topics and exercises are also checked by the full project regression suite.

Final executed totals and command exits are recorded in [validation-v5.3.json](../../.audit/source-first-v5/validation-v5.3.json), with the full verification log at `.audit/source-first-v5/verify-v53.log`. KaTeX success is a rendering check, not mathematical approval. Original PDF crops/full pages supply the source evidence; agent inspection does not count as human review.

The existing queue remains authoritative: 1,512 unique entities, 180 suspicious fraction/slash candidates, 188 pending figure reviews, nine unresolved calculus answer conflicts excluded from automatic grading, and 21 topics without supplied authoritative documents. The confirmed defects are linked to existing source items; no second queue or fabricated completion was created. Sixteen prior agent figure observations are retained without promoting them to human approvals. Original diagrams are unchanged.

V5.4 subsequently adds field-level decisions and a gated single-file local publisher; see [source-verification-v5.4.md](source-verification-v5.4.md). The preview-only limitation above records the V5.3 baseline, not the newer capability. Actual publication remains zero until real approvals and separate authorization exist.
