// Complete theory coverage audited against every "Kiến thức trọng tâm" and
// "Phương pháp giải" block in the verified CD12–CD14 source PDF.
export const calculusKnowledgeDetails = Object.freeze({
  "12.1": {
    formulae: [
      { label: "Định nghĩa nguyên hàm", value: String.raw`F'(x)=f(x),\quad x\in I`, expressions: [String.raw`F'(x)=f(x),\quad x\in I`, String.raw`\int f(x)\,dx=F(x)+C,\quad C\in\mathbb{R}`], detail: "Một hàm số F là nguyên hàm của f trên khoảng I nếu F′(x) = f(x) với mọi x ∈ I." },
      { label: "Hàm hằng", value: String.raw`\int 0\,dx=C;\quad \int 1\,dx=x+C;\quad \int k\,dx=kx+C`, expressions: [String.raw`\int 0\,dx=C`, String.raw`\int 1\,dx=x+C`, String.raw`\int k\,dx=kx+C`], detail: "Các hàng đầu tiên trong bảng công thức nguyên hàm cơ bản thường dùng." },
      { label: "Lũy thừa", value: String.raw`\int x^n\,dx=\frac{x^{n+1}}{n+1}+C`, detail: "n ≠ −1." },
      { label: "Hàm nghịch đảo", value: String.raw`\int\frac{1}{x}\,dx=\ln|x|+C`, detail: "Công thức được dùng trên từng khoảng xác định." },
      { label: "Hàm mũ", value: String.raw`\int e^x\,dx=e^x+C;\quad \int a^x\,dx=\frac{a^x}{\ln a}+C`, expressions: [String.raw`\int e^x\,dx=e^x+C`, String.raw`\int a^x\,dx=\frac{a^x}{\ln a}+C`], detail: "a > 0, a ≠ 1." },
      { label: "Sin – cos", value: String.raw`\int\sin x\,dx=-\cos x+C;\quad \int\cos x\,dx=\sin x+C`, expressions: [String.raw`\int\sin x\,dx=-\cos x+C`, String.raw`\int\cos x\,dx=\sin x+C`], detail: "Giữ nguyên dấu âm trong nguyên hàm của sin x." },
      { label: "Phân thức lượng giác", value: String.raw`\int\frac{1}{\cos^2 x}\,dx=\tan x+C;\quad \int\frac{1}{\sin^2 x}\,dx=-\cot x+C`, expressions: [String.raw`\int\frac{1}{\cos^2 x}\,dx=\tan x+C`, String.raw`\int\frac{1}{\sin^2 x}\,dx=-\cot x+C`, String.raw`\int\tan x\,dx=-\ln|\cos x|+C`, String.raw`\int\cot x\,dx=\ln|\sin x|+C`], detail: "Các công thức trong bảng nguyên hàm cơ bản thường dùng." },
      { label: "Arcsin – arctan", value: String.raw`\int\frac{1}{\sqrt{1-x^2}}\,dx=\arcsin x+C`, expressions: [String.raw`\int\frac{1}{\sqrt{1-x^2}}\,dx=\arcsin x+C`, String.raw`\int\frac{1}{1+x^2}\,dx=\arctan x+C`, String.raw`\int\frac{1}{a^2+x^2}\,dx=\frac{1}{a}\arctan\frac{x}{a}+C`], detail: "Công thức cuối có điều kiện a > 0." },
      { label: "Hàm hợp lũy thừa", value: String.raw`\int f'(x)[f(x)]^n\,dx=\frac{[f(x)]^{n+1}}{n+1}+C`, detail: "n ≠ −1." },
      { label: "Hàm hợp logarit – mũ", value: String.raw`\int\frac{f'(x)}{f(x)}\,dx=\ln|f(x)|+C;\quad \int f'(x)e^{f(x)}\,dx=e^{f(x)}+C`, expressions: [String.raw`\int\frac{f'(x)}{f(x)}\,dx=\ln|f(x)|+C`, String.raw`\int f'(x)e^{f(x)}\,dx=e^{f(x)}+C`], detail: "Giữ nguyên f(x), f′(x) và dấu giá trị tuyệt đối như nguồn." },
      { label: "Hàm hợp lượng giác", value: String.raw`\int f'(x)\cos(f(x))\,dx=\sin(f(x))+C`, expressions: [String.raw`\int f'(x)\cos(f(x))\,dx=\sin(f(x))+C`, String.raw`\int f'(x)\sin(f(x))\,dx=-\cos(f(x))+C`], detail: "Hai công thức được trình bày liền nhau trong phần công thức mở rộng." },
      { label: "Tính tuyến tính", value: String.raw`\int(af(x)+bg(x))\,dx=a\int f(x)\,dx+b\int g(x)\,dx`, detail: "a, b là hằng số." }
    ],
    points: [
      { label: "Bước 1", text: "Viết hàm dưới dạng tổng những biểu thức quen thuộc." },
      { label: "Bước 2", text: "Tính nguyên hàm từng hạng tử; kiểm tra trường hợp đặc biệt x⁻¹." },
      { label: "Bước 3", text: "Ghi +C và lấy đạo hàm để kiểm tra." }
    ],
    pages: [
      {
        lead: "Một hàm số F là nguyên hàm của f trên khoảng I nếu F′(x) = f(x) với mọi x ∈ I. Mọi nguyên hàm của cùng một hàm số trên cùng một khoảng chỉ sai khác nhau một hằng số.",
        formulaeRange: [0, 8],
        pointsRange: [0, 0],
        layout: "formula-grid",
        note: { label: "Điều kiện nguồn", text: "n ≠ −1; a > 0 và a ≠ 1 trong công thức hàm mũ; a > 0 trong công thức arctan có tham số.", tone: "tip" },
        sourcePages: [3]
      },
      {
        lead: "Các công thức mở rộng rất hay dùng và phương pháp giải được giữ theo đúng thứ tự của tài liệu nguồn.",
        formulaeRange: [8, 12],
        pointsRange: [0, 3],
        note: { label: "Bước cuối", text: "Ghi +C và lấy đạo hàm để kiểm tra.", tone: "warning" },
        sourcePages: [3, 4]
      }
    ]
  },
  "12.2": {
    formulae: [
      { label: "Đa thức", value: "∫P(x)dx=∑aₖxᵏ⁺¹/(k+1)+C", detail: "Lấy nguyên hàm riêng từng đơn thức của P(x)." },
      { label: "Tích hoặc lũy thừa", value: "Khai triển và gộp hạng tử trước khi tích phân", detail: "Có thể giữ nguyên dạng nếu nhận ra trực tiếp cấu trúc u′(x)[u(x)]ⁿ." },
      { label: "Dạng hàm hợp", value: String.raw`\int u'(x)[u(x)]^n\,dx=\frac{[u(x)]^{n+1}}{n+1}+C`, detail: "Dùng khi đạo hàm u′ xuất hiện đủ trong biểu thức." }
    ],
    points: [
      { label: "Khai triển", text: "Khai triển tích, hằng đẳng thức hoặc lũy thừa và gộp các số hạng cùng bậc." },
      { label: "Tích phân từng đơn thức", text: "Tăng số mũ lên một, chia cho số mũ mới và giữ đúng hệ số." },
      { label: "Thử đạo hàm", text: "Lấy đạo hàm kết quả đã rút gọn để phát hiện lỗi khai triển hoặc sai hệ số." }
    ]
  },
  "12.3": {
    formulae: [
      { label: "Đạo hàm trên hàm", value: "∫u′(x)/u(x)dx=ln|u(x)|+C", detail: "Áp dụng trên từng khoảng u(x) khác 0." },
      { label: "Mẫu bình phương cộng", value: "∫dx/(x²+a²)=(1/a)arctan(x/a)+C", detail: "Điều kiện a>0." },
      { label: "Hai nhân tử bậc nhất", value: "(Ax+B)/[(x−α)(x−β)]=M/(x−α)+N/(x−β)", detail: "Dùng khi α≠β rồi lấy nguyên hàm từng phân thức đơn giản." },
      { label: "Nhân tử lặp", value: "A₁/(x−a)+A₂/(x−a)²+⋯", detail: "Phải có đủ các lũy thừa từ 1 đến số lần lặp của nhân tử." }
    ],
    points: [
      { label: "Rút gọn hoặc chia", text: "Nếu bậc tử không nhỏ hơn bậc mẫu, thực hiện phép chia đa thức trước." },
      { label: "So với đạo hàm mẫu", text: "Kiểm tra tử có bằng hoặc tỉ lệ với đạo hàm của mẫu để dùng dạng logarit." },
      { label: "Phân tích phân thức", text: "Nếu hai bước trên chưa giải được, phân tích mẫu thành nhân tử và tách thành phân thức đơn giản." }
    ]
  },
  "12.4": {
    formulae: [
      { label: "Sin – cos", value: "∫sinx dx=−cosx+C; ∫cosx dx=sinx+C", expressions: ["∫sinx dx=−cosx+C", "∫cosx dx=sinx+C"], detail: "Hai công thức lượng giác cơ bản." },
      { label: "Nghịch đảo bình phương sin – cos", value: String.raw`\int\frac{dx}{\cos^2 x}=\tan x+C;\quad \int\frac{dx}{\sin^2 x}=-\cot x+C`, expressions: [String.raw`\int\frac{dx}{\cos^2 x}=\tan x+C`, String.raw`\int\frac{dx}{\sin^2 x}=-\cot x+C`], detail: "Chỉ áp dụng trên khoảng xác định." },
      { label: "Tan – cot", value: "∫tanx dx=−ln|cosx|+C; ∫cotx dx=ln|sinx|+C", expressions: ["∫tanx dx=−ln|cosx|+C", "∫cotx dx=ln|sinx|+C"], detail: "Kết quả có dạng logarit." },
      { label: "Đối số tuyến tính", value: String.raw`\int\sin(ax+b)\,dx=-\frac{\cos(ax+b)}{a}+C`, detail: "Tương tự ∫cos(ax+b)dx=sin(ax+b)/a+C, với a≠0." },
      { label: "Hạ bậc", value: "sin²x=(1−cos2x)/2; cos²x=(1+cos2x)/2", expressions: ["sin²x=(1−cos2x)/2", "cos²x=(1+cos2x)/2"], detail: "Đưa bình phương lượng giác về tổng các hàm cơ bản." },
      { label: "Nhân đôi", value: "2sinx cosx=sin2x", detail: "Dùng khi tích sin và cos có cùng đối số." }
    ],
    points: [
      { label: "Nhận dạng", text: "Đối chiếu biểu thức với các nguyên hàm lượng giác cơ bản." },
      { label: "Biến đổi", text: "Dùng công thức nhân đôi, hạ bậc hoặc tích thành tổng nếu chưa tích phân trực tiếp được." },
      { label: "Bù hệ số góc", text: "Khi đối số là ax+b, luôn kiểm tra và nhân thêm hệ số 1/a." }
    ]
  },
  "12.5": {
    formulae: [
      { label: "Mũ cơ số e", value: "∫eᵃˣ⁺ᵇdx=eᵃˣ⁺ᵇ/a+C", detail: "Điều kiện a≠0." },
      { label: "Mũ cơ số q", value: "∫qᵃˣ⁺ᵇdx=qᵃˣ⁺ᵇ/[a ln(q)]+C", detail: "q dương, q≠1 và a≠0." },
      { label: "Đạo hàm trên hàm", value: "∫u′(x)/u(x)dx=ln|u(x)|+C", detail: "Xét đúng miền xác định của u." },
      { label: "Logarit đứng riêng", value: "∫lnx dx=xlnx−x+C", detail: "Dùng tích phân từng phần với x>0." },
      { label: "Logarit lồng", value: "∫dx/[xlnx]=ln|lnx|+C", detail: "Điều kiện x>0 và x≠1." }
    ],
    points: [
      { label: "Nhận dạng hàm hợp", text: "Tìm cấu trúc eᵘu′ hoặc qᵘu′ và bù hệ số còn thiếu." },
      { label: "Xử lý ln x", text: "Nếu ln x đứng riêng, dùng tích phân từng phần thay vì công thức u′/u." },
      { label: "Kiểm tra miền", text: "Ghi rõ điều kiện của logarit, mẫu số và cơ số trước khi kết luận." }
    ]
  },
  "12.6": {
    formulae: [
      { label: "Đổi biến tổng quát", value: "u=g(x), du=g′(x)dx ⇒ ∫f(g(x))g′(x)dx=∫f(u)du", aligned: [String.raw`u&=g(x),\quad du=g'(x)\,dx`, String.raw`\int f(g(x))g'(x)\,dx&=\int f(u)\,du`], detail: "Sau khi tính theo u, thay u=g(x) và thêm C." },
      { label: "Mẫu lũy thừa", value: "∫u′uⁿdx=uⁿ⁺¹/(n+1)+C", detail: "Điều kiện n≠−1." },
      { label: "Mẫu logarit", value: "∫u′/u dx=ln|u|+C", detail: "Áp dụng trên từng khoảng u khác 0." }
    ],
    points: [
      { label: "Chọn biến mới", text: "Chọn u là biểu thức nằm trong căn, lũy thừa, logarit, hàm mũ hoặc lượng giác." },
      { label: "Đối chiếu vi phân", text: "Tính du và kiểm tra phần còn lại có khớp hoàn toàn, kể cả hệ số." },
      { label: "Trở về biến x", text: "Tính tích phân theo u, thay lại u=g(x) rồi ghi hằng số C." }
    ]
  },
  "12.7": {
    formulae: [
      { label: "Từng phần", value: "∫u dv=uv−∫v du", detail: "Suy ra từ đạo hàm của tích (uv)′=u′v+uv′." },
      { label: "Dạng thường gặp", value: "Đa thức×mũ; đa thức×lượng giác; ln x; arctan x", detail: "Chọn u là phần có đạo hàm đơn giản hơn và dv là phần dễ lấy nguyên hàm." },
      { label: "Lặp từng phần", value: "Có thể áp dụng công thức nhiều lần", detail: "Thường dùng khi đa thức còn bậc cao sau lần đầu." }
    ],
    points: [
      { label: "Lập bảng chọn", text: "Viết rõ u, dv rồi tính chính xác du và v." },
      { label: "Thay công thức", text: "Thế đủ uv và tích phân còn lại, chú ý dấu trừ." },
      { label: "Lặp nếu cần", text: "Rút gọn tích phân còn lại và tiếp tục từng phần nếu bậc đa thức chưa giảm hết." }
    ]
  },
  "12.8": {
    formulae: [
      { label: "Khôi phục hàm", value: "f′(x)=g(x) ⇒ f(x)=G(x)+C", detail: "G là một nguyên hàm của g; cần thêm điều kiện để xác định C." },
      { label: "Điều kiện hàm lẻ", value: "f lẻ và G lẻ ⇒ C=0", detail: "Trên miền đối xứng chứa 0, có thể dùng f(0)=0." },
      { label: "Hiệu hai giá trị", value: "f(a)−f(b)=G(a)−G(b)", detail: "Hằng số C triệt tiêu nên dữ kiện dạng hiệu không xác định C." },
      { label: "Điều kiện cực trị", value: "Cực trị tại x₀ ⇒ f′(x₀)=0", detail: "Điều kiện này chủ yếu kiểm tra tính tương thích của đạo hàm và không tự xác định C." }
    ],
    points: [
      { label: "Tìm một nguyên hàm", text: "Tính G từ g=f′ bằng các công thức nguyên hàm phù hợp." },
      { label: "Giữ hằng số", text: "Viết đầy đủ f(x)=G(x)+C, không tự đặt C=0." },
      { label: "Khai thác điều kiện", text: "Dùng tính chẵn lẻ, giá trị hàm hoặc dữ kiện khác và kiểm tra miền xác định." }
    ]
  },
  "12.9": {
    formulae: [
      { label: "Điều kiện ban đầu", value: "F′(x)=f(x), F(x₀)=a", detail: "Lấy một nguyên hàm G của f rồi xác định hằng số." },
      { label: "Hằng số", value: "C=a−G(x₀)", detail: "Thế điều kiện vào F(x)=G(x)+C." },
      { label: "Công thức trực tiếp", value: "F(x)=G(x)+a−G(x₀)", detail: "Chỉ dùng khi x₀ thuộc khoảng xác định đang xét." },
      { label: "Miền rời nhau", value: "Mỗi khoảng xác định có thể có hằng số riêng", detail: "Không dùng một hằng số chung xuyên qua điểm gián đoạn." }
    ],
    points: [
      { label: "Lấy nguyên hàm", text: "Tìm G và viết F=G+C, giữ nguyên hằng số chưa biết." },
      { label: "Thay điều kiện", text: "Thế x=x₀ và F(x₀)=a để giải C." },
      { label: "Kiểm tra", text: "Viết F hoàn chỉnh rồi kiểm tra cả F′=f và điều kiện ban đầu." }
    ]
  },
  "13.1": {
    formulae: [
      { label: "Newton–Leibniz", value: "∫ₐᵇf(x)dx=F(b)−F(a)", detail: "f liên tục trên [a,b] và F′=f." },
      { label: "Lũy thừa", value: "∫ₐᵇxⁿdx=[xⁿ⁺¹/(n+1)]ₐᵇ", detail: "Điều kiện n≠−1." },
      { label: "Logarit", value: "∫ₐᵇdx/x=[ln|x|]ₐᵇ", detail: "Đoạn tích phân không đi qua 0." },
      { label: "Hàm mũ", value: "∫ₐᵇeˣdx=[eˣ]ₐᵇ", detail: "Thế cận trên rồi trừ cận dưới." },
      { label: "Lượng giác", value: "∫ₐᵇcosx dx=[sinx]ₐᵇ; ∫ₐᵇsinx dx=[−cosx]ₐᵇ", expressions: ["∫ₐᵇcosx dx=[sinx]ₐᵇ", "∫ₐᵇsinx dx=[−cosx]ₐᵇ"], detail: "Nếu cận là góc, dùng đơn vị radian." },
      { label: "Arctan", value: "∫ₐᵇdx/(1+x²)=[arctanx]ₐᵇ", detail: "Một tích phân cơ bản thường gặp." }
    ],
    points: [
      { label: "Tìm nguyên hàm", text: "Chọn một nguyên hàm F đúng trên toàn đoạn lấy tích phân." },
      { label: "Thế đúng thứ tự", text: "Tính F(b)−F(a), đặt biểu thức tại cận dưới trong ngoặc nếu cần." },
      { label: "Kiểm tra cận góc", text: "Khi cận có giá trị lượng giác, sử dụng radian và không ghi +C." }
    ]
  },
  "13.2": {
    formulae: [
      { label: "Tuyến tính", value: "∫ₐᵇ(αf+βg)dx=α∫ₐᵇf dx+β∫ₐᵇg dx", detail: "α và β là hằng số." },
      { label: "Cộng đoạn", value: String.raw`\int_a^b f(x)\,dx=\int_a^c f(x)\,dx+\int_c^b f(x)\,dx`, detail: "Điểm c có thể dùng để ghép hoặc tách khoảng." },
      { label: "Đổi cận", value: "∫ₐᵇf dx=−∫ᵇₐf dx; ∫ₐᵃf dx=0", expressions: ["∫ₐᵇf dx=−∫ᵇₐf dx", "∫ₐᵃf dx=0"], detail: "Đưa các tích phân về cùng chiều trước khi kết hợp." },
      { label: "Bảo toàn thứ tự", value: "f≤g trên [a,b] ⇒ ∫ₐᵇf≤∫ₐᵇg", detail: "Giả sử a≤b; đặc biệt f≥0 thì tích phân không âm." },
      { label: "Hàm hằng", value: "∫ₐᵇk dx=k(b−a)", detail: "Dùng khi biểu thức có thêm một hằng số." }
    ],
    points: [
      { label: "Cùng chiều cận", text: "Đổi dấu các tích phân có chiều cận ngược trước khi cộng hoặc trừ." },
      { label: "Ghép khoảng", text: "Dùng điểm chia c để ghép dữ kiện trên [a,c] và [c,b]." },
      { label: "Khai thác tuyến tính", text: "Đưa hệ số ra ngoài, xử lý riêng phần hàm hằng và dùng bất đẳng thức nếu đề yêu cầu chặn giá trị." }
    ]
  },
  "13.3": {
    formulae: [
      { label: "Đổi biến có cận", value: String.raw`\int_a^b f(g(x))g'(x)\,dx=\int_{g(a)}^{g(b)}f(u)\,du`, detail: "Đặt u=g(x) rồi đổi cả hai cận theo u." },
      { label: "Cách 1", value: "Đổi biểu thức, vi phân và cận sang u", detail: "Khi đã đổi cận, tính trực tiếp theo u và không cần quay lại x." },
      { label: "Cách 2", value: "Tìm nguyên hàm theo u rồi trở về x trước khi thế cận", detail: "Dùng lại cận gốc theo x; không trộn biến u với cận x." }
    ],
    points: [
      { label: "Chọn u và du", text: "Chọn biểu thức trong hàm hợp, tính du và bù hệ số nếu cần." },
      { label: "Đổi hai cận", text: "Tính u=g(a) cho cận dưới và u=g(b) cho cận trên." },
      { label: "Tính nhất quán", text: "Giữ một hệ biến–cận thống nhất đến cuối phép tính." }
    ]
  },
  "13.4": {
    formulae: [
      { label: "Dạng đầy đủ", value: "∫ₐᵇu(x)v′(x)dx=[u(x)v(x)]ₐᵇ−∫ₐᵇu′(x)v(x)dx", detail: "Công thức từng phần trên đoạn [a,b]." },
      { label: "Dạng vi phân", value: "∫ₐᵇu dv=[uv]ₐᵇ−∫ₐᵇv du", detail: "Hạng tử biên phải tính ở cả cận trên và cận dưới." }
    ],
    points: [
      { label: "Chọn u và dv", text: "Chọn u có đạo hàm đơn giản, dv có nguyên hàm dễ tìm." },
      { label: "Tính hạng biên", text: "Tính [uv]ₐᵇ trước và không bỏ giá trị tại cận dưới." },
      { label: "Tính phần còn lại", text: "Giữ nguyên hai cận cho ∫vdu rồi rút gọn kết quả cuối." }
    ]
  },
  "13.5": {
    formulae: [
      { label: "Khử trị tuyệt đối", value: "|h(x)|=h(x) nếu h(x)≥0; |h(x)|=−h(x) nếu h(x)≤0", expressions: ["|h(x)|=h(x) nếu h(x)≥0", "|h(x)|=−h(x) nếu h(x)≤0"], detail: "Xét dấu riêng trên từng khoảng." },
      { label: "Chia đoạn", value: String.raw`\int_a^b |h(x)|\,dx=\sum_k\int_{x_k}^{x_{k+1}}\!\pm h(x)\,dx`, detail: "Chọn dấu để hàm dưới tích phân không âm trên mỗi khoảng." }
    ],
    points: [
      { label: "Tìm nghiệm trong đoạn", text: "Giải h(x)=0 và chỉ giữ các nghiệm thuộc [a,b]." },
      { label: "Lập bảng dấu", text: "Xác định h dương hay âm trên mỗi khoảng con." },
      { label: "Tách và tính", text: "Chia tích phân tại các nghiệm, bỏ dấu giá trị tuyệt đối rồi cộng các phần." }
    ]
  },
  "13.6": {
    formulae: [
      { label: "Diện tích đại số", value: "∫ₐᵇf(x)dx=S₊−S₋", detail: "S₊ và S₋ là tổng diện tích hình học ở phía trên và phía dưới Ox." },
      { label: "Tổng diện tích", value: "∫ₐᵇ|f(x)|dx=S₊+S₋", detail: "Mọi phần diện tích đều được cộng với dấu dương." },
      { label: "Hình học cơ bản", value: "Dùng diện tích chữ nhật, tam giác, hình thang hoặc bán nguyệt", detail: "Phải đọc đúng tỉ lệ trên cả hai trục của đồ thị." }
    ],
    points: [
      { label: "Xác định dấu", text: "Tìm giao điểm với Ox và xác định các miền phía trên, phía dưới." },
      { label: "Tính từng miền", text: "Dùng công thức hình học phù hợp để tính diện tích dương của mỗi miền." },
      { label: "Cộng theo yêu cầu", text: "Cộng có dấu khi tính ∫f; cộng toàn bộ diện tích khi tính ∫|f|." }
    ]
  },
  "13.7": {
    formulae: [
      { label: "Tham số như hằng số", value: "∫ₐᵇ[mg(x)+h(x)]dx=m∫ₐᵇg(x)dx+∫ₐᵇh(x)dx", aligned: [String.raw`\int_a^b[mg(x)+h(x)]\,dx`, String.raw`{}&=m\int_a^b g(x)\,dx`, String.raw`{}&\quad+\int_a^b h(x)\,dx`], detail: "m không phải biến tích phân." },
      { label: "Cận phụ thuộc tham số", value: "Tìm F rồi tính F[b(m)]−F[a(m)]", detail: "Sau khi giải phải kiểm tra điều kiện của tham số và miền xác định." }
    ],
    points: [
      { label: "Phân biệt biến và tham số", text: "Xác định biến tích phân, tham số và toàn bộ điều kiện kèm theo." },
      { label: "Tạo biểu thức theo tham số", text: "Tính tích phân để thu được một hàm hoặc phương trình theo tham số." },
      { label: "Giải và thử lại", text: "Giải phương trình hay bất phương trình rồi loại nghiệm không thỏa điều kiện." }
    ]
  },
  "13.8": {
    formulae: [
      { label: "Hàm chẵn", value: "f(−x)=f(x) ⇒ ∫₋ₐᵃf(x)dx=2∫₀ᵃf(x)dx", detail: "Hai nửa đối xứng đóng góp bằng nhau." },
      { label: "Hàm lẻ", value: "f(−x)=−f(x) ⇒ ∫₋ₐᵃf(x)dx=0", detail: "Hai nửa đối xứng triệt tiêu nhau." },
      { label: "Đối xứng qua trung điểm", value: "∫ₐᵇf(x)dx=∫ₐᵇf(a+b−x)dx", detail: "Phép đổi biến u=a+b−x phản chiếu đoạn qua trung điểm." },
      { label: "Tổng đối xứng không đổi", value: "f(x)+f(a+b−x)=k ⇒ ∫ₐᵇf(x)dx=k(b−a)/2", expressions: ["f(x)+f(a+b−x)=k", "∫ₐᵇf(x)dx=k(b−a)/2"], detail: "Cộng hai biểu thức tích phân rồi chia đôi." }
    ],
    points: [
      { label: "Nhận diện tâm đối xứng", text: "Kiểm tra đoạn đối xứng qua 0 hoặc qua trung điểm (a+b)/2." },
      { label: "Tách hoặc ghép", text: "Tách hàm thành phần chẵn–lẻ hoặc ghép với biểu thức sau phép phản chiếu." },
      { label: "Rút gọn trước", text: "Loại các phần triệt tiêu và chỉ tích phân phần còn lại." }
    ]
  },
  "14.1": {
    formulae: [
      { label: "Diện tích với Ox", value: "S=∫ₐᵇ|f(x)|dx", detail: "Miền được giới hạn bởi y=f(x), Ox, x=a và x=b." },
      { label: "Hàm không âm", value: "f(x)≥0 ⇒ S=∫ₐᵇf(x)dx", detail: "Đồ thị nằm phía trên hoặc trên trục Ox." },
      { label: "Hàm không dương", value: "f(x)≤0 ⇒ S=−∫ₐᵇf(x)dx", detail: "Đổi dấu để diện tích nhận giá trị không âm." }
    ],
    points: [
      { label: "Tìm giao điểm với Ox", text: "Giải f(x)=0 và giữ các nghiệm thuộc đoạn [a,b]." },
      { label: "Xét dấu", text: "Xác định đồ thị nằm trên hay dưới Ox trên từng khoảng con." },
      { label: "Cộng diện tích", text: "Lập tổng các tích phân không âm và ghi đúng đơn vị diện tích." }
    ]
  },
  "14.2": {
    formulae: [
      { label: "Hai đồ thị", value: "S=∫ₐᵇ|f(x)−g(x)|dx", detail: "Khoảng cách đứng giữa hai đồ thị là giá trị tuyệt đối của hiệu." },
      { label: "Trên trừ dưới", value: "f(x)≥g(x) ⇒ S=∫ₐᵇ[f(x)−g(x)]dx", detail: "Nếu vị trí đổi chỗ, tách tại nghiệm f(x)=g(x)." }
    ],
    points: [
      { label: "Tìm giao điểm", text: "Giải f(x)=g(x) để xác định cận và các mốc đổi vị trí." },
      { label: "Xác định trên–dưới", text: "So sánh f và g trên từng khoảng giữa hai giao điểm liên tiếp." },
      { label: "Lập tổng diện tích", text: "Lấy hàm trên trừ hàm dưới trên mỗi khoảng và cộng các kết quả dương." }
    ]
  },
  "14.3": {
    formulae: [
      { label: "Đĩa tròn quanh Ox", value: "V=π∫ₐᵇ[f(x)]²dx", detail: "Miền 0≤y≤f(x), với f không âm, quay quanh Ox." },
      { label: "Vành khăn", value: "V=π∫ₐᵇ[R(x)²−r(x)²]dx", detail: "R và r là bán kính ngoài, trong đo từ trục quay." },
      { label: "Vỏ trụ quanh Oy", value: "V=2π∫ₐᵇx f(x)dx", detail: "Dùng cho miền 0≤y≤f(x), 0≤a≤x≤b quay quanh Oy." }
    ],
    points: [
      { label: "Xác định trục và cận", text: "Đọc đúng trục quay, đoạn tích phân và hướng của lát cắt." },
      { label: "Tìm bán kính", text: "Đo bán kính ngoài và trong từ trục quay, không mặc định bằng tung độ." },
      { label: "Lập diện tích lát cắt", text: "Dùng π(R²−r²) hoặc công thức vỏ trụ rồi tích phân trên toàn đoạn." }
    ]
  },
  "14.4": {
    formulae: [
      { label: "Ngoài trừ phần khoét", value: "V_còn=V_ngoài−V_khoét", detail: "Hai thể tích phải được tính trên cùng chiều dài và cùng đơn vị." },
      { label: "Vành khăn", value: "V=π∫ₐᵇ[R(x)²−r(x)²]dx", detail: "Diện tích tiết diện đúng là πR²−πr²." },
      { label: "Cảnh báo", value: "π(R−r)² không phải diện tích vành khăn", detail: "Phải lấy hiệu hai bình phương, không bình phương hiệu." }
    ],
    points: [
      { label: "Đọc phần giữ lại", text: "Xác định rõ vật thể ngoài, lỗ khoét và trục đối xứng từ hình hoặc mô tả." },
      { label: "Cùng một lát cắt", text: "Viết diện tích ngoài và diện tích lỗ trên cùng vị trí x." },
      { label: "Trừ và kiểm tra", text: "Tính thể tích còn lại, bảo đảm không âm và ghi đơn vị khối." }
    ]
  },
  "14.5": {
    formulae: [
      { label: "Độ dời", value: "Δx=∫ₐᵇv(t)dt", detail: "Là đại lượng có dấu, biểu thị thay đổi vị trí." },
      { label: "Quãng đường", value: "S=∫ₐᵇ|v(t)|dt", detail: "Luôn không âm và bằng tổng độ dài các chặng." },
      { label: "Không đổi chiều", value: "v(t)≥0 trên [a,b] ⇒ S=Δx", detail: "Nếu v đổi dấu, phải chia tại các nghiệm v(t)=0." }
    ],
    points: [
      { label: "Tìm lúc dừng", text: "Giải v(t)=0 trong khoảng và xét xem vận tốc có đổi dấu hay không." },
      { label: "Tính độ dời", text: "Tích phân trực tiếp v(t) với dấu trên toàn khoảng." },
      { label: "Tính quãng đường", text: "Chia khoảng theo dấu của v và cộng giá trị tuyệt đối độ dời từng chặng." }
    ]
  },
  "14.6": {
    formulae: [
      { label: "Độ biến thiên", value: "F(b)−F(a)=∫ₐᵇf(t)dt", detail: "Trong đó f(t)=F′(t) là tốc độ thay đổi tức thời." },
      { label: "Giá trị cuối", value: "F(b)=F(a)+∫ₐᵇf(t)dt", detail: "Tốc độ âm làm đại lượng tích lũy giảm." },
      { label: "Kiểm tra đơn vị", value: "Đơn vị của f × đơn vị thời gian = đơn vị của F", detail: "Ví dụ người/năm×năm, kg/phút×phút hoặc °C/giờ×giờ." }
    ],
    points: [
      { label: "Đặt tên đại lượng", text: "Xác định F(t), tốc độ F′(t) và giá trị ban đầu từ đề bài." },
      { label: "Đổi đơn vị", text: "Thống nhất đơn vị thời gian giữa tốc độ và cận tích phân." },
      { label: "Tích lũy", text: "Tính ∫f để có phần thay đổi; nếu hỏi giá trị cuối thì cộng thêm F(a)." }
    ]
  },
  "14.7": {
    formulae: [
      { label: "Công suất", value: "P(t)=E′(t)", detail: "Công suất là tốc độ truyền hoặc tiêu thụ năng lượng." },
      { label: "Năng lượng", value: "ΔE=∫ₐᵇP(t)dt", detail: "Nếu có nhiều chế độ hoạt động, chia thành các giai đoạn." },
      { label: "Watt – joule", value: "1 W=1 J/s", detail: "P tính bằng W và t bằng giây thì E tính bằng joule." },
      { label: "Kilowatt-giờ", value: "1 kWh=3,6×10⁶ J", detail: "P tính bằng kW và t bằng giờ thì E tính bằng kWh." }
    ],
    points: [
      { label: "Xác định chế độ", text: "Đọc biểu thức công suất và khoảng thời gian hoạt động của từng chế độ." },
      { label: "Đổi cùng hệ đơn vị", text: "Chọn W–giây hoặc kW–giờ trước khi tính." },
      { label: "Tích phân công suất", text: "Tính E=∫Pdt, cộng các giai đoạn và ghi đúng đơn vị năng lượng." }
    ]
  },
  "14.8": {
    formulae: [
      { label: "Lưu lượng", value: "q(t)=V′(t)", detail: "q mô tả thể tích chất lỏng hoặc khí qua tiết diện trong một đơn vị thời gian." },
      { label: "Thể tích tích lũy", value: "ΔV=∫ₐᵇq(t)dt", detail: "Đơn vị lưu lượng nhân thời gian cho đơn vị thể tích." },
      { label: "Dòng vào – ra", value: "V′(t)=q_vào(t)−q_ra(t)", detail: "Tích phân lưu lượng có dấu cho thay đổi thể tích ròng." },
      { label: "Giá trị cuối", value: "V(b)=V(a)+∫ₐᵇV′(t)dt", detail: "Cần cộng thể tích ban đầu nếu đề hỏi lượng đang có trong bể." }
    ],
    points: [
      { label: "Đọc đơn vị", text: "Xác định đơn vị lưu lượng và đổi thời gian về đúng đơn vị tương ứng." },
      { label: "Lập lưu lượng ròng", text: "Chọn chiều dương rồi lấy tổng dòng vào trừ tổng dòng ra." },
      { label: "Tính thể tích", text: "Tích phân theo thời gian; cộng V(a) nếu cần tìm thể tích cuối." }
    ]
  },
  "14.9": {
    formulae: [
      { label: "Tốc độ từng phần", value: "r(t)=r₁(t), r₂(t), … trên các khoảng liên tiếp", detail: "Mỗi công thức chỉ dùng trong đúng giai đoạn đã cho." },
      { label: "Tổng biến thiên", value: String.raw`\Delta F=\sum_{k=1}^{n}\int_{t_{k-1}}^{t_k}r_k(t)\,dt`, detail: "Các khoảng phải ghép kín, không chồng lấn và dùng chung hệ đơn vị." },
      { label: "Quãng đường nhiều chặng", value: String.raw`S=\sum_{k=1}^{n}\int_{t_{k-1}}^{t_k}|v_k(t)|\,dt`, detail: "Dùng giá trị tuyệt đối khi vận tốc có thể đổi chiều." },
      { label: "Giá trị cuối", value: "F(tₙ)=F(t₀)+ΔF", detail: "Giữ đúng dấu của phần tăng và phần giảm ở từng chặng." }
    ],
    points: [
      { label: "Vẽ trục thời gian", text: "Đánh dấu toàn bộ thời điểm quy luật hoặc chế độ hoạt động thay đổi." },
      { label: "Mô hình từng chặng", text: "Viết tốc độ trên từng khoảng và kiểm tra tính liên tục nếu đề yêu cầu." },
      { label: "Tích phân từng giai đoạn", text: "Tính riêng từng phần theo ý nghĩa vật lý rồi cộng có dấu." },
      { label: "Kiểm tra kết quả", text: "Ghi đầy đủ đơn vị, kiểm tra độ lớn và đối chiếu với giá trị ban đầu." }
    ]
  }
});
