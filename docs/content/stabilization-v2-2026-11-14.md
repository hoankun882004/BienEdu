# Biển Edu — Final Quality Stabilization V2 — 2026-11-14

## Trạng thái: PARTIAL

Tiếp tục trên working tree hiện có, không reset/rebuild. Bản sửa toán học nằm trong candidate; active data không được tự thay đổi. Không commit, push hoặc deploy. Chưa chứng nhận toàn bộ kho toán học đúng nguồn.

## 1. Sửa đổi toán học đã có bằng chứng

Nguồn độc lập: `39 chuyên đề/Mũ-Logarit CD08-CD11.pdf`, SHA-256 `27508DB2AA3E2C691E723D70BD2A05BCD1C0F892D42D4CA13F96E855FCA7A6E7`.

Prefix định danh: `cd08-cd11-exponential-logarithm:CD08-CD11:knowledge:block:`.

| Suffix | Trang PDF | Lỗi active | Cấu trúc candidate |
| --- | --- | --- | --- |
| 5 | 5 | Căn bậc n bị đọc thành căn vuông rồi nâng lũy thừa n | `a^{m/n}=\sqrt[n]{a^{m}}` |
| 11 | 5 | Hai căn của `a^n` bị đưa n ra ngoài căn | `\sqrt[n]{a^n}=a` / `|a|`; giữ điều kiện n lẻ/chẵn |
| 35 | 7 | Ký hiệu căn trong định nghĩa bậc n bị nhận sai chỉ số | `\sqrt[n]{a}`; giữ nguyên phần giải thích miền |
| 37 | 7 | Chỉ số các căn trong tích, thương, và căn chứa phân số bị gắn sai | `\sqrt[n]{a}\sqrt[n]{b}=\sqrt[n]{ab}`, `\frac{\sqrt[n]{a}}{\sqrt[n]{b}}=\sqrt[n]{\frac{a}{b}}` |

Đếm đúng: **4 khối, 5 canonical expressions bị sai, 10 chỉ số căn**. Không gọi đây là 10 khối hoặc 10 lỗi nguồn độc lập. Các trang PDF đầy đủ đã được xem trực tiếp; ảnh chỉ phục vụ đối chiếu nguồn, không được đưa vào learner interface.

Nguyên nhân: glyph chỉ số căn nhỏ nằm trong footprint trái của dấu căn nhưng vượt cửa sổ baseline cũ; riêng căn CMEX cao có baseline khác. Chỉ số còn bị coi là số mũ của ký tự trước đó. `layout-v62.py` sửa ownership theo font/size, tọa độ và overbar gốc; giữ competing-owner rejection ngoài footprint. Không dùng broad regex hay suy đoán từ hình dạng đường cong.

Oracle độc lập nằm tại `tests/fixtures/fidelity-v2.mjs`, không được tạo bằng cách gọi converter. `stabilization-v2.test.mjs` kiểm tra nguyên bản glyph, radicand/phân số, đúng chỉ số, prose không đổi và từ chối replay trên nội dung lạ. MathML browser kiểm tra số `mroot` tương ứng **1, 2, 1, 6**, không chỉ nhìn screenshot hoặc tin rằng KaTeX parse được là đúng.

**39 khối / 64 glyph vi phân `d` cũ giữ nguyên**: test vẫn yêu cầu đúng 39 khối riêng và bảo toàn chuỗi nguồn sau khi bỏ markup upright `d`. Tổng batch là 43 khối, không có sửa TEX hoặc CD20/CD21/CD23 trong batch này.

## 2. Phạm vi source fidelity

