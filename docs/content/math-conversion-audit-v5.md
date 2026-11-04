# BienEdu V5 — Mathematical conversion audit

Audit date: 2026-11-04  
Machine-readable checkpoint: [`.audit/math-content-v5-checkpoint.json`](../../.audit/math-content-v5-checkpoint.json)

## Scope and method

The audit scans every currently registered Knowledge record, Example record, formula slot and example-step expression. It then separates four states instead of treating every mathematical-looking string as publishable LaTeX:

- **source verified** — the imported wording maps to a checksum-locked source location;
- **render validated** — the expression parses and renders through the shared KaTeX pipeline;
- **needs mathematical review** — source fidelity or rendering may be known, but a qualified mathematical review is still pending;
- **missing source** — no authoritative document is mapped, so content must not be invented.

## Inventory result

| Item | Count | Result |
|---|---:|---|
| Source documents | 5 | 5/5 present and checksum matched |
| Knowledge records | 181 | scanned |
| Example records | 1,313 | scanned |
| Practice units | 85 | preserved |
| Formula/expression slots | 1,668 | classified |
| Slots rendered as mathematics | 459 | 459/459 parse successfully |
| Explanatory text stored in formula-like slots | 1,209 | intentionally not forced into KaTeX |
| Rendered Knowledge/Example fields | 4,710 | 4,710/4,710 contain no math-error fallback |
| Referenced source figures | 188 | 188/188 files present |
| Source-verified examples | 39 | preserved |
| Native-source mathematical review queue | 18 | 9 CD22 Knowledge + 9 CD22 Examples |
| Topics without an authoritative mapped source | 22 | CD15–CD19 and CD23–CD39 |

No source-free topic was populated. No pending item was silently promoted to `verified`.

## CD22.7 confirmed defect and correction

Authoritative source: `file tài liệu latex/Ly_thuyet_To_hop_Xac_suat_Thong_ke_CD20_CD23.tex`, lines 739–755, SHA-256 `BD4F99C88A8852A8AB2FD0AF9F07C63491039F1AED0DC0FA1E04F98D0BA5FF99`.

Root cause:

1. The importer normalized conditional-probability notation correctly.
2. Its old classifier then rejected every expression containing Vietnamese characters, including characters safely enclosed by `\text{...}`.
3. CD22.7 was therefore emitted with `renderAsMath: false` and displayed as flat text.
4. The UI also interpreted source mapping as full review, showing an overly strong review badge.

Correction:

```latex
\mathrm{P}(\text{bệnh}\mid +)
=
\frac{\mathrm{P}(\text{bệnh})\mathrm{P}(+\mid \text{bệnh})}{\mathrm{P}(+)}
```

- The importer now validates the normalized expression with the same KaTeX validator used at runtime.
- Vietnamese text is accepted only inside explicit `\text{...}` commands; unsupported Unicode outside text mode still fails strict validation.
- Inline sensitivity, specificity and prevalence notation is emitted as delimited mathematics.
- Generic labels such as “Điểm 1” and “Điểm 2” are no longer invented when the source has no label.
- The learner badge is now “Đã đối chiếu nguồn”; mathematical review remains `needs-review`.

Classification after correction: **source fidelity verified, rendering validated, mathematical review pending**.

## CD22.5 inline-index correction

The expanded render pass found a second confirmed conversion defect in lines 711–715. Source notation `B\textsubscript{j}` first became Unicode `Bⱼ`; the prose detector then treated the subscript glyph as Vietnamese text and generated invalid `\text{B_{j}}`. The symbolic allowlist now preserves Unicode subscript and superscript characters as mathematics before KaTeX conversion, producing `B_{j}`. All three Bayes quick-reference expressions now render inline without fallback.

## Remaining review candidates

The audit records 180 `plain-fraction-candidate` occurrences. These are a review queue, not 180 confirmed defects: many are ordinary source answers such as ratios or slash notation where an automatic rewrite could alter meaning. They were deliberately not bulk-converted. There are no remaining confirmed plain conditional-probability defects, no KaTeX parse failures among expressions currently rendered as mathematics and no fallback errors across the 4,710 rendered fields checked.

## Protected behavior

- CD20 and CD21 runtime snapshots remain hash locked.
- Existing content IDs, progress keys, navigation and published practice are unchanged.
- Unresolved CD12–CD14 grading conflicts remain excluded from automated grading.
- The student interface remains native HTML/Markdown/KaTeX; no PDF viewer was reintroduced.

