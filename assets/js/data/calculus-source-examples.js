// Exhaustive worked-example manifest for the verified 49-page CD12-CD14 PDF.
// Content is intentionally separate from generated practice and legacy curated examples.

function sourceExample(code, number, {
  title,
  prompt,
  method,
  setup,
  calculation,
  answer,
  takeaway,
  sourcePages
}) {
  return Object.freeze({
    id: `${code}-source-example-${number}`,
    sourceBlockId: `${code}-worked-example-${number}`,
    origin: "verified-source",
    verification: "verified",
    title,
    prompt,
    analysis: Object.freeze([
      method,
      "Giữ nguyên giả thiết, điều kiện và thứ tự tính như trong tài liệu nguồn."
    ]),
    steps: Object.freeze([
      Object.freeze({ label: "Thiết lập", expression: setup, text: method }),
      Object.freeze({ label: "Tính và kết luận", expression: calculation, text: answer })
    ]),
    answer,
    takeaway,
    sourcePages: Object.freeze(sourcePages)
  });
}

function pair(code, examples) {
  return Object.freeze(examples.map((example, index) => sourceExample(code, index + 1, example)));
}

export const calculusSourceExamples = Object.freeze({
  "12.1": pair("12.1", [
    {
      title: "Nguyên hàm đa thức cơ bản",
      prompt: "Tính ∫(3x²−4x+5)dx.",
      method: "Dùng tính tuyến tính và lấy nguyên hàm từng hạng tử.",
      setup: "∫(3x²−4x+5)dx",
      calculation: "x³−2x²+5x+C",
      answer: "∫(3x²−4x+5)dx=x³−2x²+5x+C.",
      takeaway: "Có thể kiểm tra bằng cách lấy đạo hàm kết quả.",
      sourcePages: [4]
    },
    {
      title: "Kết hợp lũy thừa và logarit",
      prompt: "Tính ∫(√x+2/x)dx với x>0.",
      method: "Viết √x=x^(1/2), tách tổng và dùng ∫1/x dx=ln x trên x>0.",
      setup: "∫(x^(1/2)+2x^(−1))dx",
      calculation: "(2/3)x^(3/2)+2ln x+C",
      answer: "∫(√x+2/x)dx=(2/3)x^(3/2)+2ln x+C.",
      takeaway: "Điều kiện x>0 cho phép viết ln x thay cho ln|x|.",
      sourcePages: [4]
    }
  ]),
  "12.2": pair("12.2", [
    {
      title: "Khai triển tích hai đa thức",
      prompt: "Tính ∫(2x−1)(x²+3x)dx.",
      method: "Khai triển tích rồi lấy nguyên hàm từng đơn thức.",
      setup: "(2x−1)(x²+3x)=2x³+5x²−3x",
      calculation: "x⁴/2+5x³/3−3x²/2+C",
      answer: "∫(2x−1)(x²+3x)dx=x⁴/2+5x³/3−3x²/2+C.",
      takeaway: "Rút gọn biểu thức trước khi lấy nguyên hàm.",
      sourcePages: [5]
    },
    {
      title: "Khai triển bình phương đa thức",
      prompt: "Tính ∫(x²+1)²dx.",
      method: "Dùng hằng đẳng thức để đưa về tổng các đơn thức.",
      setup: "(x²+1)²=x⁴+2x²+1",
      calculation: "x⁵/5+2x³/3+x+C",
      answer: "∫(x²+1)²dx=x⁵/5+2x³/3+x+C.",
      takeaway: "Không lấy nguyên hàm riêng từng thừa số của một tích.",
      sourcePages: [5]
    }
  ]),
  "12.3": pair("12.3", [
    {
      title: "Phân tích phân thức thành phần",
      prompt: "Tính ∫(3x+5)/(x²+3x+2)dx.",
      method: "Phân tích mẫu và tách thành hai phân thức bậc nhất.",
      setup: "(3x+5)/[(x+1)(x+2)]=2/(x+1)+1/(x+2)",
      calculation: "2ln|x+1|+ln|x+2|+C",
      answer: "I=2ln|x+1|+ln|x+2|+C.",
      takeaway: "Giữ giá trị tuyệt đối khi lấy nguyên hàm 1/(x+a).",
      sourcePages: [7]
    },
    {
      title: "Nhận dạng đạo hàm của mẫu",
      prompt: "Tính ∫(2x+1)/(x²+x+1)dx.",
      method: "Tử số đúng bằng đạo hàm của mẫu số.",
      setup: "u=x²+x+1, du=(2x+1)dx",
      calculation: "ln(x²+x+1)+C",
      answer: "I=ln(x²+x+1)+C.",
      takeaway: "Mẫu luôn dương nên không cần dấu giá trị tuyệt đối.",
      sourcePages: [7]
    }
  ]),
  "12.4": pair("12.4", [
    {
      title: "Nguyên hàm với góc tuyến tính",
      prompt: "Tính ∫(2sin3x−3cos2x)dx.",
      method: "Bù hệ số của góc khi lấy nguyên hàm sin(ax) và cos(ax).",
      setup: "2∫sin3x dx−3∫cos2x dx",
      calculation: "−(2/3)cos3x−(3/2)sin2x+C",
      answer: "I=−(2/3)cos3x−(3/2)sin2x+C.",
      takeaway: "Mỗi đối số ax tạo thêm hệ số 1/a.",
      sourcePages: [8]
    },
    {
      title: "Hạ bậc sin bình phương",
      prompt: "Tính ∫sin²x dx.",
      method: "Dùng sin²x=(1−cos2x)/2.",
      setup: "∫sin²x dx=∫(1−cos2x)/2 dx",
      calculation: "x/2−sin2x/4+C",
      answer: "I=x/2−sin2x/4+C.",
      takeaway: "Hạ bậc trước khi lấy nguyên hàm.",
      sourcePages: [8]
    }
  ]),
  "12.5": pair("12.5", [
    {
      title: "Kết hợp hàm mũ và logarit",
      prompt: "Tính ∫(2ˣ+3/x)dx với x>0.",
      method: "Tách tổng; dùng ∫aˣdx=aˣ/ln a và ∫1/x dx=ln x.",
      setup: "∫2ˣdx+3∫dx/x",
      calculation: "2ˣ/ln2+3ln x+C",
      answer: "I=2ˣ/ln2+3ln x+C.",
      takeaway: "Nguyên hàm aˣ có mẫu ln a.",
      sourcePages: [10]
    },
    {
      title: "Dạng e^(3x) và 1/(x ln x)",
      prompt: "Tính ∫[3e^(3x)+1/(x ln x)]dx với x>0, x≠1.",
      method: "Nhận ra 3e^(3x) là đạo hàm của e^(3x); đặt u=ln x cho hạng tử còn lại.",
      setup: "u=ln x, du=dx/x",
      calculation: "e^(3x)+ln|ln x|+C",
      answer: "I=e^(3x)+ln|ln x|+C.",
      takeaway: "Điều kiện x>0, x≠1 bảo đảm ln x xác định và khác 0.",
      sourcePages: [10]
    }
  ]),
  "12.6": pair("12.6", [
    {
      title: "Đổi biến trong hàm lượng giác",
      prompt: "Tính ∫2x cos(x²+1)dx.",
      method: "Đặt biểu thức bên trong cos làm biến mới.",
      setup: "u=x²+1, du=2x dx",
      calculation: "∫cosu du=sinu+C=sin(x²+1)+C",
      answer: "I=sin(x²+1)+C.",
      takeaway: "Chọn u sao cho du xuất hiện trọn vẹn.",
      sourcePages: [12]
    },
    {
      title: "Đổi biến biểu thức trong căn",
      prompt: "Tính ∫x/√(x²+4) dx.",
      method: "Đặt u=x²+4 để đưa tích phân về lũy thừa u^(−1/2).",
      setup: "u=x²+4, du=2x dx",
      calculation: "(1/2)∫u^(−1/2)du=√(x²+4)+C",
      answer: "I=√(x²+4)+C.",
      takeaway: "Sau khi tích phân theo u phải thay lại biểu thức của x.",
      sourcePages: [12]
    }
  ]),
  "12.7": pair("12.7", [
    {
      title: "Từng phần với x·eˣ",
      prompt: "Tính ∫x eˣdx.",
      method: "Chọn u=x và dv=eˣdx.",
      setup: "u=x, du=dx; v=eˣ",
      calculation: "xeˣ−∫eˣdx=(x−1)eˣ+C",
      answer: "I=(x−1)eˣ+C.",
      takeaway: "Đạo hàm đa thức để giảm bậc.",
      sourcePages: [14]
    },
    {
      title: "Từng phần với x·lnx",
      prompt: "Tính ∫x ln x dx với x>0.",
      method: "Chọn u=ln x và dv=x dx.",
      setup: "u=ln x, du=dx/x; v=x²/2",
      calculation: "(x²/2)ln x−(1/2)∫x dx=(x²/2)ln x−x²/4+C",
      answer: "I=(x²/2)ln x−x²/4+C.",
      takeaway: "Logarit thường được chọn làm u.",
      sourcePages: [14]
    }
  ]),
  "12.8": pair("12.8", [
    {
      title: "Khôi phục hàm lẻ từ đạo hàm",
      prompt: "Biết f′(x)=3x²+2 và f là hàm lẻ trên R. Tìm f.",
      method: "Lấy nguyên hàm rồi dùng f(0)=0 của hàm lẻ.",
      setup: "f(x)=x³+2x+C",
      calculation: "f(0)=C=0",
      answer: "f(x)=x³+2x.",
      takeaway: "Tính lẻ xác định hằng số nguyên hàm trong bài này.",
      sourcePages: [16]
    },
    {
      title: "Hiệu hai giá trị không phụ thuộc C",
      prompt: "Biết f′(x)=2x−3. Tính f(4)−f(1).",
      method: "Viết họ hàm f rồi lấy hiệu để hằng số C triệt tiêu.",
      setup: "f(x)=x²−3x+C",
      calculation: "f(4)−f(1)=(16−12)−(1−3)=6",
      answer: "f(4)−f(1)=6.",
      takeaway: "Hiệu hai giá trị của cùng một nguyên hàm không phụ thuộc C.",
      sourcePages: [16]
    }
  ]),
  "12.9": pair("12.9", [
    {
      title: "Điều kiện ban đầu tại x=2",
      prompt: "Tìm F thỏa F′(x)=x²−4 và F(2)=5.",
      method: "Lấy nguyên hàm, giữ C rồi thay điều kiện F(2)=5.",
      setup: "F(x)=x³/3−4x+C",
      calculation: "8/3−8+C=5 ⇒ C=31/3",
      answer: "F(x)=x³/3−4x+31/3.",
      takeaway: "Không bỏ C trước khi dùng điều kiện ban đầu.",
      sourcePages: [17]
    },
    {
      title: "Điều kiện ban đầu trên khoảng dương",
      prompt: "Tìm F trên (0,+∞) thỏa F′(x)=1/x và F(1)=3.",
      method: "Trên khoảng dương, nguyên hàm của 1/x là ln x+C.",
      setup: "F(x)=ln x+C",
      calculation: "F(1)=C=3",
      answer: "F(x)=ln x+3.",
      takeaway: "Điểm đặt điều kiện phải thuộc khoảng đang xét.",
      sourcePages: [17]
    }
  ]),
  "13.1": pair("13.1", [
    {
      title: "Áp dụng Newton–Leibniz",
      prompt: "Tính I=∫₀²(3x²−2x)dx.",
      method: "Tìm nguyên hàm F=x³−x² rồi lấy F(2)−F(0).",
      setup: "I=[x³−x²]₀²",
      calculation: "(8−4)−0=4",
      answer: "I=4.",
      takeaway: "Thế cận trên trước rồi trừ giá trị tại cận dưới.",
      sourcePages: [19]
    },
    {
      title: "Tích phân hàm lẻ trên đoạn đối xứng",
      prompt: "Tính J=∫₋₁¹x³dx.",
      method: "Có thể dùng nguyên hàm hoặc tính lẻ của x³ trên đoạn đối xứng.",
      setup: "J=[x⁴/4]₋₁¹",
      calculation: "1/4−1/4=0",
      answer: "J=0.",
      takeaway: "Hai phần diện tích đại số dương và âm triệt tiêu.",
      sourcePages: [19]
    }
  ]),
  "13.2": pair("13.2", [
    {
      title: "Ghép đoạn và dùng tính tuyến tính",
      prompt: "Cho ∫₁³f(x)dx=2 và ∫₃⁵f(x)dx=−1. Tính ∫₁⁵[3f(x)+2]dx.",
      method: "Ghép hai đoạn để tìm ∫₁⁵f rồi dùng tính tuyến tính.",
      setup: "∫₁⁵f=2+(−1)=1; ∫₁⁵2dx=8",
      calculation: "3·1+8=11",
      answer: "I=11.",
      takeaway: "Hằng số 2 được tích phân trên độ dài đoạn 5−1.",
      sourcePages: [20]
    },
    {
      title: "Đảo chiều cận tích phân",
      prompt: "Cho ∫₀²f(x)dx=7 và ∫₀²g(x)dx=−3. Tính ∫₂⁰(2f−3g)dx.",
      method: "Tính trên chiều 0→2 rồi đổi dấu vì cận bị đảo.",
      setup: "∫₀²(2f−3g)=2·7−3·(−3)=23",
      calculation: "∫₂⁰(2f−3g)=−23",
      answer: "I=−23.",
      takeaway: "Đổi thứ tự hai cận làm tích phân đổi dấu.",
      sourcePages: [20]
    }
  ]),
  "13.3": pair("13.3", [
    {
      title: "Đổi biến và đổi cận với e^(x²)",
      prompt: "Tính I=∫₀¹2x e^(x²)dx.",
      method: "Đặt u=x² và đổi cận x=0→u=0, x=1→u=1.",
      setup: "u=x², du=2x dx",
      calculation: "∫₀¹eᵘdu=[eᵘ]₀¹=e−1",
      answer: "I=e−1.",
      takeaway: "Đã đổi cận sang u thì không cần đổi lại x.",
      sourcePages: [22]
    },
    {
      title: "Đổi biến lượng giác có cận",
      prompt: "Tính J=∫₀^(π/2)sinx cosx dx.",
      method: "Đặt u=sinx, du=cosx dx và đổi cận từ 0 đến 1.",
      setup: "u=sinx; x=0→u=0, x=π/2→u=1",
      calculation: "∫₀¹u du=1/2",
      answer: "J=1/2.",
      takeaway: "Không trộn cận theo x với biểu thức theo u.",
      sourcePages: [23]
    }
  ]),
  "13.4": pair("13.4", [
    {
      title: "Từng phần với x·eˣ có cận",
      prompt: "Tính I=∫₀¹x eˣdx.",
      method: "Chọn u=x, dv=eˣdx rồi tính cả biểu thức biên.",
      setup: "I=[xeˣ]₀¹−∫₀¹eˣdx",
      calculation: "e−(e−1)=1",
      answer: "I=1.",
      takeaway: "Biểu thức biên phải được tính ở cả hai cận.",
      sourcePages: [24]
    },
    {
      title: "Từng phần với ln x có cận",
      prompt: "Tính J=∫₁ᵉlnx dx.",
      method: "Chọn u=lnx, dv=dx nên v=x.",
      setup: "J=[xlnx]₁ᵉ−∫₁ᵉ1dx",
      calculation: "e−(e−1)=1",
      answer: "J=1.",
      takeaway: "Từng phần giúp xử lý logarit đứng riêng.",
      sourcePages: [24]
    }
  ]),
  "13.5": pair("13.5", [
    {
      title: "Tích phân của |x|",
      prompt: "Tính I=∫₋₁²|x|dx.",
      method: "Chia đoạn tại nghiệm x=0 và bỏ dấu giá trị tuyệt đối theo dấu của x.",
      setup: "I=∫₋₁⁰(−x)dx+∫₀²x dx",
      calculation: "1/2+2=5/2",
      answer: "I=5/2.",
      takeaway: "Mỗi tích phân thành phần phải không âm.",
      sourcePages: [25]
    },
    {
      title: "Tận dụng tính chẵn của |x²−1|",
      prompt: "Tính J=∫₋₂²|x²−1|dx.",
      method: "Hàm chẵn; trên nửa trục dương đổi dấu tại x=1.",
      setup: "J=2[∫₀¹(1−x²)dx+∫₁²(x²−1)dx]",
      calculation: "2(2/3+4/3)=4",
      answer: "J=4.",
      takeaway: "Kết hợp tính chẵn với chia đoạn giúp rút gọn phép tính.",
      sourcePages: [25]
    }
  ]),
  "13.6": pair("13.6", [
    {
      title: "Đọc diện tích đại số từ đồ thị",
      prompt: "Đồ thị gồm tam giác phía trên Ox trên [0,2] cao 3 và tam giác phía dưới Ox trên [2,5] cao 2. Tính ∫₀⁵f(x)dx và ∫₀⁵|f(x)|dx.",
      method: "Tính diện tích hai tam giác rồi cộng có dấu hoặc cộng trị tuyệt đối.",
      setup: "S₊=(1/2)·2·3=3; S₋=(1/2)·3·2=3",
      calculation: "∫f=3−3=0; ∫|f|=3+3=6",
      answer: "∫₀⁵f(x)dx=0 và ∫₀⁵|f(x)|dx=6.",
      takeaway: "Phần dưới Ox mang dấu âm trong tích phân f.",
      sourcePages: [27]
    },
    {
      title: "Tích phân đường thẳng bằng diện tích",
      prompt: "Với y=x−1 trên [0,3], tính ∫₀³(x−1)dx theo diện tích.",
      method: "Tách tam giác dưới Ox trên [0,1] và tam giác trên Ox trên [1,3].",
      setup: "S₋=1/2; S₊=2",
      calculation: "∫₀³(x−1)dx=2−1/2=3/2",
      answer: "I=3/2.",
      takeaway: "Tích phân là diện tích đại số, không phải luôn là diện tích hình học.",
      sourcePages: [27]
    }
  ]),
  "13.7": pair("13.7", [
    {
      title: "Tìm tham số trong tích phân",
      prompt: "Tìm m để ∫₀¹(2mx+1)dx=4.",
      method: "Coi m là hằng số theo x, tính tích phân rồi giải phương trình.",
      setup: "∫₀¹(2mx+1)dx=[mx²+x]₀¹=m+1",
      calculation: "m+1=4 ⇒ m=3",
      answer: "m=3.",
      takeaway: "Sau khi tính tích phân, bài toán trở thành phương trình theo tham số.",
      sourcePages: [29]
    },
    {
      title: "Cận trên chứa tham số",
      prompt: "Tìm a>0 để ∫₀ᵃ2x dx=9.",
      method: "Thay cận a vào nguyên hàm và giữ điều kiện a>0.",
      setup: "∫₀ᵃ2x dx=[x²]₀ᵃ=a²",
      calculation: "a²=9 ⇒ a=±3; a>0 ⇒ a=3",
      answer: "a=3.",
      takeaway: "Nghiệm tham số phải thỏa điều kiện ban đầu.",
      sourcePages: [29]
    }
  ]),
  "13.8": pair("13.8", [
    {
      title: "Tách phần chẵn và lẻ",
      prompt: "Tính I=∫₋₂²(x³+2x²+1)dx.",
      method: "Phần x³ là lẻ nên tích phân bằng 0; phần 2x²+1 là chẵn.",
      setup: "I=2∫₀²(2x²+1)dx",
      calculation: "2[2x³/3+x]₀²=44/3",
      answer: "I=44/3.",
      takeaway: "Trên đoạn đối xứng, phần lẻ triệt tiêu.",
      sourcePages: [31]
    },
    {
      title: "Đối xứng qua trung điểm đoạn",
      prompt: "Tính J=∫₀^π x sinx dx bằng phép đối xứng.",
      method: "Đặt u=π−x để tạo biểu thức thứ hai rồi cộng hai biểu thức của J.",
      setup: "J=∫₀^π(π−u)sinu du",
      calculation: "2J=π∫₀^πsinx dx=2π ⇒ J=π",
      answer: "J=π.",
      takeaway: "Ghép f(x) với f(a+b−x) có thể loại biến x khỏi tổng.",
      sourcePages: [32]
    }
  ]),
  "14.1": pair("14.1", [
    {
      title: "Diện tích khi đồ thị đổi dấu",
      prompt: "Tính diện tích giới hạn bởi y=2x−4, Ox, x=0 và x=3.",
      method: "Tìm nghiệm x=2, rồi chia đoạn theo dấu của 2x−4.",
      setup: "S=∫₀²(4−2x)dx+∫₂³(2x−4)dx",
      calculation: "4+1=5",
      answer: "S=5.",
      takeaway: "Diện tích luôn không âm nên phải đổi dấu phần đồ thị dưới Ox.",
      sourcePages: [34]
    },
    {
      title: "Diện tích với hàm chẵn",
      prompt: "Tính diện tích giữa y=x²−1, Ox, x=−2 và x=2.",
      method: "Hàm chẵn và đổi dấu tại x=±1; chỉ tính nửa phải rồi nhân đôi.",
      setup: "S=2[∫₀¹(1−x²)dx+∫₁²(x²−1)dx]",
      calculation: "S=4",
      answer: "S=4.",
      takeaway: "Tính đối xứng giúp giảm số khoảng cần tính.",
      sourcePages: [34]
    }
  ]),
  "14.2": pair("14.2", [
    {
      title: "Diện tích giữa parabol và đường thẳng",
      prompt: "Tính diện tích hình phẳng giới hạn bởi y=x² và y=2x.",
      method: "Giải x²=2x để tìm hai giao điểm và lấy hàm trên trừ hàm dưới.",
      setup: "x=0,2; trên (0,2), 2x>x²",
      calculation: "S=∫₀²(2x−x²)dx=4/3",
      answer: "S=4/3.",
      takeaway: "Thứ tự trên-trừ-dưới phải được xác định trên từng khoảng.",
      sourcePages: [36]
    },
    {
      title: "Diện tích giữa parabol và đường thẳng ngang",
      prompt: "Tính diện tích hình phẳng giới hạn bởi y=x² và y=4.",
      method: "Hai đồ thị cắt nhau tại x=−2 và x=2; y=4 nằm trên.",
      setup: "S=∫₋₂²(4−x²)dx",
      calculation: "2∫₀²(4−x²)dx=32/3",
      answer: "S=32/3.",
      takeaway: "Dùng tính chẵn để tính nhanh trên đoạn đối xứng.",
      sourcePages: [36]
    }
  ]),
  "14.3": pair("14.3", [
    {
      title: "Khối tròn xoay bán kính x",
      prompt: "Quay miền giới hạn bởi y=x, Ox, x=0, x=2 quanh Ox. Tính thể tích.",
      method: "Mặt cắt là hình tròn bán kính R=x.",
      setup: "V=π∫₀²x²dx",
      calculation: "π[x³/3]₀²=8π/3",
      answer: "V=8π/3.",
      takeaway: "Quay quanh Ox dùng bình phương khoảng cách đến Ox.",
      sourcePages: [37]
    },
    {
      title: "Khối vành khăn",
      prompt: "Quay miền giữa y=2 và y=x trên [0,2] quanh Ox. Tính thể tích.",
      method: "Bán kính ngoài R=2, bán kính trong r=x.",
      setup: "V=π∫₀²(4−x²)dx",
      calculation: "π[4x−x³/3]₀²=16π/3",
      answer: "V=16π/3.",
      takeaway: "Diện tích vành khăn là π(R²−r²).",
      sourcePages: [37]
    }
  ]),
  "14.4": pair("14.4", [
    {
      title: "Thể tích vật liệu của ống trụ",
      prompt: "Một ống trụ dài 5 cm, bán kính ngoài 4 cm và bán kính lỗ 2 cm. Tính thể tích vật liệu.",
      method: "Lấy thể tích trụ ngoài trừ thể tích phần lỗ.",
      setup: "V=π(4²−2²)·5",
      calculation: "V=60π cm³",
      answer: "Thể tích vật liệu là 60π cm³.",
      takeaway: "Không dùng π(R−r)² cho tiết diện vành khăn.",
      sourcePages: [38]
    },
    {
      title: "Vành khăn giữa √x và x",
      prompt: "Quay miền giữa y=√x và y=x trên [0,1] quanh Ox. Tính thể tích.",
      method: "Trên [0,1], √x≥x nên R=√x và r=x.",
      setup: "V=π∫₀¹(x−x²)dx",
      calculation: "π(1/2−1/3)=π/6",
      answer: "V=π/6.",
      takeaway: "Bình phương hai bán kính trước khi lấy hiệu.",
      sourcePages: [38]
    }
  ]),
  "14.5": pair("14.5", [
    {
      title: "Độ dời và quãng đường khi vận tốc đổi dấu",
      prompt: "Vật có v(t)=2t−4 m/s trên 0≤t≤5. Tính độ dời và quãng đường.",
      method: "Vận tốc đổi dấu tại t=2; độ dời tích phân có dấu, quãng đường tích phân trị tuyệt đối.",
      setup: "Δx=∫₀⁵(2t−4)dt; S=∫₀²(4−2t)dt+∫₂⁵(2t−4)dt",
      calculation: "Δx=5 m; S=4+9=13 m",
      answer: "Độ dời là 5 m và quãng đường là 13 m.",
      takeaway: "Vận tốc âm vẫn tạo quãng đường dương.",
      sourcePages: [40]
    },
    {
      title: "Chuyển động trở về vị trí ban đầu",
      prompt: "Với v(t)=3t²−6t trên [0,3], tính độ dời và quãng đường.",
      method: "Vận tốc âm trên (0,2) và dương trên (2,3).",
      setup: "Δx=[t³−3t²]₀³; S=∫₀²(6t−3t²)dt+∫₂³(3t²−6t)dt",
      calculation: "Δx=0; S=4+4=8",
      answer: "Độ dời bằng 0 và quãng đường bằng 8.",
      takeaway: "Độ dời bằng 0 không có nghĩa vật đứng yên.",
      sourcePages: [40]
    }
  ]),
  "14.6": pair("14.6", [
    {
      title: "Nhiệt độ tích lũy từ tốc độ thay đổi",
      prompt: "T′(t)=t/2−1 (°C/giờ), 0≤t≤6 và T(0)=20°C. Tìm T(6).",
      method: "Tính độ thay đổi nhiệt độ rồi cộng giá trị ban đầu.",
      setup: "T(6)−T(0)=∫₀⁶(t/2−1)dt",
      calculation: "[t²/4−t]₀⁶=3 ⇒ T(6)=23°C",
      answer: "T(6)=23°C.",
      takeaway: "Tích phân tốc độ thay đổi cho độ biến thiên, không tự cho giá trị cuối.",
      sourcePages: [42]
    },
    {
      title: "Khối lượng tăng theo hàm mũ",
      prompt: "M′(t)=100e^(−t) g/giờ. Tính lượng tăng từ t=0 đến t=ln2.",
      method: "Tích phân tốc độ tăng trên đúng khoảng thời gian.",
      setup: "ΔM=∫₀^(ln2)100e^(−t)dt",
      calculation: "[−100e^(−t)]₀^(ln2)=50 g",
      answer: "Khối lượng tăng 50 g.",
      takeaway: "Giữ đúng đơn vị tốc độ và thời gian.",
      sourcePages: [42]
    }
  ]),
  "14.7": pair("14.7", [
    {
      title: "Điện năng từ công suất biến thiên",
      prompt: "Máy có P(t)=2+t kW, t tính bằng giờ, 0≤t≤3. Tính điện năng dùng.",
      method: "Tích phân công suất theo thời gian tính bằng giờ.",
      setup: "E=∫₀³(2+t)dt",
      calculation: "[2t+t²/2]₀³=10,5 kWh",
      answer: "E=10,5 kWh.",
      takeaway: "kW nhân giờ cho kết quả kWh.",
      sourcePages: [43]
    },
    {
      title: "Thiết bị hoạt động hai chế độ",
      prompt: "Thiết bị chạy 2 giờ ở 1 kW rồi 1 giờ ở 3 kW. Tính điện năng.",
      method: "Tính năng lượng ở từng giai đoạn rồi cộng.",
      setup: "E=1·2+3·1",
      calculation: "E=5 kWh=18·10⁶ J",
      answer: "E=5 kWh, tương đương 18·10⁶ J.",
      takeaway: "1 kWh=3,6·10⁶ J.",
      sourcePages: [43]
    }
  ]),
  "14.8": pair("14.8", [
    {
      title: "Lưu lượng tăng tuyến tính",
      prompt: "Nước vào bể với q(t)=4+2t m³/phút trong 0≤t≤5. Tính lượng nước bơm vào.",
      method: "Tích phân lưu lượng trên khoảng năm phút.",
      setup: "ΔV=∫₀⁵(4+2t)dt",
      calculation: "[4t+t²]₀⁵=45 m³",
      answer: "Lượng nước bơm vào là 45 m³.",
      takeaway: "Lưu lượng nhân thời gian cho thể tích.",
      sourcePages: [45]
    },
    {
      title: "Lưu lượng giảm tuyến tính",
      prompt: "Đường ống có q(t)=12−3t L/phút trong 0≤t≤4. Tính thể tích chảy qua.",
      method: "Tích phân lưu lượng không âm trên khoảng hoạt động.",
      setup: "V=∫₀⁴(12−3t)dt",
      calculation: "[12t−3t²/2]₀⁴=24 L",
      answer: "Thể tích chảy qua là 24 L.",
      takeaway: "Kiểm tra đơn vị trước khi kết luận.",
      sourcePages: [45]
    }
  ]),
  "14.9": pair("14.9", [
    {
      title: "Chuyển động qua ba giai đoạn",
      prompt: "Xe có v(t)=3t trên [0,2), v(t)=6 trên [2,5), v(t)=6−3(t−5) trên [5,7]. Tính quãng đường.",
      method: "Vận tốc không âm nên cộng tích phân của ba giai đoạn.",
      setup: "S=∫₀²3t dt+∫₂⁵6dt+∫₅⁷[6−3(t−5)]dt",
      calculation: "6+18+6=30 m",
      answer: "Quãng đường là 30 m.",
      takeaway: "Mỗi công thức chỉ áp dụng trên giai đoạn tương ứng.",
      sourcePages: [46]
    },
    {
      title: "Bơm nước qua ba chế độ",
      prompt: "Lưu lượng q(t)=4t trên [0,3], q(t)=12 trên [3,5], q(t)=12−6(t−5) trên [5,7]. Tính tổng thể tích.",
      method: "Tính lượng nước ở từng giai đoạn rồi cộng.",
      setup: "V=∫₀³4t dt+∫₃⁵12dt+∫₅⁷[12−6(t−5)]dt",
      calculation: "18+24+12=54 L",
      answer: "Tổng thể tích là 54 L.",
      takeaway: "Các khoảng thời gian phải liên tiếp và không chồng lấn.",
      sourcePages: [46]
    }
  ])
});

