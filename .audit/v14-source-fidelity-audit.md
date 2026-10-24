# BIENEDU V14 — Kiểm toán độ trung thành nguồn

Generated: 2026-10-24T04:40:58.218Z

## Kết luận kiểm toán

- Đã mở và kiểm tra đủ 67/67 trang của hai PDF bằng text/geometry extraction và bộ ảnh page review.
- Đã lập traceability cho 51 bài có nguồn, 379 block Knowledge và 173 biểu thức công thức đang render.
- Chỉ 3/51 bài hiện có immutable review record đủ reviewer, source hash, formula check và boundary check: 12.1, 20.1, 20.2.
- 48 bài còn lại không được V14 tự động nâng thành verified: 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8, 20.9, 20.10, 20.11, 20.12, 20.13, 20.14, 20.15, 20.16, 20.17, 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 21.8.
- Vì còn hàng đợi review, báo cáo này không tuyên bố migration V14 đã hoàn tất toàn bộ.

## 1. PDF đã kiểm tra

| Tài liệu | Trang | SHA-256 | Phạm vi xác nhận |
| --- | ---: | --- | --- |
| assets/documents/ly-thuyet-to-hop-xac-suat-thong-ke-cd20-cd23.pdf | 18 | `66B1D93392F834CA8659902CE7F1020F7CB3220C758DF1D697837340840E9293` | CD20, CD21 |
| assets/documents/bienedu-nguyen-ham-tich-phan-cd12-cd14.pdf | 49 | `4E65F476DA0A1B817A05B6E829737100B753A2E5219236F719ACAB016F221E59` | CD12, CD13, CD14 |

## 2. Trang nguồn đã xem

- C12-CD13-CD14.pdf: trang 1–49; nội dung bài học ở trang 3–48, trang 49 là bảng tổng hợp được ghi nhận bằng trạng thái excluded-with-reason.
- PDF tổ hợp–xác suất: trang 1–18; bài học thực tế dừng ở CD21.8, không có bài CD22/CD23.

## 3. Chủ đề và bài đã audit

| Chủ đề | Bài có mapping | Verified V14 | Needs review | Biểu thức runtime |
| --- | ---: | ---: | ---: | ---: |
| CD12 | 9 | 1 | 8 | 60 |
| CD13 | 8 | 0 | 8 | 31 |
| CD14 | 9 | 0 | 9 | 29 |
| CD20 | 17 | 2 | 15 | 39 |
| CD21 | 8 | 0 | 8 | 14 |

## 4. Công thức đối chiếu

- Inventory runtime: 173 biểu thức.
- Có immutable source approval: 26 biểu thức thuộc 12.1, 20.1, 20.2.
- 12.1 đã khôi phục bảng nguyên hàm, hàng $\int 1\,dx=x+C$, dạng $1/\cos^2x$, $1/\sin^2x$ và các điều kiện $n\ne-1$, $a>0$, $a\ne1$.
- Các biểu thức thuộc bài chưa approved vẫn ở trạng thái needs-review dù KaTeX có thể parse thành công.

## 5. Công thức đã sửa

- 12.1: bỏ hai thay thế ký hiệu sec²/csc²; khôi phục đúng hai dạng phân thức lượng giác nguồn.
- 12.1: khôi phục hàng nguyên hàm của 1 và toàn bộ bảng bốn cột bị Marker làm mất.
- 12.1: sửa các phân số, số mũ và delimiter hỏng trong ví dụ, bài tự luyện và đáp số; 23 correction có provenance.

## 6. Công thức bị thiếu đã khôi phục

- $\int 1\,dx=x+C$.
- Toàn bộ hàng của bảng công thức trang 3 trong immutable review record 12.1.

## 7. Thay đổi ký hiệu đã hoàn nguyên

- $\sec^2x$ → $1/\cos^2x$.
- $\csc^2x$ → $1/\sin^2x$.
- Rule kiểm tra chỉ áp dụng cho document CD12–CD14; không cấm sec/csc ở tài liệu tương lai có bằng chứng nguồn.

## 8. Điều kiện đã khôi phục

- $n\ne-1$.
- $a>0$, $a\ne1$ cho $a^x$.
- $a>0$ cho $\int dx/(a^2+x^2)$.
- Điều kiện từng bài tự luyện 12.1 được giữ cùng biểu thức liên quan.

## 9. Định nghĩa và giải thích

- Định nghĩa nguyên hàm và mệnh đề các nguyên hàm chỉ sai khác hằng số ở 12.1 đã trở về câu nguồn.
- Các bài chưa có immutable review record vẫn phải đối chiếu nguyên văn prose; không được xem nhãn verified cũ là bằng chứng V14.

## 10. Ví dụ có lời giải

- Immutable record 12.1 giữ Ví dụ 1, Ví dụ 2 và phép kiểm tra đạo hàm.
- Immutable record 20.2 giữ ba ví dụ nguồn và hình sơ đồ trang 6.
- Các example object còn lại có mapping và source pages nhưng prose dựng lại vẫn nằm trong hàng đợi review V14.

## 11. Hạng mục còn phải review

- 48 subtopic chưa có immutable source approval.
- 9 đáp số tự luyện calculus có xung đột hoặc mơ hồ đã biết; giữ nguyên đáp số nguồn, không auto-grade.
- Không publish record Marker/PyMuPDF còn formula flag hoặc thiếu reviewer evidence.

## 12. Coverage theo chủ đề

Bảng ở mục 3 là trạng thái source-fidelity. Coverage cấu trúc và trạng thái runtime tiếp tục được báo cáo riêng trong `.audit/content-coverage.md`.

## 13. Tệp thay đổi chính

- `assets/js/data/calculus-knowledge-details.js`
- `assets/content/approved/cd12-cd14-calculus/12.1/`
- `assets/js/data/approved-math-content.js`
- `scripts/math-pdf/normalize.mjs`
- `scripts/content-pipeline.mjs`
- Các test Knowledge, LaTeX và PDF pipeline liên quan.

## 14. KaTeX

Chạy `npm.cmd run test:latex`. Mọi raw LaTeX trong immutable approved records phải parse strict; số lượng parse được báo bởi test, không thay cho source review.

## 15. Playwright

Chạy `npm.cmd run test:v13` sau mỗi đợt publish để kiểm tra 12.1, 12.4, 13.1, 14.1, 20.1, 20.2, 20.17, 21.1 và 21.8 trên mobile/desktop.

## 16. Regression

Chạy `npm.cmd run verify` và `git diff --check`. Progress ID, direct links và navigation phải giữ nguyên.

## 17. Quy trình nhập PDF tương lai

```powershell
npm.cmd run content:scan
npm.cmd run content:math:doctor
npm.cmd run content:math:extract -- --subtopic 12.1 --provider marker --disable-ocr
npm.cmd run content:math:validate -- --subtopic 12.1
npm.cmd run content:math:correct -- --subtopic 12.1 --corrections content/review/<document>/<code>.corrections.json
npm.cmd run content:math:approve -- --subtopic 12.1 --reviewer "Tên người review" --source-verified --formulas-verified --boundaries-verified
npm.cmd run content:math:publish -- --subtopic 12.1
npm.cmd run content:validate
npm.cmd run verify
```

Không dùng `--replace-review` với record verified. Nội dung mới chỉ được publish sau khi source hash, ranh giới và toàn bộ công thức đã được đối chiếu.
