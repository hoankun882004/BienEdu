# Migration test report

Generated: 2026-10-28

## Data assertions

- Final source hashes match the registered immutable documents.
- 121/121 CD01–CD11 problem types are registered.
- 1,210/1,210 source prompts are imported.
- 1,210/1,210 source solution blocks are associated by type and original number.
- 188 source-dependent figure assets are present with provenance.
- Global curriculum registry contains 39 topics and 361 types.

## Automated results

| Command | Result |
| --- | --- |
| `npm run check` | Passed: 39 JavaScript files and 5 HTML entries |
| `npm run content:validate` | Passed: content registry and generated audit artifacts |
| `npm test` | Passed: 102/102 tests |
| `npm run test:latex` | Passed: 6/6 exhaustive data tests; 64 Knowledge + 64 Example browser routes |
| `npm run test:v13` | Passed: 51 lessons, 10 representative routes, 8 viewports |
| `npm run test:v15` | Passed: Learning Workspace across 7 required viewports |
| `node .audit/v2-final-pdf-learning.mjs` | Passed: CD01, CD07, CD08, CD11 and CD12 across 4 viewports |

The LaTeX data audit parsed 1,662 stored formula slots. Browser inspection found
no KaTeX error, no desktop equation overflow and no page-level horizontal
overflow. One genuinely long mobile equation uses an equation-level scroll
region as intended.

No commit, push or deployment was performed.

## Manual review limitations

Passing automation does not upgrade imported content from `NEEDS_REVIEW` to `VALIDATED`. Visual comparison of all 188 figures and mathematical review of all 1,210 solutions remain an explicit content-owner queue.
