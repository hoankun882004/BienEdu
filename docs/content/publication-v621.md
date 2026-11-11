# Biển Edu — publication V6.2.1

User-requested website update and Git publication, 2026-11-11. This supersedes the package-drift blocker in the interrupted V6.2 handoff; it does not modify its historical manifests or evidence.

## Content

All eight PDFs in `39 chuyên đề` and both TEX files are accounted for. The verified V6.2 batch adds 621 source examples and 621 full source solutions, 16 primary knowledge groups and 22 primary method groups. The newly discovered independent `CD08-Mu-Logarit.tex` adds another 140 examples/solutions across all 14 source sections, with 14 knowledge contexts and 14 method contexts. Native TeX offsets, line numbers, full example IDs and source hash are retained. Its 636 source mathematical occurrences pass the shared canonical/KaTeX parser; that is not blanket mathematical/editorial approval.

New total: **761 examples and 761 source solutions**. Independent calculus and CD08 source contexts remain separate, not replacements for earlier PDF knowledge or examples.

The previous 219 overlay examples, 35 corrected fields, five native graphs and one variation table remain intact. Cumulative overlay: 980 examples (not the total across the entire website). Existing progress IDs and exercise scoring are unchanged. No invented standalone practice or cropped graph replacement is added.

This is **not a complete mathematical conversion of every page**: all 861 prior blockers plus 140 native CD08 pairs were examined (1,001 candidates), but 240 prior PDF candidates remain blocked by unresolved structure/context. Missing authoritative sources for CD24–CD27/CD34–CD39 are not fabricated. CD20/CD21 remain protected and CD23 unpublished. Machine structure/syntax checks are not editorial approval.

## Publication and rollback

Publication hash: `A24977451828DE672551E5954574C91347928926A5AA48E54A61862E589FCE85`.

Published content hash: `976076AF726183443F57716EF2D92C50BC4C5AA006BAE2DF034DF494F894C55E`.

Original verified V6.2 content remains byte-immutable at `685CCFDDBDB67C28068D718D4C9535E2850DE51EB67421A663C6EC4FC629B48C`; the new bundle preserves all its groups/corrections/graphs and appends the independent native CD08 groups.

The new immutable publication plan explicitly adopts only the two existing `start`/`dev` scripts while preserving their values, validates all other parent/source bytes, and activates the tested content last. It does not rewrite old authorization hashes. File atomicity is per file; rollback runs in reverse order and restores the pre-publication package including those two scripts.

Local status:

```powershell
node scripts/source-first/publish-v621.mjs status
```

Local rollback (only if intentionally requested; not performed on the real site):

```powershell
node scripts/source-first/publish-v621.mjs rollback --authorize A24977451828DE672551E5954574C91347928926A5AA48E54A61862E589FCE85 --execute
```

Keep `.content-work/publish-v621/<hash>/` and the ancestor archives for local authenticated rollback/historical tests. They are private development artifacts, not hosting assets. On a new checkout the historical release suites require restoring these local archives; the published learner itself does not.

## Hosting

`.vercelignore` now permits only `learner.mjs`, `registry.mjs` and `lesson-workspace.mjs` inside `scripts/source-first/runtime-v62`. Other source-first tools, private manifests and audit files remain excluded. This prevents hosting-only missing-module failures while retaining the existing static architecture and lazy JSXGraph loading.

The original overlay and graph loader were gated to localhost. Verified, activated content/graphs now load on hosted origins too; experimental preview queries remain local-only. An invalid content hash fails instead of silently displaying the older payload. `.gitattributes` preserves the exact bytes of content-addressed learning/graph JSON across Git checkouts.

Visual inspection found an intrinsic Grid column expanding the native knowledge note beyond the mobile viewport. The existing card now uses `minmax(0,1fr)` with shrinkable source-note children, retaining BienEdu typography/colors and equation-level scrolling. Mobile assertions use the configured viewport width, not an auto-expanded `innerWidth` that can conceal this defect. This targeted audit follows `redesign-existing-projects`; no unrelated page redesign is included.

## Validation

The original mathematical content previously passed all 15 sequential V6.2 verification commands. The new publication adds nine focused safety/hosting/native-source tests and post-activation QA against **actual** learner pages (not only an overlay preview). A separate HTTPS-origin simulation tests six desktop/mobile learner states with production hosting exclusions enforced, and verifies that a corrupt payload is rejected. All 140 native CD08 examples are additionally checked on desktop and mobile (280 states), including exact formulas, paired solution, both source-context disclosures, original-source preservation and correct TEX provenance. It is not certification of an external deployment.

Run:

```powershell
node scripts/verify-publication-v621.mjs
```

Current execution results, full logs and source hashes are written under `.audit/publication-v621/`. A successful `verified.json` records all exits and actual desktop/mobile/graph/CLS states. Do not treat an absent/failed report as a completed QA run.

`npm run test:canonical` and other historical suite entry points preserve their original assertions in disposable authenticated fixtures. They never roll the published website back. New publication tests are in `tests/publication-v621.test.mjs`.

Local website:

```powershell
npm.cmd start
```

Open `http://localhost:3000/documents.html?grade=12`. A Git push is not proof that a hosting deployment has completed.