- 8 PDF độc lập / 394 trang, 2 TEX độc lập; hash nguồn được kiểm tra lại. Không thay PDF bằng TEX.
- 93 biểu thức Knowledge có oracle độc lập: active khớp 88, candidate khớp 93. Chênh lệch là 5 biểu thức trong 4 khối trên.
- 30 ô bảng lượng giác đối chiếu đầy đủ theo hàng/cột; gồm cả giá trị số và `KXĐ`.
- Một cặp đề–lời giải dãy số: `17.1-source-example-1`, đề trang 2, lời giải trang 13; 5 biểu thức được kiểm tra, không tự viết đáp án mới.
- 6.839 vị trí canonical render-eligible được lập inventory theo source/hash/record/path, không phải 6.839 đẳng thức khác nhau hoặc cùng hiện trên một màn hình. Có edition/method đang đóng và fallback; chưa kiểm kê DOM toàn bộ mọi route của kho ví dụ.
- Trong projection này: 112 vị trí `SOURCE_MATCHED`, 5 `CONFIRMED_CONVERSION_ERROR`, 6.722 `NOT_YET_CHECKED`. Không đánh dấu các vị trí chưa kiểm tra thành đúng chỉ vì syntax hợp lệ.
- 109 reference metadata/fallback/answer-copy được loại khỏi cách đếm render-eligible; số stored occurrences lịch sử không được cộng vào độ phủ mới.
- 6.941 unresolved historical/staging candidates vẫn giữ nguyên, không diễn giải thành 6.941 lỗi hiện trên website.

Nguồn và vị trí chính xác nằm trong `.audit/stabilization-v2/fidelity.json`, `active-nodes.json` và inventory hiện hữu `.audit/conversion-recovery/inventory.json`. Đây là các audit projections, không tạo review database thứ hai. Không gán human editorial approval.

SymPy kiểm tra các identity được hỗ trợ trên miền đã nêu, không thay thế đối chiếu nguồn. Điều kiện `a,b,x>0`, chỉ số căn nguyên dương và mẫu khác 0 được nêu rõ; không mở rộng kết luận sang miền chưa chứng minh.

## 3. UI và Geometry được giữ ổn định

Không đổi fonts, branding, progress keys, scoring, stable IDs hoặc native geometry specs. Knowledge tiếp tục dùng document-owned vertical scrolling, không quay lại fixed-height slide. Navigation ở flow cuối tài liệu, không đè đoạn cuối.

Sửa đã có: display math trong đoạn prose hỗn hợp cũng có một scroll owner nhận focus; inner wrapper không giữ overflow riêng. ArrowRight trong vùng toán cuộn công thức, không chuyển bài. Chỉ đổi trình bày, không tách biểu thức theo dấu phẩy hoặc thay LaTeX để vừa khung.

Các nhóm browser được kiểm tra độc lập:

- Knowledge: 11 routes × 12 viewports = 132 states; CD01 100% còn có regression riêng 5 desktop + 390px mobile.
- Current/candidate conversion: 264 route/viewport states; 43 corrected blocks × 8 sizes = 344 MathML comparisons.
- Geometry: 30 hình (10 2D, 20 3D) × 8 sizes = 240 states; 61 JavaScript property checks, source identity, label/point bounds, azimuth controls, zoom/reset, dispose/remount không tạo duplicate boards.
- Hosting/CLS: public-only artifact, learner roadmap/Knowledge/example/practice/native graph; focus math và cold/warm diagnostics.

Không cộng các lượt chạy lặp thành số unique lessons. Không tuyên bố physical-device hoặc true browser-zoom certification. Reflow 125/150/200% dùng viewport tương đương và được mô tả đúng phạm vi.

## 4. QA active, candidate và historical tách biệt

```powershell
npm.cmd run qa:current
npm.cmd run qa:candidate
npm.cmd run qa:historical
```

- `qa:current`: kiểm tra actual active release; phải trả nonzero khi 4 khối toán học trên chưa được áp dụng.
- `qa:candidate`: chạy các gate cho bản sửa read-only, ghi receipt riêng; không được che trạng thái active.
- `qa:historical`: baseline cũ trong disposable fixture, giữ nguyên assertions/manifests; không thay thế kiểm tra runtime hiện tại.

Mỗi mode giữ log riêng ở `.audit/stabilization-v2/runs/active/` hoặc `runs/candidate/`. Input fingerprint bao phủ assets, scripts, tests/fixtures, dependency files và original sources; sửa code/source/test trong lúc QA làm gate từ chối. Không dùng receipt cũ chỉ vì runtime entry files chưa đổi.

