# Content migration report

Generated: 2026-11-04T04:20:25.369Z

## 1. Root Cause Analysis — CD01

- PDF CD01–CD07 trang 4 có khối **Kiến thức cần nhớ** trước heading **Dạng 1.1**.
- Importer cũ chia section bắt đầu từ heading dạng bài, vì vậy toàn bộ khối kiến thức cấp chuyên đề đứng trước 1.1 không đi vào lesson data.
- Hàm **make_lesson** chỉ lấy câu sau nhãn **Cách làm** làm **reading.lead**; đây là lý do 1.1 chỉ hiển thị “Đạo hàm từng hạng; hằng số mất đi.”
- Renderer và content ID không làm mất dữ liệu. **createLessonSlides** nhận một reading không có trường **pages** nên tạo đúng một knowledge slide; sidebar vì thế hiển thị 1/1 bài đọc.
- Bài tập CD01 trống vì nguồn phân loại 10 mục mỗi dạng là **Ví dụ**, không phải ngân hàng bài tập độc lập, và runtime không có câu hỏi CD01 đã kiểm chứng. Hệ thống fail-closed thay vì tạo đáp án giả.
- Không có fallback từ tiêu đề registry. Nội dung ngắn là dữ liệu thật nhưng bị dùng sai vai trò như toàn bộ bài giảng.

### Sửa đã triển khai

- Khôi phục khối Kiến thức cần nhớ CD01 từ trang 4 thành Markdown + LaTeX có source page.
- 1.1 hiện có hai bài đọc: tổng quan kiến thức nguồn và phương pháp riêng của dạng 1.1.
- Mở rộng boundary mapping 1.1 từ tọa độ heading Kiến thức cần nhớ, không chỉ từ heading Dạng 1.1.
- Xóa ghi chú fallback chung khi PDF không có lưu ý cụ thể.
- Nội dung foundation chỉ được gắn **reviewStatus=verified** khi đã đối chiếu trực tiếp đề và lời giải với PDF. Đợt này xác minh 1.1, 8.1 và 8.4; mọi dạng còn lại tiếp tục **needs-review**.

## 2. CD12 làm chuẩn tham chiếu

- Nguồn: **cd12-cd14-calculus**, 49 trang.
- Kiến trúc tốt được tái sử dụng: registry duy nhất, source page mapping, structured reading, KaTeX strict parsing, example/practice tách riêng, stable progress ID và immutable approval record.
- CD12 không được xem là đúng tuyệt đối: hiện chỉ 12.1 có đủ reviewer, source hash, formula check và boundary check. Các mục còn lại tiếp tục ở trạng thái needs-review.

## 3. PDF inventory

- 4 PDF nguồn, 243 trang.
- Chi tiết: [pdf-inventory.md](./pdf-inventory.md).

## 4. Topic coverage

- Registry: 39 chuyên đề / 361 dạng bài.
- Có PDF và nội dung imported: 16 chuyên đề.
- Chưa có PDF mapping: 23 chuyên đề.
- Ma trận đầy đủ: [topic-coverage-report.md](./topic-coverage-report.md).

## 5. Foundation example inventory

- Đề nguồn: 1210; lời giải nguồn: 1210.
- Có thể chuyển đổi text sau bộ lọc hình: 1022.
- Phụ thuộc đồ thị/hình/bảng: 188; các mục này giữ asset reference và được kiểm tra khả năng tải hình trong browser QA.
- Đang publish có provenance: 1210; trong đó 30 ví dụ đã đối chiếu PDF và 1180 ví dụ vẫn hiện cảnh báo **needs-review** khi mở lời giải.

## 6. Implementation Summary

