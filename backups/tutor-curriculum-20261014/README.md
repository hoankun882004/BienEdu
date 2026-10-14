# BienEdu Math 12

Trang web tĩnh HTML/CSS/JavaScript thuần, gồm năm khu vực: trang chủ, khóa học, tài liệu, kiểm tra kiến thức và liên hệ.

## Chạy trên Windows

Mở PowerShell tại thư mục dự án và chạy một trong hai lệnh:

```powershell
py -m http.server 8000
```

hoặc:

```powershell
python -m http.server 8000
```

Sau đó mở `http://localhost:8000/`.

Không nên mở trực tiếp bằng `file://` vì website dùng ES Modules.

## Kiểm thử logic quiz

```powershell
npm.cmd test
```

`npm.cmd` tránh lỗi PowerShell execution policy thường gặp với file `npm.ps1` trên Windows.

## Thêm tài liệu PDF

1. Chép PDF thật vào một thư mục con trong dự án, ví dụ `assets/documents/`.
2. Thêm metadata tương ứng vào `assets/js/data/documents.js`.
3. Không thêm tên chuyên đề nếu chưa có file PDF tương ứng.

Mỗi record hỗ trợ các trường: `id`, `title`, `category`, `description`, `url`, `downloadable`.

## Dữ liệu liên hệ

Form hiện chỉ kiểm tra dữ liệu trên trình duyệt. Dự án chưa có backend, email, hotline hoặc địa chỉ thật nên không gửi hoặc lưu nội dung.
