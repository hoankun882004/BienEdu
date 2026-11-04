# CD22 — Native LaTeX pilot

## 22.1 Xác suất có điều kiện P(A|B)

\(\mathrm{P}(A\mid B)\) là xác suất A xảy ra **khi đã biết B xảy ra**. Trong không gian mới B, phần thuận lợi cho A chính là A ∩ B.

### Công thức và nguyên tắc

$$
\mathrm{P}(A\mid B) = \frac{\mathrm{P}(A \cap B)}{\mathrm{P}(B)}
$$

với \(\mathrm{P}(B)\) > 0

### Cách hiểu nhanh

- Dấu “|” đọc là “với điều kiện”. Thứ tự A|B rất quan trọng.
- \(\mathrm{P}(A\mid B)\) và \(\mathrm{P}(B\mid A)\) thường khác nhau vì mẫu số khác nhau.
- Nếu dùng số lượng trong mô hình đồng khả năng: \(\mathrm{P}(A\mid B)\) = |A ∩ B|/|B|.

> **Sai lầm hay gặp:** Sau dấu “|” là điều đã biết và quyết định mẫu số. Đây là lỗi đảo điều kiện phổ biến nhất.

### Ví dụ nguồn

Trong lớp có 20 nữ, 12 nữ học giỏi; tổng cộng 40 học sinh, 18 học giỏi. Chọn ngẫu nhiên một học sinh. \(\mathrm{P}(\text{giỏi}\mid \text{nữ})\) = 12/20 = **0,6**, còn \(\mathrm{P}(\text{nữ}\mid \text{giỏi})\) = 12/18 = 2/3.

## 22.2 Công thức nhân

Biến đổi định nghĩa xác suất có điều kiện cho ta công thức nhân. Công thức mô tả một đường đi: xảy ra B trước, sau đó A xảy ra trong điều kiện B.

### Công thức và nguyên tắc

$$
\mathrm{P}(A \cap B) = \mathrm{P}(B)\mathrm{P}(A\mid B)
$$

$$
\mathrm{P}(A \cap B) = \mathrm{P}(A)\mathrm{P}(B\mid A)
$$

> **Mẹo nhận dạng:** Chọn thứ tự điều kiện sao cho các xác suất thành phần dễ biết nhất. Hai cách viết là tương đương.

### Ví dụ nguồn

Một máy hoạt động trong ngày với xác suất 0,98. Khi hoạt động, xác suất tạo sản phẩm đạt chuẩn là 0,97. Xác suất “máy hoạt động và sản phẩm đạt” là 0,98·0,97 = **0,9506**.

## 22.3 Sơ đồ cây

Sơ đồ cây biểu diễn phép thử nhiều giai đoạn. Mỗi cạnh ghi xác suất có điều kiện của nhánh đó. Các nhánh từ cùng một nút phải có tổng bằng 1.

### Công thức và nguyên tắc

Xác suất một đường đi = tích các xác suất trên đường. Xác suất một biến cố = tổng xác suất các đường rời nhau dẫn tới biến cố.

### Cách hiểu nhanh

- Tầng đầu: các nguồn hoặc trạng thái ban đầu.
- Tầng sau: kết quả có điều kiện theo nhánh trước.
- Nếu rút không hoàn lại, cập nhật cả tử và mẫu ở mỗi nhánh.
- Đánh dấu rõ nhánh nào tạo biến cố cần tìm trước khi cộng.

> **Sai lầm hay gặp:** Không cộng xác suất các cạnh liên tiếp trên cùng một đường; phải nhân. Chỉ cộng các đường rời nhau cùng dẫn tới biến cố.

### Ví dụ nguồn

Chọn hộp I với xác suất 0,4, hộp II với xác suất 0,6. Xác suất lấy bi đỏ lần lượt là 0,7 và 0,2. Xác suất lấy bi đỏ là 0,4·0,7 + 0,6·0,2 = **0,40**.

## 22.4 Công thức xác suất toàn phần

Giả sử B₁, ..., Bₙ tạo thành một phân hoạch của Ω: đôi một xung khắc, hợp bằng Ω và đều có xác suất dương. Khi đó A được chia thành các phần A ∩ Bᵢ.

