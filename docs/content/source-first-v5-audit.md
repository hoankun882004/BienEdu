# Source-first mathematical engine — initial read-only audit

Date: 2026-11-05. Recorded before building the new staging pipeline or applying corrections. The starting Git worktree was clean.

## Sources and existing evidence

There are nine physical source files representing five unique documents: four originals in `39 chuyên đề`, four byte-identical PDF publication mirrors in `assets/documents`, and one original `.tex` in `file tài liệu latex`. The PDFs contain 98, 78, 49 and 18 pages respectively (243 unique PDF pages). All original/mirror hashes match the existing registry.

| Unique source | Source coverage | Publication mapping |
|---|---|---|
| Hàm số–Đạo hàm PDF, SHA `2EBC6F3A…` | CD01–07 | CD01–07 |
| Mũ–Logarit PDF, SHA `27508DB2…` | CD08–11 | CD08–11 |
| C12–CD13–CD14 PDF, SHA `4E65F476…` | CD12–14 | CD12–14 |
| Tổ hợp–Xác suất PDF, SHA `66B1D933…` | CD20–21 despite its CD20–23 filename | CD20–21 |
| Tổ hợp–Xác suất `.tex`, SHA `BD4F99C8…` | CD20–23, 1,068 lines | CD22 controlled pilot |

The native file differs from the older PDF: it must not replace CD20/CD21 content simply because the title overlaps. CD23 has a source but no published mapping. CD15–19 and CD24–39 have no supplied source.

Previous evidence inspected: V4 source checkpoint; V11.2 source manifest/audit; V14 traceability and fidelity report; V5 math checkpoint; knowledge-slide manifest; content inventory; three immutable approved records; local historical Marker runs and visual-comparison evidence. Existing inventory: 181 Knowledge records, 1,313 Examples, 85 practice units, 188 figure references; three immutable approved lesson records (12.1, 20.1, 20.2). Legacy `verified` labels alone are not equivalent to immutable source approval. Nine calculus answer-key conflicts must remain excluded from grading.

## Recurring defects by stage

| Stage | Evidence and root cause | Required response |
|---|---|---|
| PDF extraction | Superscripts and fraction denominators become detached spans; integral glyph can appear as `Z`; four-column table order collapses | Preserve spans/baselines/bounding boxes and the source crop; require review rather than infer grouping |
| Normalization | Existing importer uses Unicode superscripts and regex repairs; slash grouping and nested powers can be guessed incorrectly | Preserve original expression separately; native math stays native; ambiguous PDF structure stays unresolved |
| Native macro conversion | `textsubscript` was flattened before classification; CD22.5 once became invalid `text{B_j}` | Use balanced macro parsing and retain explicit TeX scripts |
| Native classification | CD22.7 Vietnamese labels caused the whole formula to become ordinary text | Existing V5 correction verified at lines 739–755; retain `text`, `mid`, `frac` |
| Storage/provenance | Legacy formula slots often contain prose; not every item stores its exact original expression | Add an item-level staging schema with source hash/location/raw text/normalized LaTeX |
| Rendering | KaTeX syntax success does not establish correct grouping or source meaning | Independent syntax, structure, source-fidelity and consistency gates |
| Review/publication | Existing CLI can approve with flags; no small editor workflow for source comparisons | Local-only studio exports patches; controlled CLI applies to staging only; publication remains separate |

## Tool feasibility before benchmark

Native TeX and PyMuPDF are locally available. Existing Marker extraction runs can be replayed without downloading models. MinerU and Docling are not installed in either Python environment; no inference results are claimed for them. Docling formula enrichment requires its optional formula model. Mathpix processing has no explicit external/cost authorization and must not run. No heavy dependency installation is justified before the local benchmark.

## Implementation boundary

Build a separate, deterministic staging artifact and local review server using the existing KaTeX renderer. Retain source coordinates and raw records; never publish candidates by importer success. Keep existing reviewed runtime records, CD20/CD21, progress, navigation and grading restrictions untouched. Benchmark 40 source-backed expressions with crops/TeX locations and record unresolved types explicitly before considering a publication batch.
