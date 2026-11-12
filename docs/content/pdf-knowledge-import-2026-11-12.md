# Nhập kiến thức PDF vào bản local — 12/11/2026

Trạng thái: đã nhập chữ, công thức, bảng và phương pháp/lưu ý được nhận diện từ cả 8 PDF. **Chưa hoàn tất phần hình:** còn 30 khối hình minh họa/đồ thị cần bản dựng native; không dùng ảnh cắt PDF hoặc đoán tọa độ để thay thế. Không tuyên bố toàn bộ tài liệu đã hoàn thành cả hình.

## Nội dung đã nhập

- Quét 394 trang của 8 PDF độc lập trong `39 chuyên đề`.
- 370 phần: kiến thức, phương pháp, lưu ý và bảng tổng hợp; không phải 370 bài tập mới.
- 1.358 nút biểu thức toán được kiểm tra qua Canonical Math Format và Common KaTeX Renderer.
- 22 khối bố cục khó được chép lại đúng từ trang gốc, ràng buộc bằng hash glyph; không sửa nội dung toán.
- Không còn khối chữ/công thức bị bộ nhập đánh dấu chưa chuyển đổi. Điều này là kết quả kiểm tra chuyển đổi, không phải chứng nhận con người đã duyệt toàn bộ nội dung toán.
- Giữ riêng hai bản PDF nguyên hàm/tích phân; bản khác nằm trong phần mở rộng, không trộn nội dung và không dùng TEX để thay nội dung PDF.
- Không cần bước duyệt biên tập thủ công. Cú pháp không hợp lệ hoặc phạm vi toán chưa xác định vẫn chặn kích hoạt, không xuất chữ đỏ hay đoán công thức.

| Nguồn PDF | Phần kiến thức/phương pháp/lưu ý | Khối hình chưa dựng |
| --- | ---: | ---: |
| C12-CD13-CD14 | 53 | 1 |
| Dãy số – Cấp số CD17–CD19 | 17 | 0 |
| Hàm số – Đạo hàm CD01–CD07 | 78 | 0 |
| Lượng giác CD15–CD16 | 17 | 0 |
| Lý thuyết tổ hợp/xác suất, nội dung CD20–CD21 | 27 | 0 |
| Mũ – Logarit CD08–CD11 | 101 | 1 |
| Nguyên hàm – Tích phân CD12–CD14, bản độc lập mới | 27 | 0 |
| Vectơ – Oxyz CD28–CD33 | 50 | 28 |

## Những lỗi chuyển đổi đã xử lý

- Không dùng font làm dấu phân chia duy nhất: `sin`, `cos`, `log` có thể dùng font văn bản trong PDF còn số mũ dùng font toán.
- Gom cận dưới đặt giữa chữ `lim`, thay vì gắn biến giới hạn nhầm vào dấu phẩy hoặc dấu bằng trước đó.
- Giữ chỉ số văn bản tiếng Việt, ví dụ `q_{\text{vào}}`; không tách chữ “vào” ra khỏi công thức.
- Giữ cận lồng nhau `\varphi(a)`, `\varphi(b)`, chỉ số tổng/tích phân và điều kiện nguồn.
- Không bỏ dấu tích phân khi PyMuPDF đặt nó chung block với tiêu đề phía trước.
- Bảng được đưa thành ô HTML riêng; không nối các giá trị cùng hàng thành một tích toán học sai.
- Tách hình khỏi chữ trước khi chuyển đổi để một hình chưa hỗ trợ không làm mất cả phần kiến thức xung quanh.

## Tích hợp và bảo toàn

`documents.html` dùng hai facade mới qua import map: `knowledge-pdf.js` và `pdf-knowledge-renderer.js`. Chúng dùng lại dữ liệu bài cũ và Common Math Renderer, không tạo bộ KaTeX thứ hai.

Không đổi ID tiến độ, kho bài tập, cách chấm điểm hay dữ liệu ví dụ đang kích hoạt. Không sửa PDF/TEX gốc. Kiểm thử đối chiếu byte xác nhận payload học tập trước đó, các file sửa toán cũ và phụ thuộc lịch sử vẫn được giữ nguyên. Không áp dụng đợt 26 trường V5.6 đang chờ.

Các bản JSON nhập là bất biến, đặt theo SHA-256 tại `assets/content/pdf-knowledge/`. Con trỏ hiện tại: `assets/js/data/pdf-knowledge-release.js`. Biên nhận local: `.audit/pdf-knowledge/activation.json`; các bản HTML/con trỏ trước đó nằm trong `.content-work/pdf-knowledge/`. Không sửa manifest, backup hoặc journal cũ để hợp thức hóa phiên bản mới. Bản cấp quyền xuất bản trước đây không dùng lại cho thay đổi runtime này; cần preview mới trước khi xuất bản về sau.

## Kiểm tra thực tế

| Lệnh/kiểm tra | Kết quả |
| --- | --- |
| Bộ kiểm thử PDF mới cùng Knowledge, LaTeX, điều hướng, tiến độ và Practice | exit 0; 56 đạt, 0 lỗi |
| Playwright `pdf-knowledge-browser.test.mjs` | exit 0; 1 đạt, 0 lỗi; 28 trạng thái trang học, 740 lượt render nguồn trên 1366px/390px |
| Bài tập và tải lại trang | Phản hồi và tiến độ giữ nguyên |
| KaTeX, JavaScript, tràn ngang trang | Không phát hiện lỗi trong kiểm tra trình duyệt; đã xem ảnh chụp thực tế |
| `npm.cmd run check` | exit 0; 62 module JavaScript, 6 HTML |
| `git diff --check` | exit 0 |
| `npm.cmd test`, bộ lịch sử chạy trực tiếp | exit 1; 253 kiểm thử, 228 đạt, 25 lỗi — **không tuyên bố toàn bộ bộ cũ đã xanh** |
| `npm.cmd run verify` | exit 1; bị manifest xuất bản cũ chặn tại `Unknown target bytes: documents.html`, chưa chạy các kiểm thử bên trong |
| `npm.cmd run test:source-first` | exit 1; bị cùng kiểm tra hash chặn, chạy sau `verify`, không chạy đồng thời |

Các lỗi lịch sử gồm giả định byte runtime V5.5 còn là phiên bản đang chạy, phụ thuộc/manifest release trước và staging/review evidence cũ. Không xóa assertion hay cập nhật hash manifest lịch sử để ép qua. Các audit projection do bộ cũ tái sinh đã được phục hồi đúng nội dung trước lượt chạy; không giữ các thay đổi phát sinh đó trong bản cập nhật.

Lệnh chạy lại bộ kiểm thử liên quan:

```powershell
node --test tests/pdf-knowledge.test.mjs tests/knowledge-content.test.js tests/learning-progress.test.js tests/lesson-workspace.test.js tests/practice-bank.test.js tests/latex-rendering.test.js
node --test tests/pdf-knowledge-browser.test.mjs
```

## Chạy local

```powershell
cd D:\BienEdu
python -m http.server 8000
```

Mở `http://localhost:8000/documents.html?grade=12`. Nếu cổng 8000 đang được dùng, sử dụng server hiện có hoặc đổi cổng sang 8001. Không mở HTML bằng `file://`.

Nhập lại từ PDF gốc, tạo backup và kích hoạt local (không commit/push/deploy):

```powershell
node scripts/source-first/import-pdf-knowledge.mjs --apply
```

Không có commit, push, triển khai production hoặc thay đổi tiến độ học viên được thực hiện trong lượt này.
