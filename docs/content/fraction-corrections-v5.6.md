# V5.6 — Source-backed fraction audit and local continuation

Date: 2026-11-06 (Asia/Bangkok). This is a development experiment, **not human mathematical review or production publication**.

## Actual baseline and scope

The user applied V5.5 before this task. Both runtime files match its authorized after hashes; all nine V5.5 fields, immutable manifest, backups and four journal events were preserved. V5.6 does **not** roll them back. Recovery evidence is in `.audit/source-first-v5/recovery-v5.6.json`.

No real V5.6 runtime application is performed by this task. Its apply and destructive recovery tests run only in isolated, path-checked fixtures. No source PDF/TeX is edited. No commit, push or deployment.

## Complete existing 180-reference audit

The report is a projection of the existing canonical queue, not a new review database:

- `.audit/source-first-v5/fraction-audit-v5.6.json`: every historical reference, canonical entity key, current record/field, source hash, raw source context, span geometry, classification, reason and eligibility.
- `.audit/source-first-v5/fraction-evidence-v5.6.json`: read-only PDF extraction for the same references. The existing original section/example-number locator is reused.

| Classification | References | Meaning |
| --- | ---: | --- |
| ALREADY_CORRECT | 73 | Source fidelity established by exact inline glyph comparison with superscript geometry, or exact native-TeX block replay. Not proof that the tutor's mathematics is infallible. |
| CONFIRMED_CONVERSION_ERROR | 14 | Agent compared original PDF pages with runtime; 10 complete groups selected, 4 deferred. |
| SOURCE_AMBIGUOUS | 88 | Source structure/grouping not independently established with current extraction. These are **not** verified correct. |
| RUNTIME_MAPPING_AMBIGUOUS | 5 | Historical CD21 IDs no longer resolve uniquely; no positional substitution. Protected content remains unchanged. |
| SOURCE_CONFLICT | 0 | No newly established conflicting source versions in this particular 180-reference audit. |
| UNSUPPORTED | 0 | No additional cases assigned this category; uncertain PDF structures are explicitly source-ambiguous. This does not mean the CAS supports all 180 expressions. |

143 references have original section-and-example-number statement/solution regions. 175 resolve to a current runtime field; the five historical CD21 references do not. Calculus `steps.text` references are audited as the actual text field, not silently substituted with `steps.expression`. Where no exact formula locator exists, the report retains page context or an explicit unresolved locator; it does not invent a source formula or condition.

Inline normalization is comparison-only. It removes whitespace and preserves actual superscript groups. Stacked fraction drawings and radicals are rejected by this inline matcher. It does not erase bars, operators, exponents, roots, domain conditions or absolute values. Matching the old importer against its own output alone is never accepted as source fidelity.

## Ten complete correction groups / 26 fields / one runtime file

Authoritative source: `assets/documents/bienedu-ham-so-dao-ham-cd01-cd07.pdf`, SHA-256 `2EBC6F3ABB4558E84237FC2C45DBBC20353B0A6C435E193D6B4A264A17433CA0`.

| Stable example ID | Original statement / solution pages | Corrected structure |
| --- | --- | --- |
| `1.3-source-example-2` | 5 / 66 | `y=\sqrt{3-2x}`, `y'=-\frac{1}{\sqrt{3-2x}}`; retain function endpoint `3/2` and strict derivative condition. |
| `1.3-source-example-3` | 5 / 66 | `y=\sqrt{x^2+1}`, `y'=\frac{x}{\sqrt{x^2+1}}`; retain value `y'(1)=\frac{1}{\sqrt2}=\frac{\sqrt2}{2}`. |
| `1.3-source-example-5` | 5 / 67 | `y=\frac1{\sqrt{2x+3}}`, powers `-1/2`, `-3/2`; retain `x>-3/2`. |
| `1.5-source-example-2` | 6 / 67 | `f'(x)=\frac2{2x+1}` with original `x>-1/2`. |
| `6.1-source-example-1` | 49 / 87 | Values at `1/2`: `-3/4`, `3/4`, `1/4`. |
| `6.1-source-example-2` | 50 / 87 | `-11/4`, `15/4`, `11/4`. |
| `6.1-source-example-3` | 50 / 87 | `-3/8`, `-11/8`, `11/8`. |
| `6.1-source-example-4` | 50 / 87 | `1/8`, `-1/8`, `9/8`. |
| `6.1-source-example-5` | 51 / 87 | `-9/16`, `25/16`, `9/16`. |
| `6.1-source-example-6` | 51 / 87 | `39/16`, `23/16`, `-23/16`. |

