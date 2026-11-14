# Biển Edu — Mathematical Conversion Recovery, 2026-11-14

## Trạng thái: PARTIAL

Đã sửa parser thật, tái hiện lỗi trước sửa, tạo bản sửa PDF có bằng chứng glyph, kiểm tra trang học thật và chuẩn bị batch local có apply/rollback. **Chưa kích hoạt nội dung và chưa chứng nhận toàn bộ tài liệu đúng nguồn. Không commit, push hay deploy.**

Working tree ban đầu sạch. Các PDF/TEX gốc, release pointer đang hoạt động, Geometry constructions, tiến độ và chấm điểm được giữ nguyên.

## Phạm vi và số đếm

- Đối chiếu hash của 8 PDF độc lập / 394 trang và 2 TEX độc lập.
- Inventory: 25.866 vị trí node lưu trữ trong 10 dataset/projection được liệt kê rõ ở `.audit/conversion-recovery/summary.json`. Có bản lịch sử lặp lại; đây **không phải 25.866 công thức duy nhất**.
- 18.925 math nodes qua kiểm tra cú pháp; 6.941 unresolved nodes trong projection lịch sử/staging vẫn là `SOURCE_AMBIGUOUS`. Không tính những node này là đã xác minh.
- 7.525 stored nodes thuộc hai payload active; không có lỗi cú pháp trong các node được kiểm tra. Con số này gồm metadata chuyển đổi được giữ lại, không đồng nghĩa số công thức hiện trên màn hình.
- PDF Knowledge: 1.356 math nodes thực sự đi qua renderer trước batch, 1.292 sau batch. Chênh lệch 64 do nối lại các ranh giới `d` bị tách sai, **không xóa ký hiệu nguồn**. Báo cáo cũ 1.358 còn đếm hai node continuation đã được hấp thụ vào bảng; traversal toàn bộ JSON còn gặp metadata bảng không được render.
- Chỉ xác nhận độc lập phạm vi sửa: **39 khối PDF / 64 glyph `d`**. Mọi glyph trong các đoạn ứng viên được so với vị trí, font, kích thước và ký tự của PDF gốc; payload trước sửa phải khớp đúng block/glyph hash.
- TEX: 7 record có sửa ý nghĩa cấu trúc; 4 unresolved lỗi adapter được giải quyết; khôi phục 5 mục in đậm bị bỏ qua (4 math, 1 quy tắc bằng lời). 62 công thức native trước đây hợp lệ được giữ nguyên; tổng math native của tài liệu CD20–CD23 từ 62 lên 68, unresolved từ 4 về 0.
- **Không có blanket SOURCE_MATCHED cho toàn bộ 18.925 công thức.** Syntax, source identity, source transcription và symbolic proof là các cổng riêng.

## Lỗi gốc và sửa đổi

| Nhóm | Nguyên nhân | Sửa / bằng chứng |
| --- | --- | --- |
| MATH_PROSE_BOUNDARY | `d` trong `dx/dt` dùng font Tinos nên bị phân loại thành văn bản; `x` trở thành đầu một math node khác | `layout-v62.py`: chỉ nhận glyph `d` đơn lẻ sát biến math, cùng baseline, có tích phân bên trái và không có prose chen giữa. Xuất `\mathrm{d}`; không đổi biểu thức bằng regex. 39 block / 64 glyph. |
| EXPONENT_SUBSCRIPT / MATH_PROSE_BOUNDARY | Dấu `...` làm bộ nhận dạng biến cố coi `A_1∩...∩A_n` là nhãn văn bản | `parser.mjs`, nguồn TEX dòng 620: giữ `A_{n-1}`, phép giao và điều kiện trong math mode. |
| LATEX_RENDERER, từ adapter | `\ensuremath{\varnothing}` bị chuyển nguyên vào KaTeX | Bóc wrapper cân bằng ở parser, không tạo renderer thứ hai. Nguồn TEX dòng 565. |
| SOURCE_STRUCTURE_MAPPING | Chỉ lấy `textbf` đầu tiên của formulabox | `canonical-adapters.mjs`: xử lý tất cả bold calls, giữ thứ tự và phần văn bản giữa chúng. |
| MATH_PROSE_BOUNDARY | Quy tắc tiếng Việt hoàn toàn bằng lời bị ép vào math mode | Giữ nguyên lời nguồn dưới dạng text; dòng 353, 673. Không diễn đạt lại. |
| LIMIT/DELIMITER, regression kỹ thuật | Dấu đóng math trong comment có thể kết thúc công thức sớm | `canonical-math.js`: bỏ qua delimiter nằm trong comment của math; giữ escaped percent/dollar. Fixture tái hiện, không coi fixture là bài học nguồn. |
| TABLE_STRUCTURE, quan sát DOM | Bảng không có định danh source block trên DOM | Bổ sung `data-source-block`; không đổi ô, thứ tự hàng/cột hay nội dung. |