### Công thức và nguyên tắc

$$
\mathrm{P}(A) = \sum \mathrm{P}(B_{i})\mathrm{P}(A\mid B_{i})
$$

### Cách hiểu nhanh

- Bᵢ thường là nguồn gốc: dây chuyền sản xuất, nhóm dân số, hộp được chọn, trạng thái thời tiết.
- Kiểm tra Σ\(\mathrm{P}(B_{i})\) = 1 trước khi tính.

> **Mẹo nhận dạng:** Công thức toàn phần đi theo chiều “biết nguồn -> tính kết quả”. Bayes đi ngược lại “biết kết quả -> suy ra nguồn”.

### Ví dụ nguồn

60% sản phẩm từ dây chuyền A có tỉ lệ lỗi 2%; 40% từ B có tỉ lệ lỗi 5%. Xác suất một sản phẩm lỗi là 0,6·0,02 + 0,4·0,05 = **0,032**.

## 22.5 Công thức Bayes

Bayes cập nhật xác suất của nguyên nhân Bⱼ sau khi đã quan sát kết quả A.

### Công thức và nguyên tắc

$$
\mathrm{P}(B_{j}\mid A) = \frac{\mathrm{P}(B_{j})\mathrm{P}(A\mid B_{j})}{\sum \mathrm{P}(B_{i})\mathrm{P}(A\mid B_{i})}
$$

### Cách hiểu nhanh

- \(\mathrm{P}(B_{j})\) là xác suất tiên nghiệm.
- \(\mathrm{P}(A\mid B_{j})\) là khả năng quan sát A nếu nguyên nhân Bⱼ đúng.
- \(\mathrm{P}(B_{j}\mid A)\) là xác suất hậu nghiệm sau khi có thông tin A.

> **Sai lầm hay gặp:** Không bỏ mẫu số xác suất toàn phần. Tử số chỉ là xác suất giao “nguyên nhân và kết quả”, chưa phải xác suất có điều kiện cần tìm.

### Ví dụ nguồn

Trong ví dụ hai dây chuyền, \(\mathrm{P}(B\mid \text{lỗi})\) = 0,4·0,05/0,032 = **0,625**. Dù B chỉ sản xuất 40%, nó tạo 62,5% số sản phẩm lỗi.

## 22.6 Bảng hai chiều

Bảng hai chiều ghi tần số hoặc xác suất theo hai tiêu chí. Tổng hàng, tổng cột giúp nhìn rõ mẫu số của xác suất có điều kiện.

### Cách hiểu nhanh

- \(\mathrm{P}(A)\) dùng tổng của hàng/cột tương ứng chia tổng toàn bảng.
- \(\mathrm{P}(A \cap B)\) dùng đúng ô giao của A và B chia tổng toàn bảng.
- \(\mathrm{P}(A\mid B)\) dùng ô giao chia tổng của cột/hàng B, không chia tổng toàn bảng.
- Kiểm tra độc lập bằng cách so \(\mathrm{P}(A\mid B)\) với \(\mathrm{P}(A)\), hoặc so tích chéo trong bảng 2×2.

> **Mẹo nhận dạng:** Khoanh hàng hoặc cột biểu diễn điều kiện sau dấu “|”; đó chính là không gian mẫu mới.

### Ví dụ nguồn

Nếu trong 200 người có 80 nữ, trong đó 28 người thích môn X, thì \(\mathrm{P}(\text{thích X}\mid \text{nữ})\) = 28/80 = **0,35**. Mẫu số 80 vì đã biết người được chọn là nữ.

## 22.7 Bài toán y tế - xét nghiệm

Các đại lượng chuẩn: độ nhạy = \(\mathrm{P}(+\mid \text{bệnh})\), độ đặc hiệu = \(\mathrm{P}(-\mid \text{không bệnh})\), tỉ lệ dương tính giả = 1 - độ đặc hiệu và tỉ lệ hiện mắc = \(\mathrm{P}(\text{bệnh})\).

### Công thức và nguyên tắc

$$
\mathrm{P}(\text{bệnh}\mid +) = \frac{\mathrm{P}(\text{bệnh})\mathrm{P}(+\mid \text{bệnh})}{\mathrm{P}(+)}
$$