All ten change `answer` **and** the uniquely named `Lời giải từ tài liệu.expression`. The three root examples also change their malformed question and derived title (four fields each). That gives 26 fields, not 26 independent mathematical errors. Six graph questions keep their statements, images, ordering and all unrelated text/metadata byte-for-byte. No new figure is approximated.

Exact current/proposed field values, source blocks/pages and before/after hashes are in `scripts/source-first/corrections-v56.json` and the consolidated preview. Original PDF page screenshots `v56-source-page-{5,6,49,50,51,66,67,87,88}.png` were visually inspected. They are agent observations, not fabricated human attestations.

The additional four confirmed errors are `6.1` examples 7–10 (original solution pp.87–88): lost quotient structure or fractional exponent. They are excluded from this first batch because a complete source-bound correction group/supported check has not been prepared. The other 88 uncertain cases remain uncertain.

## Conversion cause and durable importer fix

The PDF text layer separates fraction numerators/denominators into small elevated/lowered spans, and does not encode a radical's extent as a semantic math node. The old span-to-text conversion can misread these as Unicode superscripts/subscripts or flatten a root boundary. A plain slash warning is therefore neither a diagnosis nor authorization to rewrite it.

V5.6 uses narrow source-specific overrides, bound to the exact source hash, document, page, source block, stable record, exact field, expected old value and corrected value. The original importer calls the same `import-corrections.py` adapter; unknown source editions or changed before values fail closed. Whole-curriculum regeneration is still blocked. Use the read-only targeted replay:

```powershell
python -X utf8 scripts/import-foundation-documents.py --review-fraction-candidates
```

The legacy V5.3 replay intentionally loads only p.66. Its untargeted example 1.3/5 has no solution because that solution is on p.67; V5.6 does not pretend otherwise or let it contaminate the actual complete batch replay.

## Mathematical checks and extraction tools

The existing isolated SymPy 1.14.0 environment and bounded, non-evaluating parser are reused. `symbolic-batch.py` extends it with only `ln`, exact source half-lines and the two source-printed rational powers. Four derivative/domain checks and 18 exact polynomial-value identities pass. These are exact identities, not numerical sampling. The derivative of `ln` remains restricted to the original function domain even though its rational derivative alone has a larger algebraic domain. Lost-domain, wrong-sign, unsupported-command and falsely broadened-domain tests fail closed.

Every proposed field renders with the existing KaTeX renderer. MathML regression checks distinguish fraction grouping, root boundaries, exponents/subscripts and conditional bars. Rendering is not treated as mathematical proof.

No additional heavyweight OCR/model was installed. Actual available memory during this task was about 2.9 GiB of 15.4 GiB usable RAM. Current geometry extraction plus original-page inspection resolved the initial batch without a model. The remaining 88 ambiguous cases form an explicit representative backlog for a future recognition benchmark (stacked/multiple fractions, radicals, log subscripts and calculus source associations). No unmeasured MinerU/Docling improvement is claimed; no private PDF was uploaded, no paid API was invoked. The PDF pages/spans and actual learner screenshots, rather than a synthetic OCR success metric, are retained as evidence.

## Single consolidated local operation

Run at `D:\BienEdu`:

```powershell
npm.cmd run content:dev:batch -- preview
npm.cmd run content:dev:batch -- status
```