`stageKnownCorrection` chỉ chấp nhận exact-before hoặc exact-after đã biết; trường hợp after là idempotent, mọi byte lạ bị từ chối. QA sau một lần apply được phép không bị ép replay lại batch lịch sử.

## 5. CLS và hosting

Giữ quan sát lịch sử **0,1595084587 tại CD32 / 1024px**. Các lần đo mới dùng PerformanceObserver và ghi shifted elements/rectangles, font status/resource timing, DOM insertion time, KaTeX counts, Geometry readiness/dimensions. Cold/warm, user input và programmatic expansion được phân biệt; không bịa nguyên nhân cho spike chưa tái hiện.

Artifact public-only được xây riêng từ các HTML entry và assets, không fallback sang source tree khi module thiếu. Kiểm tra import-map/dynamic imports, case-sensitive paths, ba content-addressed payloads, CSS/fonts, MIME và requests trên route thật. Original PDF/TEX và audit tools không phải dependency của learner pages. Không có production deployment hoặc field Core Web Vitals certification.

## 6. Hoàn tác và an toàn release

Content-pointer rollback chỉ phục hồi `pdf-knowledge-release.js` và `geometry-activation.js`; không được nói rằng nó hoàn tác CSS/JS.

Code-patch rollback dùng snapshot **dirty workspace ở đầu V2**, không phải Git HEAD. Chỉ các file có delta trong manifest được quản lý, có before/after bytes và authorization riêng. Nếu có edit người dùng chồng lên thì từ chối trước khi ghi. Recovery utility và báo cáo được giữ để còn đọc lệnh/redo; candidate payloads và audit evidence không bị xóa.

Sửa an toàn bổ sung khi hoàn tất: proof receipts mutable được sao thành content-addressed immutable evidence trong plan mới. Rerun QA không tự làm rollback stale vì report timestamp/nội dung mới; code/source/payload hashes vẫn được kiểm tra nghiêm ngặt. Không sửa manifest cũ `EBBC…`, không vượt lock và không tự activate dữ liệu.

## 7. Chốt execution/release

Đã chạy xong tuần tự, không dùng concurrent QA để ghi chung fixtures:

| Lệnh / phạm vi | Exit code | Kết quả thực tế |
| --- | --- | --- |
| `npm.cmd run qa:current` | 1 | 11/11 technical gates exit 0; active vẫn có 4 khối căn thức sai, nên overall FAIL đúng thiết kế |
| `npm.cmd run qa:candidate` | 0 | 11/11 gates PASS; read-only candidate, không che lỗi active |
| `npm.cmd run qa:historical` | 0 | 253 pass / 0 fail, baseline cũ trong disposable fixture; không phải chứng nhận runtime hiện tại |
| `node --test tests/conversion-real-release.test.mjs tests/conversion-preview.test.mjs` | 0 | 3 pass / 0 fail: preview thật, interrupted apply/resume, idempotence, exact rollback |
| Post-apply fidelity trong disposable fixture | 0 | 93/93 Knowledge expressions khớp nguồn; 0 confirmed errors trong tập fixture này; rollback exact |
| Code undo/redo trong disposable fixture | 0 | 21 files, before/after exact; từ chối overlapping edit trước khi ghi; giữ file người dùng không liên quan |
| `git diff --check` | 0 | Không có whitespace errors |

Log đầy đủ: `.audit/stabilization-v2/resume-active.log`, `resume-candidate.log`, `resume-historical.log`, `resume-exits.json`, `final-release-tests.log`; từng gate ở `runs/active/` và `runs/candidate/`. Fixture receipts: `.audit/conversion-recovery/release-fixture.json`, `.audit/stabilization-v2/post-apply-fixture.json`, `code-fixture.json`.

Mỗi lượt current/candidate có **155 Node tests pass / 0 fail**, đếm theo các nhóm độc lập: parser/release 15, canonical 21, learner regression 41, geometry properties 51, hosting 8, V2 regressions 6, Knowledge 7, conversion browser 2, Geometry browser 1, hosting/CLS browser 3. Ba release/preview tests chạy sau đó cũng PASS. Không cộng hai lượt QA lặp lại thành số unique tests. Các state/comparison browser không phải Node test cases.

