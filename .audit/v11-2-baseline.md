# BienEdu V11.2 baseline

Date: 2026-10-21

## Preserved V11.1 foundation

- One curriculum registry: 13 groups, 39 topics, 347 subtopics.
- Five runtime-ready Grade 12 topics: CD12, CD13, CD14, CD20 and CD21.
- Two verified bundled PDFs: 49 pages for CD12-CD14 and 18 pages for CD20-CD21.
- 52 text-first Knowledge pages and 54 displayed worked examples.
- Three deterministic, auto-graded generated questions for every mapped subtopic.
- Stable lesson IDs, local progress, final-exam generation and Grade 9-12 routing already existed and had to remain compatible.

## V11.1 gaps observed before this pass

- CD12-CD14 exposed only one worked example per subtopic even though the source has two.
- The ten source self-practice questions and their answer keys in each of the 26 calculus subtopics were not structured for runtime use.
- Source coverage was reported as partial even when all Knowledge text was already present.
- Runtime availability, source completeness and mathematical verification were not presented as three independent states.
- The content pipeline did not validate source-block cardinality, stable source IDs or answer-key review states.
- Source practice had no reader UI; only generated multiple-choice practice was visible.

## V11.2 target established from the PDFs

| Source | Physical pages | Accounted topics | Subtopics | Worked examples | Self-practice | Answer keys |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| CD12-CD14 calculus | 49 | CD12-CD14 | 26 | 52 | 260 | 260 |
| CD20-CD21 combinatorics/probability | 18 | CD20-CD21 | 25 | 28 displayed | 0 | 0 |

Page 49 of the calculus PDF is a formula summary. It duplicates formulas already represented in the per-subtopic Knowledge lessons and is therefore recorded as `excluded-with-reason`, not silently omitted.
