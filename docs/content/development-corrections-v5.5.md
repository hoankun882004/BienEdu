# V5.5 — One-step local mathematical correction experiments

V5.5 reuses the existing source-first pipeline, correction registry, semantic runtime adapters, Review Studio and backup primitives. It adds a separate **local development experiment** path. It does not grant human source/editorial approval, alter immutable review history, or publish to production.

**Implementation status:** three corrections / nine fields / two files are prepared. Actual project runtime writes: **0**. Formal human approvals created: **0**. Production publications: **0**. Only isolated temporary fixture content was changed and rolled back during testing.

## The single user action

The current consolidated preview is [development-preview-v5.5.html](../../.audit/source-first-v5/development-preview-v5.5.html), with exact raw/rendered before/after text, source identities, CAS results, file hashes and rollback location. The existing Review Studio also shows the same batch in its compact local overview, without development approval checkboxes or JSON exports.

Once that preview has been inspected, run the **exact `applyCommand`** in [development-preview-v5.5.json](../../.audit/source-first-v5/development-preview-v5.5.json). It has this form:

```powershell
npm.cmd run content:dev:apply -- --development --execute --authorize PLAN_HASH
```

`PLAN_HASH` is the complete hash printed by the preview command, not a reviewer name or a field approval. The final task response provides the current exact command. This execution action was deliberately **not run against the real project** during implementation, as V5.5 requires a fresh user-controlled action.

The one action applies eligible changes to the local files, checks the actual content loaders/KaTeX in a fresh Node process, then automatically opens an isolated headless browser against the local application and validates the three corrected lessons on desktop/mobile. It does not open or reset the user's existing browser session. No nine-file JSON review procedure is required for this experiment.

Useful read-only commands:

```powershell
npm.cmd run content:dev:preview
npm.cmd run content:dev:status
npm.cmd run content:dev:apply
```

`preview` revalidates the batch and saves immutable before/after backups. `status` reads actual file hashes. `apply` without `--execute` remains a dry-run. A changed source, crop, implementation, snapshot or loader dependency invalidates an older plan; prepare a fresh preview while the runtime is in its original state. An active, partial or conflicted experiment retains its old manifest/rollback pointer instead of silently replacing it with an empty plan.

## Automatic comparison and pilot eligibility

| Classification | Benchmark items | Meaning |
| --- | ---: | --- |
| SOURCE_EXACT | 5 | Supported native-source normalization and MathML/token structure match; no human approval |
| VERIFIED_BY_SUPPORTED_CHECKS | 0 | Available category; no extra item was promoted without adequate source/mapping evidence |
| CONFIRMED_CONVERSION_DEFECT | 3 | Existing source-bound pilot corrections with all affected fields resolved |
| AMBIGUOUS | 32 | PDF grouping, source editions or mappings still need stronger evidence |
| CONFLICT | 0 | No actual current pilot conflict; failing source/math/runtime cases are excluded in regression fixtures |

These are operational classifications, not accuracy percentages. The two derivative groups additionally pass supported symbolic checks; they remain classified as confirmed conversion defects rather than being counted twice. SOURCE_EXACT items already match and therefore add no write targets.

Only the following existing registry transformations are eligible:

