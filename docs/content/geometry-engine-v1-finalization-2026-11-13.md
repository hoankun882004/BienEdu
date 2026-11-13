# BienEdu Geometry Engine V1 — finalization 2026-11-13

## Trạng thái

**COMPLETE cho bản local đã chuẩn bị; chưa kích hoạt trên learner runtime thật.**

30/30 hình đã được kiểm chứng: 10 hình 2D, 20 hình 3D. JSXGraph 1.14.2 được tái sử dụng, không cài lại, không thêm Three.js. Có 2 hình dựng theo dữ kiện/hàm số xác định và 28 sơ đồ ràng buộc ghi rõ “không theo tỉ lệ”. Không gọi các tọa độ tự chọn là số đo nguồn. Không tạo ảnh crop PDF, SVG trích từ PDF hoặc ảnh AI thay thế hình.

0 hình bị chặn trong cohort 30 này. Đây không phải tuyên bố mọi hình trong kho 188 figure cũ đều đã được tái dựng.

## Nguồn và mô hình toán

Giữ nguyên queue .audit/pdf-knowledge/issues.json và toàn bộ stable record/block IDs. Đã đối chiếu lại 1.678 glyph theo ký tự, font, vị trí và cỡ chữ trên PDF có SHA-256 cố định. 79 kiểm tra SymPy 1.14.0 đạt; có thêm 61 kiểm tra tính chất số tại runtime. Source verification, symbolic checks và browser checks được ghi riêng trong source-evidence.json, symbolic.json, browser.json.

Định dạng bienedu.geometry.v1 tách khỏi Canonical Math Format: dữ liệu điểm, vectơ, đoạn/tia/đường, mặt phẳng, đa giác phẳng, tròn/cầu/nón, hàm an toàn, nhãn, camera và quan hệ. Không eval/new Function từ dữ liệu. KaTeX vẫn dùng Common Math Renderer cũ. Hàm chỉ được dựng trong miền liên tục đã được kiểm chứng; các đồ thị hữu tỉ nhiều nhánh vẫn thuộc Graph Specification/engine hiện có.

Các đối tượng không có số đo sử dụng một realization thỏa quan hệ nguồn. SymPy chứng minh tính chất của realization đó, không khôi phục số đo thiếu hoặc chứng minh một hình vẽ theo pixel. Riêng 32.6 giữ T là tiếp điểm và M là điểm ngoài theo nhãn hình; không đánh đồng với M trong đoạn văn mô tả tiếp diện. 13.6 giữ hai miền tam giác riêng, không nối thành một hàm liên tục tại x=2.

| Dạng | Chiều | Phân loại | Trang PDF | Quan hệ runtime | Cách dựng |
| --- | --- | --- | --- | --- | --- |
| 13.6 | 2D | GEOMETRY_2D | 28 | 2 | Dữ kiện xác định |
| CD08-CD11 | 2D | FUNCTION_GRAPH | 6 | 1 | Dữ kiện xác định |
| 28.1 | 2D | VECTOR_DIAGRAM | 2 | 1 | Sơ đồ ràng buộc |
| 28.7 | 2D | VECTOR_DIAGRAM | 5 | 1 | Sơ đồ ràng buộc |
| 28.8 | 3D | SPATIAL_FIGURE | 6 | 3 | Sơ đồ ràng buộc |
| 29.1 | 3D | COORDINATE_SYSTEM | 7 | 2 | Sơ đồ ràng buộc |
| 29.3 | 2D | GEOMETRY_2D | 8 | 1 | Sơ đồ ràng buộc |
| 29.4 | 2D | GEOMETRY_2D | 9 | 3 | Sơ đồ ràng buộc |
| 29.5 | 3D | GEOMETRY_3D | 10 | 2 | Sơ đồ ràng buộc |
| 30.1 | 3D | GEOMETRY_3D | 12 | 2 | Sơ đồ ràng buộc |
| 30.4 | 3D | GEOMETRY_3D | 14 | 2 | Sơ đồ ràng buộc |
| 30.5 | 3D | GEOMETRY_3D | 15 | 4 | Sơ đồ ràng buộc |
| 30.6 | 3D | GEOMETRY_3D | 16 | 2 | Sơ đồ ràng buộc |
| 31.2 | 3D | VECTOR_DIAGRAM | 18 | 1 | Sơ đồ ràng buộc |
| 31.4 | 3D | GEOMETRY_3D | 20 | 2 | Sơ đồ ràng buộc |
| 31.6 | 3D | GEOMETRY_3D | 21 | 2 | Sơ đồ ràng buộc |
| 31.8 | 3D | GEOMETRY_3D | 22 | 2 | Sơ đồ ràng buộc |
| 31.9 | 3D | GEOMETRY_3D | 23 | 2 | Sơ đồ ràng buộc |
| 32.1 | 3D | GEOMETRY_3D | 24 | 1 | Sơ đồ ràng buộc |
| 32.4 | 3D | GEOMETRY_3D | 26 | 3 | Sơ đồ ràng buộc |
| 32.5 | 2D | GEOMETRY_2D | 27 | 3 | Sơ đồ ràng buộc |
| 32.6 | 2D | GEOMETRY_2D | 28 | 1 | Sơ đồ ràng buộc |
| 32.7 | 2D | GEOMETRY_2D | 29 | 3 | Sơ đồ ràng buộc |
| 33.1 | 3D | SPATIAL_FIGURE | 30 | 6 | Sơ đồ ràng buộc |
| 33.3 | 3D | COORDINATE_SYSTEM | 32 | 1 | Sơ đồ ràng buộc |
| 33.4 | 3D | GEOMETRY_3D | 33 | 1 | Sơ đồ ràng buộc |
| 33.5 | 3D | SPATIAL_FIGURE | 34 | 2 | Sơ đồ ràng buộc |
| 33.7 | 3D | SPATIAL_FIGURE | 36 | 2 | Sơ đồ ràng buộc |
| 33.8 | 3D | GEOMETRY_3D | 37 | 2 | Sơ đồ ràng buộc |
| 33.9 | 2D | FUNCTION_GRAPH | 38 | 1 | Sơ đồ ràng buộc |