- Pipeline hiện kiểm kê PDF theo hash, text layer, heading, page count và mapping registry.
- Manifest dùng lại được: [content-manifest.json](./content-manifest.json).
- Knowledge/Example/Practice dùng cùng content registry; PDF viewer không được đưa trở lại.
- Progress ID cũ được giữ nguyên; bài đọc mới không tự đánh dấu đã xem.
- Batch Learning Experience V3 sửa trực tiếp `scripts/import-foundation-documents.py`, dữ liệu sinh `assets/js/data/foundation-lessons.generated.js`, renderer dùng chung và CSS Learning Workspace; không đổi Exercise module hay progress ID.
- Kiến trúc hiện tại lưu bài đọc có cấu trúc trong JavaScript rồi render thành Markdown + LaTeX; không tạo file Markdown bài học rời chỉ để nhân đôi một nguồn dữ liệu đang hoạt động.
- 1.1, 8.1 và 8.4 dùng bản chép đề/lời giải đã đối chiếu trực tiếp với trang PDF; override nằm trong importer để lần import sau không làm tái xuất hiện lỗi phân số, căn và số mũ do text layer.
- Renderer Example chỉ còn một đề bài, một khối lời giải đóng mặc định và một footer nguồn. Không lặp tiêu đề đề bài hay đáp án ở card thứ hai.
- Test khóa nguyên nhân CD01, inventory 39 chuyên đề, trạng thái review, ký hiệu nguồn 1.1/8.1/8.4 và khả năng parse toàn bộ công thức nhập khẩu.

## 7. Validation status

- Registry errors: 0.
- Source warnings: 1.
- Checkpoint 2026-11-04: unit/data test đạt 108/108; content validation và source check được chạy lại từ pipeline hiện tại.
- KaTeX strict parsing đạt 1.662/1.662 formula slots nhập khẩu và 93/93 biểu thức approved; kiểm tra trình duyệt đạt 64 Knowledge routes và 64 Example routes, không có lỗi công thức trên desktop.
- Playwright Learning Experience V3 và V4 kiểm tra CD01, CD08, CD12 và CD20 trên 1920×1080, 1366×768, 768×1024 và 390×844; gồm lời giải đóng/mở, trạng thái đã xem, Back/Forward, scroll restoration, phím mũi tên, hình nguồn và Exercise regression.
- Không có page-level overflow, KaTeX error, công thức bị cắt hoặc điều khiển thiếu accessible name trong các route đại diện.
- Project tĩnh không cấu hình build/typecheck riêng; source check và Node syntax check đều đạt. Test kỹ thuật không thay cho kiểm duyệt toán học.
- Screenshot V4: `.audit/learning-v4-index-1366x768.png`, `.audit/learning-v4-example-context-1366x768.png`, `.audit/learning-v4-viewed-768x1024.png` và `.audit/learning-v4-mobile-390x844.png`.
- Regression `npm.cmd run verify` đạt toàn bộ: V15 Learning Workspace (7 viewport), V16/V16.1 onboarding và đăng ký, homepage scroll và polish pass (10 viewport); không có runtime error hoặc page-level horizontal overflow.

## 8. Chưa hoàn thành

- 1180 ví dụ foundation đã nhập nhưng chưa được con người đối chiếu từng dòng với PDF; không được tự nâng thành verified.
- Ngoài 1.1, 8.1 và 8.4, các dạng CD01–CD11 vẫn cần source review đầy đủ dù renderer và KaTeX đã qua kiểm tra kỹ thuật.
- CD15–CD19 và CD22–CD39 chưa có PDF nguồn được mapping trong workspace.
- 9 đáp số CD12–CD14 có xung đột nguồn đã biết vẫn giữ needs-review và không auto-grade.
- Không có lỗi kỹ thuật nghiêm trọng còn mở tại checkpoint; các mục trên là thiếu nguồn hoặc thiếu bằng chứng kiểm duyệt, không được che bằng placeholder.

## 9. Completion criteria

Mỗi chuyên đề tiếp tục được theo dõi riêng qua bốn giai đoạn: **Converted → Imported → Validated → Published**. Không chuyên đề nào được báo Done chỉ vì extraction hoặc test kỹ thuật thành công.
