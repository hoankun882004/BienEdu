# Learning Experience V4 validation

Date: 2026-11-01  
Result: **PASS**

## Executed verification

| Check | Result |
| --- | --- |
| `npm.cmd run verify` | Passed end-to-end |
| `npm.cmd test` | 108/108 passed |
| `node .audit/learning-experience-v3.mjs` | Passed at 1920, 1366, 768 and 390 px |
| `node .audit/learning-experience-v4.mjs` | Passed at 1920×1080, 1366×768, 768×1024 and 390×844 |
| Source/content validation | Passed; one expected warning for nine unresolved answer keys |
| KaTeX unit audit | 6/6 passed |
| Browser LaTeX audit | 64 Knowledge + 64 Example routes passed |
| V13 native learning | 51 lessons, 10 representative routes, 8 viewports passed |
| V15 workspace | 7 viewports passed |
| V16/V16.1, home scroll, polish | Passed |
| `node --check assets/js/curriculum.js` | Passed |
| `git diff --check` | Passed (line-ending notices only) |

## V4 scenarios verified in Playwright

- Correct CD08 8.1 exponent note renders as two KaTeX expressions with three exponent structures and no flattened `aα` output.
- Lightweight index has 10 stable links and no legacy card grid.
- Unvisited, previously viewed and current states are distinct and accessible.
- Opened examples 1, 2 and 5 persist after reload; UI reports 3/10 opened.
- Opening an example leaves completion at 0/10; opening its solution advances completion to exactly 1/10.
- Contextual **Cách làm** and verified **Lưu ý** persist within 8.1.
- Switching to 8.2 removes the unverified note and resets method-panel state for that type.
- Topic → 8.1 → Example 4 → Example 5 → Back/Forward restores the exact examples.
- A direct deep link's Back control safely returns to CD08 without a navigation loop.
- Mobile scroll position is restored within a 12 px tolerance.
- CD01/V3 example behavior, CD08 8.4 source note, CD12 reader and CD20 practice remain intact.
- Representative graph asset loads with non-zero natural dimensions.
- No runtime errors, KaTeX errors or page-level horizontal overflow were observed.

## Screenshots inspected

- `.audit/learning-v4-index-1366x768.png`
- `.audit/learning-v4-example-context-1366x768.png`
- `.audit/learning-v4-viewed-768x1024.png`
- `.audit/learning-v4-mobile-390x844.png`

The screenshots confirm compact density, visible current/viewed differentiation, intact source footer and responsive wrapping. The sticky bottom navigation does not create horizontal overflow.

## Known unresolved content work

- 1,180 foundation examples remain `needs-review`.
- 188 of those source records are diagram-dependent and need visual mathematical review.
- Nine CD12–CD14 answer-key conflicts remain `needs-review` and non-auto-graded.
- These are content-verification queues, not hidden by passing technical tests.