Hai nguồn xác định: cd12-cd14-calculus (13.6, trang 28) và cd08-cd11-exponential-logarithm (CD08–CD11, trang 6). 28 sơ đồ còn lại thuộc cd28-cd33-vector-2026. SHA-256, source rect, glyph hash, phương trình, điểm, constraints, target runtime và URL chính xác cho từng hình nằm trong inventory.json và payload assets/content/geometry/F77647AA90230356DBD52E94CC75BABACDA22FAD0C8B10FF5EEFF872AAF76ECD.json. Bản payload F8ABC… là draft trước được giữ lại, không có pointer đang chọn nó.

## Tương tác và UI đã kiểm chứng

Lỗi ban đầu: View3D pointer handling có thể bị board hit-testing chiếm trước; đổi aria-pressed không làm camera đổi. Bản sửa dùng pointer capture ở chế độ opt-in và API View3D.setView; native az/el pointer handlers vẫn tắt để không có hai bộ xoay cạnh tranh. Tắt chế độ, pointerup, pointercancel, mất capture và dispose đều kết thúc drag. Góc phương vị được chuẩn hóa, elevation có miền slider phù hợp.

Đã khẳng định bằng trạng thái camera và gesture thật trong Chromium emulation: bật/tắt xoay, kéo chạm, cuộn một ngón khi tắt, capture/release, cancellation, kéo chuột, zoom/reset. Sau navigation/Back/Forward và bfcache không có board trùng. Đây **không phải chứng nhận trên thiết bị vật lý**.

Khung 3D fit theo phép chiếu của đối tượng và đầu mút trục, không theo pixel PDF. Đã sửa clipping 33.8 và nhãn z ở 29.1 trên 320 px. Nhãn không bị thu nhỏ. Hình cao vẫn cần cuộn dọc trong workspace mobile hiện có; không có horizontal page overflow.

Đã sửa thêm race Back trong transition lock trong **bản staged**: chỉ queue popstate mới nhất rồi xử lý sau chuyển cảnh, không synthetic event hoặc timer retry. Các section, IDs, scoring và progress keys không đổi. assets/js/curriculum.js thật chưa bị ghi.

## Kiểm thử và exit codes

| Bộ | Kết quả | Exit |
| --- | --- | --- |
| tests/geometry.test.mjs | 54 passed, 0 failed; gồm source/schema/security và apply/resume/rollback trong fixture | 0 |
| 5 bộ current-runtime Node trong verification.json | 45 passed, 0 failed | 0 |
| tests/geometry-browser.test.mjs | 1 test đạt; 240/240 states = 30 hình × 8 viewport | 0 |
| tests/geometry-interactions.test.mjs | 2/2; touch/mouse/capture/cancel/scroll/history/graph coexistence | 0 |
| tests/geometry-activation-browser.test.mjs | 1/1; apply và rollback trên HTML thường trong fixture, không meta preview | 0 |
| tests/pdf-knowledge-browser.test.mjs, runtime thật không kích hoạt geometry | 1/1; 28 lượt route, 740 article renders, practice/reload | 0 |
| SymPy geometry | 79/79 | 0 |
| git diff --check | Không lỗi whitespace | 0 |