Phạm vi lọc được công khai: focused canonical chỉ chạy các pure-renderer checks; ba pre-activation guards của geometry không được dùng làm current-runtime checks. Assertions không bị xóa hay nới lỏng. Các baseline/activation assumptions cũ được kiểm tra riêng bằng `qa:historical`, với original dependency blob khớp manifest cũ trong bản sao tạm, không sửa manifest để hợp thức hóa runtime mới. Vì vậy không khẳng định mọi wrapper lịch sử chạy trực tiếp trên active workspace đều phải xanh.

SymPy 1.14.0: **4 + 17 + 9 = 30 checks PASS / 0 fail**, đúng các điều kiện ghi trong logs. Geometry có 61 JavaScript specification/property checks, không gọi đó là 61 SymPy proofs.

Browser totals cuối cùng: 132 Knowledge matrix states, 264 conversion route/viewport states, 344 corrected-block MathML comparisons, 240 Geometry states, 10 public-artifact route/viewport states, 12 controlled CLS runs. Các checks riêng gồm CD01 100% ở 6 sizes, navigation/progress/reload/practice, reflow, focus math và isolated local preview. Đã xem ảnh actual render `indexed-radical-320.png`, `mixed-focus-320.png` và `CD01-1366x768-end.png`; căn bậc n/phân số hiện đúng, trang không tràn ngang toàn cục, đoạn cuối không bị footer che. Tại 320px, bảng/công thức thực sự rộng có overflow cục bộ, không thu nhỏ chữ đến khó đọc.

CLS: **12 runs, max 0.009062237209743923**, gồm cold/warm tại 320px và 1024px. Historical spike **0.15950845868792385** vẫn lưu, chưa có nguyên nhân được tái lập. Đây là đo lab local, không phải field certification. Xem `.audit/stabilization-v2/cls.json` để có shifted elements, font timing, mutation timing, KaTeX count và Geometry readiness/dimensions.

Hosting artifact: **438 files, 71 runtime ES modules, 3 active payloads**, 5 HTML entries, import maps, dynamic imports, case-sensitive paths, CSS và vendored KaTeX fonts PASS. Artifact hash `3d16c97106aa7cb241a7357a7525c34686282bd4861f48747bbae2b943fe496f`; receipt `.audit/stabilization-v2/artifact.json`. Public-only server không fallback source tree; cả 10 route states PASS, không JS/KaTeX/request errors hoặc global overflow. Be Vietnam Pro vẫn dùng Google Fonts theo kiến trúc sẵn có; không tuyên bố artifact hoàn toàn offline/self-contained. Chưa deploy lên Vercel trong lượt này.

## 8. Fresh release và local preview

**Data authorization mới:** `B1DE7F5D99CEFE97C6275D961054A06ADEFE3B239E24E923B39137AF9812E8A6`.

Trạng thái thực: **PREPARED_NOT_APPLIED**. Manifest/backup ở:

`.content-work/conversion-recovery/B1DE7F5D99CEFE97C6275D961054A06ADEFE3B239E24E923B39137AF9812E8A6/`

Giữ nguyên active pointers và old immutable plans; không tái dùng authorization `EBBC…`. Candidate gồm Knowledge `5AA87DA7188D55EAD6C90156D25495A6DA594E8F87C7CF5823878FF213530C41` và Geometry continuation `9ACE3E57D167A43C4C06189594FF97C50FF0ABED70F362C933EA54386E11833B`. Cả 30 Geometry specs không đổi; chỉ parent Knowledge association thay đổi cùng hai pointers. Active Knowledge vẫn là `803050D0…`, active Geometry `F77647AA…`, learning overlay `976076AF…`.

