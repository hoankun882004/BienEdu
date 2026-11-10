# BienEdu PDF Import Pipeline

Hệ thống import tự động cho các file PDF và TeX từ thư mục `C:\NINHHN\BienEDU\TaiLieu`.

## Cấu trúc

```
scripts/pdf-import/
├── file-catalog.mjs      ← Map tên file → document ID, topic codes
├── pdf-scanner.mjs       ← Quét thư mục, tính SHA-256, nhận dạng file
├── document-registry.mjs ← Cập nhật document-mappings.js & knowledge-pdf-mappings.js
├── batch-import.mjs      ← Pipeline batch: extract → normalize → review
├── tailieu-import.mjs    ← Entry point chính cho TaiLieu
└── README.md             ← File này
```

## Workflow

```
TaiLieu/*.pdf
     │
     ▼ pdf-scanner.mjs (nhận dạng document ID, tính SHA-256)
     │
     ▼ document-registry.mjs (thêm vào document-mappings.js nếu cần)
     │
     ▼ marker extract (trích xuất JSON từ từng subtopic)
     │
     ▼ normalize.mjs (chuẩn hoá blocks, assign sections)
     │
     ▼ content/review/DOCUMENT_ID/CODE.json + .md
     │
     ▼ Manual review + approve + publish
```

## Lệnh sử dụng

### Scan nhanh (không import)
```bash
node scripts/pdf-import/pdf-scanner.mjs
# hoặc với thư mục khác:
node scripts/pdf-import/pdf-scanner.mjs --dir "C:\My\PDFs"
```

### Dry run (xem kế hoạch)
```bash
node scripts/pdf-import/tailieu-import.mjs --dry-run
```

### Import toàn bộ
```bash
node scripts/pdf-import/tailieu-import.mjs
```

### Import chỉ một topic
```bash
node scripts/pdf-import/tailieu-import.mjs --topic CD15
node scripts/pdf-import/tailieu-import.mjs --topic CD12
node scripts/pdf-import/tailieu-import.mjs --topic CD28
```

### Import với OCR bật
```bash
node scripts/pdf-import/tailieu-import.mjs --topic CD15 --force-ocr
```

### Ghi đè review cũ (chưa verified)
```bash
node scripts/pdf-import/tailieu-import.mjs --topic CD15 --replace-review
```

### npm scripts (thêm vào package.json)
```json
"pdf:scan":   "node scripts/pdf-import/pdf-scanner.mjs",
"pdf:import": "node scripts/pdf-import/tailieu-import.mjs",
"pdf:dry":    "node scripts/pdf-import/tailieu-import.mjs --dry-run"
```

## Sau khi import

Với mỗi subtopic CODE đã import thành công:

```bash
# 1. Validate (kiểm tra lỗi công thức)
npm run content:math:validate -- --subtopic CODE

# 2. Approve (sau khi đã đối chiếu PDF thủ công)
npm run content:math:approve -- \
  --subtopic CODE \
  --reviewer TEN \
  --source-verified \
  --formulas-verified \
  --boundaries-verified

# 3. Publish (đưa vào frontend)
npm run content:math:publish -- --subtopic CODE
```

## Thêm file PDF mới

1. Mở [`file-catalog.mjs`](./file-catalog.mjs)
2. Thêm entry vào `IMPORT_CATALOG`:

```js
{
  documentId: "cd34-cd39-geometry",   // ID mới
  topicIds: ["CD34", "CD35"],
  description: "Hình học không gian (CD34–CD35)",
  matchPatterns: [/hinh-hoc/i, /cd34/i],
},
```

3. Thêm mapping subtopic vào `knowledge-pdf-mappings.js` (nếu chưa có)
4. Chạy: `node scripts/pdf-import/tailieu-import.mjs --topic CD34`

## Các file TaiLieu hiện tại

| File | Document ID | Topics |
|---|---|---|
| `Ham-so-Dao-ham-*.pdf` | `cd01-cd07-functions` | CD01–CD07 |
| `CD08-Mu-Logarit.tex` | `cd08-cd11-exponential-logarithm` | CD08 |
| `Nguyen-ham-Tich-phan-*.pdf` | `cd12-cd14-calculus` | CD12–CD14 |
| `Luong-giac-*.pdf` | `cd15-cd16-trigonometry` | CD15–CD16 |
| `Day-so-Cap-so-*.pdf` | `cd17-cd19-sequences` | CD17–CD19 |
| `Oxyz-*.pdf` | `cd28-cd33-oxyz` | CD28–CD33 |
| `Vecto-Oxyz-*.pdf` | `cd28-cd33-oxyz` | CD28–CD33 |

