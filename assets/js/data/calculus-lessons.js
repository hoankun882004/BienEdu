import { calculusKnowledgeDetails } from "./calculus-knowledge-details.js?v=8.6";
import { calculusSourceExamples } from "./calculus-source-examples.js?v=11.2";

// Structured lessons adapted from the verified CD12–CD14 calculus source PDF.
// The source page numbers below refer to pages in the bundled 49-page PDF.
const SOURCE_ID = "cd12-cd14-calculus";

function lesson({
  title,
  pages,
  lead,
  formulae,
  points,
  note,
  example,
  practice
}) {
  return Object.freeze({
    title,
    pages: Object.freeze(pages),
    reading: Object.freeze({
      lead,
      formulae: Object.freeze(formulae),
      points: Object.freeze(points),
      note: Object.freeze(note)
    }),
    examples: Object.freeze([Object.freeze({ ...example, sourcePages: Object.freeze(example.sourcePages) })]),
    practice: Object.freeze(practice.map((question) => Object.freeze(question)))
  });
}

const rawCalculusLessons = Object.freeze({
  "12.1": lesson({
    title: "Nguyên hàm cơ bản",
    pages: [3, 4],
    lead: "Nguyên hàm của hàm số f trên một khoảng là hàm F có đạo hàm bằng f. Mọi nguyên hàm của cùng một hàm số chỉ khác nhau một hằng số.",
    formulae: [
      { label: "Họ nguyên hàm", value: "∫f(x)dx = F(x) + C", detail: "Trong đó F′(x)=f(x) và C là hằng số tùy ý." },
      { label: "Công thức lũy thừa", value: "∫xⁿdx = xⁿ⁺¹/(n+1) + C", detail: "Áp dụng khi n ≠ −1; riêng ∫1/x dx = ln|x| + C." }
    ],
    points: [
      { label: "Đạo hàm để kiểm tra", text: "Sau khi tìm được F(x), lấy đạo hàm của kết quả. Nếu F′(x)=f(x) thì phép tính đúng." },
      { label: "Tính tuyến tính", text: "Có thể đưa hằng số ra ngoài dấu tích phân và tách tổng thành các tích phân đơn giản." }
    ],
    note: { label: "Cần nhớ", text: "Không được bỏ hằng số C trong nguyên hàm bất định; C biểu diễn toàn bộ các hàm có cùng đạo hàm.", tone: "warning" },
    example: {
      title: "Tính nguyên hàm của đa thức đơn giản",
      prompt: "Tìm nguyên hàm của hàm số f(x)=3x²−4x+5.",
      analysis: ["Tách tích phân theo từng hạng tử.", "Áp dụng công thức lũy thừa rồi cộng hằng số C."],
      steps: [
        { label: "Tách các hạng tử", expression: "∫(3x²−4x+5)dx = 3∫x²dx − 4∫x dx + 5∫dx", text: "Tính tuyến tính cho phép xử lý từng hạng tử độc lập." },
        { label: "Lấy nguyên hàm", expression: "F(x)=x³−2x²+5x+C", text: "Đạo hàm lại thu được 3x²−4x+5." }
      ],
      answer: "F(x)=x³−2x²+5x+C.",
      takeaway: "Tách tổng, áp dụng bảng nguyên hàm và luôn thêm hằng số C.",
      sourcePages: [3]
    },
    practice: [
      { prompt: "Nguyên hàm của 4x³ là biểu thức nào?", answer: "x⁴+C", distractors: ["4x⁴+C", "x³+C", "12x²+C"], solution: "Vì (x⁴)′=4x³ nên ∫4x³dx=x⁴+C." },
      { prompt: "Nguyên hàm của 1/x trên mỗi khoảng xác định là gì?", answer: "ln|x|+C", distractors: ["1/x²+C", "ln x+C với mọi x≠0", "x ln|x|+C"], solution: "Đạo hàm của ln|x| bằng 1/x với x≠0, do đó kết quả là ln|x|+C." },
      { prompt: "Vì sao phải viết hằng số C trong nguyên hàm bất định?", answer: "Các nguyên hàm của cùng một hàm chỉ khác nhau một hằng số", distractors: ["Để miền xác định rộng hơn", "Để đổi dấu đạo hàm", "Để tích phân luôn dương"], solution: "Nếu F′=f thì (F+C)′=f với mọi hằng số C; vì vậy C biểu diễn cả họ nguyên hàm." }
    ]
  }),
  "12.2": lesson({
    title: "Nguyên hàm đa thức",
    pages: [5, 6],
    lead: "Với đa thức, cần khai triển hoặc thu gọn biểu thức trước, sau đó lấy nguyên hàm từng đơn thức bằng quy tắc tăng số mũ lên một và chia cho số mũ mới.",
    formulae: [
      { label: "Đơn thức", value: "∫axⁿdx = a·xⁿ⁺¹/(n+1) + C", detail: "Điều kiện n ≠ −1; hệ số a được giữ nguyên." },
      { label: "Đa thức", value: "∫(a₀+a₁x+⋯+aₙxⁿ)dx = a₀x+a₁x²/2+⋯+aₙxⁿ⁺¹/(n+1)+C", detail: "Thực hiện lần lượt cho từng hạng tử." }
    ],
    points: [
      { label: "Khai triển trước", text: "Nếu biểu thức ở dạng tích, khai triển và gom các hạng tử đồng dạng để tránh bỏ sót." },
      { label: "Kiểm tra hệ số", text: "Đạo hàm từng hạng tử của kết quả để kiểm tra cả số mũ lẫn hệ số." }
    ],
    note: { label: "Sai lầm hay gặp", text: "Không chỉ tăng số mũ; phải chia cho số mũ mới. Ví dụ ∫x³dx=x⁴/4+C.", tone: "warning" },
    example: {
      title: "Khai triển rồi lấy nguyên hàm",
      prompt: "Khai triển biểu thức rồi tính I=∫(2x−1)(x²+3x)dx.",
      analysis: ["Biểu thức dưới dấu tích phân là tích của hai đa thức nên cần khai triển.", "Sau khi thu gọn, lấy nguyên hàm từng đơn thức."],
      steps: [
        { label: "Khai triển", expression: "(2x−1)(x²+3x)=2x³+5x²−3x", text: "Nhân phân phối rồi gom các hạng tử cùng bậc." },
        { label: "Lấy nguyên hàm", expression: "I=x⁴/2+5x³/3−3x²/2+C", text: "Áp dụng công thức lũy thừa cho ba hạng tử." }
      ],
      answer: "I=x⁴/2+5x³/3−3x²/2+C.",
      takeaway: "Đưa đa thức về tổng các đơn thức trước khi dùng bảng nguyên hàm.",
      sourcePages: [5]
    },
    practice: [
      { prompt: "Tính ∫(6x²−2x+1)dx.", answer: "2x³−x²+x+C", distractors: ["6x³−2x²+x+C", "3x²−2+C", "2x³−x²+C"], solution: "Lấy nguyên hàm từng hạng tử: 6x²→2x³, −2x→−x² và 1→x." },
      { prompt: "Bước đầu tiên khi tính ∫(x+1)(x−2)dx là gì?", answer: "Khai triển thành x²−x−2", distractors: ["Đặt u=x+1", "Lấy nguyên hàm từng thừa số", "Đổi cận tích phân"], solution: "Đây là tích hai đa thức; khai triển thành x²−x−2 giúp lấy nguyên hàm từng hạng tử." },
      { prompt: "Nguyên hàm của −5x⁴ là gì?", answer: "−x⁵+C", distractors: ["−5x⁵+C", "−20x³+C", "x⁵+C"], solution: "Ta có ∫−5x⁴dx=−5·x⁵/5+C=−x⁵+C." }
    ]
  }),
  "12.3": lesson({
    title: "Nguyên hàm phân thức",
    pages: [7],
    lead: "Khi tính nguyên hàm phân thức, hãy so sánh tử số với đạo hàm mẫu số. Nếu chưa phù hợp, thực hiện chia đa thức hoặc phân tích thành các phân thức đơn giản.",
    formulae: [
      { label: "Dạng logarit", value: "∫u′(x)/u(x) dx = ln|u(x)| + C", detail: "Áp dụng trên khoảng mà u(x) khác 0." },
      { label: "Phân thức đơn giản", value: "∫1/(ax+b) dx = (1/a)ln|ax+b| + C", detail: "Hệ số a xuất hiện do đạo hàm của ax+b." }
    ],
    points: [
      { label: "Nhìn đạo hàm mẫu", text: "Nếu tử số bằng hoặc tỉ lệ với đạo hàm của mẫu, đưa ngay về dạng u′/u." },
      { label: "Bậc tử lớn", text: "Nếu bậc tử không nhỏ hơn bậc mẫu, phải chia đa thức trước khi lấy nguyên hàm." }
    ],
    note: { label: "Cần nhớ", text: "Kết quả logarit phải viết ln|u(x)|, trừ khi miền đang xét bảo đảm u(x)>0.", tone: "warning" },
    example: {
      title: "Nhận dạng đạo hàm của mẫu",
      prompt: "Nhận dạng đạo hàm của mẫu rồi tính I=∫(2x+1)/(x²+x+1)dx.",
      analysis: ["Mẫu số là u=x²+x+1.", "Tử số 2x+1 đúng bằng u′ nên tích phân có dạng u′/u."],
      steps: [
        { label: "Đặt biểu thức mẫu", expression: "u=x²+x+1 ⇒ du=(2x+1)dx", text: "Tử số cùng với dx được thay bởi du." },
        { label: "Áp dụng công thức", expression: "I=∫du/u=ln|u|+C=ln(x²+x+1)+C", text: "Mẫu luôn dương vì Δ=−3<0 và hệ số đầu dương." }
      ],
      answer: "I=ln(x²+x+1)+C.",
      takeaway: "Luôn kiểm tra tử số có phải đạo hàm của mẫu hay không.",
      sourcePages: [7]
    },
    practice: [
      { prompt: "Tính ∫2x/(x²+3)dx.", answer: "ln(x²+3)+C", distractors: ["2ln(x²+3)+C", "1/(x²+3)+C", "x²/(x²+3)+C"], solution: "Đặt u=x²+3 thì du=2x dx, nên tích phân bằng ln|u|+C=ln(x²+3)+C." },
      { prompt: "Tính ∫1/(3x−2)dx.", answer: "(1/3)ln|3x−2|+C", distractors: ["3ln|3x−2|+C", "ln|3x−2|+C", "1/(3x−2)²+C"], solution: "Vì đạo hàm của 3x−2 là 3, phải nhân thêm hệ số 1/3." },
      { prompt: "Khi bậc tử lớn hơn hoặc bằng bậc mẫu, nên làm gì trước?", answer: "Chia đa thức", distractors: ["Đổi biến lượng giác", "Bỏ mẫu số", "Đặt từng phần ngay"], solution: "Chia đa thức đưa phân thức thành đa thức cộng một phân thức đúng, rồi mới lấy nguyên hàm." }
    ]
  }),
  "12.4": lesson({
    title: "Nguyên hàm lượng giác",
    pages: [8, 9],
    lead: "Nguyên hàm lượng giác dựa trên bảng đạo hàm và các công thức biến đổi. Khi gặp lũy thừa hoặc tích lượng giác, cần biến đổi về tổng các hàm cơ bản trước.",
    formulae: [
      { label: "Cặp cơ bản", value: "∫cos x dx=sin x+C; ∫sin x dx=−cos x+C", detail: "Dấu âm ở nguyên hàm của sin x là điểm dễ nhầm." },
      { label: "Hạ bậc", value: "sin²x=(1−cos2x)/2; cos²x=(1+cos2x)/2", detail: "Dùng để xử lý bình phương sin hoặc cos." }
    ],
    points: [
      { label: "Đổi góc", text: "Với sin(ax+b) hoặc cos(ax+b), chia thêm cho hệ số a sau khi lấy nguyên hàm." },
      { label: "Biến đổi trước", text: "Tích hoặc lũy thừa lượng giác thường cần công thức hạ bậc, nhân đôi hoặc tích thành tổng." }
    ],
    note: { label: "Sai lầm hay gặp", text: "Quên hệ số của góc: ∫cos(3x)dx=(1/3)sin(3x)+C, không phải sin(3x)+C.", tone: "warning" },
    example: {
      title: "Hạ bậc sin bình phương",
      prompt: "Dùng công thức hạ bậc để tính nguyên hàm I=∫sin²x dx.",
      analysis: ["sin²x không nằm trực tiếp trong bảng nguyên hàm cơ bản.", "Dùng công thức hạ bậc để đổi thành tổng của 1 và cos2x."],
      steps: [
        { label: "Hạ bậc", expression: "sin²x=(1−cos2x)/2", text: "Đưa tích phân về hai hạng tử cơ bản." },
        { label: "Lấy nguyên hàm", expression: "I=x/2−sin2x/4+C", text: "Nguyên hàm của cos2x là sin2x/2." }
      ],
      answer: "I=x/2−sin2x/4+C.",
      takeaway: "Bình phương sin hoặc cos nên được hạ bậc trước khi tích phân.",
      sourcePages: [8]
    },
    practice: [
      { prompt: "Tính ∫cos(2x)dx.", answer: "(1/2)sin(2x)+C", distractors: ["2sin(2x)+C", "sin(2x)+C", "−(1/2)sin(2x)+C"], solution: "Đạo hàm sin(2x) là 2cos(2x), nên cần hệ số 1/2." },
      { prompt: "Công thức hạ bậc nào đúng?", answer: "cos²x=(1+cos2x)/2", distractors: ["cos²x=(1−cos2x)/2", "cos²x=1−cos2x", "cos²x=(1+sin2x)/2"], solution: "Từ cos2x=2cos²x−1 suy ra cos²x=(1+cos2x)/2." },
      { prompt: "Tính ∫sin(3x)dx.", answer: "−(1/3)cos(3x)+C", distractors: ["(1/3)cos(3x)+C", "−3cos(3x)+C", "cos(3x)+C"], solution: "Đạo hàm cos(3x) là −3sin(3x), vì vậy kết quả là −cos(3x)/3+C." }
    ]
  }),
  "12.5": lesson({
    title: "Nguyên hàm mũ – logarit",
    pages: [10, 11],
    lead: "Với hàm mũ và logarit, cần phân biệt cơ số e với cơ số a, đồng thời nhận dạng dạng 1/x. Hệ số trong số mũ phải được bù bằng phép chia.",
    formulae: [
      { label: "Hàm mũ", value: "∫eˣdx=eˣ+C; ∫aˣdx=aˣ/ln a+C", detail: "Điều kiện a>0 và a≠1." },
      { label: "Dạng logarit", value: "∫1/x dx=ln|x|+C", detail: "Giá trị tuyệt đối bảo đảm công thức đúng khi x dương lẫn khi x âm." }
    ],
    points: [
      { label: "Số mũ tuyến tính", text: "Với e^(ax+b) hoặc c^(ax+b), chia kết quả cho a." },
      { label: "Tách tổng", text: "Nếu biểu thức gồm hàm mũ và phân thức 1/x, lấy nguyên hàm từng phần rồi cộng lại." }
    ],
    note: { label: "Cần nhớ", text: "Nguyên hàm aˣ có mẫu ln a; chỉ eˣ mới giữ nguyên sau khi lấy nguyên hàm.", tone: "warning" },
    example: {
      title: "Kết hợp hàm mũ và logarit",
      prompt: "Tính I=∫(2ˣ+3/x)dx trên một khoảng không chứa 0.",
      analysis: ["Tách tích phân thành phần hàm mũ và phần 1/x.", "Dùng đúng công thức cho cơ số 2 và giữ giá trị tuyệt đối trong logarit."],
      steps: [
        { label: "Tách tích phân", expression: "I=∫2ˣdx+3∫dx/x", text: "Hệ số 3 được đưa ra ngoài dấu tích phân." },
        { label: "Áp dụng bảng", expression: "I=2ˣ/ln2+3ln|x|+C", text: "Hai họ hằng số được gộp thành một hằng số C." }
      ],
      answer: "I=2ˣ/ln2+3ln|x|+C.",
      takeaway: "Nhớ mẫu ln a với aˣ và giá trị tuyệt đối với ln|x|.",
      sourcePages: [10]
    },
    practice: [
      { prompt: "Tính ∫3ˣdx.", answer: "3ˣ/ln3+C", distractors: ["3ˣ+C", "3ˣln3+C", "x·3ˣ+C"], solution: "Với a=3, công thức là ∫aˣdx=aˣ/ln a+C." },
      { prompt: "Tính ∫e^(2x)dx.", answer: "(1/2)e^(2x)+C", distractors: ["2e^(2x)+C", "e^(2x)+C", "eˣ²+C"], solution: "Đạo hàm e^(2x) bằng 2e^(2x), nên phải chia kết quả cho 2." },
      { prompt: "Điều kiện của cơ số a trong công thức ∫aˣdx là gì?", answer: "a>0 và a≠1", distractors: ["a≠0", "a>1", "a là số nguyên dương"], solution: "Hàm mũ cơ số a dùng trong công thức này cần a>0, a≠1 để ln a xác định và khác 0." }
    ]
  }),
  "12.6": lesson({
    title: "Đổi biến số",
    pages: [12],
    lead: "Phương pháp đổi biến thay một biểu thức phức tạp bằng biến mới u, đồng thời thay vi phân tương ứng. Mục tiêu là đưa tích phân về một mẫu quen thuộc.",
    formulae: [
      { label: "Đổi biến", value: "u=g(x), du=g′(x)dx", detail: "Nếu tích phân chứa f(g(x))g′(x)dx thì trở thành ∫f(u)du." }
    ],
    points: [
      { label: "Chọn u", text: "Ưu tiên biểu thức nằm trong lũy thừa, căn, hàm lượng giác, hàm mũ hoặc mẫu số." },
      { label: "Đổi đồng bộ", text: "Toàn bộ biểu thức và dx phải được chuyển sang u; cuối cùng đổi kết quả trở lại x." }
    ],
    note: { label: "Sai lầm hay gặp", text: "Đặt u nhưng vẫn để lẫn x trong tích phân mới. Hãy kiểm tra mọi thừa số đã được thay thế trước khi tính.", tone: "warning" },
    example: {
      title: "Đổi biến theo biểu thức trong cos",
      prompt: "Dùng phương pháp đổi biến để tính I=∫2x·cos(x²+1)dx.",
      analysis: ["Biểu thức trong cos là x²+1.", "Đạo hàm của x²+1 đúng bằng 2x, xuất hiện sẵn trong tích phân."],
      steps: [
        { label: "Đặt biến", expression: "u=x²+1 ⇒ du=2x dx", text: "Tích 2x dx được thay hoàn toàn bằng du." },
        { label: "Tích phân theo u", expression: "I=∫cosu du=sinu+C=sin(x²+1)+C", text: "Đổi u trở lại biểu thức ban đầu." }
      ],
      answer: "I=sin(x²+1)+C.",
      takeaway: "Chọn u sao cho du xuất hiện trọn vẹn trong phần còn lại của tích phân.",
      sourcePages: [12]
    },
    practice: [
      { prompt: "Với I=∫3x²(x³+2)⁵dx, nên đặt u bằng gì?", answer: "u=x³+2", distractors: ["u=x²", "u=(x³+2)⁵", "u=3x²"], solution: "Đặt u=x³+2 thì du=3x²dx, khớp đúng thừa số còn lại." },
      { prompt: "Tính ∫2x·e^(x²)dx.", answer: "e^(x²)+C", distractors: ["2e^(x²)+C", "x²e^(x²)+C", "eˣ²/2+C"], solution: "Đặt u=x², du=2x dx; tích phân trở thành ∫eᵘdu=eᵘ+C." },
      { prompt: "Sau khi đặt u=g(x), yêu cầu nào là bắt buộc?", answer: "Đổi toàn bộ biểu thức và dx sang biến u", distractors: ["Giữ lại ít nhất một biến x", "Luôn đổi u thành số", "Bỏ hằng số C"], solution: "Một tích phân theo u không được còn lẫn x; mọi thừa số phải được đổi đồng bộ." }
    ]
  }),
  "12.7": lesson({
    title: "Từng phần",
    pages: [13, 14],
    lead: "Tích phân từng phần phù hợp với tích của hai loại hàm mà một phần trở nên đơn giản khi đạo hàm, còn phần kia có nguyên hàm dễ tìm.",
    formulae: [
      { label: "Từng phần", value: "∫u dv = uv − ∫v du", detail: "Chọn u để du đơn giản và chọn dv sao cho tìm được v." }
    ],
    points: [
      { label: "Ưu tiên chọn u", text: "Logarit và hàm lượng giác ngược thường được chọn làm u; sau đó đến đa thức, lượng giác và hàm mũ." },
      { label: "Lập bảng", text: "Ghi rõ u, du, dv, v trước khi thế vào công thức để tránh sai dấu." }
    ],
    note: { label: "Sai lầm hay gặp", text: "Công thức có dấu trừ trước tích phân còn lại. Sau khi tính v, hãy thế đủ cả hai hạng tử uv và ∫vdu.", tone: "warning" },
    example: {
      title: "Tích của đa thức và hàm mũ",
      prompt: "Dùng phương pháp tích phân từng phần để tính I=∫x eˣdx.",
      analysis: ["Chọn đa thức x làm u vì đạo hàm của nó giảm bậc.", "Phần eˣdx có nguyên hàm vẫn là eˣ."],
      steps: [
        { label: "Chọn các phần", expression: "u=x, du=dx; dv=eˣdx, v=eˣ", text: "Hai cặp vi phân đã sẵn sàng cho công thức từng phần." },
        { label: "Áp dụng công thức", expression: "I=xeˣ−∫eˣdx=(x−1)eˣ+C", text: "Đặt eˣ làm nhân tử chung ở kết quả." }
      ],
      answer: "I=(x−1)eˣ+C.",
      takeaway: "Với đa thức nhân hàm mũ, thường chọn đa thức làm u.",
      sourcePages: [13]
    },
    practice: [
      { prompt: "Trong ∫x cosx dx, lựa chọn nào phù hợp?", answer: "u=x, dv=cosx dx", distractors: ["u=cosx, dv=x dx", "u=x cosx, dv=dx", "u=1, dv=x cosx dx"], solution: "Chọn u=x làm đạo hàm giảm bậc và dv=cosx dx có nguyên hàm v=sinx." },
      { prompt: "Tính ∫x eˣdx.", answer: "(x−1)eˣ+C", distractors: ["(x+1)eˣ+C", "xeˣ+C", "x²eˣ/2+C"], solution: "Từng phần với u=x, dv=eˣdx cho xeˣ−eˣ+C=(x−1)eˣ+C." },
      { prompt: "Dấu đúng trong công thức tích phân từng phần là gì?", answer: "∫u dv=uv−∫v du", distractors: ["∫u dv=uv+∫v du", "∫u dv=u/v", "∫u dv=du·v"], solution: "Công thức được suy ra từ d(uv)=u dv+v du, nên chuyển vdu sang vế kia tạo dấu trừ." }
    ]
  }),
  "12.8": lesson({
    title: "Tìm hàm số khi biết đạo hàm",
    pages: [15, 16],
    lead: "Biết f′(x) cho phép tìm f(x) bằng nguyên hàm, nhưng còn một hằng số chưa xác định. Các tính chất như chẵn, lẻ hoặc dữ kiện đồ thị giúp xác định hằng số đó.",
    formulae: [
      { label: "Khôi phục hàm", value: "f(x)=∫f′(x)dx=F(x)+C", detail: "Cần thêm một điều kiện độc lập để xác định C." },
      { label: "Hàm lẻ", value: "f(−x)=−f(x), đặc biệt f(0)=0", detail: "Dùng f(0)=0 khi miền xác định đối xứng và chứa 0." }
    ],
    points: [
      { label: "Bước 1", text: "Lấy nguyên hàm của f′ để thu được họ hàm f(x)=F(x)+C." },
      { label: "Bước 2", text: "Dùng tính chẵn, lẻ, một điểm thuộc đồ thị hoặc điều kiện khác để tìm C." }
    ],
    note: { label: "Cần nhớ", text: "Biết đạo hàm chưa xác định duy nhất hàm số. Không được tự ý cho C=0 nếu đề chưa cung cấp điều kiện phù hợp.", tone: "warning" },
    example: {
      title: "Dùng tính lẻ để xác định hằng số",
      prompt: "Cho f′(x)=3x²+2 và f là hàm lẻ. Tìm f(x).",
      analysis: ["Lấy nguyên hàm của f′ để được f(x)=x³+2x+C.", "Hàm lẻ xác định tại 0 phải thỏa f(0)=0."],
      steps: [
        { label: "Lấy nguyên hàm", expression: "f(x)=x³+2x+C", text: "Đây là họ hàm có đạo hàm bằng 3x²+2." },
        { label: "Dùng tính lẻ", expression: "f(0)=C=0", text: "Do đó hằng số cần tìm bằng 0." }
      ],
      answer: "f(x)=x³+2x.",
      takeaway: "Sau khi lấy nguyên hàm, dùng điều kiện hình học hoặc tính chất hàm để tìm C.",
      sourcePages: [15]
    },
    practice: [
      { prompt: "Nếu f′(x)=2x và f(1)=3 thì f(x) bằng gì?", answer: "x²+2", distractors: ["x²+3", "2x²+1", "x²−2"], solution: "f=x²+C. Thay f(1)=3 được 1+C=3, nên C=2." },
      { prompt: "Nếu f là hàm lẻ và xác định tại 0 thì điều kiện nào luôn đúng?", answer: "f(0)=0", distractors: ["f(0)=1", "f′(0)=0", "f(x)>0"], solution: "Từ f(−0)=−f(0) suy ra f(0)=−f(0), do đó f(0)=0." },
      { prompt: "Sau khi lấy nguyên hàm f′(x), vì sao vẫn cần thêm dữ kiện?", answer: "Để xác định hằng số C", distractors: ["Để đổi biến x", "Để xác định đạo hàm", "Để bỏ miền xác định"], solution: "Mọi hàm F+C có cùng đạo hàm, nên một điều kiện độc lập là cần thiết để tìm C." }
    ]
  }),
  "12.9": lesson({
    title: "Tìm nguyên hàm khi biết điều kiện ban đầu F(x₀)=a",
    pages: [17, 18],
    lead: "Điều kiện ban đầu biến một họ nguyên hàm thành một hàm xác định duy nhất. Sau khi tích phân, thay đúng tọa độ đã cho để giải hằng số C.",
    formulae: [
      { label: "Điều kiện ban đầu", value: "F′(x)=f(x), F(x₀)=a", detail: "Từ F(x)=F₀(x)+C suy ra C=a−F₀(x₀)." }
    ],
    points: [
      { label: "Lấy nguyên hàm", text: "Tìm một nguyên hàm F₀ của f rồi viết F=F₀+C." },
      { label: "Thay điều kiện", text: "Thế x=x₀ và F(x₀)=a vào biểu thức đầy đủ để tìm C, sau đó kết luận hàm F." }
    ],
    note: { label: "Sai lầm hay gặp", text: "Không thay điều kiện vào F′. Dữ kiện F(x₀)=a phải được thế vào hàm nguyên hàm F sau khi đã cộng C.", tone: "warning" },
    example: {
      title: "Xác định nguyên hàm qua một điểm",
      prompt: "Tìm F biết F′(x)=x²−4 và F(2)=5.",
      analysis: ["Lấy nguyên hàm của x²−4 để tạo họ hàm.", "Thay x=2 vào F, không thay vào F′, để xác định C."],
      steps: [
        { label: "Lấy nguyên hàm", expression: "F(x)=x³/3−4x+C", text: "Hằng số C chưa được xác định ở bước này." },
        { label: "Dùng F(2)=5", expression: "8/3−8+C=5 ⇒ C=31/3", text: "Giải phương trình một ẩn C." }
      ],
      answer: "F(x)=x³/3−4x+31/3.",
      takeaway: "Thế điều kiện ban đầu sau khi đã viết đủ họ nguyên hàm F₀+C.",
      sourcePages: [17]
    },
    practice: [
      { prompt: "Tìm F biết F′(x)=3x² và F(1)=4.", answer: "F(x)=x³+3", distractors: ["F(x)=x³+4", "F(x)=3x³+1", "F(x)=x²+3"], solution: "F=x³+C. Từ F(1)=1+C=4 suy ra C=3." },
      { prompt: "Với F(x)=F₀(x)+C và F(x₀)=a, C bằng gì?", answer: "a−F₀(x₀)", distractors: ["a+F₀(x₀)", "F₀(x₀)−a", "a·F₀(x₀)"], solution: "Thay x₀: F₀(x₀)+C=a, nên C=a−F₀(x₀)." },
      { prompt: "Dữ kiện F(0)=2 được dùng ở thời điểm nào?", answer: "Sau khi lấy nguyên hàm và viết F=F₀+C", distractors: ["Trước khi đọc F′", "Thay trực tiếp vào F′", "Chỉ dùng để tìm miền xác định"], solution: "Điều kiện giá trị của F dùng để tìm hằng số C trong họ nguyên hàm." }
    ]
  }),
  "13.1": lesson({
    title: "Tính tích phân cơ bản",
    pages: [19],
    lead: "Tích phân xác định được tính bằng hiệu giá trị của một nguyên hàm tại cận trên và cận dưới. Kết quả là một số và không còn hằng số C.",
    formulae: [
      { label: "Newton–Leibniz", value: "∫ₐᵇf(x)dx = F(b)−F(a)", detail: "Áp dụng khi F′(x)=f(x) trên đoạn đang xét." }
    ],
    points: [
      { label: "Tìm nguyên hàm", text: "Chọn một nguyên hàm F của hàm dưới dấu tích phân." },
      { label: "Thế đúng thứ tự", text: "Tính F(b) trước rồi trừ F(a); nên đặt toàn bộ F(a) trong ngoặc." }
    ],
    note: { label: "Sai lầm hay gặp", text: "Tích phân xác định không viết +C. Hằng số sẽ tự triệt tiêu trong hiệu F(b)−F(a).", tone: "warning" },
    example: {
      title: "Áp dụng công thức Newton–Leibniz",
      prompt: "Áp dụng công thức Newton–Leibniz để tính I=∫₀²(3x²−2x)dx.",
      analysis: ["Một nguyên hàm của 3x²−2x là F(x)=x³−x².", "Dùng hiệu F(2)−F(0), không thêm hằng số C."],
      steps: [
        { label: "Tìm nguyên hàm", expression: "F(x)=x³−x²", text: "Đạo hàm của F đúng bằng 3x²−2x." },
        { label: "Thế hai cận", expression: "I=[x³−x²]₀²=(8−4)−0=4", text: "Lấy giá trị tại cận trên trừ giá trị tại cận dưới." }
      ],
      answer: "I=4.",
      takeaway: "Tìm F rồi tính F(cận trên)−F(cận dưới).",
      sourcePages: [19]
    },
    practice: [
      { prompt: "Tính ∫₀¹2x dx.", answer: "1", distractors: ["0", "2", "1/2"], solution: "Một nguyên hàm là x²; [x²]₀¹=1−0=1." },
      { prompt: "Nếu F′=f thì ∫ₐᵇf(x)dx bằng gì?", answer: "F(b)−F(a)", distractors: ["F(a)−F(b)", "F(a)+F(b)", "F(b)+C"], solution: "Công thức Newton–Leibniz cho tích phân xác định là F(b)−F(a)." },
      { prompt: "Tích phân xác định có cần ghi hằng số +C không?", answer: "Không, vì hằng số triệt tiêu khi lấy hiệu hai cận", distractors: ["Có, trong mọi trường hợp", "Chỉ ghi khi cận dưới bằng 0", "Chỉ ghi với đa thức"], solution: "Trong [F(x)+C]ₐᵇ, hai hằng số C triệt tiêu nên kết quả không có +C." }
    ]
  }),
  "13.2": lesson({
    title: "Tính chất của tích phân",
    pages: [20, 21],
    lead: "Các tính chất tuyến tính, đổi cận và cộng đoạn giúp biến đổi tích phân trước khi tính. Chúng đặc biệt hữu ích khi đề đã cho sẵn giá trị một số tích phân.",
    formulae: [
      { label: "Tuyến tính", value: "∫ₐᵇ(αf+βg)dx = α∫ₐᵇf dx + β∫ₐᵇg dx", detail: "Các hệ số α, β không phụ thuộc x." },
      { label: "Cộng đoạn", value: "∫ₐᵇf dx + ∫ᵇᶜf dx = ∫ₐᶜf dx", detail: "Điểm b nằm giữa a và c theo định hướng thông thường." },
      { label: "Đổi cận", value: "∫ₐᵇf dx = −∫ᵇₐf dx", detail: "Đổi thứ tự hai cận làm đổi dấu tích phân." }
    ],
    points: [
      { label: "Cùng hàm", text: "Chỉ ghép hai khoảng trực tiếp khi biểu thức dưới dấu tích phân là cùng một hàm." },
      { label: "Khai thác dữ kiện", text: "Nếu đề cho ∫f và ∫g, hãy dùng tuyến tính thay vì cố tìm công thức tường minh của f, g." }
    ],
    note: { label: "Cần nhớ", text: "∫ₐᵃf(x)dx=0 và đổi cận phải đổi dấu; đây là hai bước dễ bị bỏ quên.", tone: "warning" },
    example: {
      title: "Tổ hợp các tích phân đã biết",
      prompt: "Biết ∫₀²f(x)dx=3 và ∫₀²g(x)dx=−1. Tính ∫₀²[2f(x)−3g(x)]dx.",
      analysis: ["Hai tích phân có cùng cận nên dùng tính tuyến tính.", "Đưa các hệ số 2 và −3 ra ngoài trước khi thay số."],
      steps: [
        { label: "Tách tuyến tính", expression: "I=2∫₀²f(x)dx−3∫₀²g(x)dx", text: "Không cần biết biểu thức cụ thể của f và g." },
        { label: "Thay dữ kiện", expression: "I=2·3−3·(−1)=9", text: "Chú ý dấu âm của tích phân g." }
      ],
      answer: "I=9.",
      takeaway: "Dùng tính tuyến tính để tận dụng trực tiếp các tích phân đã cho.",
      sourcePages: [20]
    },
    practice: [
      { prompt: "Nếu ∫₁³f(x)dx=5 thì ∫₃¹f(x)dx bằng bao nhiêu?", answer: "−5", distractors: ["5", "0", "10"], solution: "Đổi thứ tự hai cận làm tích phân đổi dấu, nên kết quả là −5." },
      { prompt: "Biết ∫₀¹f=2 và ∫₁³f=4. Tính ∫₀³f.", answer: "6", distractors: ["2", "4", "8"], solution: "Theo tính chất cộng đoạn, ∫₀³f=∫₀¹f+∫₁³f=2+4=6." },
      { prompt: "Giá trị của ∫₂²f(x)dx là bao nhiêu?", answer: "0", distractors: ["f(2)", "2", "Không xác định"], solution: "Hai cận trùng nhau nên khoảng tích phân có độ dài định hướng bằng 0." }
    ]
  }),
  "13.3": lesson({
    title: "Đổi biến",
    pages: [22, 23],
    lead: "Đổi biến trong tích phân xác định cần thay đồng thời biểu thức, vi phân và hai cận. Khi đã đổi cận sang u, không cần quay lại biến x ở bước cuối.",
    formulae: [
      { label: "Đổi biến có cận", value: "∫ₐᵇf(g(x))g′(x)dx = ∫g(a)g(b)f(u)du", detail: "Cận mới lần lượt là u(a)=g(a) và u(b)=g(b)." }
    ],
    points: [
      { label: "Ba việc phải đổi", text: "Thay hàm, thay dx thông qua du và tính lại cả cận dưới lẫn cận trên." },
      { label: "Giữ định hướng", text: "Nếu cận mới đảo thứ tự, dấu âm đã được phản ánh bởi thứ tự cận; không tự đổi dấu thêm lần nữa." }
    ],
    note: { label: "Sai lầm hay gặp", text: "Không dùng cận theo x cho một tích phân đã đổi sang u. Mỗi biến phải đi kèm đúng cận của nó.", tone: "warning" },
    example: {
      title: "Đổi biến và đổi cận",
      prompt: "Đổi biến và đổi cận thích hợp để tính I=∫₀¹2x(x²+1)³dx.",
      analysis: ["Biểu thức lũy thừa là x²+1 và đạo hàm 2x xuất hiện sẵn.", "Sau khi đặt u=x²+1, cận x=0,1 lần lượt thành u=1,2."],
      steps: [
        { label: "Đặt biến và đổi cận", expression: "u=x²+1, du=2x dx; x=0→u=1, x=1→u=2", text: "Tích phân mới chỉ còn biến u." },
        { label: "Tính tích phân", expression: "I=∫₁²u³du=[u⁴/4]₁²=15/4", text: "Thế trực tiếp cận u vào nguyên hàm u⁴/4." }
      ],
      answer: "I=15/4.",
      takeaway: "Đổi cận ngay khi đổi biến để tránh quay lại x và giảm sai sót.",
      sourcePages: [22]
    },
    practice: [
      { prompt: "Đặt u=x²+1 trong tích phân có cận x=1 đến x=2 thì cận u là gì?", answer: "Từ 2 đến 5", distractors: ["Từ 1 đến 2", "Từ 1 đến 4", "Từ 0 đến 3"], solution: "u(1)=1²+1=2 và u(2)=2²+1=5." },
      { prompt: "Tính ∫₀¹2x·e^(x²)dx.", answer: "e−1", distractors: ["e", "2e−1", "1"], solution: "Đặt u=x², du=2x dx; cận u từ 0 đến 1, nên ∫₀¹eᵘdu=e−1." },
      { prompt: "Sau khi đã đổi cận hoàn toàn sang u, bước cuối nên làm gì?", answer: "Thế cận u trực tiếp vào nguyên hàm theo u", distractors: ["Đổi cận lại thành x bắt buộc", "Giữ cả x và u", "Cộng thêm hằng số C"], solution: "Tích phân xác định theo u được tính trực tiếp bằng hai cận u và không có +C." }
    ]
  }),
  "13.4": lesson({
    title: "Tích phân từng phần",
    pages: [24],
    lead: "Từng phần với tích phân xác định dùng cùng nguyên tắc như nguyên hàm, nhưng hạng tử uv phải được tính tại hai cận và tích phân còn lại giữ nguyên cận.",
    formulae: [
      { label: "Từng phần có cận", value: "∫ₐᵇu dv = [uv]ₐᵇ − ∫ₐᵇv du", detail: "Cả hạng tử biên và tích phân còn lại đều theo cùng cận a, b." }
    ],
    points: [
      { label: "Chọn u", text: "Chọn phần trở nên đơn giản khi đạo hàm; đa thức thường được chọn làm u khi nhân với eˣ, sinx hoặc cosx." },
      { label: "Thế cận có ngoặc", text: "Tính [uv]ₐᵇ=(uv)(b)−(uv)(a) trước khi trừ tích phân còn lại." }
    ],
    note: { label: "Cần nhớ", text: "Không bỏ hạng tử tại cận dưới, kể cả khi nó thường bằng 0 trong nhiều ví dụ quen thuộc.", tone: "warning" },
    example: {
      title: "Từng phần trên đoạn",
      prompt: "Dùng tích phân từng phần có cận để tính I=∫₀¹x eˣdx.",
      analysis: ["Chọn u=x để du=dx và dv=eˣdx để v=eˣ.", "Áp dụng công thức có cận, sau đó tính riêng hạng tử biên."],
      steps: [
        { label: "Thiết lập từng phần", expression: "u=x, du=dx; dv=eˣdx, v=eˣ", text: "Lựa chọn này làm tích phân còn lại đơn giản." },
        { label: "Tính với cận", expression: "I=[xeˣ]₀¹−∫₀¹eˣdx=e−(e−1)=1", text: "Giá trị xeˣ tại x=0 bằng 0." }
      ],
      answer: "I=1.",
      takeaway: "Dùng [uv]ₐᵇ đầy đủ và giữ nguyên cận cho tích phân còn lại.",
      sourcePages: [24]
    },
    practice: [
      { prompt: "Công thức từng phần có cận nào đúng?", answer: "∫ₐᵇu dv=[uv]ₐᵇ−∫ₐᵇv du", distractors: ["∫ₐᵇu dv=[uv]ₐᵇ+∫ₐᵇv du", "∫ₐᵇu dv=uv+C", "∫ₐᵇu dv=∫ₐᵇv du"], solution: "Công thức từng phần xác định gồm hạng biên [uv]ₐᵇ và dấu trừ trước tích phân vdu." },
      { prompt: "Tính ∫₀¹x dx bằng cách trực tiếp.", answer: "1/2", distractors: ["0", "1", "2"], solution: "Một nguyên hàm là x²/2; thế cận được 1/2−0=1/2." },
      { prompt: "Trong ∫₀¹x cosx dx, nên chọn u là gì?", answer: "u=x", distractors: ["u=cosx", "u=x cosx", "u=1"], solution: "Đạo hàm của x là 1, làm phần tích phân còn lại đơn giản; cosx dx được chọn làm dv." }
    ]
  }),
  "13.5": lesson({
    title: "Tích phân hàm chứa trị tuyệt đối",
    pages: [25, 26],
    lead: "Để tích phân hàm chứa trị tuyệt đối, cần tìm các điểm biểu thức bên trong đổi dấu, chia đoạn tại các điểm đó rồi bỏ dấu giá trị tuyệt đối theo đúng dấu.",
    formulae: [
      { label: "Khử trị tuyệt đối", value: "|g(x)|=g(x) khi g(x)≥0; |g(x)|=−g(x) khi g(x)≤0", detail: "Dấu của g phải được xét riêng trên từng khoảng." }
    ],
    points: [
      { label: "Tìm điểm đổi dấu", text: "Giải g(x)=0 và chỉ giữ các nghiệm nằm trong đoạn tích phân." },
      { label: "Chia đoạn", text: "Tách tích phân tại từng nghiệm rồi thay |g| bằng g hoặc −g trên mỗi đoạn." }
    ],
    note: { label: "Sai lầm hay gặp", text: "Không được bỏ dấu giá trị tuyệt đối bằng một dấu cố định trên toàn đoạn nếu g(x) có đổi dấu.", tone: "warning" },
    example: {
      title: "Chia đoạn tại nghiệm",
      prompt: "Chia đoạn theo dấu của x−1 rồi tính I=∫₀³|x−1|dx.",
      analysis: ["Biểu thức x−1 bằng 0 tại x=1, nằm trong đoạn [0,3].", "Trên [0,1], x−1≤0; trên [1,3], x−1≥0."],
      steps: [
        { label: "Bỏ trị tuyệt đối theo dấu", expression: "I=∫₀¹(1−x)dx+∫₁³(x−1)dx", text: "Hai tích phân đều có hàm không âm trên đoạn tương ứng." },
        { label: "Tính từng phần", expression: "I=1/2+2=5/2", text: "Cộng hai diện tích ở hai phía của điểm x=1." }
      ],
      answer: "I=5/2.",
      takeaway: "Giải biểu thức trong dấu giá trị tuyệt đối bằng 0 rồi chia đoạn.",
      sourcePages: [25]
    },
    practice: [
      { prompt: "Điểm cần chia đoạn khi tính ∫₀⁴|x−2|dx là gì?", answer: "x=2", distractors: ["x=0", "x=4", "x=−2"], solution: "Biểu thức x−2 đổi dấu tại nghiệm x=2, nằm bên trong đoạn [0,4]." },
      { prompt: "Trên đoạn [0,1], |x−2| bằng gì?", answer: "2−x", distractors: ["x−2", "x+2", "2x"], solution: "Với 0≤x≤1 thì x−2<0, nên |x−2|=−(x−2)=2−x." },
      { prompt: "Tính ∫₋₁¹|x|dx.", answer: "1", distractors: ["0", "2", "1/2"], solution: "Do đối xứng, ∫₋₁¹|x|dx=2∫₀¹x dx=2·1/2=1." }
    ]
  }),
  "13.6": lesson({
    title: "Tích phân dựa vào đồ thị",
    pages: [27, 28],
    lead: "Trên đồ thị, tích phân xác định biểu diễn diện tích có dấu: phần nằm trên trục Ox đóng góp dương, phần nằm dưới trục Ox đóng góp âm.",
    formulae: [
      { label: "Diện tích có dấu", value: "∫ₐᵇf(x)dx = S₊−S₋", detail: "S₊ là tổng diện tích phía trên Ox; S₋ là tổng diện tích hình học phía dưới Ox." }
    ],
    points: [
      { label: "Đọc giao điểm", text: "Xác định các điểm đồ thị cắt trục Ox để chia đoạn có dấu không đổi." },
      { label: "Phân biệt hai đại lượng", text: "Tích phân là diện tích có dấu, còn tổng diện tích hình học phải lấy giá trị tuyệt đối từng phần." }
    ],
    note: { label: "Cần nhớ", text: "Một phần đồ thị dưới Ox làm tích phân giảm, dù diện tích hình học của phần đó vẫn là số dương.", tone: "warning" },
    example: {
      title: "Đọc diện tích có dấu",
      prompt: "Đồ thị f tạo diện tích 4 đơn vị phía trên Ox trên [0,2] và diện tích 1 đơn vị phía dưới Ox trên [2,3]. Tính ∫₀³f(x)dx.",
      analysis: ["Phần trên trục Ox được tính dấu dương.", "Phần dưới trục Ox có diện tích hình học 1 nhưng đóng góp −1 vào tích phân."],
      steps: [
        { label: "Gán dấu", expression: "S₊=4, S₋=1", text: "Hai số đều là diện tích hình học dương." },
        { label: "Tính tích phân", expression: "∫₀³f(x)dx=S₊−S₋=4−1=3", text: "Kết quả là diện tích đại số." }
      ],
      answer: "Tích phân bằng 3.",
      takeaway: "Trên Ox cộng, dưới Ox trừ khi đọc giá trị tích phân từ đồ thị.",
      sourcePages: [27]
    },
    practice: [
      { prompt: "Đồ thị có diện tích 5 phía trên Ox và 2 phía dưới Ox. Tích phân trên toàn đoạn bằng bao nhiêu?", answer: "3", distractors: ["7", "−3", "10"], solution: "Tích phân là diện tích có dấu: 5−2=3." },
      { prompt: "Tổng diện tích hình học của hai phần có diện tích 5 và 2 là bao nhiêu?", answer: "7", distractors: ["3", "−3", "10"], solution: "Diện tích hình học luôn không âm nên cộng hai phần: 5+2=7." },
      { prompt: "Phần đồ thị nằm dưới trục Ox đóng góp thế nào vào tích phân?", answer: "Một giá trị âm bằng đối của diện tích phần đó", distractors: ["Một giá trị dương", "Luôn bằng 0", "Không phụ thuộc diện tích"], solution: "Vì f(x)<0 trên phần đó, tích phân của f mang dấu âm." }
    ]
  }),
  "13.7": lesson({
    title: "Tích phân có tham số",
    pages: [29, 30],
    lead: "Trong tích phân có tham số, xem tham số như hằng số đối với biến tích phân. Tính hoặc biến đổi tích phân rồi dùng phương trình, bất phương trình hay điều kiện đề bài để tìm tham số.",
    formulae: [
      { label: "Tuyến tính theo tham số", value: "∫ₐᵇ[mf(x)+g(x)]dx = m∫ₐᵇf(x)dx+∫ₐᵇg(x)dx", detail: "m không phụ thuộc biến x nên được đưa ra ngoài tích phân." }
    ],
    points: [
      { label: "Xem m là hằng số", text: "Thực hiện tích phân theo x như bình thường, giữ nguyên tham số m trong các hệ số." },
      { label: "Giải điều kiện", text: "Sau khi có biểu thức theo m, dùng giá trị tích phân đã cho để lập và giải phương trình." }
    ],
    note: { label: "Sai lầm hay gặp", text: "Không lấy đạo hàm hay tích phân theo m khi biến tích phân là x; m chỉ đóng vai trò hệ số.", tone: "warning" },
    example: {
      title: "Tìm tham số từ giá trị tích phân",
      prompt: "Xem m là hằng số theo x và tìm m biết ∫₀¹(mx+1)dx=3.",
      analysis: ["m là hằng số nên nguyên hàm theo x là mx²/2+x.", "Thay hai cận để được một phương trình bậc nhất theo m."],
      steps: [
        { label: "Tính theo m", expression: "∫₀¹(mx+1)dx=[mx²/2+x]₀¹=m/2+1", text: "Cận dưới 0 làm cả hai hạng tử bằng 0." },
        { label: "Giải điều kiện", expression: "m/2+1=3 ⇒ m=4", text: "Giá trị m=4 thỏa tích phân ban đầu." }
      ],
      answer: "m=4.",
      takeaway: "Giữ m như hằng số, tính tích phân theo x rồi giải phương trình theo m.",
      sourcePages: [29]
    },
    practice: [
      { prompt: "Tính ∫₀¹m x²dx theo m.", answer: "m/3", distractors: ["m", "m²/3", "3m"], solution: "Đưa m ra ngoài: m∫₀¹x²dx=m[x³/3]₀¹=m/3." },
      { prompt: "Tìm m nếu ∫₀²m dx=6.", answer: "m=3", distractors: ["m=2", "m=6", "m=12"], solution: "∫₀²m dx=2m. Phương trình 2m=6 cho m=3." },
      { prompt: "Trong ∫₀¹(mx+1)dx, m được xử lý thế nào?", answer: "Như một hằng số đối với x", distractors: ["Như biến tích phân", "Luôn cho bằng 0", "Thay bằng x"], solution: "Biến tích phân là x, nên m là tham số cố định trong toàn bộ phép tính." }
    ]
  }),
  "13.8": lesson({
    title: "Tích phân kết hợp tính đối xứng",
    pages: [31, 32, 33],
    lead: "Trên đoạn đối xứng [−a,a], tính chẵn lẻ của hàm số giúp rút gọn tích phân. Có thể tách biểu thức thành phần chẵn và phần lẻ trước khi tính.",
    formulae: [
      { label: "Hàm lẻ", value: "f(−x)=−f(x) ⇒ ∫₋ₐᵃf(x)dx=0", detail: "Hai phần đối xứng triệt tiêu nhau." },
      { label: "Hàm chẵn", value: "f(−x)=f(x) ⇒ ∫₋ₐᵃf(x)dx=2∫₀ᵃf(x)dx", detail: "Hai nửa của đồ thị đóng góp bằng nhau." }
    ],
    points: [
      { label: "Kiểm tra đoạn", text: "Chỉ áp dụng trực tiếp hai công thức khi hai cận đối nhau: −a và a." },
      { label: "Tách chẵn lẻ", text: "Tổng của phần chẵn và phần lẻ có tích phân bằng tích phân phần chẵn, vì phần lẻ triệt tiêu." }
    ],
    note: { label: "Cần nhớ", text: "Hàm lẻ có tích phân bằng 0 trên đoạn đối xứng, nhưng diện tích hình học nói chung không bằng 0.", tone: "warning" },
    example: {
      title: "Loại phần lẻ trên đoạn đối xứng",
      prompt: "Khai thác tính chẵn lẻ trên đoạn đối xứng để tính I=∫₋₂²(x³+2x²)dx.",
      analysis: ["x³ là hàm lẻ nên tích phân trên [−2,2] bằng 0.", "2x² là hàm chẵn nên tích phân bằng hai lần tích phân từ 0 đến 2."],
      steps: [
        { label: "Tách theo tính chẵn lẻ", expression: "I=0+2∫₀²2x²dx", text: "Hệ số 2 bên ngoài đến từ đoạn đối xứng." },
        { label: "Tính phần chẵn", expression: "I=4[x³/3]₀²=32/3", text: "Chỉ còn một tích phân trên nửa đoạn dương." }
      ],
      answer: "I=32/3.",
      takeaway: "Tách phần chẵn và lẻ trước khi tích phân trên đoạn [−a,a].",
      sourcePages: [31]
    },
    practice: [
      { prompt: "Nếu f là hàm lẻ thì ∫₋₃³f(x)dx bằng bao nhiêu?", answer: "0", distractors: ["2∫₀³f(x)dx", "∫₀³f(x)dx", "6f(0)"], solution: "Trên đoạn đối xứng, hai phần tích phân của hàm lẻ triệt tiêu nhau." },
      { prompt: "Nếu f là hàm chẵn thì ∫₋₂²f(x)dx bằng gì?", answer: "2∫₀²f(x)dx", distractors: ["0", "∫₀²f(x)dx", "−2∫₀²f(x)dx"], solution: "Hai nửa đối xứng của hàm chẵn bằng nhau nên tích phân toàn đoạn gấp đôi nửa dương." },
      { prompt: "Tính ∫₋₁¹(x⁵+1)dx.", answer: "2", distractors: ["0", "1", "3"], solution: "x⁵ là hàm lẻ nên cho 0; ∫₋₁¹1dx=2, vì vậy tổng bằng 2." }
    ]
  }),
  "14.1": lesson({
    title: "Diện tích hình phẳng với trục Ox",
    pages: [34],
    lead: "Diện tích hình phẳng giới hạn bởi đồ thị y=f(x), trục Ox và hai đường thẳng x=a, x=b được tính bằng tích phân của |f(x)|.",
    formulae: [
      { label: "Diện tích với Ox", value: "S=∫ₐᵇ|f(x)|dx", detail: "Nếu f không đổi dấu trên [a,b], có thể bỏ giá trị tuyệt đối theo dấu của f." }
    ],
    points: [
      { label: "Tìm giao điểm", text: "Giải f(x)=0 trong [a,b] để xác định các khoảng đồ thị nằm trên hoặc dưới Ox." },
      { label: "Chia đoạn", text: "Trên đoạn f≥0 dùng ∫f; trên đoạn f≤0 dùng −∫f để diện tích luôn không âm." }
    ],
    note: { label: "Sai lầm hay gặp", text: "Không dùng trực tiếp ∫f nếu đồ thị cắt Ox trong đoạn; các phần âm sẽ triệt tiêu diện tích dương.", tone: "warning" },
    example: {
      title: "Diện tích của miền cắt trục Ox",
      prompt: "Tính diện tích giới hạn bởi y=x−1, trục Ox và hai đường x=0, x=3.",
      analysis: ["Đồ thị cắt Ox tại x=1.", "Hàm âm trên [0,1] và dương trên [1,3], nên phải chia tích phân."],
      steps: [
        { label: "Lập tích phân diện tích", expression: "S=−∫₀¹(x−1)dx+∫₁³(x−1)dx", text: "Đổi dấu phần hàm nằm dưới trục Ox." },
        { label: "Tính hai phần", expression: "S=1/2+2=5/2", text: "Kết quả là tổng hai diện tích tam giác." }
      ],
      answer: "S=5/2 đơn vị diện tích.",
      takeaway: "Diện tích dùng |f| và phải chia tại các nghiệm của f trong đoạn.",
      sourcePages: [34]
    },
    practice: [
      { prompt: "Công thức diện tích với trục Ox trên [a,b] là gì?", answer: "S=∫ₐᵇ|f(x)|dx", distractors: ["S=∫ₐᵇf(x)dx trong mọi trường hợp", "S=F(a)−F(b)", "S=f(b)−f(a)"], solution: "Giá trị tuyệt đối bảo đảm phần đồ thị dưới Ox cũng đóng góp diện tích dương." },
      { prompt: "Nếu f(x)≥0 trên [a,b], diện tích với Ox bằng gì?", answer: "∫ₐᵇf(x)dx", distractors: ["−∫ₐᵇf(x)dx", "0", "f(a)+f(b)"], solution: "Khi f không âm, |f|=f trên toàn đoạn nên diện tích bằng tích phân của f." },
      { prompt: "Trước khi bỏ dấu |f(x)|, cần làm gì?", answer: "Xét dấu f(x) và chia đoạn tại các nghiệm", distractors: ["Lấy đạo hàm hai lần", "Đổi cận tích phân", "Cho f(x)=1"], solution: "Nghiệm của f là nơi đồ thị có thể đổi phía so với Ox, nên phải xét dấu và chia đoạn tại đó." }
    ]
  }),
  "14.2": lesson({
    title: "Diện tích giữa hai đồ thị",
    pages: [35, 36],
    lead: "Diện tích giữa hai đồ thị y=f(x) và y=g(x) trên một đoạn bằng tích phân giá trị tuyệt đối của hiệu hai hàm. Cần xác định đồ thị nào nằm trên ở từng khoảng.",
    formulae: [
      { label: "Diện tích giữa hai đồ thị", value: "S=∫ₐᵇ|f(x)−g(x)|dx", detail: "Nếu f≥g trên toàn đoạn thì S=∫ₐᵇ[f(x)−g(x)]dx." }
    ],
    points: [
      { label: "Tìm cận", text: "Nếu đề không cho cận, giải phương trình f(x)=g(x) để tìm các giao điểm giới hạn miền." },
      { label: "Trên trừ dưới", text: "Trên mỗi khoảng, lấy hàm có tung độ lớn hơn trừ hàm có tung độ nhỏ hơn." }
    ],
    note: { label: "Cần nhớ", text: "Hai đồ thị có thể đổi vị trí trên–dưới tại giao điểm; phải chia khoảng nếu hiệu f−g đổi dấu.", tone: "warning" },
    example: {
      title: "Miền kẹp giữa parabol và đường thẳng",
      prompt: "Tính diện tích giữa y=x và y=x² trên đoạn [0,1].",
      analysis: ["Trên [0,1], ta có x≥x².", "Diện tích được tính bằng tích phân hàm trên x trừ hàm dưới x²."],
      steps: [
        { label: "Lập tích phân", expression: "S=∫₀¹(x−x²)dx", text: "Hiệu không âm trên toàn đoạn nên không cần chia thêm." },
        { label: "Tính diện tích", expression: "S=[x²/2−x³/3]₀¹=1/6", text: "Kết quả dương đúng với ý nghĩa diện tích." }
      ],
      answer: "S=1/6 đơn vị diện tích.",
      takeaway: "Xác định hàm trên và hàm dưới trước khi lập tích phân.",
      sourcePages: [35]
    },
    practice: [
      { prompt: "Trên đoạn f(x)≥g(x), diện tích giữa hai đồ thị bằng gì?", answer: "∫[f(x)−g(x)]dx trên đoạn đó", distractors: ["∫[g(x)−f(x)]dx", "∫[f(x)+g(x)]dx", "f(b)−g(a)"], solution: "Diện tích theo lát cắt dọc là chiều cao trên trừ dưới: f(x)−g(x)." },
      { prompt: "Nếu chưa biết cận của miền kín giữa hai đồ thị, cần làm gì?", answer: "Giải f(x)=g(x) để tìm giao điểm", distractors: ["Cho x=0 và x=1", "Lấy f′=g′ làm cận", "Cộng hai hàm"], solution: "Biên trái và phải của miền kín thường là hoành độ các giao điểm của hai đồ thị." },
      { prompt: "Tính diện tích giữa y=2 và y=0 trên [0,3].", answer: "6", distractors: ["2", "3", "5"], solution: "Chiều cao không đổi là 2 và độ dài đáy là 3, tương đương ∫₀³2dx=6." }
    ]
  }),
  "14.3": lesson({
    title: "Thể tích khối tròn xoay",
    pages: [37],
    lead: "Khi miền phẳng quay quanh một trục, thể tích được tính bằng tích phân diện tích tiết diện vuông góc với trục quay. Với đĩa tròn, tiết diện là π nhân bình phương bán kính.",
    formulae: [
      { label: "Quay quanh Ox", value: "V=π∫ₐᵇ[f(x)]²dx", detail: "Áp dụng khi bán kính đĩa tại x là |f(x)|." },
      { label: "Nguyên tắc tiết diện", value: "V=∫ₐᵇA(x)dx", detail: "A(x) là diện tích tiết diện vuông góc với trục tích phân." }
    ],
    points: [
      { label: "Xác định bán kính", text: "Bán kính là khoảng cách từ đồ thị đến trục quay, không phải luôn là chính biểu thức y." },
      { label: "Bình phương trước", text: "Với phương pháp đĩa, bình phương bán kính rồi mới tích phân và nhân π." }
    ],
    note: { label: "Sai lầm hay gặp", text: "Không dùng V=π∫f(x)dx; diện tích đĩa là πr² nên hàm bán kính phải được bình phương.", tone: "warning" },
    example: {
      title: "Quay miền dưới đường thẳng quanh Ox",
      prompt: "Miền giới hạn bởi y=x, Ox, x=0 và x=2 quay quanh Ox. Tính thể tích.",
      analysis: ["Mỗi tiết diện vuông góc Ox là một đĩa bán kính r=x.", "Diện tích tiết diện là A(x)=πx²."],
      steps: [
        { label: "Lập tích phân", expression: "V=π∫₀²x²dx", text: "Bán kính được bình phương trong công thức đĩa." },
        { label: "Tính thể tích", expression: "V=π[x³/3]₀²=8π/3", text: "Đơn vị kết quả là đơn vị thể tích." }
      ],
      answer: "V=8π/3 đơn vị thể tích.",
      takeaway: "Tiết diện đĩa có diện tích πr², vì vậy phải bình phương bán kính.",
      sourcePages: [37]
    },
    practice: [
      { prompt: "Miền dưới y=f(x)≥0 quay quanh Ox có công thức thể tích nào?", answer: "V=π∫[f(x)]²dx", distractors: ["V=π∫f(x)dx", "V=2π∫f(x)dx", "V=∫f′(x)dx"], solution: "Mỗi lát cắt là đĩa bán kính f(x), diện tích π[f(x)]²." },
      { prompt: "Diện tích tiết diện tròn bán kính r là gì?", answer: "πr²", distractors: ["2πr", "πr", "4πr²"], solution: "Công thức diện tích hình tròn là π nhân bình phương bán kính." },
      { prompt: "Tính V khi quay miền 0≤y≤1, 0≤x≤2 quanh Ox.", answer: "2π", distractors: ["π", "4π", "2"], solution: "Bán kính luôn bằng 1, nên V=π∫₀²1²dx=2π." }
    ]
  }),
  "14.4": lesson({
    title: "Vật thể bị khoét/rỗng",
    pages: [38, 39],
    lead: "Vật thể tròn xoay có lỗ rỗng được xử lý bằng phương pháp vành khăn: tại mỗi vị trí, lấy diện tích đĩa ngoài trừ diện tích đĩa trong.",
    formulae: [
      { label: "Vành khăn", value: "V=π∫ₐᵇ[R(x)²−r(x)²]dx", detail: "R là bán kính ngoài và r là bán kính trong, với R≥r≥0." }
    ],
    points: [
      { label: "Đo từ trục quay", text: "Cả R và r đều là khoảng cách vuông góc từ đường biên đến trục quay." },
      { label: "Ngoài trừ trong", text: "Bình phương từng bán kính trước, rồi lấy R²−r²; không bình phương hiệu R−r." }
    ],
    note: { label: "Sai lầm hay gặp", text: "π(R−r)² không phải diện tích vành khăn. Công thức đúng là π(R²−r²).", tone: "warning" },
    example: {
      title: "Thể tích ống trụ rỗng",
      prompt: "Một ống trụ dài 5, bán kính ngoài 3 và bán kính trong 2. Tính thể tích phần vật liệu.",
      analysis: ["Tiết diện là vành khăn có diện tích π(3²−2²).", "Các bán kính không đổi trên chiều dài 5."],
      steps: [
        { label: "Diện tích tiết diện", expression: "A=π(9−4)=5π", text: "Lấy diện tích đĩa ngoài trừ đĩa bị khoét." },
        { label: "Nhân theo chiều dài", expression: "V=∫₀⁵5π dx=25π", text: "Tiết diện không đổi nên cũng có thể tính A·h." }
      ],
      answer: "V=25π đơn vị thể tích.",
      takeaway: "Vật thể rỗng dùng bình phương bán kính ngoài trừ bình phương bán kính trong.",
      sourcePages: [38]
    },
    practice: [
      { prompt: "Diện tích vành khăn bán kính ngoài R, trong r là gì?", answer: "π(R²−r²)", distractors: ["π(R−r)²", "π(R²+r²)", "2π(R−r)"], solution: "Vành khăn là diện tích đĩa ngoài πR² trừ diện tích lỗ πr²." },
      { prompt: "Trong công thức vành khăn, R và r được đo từ đâu?", answer: "Từ trục quay đến các đường biên", distractors: ["Từ cận trái", "Từ gốc tọa độ trong mọi bài", "Từ R đến r"], solution: "Bán kính là khoảng cách vuông góc từ trục quay tới biên ngoài và biên trong." },
      { prompt: "Một ống dài 2 có R=2, r=1. Thể tích vật liệu là bao nhiêu?", answer: "6π", distractors: ["2π", "4π", "8π"], solution: "V=π(R²−r²)h=π(4−1)·2=6π." }
    ]
  }),
  "14.5": lesson({
    title: "Quãng đường từ vận tốc",
    pages: [40, 41],
    lead: "Tích phân vận tốc cho độ dời có dấu, còn quãng đường là tích phân tốc độ |v(t)|. Khi vận tốc đổi dấu, phải chia khoảng tại các thời điểm vật đổi chiều.",
    formulae: [
      { label: "Độ dời", value: "Δs=∫ₐᵇv(t)dt", detail: "Có thể âm, dương hoặc bằng 0." },
      { label: "Quãng đường", value: "L=∫ₐᵇ|v(t)|dt", detail: "Luôn không âm và bằng tổng độ dài các chặng chuyển động." }
    ],
    points: [
      { label: "Tìm lúc đổi chiều", text: "Giải v(t)=0 trong khoảng thời gian và lập bảng dấu của v." },
      { label: "Cộng độ dài từng chặng", text: "Tính độ dời trên mỗi khoảng có dấu không đổi rồi lấy giá trị tuyệt đối trước khi cộng." }
    ],
    note: { label: "Cần nhớ", text: "Nếu v đổi dấu, |∫v| thường nhỏ hơn ∫|v|. Độ dời không thay thế được quãng đường.", tone: "warning" },
    example: {
      title: "Chuyển động có đổi chiều",
      prompt: "Một vật có vận tốc v(t)=2t−2 trên khoảng 0≤t≤3. Tính quãng đường đi được.",
      analysis: ["v(t)=0 tại t=1 nên vật đổi chiều ở thời điểm này.", "Vận tốc âm trên [0,1] và dương trên [1,3]."],
      steps: [
        { label: "Chia hai chặng", expression: "L=−∫₀¹(2t−2)dt+∫₁³(2t−2)dt", text: "Đổi dấu tích phân ở chặng vận tốc âm." },
        { label: "Tính tổng quãng đường", expression: "L=1+4=5", text: "Hai chặng có độ dài lần lượt là 1 và 4." }
      ],
      answer: "Quãng đường bằng 5 đơn vị.",
      takeaway: "Tìm nghiệm của vận tốc và tích phân |v| theo từng chặng.",
      sourcePages: [40]
    },
    practice: [
      { prompt: "Công thức quãng đường từ vận tốc trên [a,b] là gì?", answer: "L=∫ₐᵇ|v(t)|dt", distractors: ["L=∫ₐᵇv(t)dt trong mọi trường hợp", "L=v(b)−v(a)", "L=|v(b)|"], solution: "Quãng đường là tích lũy của tốc độ, mà tốc độ bằng |v(t)|." },
      { prompt: "Để tìm thời điểm vật đổi chiều, cần giải phương trình nào?", answer: "v(t)=0 và xét dấu hai phía", distractors: ["s(t)=0", "v′(t)=0 trong mọi trường hợp", "t=0"], solution: "Vật đổi chiều khi vận tốc đi qua 0 và đổi dấu, nên phải giải v(t)=0 rồi xét dấu." },
      { prompt: "Nếu v(t)≥0 trên toàn [a,b], quãng đường bằng gì?", answer: "∫ₐᵇv(t)dt", distractors: ["−∫ₐᵇv(t)dt", "0", "v(a)+v(b)"], solution: "Khi v không âm thì |v|=v, nên quãng đường bằng độ dời." }
    ]
  }),
  "14.6": lesson({
    title: "Đại lượng tích lũy F(b)−F(a)=∫f(t)dt",
    pages: [42],
    lead: "Nếu F là đại lượng tích lũy và tốc độ thay đổi tức thời của nó là f=F′, thì độ biến thiên của F trên một khoảng bằng tích phân của f trên khoảng đó.",
    formulae: [
      { label: "Độ biến thiên", value: "F(b)−F(a)=∫ₐᵇf(t)dt", detail: "Trong đó f(t)=F′(t) là tốc độ thay đổi của đại lượng F." },
      { label: "Giá trị cuối", value: "F(b)=F(a)+∫ₐᵇf(t)dt", detail: "Giá trị ban đầu cộng phần tăng giảm tích lũy." }
    ],
    points: [
      { label: "Xác định tốc độ", text: "Đọc đúng đại lượng nào là trạng thái F và đại lượng nào là tốc độ thay đổi f." },
      { label: "Giữ dấu", text: "Nếu f âm, tích phân làm F giảm; không lấy giá trị tuyệt đối trừ khi bài hỏi tổng lượng biến động." }
    ],
    note: { label: "Sai lầm hay gặp", text: "Tích phân của tốc độ là độ thay đổi, chưa phải giá trị cuối. Muốn tìm F(b) phải cộng thêm F(a).", tone: "warning" },
    example: {
      title: "Tìm lượng còn lại từ tốc độ thay đổi",
      prompt: "Một bể có 100 lít nước lúc t=0. Lưu lượng ròng vào bể là r(t)=4−t lít/phút trong 0≤t≤2. Tính lượng nước lúc t=2.",
      analysis: ["Tích phân r cho độ thay đổi lượng nước, không phải trực tiếp lượng cuối.", "Cần cộng kết quả tích phân vào 100 lít ban đầu."],
      steps: [
        { label: "Tính phần thay đổi", expression: "∫₀²(4−t)dt=[4t−t²/2]₀²=6", text: "Bể nhận ròng thêm 6 lít trong hai phút." },
        { label: "Cộng giá trị ban đầu", expression: "F(2)=100+6=106", text: "Giá trị cuối bằng ban đầu cộng biến thiên." }
      ],
      answer: "Bể có 106 lít nước.",
      takeaway: "Giá trị cuối bằng giá trị đầu cộng tích phân của tốc độ thay đổi.",
      sourcePages: [42]
    },
    practice: [
      { prompt: "Nếu F′(t)=f(t), công thức nào đúng?", answer: "F(b)=F(a)+∫ₐᵇf(t)dt", distractors: ["F(b)=∫ₐᵇF(t)dt", "F(b)=F(a)−f(b)", "F(b)=f(b)−f(a)"], solution: "Định lý cơ bản cho F(b)−F(a)=∫ₐᵇf(t)dt, chuyển vế được công thức đã nêu." },
      { prompt: "Đại lượng ban đầu là 20, biến thiên tích lũy bằng −3. Giá trị cuối là bao nhiêu?", answer: "17", distractors: ["23", "−17", "−3"], solution: "Giá trị cuối bằng 20+(−3)=17." },
      { prompt: "Nếu tốc độ f(t) âm trên một khoảng, đại lượng F thay đổi thế nào?", answer: "F giảm trên khoảng đó", distractors: ["F luôn tăng", "F không đổi", "F trở thành số âm"], solution: "Vì F′=f<0 nên F là hàm giảm trên khoảng đang xét." }
    ]
  }),
  "14.7": lesson({
    title: "Công suất → năng lượng",
    pages: [43, 44],
    lead: "Công suất là tốc độ truyền hoặc tiêu thụ năng lượng theo thời gian. Tổng năng lượng trong một khoảng bằng tích phân công suất theo thời gian, với đơn vị phải thống nhất.",
    formulae: [
      { label: "Năng lượng", value: "E=∫ₜ₁ᵗ²P(t)dt", detail: "Nếu P tính bằng watt và t bằng giây thì E có đơn vị joule." }
    ],
    points: [
      { label: "Kiểm tra đơn vị", text: "W·s=J; kW·h=kWh. Phải đổi phút sang giờ hoặc giây theo đơn vị của công suất." },
      { label: "Công suất không đổi", text: "Nếu P là hằng số, tích phân rút gọn thành E=P·Δt." }
    ],
    note: { label: "Cần nhớ", text: "Không nhân công suất tính bằng kW với thời gian tính bằng phút mà chưa đổi đơn vị phù hợp.", tone: "warning" },
    example: {
      title: "Năng lượng từ công suất biến thiên",
      prompt: "Một thiết bị có công suất P(t)=100+20t watt, với t tính bằng giây từ 0 đến 5. Tính năng lượng tiêu thụ.",
      analysis: ["Năng lượng bằng tích phân công suất theo thời gian.", "Đơn vị W·s đúng bằng joule nên không cần đổi thêm."],
      steps: [
        { label: "Lập tích phân", expression: "E=∫₀⁵(100+20t)dt", text: "Công suất được tích lũy trong 5 giây." },
        { label: "Tính năng lượng", expression: "E=[100t+10t²]₀⁵=750 J", text: "Kết quả có đơn vị joule." }
      ],
      answer: "E=750 J.",
      takeaway: "Tích phân công suất theo thời gian và kiểm tra tích đơn vị W·s hoặc kW·h.",
      sourcePages: [43]
    },
    practice: [
      { prompt: "Công thức năng lượng từ công suất P(t) là gì?", answer: "E=∫P(t)dt theo khoảng thời gian", distractors: ["E=P′(t)", "E=P(t)²", "E=∫t dP"], solution: "Công suất là đạo hàm của năng lượng theo thời gian, nên năng lượng tích lũy là tích phân của P." },
      { prompt: "Thiết bị công suất 2 kW chạy trong 3 giờ tiêu thụ bao nhiêu?", answer: "6 kWh", distractors: ["5 kWh", "2/3 kWh", "600 kWh"], solution: "Công suất không đổi nên E=P·t=2·3=6 kWh." },
      { prompt: "Một watt nhân một giây bằng đơn vị nào?", answer: "Một joule", distractors: ["Một kilowatt-giờ", "Một volt", "Một ampere"], solution: "Theo định nghĩa công suất, 1 W=1 J/s nên 1 W·s=1 J." }
    ]
  }),
  "14.8": lesson({
    title: "Lưu lượng → thể tích",
    pages: [45],
    lead: "Lưu lượng thể tích cho biết thể tích chất lỏng đi qua trong một đơn vị thời gian. Thể tích tích lũy bằng tích phân lưu lượng theo thời gian.",
    formulae: [
      { label: "Thể tích qua dòng", value: "V=∫ₜ₁ᵗ²q(t)dt", detail: "Nếu q là lưu lượng ròng, dấu của q cho biết thể tích trong hệ tăng hay giảm." }
    ],
    points: [
      { label: "Lưu lượng vào và ra", text: "Với nhiều dòng, lập q_ròng=q_vào−q_ra rồi mới tích phân." },
      { label: "Đơn vị", text: "Lít/phút nhân phút cho lít; m³/s nhân giây cho m³." }
    ],
    note: { label: "Sai lầm hay gặp", text: "Phân biệt thể tích đã chảy qua với thể tích đang có trong bể; trường hợp sau còn cần giá trị ban đầu.", tone: "warning" },
    example: {
      title: "Tích lũy lưu lượng thay đổi",
      prompt: "Một vòi có lưu lượng q(t)=6+2t lít/phút trong 0≤t≤4. Tính thể tích nước đã chảy qua.",
      analysis: ["Lưu lượng đã cho là tốc độ thay đổi thể tích theo phút.", "Tích phân q trên bốn phút cho trực tiếp thể tích chảy qua."],
      steps: [
        { label: "Lập tích phân", expression: "V=∫₀⁴(6+2t)dt", text: "Đơn vị của tích phân là lít." },
        { label: "Tính thể tích", expression: "V=[6t+t²]₀⁴=24+16=40", text: "Tổng lượng nước qua vòi là 40 lít." }
      ],
      answer: "V=40 lít.",
      takeaway: "Tích phân lưu lượng theo đúng đơn vị thời gian để nhận thể tích.",
      sourcePages: [45]
    },
    practice: [
      { prompt: "Công thức thể tích từ lưu lượng q(t) là gì?", answer: "V=∫q(t)dt theo khoảng thời gian", distractors: ["V=q′(t)", "V=q(t)/t", "V=∫t dq"], solution: "Lưu lượng là tốc độ biến thiên thể tích nên thể tích tích lũy là tích phân của lưu lượng." },
      { prompt: "Lưu lượng không đổi 5 lít/phút trong 6 phút cho bao nhiêu lít?", answer: "30 lít", distractors: ["11 lít", "5/6 lít", "60 lít"], solution: "Vì lưu lượng không đổi nên V=q·t=5·6=30 lít." },
      { prompt: "Nếu có dòng vào q₁ và dòng ra q₂, lưu lượng ròng vào bể là gì?", answer: "q₁−q₂", distractors: ["q₁+q₂ trong mọi trường hợp", "q₂−q₁", "q₁q₂"], solution: "Dòng vào làm tăng và dòng ra làm giảm thể tích, nên lưu lượng ròng là q₁−q₂." }
    ]
  }),
  "14.9": lesson({
    title: "Bài toán thực tế nhiều giai đoạn",
    pages: [46, 47, 48, 49],
    lead: "Bài toán nhiều giai đoạn có quy luật hoặc tốc độ thay đổi theo từng khoảng. Cần chia đúng mốc thời gian, mô hình hóa mỗi chặng và cộng các tích phân có dấu.",
    formulae: [
      { label: "Tích lũy từng chặng", value: "ΔF=∑ᵢ∫ₜᵢᵗᵢ₊₁rᵢ(t)dt", detail: "Mỗi rᵢ mô tả tốc độ trên một giai đoạn riêng." },
      { label: "Giá trị cuối", value: "F(T)=F(0)+ΔF", detail: "Cộng giá trị ban đầu sau khi tổng hợp toàn bộ biến thiên." }
    ],
    points: [
      { label: "Lập trục thời gian", text: "Đánh dấu các thời điểm quy luật thay đổi và kiểm tra các khoảng ghép kín, không chồng lấn." },
      { label: "Giữ dấu và đơn vị", text: "Mỗi giai đoạn có thể tăng hoặc giảm; đổi tất cả đại lượng về cùng hệ đơn vị trước khi cộng." }
    ],
    note: { label: "Cần nhớ", text: "Không dùng một công thức tốc độ cho toàn bộ thời gian nếu đề mô tả các chặng khác nhau.", tone: "warning" },
    example: {
      title: "Bể nước vận hành qua hai giai đoạn",
      prompt: "Bể ban đầu có 50 lít. Trong 2 phút đầu, lưu lượng ròng là 4 lít/phút; trong 3 phút tiếp theo, lưu lượng ròng là −2 lít/phút. Tính lượng nước cuối cùng.",
      analysis: ["Giai đoạn đầu làm lượng nước tăng, giai đoạn sau làm lượng nước giảm.", "Tính biến thiên từng chặng theo đúng thời lượng rồi cộng với 50 lít ban đầu."],
      steps: [
        { label: "Tính từng chặng", expression: "ΔV₁=4·2=8; ΔV₂=(−2)·3=−6", text: "Dấu âm ở chặng hai biểu thị nước rời khỏi bể." },
        { label: "Tổng hợp", expression: "V_cuối=50+8−6=52", text: "Tổng biến thiên sau năm phút là +2 lít." }
      ],
      answer: "Bể còn 52 lít nước.",
      takeaway: "Chia đúng giai đoạn, tính biến thiên có dấu rồi cộng giá trị ban đầu.",
      sourcePages: [46]
    },
    practice: [
      { prompt: "Bước đầu tiên của bài toán tích lũy nhiều giai đoạn là gì?", answer: "Đánh dấu các mốc đổi quy luật và chia khoảng", distractors: ["Cộng mọi tốc độ ngay", "Bỏ qua giá trị ban đầu", "Lấy giá trị tuyệt đối mọi chặng"], solution: "Mỗi công thức chỉ đúng trên một chặng, nên phải xác định các mốc và chia trục thời gian trước." },
      { prompt: "Một đại lượng ban đầu là 10, tăng 3 đơn vị rồi giảm 5 đơn vị. Giá trị cuối là bao nhiêu?", answer: "8", distractors: ["12", "18", "2"], solution: "Giữ dấu biến thiên: 10+3−5=8." },
      { prompt: "Khi cộng kết quả các giai đoạn, yêu cầu nào bắt buộc?", answer: "Các đại lượng phải cùng đơn vị và các khoảng không chồng lấn", distractors: ["Mọi tích phân phải dương", "Mọi giai đoạn phải dài bằng nhau", "Tốc độ phải là hằng số"], solution: "Chỉ cộng được các biến thiên cùng đơn vị, được tính trên các chặng ghép đúng theo thời gian." }
    ]
  })
});