Candidate QA fingerprint **654 input files** đã được đối chiếu lại sau tests; runtime/source/payload bytes không đổi. Fresh manifest lưu proof receipts dạng immutable content-addressed snapshots tại `.content-work/conversion-recovery/evidence/`; việc chạy lại QA ghi report mới không làm mất rollback evidence. Source/code/payload dependency changes vẫn làm apply/rollback từ chối stale plan. Không sửa hash cũ để vượt kiểm tra.

Chạy preview candidate mà không đổi active data:

```powershell
cd D:\BienEdu
node scripts/source-first/conversion-preview.mjs --port 8767
```

- Tổng hợp: <http://127.0.0.1:8767/>
- Căn thức CD08: <http://127.0.0.1:8767/documents.html?grade=12&topic=CD08&section=knowledge&item=1>
- CD01: <http://127.0.0.1:8767/documents.html?grade=12&topic=CD01&section=knowledge&item=1>

Đã chạy server đúng lệnh này và xác nhận HTTP 200 cho preview/learner/two candidate pointer modules; private tooling trả 404. Server do agent mở đã được dừng sau QA; chạy lệnh trên để mở lại. Preview khác origin/port nên không di chuyển storage của website đang dùng. Khi kiểm tra student progress, phải giữ cùng origin/port; không đổi progress keys.

**Chỉ người dùng thực thi khi muốn áp dụng local**; lượt này không chạy hai lệnh sau trên workspace thật:

```powershell
node scripts/source-first/conversion-release.mjs status
node scripts/source-first/conversion-release.mjs apply --authorize B1DE7F5D99CEFE97C6275D961054A06ADEFE3B239E24E923B39137AF9812E8A6 --execute
npm.cmd run qa:current
```

Sau apply, cần xem actual active QA; post-apply fixture 93/93 không được diễn giải thành đã chạy full QA trên real active data. Nếu mất phiên giữa apply, chạy `status`, rồi chạy lại **cùng** apply/hash để resume. Nếu có stale dependency/unknown bytes thì dừng và tạo preview mới, không chỉnh manifest. Stale lock chỉ được xử lý bằng `recover-lock --authorize HASH --execute` khi chính tool xác nhận owner PID đã chết; không xóa lock thủ công.

Rollback data khớp đúng manifest mới:

```powershell
node scripts/source-first/conversion-release.mjs rollback --authorize B1DE7F5D99CEFE97C6275D961054A06ADEFE3B239E24E923B39137AF9812E8A6 --execute
node scripts/source-first/conversion-release.mjs status
```

Hai target pointer modules được rollback; không xóa assets, không hoàn tác CSS/JS. Journals mới thuộc `.audit/conversion-recovery/operations.jsonl`; evidence/backup cũ giữ nguyên.

## 9. Code-patch rollback riêng

**Code authorization:** `B8BFC32C8EB8C6FE9176FF077F74FBCF62A83D4F7EF74158AF1EFD262CA37267`.

Manifest: `.content-work/stabilization-v2/B8BFC32C8EB8C6FE9176FF077F74FBCF62A83D4F7EF74158AF1EFD262CA37267/manifest.json`. Đây là delta từ dirty workspace đầu V2, không phải reset về Git HEAD.

Nếu đã apply data, **rollback data trước, code sau**: fresh data manifest cần các current code hashes. Nếu làm ngược, redo code rồi rollback data. Không dùng `git reset`, `git checkout --` hay xóa thư mục rộng.

```powershell
node scripts/source-first/stabilization-patch.mjs restore --authorize B8BFC32C8EB8C6FE9176FF077F74FBCF62A83D4F7EF74158AF1EFD262CA37267 --execute
```

Redo đúng code-patch:

```powershell
node scripts/source-first/stabilization-patch.mjs restore --authorize B8BFC32C8EB8C6FE9176FF077F74FBCF62A83D4F7EF74158AF1EFD262CA37267 --execute --redo
```

Tool preflight tất cả 21 targets, chỉ nhận exact before/after; overlapping user edits bị từ chối, không bị ghi đè. Có thể chạy lại cùng phase sau thao tác bị gián đoạn; lock sống không bị vượt qua. Utility, báo cáo và generated payload/evidence được giữ lại; sau undo code có thể cần regenerate audit cho script cũ. Không tuyên bố rollback code xóa hết mọi generated file. Isolated fixture đã kiểm tra before/redo exact và bảo toàn unrelated file; chưa rollback real workspace.

