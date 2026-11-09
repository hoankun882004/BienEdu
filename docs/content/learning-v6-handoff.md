# Biển Edu V6.0 — engineering handoff

Status: **PARTIAL** for the complete-website/content-completion mission. The scoped local batch and mobile improvements are implemented; final test results are in `.audit/source-first-v5/release-v6/final-report.json`. A prepared batch is not an applied release or human editorial approval.

## What changed

- Retained static HTML, CSS and ES Modules. No React, Next.js, new router, hosting migration or new npm dependency.
- Finished the existing JSXGraph 1.14.2 pilot: five source-backed functions and one semantic variation table; lazy local library loading, separate branches, keyboard/zoom/reset, two-finger pan, resize and disposal.
- Added import-map compatibility adapters around existing content modules. No edits to the hash-bound curriculum, legacy math renderer, original correction registries or progress/scoring modules.
- Added a local-only, hash-checked canonical learning bundle. Existing V5.6 corrections are reused; three complete graph-associated statement/solution formatting groups are prepared alongside one complete new sequence lesson group.
- Improved mobile controls, single-row example selection, four-phase navigation, locally scrolling math/tables, Vietnamese review labels, menu focus management, closed-menu `inert`, answer announcements and nested landmark semantics.
- Existing V5.5 corrections remain applied. V5.6 remains prepared on the real filesystem. All application and rollback testing uses disposable filesystem fixtures and isolated browser storage.

## Independent sources and content scope

The live inventory is `.audit/source-first-v5/release-v6/inventory.json`. Its `matrix` contains all 39 topics and their source-specific sections, runtime knowledge/examples/practice/solutions, protected/unpublished states and prepared content. Raw PDF blocks are not counted as completed lessons. Statement and solution headings are paired using explicit example identities, not positions.

| Source | Actual coverage | Pages / semantic inventory |
| --- | --- | --- |
| Original functions PDF | CD01–CD07 | 98 pages; existing source mappings retained |
| Original exponential/logarithm PDF | CD08–CD11 | 78 pages; existing source mappings retained |
| Original calculus PDF | CD12–CD14 | 49 pages; existing examples/practice remain distinct |
| Probability PDF | CD20–CD21 | 18 pages; protected content retained |
| Native TEX | CD20–CD23 | 46 native sections; independent of probability PDF |
| New trigonometry PDF | CD15–CD16 | 15 sections, 150 explicit statement/solution pairs |
| New sequences PDF | CD17–CD19 | 17 sections, 170 explicit statement/solution pairs |
| New calculus PDF | CD12–CD14 | 26 sections, 260 explicit statement/solution pairs; **not** an equivalent edition of the original calculus PDF |
| New vector/Oxyz PDF | CD28–CD33 | 50 sections, 500 explicit statement/solution pairs |

There are **9 independent sources**: eight original PDFs (394 pages total) and one TEX file. Served copies are not additional educational sources. CD24–CD27 and CD34–CD39 still lack authoritative sources. CD23 remains unpublished/blocked.

The four new PDFs yield 1,080 candidate statement/solution pairs. That is a structural inventory, **not** 1,080 mathematically approved or imported examples. Only the following complete new semantic group is prepared in this pass:

- CD17 / Dạng 17.1: source-backed knowledge and method, 10 stable example IDs, 10 complete source solutions, explicit page identities and original SHA-256.
- Exact SymPy arithmetic checks cover all ten examples. Formula grouping, fractions, exponent signs, radical scope, recurrence indices and the positive-integer indexing convention are retained.
- No standalone practice questions or answer options were invented for this group. Other newly sourced sections remain unavailable in the default learner runtime until converted and verified.

## Mathematical corrections and Canonical Math Format

The V5.6 26-field payload is taken from its existing immutable continuation plan and source registry. Its 10 complete correction groups are not recreated by hand.

Nine additional canonical overlay fields cover complete prompt/answer/source-solution groups for `6.1-source-example-7`, `6.1-source-example-8` and `6.1-source-example-9`. Their original statements and solutions were read from the functions PDF (pages 51–52 and 87–88). These repair flattened fractions/exponents; extracted axis numbers are not treated as question prose. The native graph still supplies the corresponding axes.

The prepared batch therefore has 35 correction fields in 13 groups: 26 physical V5.6 fields plus nine canonical overlay fields. The new independent CD17.1 group also uses canonical text/math/rich-text nodes. Compatibility adapters serialize explicit math boundaries into the existing learner contract; the existing Common KaTeX Renderer remains the only mathematical rendering engine. Structured knowledge formulas explicitly take the inline-math compatibility path to avoid double conversion of delimiters.