The preview prints the **exact fresh apply and rollback commands**, also stored as `applyCommand` / `rollbackCommand` in `.audit/source-first-v5/development-preview-v5.6.json`. Do not copy an old hash after changing bound code or sources. The final handoff includes the current exact command.

Current prepared manifest (unchanged code/source versions only):

```powershell
npm.cmd run content:dev:batch -- apply --development --execute --authorize E21227B1EEB2771BB4796EAF13A379907F87E079CA26EB04483BBE2BB1E811C1
npm.cmd run content:dev:batch -- rollback --development --execute --authorize E21227B1EEB2771BB4796EAF13A379907F87E079CA26EB04483BBE2BB1E811C1
```

Immutable manifest and backup directory: `.content-work/source-first-v5/dev-plans/E21227B1EEB2771BB4796EAF13A379907F87E079CA26EB04483BBE2BB1E811C1/`. The backup JSON for each target holds the full original applied-V5.5 bytes and full proposed bytes, verified against both manifest hashes.

`apply` without `--execute` is a dry run. Actual execution requires **all three**: `--development`, `--execute`, `--authorize <exact manifest hash>`. Production, CI and cloud execution are rejected. The actual current state during implementation is `prepared-on-applied-v5.5`; runtime writes by V5.6 are zero.

Backups and full proposed bytes are immutable under `.content-work/source-first-v5/dev-plans/<V5.6 hash>/`. Journals use the existing `.content-work/source-first-v5/dev-experiments/<hash>/` convention and existing shared `.local-release.lock`. Every target uses stable record/source identity and exact before hashes. Replacement is atomic **per file**, not across multiple files. This first batch intentionally permits only its one foundation module.

The small versioned continuation adapter was necessary because editing V5.5's hash-bound engine would invalidate its original rollback authorization. V5.5's code, manifest, backups and journal remain untouched. The child baseline is V5.5's **after** bytes. Unknown concurrent edits, missing fields, altered dependencies, damaged backups or changed sources stop execution.

### Recovery order

1. If interrupted after replacement, repeat the exact **same** child apply command to validate/recover, or run its exact rollback command.
2. Child rollback restores the applied V5.5 baseline byte-for-byte. It does not undo V5.5.
3. Roll back V5.6 **before** attempting V5.5 rollback. The old V5.5 engine correctly refuses the child's unknown after bytes rather than overwriting them. Its status can consequently say `conflict` while the child is active; use `content:dev:batch -- status` for the child.
4. An abandoned lock after a hard process crash requires operator inspection. Do not delete a lock or edit a manifest just to bypass a failed safety check.
5. Do not modify hash-bound engine/source files while an experiment is active. Keep the immutable plan/backups for the exact applied version.

The authorized apply CLI immediately runs actual learner-field validation and desktop/mobile Playwright checks. If browser validation fails after replacement, it reports that the local experiment is applied but validation failed, and preserves the same-plan rollback. It never fabricates a successful publication or human-review badge.

## Validation and remaining work

Machine-readable final results: `.audit/source-first-v5/validation-v5.6.json`. Full logs: `verify-v56.log`, `source-tests-v56-final.log`. Actual isolated-file browser report: `browser-v5.6.json`, with before/after screenshots for all ten examples at 1366×768 and 390×844; six additional inherited V5.5 states are checked. Student storage sentinel, source images, exercise availability, math parsing, duplicate question container, page overflow and false human badges are asserted. No application interception or proposed-module response override is used for the V5.6 checks.

Historical V5.4/V5.5 mutation tests now read immutable old before bytes **only in isolated fixtures**. Live-runtime tests recognize the authorized applied V5.5 state. This avoids restoring broken mathematics merely to satisfy old test assumptions. A live Studio with no remaining V5.5 changes does not offer obsolete field exports; historical formal approval/export mechanics remain covered by isolated regression tests.

The 188-figure queue, nine unresolved CD12–CD14 answer conflicts excluded from auto-grading, 21 missing-authoritative-source topics, protected CD20/CD21 content and unpublished CD23 are retained. No progress key, scoring rule, source document or formal publication approval gate is changed.
