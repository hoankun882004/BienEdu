# Compact UI critique

ROUND 1
Seen in one second: Một website học Toán có cấu trúc tốt nhưng bị copy kỹ thuật và footer quá khổ làm loãng nội dung.
Idea (one sentence): Lộ trình Toán 12 được trình bày như một niên giám học tập, với nội dung thật là phần nổi bật nhất.
Live thing: Tìm kiếm, lọc và mở 39 chuyên đề; bài kiểm tra 10 câu; liên kết Zalo.
Layout words by section: home=mosaic / course=editorial split / curriculum=banded index / tutor=profile field / footer=oversized wordmark.
Scores: design 7.7 · usability 8.1 · creativity 8.0 · content 7.2 → overall 7.8
Caps applied: none.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. Các câu về “source”, “catalog”, “Excel” và “chưa có PDF” xuất hiện lặp lại như ghi chú kỹ thuật (`compact-baseline-home/desktop-page-01.jpg`, `compact-baseline-docs/desktop-fold.jpg`); xóa khỏi giao diện và giữ trạng thái tài liệu ngay tại từng chuyên đề.
2. Footer wordmark chiếm gần một màn hình và đẩy thông tin liên hệ quá xa (`compact-baseline-tutor/desktop-page-02.jpg`); thay bằng footer ba cột gọn.
3. Trang chủ và Khóa học vẫn nói về “form tư vấn” và “giao diện demo” sau khi trang liên hệ đã thành hồ sơ gia sư (`compact-baseline-course/desktop-page-02.jpg`); đổi CTA sang lộ trình và hồ sơ gia sư.

ROUND 2
Seen in one second: Một hệ giao diện gọn, trực tiếp và nhất quán, không còn nội dung giải thích quy trình nội bộ.
Idea (one sentence): Dữ liệu học tập và hồ sơ thật được ưu tiên; phần chrome chỉ hỗ trợ điều hướng.
Live thing: Tìm kiếm không dấu, lọc nhóm, accordion chuyên đề, quiz và Zalo vẫn hoạt động nguyên vẹn.
Layout words by section: home=mosaic / course=editorial split / curriculum=banded index / tutor=profile field / footer=compact utility band.
Scores: design 8.2 · usability 8.9 · creativity 8.0 · content 8.8 → overall 8.5
Caps applied: none; các viewport cuối không có `FAIL`.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. Bốn ảnh học tập vẫn lặp lại giữa các trang (`compact-final-home-2/desktop-page-02.jpg`); thay bằng ảnh lớp học thật khi có nguồn xác thực.
2. Trang chủ vẫn dài hơn các trang còn lại vì giữ đủ hành trình học và quiz (`compact-final-home-2/mobile-page-01.jpg`); chấp nhận vì mỗi phần còn một nhiệm vụ riêng.
3. Chưa có video lớp học thật nên chuyển động chỉ đến từ reveal và drift; không thêm footage thay thế thiếu trung thực.

ROUND 3
Seen in one second: BienEdu có nhận diện thật, header ngắn và một hệ trang học tập liền mạch hơn.
Idea (one sentence): Logo sách–mũ tốt nghiệp–sóng mở đầu mỗi trang, còn nội dung học tập chiếm phần diện tích chính.
Live thing: Lộ trình có tìm kiếm/lọc/accordion, quiz và Zalo vẫn hoạt động nguyên vẹn.
Layout words by section: header=compact brand bar / home=centred copy + mosaic / curriculum=banded index / tutor=profile field / footer=single utility row.
Scores: design 8.4 · usability 9.0 · creativity 8.1 · content 8.8 → overall 8.6
Caps applied: none; các trang kiểm tra cuối có 0 `FAIL`, 0 `WARN`.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. Hero Trang chủ từng để mô tả ở đáy cột và tạo một khoảng trắng lớn (`logo-compact-home/desktop-fold.jpg`); gom headline, mô tả và CTA thành một cụm giữa cột (`logo-compact-home-final/desktop-fold.jpg`).
2. Điều hướng lặp “Trang chủ”, “Làm bài thử” và toàn bộ menu ở footer; logo nay dẫn về trang chủ, header còn bốn mục và footer chỉ giữ Zalo.
3. Khối hồ sơ gia sư lặp lại học vấn/kinh nghiệm giữa hero và hình thức học; xóa khối trùng, rút trang từ 3.3 xuống 2.9 màn hình desktop.