Trước sửa: 5/6 regression fixtures ban đầu thất bại. Không giảm assertion để làm xanh. Sau sửa: 15 parser/release tests qua, có thêm kiểm tra chống vacuous test filters và bảo toàn 62 công thức native.

## Mẫu fidelity thực tế

Những mục “giữ nguyên” dưới đây là mẫu hồi quy từ dữ liệu thật, **không phải sửa mới hoặc chứng nhận lại toàn bộ trang nguồn**.

- Phân số, căn, số mũ: `cd12-cd14-calculus:12.1:knowledge:block:4`, PDF C12-CD13-CD14, trang 3: `\frac{x^{n+1}}{n+1}+C`, `\frac{1}{\sqrt{1-x^2}}` giữ nguyên.
- Chỉ số tiếng Việt: `cd12-cd14-calculus:14.8:knowledge:block:4`, trang 45: `q_{\text{vào}}(t)-q_{\text{ra}}(t)` giữ nguyên.
- Giới hạn: `cd01-cd07-functions:CD01:knowledge:block:1`, trang 4: `\lim _{h\to 0}\frac{f(x_0+h)-f(x_0)}{h}` giữ nguyên.
- Tích phân và prose: `cd12-cd14-calculus:12.1:knowledge:block:6`, trang 3: trước là nhiều math nodes xen text `d`; sau là một biểu thức chứa các `\mathrm{d}x`. Mọi token ngoài cách bọc glyph d giống hệt trước sửa; điều kiện “a, b là hằng số” được giữ nguyên.
- Vector: `cd28-cd33-vector-2026:28.1:knowledge:block:1`, trang 2: `\overrightarrow{AB}+\overrightarrow{BC}=\overrightarrow{AC}` giữ nguyên. Không đổi dot product thành cross product.
- Bảng: nguồn lượng giác 15.1, bảng 5×6, giá trị KXĐ và từng ô được kiểm tra qua DOM; nguồn nguyên hàm 12.1 giữ bảng 9×4 và điều kiện `n\ne-1`.
- TEX dòng 565: trước `A \cap B = \ensuremath{\varnothing}` không parse; sau `A \cap B = \varnothing`.
- TEX dòng 620: bỏ bọc nhầm `\text{A_{1}...}`; không đổi chỉ số hay giao biến cố.

## Browser / giao diện học viên

`npm.cmd run test:conversion:browser`: **2/2, exit 0**.

- 264 route states: 72 current + 192 candidate; gồm 216 knowledge states, phương pháp, ví dụ/lời giải, bài tập và reload progress. Thêm 8 lượt kiểm tra phần tài liệu chung.
- Viewports: 320×568, 360×800, 390×844, 430×932, 768×1024, 1024×768, 1366×768, 844×390.
- 312 cặp block×viewport riêng biệt so annotation MathML với canonical sau sửa; không thiếu/nhân đôi wrapper.
- Không lỗi JavaScript, response ≥400 hoặc KaTeX trên các route đã kiểm tra; không global horizontal overflow. Công thức dài dùng scroll cục bộ, không sửa hoặc thu nhỏ tất cả công thức để vừa màn hình.
- Bài tập trả feedback và giữ đúng progress sau reload ở cả current/candidate. Geometry mount trên cả hai bộ parent.
- Đã xem ảnh desktop/mobile và ảnh cận mục tuyến tính. Phát hiện và sửa overflow tên file dài trong trang preview kỹ thuật; kiểm tra lại preview mobile thành công.
- Emulation không phải chứng nhận thiết bị vật lý. Không chứng nhận mọi route chưa được chạy.

## Kết quả kiểm thử và lịch sử

