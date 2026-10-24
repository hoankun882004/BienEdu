import { calculusExampleContent } from "./calculus-lessons.js?v=14.0";

// Worked examples transcribed and clarified from the verified CD20–CD21 source PDF.
// Each example is a complete learning unit rather than a crop of the source page.
const probabilityExampleContent = Object.freeze({
  "20.1": [
    {
      title: "Quên làm bài tập",
      prompt: "Một học sinh chọn đúng một lý do để xin gia hạn: 3 lý do công nghệ, 4 lý do cá nhân hoặc 1 lý do “em tưởng hôm nay là Chủ nhật”. Có bao nhiêu cách chọn?",
      analysis: ["Mỗi lần chỉ chọn một lý do.", "Ba nhóm lý do không trùng nhau nên dùng quy tắc cộng."],
      steps: [
        { label: "Đếm từng nhóm", expression: "3; 4; 1", text: "Lần lượt là số lựa chọn của nhóm công nghệ, cá nhân và lý do khác." },
        { label: "Cộng các phương án", expression: "N = 3 + 4 + 1 = 8", text: "Mỗi lý do thuộc đúng một nhóm." }
      ],
      answer: "Có 8 cách chọn lý do.",
      takeaway: "Dùng phép cộng vì các phương án thay thế nhau và đôi một rời nhau.",
      sourcePages: [4]
    },
    {
      title: "Bữa tối cuối tháng",
      prompt: "Một sinh viên chọn đúng một món: 4 món nước hoặc 3 món khô. Hỏi có bao nhiêu cách chọn bữa tối?",
      analysis: ["Chỉ chọn một món.", "Một món không thể đồng thời thuộc cả nhóm nước và nhóm khô."],
      steps: [
        { label: "Món nước", expression: "4 cách", text: "Có bốn lựa chọn trong nhóm thứ nhất." },
        { label: "Món khô", expression: "3 cách", text: "Có ba lựa chọn trong nhóm thứ hai." },
        { label: "Áp dụng quy tắc cộng", expression: "N = 4 + 3 = 7", text: "Hai nhóm lựa chọn không trùng nhau." }
      ],
      answer: "Có 7 cách chọn bữa tối.",
      takeaway: "Từ “hoặc” dẫn tới phép cộng khi hai nhóm kết quả không giao nhau.",
      sourcePages: [5]
    }
  ],
  "20.2": [
    {
      title: "Quy trình soạn tin nhắn",
      prompt: "Một tin nhắn gồm 3 bước: chọn 1 trong 3 câu mở đầu, 1 trong 4 câu tiếp theo và 1 trong 2 cách kết thúc. Lập được bao nhiêu tin nhắn khác nhau?",
      analysis: ["Một tin nhắn hoàn chỉnh phải có đủ cả ba phần.", "Mỗi lựa chọn ở một bước kết hợp được với mọi lựa chọn ở bước tiếp theo."],
      steps: [
        { label: "Bước 1", expression: "3 cách", text: "Chọn câu mở đầu." },
        { label: "Bước 2", expression: "4 cách", text: "Chọn nội dung tiếp theo." },
        { label: "Bước 3", expression: "2 cách", text: "Chọn cách kết thúc." },
        { label: "Nhân theo chuỗi bước", expression: "N = 3 × 4 × 2 = 24", text: "Mỗi kết quả là một bộ ba lựa chọn." }
      ],
      answer: "Lập được 24 tin nhắn khác nhau.",
      takeaway: "Một kết quả cần đồng thời hoàn thành nhiều bước nên dùng quy tắc nhân.",
      sourcePages: [5, 6]
    },
    {
      title: "Phối trang phục của Lan",
      prompt: "Lan có 6 chiếc áo, 5 chiếc quần hoặc chân váy và 4 đôi giày. Mỗi bộ gồm đúng một món ở mỗi loại. Có bao nhiêu bộ trang phục?",
      analysis: ["Một bộ trang phục cần đủ áo, quần hoặc váy, và giày.", "Ba lựa chọn được thực hiện liên tiếp."],
      steps: [
        { label: "Số lựa chọn", expression: "6; 5; 4", text: "Tương ứng với áo, quần hoặc váy, và giày." },
        { label: "Áp dụng quy tắc nhân", expression: "N = 6 × 5 × 4 = 120", text: "Mỗi bộ được xác định bởi một lựa chọn ở từng loại." }
      ],
      answer: "Lan phối được 120 bộ trang phục.",
      takeaway: "Khi sản phẩm cuối cùng gồm một lựa chọn từ mỗi nhóm, hãy nhân số lựa chọn.",
      sourcePages: [6]
    },
    {
      title: "Đường đến lớp",
      prompt: "Nam có thể đi thẳng đến lớp bằng 2 đường, hoặc đi qua căng tin với 3 đường đến căng tin và 2 đường từ căng tin đến lớp. Có bao nhiêu cách đến lớp?",
      analysis: ["Trong phương án qua căng tin, Nam phải đi đủ hai chặng nên dùng phép nhân.", "Đi thẳng và đi qua căng tin là hai phương án rời nhau nên dùng phép cộng."],
      steps: [
        { label: "Qua căng tin", expression: "3 × 2 = 6", text: "Ghép một đường ở chặng đầu với một đường ở chặng sau." },
        { label: "Gộp hai phương án", expression: "N = 2 + 6 = 8", text: "Cộng 2 đường đi thẳng với 6 đường đi qua căng tin." }
      ],
      answer: "Có 8 cách đi từ ký túc xá đến lớp.",
      takeaway: "Bài toán có thể phối hợp quy tắc nhân bên trong từng phương án và quy tắc cộng giữa các phương án.",
      sourcePages: [6, 7]
    }
  ],
  "20.3": [{
    title: "Sắp xếp A, A, B, C",
    prompt: "Sắp xếp bốn chữ A, A, B, C thành một dãy. Có bao nhiêu dãy khác nhau?",
    analysis: ["Có 4 vị trí nhưng hai chữ A giống nhau.", "Nếu dùng 4! thì mỗi dãy bị đếm lặp 2! lần do đổi chỗ hai chữ A."],
    steps: [
      { label: "Hoán vị bốn vị trí", expression: "4!", text: "Tạm xem bốn chữ là phân biệt." },
      { label: "Loại phần đếm lặp", expression: "N = 4! / 2! = 12", text: "Chia cho số cách đổi chỗ hai chữ A giống nhau." }
    ],
    answer: "Có 12 dãy khác nhau.",
    takeaway: "Hoán vị có phần tử lặp phải chia cho hoán vị nội bộ của các phần tử giống nhau.",
    sourcePages: [7]
  }],
  "20.4": [{
    title: "Phân công ba chức vụ",
    prompt: "Từ 10 học sinh, chọn lớp trưởng, lớp phó và bí thư. Có bao nhiêu cách phân công?",
    analysis: ["Ba chức vụ khác nhau nên thứ tự phân công quan trọng.", "Một học sinh không giữ đồng thời hai chức vụ."],
    steps: [
      { label: "Chọn lần lượt", expression: "10 × 9 × 8", text: "Có 10 cách chọn lớp trưởng, 9 cách chọn lớp phó và 8 cách chọn bí thư." },
      { label: "Viết dưới dạng chỉnh hợp", expression: "A(10,3) = 720", text: "Đây là chỉnh hợp chập 3 của 10 phần tử." }
    ],
    answer: "Có 720 cách phân công.",
    takeaway: "Chọn người cho các chức vụ phân biệt là bài toán chỉnh hợp.",
    sourcePages: [8]
  }],
  "20.5": [{
    title: "Chọn đội bốn học sinh",
    prompt: "Chọn 4 học sinh từ 12 học sinh vào một đội, không phân chức vụ. Có bao nhiêu cách?",
    analysis: ["Chỉ quan tâm bốn người nào được chọn.", "Đổi thứ tự các thành viên không tạo ra đội mới."],
    steps: [
      { label: "Chọn tập bốn người", expression: "C(12,4)", text: "Không xét thứ tự nên dùng tổ hợp." },
      { label: "Tính giá trị", expression: "C(12,4) = 495", text: "Áp dụng công thức tổ hợp chập 4 của 12." }
    ],
    answer: "Có 495 cách chọn đội.",
    takeaway: "Chọn nhóm không phân vai và không xếp vị trí là tổ hợp.",
    sourcePages: [8]
  }],
  "20.6": [{
    title: "Xếp A và B đứng cạnh nhau",
    prompt: "Xếp 5 người A, B, C, D, E thành một hàng sao cho A và B đứng cạnh nhau. Có bao nhiêu cách?",
    analysis: ["Ghép A và B thành một khối.", "Khối AB cùng C, D, E tạo thành bốn đối tượng để sắp xếp."],
    steps: [
      { label: "Xếp bốn đối tượng", expression: "4!", text: "Xếp khối AB cùng ba người C, D, E." },
      { label: "Đổi chỗ trong khối", expression: "2!", text: "Bên trong khối có thể là AB hoặc BA." },
      { label: "Kết hợp", expression: "N = 2 × 4! = 48", text: "Nhân số cách xếp khối với số cách đổi chỗ nội bộ." }
    ],
    answer: "Có 48 cách xếp.",
    takeaway: "Khi ghép khối, luôn kiểm tra số cách hoán vị bên trong khối.",
    sourcePages: [8]
  }],
  "20.7": [{
    title: "Chọn nhóm có ít nhất hai nữ",
    prompt: "Từ 6 nam và 5 nữ, chọn 4 người sao cho có ít nhất 2 nữ. Có bao nhiêu cách?",
    analysis: ["Số nữ có thể là 2, 3 hoặc 4.", "Ba trường hợp rời nhau nên tính riêng rồi cộng."],
    steps: [
      { label: "Hai nữ, hai nam", expression: "C(5,2)C(6,2) = 150", text: "Chọn độc lập từ hai nhóm." },
      { label: "Ba nữ, một nam", expression: "C(5,3)C(6,1) = 60", text: "Trường hợp thứ hai." },
      { label: "Bốn nữ", expression: "C(5,4)C(6,0) = 5", text: "Trường hợp thứ ba." },
      { label: "Cộng các trường hợp", expression: "N = 150 + 60 + 5 = 215", text: "Mỗi nhóm được đếm đúng một lần." }
    ],
    answer: "Có 215 cách chọn.",
    takeaway: "“Ít nhất” thường được xử lý bằng cách chia theo số lượng chính xác của từng loại.",
    sourcePages: [9]
  }],
  "20.8": [{
    title: "Chia kẹo cho bốn bạn",
    prompt: "Chia 10 viên kẹo giống nhau cho 4 bạn, mỗi bạn nhận ít nhất 1 viên. Có bao nhiêu cách chia?",
    analysis: ["Bốn bạn là bốn hộp phân biệt; các viên kẹo giống nhau.", "Bài toán tương đương tìm nghiệm nguyên dương của x₁ + x₂ + x₃ + x₄ = 10."],
    steps: [
      { label: "Khử điều kiện dương", expression: "yᵢ = xᵢ − 1 ≥ 0", text: "Dành trước cho mỗi bạn một viên kẹo." },
      { label: "Phương trình mới", expression: "y₁ + y₂ + y₃ + y₄ = 6", text: "Còn lại 6 viên để phân phối tự do." },
      { label: "Dùng sao và vạch", expression: "C(6 + 4 − 1, 4 − 1) = C(9,3)", text: "Đếm nghiệm nguyên không âm của phương trình." },
      { label: "Tính kết quả", expression: "C(9,3) = 84", text: "Mỗi nghiệm tương ứng đúng một cách chia." }
    ],
    answer: "Có 84 cách chia kẹo.",
    takeaway: "Vật giống nhau, hộp phân biệt và mỗi hộp ít nhất một vật dẫn tới C(n − 1, m − 1).",
    sourcePages: [10]
  }],
  "20.9": [{
    title: "Chia tám người thành hai nhóm",
    prompt: "Chia 8 người thành hai nhóm, mỗi nhóm 4 người và không đặt tên nhóm. Có bao nhiêu cách?",
    analysis: ["Chọn 4 người cho một nhóm thì 4 người còn lại tự tạo nhóm kia.", "Hai nhóm không có tên nên mỗi cách bị đếm hai lần khi đổi vai trò hai nhóm."],
    steps: [
      { label: "Tạm phân biệt hai nhóm", expression: "C(8,4) = 70", text: "Chọn bốn người cho nhóm thứ nhất." },
      { label: "Bỏ nhãn nhóm", expression: String.raw`N=\frac{\mathrm{C}(8,4)}{2!}=35`, text: "Chia cho hai cách hoán đổi tên hai nhóm." }
    ],
    answer: "Có 35 cách chia nhóm.",
    takeaway: "Nếu gọi tên nhóm A, B thì có 70 cách; bỏ tên nhóm phải chia cho 2!.",
    sourcePages: [10]
  }],
  "20.10": [{
    title: "Dãy sáu chữ số có chữ số 0",
    prompt: "Mỗi vị trí của một dãy dài 6 được chọn từ 0 đến 9. Có bao nhiêu dãy chứa ít nhất một chữ số 0?",
    analysis: ["Đếm trực tiếp theo vị trí của số 0 dễ trùng lặp.", "Dùng phần bù: lấy toàn bộ dãy trừ các dãy không có số 0."],
    steps: [
      { label: "Tất cả các dãy", expression: "10⁶", text: "Mỗi trong 6 vị trí có 10 lựa chọn." },
      { label: "Không có chữ số 0", expression: "9⁶", text: "Mỗi vị trí chỉ chọn từ 1 đến 9." },
      { label: "Lấy phần bù", expression: "N = 10⁶ − 9⁶ = 468 559", text: "Hai tập nằm trong cùng không gian các dãy dài 6." }
    ],
    answer: "Có 468 559 dãy chứa ít nhất một chữ số 0.",
    takeaway: "Yêu cầu “ít nhất một” thường ngắn gọn nhất khi đếm qua biến cố đối.",
    sourcePages: [11]
  }],
  "20.11": [{
    title: "Chia hết cho 2 hoặc 3",
    prompt: "Trong các số từ 1 đến 100, có bao nhiêu số chia hết cho 2 hoặc chia hết cho 3?",
    analysis: ["Có 50 bội của 2 và 33 bội của 3.", "Các bội của 6 thuộc cả hai nhóm nên đã bị đếm hai lần."],
    steps: [
      { label: "Đếm hai tập", expression: "⌊100/2⌋ = 50; ⌊100/3⌋ = 33", text: "Đếm riêng bội của 2 và bội của 3." },
      { label: "Đếm phần giao", expression: "⌊100/6⌋ = 16", text: "Phần giao là các bội của BCNN(2,3) = 6." },
      { label: "Bù trừ", expression: "N = 50 + 33 − 16 = 67", text: "Trừ một lần phần giao bị đếm lặp." }
    ],
    answer: "Có 67 số thỏa mãn.",
    takeaway: "Khi đếm điều kiện chia hết đồng thời, phần giao được xác định bằng bội chung nhỏ nhất.",
    sourcePages: [11]
  }],
  "20.12": [{
    title: "Chọn ô không chung hàng, cột",
    prompt: "Trong bảng 4 × 5 ô, chọn 3 ô sao cho không có hai ô cùng hàng hoặc cùng cột. Có bao nhiêu cách?",
    analysis: ["Trước hết chọn 3 trong 4 hàng và 3 trong 5 cột.", "Sau đó ghép mỗi hàng đã chọn với đúng một cột đã chọn."],
    steps: [
      { label: "Chọn hàng", expression: "C(4,3) = 4", text: "Chọn ba hàng có chứa ô." },
      { label: "Chọn cột", expression: "C(5,3) = 10", text: "Chọn ba cột có chứa ô." },
      { label: "Ghép hàng với cột", expression: "3! = 6", text: "Mỗi song ánh tạo một bộ ba ô hợp lệ." },
      { label: "Kết hợp", expression: "N = 4 × 10 × 6 = 240", text: "Dùng quy tắc nhân qua ba giai đoạn." }
    ],
    answer: "Có 240 cách chọn.",
    takeaway: "Chọn hàng và cột mới chỉ tạo bảng con; cần nhân thêm k! cách ghép.",
    sourcePages: [12]
  }],
  "20.13": [{
    title: "Đường chéo và tam giác của thập giác",
    prompt: "Một thập giác lồi có bao nhiêu đường chéo và bao nhiêu tam giác có đỉnh là các đỉnh của thập giác?",
    analysis: ["Thập giác có n = 10 đỉnh.", "Tính lồi bảo đảm mọi bộ ba đỉnh tạo thành một tam giác."],
    steps: [
      { label: "Đường chéo", expression: "10(10 − 3)/2 = 35", text: "Từ C(10,2) đoạn nối hai đỉnh, loại 10 cạnh." },
      { label: "Tam giác", expression: "C(10,3) = 120", text: "Mỗi bộ ba đỉnh xác định duy nhất một tam giác." }
    ],
    answer: "Có 35 đường chéo và 120 tam giác.",
    takeaway: "Đối tượng hình học được đếm bằng tập đỉnh xác định duy nhất nó.",
    sourcePages: [12]
  }],
  "20.14": [{
    title: "Hai số có hiệu chia hết cho 5",
    prompt: "Chứng minh rằng trong 6 số nguyên bất kỳ luôn có hai số có hiệu chia hết cho 5.",
    analysis: ["Mỗi số nguyên có đúng một phần dư 0, 1, 2, 3 hoặc 4 khi chia cho 5.", "Có 6 số nhưng chỉ có 5 lớp dư."],
    steps: [
      { label: "Phân lớp", expression: "5 lớp dư", text: "Xếp mỗi số vào lớp theo phần dư modulo 5." },
      { label: "Dùng Dirichlet", expression: "6 đối tượng / 5 hộp", text: "Có ít nhất hai số nằm trong cùng một lớp dư." },
      { label: "Suy ra", expression: "a ≡ b (mod 5) ⇒ 5 | (a − b)", text: "Hiệu của hai số đó chia hết cho 5." }
    ],
    answer: "Luôn tồn tại hai số có hiệu chia hết cho 5.",
    takeaway: "Phân lớp theo phần dư biến điều kiện chia hết thành một ứng dụng trực tiếp của nguyên lý Dirichlet.",
    sourcePages: [13]
  }],
  "20.15": [{
    title: "Chữ số tận cùng của 7²⁰²⁶",
    prompt: "Tìm chữ số tận cùng của 7²⁰²⁶.",
    analysis: ["Chữ số tận cùng tương ứng với phần dư modulo 10.", "Các lũy thừa của 7 có chu kỳ tận cùng 7, 9, 3, 1 dài 4."],
    steps: [
      { label: "Xác định chu kỳ", expression: "7¹, 7², 7³, 7⁴ ≡ 7, 9, 3, 1 (mod 10)", text: "Chu kỳ lặp lại sau mỗi bốn số mũ." },
      { label: "Rút gọn số mũ", expression: "2026 ≡ 2 (mod 4)", text: "Chọn phần tử thứ hai trong chu kỳ." },
      { label: "Kết luận", expression: "7²⁰²⁶ ≡ 9 (mod 10)", text: "Phần dư modulo 10 là chữ số tận cùng." }
    ],
    answer: "Chữ số tận cùng là 9.",
    takeaway: "Với lũy thừa lớn, hãy tìm chu kỳ phần dư trước khi tính.",
    sourcePages: [13]
  }],
  "20.16": [{
    title: "Lập đội có đội trưởng",
    prompt: "Từ 8 người, lập đội gồm 1 đội trưởng và 3 thành viên. Có bao nhiêu cách?",
    analysis: ["Vai trò đội trưởng khác với ba thành viên còn lại.", "Có thể chọn theo hai thứ tự để kiểm tra kết quả."],
    steps: [
      { label: "Chọn đội trưởng", expression: "8 cách", text: "Bất kỳ người nào cũng có thể làm đội trưởng." },
      { label: "Chọn ba thành viên", expression: "C(7,3) = 35", text: "Chọn từ bảy người còn lại, không phân vai." },
      { label: "Nhân hai giai đoạn", expression: "N = 8 × C(7,3) = 280", text: "Mỗi đội trưởng kết hợp với một nhóm ba thành viên." }
    ],
    answer: "Có 280 cách lập đội.",
    takeaway: "Kiểm tra chéo: chọn 4 người rồi chọn đội trưởng, C(8,4) × 4 = 280.",
    sourcePages: [14]
  }],
  "20.17": [{
    title: "Tam giác từ mười điểm",
    prompt: "Có 10 điểm, trong đó đúng 4 điểm thẳng hàng; ngoài ra không có ba điểm nào thẳng hàng. Lập được bao nhiêu tam giác?",
    analysis: ["Mỗi bộ ba điểm thường xác định một tam giác.", "Các bộ ba chọn hoàn toàn từ 4 điểm thẳng hàng là cấu hình suy biến phải loại."],
    steps: [
      { label: "Chọn mọi bộ ba", expression: "C(10,3) = 120", text: "Tạm đếm tất cả các bộ ba điểm." },
      { label: "Loại bộ ba thẳng hàng", expression: "C(4,3) = 4", text: "Bốn điểm đặc biệt tạo bốn bộ ba không phải tam giác." },
      { label: "Kết quả", expression: "N = 120 − 4 = 116", text: "Không còn cấu hình suy biến nào khác." }
    ],
    answer: "Lập được 116 tam giác.",
    takeaway: "Đếm toàn bộ rồi trừ các tập điểm không tạo thành đối tượng hình học hợp lệ.",
    sourcePages: [14]
  }],
  "21.1": [{
    title: "Gieo một xúc xắc cân đối",
    prompt: "Gieo một xúc xắc cân đối. Tính xác suất xuất hiện số chẵn.",
    analysis: ["Không gian mẫu gồm sáu mặt và các kết quả đồng khả năng.", "Biến cố số chẵn gồm ba kết quả."],
    steps: [
      { label: "Không gian mẫu", expression: "Ω = {1,2,3,4,5,6}", text: "Có |Ω| = 6 kết quả." },
      { label: "Biến cố", expression: "A = {2,4,6}", text: "Có |A| = 3 kết quả thuận lợi." },
      { label: "Xác suất", expression: "P(A) = 3/6 = 1/2", text: "Dùng công thức cổ điển vì các mặt đồng khả năng." }
    ],
    answer: "Xác suất xuất hiện số chẵn là 1/2.",
    takeaway: "Trước khi dùng |A|/|Ω|, phải kiểm tra các kết quả sơ cấp có đồng khả năng.",
    sourcePages: [15]
  }],
  "21.2": [{
    title: "Ít nhất một lần ngửa",
    prompt: "Gieo một đồng xu cân đối 5 lần. Tính xác suất có ít nhất một lần xuất hiện mặt ngửa.",
    analysis: ["Đếm trực tiếp phải xét nhiều trường hợp.", "Biến cố đối là không có lần ngửa nào, tức cả 5 lần đều sấp."],
    steps: [
      { label: "Xác suất biến cố đối", expression: "P(Aᶜ) = (1/2)⁵", text: "Năm lần độc lập đều xuất hiện mặt sấp." },
      { label: "Lấy phần bù", expression: "P(A) = 1 − (1/2)⁵ = 31/32", text: "A là biến cố có ít nhất một lần ngửa." }
    ],
    answer: "Xác suất cần tìm là 31/32.",
    takeaway: "“Ít nhất một” thường được giải nhanh bằng 1 trừ xác suất “không có lần nào”.",
    sourcePages: [15]
  }],
  "21.3": [{
    title: "Số chia hết cho 2 hoặc 3",
    prompt: "Chọn ngẫu nhiên một số từ 1 đến 20. Tính xác suất số được chọn chia hết cho 2 hoặc chia hết cho 3.",
    analysis: ["Gọi A là biến cố chia hết cho 2 và B là biến cố chia hết cho 3.", "Các bội của 6 thuộc cả A và B nên phần giao phải được trừ một lần."],
    steps: [
      { label: "Đếm A và B", expression: "|A| = 10; |B| = 6", text: "Có 10 số chẵn và 6 bội của 3 trong đoạn." },
      { label: "Đếm phần giao", expression: "|A ∩ B| = 3", text: "Các số 6, 12, 18 chia hết cho cả 2 và 3." },
      { label: "Đếm hợp", expression: "|A ∪ B| = 10 + 6 − 3 = 13", text: "Dùng nguyên lý bù trừ." },
      { label: "Tính xác suất", expression: "P(A ∪ B) = 13/20", text: "Hai mươi số được chọn đồng khả năng." }
    ],
    answer: "Xác suất cần tìm là 13/20.",
    takeaway: "Từ “hoặc” là phép hợp bao hàm, kể cả trường hợp cả hai biến cố cùng xảy ra.",
    sourcePages: [16]
  }],
  "21.4": [{
    title: "Lá cơ đồng thời là lá hình người",
    prompt: "Rút ngẫu nhiên một lá từ bộ bài 52 lá. Tính xác suất lá đó vừa là lá cơ, vừa là lá hình người J, Q hoặc K.",
    analysis: ["A là biến cố rút được lá cơ; B là biến cố rút được J, Q hoặc K.", "A ∩ B gồm các lá thỏa đồng thời cả hai điều kiện."],
    steps: [
      { label: "Xác định phần giao", expression: "A ∩ B = {J♥, Q♥, K♥}", text: "Có đúng ba lá cơ là lá hình người." },
      { label: "Tính xác suất", expression: "P(A ∩ B) = 3/52", text: "Bộ bài có 52 lá đồng khả năng." }
    ],
    answer: "Xác suất cần tìm là 3/52.",
    takeaway: "Biến cố giao yêu cầu mọi điều kiện phải đồng thời được thỏa mãn.",
    sourcePages: [16]
  }],
  "21.5": [{
    title: "Số chẵn và số lẻ",
    prompt: "Gieo một xúc xắc một lần. Xét A: “ra số chẵn” và B: “ra số lẻ”. Hai biến cố có xung khắc không?",
    analysis: ["Một kết quả của xúc xắc không thể vừa chẵn vừa lẻ.", "Hai biến cố không có kết quả sơ cấp chung."],
    steps: [
      { label: "Liệt kê", expression: "A = {2,4,6}; B = {1,3,5}", text: "Hai tập kết quả tách biệt." },
      { label: "Xét giao", expression: "A ∩ B = ∅", text: "Không thể cùng xảy ra trong một lần gieo." }
    ],
    answer: "A và B là hai biến cố xung khắc.",
    takeaway: "Xung khắc mô tả việc không thể cùng xảy ra; khái niệm này khác với độc lập.",
    sourcePages: [16]
  }],
  "21.6": [{
    title: "Hai đồng xu độc lập",
    prompt: "Gieo hai đồng xu cân đối. Gọi A: “đồng thứ nhất ngửa”, B: “đồng thứ hai ngửa”. Kiểm tra tính độc lập của A và B.",
    analysis: ["Kết quả của đồng xu thứ nhất không ảnh hưởng đồng xu thứ hai.", "Có thể kiểm tra bằng công thức xác suất của giao."],
    steps: [
      { label: "Xác suất riêng", expression: "P(A) = P(B) = 1/2", text: "Mỗi đồng xu cân đối." },
      { label: "Xác suất giao", expression: "P(A ∩ B) = 1/4", text: "Trong bốn kết quả đồng khả năng, có một kết quả cả hai cùng ngửa." },
      { label: "So sánh", expression: "1/4 = (1/2)(1/2)", text: "P(A ∩ B) = P(A)P(B)." }
    ],
    answer: "A và B độc lập.",
    takeaway: "Hãy xác nhận độc lập bằng mô hình hoặc công thức, không chỉ dựa vào trực giác.",
    sourcePages: [17]
  }],
  "21.7": [{
    title: "Áp dụng công thức cộng",
    prompt: "Cho P(A) = 0,6; P(B) = 0,5 và P(A ∩ B) = 0,3. Tính P(A ∪ B).",
    analysis: ["A và B có phần giao với xác suất 0,3.", "Nếu chỉ cộng P(A) và P(B), phần giao sẽ bị đếm hai lần."],
    steps: [
      { label: "Công thức", expression: "P(A ∪ B) = P(A) + P(B) − P(A ∩ B)", text: "Trừ một lần xác suất của phần giao." },
      { label: "Thay số", expression: "0,6 + 0,5 − 0,3 = 0,8", text: "Kết quả nằm trong đoạn từ 0 đến 1." }
    ],
    answer: "P(A ∪ B) = 0,8.",
    takeaway: "Chỉ bỏ số hạng phần giao khi A và B xung khắc.",
    sourcePages: [17]
  }],
  "21.8": [{
    title: "Rút hai bi đỏ không hoàn lại",
    prompt: "Một hộp có 3 bi đỏ và 2 bi xanh. Rút liên tiếp 2 bi không hoàn lại. Tính xác suất cả hai bi đều đỏ.",
    analysis: ["Lần đầu có 3 bi đỏ trong 5 bi.", "Sau khi đã rút một bi đỏ, hộp còn 2 bi đỏ trong 4 bi nên xác suất bước sau thay đổi."],
    steps: [
      { label: "Bi đầu tiên đỏ", expression: "P(A₁) = 3/5", text: "Có ba kết quả thuận lợi trong năm viên." },
      { label: "Bi thứ hai đỏ với điều kiện bi đầu đỏ", expression: "P(A₂ | A₁) = 2/4", text: "Không hoàn lại nên còn bốn viên." },
      { label: "Nhân theo điều kiện", expression: "P(A₁ ∩ A₂) = (3/5)(2/4) = 3/10", text: "Dùng công thức nhân xác suất." }
    ],
    answer: "Xác suất cả hai bi đều đỏ là 3/10.",
    takeaway: "Trong phép rút không hoàn lại, mẫu số và số trường hợp thuận lợi phải được cập nhật sau mỗi bước.",
    sourcePages: [18]
  }]
});

export const exampleContent = Object.freeze({
  ...calculusExampleContent,
  ...probabilityExampleContent
});

export function getExampleContent(sourceTopic) {
  return exampleContent[sourceTopic] ?? null;
}