## 10. Exact files của stabilization V2

12 file sửa so với dirty baseline đầu V2 (một số vốn đã untracked từ lượt recovery trước):

```text
.gitignore
package.json
assets/js/components/pdf-knowledge-renderer.js
assets/pdf-knowledge.css
scripts/source-first/conversion-recovery.py
scripts/source-first/conversion-recovery.mjs
scripts/source-first/conversion-release.mjs
scripts/source-first/layout-v62.py
tests/conversion-release.test.mjs
tests/conversion-recovery-browser.test.mjs
tests/knowledge-geometry-browser.test.mjs
tests/conversion-real-release.test.mjs
```

9 file mới thuộc code undo/redo manifest:

```text
scripts/source-first/stabilization-fidelity.mjs
scripts/source-first/stabilization-symbolic.py
scripts/source-first/current-qa.mjs
scripts/source-first/qa-inputs.mjs
scripts/hosting-artifact.mjs
tests/stabilization-v2.test.mjs
tests/stabilization-browser.test.mjs
tests/stabilization-patch.test.mjs
tests/fixtures/fidelity-v2.mjs
```

Hai file mới được giữ ngoài undo manifest để còn hướng dẫn/redo:

```text
scripts/source-first/stabilization-patch.mjs
docs/content/stabilization-v2-2026-11-14.md
```

Hai generated candidate payloads mới:

```text
assets/content/pdf-knowledge/5AA87DA7188D55EAD6C90156D25495A6DA594E8F87C7CF5823878FF213530C41.json
assets/content/geometry/9ACE3E57D167A43C4C06189594FF97C50FF0ABED70F362C933EA54386E11833B.json
```

Runtime pointer modules **không đổi**. Các dirty changes của recovery/master-quality trước V2, B07C…/1C355… payloads, cùng original immutable manifests/backups/journals được bảo toàn; không nhận đó là các sửa mới của lần tiếp tục. Toàn bộ Git working-tree inventory cuối ở `.audit/stabilization-v2/final-working-tree.txt`. Bốn intermediate payloads do lượt này tự tạo được chuyển có thể phục hồi sang `.audit/stabilization-v2/intermediate-payloads/`, không bị xóa; đã kiểm tra chúng không phải active/immutable-plan references.

## 11. Giới hạn và trạng thái cuối

- **PARTIAL toàn bộ mathematical certification; candidate engineering/QA và fresh release preparation đã hoàn tất.** Không tự apply do yêu cầu rõ ràng của người dùng. Vì vậy active vẫn còn 4 khối P0, không thể báo website thật đã sửa hết.
- 6.722 render-eligible canonical positions chưa có kiểm tra source độc lập trong projection hiện tại; 6.941 historical/staging unresolved candidates không bị tự accept. KaTeX parse được không có nghĩa là toán đúng.
- Historical CLS spike chưa tái lập. Kiểm tra Geometry lần này dùng camera buttons/programmatic properties, không cấp chứng nhận mới cho touch rotation trên thiết bị thật. Reflow emulation không phải real browser zoom/physical-device certification.
- V5.5 **9 fields** và V5.6 **26 fields** vẫn exact-after khi gọi actual learner loader. V5.6 trên filesystem đã là `locally-applied-unreviewed` từ trước; không tự apply/rollback. Authorization V5.6 cũ stale (`Stale source/dependency; no writes`), muốn chạy lại cần fresh preview. Receipt `.audit/stabilization-v2/preservation.json`.
- Không sửa PDF/TEX gốc, stable IDs, Geometry specs, student progress keys hoặc practice scoring. Không thêm cropped PDF vào learner UI. Không commit, push, deploy hay formal human/source approval.
- Sites skill chỉ dùng quy trình local QA/teardown cho static checkout hiện hữu; không tạo website thứ hai, không publish. Báo cáo không thay thế bằng chứng tests đã thực thi.