| Record | Original evidence | Corrected scope |
| --- | --- | --- |
| `1.2-source-example-5` | CD01–CD07 PDF, statement p.5 / solution p.66; SHA `2EBC6F3ABB4558E84237FC2C45DBBC20353B0A6C435E193D6B4A264A17433CA0` | \(f(x)=\frac{x}{x^2-1}\); \(f'(x)=\frac{-x^2-1}{(x-1)^2(x+1)^2}\); \(x\ne\pm1\); \(f'(2)=-\frac59\) |
| `1.3-source-example-4` | Same source/pages/hash | \(y=\sqrt{4-x^2}\); \(D=[-2;2]\); \(y'=-\frac{x}{\sqrt{4-x^2}}\) for \(-2<x<2\), retaining the endpoint restriction |
| `knowledge:14.1` | CD12–CD14 PDF p.34; SHA `4E65F476DA0A1B817A05B6E829737100B753A2E5219236F719ACAB016F221E59` | Restore the printed \(a<b\) only in the area-with-Ox detail |

The two Examples each change title, prompt, answer and the uniquely named source-solution step. The Knowledge record changes one detail. Nine fields include seven mathematical fields and two Example-number titles. Original wording, constants, domains, stable IDs and source associations are retained. Unknown/partial groups are excluded; a statement cannot be applied while its required solution fields are omitted.

The existing source-aware foundation extraction is rerun on the original statement/answer pages. Its source regions and original extracted fields remain available. Its candidate output must agree exactly with the staged strings. The area condition is independently located in p.34's text layer and backed by the unchanged original crop. No OCR guess is used to infer a fraction or radical scope. Rendering, source provenance and mathematical identity are separate checks.

## SymPy and the parser boundary

Installed locally in `.content-work/source-first-v5/sympy-env`: **SymPy 1.14.0** and **mpmath 1.3.0**. The global Python environment and Node dependencies were not replaced. Reproduction:

```powershell
python -m venv .content-work/source-first-v5/sympy-env
& '.content-work/source-first-v5/sympy-env/Scripts/python.exe' -m pip install -r scripts/source-first/requirements-symbolic.txt
```

The Python adapter uses a small non-evaluating grammar that constructs SymPy nodes directly. It supports bounded expressions in real `x`, integers, arithmetic, explicit fractions, roots, small supported powers and supported derivative/equivalence/antiderivative jobs. It does not call `eval`, `sympify` on arbitrary text, or a general LaTeX/OCR parser. Unknown commands, unsupported assumptions, excessive complexity, timeouts and parsing failures stay unsupported, never silently correct.

For the pilot, SymPy verifies derivative differences simplify to zero, the rational result at 2 is exactly −5/9, and source-declared function/derivative domains agree. The root function has closed domain [−2;2], while its derivative has open domain (−2;2). Original denominator constraints are retained separately, so a cancellation such as `x/x` cannot silently be certified over all real numbers. Polynomial antiderivatives and algebraic equivalence are also exercised in fixtures. Numerical checks are supporting evidence; KaTeX success is only render evidence. None proves PDF transcription fidelity or constitutes human editorial approval. See the primary [SymPy calculus tutorial](https://docs.sympy.org/latest/tutorials/intro-tutorial/calculus.html) and [domain API documentation](https://docs.sympy.org/latest/modules/calculus/index.html).

If the isolated environment is missing, the derivative pilot groups are excluded rather than falling back to invented mathematical verification. The source-printed area condition does not require a CAS identity.

## OCR evaluation

Inspection found Python 3.13.14 with existing PyMuPDF, no installed Docling/MinerU, approximately 79 GB free disk, 16 GB total RAM and 4 GB available RAM at inspection. These three clean-source pilot cases are already recoverable through the existing bounded extraction/normalization path. No heavyweight OCR package or model was installed and no OCR quality improvement was fabricated.

Docling's local model/OCR dependencies and MinerU's model-backed deployment/resource choices were considered using their primary [installation documentation](https://docling-project.github.io/docling/getting_started/installation/) and [resource guidance](https://github.com/opendatalab/MinerU/blob/master/docs/en/usage/tiers.md). An extra model/parser benchmark is deferred until a representative unresolved fraction sample requires it and available memory permits a controlled comparison. No paid API, external OCR service, source upload or local vision model was used.

## Preview, application and rollback safeguards

The immutable manifest and before/after file contents are under:

```text
.content-work/source-first-v5/dev-plans/PLAN_HASH/
```

The manifest binds source/crop/snapshot hashes, semantic record and field identities, record/version/conditions hashes, exact old/new values, expected file hashes, implementation/loader dependencies, actual symbolic results and exclusions. Application recomputes supported evidence and validates the canonical registry transformations. The same validated bytes generate the preview and the applied files; there is no second hand-maintained correction payload.

The two storage adapters are reused from V5.4. Generated Examples are changed only at resolved JSON string-token spans, preserving unrelated bytes, CRLF, numeric spellings, figure metadata and other records. The curated adapter changes only the named 14.1 formula detail. Array positions are temporary resolution results, not stored identities.

Execution requires all of:

- Explicit `--development`, `--execute` and the exact manifest hash.
- A local Git workspace, with no production `NODE_ENV` or detected CI/cloud deployment flags.
- Known current file hashes and complete, uniquely resolved source-bound correction groups.
- Valid immutable backups and unchanged source/crop/dependency evidence.

Each file is replaced atomically through a flushed temporary file in the same directory. The existing local-release lock coordinates formal and development writers. **The two-file batch is not multi-file atomic.** The engine preflights all files and preserves a development journal. If a later file fails, known before/after hashes identify the partial state. An unknown outside edit is not overwritten.

For recovery, use the same saved manifest/hash. Re-run the authorized apply command to finish remaining files, or run the report's exact rollback command:

```powershell
npm.cmd run content:dev:rollback -- --development --execute --authorize PLAN_HASH
```

Rollback restores known after-states from the original immutable backups and skips files already at their before-state. Reapplication and repeated rollback are idempotent. Corrupt backups, changed dependencies, missing evidence and unknown runtime edits fail closed. An interrupted OS process may leave the cooperative lock: stop/verify the relevant writers and inspect the journal before explicitly removing an abandoned lock; there is no timeout-based unsafe unlock.

Every successful application validates all nine fields through fresh application loaders and KaTeX. The CLI additionally runs `dev-browser-check.mjs` against the actual local files at 1366×768 and 390×844. If browser validation fails, the command reports that the local experiment is applied but validation failed; backups and the same-plan rollback remain available. It does not report a successful production release.

The local experiment has `formalHumanApproval: false` and `productionPublication: false`. No reviewer identity or human approval event is synthesized. No “Đã kiểm duyệt” badge is created. Existing formal field decisions, `field-apply`, approval checks, audited manifests and publication authorization remain unchanged. Roll back an experiment before returning to that formal before/after release workflow.

## Review Studio and future bulk work

The existing Studio's compact overview displays the prepared batch, supported SymPy results, ambiguity/conflict counts, actual current file state, proposed text and the one apply command. Its development section contains no approval checkboxes or mandatory exports. Formal per-field controls remain available separately. Current text is derived from live before/after hashes; a conflicting outside edit is shown as unknown rather than incorrectly displaying the old text as current.

All **180** existing fraction/slash flags are projected through the same evidence report with their existing canonical entity references. **180/180** retain their existing entity links; **0 additional bulk transformations** were independently justified. They remain AMBIGUOUS and are not auto-written. This is a preparation view, not a new review database or queue. The 188 figure records, nine disputed calculus answers, six ambiguous runtime mappings and 21 missing-source topics are preserved. CD20/CD21 are protected and CD23 remains unpublished.

## Executed validation and actual status

Executed commands and final exits/totals are recorded in `.audit/source-first-v5/validation-v5.5.json`:

- `npm.cmd run verify`: full project checks, source pipeline, Node/LaTeX tests and existing browser regressions.
- `npm.cmd run test:source-first`: source/review/release/development tests plus existing and new browser harnesses.
- Focused development tests: symbolic identities/domains, unsupported syntax, production/CI exclusion, explicit authorization, exact manifest targeting, immutable preview backups, default dry-run, idempotence, partial multi-file recovery, rollback, stale/corrupt data, retained active-plan pointers and unchanged formal approval gates.

The new browser harness exercises 12 primary before/actual-fixture-after learner states across the three lessons and two viewports, plus the same automatic post-apply browser helper used by the CLI. It checks fractions, powers, radicals, derivative results, conditions, titles/solutions, no duplicate statement, no KaTeX/page errors, no horizontal page overflow and no false human badge. A seeded existing progress record survives application/reloads; existing practice controls remain available. Fixture application and the consolidated real preview have identical proposed file hashes. Original V5.3/V5.4 browser regressions remain in the source-first command.

Actual screenshots were inspected. Before/after fixture screenshots are labelled clearly as isolated/local experiments. The actual project data remains at its original before-hashes; all nine original physical source hashes and five recovered runtime module hashes are preserved. No formal review history was changed. No real local experiment was executed, and no commit, push or deployment occurred.
