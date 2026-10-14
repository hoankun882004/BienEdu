# Audit nguồn BienEdu trước khi tái thiết kế

Ngày audit: 14/10/2026.

## Hiện trạng workspace

- Source giao diện duy nhất là `BienEdu_HocSinh_Preview (6).html`, dung lượng khoảng 5,2 MB.
- File là một preview wrapper tự chứa, nạp ứng dụng thật qua `iframe/srcdoc`; HTML, CSS, JavaScript và dữ liệu bị đóng gói chung nên khó bảo trì.
- Không có project framework, package build, thư mục assets riêng, test tự động hay hướng dẫn chạy.
- Không tìm thấy file PDF hoặc metadata tài liệu PDF nào trong workspace.
- Skill `design-taste-frontend` đã được cài tại `.agents/skills/design-taste-frontend` và được đọc, áp dụng trước khi thiết kế.

## Dữ liệu có thể kiểm chứng trong source gốc

- 8 topic trong catalog tổng; 6 vùng kiến thức phù hợp trực tiếp với trang Toán 12 mới.
- 24 bài học, 100 câu hỏi, 8 phiên học, 26 slide và 8 đề kiểm tra trong dữ liệu đóng gói.
- 0 tài liệu/PDF. Vì vậy không thể xác nhận tên hoặc nội dung của bộ 39 chuyên đề.

Sáu vùng kiến thức được giữ lại: Ứng dụng đạo hàm; Nguyên hàm và tích phân; Vectơ và tọa độ Oxyz; Xác suất; Thống kê; Hình học không gian.

## Đánh giá kỹ thuật và giao diện ban đầu

- Cấu trúc một file và iframe lồng nhau làm presentation, behavior và data phụ thuộc chặt.
- Nội dung nguồn có giá trị nhưng khó tái sử dụng, khó kiểm thử và khó thêm tài liệu thật.
- Kiểm tra trình duyệt bằng taste-skill ghi nhận wrapper có 2 `FAIL`/5 `WARN`; phần app nhúng có 9 `FAIL`/5 `WARN`.
- Các vấn đề chính: nhịp typography và hierarchy thiếu nhất quán, bố cục mang tính preview, nhiều motif UI lặp, chưa có luồng thư viện PDF thực tế, chưa có cấu trúc test độc lập.

## Biện pháp an toàn

- Không sửa hoặc xóa source ban đầu.
- Đã sao lưu nguyên trạng tại `backups/BienEdu-original.html`.
- SHA-256 source và backup trùng nhau: `57AECB7E61612E922CA01A06065FACA71FCC23B3E14DF8876F533758717B9ADA`.
- Source nhúng đã được trích xuất chỉ để audit tại `.audit/embedded-original.html`.

## Kế hoạch đã thực hiện

1. Giữ stack HTML/CSS/JavaScript thuần và chuyển sang ES Modules.
2. Tách layout dùng chung, data, domain logic và presentation theo trách nhiệm.
3. Xây năm trang trong đúng phạm vi: Home, Course, Documents, Quiz, Contact.
4. Dùng data thật đã kiểm chứng; hiển thị empty state thay vì dựng giả 39 tài liệu.
5. Bổ sung kiểm thử domain, kiểm tra link/tài nguyên và render ở 375/768/1024/1440px.
