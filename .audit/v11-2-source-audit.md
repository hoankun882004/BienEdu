# BienEdu V11.2 source audit

Date: 2026-10-21

## Audit method

Both registered PDFs were read page-by-page with layout-preserving text extraction and checked against the existing curriculum order, document mappings, Knowledge renderer and example renderer. Import status is tracked independently from mathematical verification.

## CD12-CD14 — 49-page calculus source

Source file: `C12-CD13-CD14.pdf` (published mirror: `assets/documents/bienedu-nguyen-ham-tich-phan-cd12-cd14.pdf`).

| Topic | Physical pages | Subtopics / identified Knowledge sections | Imported Knowledge slides | Identified / imported source examples | Source exercises | Verified answer keys | Keys needing review | Auto-graded source |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| CD12 | 3–18 | 9 / 9 | 10 | 18 / 18 | 90 | 89 | 1 | 0 |
| CD13 | 19–33 | 8 / 8 | 8 | 16 / 16 | 80 | 77 | 3 | 0 |
| CD14 | 34–48 | 9 / 9 | 9 | 18 / 18 | 90 | 85 | 5 | 0 |
| Total | 3–48 | 26 / 26 | 27 | 52 / 52 | 260 | 251 | 9 | 0 |

Every source subtopic contains theory/method material, two worked examples, ten self-practice questions and an answer-key block. All are now accounted for. The source practice bank is intentionally self-check only because BienEdu does not yet have a symbolic equivalence validator for open mathematical expressions.

The machine-readable inventory is generated at `.audit/v11-2-source-manifest.json` by `npm run content:validate`. It records 52 displayed Knowledge slides as 377 identifiable theory/formula/method/note blocks across both PDFs, 80 worked-example source blocks and 260 calculus self-practice blocks. Each imported block includes its source document/pages and runtime destination slide.

### Printed answers requiring human review

- `12.3-source-exercise-10`: the printed result conflicts with the direct `u′/u` antiderivative.
- `13.5-source-exercise-06`, `07`, `08`: the printed definite-integral results conflict with direct evaluation.
- `14.1-source-exercise-08`: the printed area conflicts with direct evaluation.
- `14.2-source-exercise-10`: the printed area conflicts with direct evaluation.
- `14.4-source-exercise-06`: “phần rỗng” is ambiguous; the source answer represents the inner hole, not the washer region.
- `14.4-source-exercise-07`, `10`: the printed volumes conflict with the stated washer integrals.

These answers remain visible as source answers, carry an audit note in the UI and are never auto-graded. They are not silently corrected.

## CD20-CD21 — 18-page combinatorics/probability source

Source file: `Lý_thuyết_Tổ_hợp_Xác_suất_Thống_kê_CD20_CD23 (2).pdf` (published mirror: `assets/documents/ly-thuyet-to-hop-xac-suat-thong-ke-cd20-cd23.pdf`).

| Topic | Physical pages | Identified / imported Knowledge sections | Imported Knowledge slides | Identified / imported worked examples | Source exercises | Unresolved blocks | Verification |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| CD20 | 4–14 | 17 / 17 | 17 | 20 / 20 | 0 | 0 | verified |
| CD21 | 15–18 | 8 / 8 | 8 | 8 / 8 | 0 | 0 | verified |

- The file was checked through physical page 18.
- It contains CD20.1-CD20.17 and CD21.1-CD21.8 only.
- It contains no CD22 or CD23 lesson pages despite the filename/cover wording.
- All 25 headings and their theory blocks are represented by Knowledge lessons.
- All 28 worked-example blocks currently exposed by the renderer remain mapped to source pages.
- The multiplication rule keeps the conditional general form and presents independence only as the simplified special case.
- No CD22/CD23 content was inferred or fabricated.

## State definitions

- Runtime `available`: the lesson has usable Knowledge, examples and generated practice.
- Source coverage `complete`: every in-scope source block is imported or explicitly excluded with a reason.
- Verification `needs-review`: source material is present, but at least one printed answer is mathematically conflicting or ambiguous.

Therefore CD12-CD14 may be runtime-available and source-complete while still carrying a verification review flag.