| Lệnh / phạm vi | Kết quả | Exit |
| --- | --- | --- |
| `npm.cmd run check` | 71 JS, 7 HTML entries | 0 |
| `npm.cmd run test:conversion` | 15 pass, 0 fail | 0 |
| Canonical current, filtered chức năng thuần trong `conversion-qa.mjs` | 21 pass | 0 |
| 5 file LaTeX / pilot / progress / workspace / source-practice trong QA runner | 41 pass | 0 |
| Geometry source/property checks trong QA runner | 51 pass; không tuyên bố ba pre-activation guards đã qua | 0 |
| SymPy 1.14.0, `conversion-symbolic.py` | 4 supported identities pass, không phải proof toàn bộ nguồn | 0 |
| `npm.cmd run test:hosting` | 8 pass, gồm trang học thật trên host giả lập deny private tooling | 0 |
| `npm.cmd run check:hosting` | 5 trang, 71 modules, 3 active payload hashes | 0 |
| `node --test tests/conversion-preview.test.mjs` | 2 pass: read-only HTTP/Host guards + learner math/geometry | 0 |
| `node --test tests/conversion-real-release.test.mjs` | 1 pass, manifest thật trong fixture: interrupt/resume, idempotence, rollback exact | 0 |
| `git diff --check` | không whitespace error | 0 |
| Root wrappers `verify`, `test:source-first`, `test:canonical`, `test:mobile` | dừng trước suite: `Unknown target bytes: package.json` | 1 mỗi lệnh |
| Historical baseline, lượt đầu trong fixture | 247 pass / 6 fail, tất cả chặn ở hash source-check cũ | 1 |
| Historical baseline, khôi phục đúng Git blob source-check trong fixture | **253 pass / 0 fail** | 0 |

Lệnh hồi quy có full logs và exit code: `node scripts/source-first/conversion-qa.mjs`. Regex filters được truyền trực tiếp bằng argv cho Node và assertion bắt buộc đúng test count; một lượt chẩn đoán quoting ban đầu đã được giữ riêng, không tính kết quả vacuous đó là coverage.

Root `npm test` không chạy trực tiếp vì các tests lịch sử có thể ghi shared audit projections. Trong fixture: `node scripts/source-first/build.mjs && node scripts/source-first/verify.mjs && npm.cmd test`, giữ nguyên assertions.

Sáu lỗi lịch sử được chứng minh do `scripts/check-source.mjs`: hiện tại hash `AB51C51E...`, manifest V6.1 cần `19E5A6E0...`. Git blob ở commit `b506954720aea8901b0e770fabe5d778eadf44c1` khớp chính xác hash cũ. Chỉ bản sao tạm dùng blob này; không sửa manifest hay source-check thật. Chạy lại bằng `node scripts/source-first/conversion-historical.mjs --restore-source-check`.

Lượt chẩn đoán không lọc của Geometry có 51 pass / 3 fail: các guards còn yêu cầu Geometry chưa active, router chưa có continuation, và hash `curriculum.js` trước activation. Chúng không được xóa/sửa; log còn ở `logs/geometry-unfiltered-diagnostic.log`. Chỉ 51 source/property checks và compatibility browser được tính là đã qua trên runtime hiện tại.

## Bảo toàn V5.5 / V5.6 / Geometry

35/35 trường sửa cũ vẫn khớp chính xác: V5.5 có 9 và V5.6 có 26. V5.6 **đã ở trạng thái after trước task này**, không phải prepared như một số báo cáo cũ; xác nhận `locally-applied-unreviewed`. Task không apply/rollback nó. Authorization cũ stale: cần preview mới trước thao tác tương lai.

Candidate Geometry chỉ đổi `knowledgeParent` để đi cùng bộ Knowledge mới. Toàn bộ 30 candidates/spec/source identities giữ nguyên từng byte khi serialize; không sửa engine, hình, camera hoặc source geometry. Không chạy lại toàn bộ 240 geometry camera states trong task này.

## Preview và batch local

Chạy preview chỉ đọc, không sửa release pointer:

```powershell
cd D:\BienEdu
node scripts/source-first/conversion-preview.mjs
```

- Consolidated: http://127.0.0.1:8767/
- Trang học candidate thật: http://127.0.0.1:8767/documents.html?grade=12&topic=CD12&type=12.1&section=knowledge&item=1
- Nguồn cũ là một edition độc lập trong trang Knowledge; mở “Nguyên hàm cơ bản · C12-CD13-CD14.pdf” để xem sửa vi phân. Không thay PDF bằng TEX.