Do not equate successful KaTeX rendering with source approval. Existing 88 source ambiguities, five mapping ambiguities, nine calculus answer conflicts and four unsupported native TEX conversion cases are not silently resolved. No human approvals are fabricated.

## Graph pilot

The existing 188-record figure queue remains canonical. The graph inventory is a projection of that queue, not a second review database:

- 80 function graph references.
- 40 variation table references.
- 68 text-containing legacy assets, not plotted graphs.
- Five reconstructed functions: `x(x−2)`, `1/x`, `x+1/x`, `exp(x)`, and `sqrt(4−x²)`.
- One directly transcribed variation table (`2.3-example-1-figure-1`); no function is inferred from the table.

Original source hashes, page identities, separate domains, exclusions, roots, stationary points, endpoint inclusion and applicable asymptotes are checked. SymPy runs offline; no symbolic engine reaches the student browser. Technical fixtures cover shifted poles, logarithms, piecewise endpoints, removable holes and trigonometric evaluation, but are not lesson content.

The remaining 75 graph references and 39 table references are **not certified replacements**. Some have insufficient equations; others still need detailed source-feature verification. They are not all intrinsically unreconstructable. Legacy assets remain intact, and only exact pilot targets are hidden after a native component has mounted successfully. Failed mounts retain the original figure. Recognition exercises do not display the selected equation or derived answer legend before solving.

No PDF cropping, raster conversion, extracted SVG or generated image is used by the new graph pipeline. Browser screenshots are QA evidence; historical reference-image tests may replay their unchanged existing evidence.

## Mobile and accessibility

The dedicated mobile suite covers 320×568, 360×800, 390×844, 430×932, 768×1024, 1024×768, 1366×768 and 844×390 landscape. It exercises homepage/course/papers/registration, roadmap/topic, knowledge/method/examples/practice, graphs and tables.

Key fixes are actual behavior, not mockups:

- Closed mobile navigation is not keyboard focusable. Open-menu Tab cycling, Escape and outside-click closure retain the existing navigation.
- One page-level `main`; the nested lesson landmark is a labelled section with all original children/attributes retained.
- Primary lesson targets are at least 44px high; balanced previous/next controls retain their existing actions.
- Horizontal example indices have a bounded grid parent, preventing internal article widening and misaligned hit targets.
- Local math/table arrow scrolling does not advance the lesson.
- Graph CSS is loaded before board construction; controls override conflicting legacy figure-button styles. Axis margins protect labels. Two-finger pan preserves ordinary one-finger document scrolling outside graphs.
- Existing answer feedback retains `role=status` and adds atomic announcements. Review warnings are localized without changing review data.

This is not a claim of exhaustive WCAG conformance or full nonvisual graph pedagogy certification. Desktop/mobile screenshots and programmatic checks supplement, rather than replace, mathematical verification.

Browser automation uses the installed Chromium browser with mobile/touch emulation. It is not physical-device or iOS Safari/WebKit certification; those remain a separate release check.

## Verification and performance evidence

Use `.audit/source-first-v5/release-v6/verification-exits.json` and complete `*-final.log` files for actual exit codes. The final report collects Node, source-first, canonical, graph, release and mobile totals.

Two real recovery issues were addressed:

1. New sources must not mutate V5.5's hash-bound 40-case benchmark snapshot. The benchmark now replays its exact historical source cohort and separately reports newly discovered files. The V6 inventory covers the full live directory. Historical assertions and 40 mathematical cases remain intact.
2. A content-audit assertion assumed exactly four PDF files. It now compares the exact filesystem inventory and every SHA-256, while retaining the assertion that all four legacy mappings exist. The failed attempt is retained in `verify-attempt-1-source-count.log` and `verification-attempt-1.json`.

Performance reports distinguish raw/gzip asset sizes, local navigation+mount observations, DOMContentLoaded and observed layout shifts. JSXGraph is not requested on ordinary text lessons; PDF and SymPy are not loaded during normal learner rendering. No unmeasured speed improvement or production Core Web Vitals claim is made.

## One local release and rollback

Prepare or inspect the current consolidated preview:

```powershell
cd D:\BienEdu
npm.cmd run content:release:preview
python -m http.server 8000 --bind 127.0.0.1
```

Preview: `http://127.0.0.1:8000/.audit/source-first-v5/release-v6/preview.html`.

