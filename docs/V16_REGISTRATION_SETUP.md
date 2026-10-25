# Thiết lập biểu mẫu đăng ký V16.1

## Trạng thái hiện tại

- Kênh liên hệ đã xác minh: Zalo `0943 943 151` (`https://zalo.me/0943943151`).
- Nhà cung cấp biểu mẫu đã chuẩn bị: Formspree.
- Endpoint Formspree: **chưa được cấu hình**.
- Vì chưa có endpoint nhận dữ liệu thật, nút gửi trên website đang bị vô hiệu hóa và website không hiển thị thông báo gửi thành công.

## Cách kết nối Formspree

1. Tạo hoặc chọn một biểu mẫu trong tài khoản Formspree chính thức của BienEdu.
2. Xác minh địa chỉ nhận thông báo trong Formspree.
3. Sao chép endpoint HTTPS có dạng `https://formspree.io/f/xxxxxxxx`.
4. Mở `assets/js/data/registration-config.js`.
5. Trong mục `registration`, giữ `provider: "formspree"` và điền endpoint thật vào `endpoint`.
6. Chạy:

   ```powershell
   npm.cmd test
   npm.cmd run test:v16
   npm.cmd run verify
   ```

7. Thực hiện một đăng ký thử bằng dữ liệu kiểm thử, xác nhận Formspree trả HTTP thành công và thông tin đã đến đúng hộp thư nhận.
8. Xóa dữ liệu kiểm thử khỏi hệ thống nhận nếu không còn cần thiết.

Không đưa khóa riêng hoặc thông tin đăng nhập Formspree vào JavaScript phía trình duyệt. Endpoint công khai của biểu mẫu là giá trị cấu hình duy nhất cần dùng trong frontend.
