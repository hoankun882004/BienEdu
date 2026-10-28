# Content migration report

Generated: 2026-10-28T13:35:32.061Z

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
- Nội dung foundation được gắn **conversionStatus=imported** và **reviewStatus=needs-review**; không tự nâng thành verified.

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
- Phụ thuộc đồ thị/hình/bảng: 188; chưa publish vì asset chưa được gắn đúng vị trí.
- Đang publish chọn mẫu có provenance: 1210; còn -188 candidate trong hàng đợi review, không tự động phát hành hàng loạt.

## 6. Implementation Summary

- Pipeline hiện kiểm kê PDF theo hash, text layer, heading, page count và mapping registry.
- Manifest dùng lại được: [content-manifest.json](./content-manifest.json).
- Knowledge/Example/Practice dùng cùng content registry; PDF viewer không được đưa trở lại.
- Progress ID cũ được giữ nguyên; bài đọc mới không tự đánh dấu đã xem.
- Batch này sửa trực tiếp `scripts/import-foundation-documents.py`, dữ liệu sinh `assets/js/data/foundation-lessons.generated.js`, source boundary `knowledge-pdf-mappings.js`, content registry, Markdown/KaTeX renderer và CSS dùng chung.
- Kiến trúc hiện tại lưu bài đọc có cấu trúc trong JavaScript rồi render thành Markdown + LaTeX; không tạo file Markdown bài học rời chỉ để nhân đôi một nguồn dữ liệu đang hoạt động.
- CD01 là chuyên đề được sửa nội dung trong Batch 1. CD02–CD14 và CD20–CD21 được audit/mapping lại trạng thái; không ghi đè nội dung đã có bằng extraction chưa duyệt.
- Test mới khóa nguyên nhân CD01, inventory 39 chuyên đề, số lượng candidate nguồn, trạng thái review và khả năng parse toàn bộ công thức nhập khẩu.

## 7. Validation status

- Registry errors: 0.
- Source warnings: 1.
- Checkpoint 2026-10-28: source check đạt trên 39 JavaScript / 5 HTML; unit và data test đạt 101/101.
- KaTeX strict parsing đạt 547/547 formula slots; kiểm tra trình duyệt đạt 316 Knowledge routes và 378 Example routes, không có lỗi công thức trên desktop.
- Playwright Learning Workspace đạt 10 representative routes trên 8 viewport, gồm đủ 1920×1080, 1366×768, 768×1024 và 390×844.
- 10 biểu thức dài cần cuộn ở cấp phương trình trên mobile; không có page-level overflow hay công thức bị cắt. Đây là fallback responsive có chủ đích.
- Project tĩnh không cấu hình build/typecheck riêng; source check và Node syntax check đều đạt. Test kỹ thuật không thay cho kiểm duyệt toán học.
- Screenshot kiểm tra CD01: `.audit/content-migration-cd01-1-1-1366x768.png`, `.audit/content-migration-cd01-1-1-390x844.png` và hai ảnh page 2 tương ứng.
- Regression `npm.cmd run verify` đạt toàn bộ: V15 Learning Workspace (7 viewport), V16/V16.1 onboarding và đăng ký, homepage scroll và polish pass (10 viewport); không có runtime error hoặc page-level horizontal overflow.

## 8. Chưa hoàn thành

- CD02–CD11 còn các khối Kiến thức cần nhớ cấp chuyên đề cần chuyển đổi có review như CD01.
- -188 ví dụ text-complete chưa được review để publish; 188 ví dụ cần asset hình/đồ thị.
- CD15–CD19 và CD22–CD39 chưa có PDF nguồn được mapping trong workspace.
- 9 đáp số CD12–CD14 có xung đột nguồn đã biết vẫn giữ needs-review và không auto-grade.
- Không có lỗi kỹ thuật nghiêm trọng còn mở tại checkpoint; các mục trên là thiếu nguồn hoặc thiếu bằng chứng kiểm duyệt, không được che bằng placeholder.

## 9. Completion criteria

Mỗi chuyên đề tiếp tục được theo dõi riêng qua bốn giai đoạn: **Converted → Imported → Validated → Published**. Không chuyên đề nào được báo Done chỉ vì extraction hoặc test kỹ thuật thành công.
