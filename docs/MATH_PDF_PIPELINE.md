# BienEdu V13 — Math PDF to Markdown/LaTeX

Pipeline này chạy ở máy phát triển/server tooling. Trình duyệt học sinh chỉ tải nội dung Markdown/JSON đã duyệt và KaTeX; không chạy OCR và không nhận khóa API.

## Nguyên tắc dữ liệu

- `39 chuyên đề` là thư mục nguồn. Mỗi lần chạy phải khớp SHA-256 với `assets/js/data/document-mappings.js`.
- Catalog 39 chuyên đề/347 dạng bài và registry hiện tại là nguồn sự thật duy nhất; pipeline chỉ tham chiếu, không tạo catalog thứ hai.
- Marker 2.0.0 là provider mặc định trong `.venv-marker`. Mathpix là provider tùy chọn, chỉ đọc `MATHPIX_APP_ID` và `MATHPIX_APP_KEY` từ môi trường.
- `.content-work/runs` chứa output thô, log và ảnh debug; thư mục này không commit.
- `content/review/<document>/<subtopic>.{md,json}` là bản cần người kiểm tra PDF nguồn.
- `assets/content/approved/<document>/<subtopic>/<hash>/` là bản đã duyệt bất biến. Publish không ghi đè phiên bản đã xác minh.
- `assets/js/data/approved-math-content.js` là index sinh tự động cho frontend. Khi chưa có bản approved/structured đã kiểm chứng, học viên thấy empty state trung thực; không có PDF fallback.

## Cài Marker cục bộ

```powershell
python -m venv .venv-marker
.\.venv-marker\Scripts\python.exe -m pip install marker-pdf==1.10.2
npm.cmd run content:math:doctor
```

Máy hiện tại có GPU 4 GB. Pipeline ghim Marker 1.10.2 vì bản 2.0.0 tự chọn VLLM/Docker trên GPU Windows; môi trường này không có Docker. Với PDF có text layer lỗi encoding tiếng Việt, dùng `--force-ocr` cho đúng vùng trang cần thiết thay vì OCR cả tài liệu.

## Quy trình một subtopic

```powershell
# 1. Trích xuất vùng trang đã ánh xạ; output review luôn ở trạng thái needs-source-review
npm.cmd run content:math:extract -- --subtopic 20.2 --provider marker --force-ocr --debug

# 2. Kiểm tra schema, trang thiếu, công thức không chắc và boundary overlap
npm.cmd run content:math:validate -- --subtopic 20.2

# 3. Đối chiếu trực tiếp từng công thức, heading và điểm cắt với PDF
npm.cmd run content:math:approve -- --subtopic 20.2 --reviewer "Tên người kiểm tra" --source-verified --formulas-verified --boundaries-verified --notes "Ghi chú"

# 4. Publish cục bộ vào phiên bản content-addressed; không deploy
npm.cmd run content:math:publish -- --subtopic 20.2
```

Nếu một bản review chưa xác minh cần chạy lại, thêm `--replace-review`. Pipeline từ chối ghi đè bất kỳ review nào đã có `verification.status = verified`.

## Mathpix tùy chọn

Đặt biến môi trường ở máy chạy tooling, không đặt trong JavaScript/frontend:

```powershell
$env:MATHPIX_APP_ID="..."
$env:MATHPIX_APP_KEY="..."
npm.cmd run content:math:extract -- --subtopic 20.2 --provider mathpix
```

Provider upload PDF, poll job server-side, rồi lưu `.md` và `.lines.json` thô vào `.content-work`. Nếu thiếu line geometry, pipeline gắn cờ `boundary-geometry-missing`; không tự coi ranh giới là đúng.

## Cờ kiểm tra

- `uncertain-formula`: ngoặc LaTeX lệch hoặc có ký tự OCR không chắc; chặn approve.
- `missing-content`, `missing-page-content`: vùng nguồn không có block; chặn approve.
- `boundary-overlap`: block chạm mép crop; người duyệt phải đối chiếu.
- `section-heading-missing`: không tìm thấy heading nguồn; không tự sáng tác phần mới.
- `boundary-geometry-missing`: provider không có tọa độ đủ tin cậy.

Các phần `knowledge`, `worked_examples`, `practice` chỉ thay đổi khi gặp heading thật như “Kiến thức trọng tâm”, “Ví dụ có lời giải/Ví dụ nhanh” hoặc “Bài tập tự luyện”. Phần không có trong nguồn được giữ rỗng.

## Kiểm tra trực quan

Sau khi publish pilot:

```powershell
npm.cmd run test:math-visual
```

Reviewer mở PDF bằng công cụ desktop độc lập và đối chiếu với Markdown/KaTeX theo block ID, trang và region. Playwright chỉ kiểm tra trải nghiệm học native: không có PDF runtime, công thức đã render, không overflow và nội dung cuối vẫn truy cập được trên mobile/desktop.