const calculusLessonEntries = Object.entries(rawCalculusLessons);

function createCompleteReading(code, item) {
  const details = calculusKnowledgeDetails[code];
  const complete = Object.freeze({
    ...item.reading,
    formulae: Object.freeze(details.formulae),
    points: Object.freeze(details.points)
  });

  if (!details.pages) return complete;

  const pages = details.pages.map((page) => Object.freeze({
    lead: page.lead,
    formulae: Object.freeze(details.formulae.slice(...page.formulaeRange)),
    points: Object.freeze(details.points.slice(...page.pointsRange)),
    note: Object.freeze(page.note),
    layout: page.layout ?? "standard",
    sourcePages: Object.freeze(page.sourcePages)
  }));

  return Object.freeze({ ...complete, pages: Object.freeze(pages) });
}

export const calculusKnowledgeContent = Object.freeze(Object.fromEntries(
  calculusLessonEntries.map(([code, item]) => [code, createCompleteReading(code, item)])
));

// These legacy examples keep their original IDs so previously viewed progress
// remains valid. A match means the curated slide already represents that exact
// worked-example block from the PDF; otherwise it remains a reviewed, additional
// BienEdu example beside the two verbatim-source examples.
const legacySourceExampleMatches = Object.freeze({
  "12.1": 1,
  "12.2": 1,
  "12.3": 2,
  "12.4": 2,
  "12.5": 1,
  "12.6": 1,
  "12.7": 1,
  "12.8": 1,
  "12.9": 1,
  "13.1": 1,
  "13.4": 1,
  "14.3": 1
});

