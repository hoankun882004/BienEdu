# Báo cáo triển khai hồ sơ gia sư và lộ trình Toán 12

Ngày kiểm tra: 2026-10-14

## Nguồn dữ liệu

- Workbook: `C:\Users\ASUS\Downloads\Lộ trình toán 12 Thanh Tùng.xlsx`
- Worksheet: `Sheet1`
- Vùng dữ liệu: `A1:G349`
- SHA-256 trước và sau triển khai: `EEB4C8BCCD0BD1C23DBFD0030FD22B1AEB2D1E33351AE28BAB9A6CC2589840E4`
- Workbook nguồn không bị sửa.

## Kết quả xác thực

- 13 nhóm kiến thức.
- 39 chuyên đề, đủ và đúng thứ tự `CD01`–`CD39`.
- 347 dạng bài.
- 0 mã ngắn trùng lặp.
- 0 giá trị bắt buộc bị thiếu.
- Thứ tự Excel được bảo toàn.
- Mã như `1.1` và `1.10` được lưu dưới dạng chuỗi.
- Không phát hiện bất nhất cần hiệu chỉnh.

## Phạm vi giao diện

- `contact.html`: thay form liên hệ bằng hồ sơ thật của Trần Thanh Tùng, thẻ thông tin, hình thức học và CTA Zalo.
- `documents.html`: thay thư viện PDF bằng lộ trình có tìm kiếm không dấu, lọc nhóm, xóa bộ lọc, trạng thái rỗng và accordion truy cập bằng bàn phím.
- Không tạo PDF, URL tải xuống, thông số file hoặc trình xem giả.
- `document-mappings.js` để trống, sẵn sàng ánh xạ file thật sau này.

## Kiểm tra

- Node test: 10/10 đạt.
- Browser interaction test: đạt tìm kiếm, xóa bộ lọc, lọc nhóm, mở chuyên đề, danh sách dạng bài, menu mobile và Zalo.
- Kiểm tra liên kết nội bộ: 5 trang, không thiếu `href`/`src` cục bộ.
- Visual inspection: 375, 768, 1024 và 1440 px; không tràn ngang, không ảnh lỗi, không lỗi console.
- Taste lint/inspect: 0 lỗi chặn trên hai trang cập nhật.
- Tổng PDF trong dự án: 0, đúng với trạng thái nguồn hiện tại.