Plan: `4EAF804CD362B12CC383E3D80BCDA1616EED3B5317235FC4F5449AEFABB3B356`.

Backup/manifest: `.content-work/conversion-recovery/4EAF804CD362B12CC383E3D80BCDA1616EED3B5317235FC4F5449AEFABB3B356/`.

**PREPARED_NOT_APPLIED**. Chỉ sau khi người dùng chọn áp dụng:

```powershell
node scripts/source-first/conversion-release.mjs apply --authorize 4EAF804CD362B12CC383E3D80BCDA1616EED3B5317235FC4F5449AEFABB3B356 --execute
```

Rollback cùng plan:

```powershell
node scripts/source-first/conversion-release.mjs rollback --authorize 4EAF804CD362B12CC383E3D80BCDA1616EED3B5317235FC4F5449AEFABB3B356 --execute
```

Hai target duy nhất là PDF Knowledge release pointer và Geometry activation pointer. Trước/sau, source hashes, parent/candidate payloads, converter/runtime dependency hashes và browser receipt đều được khóa. Có immutable backups, CAS, operation lock, journal, stale-plan rejection, explicit dead-lock recovery, resume/idempotence và rollback đảo thứ tự. Không xóa payload/asset cũ.

Nếu runtime/source/dependency đổi, lệnh từ chối: tạo preview và kiểm thử mới; không sửa hash cũ để ép chạy. TEX fixes chỉ nằm ở parser và staging/preview, **không nằm trong batch activate PDF này**.

## Files sửa / thêm

Existing:

- `.gitignore`
- `package.json`
- `assets/js/components/canonical-math.js`
- `assets/js/components/pdf-knowledge-renderer.js`
- `scripts/latex-pilot/parser.mjs`
- `scripts/source-first/canonical-adapters.mjs`
- `scripts/source-first/layout-v62.py`

New:

- `scripts/source-first/conversion-recovery.mjs`
- `scripts/source-first/conversion-recovery.py`
- `scripts/source-first/conversion-release.mjs`
- `scripts/source-first/conversion-preview.mjs`
- `scripts/source-first/conversion-qa.mjs`
- `scripts/source-first/conversion-historical.mjs`
- `scripts/source-first/conversion-symbolic.py`
- `tests/conversion-recovery.test.mjs`
- `tests/conversion-release.test.mjs`
- `tests/conversion-real-release.test.mjs`
- `tests/conversion-recovery-browser.test.mjs`
- `tests/conversion-preview.test.mjs`
- `assets/content/pdf-knowledge/B07C393393BE093FA11B9DA118C5F291FB7DD65C259B6061DBE393E025CCAA62.json`
- `assets/content/geometry/1C355ACC7499307093512953182C9C5DAFEB9C5EDEB413477CBF88C39BE726B2.json`
- Báo cáo này.

Audit, logs, evidence, screenshots và fixture receipts ở `.audit/conversion-recovery/`, được Git ignore; không phải database kiểm duyệt mới. Không sửa audit cũ để cấp quyền cho batch mới.

## Còn lại / không được tuyên bố COMPLETE

1. 6.941 unresolved entries trong các projection lịch sử/staging chưa được tái dựng; số này có lặp và không tương đương 6.941 lỗi trên website. Exact source IDs/locations/reasons ở inventory.
2. Chưa đối chiếu độc lập toàn bộ phân số/căn/chỉ số/điều kiện/statement-solution pairs của 18.925 math nodes; không dùng KaTeX pass để gọi là đúng nguồn.
3. Native TEX fixes chưa được nhập vào learner data của CD20/CD21/CD23; cần continuation đúng mapping và phạm vi riêng, không dùng TEX sửa chéo PDF.
4. Legacy plain strings, document-level TEX layout/table environments và graph-label strings ngoài canonical nodes chưa được bao phủ đầy đủ bởi inventory này.
5. Source ambiguities, nine previously recorded calculus answer conflicts và unsupported layout scopes vẫn bị loại khỏi batch; không tự sáng tác biểu thức mất khi extract.
6. Các wrapper lịch sử tại root vẫn giữ guard và sẽ không tự xanh trên baseline mới. Đây không phải bằng chứng đã chạy full `verify` với mọi browser suite cũ.

Đây là một đợt sửa có bằng chứng và đường apply an toàn, không phải chứng nhận hoàn tất kiểm duyệt toán học toàn bộ dự án.
