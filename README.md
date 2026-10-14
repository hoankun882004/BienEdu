# BienEdu Math 12

Website tĩnh HTML/CSS/JavaScript thuần gồm năm khu vực: Trang chủ, Khóa học, Lộ trình Toán 12, Kiểm tra kiến thức và Hồ sơ gia sư.

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
npm.cmd test
npm.cmd run test:browser
```

`npm.cmd test` kiểm tra dữ liệu lộ trình, 61 slide nguồn, 75 bài luyện tập, tiến độ, đề cuối chuyên đề, hồ sơ gia sư và logic quiz. `npm.cmd run test:browser` kiểm tra luồng học, khóa/mở đề, không rò đáp án trước khi nộp và responsive trên Chromium.

## Dữ liệu lộ trình Toán 12

`assets/js/data/curriculum.js` được sinh một lần từ workbook `Lộ trình toán 12 Thanh Tùng.xlsx`; trình duyệt không đọc Excel lúc chạy. Dữ liệu hiện có 13 nhóm kiến thức, 39 chuyên đề và 347 dạng bài.

Để tái tạo dữ liệu sau khi workbook nguồn thay đổi có chủ đích:

```powershell
py .audit/generate_curriculum.py "C:\Users\ASUS\Downloads\Lộ trình toán 12 Thanh Tùng.xlsx" assets/js/data/curriculum.js
```

Script dùng thư viện chuẩn Python, kiểm tra số lượng, mã CD01–CD39, mã ngắn trùng lặp, ô bắt buộc và thứ tự nguồn. Bản Excel đã dùng có SHA-256 `EEB4C8BCCD0BD1C23DBFD0030FD22B1AEB2D1E33351AE28BAB9A6CC2589840E4`.

## Tài liệu và không gian học

Trang Lộ trình dùng query parameter để mở chuyên đề và dạng bài, ví dụ `documents.html?topic=CD20&type=20.1&section=knowledge&item=1`. Mỗi dạng CD20–CD21 có đúng ba phần: Kiến thức, Ví dụ nguồn và ba Bài tập sinh xác định. Logic điều hướng, tiến độ và slide nằm tách khỏi phần render trong `assets/js/domain/lesson-workspace.js`; trạng thái tương thích V6.1 dùng namespace `bienedu.learning.v2`.

Nguồn PDF `assets/documents/ly-thuyet-to-hop-xac-suat-thong-ke-cd20-cd23.pdf` được quản lý một lần trong `assets/js/data/document-mappings.js`. CD20 và CD21 cùng trỏ đến nguồn này nhưng có metadata trang riêng: CD20 ở trang PDF 4–14, CD21 ở trang PDF 15–18. Tệp PDF gốc không bị sửa; `.audit/extract_knowledge_slides.py` sinh 32 slide lý thuyết và 29 slide ví dụ WebP theo ranh giới ngữ nghĩa, còn `.audit/generate_knowledge_data.py` cập nhật mapping trình duyệt. Các chuyên đề chưa có nguồn thật hiển thị trạng thái đang bổ sung, không sinh nội dung giả.

## Hồ sơ gia sư

Thông tin công khai được quản lý tập trung tại `assets/js/data/tutor-profile.js`. Liên hệ duy nhất hiện được cung cấp là Zalo `0943 943 151`.
