# BienEdu Math 12

Website tĩnh HTML/CSS/JavaScript thuần gồm năm khu vực: Trang chủ, Khóa học, Lộ trình Toán 12, Luyện đề và Đăng ký học.

## Chạy trên Windows

Mở PowerShell tại thư mục dự án rồi chạy:

```powershell
py -m http.server 8000
```

Nếu máy không có lệnh `py`, dùng:

```powershell
python -m http.server 8000
```

Sau đó mở `http://localhost:8000/`. Không mở trực tiếp bằng `file://` vì website dùng ES Modules.

## Kiểm thử

```powershell
npm.cmd run check
npm.cmd run verify
```

`npm.cmd run check` kiểm tra cú pháp JavaScript, đường dẫn import/asset và phát hiện module không còn được dùng. `npm.cmd run verify` còn xác thực registry học liệu trước khi chạy unit test và các luồng Chromium: không gian học, tiến độ, quiz, hiệu ứng cuộn, reduced motion và responsive trên nhiều kích thước màn hình.

Khi chỉ cần chạy một nhóm kiểm thử, dùng `npm.cmd test`, `npm.cmd run test:browser`, `npm.cmd run test:home-scroll` hoặc `npm.cmd run test:polish`.

URL trang chủ chuẩn là `/`. Cấu hình Vercel chuyển hướng vĩnh viễn `/index.html` về `/`; các trang công khai đều có thẻ canonical tương ứng.

## Dữ liệu lộ trình Toán 12

`assets/js/data/curriculum.js` được sinh một lần từ workbook `Lộ trình toán 12 Thanh Tùng.xlsx`; trình duyệt không đọc Excel lúc chạy. Dữ liệu hiện có 13 nhóm kiến thức, 39 chuyên đề và 347 dạng bài.

Để tái tạo dữ liệu sau khi workbook nguồn thay đổi có chủ đích:

```powershell
py .audit/generate_curriculum.py "C:\Users\ASUS\Downloads\Lộ trình toán 12 Thanh Tùng.xlsx" assets/js/data/curriculum.js
```

Script dùng thư viện chuẩn Python, kiểm tra số lượng, mã CD01–CD39, mã ngắn trùng lặp, ô bắt buộc và thứ tự nguồn. Bản Excel đã dùng có SHA-256 `EEB4C8BCCD0BD1C23DBFD0030FD22B1AEB2D1E33351AE28BAB9A6CC2589840E4`.

## Tài liệu và không gian học

Trang Lộ trình dùng query parameter để mở chuyên đề và dạng bài, ví dụ `documents.html?topic=CD12&type=12.1&section=knowledge&item=1`. Cả 39 chuyên đề dùng chung một Learning Workspace; nội dung chưa có nguồn hiển thị empty state trung thực thay vì slide giả. Mỗi dạng CD12–CD14 và CD20–CD21 hiện có ba phần: Kiến thức, Ví dụ nguồn và ba Bài tập đã kiểm tra. Logic điều hướng, tiến độ và slide nằm tách khỏi phần render trong `assets/js/domain/lesson-workspace.js`; tiến độ được giữ theo từng lớp trong namespace `bienedu:progress:v2:grade{grade}`.

Các PDF nguồn được quản lý tập trung trong `assets/js/data/document-mappings.js`; trạng thái từng chuyên đề, dạng bài và từng phần học nằm trong `assets/js/data/content-registry.js`. Tệp `bienedu-nguyen-ham-tich-phan-cd12-cd14.pdf` gồm 49 trang và được xác minh chứa CD12-01 đến CD14-09. 26 phần Kiến thức đã được đối chiếu theo trang; 12.1 được chia thành hai trang đọc. Mỗi dạng hiện giữ một ví dụ đã kiểm chứng và ba câu luyện tập đã kiểm tra, nên báo cáo vẫn ghi rõ phần ví dụ/bài tự luyện còn lại của PDF là coverage một phần. Tệp `ly-thuyet-to-hop-xac-suat-thong-ke-cd20-cd23.pdf` có 18 trang và thực tế kết thúc ở 21.8: website chỉ ánh xạ CD20–CD21, không suy đoán CD22–CD23 từ tên tệp hoặc trang bìa.

## Nhập thêm PDF theo cách an toàn

Đặt PDF mới vào thư mục `39 chuyên đề/`, giữ nguyên tệp gốc, rồi chạy lần lượt:

```powershell
npm.cmd run content:scan
npm.cmd run content:import
npm.cmd run content:validate
```

- `content:scan` tính SHA-256, đếm trang và trích các tiêu đề có thể đối chiếu với catalog. Công cụ dùng `pdftotext`; có thể đặt đường dẫn riêng qua biến môi trường `PDFTOTEXT_PATH`.
- `content:import` chỉ tạo `.audit/content-import-proposals.json`. Nó không sửa hoặc ghi đè học liệu đã xác minh.
- Người biên tập kiểm tra đề xuất, trang nguồn, công thức, ranh giới ví dụ và lời giải rồi mới cập nhật mapping/dữ liệu bài học. Slide mới phải có ID ổn định, tham chiếu `documentId` và trang PDF.
- `content:validate` kiểm tra đủ 39/347, hash nguồn, ID trùng, traceability và sinh `.audit/content-coverage.md`.

Sau khi review, chạy server cục bộ, mở trực tiếp route của bài vừa thêm ở desktop/mobile, rồi chạy `npm.cmd run verify`. Chỉ commit/deploy sau khi báo cáo coverage không còn lỗi và nội dung toán đã được người biên tập duyệt.

Route tương thích `quiz.html` hiện là nền tảng **Luyện đề** cho lớp 9–12. Dữ liệu mở rộng nằm trong `assets/js/data/practice-papers.js`; các danh sách hiện được để rỗng có chủ đích cho đến khi có bộ đề đã kiểm chứng. Workspace bài học hỗ trợ phím `←` và `→` để chuyển nội dung, ngoại trừ khi học viên đang thao tác với trường nhập hoặc nút trả lời.

## Đăng ký học

Thông tin công khai được quản lý tập trung tại `assets/js/data/tutor-profile.js`. Liên hệ duy nhất hiện được cung cấp là Zalo `0943 943 151`.