The **exact fresh** apply and rollback commands are stored in `inventory.json` (`applyCommand`, `rollbackCommand`) and shown on the consolidated preview. Do not use an older hash after code/source changes.

The operation is dry-run unless both `--execute` and `--development` are supplied with the exact manifest hash. It rejects production/CI environments, stale dependencies/sources, corrupt backups and unknown runtime edits. Backups and journals are immutable under `.content-work/release-v6/<HASH>/`.

Only two files are replaced: the foundation module with the exact V5.6 after bytes, then the new `local-release.js` activation file. The canonical bundle is already staged as an immutable content-addressed asset. Apply is **atomic per file, not across files**. Resume accepts only known before/after states. Rollback reverses file order. Interrupted operations retain evidence and can resume with the same manifest; partial/unknown temporary bytes fail closed. The actual CLI performs read-only learner browser checks after application and reports the matching rollback command if those checks fail.

Do not mix a standalone V5.6/V5.8 operation with an active consolidated V6 release. Roll back the consolidated release first. Preparing another V6 batch currently requires the retained V5.5 baseline and inactive V6 activation; future post-release continuation needs a fresh versioned plan rather than bypassing these guards.

Development route previews use `releasePreview=v6` and a tab-scoped `bienedu:local-preview:v6` flag so SPA navigation/reloads remain coherent. `releasePreview=off` leaves preview mode. Student progress keys and scoring are unchanged. Real runtime activation remains null until explicit user authorization.

## Architecture assessment / React

The main maintainability problems are a large curriculum renderer, layered CSS rules, legacy/plain-math compatibility and hash-bound runtime dependencies. React would not solve source fidelity, mathematical provenance or authorization; a migration would require rewriting routing, lifecycle and progress integration with substantial regression risk. Keep ES Modules now. A future isolated content editor or complex assessment-authoring tool could be evaluated separately, with explicit approval. No React migration is justified for this pass.

## Exact implementation files in this pass

Modified existing files (including resumed V5.8 files):

- `assets/js/main.js`
- `documents.html`
- `package.json`
- `scripts/content-pipeline.mjs`
- `tests/content-migration-audit.test.js`
- `scripts/source-first/build.mjs`
- `scripts/source-first/graph-experiment.mjs`
- `assets/js/components/graph-renderer.js`
- `assets/js/graph-loader.js`
- `assets/js/graph-learner.js`
- `.audit/graph-v58-browser.mjs`

New files:

- `assets/learning-v6.css`
- `assets/js/learning-v6.js`
- `assets/js/data/local-release.js`
- `assets/js/data/learning-overlay.js`
- `assets/js/data/knowledge-v6.js`
- `assets/js/data/examples-v6.js`
- `assets/js/data/documents-v6.js`
- `assets/js/release-preview.js`
- `scripts/source-first/sequence-v6.mjs`
- `scripts/source-first/graph-text-v6.mjs`
- `scripts/source-first/inventory-v6.py`
- `scripts/source-first/sequence-check-v6.py`
- `scripts/source-first/sequence-evidence-v6.py`
- `scripts/source-first/release-v6.mjs`
- `scripts/source-first/validate-v6-site.mjs`
- `scripts/source-first/verify-v6.mjs`
- `scripts/source-first/report-v6.mjs`
- `tests/release-v6.test.js`
- `tests/helpers/local-site.mjs`
- `.audit/v6-mobile.mjs`
- `.audit/v6-release-browser.mjs`
- `docs/content/learning-v6-handoff.md`

Generated outputs include content-addressed `assets/content/local-learning/*.json`, the consolidated audit directory and immutable local plans. Earlier preview versions are retained, not overwritten. Standard existing verification commands also regenerate their established reports/screenshots; the project already had extensive dirty changes, and unrelated changes are preserved.

## Remaining blockers and deployment readiness

- Most newly sourced mathematical content still needs high-fidelity canonical conversion and source verification. Structural pairing is not a substitute. At least 1,070 additional matched examples from the four new PDFs are not included in this batch.
- Ten topics have no authoritative source. CD23 is still blocked. Existing mathematical conflicts/ambiguities remain explicit.
- Most historical figures are not certified replacements; 3D/geometric illustrations are outside this pilot.
- Real content integration requires the fresh manifest-specific user action. No actual learner-data release, commit, push or deployment was performed here.
- The static architecture remains deployable, but this local-only experimental activation is not production publication. A later preview deployment needs an explicitly approved source/content set, hosting review and a separate release decision. This handoff does not certify a complete 39-topic production product.