Viewports: 320×568, 360×800, 390×844, 430×932, 768×1024, 1024×768, 1366×768 và 844×390 (landscape có touch emulation). Kiểm tra mọi source identity, constraints, miền hàm, điểm và nhãn trong SVG, kích thước nút, camera, keyboard, lỗi JS/KaTeX, board duplicates, navigation, progress persistence và horizontal overflow. Screenshots thực đã được mở kiểm tra trong .audit/geometry-v1/screenshots/.

Quan sát hiệu năng: layout shift khi tải thư viện = 0px trong kiểm tra trì hoãn tải; JSXGraph vendor 1.027.186 byte và payload geometry 162.032 byte. Không tải JSXGraph trên trang practice/text không có hình; chỉ mount khi hình vào vùng nhìn, dùng chung library promise và dispose board/observer/listeners khi đổi bài. Không chạy SymPy trong browser. Không tuyên bố FPS hay hiệu năng thiết bị vật lý.

## Điều tra lỗi lịch sử

Giữ nguyên mọi assertion và manifest cũ. Npm test với byte runtime hiện tại trong bản sao: 228 pass / 25 fail, exit 1. Phục hồi baseline một phần: 245 pass / 8 fail. Fixture phục hồi đủ chuỗi publication → V6.2 → V6.1 → V6.0, sau đó build + verifier gốc trước suite: **253 pass / 0 fail, exit 0**. Log đầy đủ: logs/baseline-corrected-0.log; receipt historical-baseline-corrected.json.

17 lỗi đầu là giả định baseline cũ (V5.5 và parent/runtime bytes). 8 lỗi còn lại gồm 4 phụ thuộc assets/js/learning-v6.js chưa phục hồi về before-bytes V6.1 và 4 lỗi evidence V5.1/snapshot cũ, kéo theo Studio HTTP 404/undefined items. Tái tạo evidence bằng công cụ gốc chỉ trong fixture sửa được chúng. Không cần giả định concurrency; đây là nguyên nhân baseline/isolation/setup đã tái hiện được.

Các entry point **npm.cmd run verify** và **npm.cmd run test:source-first** trên workspace thật vẫn exit 1 ở “Unknown target bytes: documents.html”, chưa chạy bộ bên trong. Không chỉnh hash publication cũ để ép qua. Đây vẫn là giới hạn tooling lịch sử; kết quả fixture không thay thế kiểm chứng runtime thật độc lập ở trên.

## Bảo toàn và bảo mật

370 article, 1.358 canonical math nodes, nguồn PDF/TEX, bản sửa toán cũ, rollback evidence, progress và scoring được giữ nguyên. V5.6 thực tế đã ở after-bytes ngay trong workspace có sẵn; lượt này không áp dụng hay rollback 26 trường. Authorization V5.6 cũ báo stale dependency: cần preview mới nếu muốn thao tác lại.

Quét báo cáo sinh ra không tìm thấy credential values. Khóa Cursor từng lộ trong đầu ra chẩn đoán của phiên trước không được chép vào code/report. Không thể thu hồi nội dung transcript qua chỉnh file workspace. **Cần người dùng thu hồi/đổi khóa; chưa xác nhận revocation.** security.json ghi số file quét mới nhất, không ghi giá trị bí mật.

P0: không phát hiện trong phạm vi đã kiểm thử. P1 của Geometry V1 staged: không còn lỗi đã biết. Tồn đọng vận hành: xoay khóa đã lộ và cập nhật cơ chế suite lịch sử bằng continuation riêng; các wrapper lịch sử hiện vẫn bị chặn. Hạn chế khác: chưa thử phần cứng iOS/Android; không mở rộng engine cho hình thiếu ràng buộc hoặc đồ thị nhiều nhánh mới; không có activation/commit/push/deploy thật.

## Preview và kích hoạt có kiểm soát

Server đã trả HTTP 200 cho preview và route learner thật. Để xem lại, chạy từ D:\BienEdu:

~~~powershell
node scripts/source-first/geometry-server.mjs --port 8010
~~~

Mở http://127.0.0.1:8010/geometry-preview.html. Trang này có 30 liên kết đến đúng source edition trong bài học. Server preview inject loader và phục vụ router staged **trong response**, không sửa file đang hoạt động. Python/server cũ sẽ không tự thấy geometry trước khi apply. Server QA sở hữu bởi agent được dừng khi bàn giao; lệnh trên khởi động lại được.

