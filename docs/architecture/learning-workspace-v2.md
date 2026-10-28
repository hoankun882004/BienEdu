# Learning Workspace V2

## Runtime structure

For CD01–CD11 each lesson route now exposes four real sections:

1. `knowledge` — topic-level essential knowledge, including shared module references.
2. `types` — the complete ordered problem-type registry, methodology, notes, counts and deep links.
3. `example` — the ten source examples for the active type, rendered one at a time.
4. `practice` — the existing fail-closed interactive practice system.

Legacy URLs such as `?topic=CD01&type=1.1&section=knowledge&item=1` remain valid. Existing per-type progress IDs are retained for knowledge/examples, while the new `types` section is informational and does not reset completion.

## Source data

`scripts/import-foundation-documents.py` is idempotent and source-bound. It generates:

- per-type methodology readings;
- topic-level knowledge for CD01–CD07;
- reusable shared modules and topic references for CD08–CD11;
- all problem types;
- all worked examples and source/solution page mappings;
- exact source-region assets for figure-dependent examples;
- document hashes and extraction audit counts.

Stable example identity is `${problemTypeId}-source-example-${originalExampleNumber}`. Mapping is never based on a document-wide example number.

## Performance and accessibility

- Only the ten examples for the active type enter the DOM.
- Source figures use lazy decoding and an accessible native dialog for zoom.
- Solutions use native `<details>` disclosure.
- Keyboard left/right navigation and existing progress persistence are preserved.
- Mobile changes are responsive; no student-facing PDF viewer was reintroduced.

## Trust model

Extraction status and mathematical validation status remain separate. Generated records use `source-extracted-needs-review`; a passing parser never upgrades them to tutor-verified content.
