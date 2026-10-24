import { calculusKnowledgeContent } from "./calculus-lessons.js?v=14.0";

// Structured reading content transcribed from the verified CD20–CD21 source PDF.
// Keep this module text-only so the lesson remains readable, searchable and accessible.
const probabilityKnowledgeContent = Object.freeze({
  "20.1": {
    lead: "Nếu một công việc có thể hoàn thành theo một trong các phương án không đồng thời, số cách thực hiện bằng tổng số cách của từng phương án.",
    formulae: [
      { label: "Quy tắc cộng", value: "N = n₁ + n₂ + … + nₖ", detail: "Áp dụng khi k trường hợp đôi một rời nhau." }
    ],
    points: [
      { label: "Nhận dạng", text: "Bài toán cho nhiều phương án thay thế nhau: làm theo cách này hoặc cách kia." },
      { label: "Khi có giao nhau", text: "Cộng trực tiếp sẽ đếm lặp; cần tách lại thành các trường hợp rời nhau hoặc dùng nguyên lý bù trừ." }
    ],
    note: { label: "Sai lầm hay gặp", text: "Thấy từ “hoặc” chưa đủ để cộng. Hãy kiểm tra một kết quả có thể thuộc đồng thời hai trường hợp hay không.", tone: "warning" }
  },
  "20.2": {
    lead: "Nếu phải thực hiện liên tiếp nhiều bước để hoàn thành công việc, số cách bằng tích số lựa chọn ở các bước.",
    formulae: [
      { label: "Quy tắc nhân", value: "N = n₁ × n₂ × … × nₖ", detail: "Số lựa chọn ở bước sau có thể phụ thuộc kết quả của bước trước." }
    ],
    points: [
      { label: "Theo từng bước", text: "Mỗi kết quả hoàn chỉnh được tạo bởi đúng một chuỗi lựa chọn qua tất cả các giai đoạn." },
      { label: "Phân biệt nhanh", text: "“Phương án này hoặc phương án kia” thường dùng cộng; “bước 1 và bước 2” thường dùng nhân." }
    ],
    note: { label: "Mẹo nhận dạng", text: "Vẽ sơ đồ các bước và ghi số lựa chọn trên từng nhánh trước khi nhân.", tone: "tip" }
  },
  "20.3": {
    lead: "Hoán vị là cách sắp xếp toàn bộ n phần tử phân biệt vào n vị trí. Hai cách khác nhau nếu có ít nhất một vị trí chứa phần tử khác.",
    formulae: [
      { label: "Phần tử phân biệt", value: "P(n) = n!", detail: "Dùng khi sắp xếp toàn bộ n phần tử." },
      { label: "Có phần tử lặp", value: "N = n! / (n₁! · … · nᵣ!)", detail: "n₁, …, nᵣ là số lần lặp của từng loại." },
      { label: "Xếp vòng tròn", value: "(n − 1)!", detail: "Khi các phép quay được xem là như nhau." }
    ],
    points: [
      { label: "Xếp hàng", text: "Lần lượt chọn n, n − 1, …, 1 cách cho các vị trí." },
      { label: "Xếp vòng tròn", text: "Cố định một người làm mốc rồi xếp n − 1 người còn lại." }
    ],
    note: { label: "Sai lầm hay gặp", text: "Công thức n! chỉ dùng trực tiếp khi các phần tử phân biệt. Có phần tử giống nhau thì phải chia cho số hoán vị nội bộ.", tone: "warning" }
  },
  "20.4": {
    lead: "Chỉnh hợp chập k của n phần tử là cách chọn k phần tử rồi sắp chúng vào k vị trí phân biệt. Vì vị trí khác nhau nên thứ tự quan trọng.",
    formulae: [
      { label: "Không lặp", value: "A(n,k) = n! / (n − k)!", detail: "Tương đương n(n − 1)…(n − k + 1), với 0 ≤ k ≤ n." },
      { label: "Được phép lặp", value: "nᵏ", detail: "Mỗi trong k vị trí đều có n lựa chọn." }
    ],
    points: [
      { label: "Dấu hiệu", text: "Đề có ghế, vị trí, chức vụ hoặc hạng nhất – nhì – ba." },
      { label: "Câu hỏi kiểm tra", text: "Đổi chỗ hai phần tử đã chọn có tạo ra kết quả mới không? Nếu có, thứ tự quan trọng." }
    ],
    note: { label: "Ghi nhớ", text: "Chỉnh hợp gồm hai hành động: chọn phần tử và sắp thứ tự cho chúng.", tone: "tip" }
  },
  "20.5": {
    lead: "Tổ hợp chập k của n phần tử là cách chọn một tập gồm k phần tử từ n phần tử mà không xét thứ tự.",
    formulae: [
      { label: "Công thức", value: "C(n,k) = n! / [k!(n − k)!]", detail: "Áp dụng với 0 ≤ k ≤ n." },
      { label: "Hệ thức", value: "C(n,k) = C(n,n−k)", detail: "Chọn k phần tử tương đương bỏ đi n − k phần tử." },
      { label: "Pascal", value: "C(n,k) = C(n−1,k) + C(n−1,k−1)", detail: "Xét một phần tử đặc biệt: không chọn hoặc có chọn." }
    ],
    points: [
      { label: "Liên hệ chỉnh hợp", text: "A(n,k) = C(n,k) · k!." },
      { label: "Dấu hiệu", text: "Chỉ cần chọn một nhóm, không phân chức vụ và không xếp vị trí." }
    ],
    note: { label: "Sai lầm hay gặp", text: "Nếu sau khi chọn còn gán chức vụ hoặc xếp vị trí, không thể dừng ở C(n,k); cần nhân thêm số cách sắp xếp.", tone: "warning" }
  },
  "20.6": {
    lead: "Ba kỹ thuật chủ đạo của bài toán sắp xếp có điều kiện là ghép khối, xếp chỗ trống và đếm phần bù.",
    formulae: [
      { label: "Đứng cạnh nhau", value: "Ghép thành một khối", detail: "Sau đó nhân số cách đổi chỗ bên trong khối." },
      { label: "Không đứng cạnh nhau", value: "Xếp trước – đặt vào khe", detail: "Xếp nhóm không bị hạn chế trước rồi chọn các khe cho nhóm còn lại." }
    ],
    points: [
      { label: "Không cùng nhau", text: "Thường lấy tổng số cách trừ số cách đứng hoặc ở cùng nhau." },
      { label: "Vị trí cố định hoặc cấm", text: "Điền các vị trí bị hạn chế trước, sau đó xử lý phần còn lại." }
    ],
    note: { label: "Sai lầm hay gặp", text: "Khi ghép khối, đừng quên hoán vị bên trong khối. Khi dùng chỗ trống, phải tính cả hai khe ở hai đầu.", tone: "warning" }
  },
  "20.7": {
    lead: "Với điều kiện về loại, giới tính, nhóm hoặc số lượng tối thiểu – tối đa, hãy đặt biến cho số phần tử từng loại rồi chia thành các trường hợp rời nhau.",
    formulae: [
      { label: "Chọn đúng i từ nhóm A", value: "C(a,i) · C(b,k−i)", detail: "Chọn tổng cộng k phần tử từ hai nhóm có a và b phần tử." }
    ],
    points: [
      { label: "Ít nhất r", text: "Xét r, r + 1, … đến giá trị lớn nhất; hoặc dùng phần bù nếu ngắn hơn." },
      { label: "Nhiều nhất r", text: "Xét các giá trị 0, 1, …, r." },
      { label: "Có cả hai loại", text: "Thường lấy tổng số cách trừ các trường hợp chỉ có một loại." }
    ],
    note: { label: "Mẹo nhận dạng", text: "Viết điều kiện 0 ≤ i ≤ a và 0 ≤ k − i ≤ b trước khi tính để không cộng trường hợp vô nghĩa.", tone: "tip" }
  },
  "20.8": {
    lead: "Trước tiên phải xác định hai điều: vật có phân biệt không và hộp có phân biệt không. Các công thức dưới đây giả sử hộp có nhãn.",
    formulae: [
      { label: "Vật phân biệt, không hạn chế", value: "mⁿ", detail: "Phân n vật vào m hộp phân biệt." },
      { label: "Vật giống nhau, hộp có thể rỗng", value: "C(n + m − 1, m − 1)", detail: "Nghiệm nguyên không âm của x₁ + … + xₘ = n." },
      { label: "Vật giống nhau, mỗi hộp có vật", value: "C(n − 1, m − 1)", detail: "Điều kiện n ≥ m." },
      { label: "Vật phân biệt, không hộp nào rỗng", value: "Σ(−1)ⁱC(m,i)(m−i)ⁿ", detail: "Dùng nguyên lý bù trừ, i chạy từ 0 đến m." }
    ],
    points: [
      { label: "Có cận dưới", text: "Với xᵢ ≥ aᵢ, đặt yᵢ = xᵢ − aᵢ để đưa về nghiệm nguyên không âm." },
      { label: "Có cận trên", text: "Thường dùng phần bù hoặc nguyên lý bù trừ." }
    ],
    note: { label: "Sai lầm hay gặp", text: "Không dùng mⁿ cho các vật giống nhau. Nếu hộp không phân biệt, các công thức trên cũng không áp dụng trực tiếp.", tone: "warning" }
  },
  "20.9": {
    lead: "Điểm quyết định là các nhóm có tên hay không. Nhóm 1, nhóm 2 là phân biệt; các nhóm cùng vai trò thường không phân biệt.",
    formulae: [
      { label: "Nhóm có nhãn", value: "N = n! / (n₁! · … · nᵣ!)", detail: "Chia n phần tử phân biệt vào r nhóm có kích thước n₁, …, nᵣ." },
      { label: "Nhóm không nhãn cùng cỡ", value: "Chia thêm cho r!", detail: "Vì đổi tên các nhóm không tạo kết quả mới." },
      { label: "Ghép thành m cặp", value: "(2m)! / (2ᵐm!)", detail: "Các cặp không phân biệt thứ tự." }
    ],
    points: [
      { label: "Câu hỏi kiểm tra", text: "Đổi tên hai nhóm có làm thay đổi kết quả hay nhiệm vụ của nhóm không?" }
    ],
    note: { label: "Sai lầm hay gặp", text: "Chỉ chia cho r! khi hoán đổi tên nhóm thật sự không tạo kết quả mới. Nhóm có nhiệm vụ khác nhau thì không được chia.", tone: "warning" }
  },
  "20.10": {
    lead: "Đếm gián tiếp biến yêu cầu khó thành một tập lớn dễ đếm, sau đó loại bỏ phần không thỏa mãn.",
    formulae: [
      { label: "Đếm phần bù", value: "Số thỏa mãn = Tổng số − Số không thỏa mãn", detail: "Đặc biệt hiệu quả với yêu cầu “ít nhất một”." }
    ],
    points: [
      { label: "Dấu hiệu", text: "Các cụm “có xuất hiện”, “không phải tất cả”, “không đồng thời vắng mặt”." },
      { label: "Song ánh", text: "Có thể ghép mỗi cấu hình cần đếm với đúng một cấu hình của bài toán quen thuộc." }
    ],
    note: { label: "Sai lầm hay gặp", text: "Phần bù phải nằm trong đúng cùng không gian tổng. Nếu đếm số có 6 chữ số, chữ số đầu không được là 0 ở cả tổng lẫn phần bù.", tone: "warning" }
  },
  "20.11": {
    lead: "Khi các tập trường hợp chồng lấn, cộng riêng từng tập sẽ đếm lặp phần giao. Nguyên lý bù trừ sửa chính xác số lần đếm đó.",
    formulae: [
      { label: "Hai tập", value: "|A ∪ B| = |A| + |B| − |A ∩ B|", detail: "Trừ phần giao đã bị đếm hai lần." },
      { label: "Ba tập", value: "Σ tập đơn − Σ giao đôi + giao ba", detail: "Với nhiều tập, dấu cộng và trừ luân phiên theo số tập trong giao." }
    ],
    points: [
      { label: "Ứng dụng", text: "Đếm số chia hết bởi nhiều số, ánh xạ phủ, hộp rỗng hoặc sắp xếp không ai về đúng vị trí." }
    ],
    note: { label: "Sai lầm hay gặp", text: "Khi đếm giao của các điều kiện chia hết, phải dùng bội chung nhỏ nhất.", tone: "warning" }
  },
  "20.12": {
    lead: "Mô hình hàng – cột thường quy về chọn hàng, chọn cột rồi ghép chúng. Cần phân biệt ô của bảng với điểm lưới.",
    formulae: [
      { label: "Chọn k ô không chung hàng, cột", value: "C(m,k) · C(n,k) · k!", detail: "Chọn k hàng, k cột rồi ghép mỗi hàng với một cột." },
      { label: "Đếm hình chữ nhật", value: "C(m,2) · C(n,2)", detail: "m và n là số đường ngang và đường dọc." }
    ],
    points: [
      { label: "Đọc đúng đề", text: "Bảng có m hàng ô và n cột ô thì có m + 1 đường ngang và n + 1 đường dọc." }
    ],
    note: { label: "Sai lầm hay gặp", text: "Sau khi chọn hàng và cột vẫn phải nhân k! để ghép chúng; nếu bỏ k!, ta mới chỉ chọn được một bảng con k × k.", tone: "warning" }
  },
  "20.13": {
    lead: "Đối tượng hình học thường được xác định duy nhất bởi một tập đỉnh. Điều kiện lồi giúp tránh các trường hợp suy biến.",
    formulae: [
      { label: "Đường chéo", value: "n(n − 3) / 2", detail: "Trong đa giác lồi n đỉnh." },
      { label: "Tam giác và tứ giác", value: "C(n,3) và C(n,4)", detail: "Chọn trực tiếp các đỉnh của đa giác." },
      { label: "Giao điểm đường chéo", value: "C(n,4)", detail: "Khi không có ba đường chéo đồng quy trong miền trong." }
    ],
    points: [
      { label: "Ý nghĩa C(n,4)", text: "Mỗi giao điểm tổng quát được xác định bởi bốn đỉnh của một tứ giác." },
      { label: "Chọn đỉnh không kề nhau", text: "Có thể dùng xếp khe hoặc công thức n/(n−k) · C(n−k,k), với n ≥ 2k." }
    ],
    note: { label: "Lưu ý", text: "Công thức C(n,4) chỉ đúng khi không có ba đường chéo đồng quy tại cùng một điểm bên trong.", tone: "warning" }
  },
  "20.14": {
    lead: "Với m ≥ 2, mọi số nguyên thuộc đúng một trong m lớp dư 0, 1, …, m − 1 theo modulo m.",
    formulae: [
      { label: "Đồng dư", value: "a ≡ r (mod m) ⇔ m | (a − r)", detail: "a và r có cùng phần dư khi chia cho m." },
      { label: "Phép toán", value: "a + b ≡ r + s; ab ≡ rs (mod m)", expressions: ["a + b ≡ r + s", "ab ≡ rs (mod m)"], detail: "Khi a ≡ r và b ≡ s theo modulo m." }
    ],
    points: [
      { label: "Tổng chia hết", text: "Ghép các lớp dư có tổng đồng dư 0." },
      { label: "Tích chia hết", text: "Phân tích môđun thành thừa số nguyên tố rồi xét số mũ cần có." },
      { label: "Dirichlet", text: "Phân n + 1 số nguyên vào n lớp dư thì có hai số cùng lớp dư." }
    ],
    note: { label: "Mẹo nhận dạng", text: "Lập bảng các lớp dư và số phần tử trong từng lớp trước khi chọn cặp, bộ ba hoặc chuỗi phù hợp.", tone: "tip" }
  },
  "20.15": {
    lead: "Modulo tập trung vào phần dư thay vì giá trị đầy đủ; thường dùng cho chữ số tận cùng, tính chia hết và bài đếm đồng dư.",
    formulae: [
      { label: "Nguyên tắc", value: "Rút gọn theo modulo m", detail: "Rút gọn từng số trước khi cộng, nhân hoặc nâng lũy thừa." },
      { label: "Lũy thừa", value: "Tìm chu kỳ phần dư", detail: "Sau đó xét số mũ theo phần dư của độ dài chu kỳ." }
    ],
    points: [
      { label: "Trong bài đếm", text: "Mô tả mỗi phần tử bằng lớp dư rồi dùng quy tắc cộng, nhân hoặc tổ hợp trên số lượng từng lớp." },
      { label: "Môđun hợp số", text: "Đôi khi tách thành các môđun nguyên tố cùng nhau rồi ghép kết quả." }
    ],
    note: { label: "Sai lầm hay gặp", text: "Không tùy tiện chia hai vế trong đồng dư. Chỉ khử thừa số khi đã kiểm soát ước chung của nó với môđun.", tone: "warning" }
  },
  "20.16": {
    lead: "Bài toán nhiều giai đoạn có trạng thái thay đổi sau mỗi bước. Hãy vẽ sơ đồ hoặc lập bảng trạng thái để đếm đúng lựa chọn ở bước sau.",
    formulae: [
      { label: "Trong một nhánh", value: "Dùng quy tắc nhân", detail: "Nhân số lựa chọn qua các bước liên tiếp." },
      { label: "Giữa các nhánh rời nhau", value: "Dùng quy tắc cộng", detail: "Cộng kết quả của các hướng xử lý không trùng nhau." }
    ],
    points: [
      { label: "Chọn thứ tự", text: "Xử lý điều kiện mạnh nhất trước nếu nó giúp giảm số nhánh." },
      { label: "Kiểm tra trùng", text: "Nếu nhiều con đường dẫn đến cùng một kết quả cuối, phải loại phần đếm lặp." },
      { label: "Nhiều bước", text: "Có thể dùng truy hồi hoặc quy hoạch động khi ít trạng thái nhưng số bước lớn." }
    ],
    note: { label: "Mẹo kiểm tra", text: "Giải theo hai thứ tự khác nhau; hai biểu thức đếm cùng một tập kết quả phải bằng nhau.", tone: "tip" }
  },
  "20.17": {
    lead: "Trong hình học tổ hợp, một đối tượng thường được xác định bởi một tập điểm hoặc tập đường. Đếm tất cả rồi loại cấu hình suy biến.",
    formulae: [
      { label: "n điểm tổng quát", value: "Đường thẳng C(n,2); tam giác C(n,3)", expressions: ["Đường thẳng C(n,2)", "Tam giác C(n,3)"], detail: "Giả sử không có ba điểm thẳng hàng." },
      { label: "Có m điểm thẳng hàng", value: "C(n,3) − C(m,3)", detail: "Loại các bộ ba không tạo thành tam giác." },
      { label: "n đường thẳng tổng quát", value: "C(n,2) giao điểm", detail: "Không đôi nào song song và không ba đường đồng quy." }
    ],
    points: [
      { label: "Quy trình", text: "Xác định tập điểm quyết định đối tượng, đếm toàn bộ rồi loại thẳng hàng, song song hoặc đồng quy." }
    ],
    note: { label: "Sai lầm hay gặp", text: "Không phải mọi cách chọn điểm đều tạo đối tượng hợp lệ; đồng thời kiểm tra một đối tượng có bị nhiều tập điểm cùng xác định hay không.", tone: "warning" }
  },
  "21.1": {
    lead: "Phép thử ngẫu nhiên có tập kết quả biết trước nhưng chưa biết kết quả cụ thể. Tập tất cả kết quả là không gian mẫu Ω; biến cố A là một tập con của Ω.",
    formulae: [
      { label: "Mô hình hữu hạn đồng khả năng", value: String.raw`\mathrm{P}(A)=\frac{|A|}{|\Omega|}`, detail: "Luôn có 0 ≤ P(A) ≤ 1 và P(Ω) = 1." }
    ],
    points: [
      { label: "Biến cố đặc biệt", text: "Biến cố chắc chắn là Ω; biến cố không thể là ∅." },
      { label: "Kết quả sơ cấp", text: "ω ∈ A nghĩa là khi kết quả ω xuất hiện thì biến cố A xảy ra." }
    ],
    note: { label: "Sai lầm hay gặp", text: "Chỉ dùng |A|/|Ω| khi các kết quả sơ cấp đồng khả năng. Tổng của hai xúc xắc từ 2 đến 12 không đồng khả năng.", tone: "warning" }
  },
  "21.2": {
    lead: "Biến cố đối Aᶜ gồm mọi kết quả thuộc Ω nhưng không thuộc A. Hai biến cố A và Aᶜ xung khắc và hợp của chúng là Ω.",
    formulae: [
      { label: "Xác suất biến cố đối", value: "P(Aᶜ) = 1 − P(A)", detail: "Thường dùng để tính nhanh các yêu cầu “ít nhất một”." }
    ],
    points: [
      { label: "Ít nhất một", text: "Lấy 1 trừ xác suất không có lần nào." },
      { label: "Không phải tất cả", text: "Là biến cố đối của “tất cả đều”." }
    ],
    note: { label: "Sai lầm hay gặp", text: "Đối của “có ít nhất 2” là “có nhiều nhất 1”, không phải “không có”.", tone: "warning" }
  },
  "21.3": {
    lead: "A ∪ B xảy ra khi ít nhất một trong hai biến cố A, B xảy ra. Từ “hoặc” thường là hoặc bao hàm, cho phép cả hai cùng xảy ra.",
    formulae: [
      { label: "Biến cố hợp", value: "A ∪ B", detail: "Phần A ∩ B nằm trong hợp nhưng chỉ được tính một lần." },
      { label: "Định luật De Morgan", value: "(A ∪ B)ᶜ = Aᶜ ∩ Bᶜ", detail: "Đối của “A hoặc B” là “không A và không B”." }
    ],
    points: [
      { label: "Ngôn ngữ", text: "Các cụm “A hoặc B”, “ít nhất một” thường mô tả phép hợp." }
    ],
    note: { label: "Ghi nhớ", text: "Nếu A và B có thể cùng xảy ra, không được cộng trực tiếp mà bỏ qua phần giao.", tone: "tip" }
  },
  "21.4": {
    lead: "A ∩ B xảy ra khi cả A và B cùng xảy ra. Trong quy trình nhiều bước, phép giao thường mô tả một đường đi cụ thể qua các bước.",
    formulae: [
      { label: "Biến cố giao", value: "A ∩ B", detail: "Đọc là “A và B cùng xảy ra”." },
      { label: "Định luật De Morgan", value: "(A ∩ B)ᶜ = Aᶜ ∪ Bᶜ", detail: "Đối của “A và B” là “không A hoặc không B”." }
    ],
    points: [
      { label: "Dấu hiệu", text: "Các từ “đồng thời”, “vừa… vừa…”, “A và B” thường chỉ phép giao." }
    ],
    note: { label: "Ghi nhớ", text: "Phân biệt ký hiệu tập hợp A ∩ B với công thức tính xác suất của giao, vốn còn phụ thuộc điều kiện hoặc tính độc lập.", tone: "tip" }
  },
  "21.5": {
    lead: "Hai biến cố xung khắc nếu chúng không thể cùng xảy ra trong một phép thử.",
    formulae: [
      { label: "Điều kiện xung khắc", value: "A ∩ B = ∅", detail: "Do đó P(A ∩ B) = 0." }
    ],
    points: [
      { label: "Kiểm tra", text: "Hỏi xem có kết quả sơ cấp nào đồng thời thuộc cả A và B hay không." },
      { label: "Hệ quả", text: "Với hai biến cố xung khắc, xác suất của hợp bằng tổng hai xác suất." }
    ],
    note: { label: "Sai lầm hay gặp", text: "Xung khắc không có nghĩa là độc lập. Nếu P(A), P(B) đều dương thì P(A ∩ B) = 0 khác P(A)P(B).", tone: "warning" }
  },
  "21.6": {
    lead: "A và B độc lập khi việc biết B xảy ra không làm thay đổi xác suất của A, và ngược lại.",
    formulae: [
      { label: "Điều kiện độc lập", value: "P(A ∩ B) = P(A)P(B)", detail: "Đây là cách kiểm tra thường dùng nhất." },
      { label: "Qua xác suất có điều kiện", value: "P(A | B) = P(A)", detail: "Tương đương khi P(B) > 0." }
    ],
    points: [
      { label: "Biến cố đối", text: "Nếu A độc lập với B thì Aᶜ cũng độc lập với B, Bᶜ và Aᶜ với Bᶜ." },
      { label: "Nhiều biến cố", text: "Độc lập từng đôi chưa chắc kéo theo độc lập đồng thời." }
    ],
    note: { label: "Sai lầm hay gặp", text: "Không kết luận độc lập chỉ vì hai biến cố “trông không liên quan”; phải dựa vào mô hình hoặc kiểm tra công thức.", tone: "warning" }
  },
  "21.7": {
    lead: "Công thức cộng tính xác suất của biến cố “A hoặc B”. Phần giao phải trừ một lần vì đã bị cộng hai lần.",
    formulae: [
      { label: "Công thức tổng quát", value: "P(A ∪ B) = P(A) + P(B) − P(A ∩ B)", detail: "Áp dụng cho mọi cặp biến cố." },
      { label: "Nếu xung khắc", value: "P(A ∪ B) = P(A) + P(B)", detail: "Vì P(A ∩ B) = 0." }
    ],
    points: [
      { label: "Đúng một trong hai", text: "Dùng P(A) + P(B) − 2P(A ∩ B)." }
    ],
    note: { label: "Mẹo nhận dạng", text: "Gặp từ “hoặc”, hãy xác định ngay phần giao có thể xảy ra hay không trước khi thay số.", tone: "tip" }
  },
  "21.8": {
    lead: "Công thức nhân tính xác suất của một giao. Trường hợp tổng quát dùng xác suất có điều kiện; chỉ khi độc lập mới nhân trực tiếp.",
    formulae: [
      { label: "Hai biến cố", value: "P(A ∩ B) = P(A)P(B | A)", detail: "Cũng bằng P(B)P(A | B)." },
      { label: "Nếu độc lập", value: "P(A ∩ B) = P(A)P(B)", detail: "Xác suất bước sau không đổi." },
      { label: "Chuỗi n bước", value: "P(A₁∩…∩Aₙ) = P(A₁)P(A₂|A₁)…", detail: "Mỗi thừa số dùng điều kiện của các bước đã xảy ra trước đó." }
    ],
    points: [
      { label: "Quy trình", text: "Viết xác suất của từng bước theo đúng trạng thái còn lại sau các bước trước." }
    ],
    note: { label: "Sai lầm hay gặp", text: "Không hoàn lại làm xác suất bước sau thay đổi; không được lặp lại xác suất ban đầu cho mọi bước.", tone: "warning" }
  }
});

const probabilityKnowledgeReadings = Object.fromEntries(
  Object.entries(probabilityKnowledgeContent).map(([code, reading]) => [
    code,
    Object.freeze({ ...reading, layout: "principles-split" })
  ])
);

export const knowledgeContent = Object.freeze({
  ...calculusKnowledgeContent,
  ...probabilityKnowledgeReadings
});

export function getKnowledgeContent(sourceTopic) {
  return knowledgeContent[sourceTopic] ?? null;
}