trong đó \(\mathrm{P}(+)\) tính bằng xác suất toàn phần

### Cách hiểu nhanh

- Giá trị dự báo dương \(\mathrm{P}(\text{bệnh}\mid +)\) phụ thuộc mạnh vào tỉ lệ hiện mắc, không chỉ vào độ chính xác của xét nghiệm.
- Có thể đổi mọi xác suất thành số người trên 10 000 để trực quan và tránh nhầm điều kiện.

> **Sai lầm hay gặp:** \(\mathrm{P}(+\mid \text{bệnh})\) không phải \(\mathrm{P}(\text{bệnh}\mid +)\). Độ nhạy cao không đồng nghĩa mọi người dương tính đều mắc bệnh, nhất là bệnh hiếm.

### Ví dụ nguồn

Bệnh có ở 1% dân số; độ nhạy 95%; độ đặc hiệu 90%. \(\mathrm{P}(+)\) = 0,01·0,95 + 0,99·0,10 = 0,1085. Do đó \(\mathrm{P}(\text{bệnh}\mid +)\) ≈ **8,76%**.

## 22.8 Bài toán sản xuất - kiểm định

Mô hình thường có nhiều máy hoặc dây chuyền với tỉ trọng sản lượng khác nhau và tỉ lệ lỗi riêng. Xác suất toàn phần cho tỉ lệ lỗi chung; Bayes truy nguồn sản phẩm lỗi.

### Cách hiểu nhanh

- Bước 1: đặt Bᵢ = sản phẩm đến từ nguồn i; ghi \(\mathrm{P}(B_{i})\).
- Bước 2: đặt D = sản phẩm lỗi; ghi \(\mathrm{P}(D\mid B_{i})\).
- Bước 3: tính \(\mathrm{P}(D)\) = Σ\(\mathrm{P}(B_{i})\)\(\mathrm{P}(D\mid B_{i})\).
- Bước 4: nếu truy nguồn, dùng \(\mathrm{P}(B_{j}\mid D)\) = \(\mathrm{P}(B_{j})\)\(\mathrm{P}(D\mid B_{j})\)/\(\mathrm{P}(D)\).

> **Lưu ý:** Nếu kiểm định lấy mẫu không hoàn lại từ một lô nhỏ, các lần kiểm tra phụ thuộc; cần cập nhật số sản phẩm còn lại.

### Ví dụ nguồn

Dây chuyền A làm 70% sản lượng, lỗi 1%; B làm 30%, lỗi 4%. Tỉ lệ lỗi chung là 0,7·0,01 + 0,3·0,04 = **1,9%**. Trong số hàng lỗi, tỉ lệ từ B là 0,012/0,019 ≈ **63,16%**.

## 22.9 Bài toán nhiều bước

Bài nhiều bước kết hợp quy tắc nhân có điều kiện, cộng các đường đi và đôi khi Bayes. Sơ đồ cây hoặc bảng trạng thái giúp kiểm soát thông tin sau mỗi bước.

### Cách hiểu nhanh

- **Có hoàn lại::** thành phần và xác suất ở lần sau giữ nguyên; các lần thường độc lập nếu cách chọn giống nhau.
- **Không hoàn lại::** thành phần thay đổi; xác suất lần sau phụ thuộc các kết quả trước.
- **Dừng sớm::** mỗi đường có thể có độ dài khác nhau; chỉ cộng các đường kết thúc đúng điều kiện.
- **Quan sát một kết quả cuối::** nếu hỏi nguyên nhân hoặc nhánh trước đó, dùng Bayes.

> **Mẹo nhận dạng:** Viết rõ xác suất trên từng cạnh theo trạng thái hiện tại. Sau đó: nhân dọc một đường, cộng ngang các đường phù hợp.

### Ví dụ nguồn

Hộp có 4 đỏ, 3 xanh. Rút 2 bi không hoàn lại. Xác suất đúng một bi đỏ là (4/7)(3/6) + (3/7)(4/6) = **4/7**. Hai đường “đỏ-xanh” và “xanh-đỏ” rời nhau nên được cộng.
