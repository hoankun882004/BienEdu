# BienEdu V5 — Source verification register

Audit date: 2026-11-04

## Authoritative source inventory

| Source ID | Runtime source | Topics published from this source | SHA-256 status |
|---|---|---|---|
| `cd01-cd07-functions` | `assets/documents/bienedu-ham-so-dao-ham-cd01-cd07.pdf` | CD01–CD07 | matched |
| `cd08-cd11-exponential-logarithm` | `assets/documents/bienedu-mu-logarit-cd08-cd11.pdf` | CD08–CD11 | matched |
| `cd12-cd14-calculus` | `assets/documents/bienedu-nguyen-ham-tich-phan-cd12-cd14.pdf` | CD12–CD14 | matched |
| `cd20-cd21-theory` | `assets/documents/ly-thuyet-to-hop-xac-suat-thong-ke-cd20-cd23.pdf` | CD20–CD21 only | matched |
| `cd20-cd23-native-latex` | `file tài liệu latex/Ly_thuyet_To_hop_Xac_suat_Thong_ke_CD20_CD23.tex` | CD22 pilot only | matched |

The runtime PDF copies are the hash-locked publication inputs. The native LaTeX file is inspected directly. The current registry contains mapped content for 17 topics: CD01–CD14 and CD20–CD22.

## Verification gates

`verified` is no longer overloaded. Native imports carry independent gates:

| Gate | CD22 status | Meaning |
|---|---|---|
| Import | `completed` | deterministic parser completed |
| Rendering | `validated` | stored expressions parse in shared KaTeX |
| Source fidelity | `verified` | content maps to exact source lines and checksum |
| Mathematical review | `needs-review` | not yet signed off as a mathematical editorial review |
| Publication | `published` | visible to the learner with truthful status |

The learner-facing label for CD22 is therefore **Đã đối chiếu nguồn**, not **Đã kiểm duyệt**.

## CD22.7 traceability

- Topic block: lines 739–755.
- Example block: lines 749–751.
- Knowledge ID: `22.7-knowledge-1`.
- Example ID: `22.7-native-example-1`.
- Source section: `\topic{22.7}{Bài toán y tế - xét nghiệm}`.
- The source example contains no mapped worked solution; the UI continues to say so and does not synthesize one.

## CD22.5 traceability

- Topic block: lines 705–722.
- Inline Bayes labels checked: lines 711–715.
- `B\textsubscript{j}` is published as mathematical `B_{j}`, not prose `\text{B_{j}}`.
- Source wording and the mathematical-review gate remain unchanged.

## Publication boundaries

- CD20/CD21 remain protected exclusions from the native-LaTeX pilot.
- CD23 exists in the native file but remains staging-only because the controlled pilot is restricted to CD22.
- CD15–CD19 and CD23–CD39 have no authoritative mapped publication source and remain unavailable.
- Eighteen CD22 units remain in the mathematical-review queue: one Knowledge and one Example unit for each of 22.1–22.9.
- The 188 referenced figure files are present; they remain in the visual-review queue where their record requests source-image comparison.

The full per-record queue and topic coverage are stored in [`.audit/math-content-v5-checkpoint.json`](../../.audit/math-content-v5-checkpoint.json).