Manifest mới: .content-work/geometry-v1/2A5734E156FBA4ACF550226F67D9ADE9B5D27B85E16AA7804E77F34209EDAED3/manifest.json. Trạng thái PREPARED, cả 3 target còn BEFORE: documents.html, assets/js/curriculum.js và assets/js/data/geometry-activation.js. Đã kiểm thử apply/rollback trong fixture, realRuntimeWrites=0.

Chỉ khi người dùng muốn kích hoạt local (agent chưa chạy):

~~~powershell
node scripts/source-first/geometry-release.mjs apply --authorize 2A5734E156FBA4ACF550226F67D9ADE9B5D27B85E16AA7804E77F34209EDAED3 --execute
~~~

Rollback khớp cùng manifest:

~~~powershell
node scripts/source-first/geometry-release.mjs rollback --authorize 2A5734E156FBA4ACF550226F67D9ADE9B5D27B85E16AA7804E77F34209EDAED3 --execute
~~~

Status: node scripts/source-first/geometry-release.mjs status. Nếu source/code/QA receipts đổi, command sẽ fail closed; cần prepare mới, không sửa manifest cũ. Apply activation-last, rollback ngược, CAS, lock, journal riêng, before backups, idempotent resume và recover-lock có xác thực pid chết. Không có production publication.

## File inventory chính xác

- .audit/geometry-v1/activation-browser.json
- .audit/geometry-v1/activation-plan.json
- .audit/geometry-v1/browser.json
- .audit/geometry-v1/file-inventory.json
- .audit/geometry-v1/historical-actual.json
- .audit/geometry-v1/historical-baseline-corrected.json
- .audit/geometry-v1/historical-guards.json
- .audit/geometry-v1/interactions.json
- .audit/geometry-v1/inventory.json
- .audit/geometry-v1/preview.json
- .audit/geometry-v1/security.json
- .audit/geometry-v1/source-evidence.json
- .audit/geometry-v1/summary.json
- .audit/geometry-v1/symbolic.json
- .audit/geometry-v1/verification.json
- .gitignore
- assets/content/geometry/F77647AA90230356DBD52E94CC75BABACDA22FAD0C8B10FF5EEFF872AAF76ECD.json
- assets/content/geometry/F8ABC1AF14F291C6DCADC4A8203520BA304553106DBBAD099883EAA4B010C7BC.json
- assets/geometry.css
- assets/js/components/geometry-renderer.js
- assets/js/components/geometry-spec.js
- assets/js/data/geometry-activation.js
- assets/js/geometry-learner.js
- assets/js/geometry-loader.js
- assets/js/geometry-preview.js
- docs/content/geometry-engine-v1-finalization-2026-11-13.md
- geometry-preview.html
- scripts/source-first/geometry-build.mjs
- scripts/source-first/geometry-guards.mjs
- scripts/source-first/geometry-historical.mjs
- scripts/source-first/geometry-models.mjs
- scripts/source-first/geometry-navigation.mjs
- scripts/source-first/geometry-release.mjs
- scripts/source-first/geometry-report.mjs
- scripts/source-first/geometry-security.mjs
- scripts/source-first/geometry-server.mjs
- scripts/source-first/geometry-source.py
- scripts/source-first/geometry-symbolic.py
- tests/geometry-activation-browser.test.mjs
- tests/geometry-browser.test.mjs
- tests/geometry-interactions.test.mjs
- tests/geometry.test.mjs

Manifest và before-0.txt/before-1.txt/before-2.txt mới nằm trong .content-work/geometry-v1/2A5734E156FBA4ACF550226F67D9ADE9B5D27B85E16AA7804E77F34209EDAED3/. Logs, screenshots và full-page source references là artifact QA riêng bị gitignore; không được dùng làm ảnh học liệu. Không thay đổi package.json/package-lock.json, file nguồn PDF/TEX hay manifest/journal/backups lịch sử. Chỉ .gitignore là tracked file có diff ở runtime thật; các module geometry đều được thêm mới.

API đối chiếu: mã JSXGraph cài tại node_modules/jsxgraph/src/3d/ và tài liệu chính thức [View3D](https://jsxgraph.org/docs/View3D.html), [Plane3D](https://jsxgraph.org/docs/Plane3D.html), [Polygon3D](https://jsxgraph.org/docs/Polygon3D.html), [Sphere3D](https://jsxgraph.org/docs/Sphere3D.html).
