# Math conversion audit — Learning Experience V4

Checkpoint: 2026-11-01  
Scope of this batch: CD08, Dạng 8.1 — **Lũy thừa với số mũ thực**.

## Source evidence

- Source PDF: `39 chuyên đề/Mũ-Logarit CD08-CD11.pdf`.
- Statement/method page checked visually: PDF page 9.
- Solution page checked visually: PDF page 60.
- Review renders: `.audit/pdf-source-v4/cd08-p9.png` and `.audit/pdf-source-v4/cd08-p60.png`.
- The page 9 warning is: `Không biến a^α + a^β thành a^(α+β).`

## Root cause and correction

The PDF text layer exposes two-dimensional superscripts as detached/flattened spans. The generic extraction path consequently produced `aα + aβ` and `aα⁺β`, losing exponent boundaries. This was a source-data conversion defect, not a CSS defect.

The durable correction lives in `scripts/import-foundation-documents.py` under `VERIFIED_SOURCE_OVERRIDES["8.1"]`. It uses raw Python strings and explicit LaTeX:

```text
Không biến \(a^{\alpha}+a^{\beta}\) thành \(a^{\alpha+\beta}\).
```

The same source override now contains the exact method, all ten statements from page 9 and all ten mapped solutions from page 60. Regenerating `assets/js/data/foundation-lessons.generated.js` therefore cannot reintroduce the flattened notation.

## Verified batch

- Dạng 8.1 method: 1/1 verified.
- Dạng 8.1 note: 1/1 verified.
- Dạng 8.1 statements: 10/10 verified.
- Dạng 8.1 solutions: 10/10 verified and mapped by original example number.
- New diagram review in this batch: 0; Dạng 8.1 contains no source figure.
- Regression coverage checks radicals, grouped exponents, negative/rational exponents and `\dfrac` output.

The complete foundation inventory is now 1,210 examples: 30 source-verified and 1,180 still `needs-review`. The 30 verified records are 1.1, 8.1 and 8.4 (ten examples each). The two foundation PDFs still contain 188 diagram-dependent examples (154 + 34); technical asset checks are not equivalent to mathematical review.

The nine known CD12–CD14 answer-key conflicts remain `needs-review` and remain excluded from auto-grading. No unresolved record was promoted by this batch.

## Automated checks

- 1,662 imported Knowledge/Example formula slots parse without KaTeX errors.
- 93 approved raw LaTeX expressions pass strict parsing.
- 1,438 generated/PDF-source practice fields render safely.
- Browser LaTeX audit: 64 Knowledge routes and 64 Example routes; zero desktop equation overflows and two intentional equation-level mobile scroll regions.
- Focused rendered-note test rejects flattened `aα`, `aβ` and malformed KaTeX output.

## Remaining audit queue

1. Review the remaining 1,180 foundation examples against statement and solution pages.
2. Prioritize the 188 figure-dependent records for visual problem-to-solution mapping.
3. Resolve the nine CD12–CD14 conflicts only with authoritative source evidence; keep auto-grading disabled meanwhile.
4. Continue using machine checkpoints rather than inferring verification from successful extraction or rendering.

