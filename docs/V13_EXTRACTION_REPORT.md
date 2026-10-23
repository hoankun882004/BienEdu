# BienEdu V13 — báo cáo chuyển đổi Learning Workspace

Ngày kiểm tra: 2026-10-23. Không commit, push hoặc deploy.

## Kết quả

Student runtime đã chuyển hoàn toàn sang bài đọc HTML/Markdown + KaTeX. Không còn PDF.js, iframe, embed, object, canvas PDF, nút mở PDF, điều khiển trang/zoom hay ảnh chụp trang PDF. Hai PDF gốc vẫn nguyên vẹn trong `39 chuyên đề/` để đối chiếu ngoại tuyến:

| Tệp nguồn | SHA-256 | Vai trò |
|---|---|---|
| `C12-CD13-CD14.pdf` | `4E65F476DA0A1B817A05B6E829737100B753A2E5219236F719ACAB016F221E59` | Nguồn nội bộ CD12–CD14 |
| `Lý_thuyết_Tổ_hợp_Xác_suất_Thống_kê_CD20_CD23 (2).pdf` | `66B1D93392F834CA8659902CE7F1020F7CB3220C758DF1D697837340840E9293` | Nguồn nội bộ CD20–CD21; tệp thực tế kết thúc ở 21.8 |

## Coverage đã xuất bản

- 51/51 subtopic đã ánh xạ có bài đọc native: CD12 (9), CD13 (8), CD14 (9), CD20 (17), CD21 (8).
- 52 trang Kiến thức (12.1 được chia thành hai trang đọc).
- 148 mục công thức/nguyên tắc và 125 điểm “Cách hiểu nhanh”.
- 94 ví dụ có lời giải.
- 153 câu luyện sinh xác định (3 câu/subtopic).
- 260 bài tự luyện nguồn CD12–CD14; đáp số chỉ dùng tự kiểm tra, không chấm biểu thức tượng trưng tự động.
- 9 đáp số nguồn vẫn có cờ `needs-review`; hệ thống hiển thị trạng thái thật và không tự sửa/đoán.

Coverage trước V13 ở runtime là 50 bài ưu tiên PDF.js và 1 pilot Markdown (20.2). Coverage sau V13 là 51 bài native, 0 viewer/fallback PDF.

## Kiến trúc runtime

1. `content-registry.js` xác định availability từ nội dung Kiến thức native đã kiểm chứng.
2. `lesson-workspace.js` tạo slide `knowledge-markdown` ổn định; không tạo mapping/canvas/PDF slide.
3. `markdown-math-renderer.js` escape HTML, chỉ hỗ trợ subset Markdown cần thiết, giới hạn ảnh ở `assets/`, và render công thức bằng KaTeX với `trust: false`.
4. `curriculum.js` dùng một renderer chung cho toàn bộ Kiến thức; Ví dụ/Bài tập cũng dùng chung hàm render biểu thức.
5. `learning-progress.js` chỉ đếm ID nội dung native. Dữ liệu `knowledgePdfProgress` cũ được giữ read-only để migration hoàn tất mà không làm mất tiến độ hay đáp án.

## Pipeline và độ tin cậy

Marker vẫn là provider cục bộ mặc định cho tài liệu mới. Output thô luôn vào `.content-work`/`content/review`, gắn `needs-source-review`, rồi mới được approve/publish sau khi người duyệt xác nhận nguồn, công thức và boundary. Pilot Marker 20.2 đã được approve ở phiên bản content-addressed `b83191298ae8be3c`. Smoke 12.1 còn lỗi bảng LaTeX nên không được approve; website sử dụng bản structured transcription đã đối chiếu thay vì output OCR lỗi.

Không công bố phần trăm OCR giả khi chưa có ground truth. Số liệu được dùng là coverage bài/trang/block, số lỗi validator và trạng thái duyệt có thể kiểm tra.

## QA

- `npm.cmd run check`: kiểm tra syntax/import/asset/dead module.
- `npm.cmd run content:scan`: kiểm kê PDF và hash nguồn.
- `npm.cmd run content:validate`: kiểm tra 39/347, mapping, source coverage và answer-key review.
- `npm.cmd test`: 66 unit test, gồm renderer an toàn, KaTeX, integral có cận âm, migration tiến độ và 51 bài native.
- `npm.cmd run test:v13`: Playwright/Chromium thật; 51 bài ở 390px và 1440px, 8 route đại diện trên 390×844, 430×932, 768×1024, 1024×768, 1280×720, 1440×900, 1920×1080; kiểm tra overflow, raw LaTeX, PDF controls, bàn phím, practice feedback và empty state.

Ảnh QA nằm ở `.audit/v13-native-20-2-*.png`.

## Nhập PDF tiếp theo

1. Đặt PDF gốc vào `39 chuyên đề/`; không sửa hoặc thay tệp cũ.
2. Chạy `npm.cmd run content:scan` và cập nhật mapping có hash/trang rõ ràng.
3. Chạy Marker cho đúng vùng subtopic, ưu tiên vùng nhỏ thay vì OCR toàn tài liệu.
4. Kiểm tra Markdown/LaTeX, heading, bảng, hình và boundary trong `content/review`.
5. Chỉ chạy approve/publish khi validator sạch và người duyệt đã đối chiếu PDF.
6. Bổ sung structured reading/registry; nội dung thiếu phải tiếp tục dùng empty state, tuyệt đối không bật viewer PDF.
7. Chạy `npm.cmd run verify` và kiểm tra ảnh Playwright trước khi commit/deploy.
