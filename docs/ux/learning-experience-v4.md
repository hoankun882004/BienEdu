# BienEdu Learning Experience V4

Checkpoint: 2026-11-01

## Recovered state

V4 resumed from the existing dirty working tree. The V3 one-prompt/one-collapsed-solution/one-source-footer reader, exercise system, stable lesson IDs, keyboard arrow navigation, progress storage and responsive workspace were preserved. No second router, progress store or design system was introduced.

## Example navigation

- Replaced the heavy rectangular example-card grid with a compact numbered index.
- Three visible states: unvisited, previously opened (subtle BienEdu blue + check), and current (solid blue + `aria-current="page"`).
- The index uses stable source example IDs and persists across reload, Back/Forward, topic return and reopening a type.
- On mobile the index becomes a compact wrapping grid without page-level horizontal overflow.

## Viewed versus completed

The progress schema remains version 2 and is migrated losslessly:

- `openedExamples` records examples whose full example page has been opened and powers the UI “đã xem” state.
- Existing `viewedExamples` is retained as the compatibility field for completed worked solutions.
- Opening an example does not increase completion or scoring.
- Expanding **Hiện lời giải** completes that example once; closing/reopening cannot double-count it.
- Historical completed IDs are copied into `openedExamples`, so existing learners do not lose visible progress.

## Contextual learning controls

- **Cách làm** and source-verified **Lưu ý** remain directly above the active example.
- Native `<details>` controls preserve keyboard and screen-reader behavior.
- Open/closed state is held per problem-type code while navigating examples.
- Switching type loads the new method and does not leak prior panel state.
- Unverified/empty notes are not promoted into the contextual note control.
- Mathematical text is rendered through the shared Markdown/KaTeX renderer.

## History and scroll behavior

The existing URL router now writes structured History API state instead of `null`. Each entry stores one session ID, depth, window scroll position and internal lesson scroll position.

- Topic → type → example retains exact route order.
- Example 4 → Example 5 → Back returns to 4; Forward returns to 5.
- Popstate reuses the existing same-lesson transition instead of adding a second router.
- Direct deep links use a safe topic fallback that replaces the orphan entry and avoids a Back loop.
- Window and internal lesson scroll are restored after rendering with a double animation-frame pass.
- Existing Left/Right keyboard navigation is unchanged.

## Changed implementation files

- `assets/js/curriculum.js`
- `assets/js/domain/learning-progress.js`
- `assets/styles.css`
- `assets/js/data/example-content.js`
- `assets/js/data/knowledge-content.js`
- `assets/js/data/knowledge-slides.js`
- `assets/js/data/content-registry.js`
- `assets/js/data/foundation-lessons.generated.js`
- `scripts/import-foundation-documents.py`
- `scripts/content-pipeline.mjs`
- `documents.html`
- `package.json`
- `tests/learning-progress.test.js`
- `tests/example-content.test.js`
- `tests/knowledge-content.test.js`
- `tests/latex-rendering.test.js`
- `.audit/learning-experience-v3.mjs`
- `.audit/learning-experience-v4.mjs`

Generated content manifests/reports were refreshed by the existing pipeline. No unrelated page was redesigned and no PDF viewer was reintroduced.