function createCompleteExamples(code, item) {
  const matchedSourceNumber = legacySourceExampleMatches[code] ?? null;
  const legacy = Object.freeze({
    ...item.examples[0],
    id: `${code}-example-1`,
    sourceBlockId: matchedSourceNumber ? `${code}-worked-example-${matchedSourceNumber}` : null,
    origin: matchedSourceNumber ? "verified-source" : "curated-example",
    verification: "verified"
  });
  const sourceExamples = calculusSourceExamples[code]
    .filter((_example, index) => index + 1 !== matchedSourceNumber);
  return Object.freeze([legacy, ...sourceExamples]);
}

export const calculusExampleContent = Object.freeze(Object.fromEntries(
  calculusLessonEntries.map(([code, item]) => [code, createCompleteExamples(code, item)])
));

export const calculusPracticeBank = Object.freeze(Object.fromEntries(
  calculusLessonEntries.map(([code, item]) => [code, item.practice])
));

export const calculusKnowledgeSections = Object.freeze(Object.fromEntries(
  calculusLessonEntries.map(([code, item], index) => [code, {
    sourceId: SOURCE_ID,
    startsAt: `${code} ${item.title}`,
    endsBefore: calculusLessonEntries[index + 1]?.[0] ?? "END_CD14",
    knowledgeSlides: [{
      id: `${code}-knowledge-1`,
      src: null,
      sourcePages: item.pages,
      crops: []
    }],
    exampleSlides: calculusExampleContent[code].map((example) => ({
      id: example.id,
      src: null,
      sourcePages: example.sourcePages,
      crops: []
    })),
    slides: [{
      id: `${code}-knowledge-1`,
      src: null,
      sourcePages: item.pages,
      crops: []
    }]
  }])
));
