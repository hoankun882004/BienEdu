// Self-practice transcribed from the verified CD12-CD14 source PDF.
// These exercises are kept separate from generated auto-graded practice.
// The PDF supplies answer keys, but symbolic/free-response equivalence is not
// auto-graded by BienEdu. Learners may reveal the source answer for self-check.

function inferType(prompt) {
  return /^(Chứng minh|Kiểm tra|Có tồn tại)/u.test(prompt) ? "essay" : "short-answer";
}

function exerciseSet(code, sourcePages, rows) {
  return Object.freeze(rows.map(([prompt, answerKey, review], index) => Object.freeze({
    id: `${code}-source-exercise-${String(index + 1).padStart(2, "0")}`,
    sourceBlockId: `${code}-self-practice-${String(index + 1).padStart(2, "0")}`,
    number: index + 1,
    prompt,
    type: inferType(prompt),
    answerKey,
    answerKeyStatus: review ? "needs-review" : "verified",
    detailedSolutionStatus: "not-provided",
    automatedGrading: "unsupported",
    verification: review ? "source-conflict" : "verified",
    auditNote: review ?? null,
    sourcePages: Object.freeze(sourcePages)
  })));
}

export const calculusSourcePractice = Object.freeze({
  "12.1": exerciseSet("12.1", [4, 5], [
    ["Tính ∫(5x⁴−6x+1)dx.", "x⁵−3x²+x+C."],
    ["Tính ∫(1/√x+x²)dx với x>0.", "2√x+x³/3+C."],
    ["Tính ∫(3/x−2sinx)dx với x>0.", "3lnx+2cosx+C."],
    ["Tính ∫(4cosx+1/(1+x²))dx.", "4sinx+arctanx+C."],
    ["Kiểm tra F(x)=x⁴−3x²+7 có phải nguyên hàm của f(x)=4x³−6x không.", "Có, vì F′(x)=4x³−6x=f(x)."],
    ["Tính ∫(7x⁶−1/x+4)dx với x>0.", "x⁷−lnx+4x+C."],
    ["Tính ∫(1−3/x²+2cosx)dx với x≠0.", "x+3/x+2sinx+C."],
    ["Tính ∫(2/(1+x²)−5eˣ)dx.", "2arctanx−5eˣ+C."],
    ["Tính ∫(x^(−3)+sinx−1)dx.", "−1/(2x²)−cosx−x+C."],
    ["Tìm một nguyên hàm F của f(x)=2x−1/x trên (0,+∞) thỏa F(1)=3.", "F(x)=x²−lnx+2."]
  ]),
  "12.2": exerciseSet("12.2", [5, 6], [
    ["Tính ∫(x+2)(x−3)dx.", "x³/3−x²/2−6x+C."],
    ["Tính ∫(3x−1)²dx.", "3x³−3x²+x+C."],
    ["Tính ∫(x³−2x)dx.", "x⁴/4−x²+C."],
    ["Tính ∫x(x²−4)dx.", "x⁴/4−2x²+C."],
    ["Tính ∫(x−1)³dx bằng hai cách.", "(x−1)⁴/4+C; cũng có thể khai triển trước."],
    ["Tính ∫(2x+3)²dx.", "4x³/3+6x²+9x+C."],
    ["Tính ∫(x²−1)(x+4)dx.", "x⁴/4+4x³/3−x²/2−4x+C."],
    ["Tính ∫(x−2)(x²+x+1)dx.", "x⁴/4−x³/3−x²/2−2x+C."],
    ["Tính ∫(3x²−2x+1)dx.", "x³−x²+x+C."],
    ["Tính ∫(x+1)⁴dx.", "(x+1)⁵/5+C."]
  ]),
  "12.3": exerciseSet("12.3", [7, 8], [
    ["Tính ∫4x/(x²+1)dx.", "2ln(x²+1)+C."],
    ["Tính ∫1/(x²−1)dx với x≠±1.", "(1/2)ln|(x−1)/(x+1)|+C."],
    ["Tính ∫(x+1)/x dx với x≠0.", "x+ln|x|+C."],
    ["Tính ∫1/(x²+9)dx.", "(1/3)arctan(x/3)+C."],
    ["Tính ∫(2x+3)/(x²+3x+2)dx với x≠−1,−2.", "ln|x²+3x+2|+C."],
    ["Tính ∫(x−1)/(x+1)dx.", "x−2ln|x+1|+C."],
    ["Tính ∫1/[(x+1)(x+3)]dx.", "(1/2)ln|(x+1)/(x+3)|+C."],
    ["Tính ∫3x/(x²+4)dx.", "(3/2)ln(x²+4)+C."],
    ["Tính ∫1/(x²+4x+5)dx.", "arctan(x+2)+C."],
    ["Tính ∫(2x−5)/(x²−5x+6)dx.", "Nguồn ghi 2ln|x−2|+C.", "Tử số là đạo hàm của mẫu nên tính trực tiếp cho ln|x²−5x+6|+C; đáp số nguồn cần xác nhận."]
  ]),
  "12.4": exerciseSet("12.4", [8, 9], [
    ["Tính ∫cos5x dx.", "(1/5)sin5x+C."],
    ["Tính ∫(sinx+cosx)dx.", "−cosx+sinx+C."],
    ["Tính ∫cos²x dx.", "x/2+sin2x/4+C."],
    ["Tính ∫1/cos²(2x) dx.", "(1/2)tan2x+C trên mỗi khoảng xác định."],
    ["Tính ∫sinx cosx dx.", "(1/2)sin²x+C."],
    ["Tính ∫tanx dx.", "−ln|cosx|+C."],
    ["Tính ∫cot3x dx.", "(1/3)ln|sin3x|+C."],
    ["Tính ∫sin4x cos4x dx.", "(1/8)sin²4x+C, tương đương −(1/16)cos8x+C."],
    ["Tính ∫(1−sin2x)dx.", "x+(1/2)cos2x+C."],
    ["Tính ∫(1/cos²x−1/sin²x)dx.", "tanx+cotx+C."]
  ]),
  "12.5": exerciseSet("12.5", [10, 11], [
    ["Tính ∫e^(3x)dx.", "e^(3x)/3+C."],
    ["Tính ∫5^(2x)dx.", "5^(2x)/(2ln5)+C."],
    ["Tính ∫3/(2x+1)dx với x>−1/2.", "(3/2)ln(2x+1)+C."],
    ["Tính ∫lnx dx với x>0.", "xlnx−x+C."],
    ["Tính ∫(2x+1)/(x²+x+4)dx.", "ln(x²+x+4)+C."],
    ["Tính ∫5e^(−2x)dx.", "−(5/2)e^(−2x)+C."],
    ["Tính ∫3^(2x+1)dx.", "3^(2x+1)/(2ln3)+C."],
    ["Tính ∫(2x+1)/(x²+x+4)dx.", "ln(x²+x+4)+C."],
    ["Tính ∫lnx dx với x>0.", "xlnx−x+C."],
    ["Tính ∫1/[x(lnx)²]dx với x>0, x≠1.", "−1/lnx+C."]
  ]),
  "12.6": exerciseSet("12.6", [12, 13], [
    ["Tính ∫3x²e^(x³)dx.", "e^(x³)+C."],
    ["Tính ∫2x/(x²+5)dx.", "ln(x²+5)+C."],
    ["Tính ∫x sin(x²)dx.", "−(1/2)cos(x²)+C."],
    ["Tính ∫lnx/x dx với x>0.", "(1/2)(lnx)²+C."],
    ["Tính ∫(2x+1)⁴dx.", "(1/10)(2x+1)⁵+C."],
    ["Tính ∫2x cos(x²)dx.", "sin(x²)+C."],
    ["Tính ∫x/(x²+1)dx.", "(1/2)ln(x²+1)+C."],
    ["Tính ∫(3x²+6x)/(x³+3x²+5)dx.", "ln|x³+3x²+5|+C."],
    ["Tính ∫1/[1+(2x−1)²]dx.", "(1/2)arctan(2x−1)+C."],
    ["Tính ∫√(3x+1)dx.", "(2/9)(3x+1)^(3/2)+C."]
  ]),
  "12.7": exerciseSet("12.7", [14, 15], [
    ["Tính ∫x cosx dx.", "xsinx+cosx+C."],
    ["Tính ∫x e^(2x)dx.", "(1/2)xe^(2x)−(1/4)e^(2x)+C."],
    ["Tính ∫x sinx dx.", "−xcosx+sinx+C."],
    ["Tính ∫x²eˣdx.", "eˣ(x²−2x+2)+C."],
    ["Tính ∫arctanx dx.", "xarctanx−(1/2)ln(1+x²)+C."],
    ["Tính ∫x eˣdx.", "(x−1)eˣ+C."],
    ["Tính ∫x cosx dx.", "xsinx+cosx+C."],
    ["Tính ∫x lnx dx với x>0.", "(x²/2)lnx−x²/4+C."],
    ["Tính ∫arctanx dx.", "xarctanx−(1/2)ln(1+x²)+C."],
    ["Tính ∫x²eˣdx.", "eˣ(x²−2x+2)+C."]
  ]),
  "12.8": exerciseSet("12.8", [16, 17], [
    ["Cho f′(x)=4x³−2x. Viết họ các hàm số f.", "f(x)=x⁴−x²+C."],
    ["Cho f′(x)=2x+1. Tính f(3)−f(0).", "12."],
    ["Cho f′(x)=cosx và f lẻ trên R. Tìm f.", "f(x)=sinx."],
    ["Cho f′(x)=6x² và f là hàm chẵn. Có tồn tại f không?", "Không; đạo hàm của hàm chẵn khả vi trên R phải là hàm lẻ."],
    ["Cho f′(x)=eˣ. Chứng minh f(2)−f(1) không phụ thuộc C và tính hiệu.", "f(x)=eˣ+C nên f(2)−f(1)=e²−e."],
    ["Tìm y biết y′=6x−4 và y(0)=1.", "y=3x²−4x+1."],
    ["Tìm y biết y′=3x²+2/x với x>0 và y(1)=0.", "y=x³+2lnx−1."],
    ["Tìm y biết y′=2e^(2x) và y(0)=5.", "y=e^(2x)+4."],
    ["Tìm y biết y′=sinx+cosx và y(π)=1.", "y=−cosx+sinx+2."],
    ["Tìm y biết y′=1/(1+x²) và y(0)=2.", "y=arctanx+2."]
  ]),
  "12.9": exerciseSet("12.9", [17, 18], [
    ["Tìm F biết F′(x)=2x+1 và F(0)=4.", "F=x²+x+4."],
    ["Tìm F biết F′(x)=eˣ và F(0)=2.", "F=eˣ+1."],
    ["Tìm F biết F′(x)=cosx và F(π)=1.", "F=sinx+1."],
    ["Tìm F biết F′(x)=2/x với x>0 và F(1)=−3.", "F=2lnx−3."],
    ["Tìm F biết F′(x)=3x²−6x và F(2)=0.", "F=x³−3x²+4."],
    ["Tìm F(x) biết F′(x)=4x³−2x và F(1)=0.", "F(x)=x⁴−x²."],
    ["Tìm F(x) biết F′(x)=2/(1+x²) và F(0)=3.", "F(x)=2arctanx+3."],
    ["Tìm F(x) biết F′(x)=3cos3x và F(π/6)=2.", "F(x)=sin3x+1."],
    ["Tìm F(x) biết F′(x)=2ˣ và F(0)=1.", "F(x)=2ˣ/ln2+1−1/ln2."],
    ["Tìm F(x) biết F′(x)=x+1/x với x>0 và F(1)=4.", "F(x)=x²/2+lnx+7/2."]
  ]),
  "13.1": exerciseSet("13.1", [19, 20], [
    ["Tính ∫₀¹(2x+3)dx.", "4."],
    ["Tính ∫₁³1/x dx.", "ln3."],
    ["Tính ∫₀^(π/2)cosx dx.", "1."],
    ["Tính ∫₋₂²(x²+1)dx.", "28/3."],
    ["Tính ∫₂⁰(4x−1)dx.", "−6."],
    ["Tính ∫₀¹(3x²+2)dx.", "3."],
    ["Tính ∫₀^(π/2)cosx dx.", "1."],
    ["Tính ∫₁ᵉ1/x dx.", "1."],
    ["Tính ∫₀¹eˣdx.", "e−1."],
    ["Tính ∫₀²(x+1)²dx.", "26/3."]
  ]),
  "13.2": exerciseSet("13.2", [20, 21], [
    ["Biết ∫₀¹f=2 và ∫₁⁴f=5. Tính ∫₀⁴f.", "7."],
    ["Biết ∫₁⁴f=−2. Tính ∫₄¹5f.", "10."],
    ["Biết ∫₀²f=3 và ∫₀²g=1. Tính ∫₀²(4f−g).", "11."],
    ["Biết ∫₀³f=6 và ∫₀¹f=2. Tính ∫₁³f.", "4."],
    ["Biết 1≤f(x)≤3 trên [0,2]. Chặn giá trị I=∫₀²f(x)dx.", "2≤I≤6."],
    ["Cho ∫₀²f(x)dx=3 và ∫₀²g(x)dx=−1. Tính ∫₀²(2f−3g)dx.", "9."],
    ["Tính ∫₂⁰(x²+1)dx.", "−14/3."],
    ["Tính ∫₋₁¹(x³+2)dx.", "4."],
    ["Biết ∫₁⁴f(x)dx=5. Tính ∫₁⁴(f(x)+2)dx.", "11."],
    ["Tính ∫₀²x dx bằng cách chia đoạn thành [0,1] và [1,2].", "2."]
  ]),
  "13.3": exerciseSet("13.3", [22, 23], [
    ["Tính ∫₀¹3x²(1+x³)²dx.", "7/3."],
    ["Tính ∫₀²2x/(x²+1)dx.", "ln5."],
    ["Tính ∫₀^(π/2)sinx·e^(cosx)dx.", "e−1."],
    ["Tính ∫₀¹x e^(x²)dx.", "(e−1)/2."],
    ["Tính ∫₁ᵉlnx/x dx.", "1/2."],
    ["Tính ∫₀¹2x(x²+1)³dx.", "15/2."],
    ["Tính ∫₀^(π/4)1/cos²x dx.", "1."],
    ["Tính ∫₀¹x e^(x²)dx.", "(e−1)/2."],
    ["Tính ∫₀¹1/(1+4x²)dx.", "(1/2)arctan2."],
    ["Tính ∫₁²lnx/x dx.", "(ln2)²/2."]
  ]),
  "13.4": exerciseSet("13.4", [24, 25], [
    ["Tính ∫₀¹x e^(2x)dx.", "(e²+1)/4."],
    ["Tính ∫₀^(π/2)x sinx dx.", "1."],
    ["Tính ∫₁ᵉx lnx dx.", "(e²+1)/4."],
    ["Tính ∫₀¹x cosx dx.", "sin1+cos1−1."],
    ["Tính ∫₀¹x²eˣdx.", "e−2."],
    ["Tính ∫₀¹x eˣdx.", "1."],
    ["Tính ∫₀^(π/2)x sinx dx.", "1."],
    ["Tính ∫₁ᵉlnx dx.", "1."],
    ["Tính ∫₀¹x arctanx dx.", "π/4−(1/2)ln2."],
    ["Tính ∫₀¹x²eˣdx.", "e−2."]
  ]),
  "13.5": exerciseSet("13.5", [25, 26], [
    ["Tính ∫₋₂³|x|dx.", "13/2."],
    ["Tính ∫₀⁴|x−2|dx.", "4."],
    ["Tính ∫₋₁²|2x−1|dx.", "9/2."],
    ["Tính ∫₋₁¹|x³|dx.", "1/2."],
    ["Tính ∫₀²|x²−x|dx.", "1."],
    ["Tính ∫₋₂³|x−1|dx.", "Nguồn ghi 7.", "Tính trực tiếp cho 13/2, không khớp đáp số 7 trong PDF; cần tác giả xác nhận."],
    ["Tính ∫₋₁²|2x−1|dx.", "Nguồn ghi 5/2.", "Hai tam giác đều có diện tích 9/4 nên tổng là 9/2; đáp số nguồn 5/2 có dấu hiệu sai."],
    ["Tính ∫₀³|x²−4|dx.", "Nguồn ghi 9.", "Chia tại x=2 cho kết quả 23/3; đáp số nguồn 9 có dấu hiệu sai."],
    ["Tính ∫₋₂²|x|dx.", "4."],
    ["Tính ∫₀^(2π)|sinx|dx.", "4."]
  ]),
  "13.6": exerciseSet("13.6", [27, 28], [
    ["Đồ thị tạo hình chữ nhật phía trên Ox, rộng 4, cao 2. Tính tích phân trên đoạn đó.", "8."],
    ["Hai tam giác: phía trên có đáy 3, cao 2; phía dưới có đáy 2, cao 4. Tính tích phân trên toàn đoạn.", "−1."],
    ["Với dữ kiện bài 2, tính tích phân của |f|.", "7."],
    ["Đồ thị y=2−x trên [0,4]. Tính ∫₀⁴f(x)dx.", "0."],
    ["Với bài 4, tính ∫₀⁴|f(x)|dx.", "4."],
    ["Đồ thị y=f(x) là tam giác có các đỉnh (0,0), (2,2), (4,0). Tính ∫₀⁴f(x)dx.", "4."],
    ["Biết f(x)≤0 trên [0,3] và diện tích giữa đồ thị với Ox bằng 5. Tính ∫₀³f(x)dx.", "−5."],
    ["Đồ thị y=f(x) là nửa đường tròn phía trên Ox, tâm O, bán kính 2 trên [−2,2]. Tính ∫₋₂²f(x)dx.", "2π."],
    ["Tính ∫₀²|x−1|dx.", "1."],
    ["Từ diện tích tam giác giới hạn bởi y=x, y=0, x=3, suy ra ∫₀³x dx.", "9/2."]
  ]),
  "13.7": exerciseSet("13.7", [29, 30], [
    ["Tìm m để ∫₀¹(x+m)dx=2.", "m=3/2."],
    ["Tìm m để ∫₋₁¹(mx²+1)dx=4.", "m=3."],
    ["Tìm a≥0 để ∫₀ᵃ3x²dx=8.", "a=2."],
    ["Tìm m để ∫₀²(mx+2)dx=10.", "m=3."],
    ["Tìm m để ∫₀¹(x²+mx)dx=5/6.", "m=1."],
    ["Tính I(m)=∫₀¹(x+m)dx.", "I(m)=m+1/2."],
    ["Tính J(a)=∫₀^πa sinx dx.", "J(a)=2a."],
    ["Tính K(m)=∫₀¹(mx²+2x)dx.", "K(m)=m/3+1."],
    ["Tính P(t)=∫₁²1/(x+t)dx với t>−1.", "P(t)=ln[(t+2)/(t+1)]."],
    ["Tính Q(a)=∫₀ᵃx dx với a>0.", "Q(a)=a²/2."]
  ]),
  "13.8": exerciseSet("13.8", [31, 32], [
    ["Tính ∫₋₁¹(x⁵+3x²)dx.", "2."],
    ["Tính ∫₋₃³x cosx dx.", "0."],
    ["Tính ∫₋₂²(x⁴+x³)dx.", "64/5."],
    ["Tính ∫₋π^πsinx dx.", "0."],
    ["Cho f(x)+f(4−x)=6 trên [0,4]. Tính ∫₀⁴f(x)dx.", "12."],
    ["Tính ∫₋₂²x⁵dx.", "0."],
    ["Tính ∫₋₁¹(x⁴+3x)dx.", "2/5."],
    ["Tính ∫₋π^πsinx dx.", "0."],
    ["Tính ∫₋₁¹x/(1+x²)dx.", "0."],
    ["Tính ∫₀^πx sinx dx.", "π."]
  ]),
  "14.1": exerciseSet("14.1", [34, 35], [
    ["Tính diện tích giới hạn bởi y=x và Ox trên [0,3].", "9/2."],
    ["Tính diện tích giới hạn bởi y=x−2 và Ox trên [0,4].", "4."],
    ["Tính diện tích giới hạn bởi y=x² và Ox trên [−1,2].", "3."],
    ["Tính diện tích giới hạn bởi y=1−x² và Ox trên [−1,1].", "4/3."],
    ["Tính diện tích giới hạn bởi y=x²−4 và Ox trên [−2,2].", "32/3."],
    ["Tính diện tích giới hạn bởi y=x², y=0, x=0, x=2.", "8/3."],
    ["Tính diện tích giới hạn bởi y=4−x² và Ox.", "32/3."],
    ["Tính diện tích giới hạn bởi y=x³−3x và Ox trên [0,2].", "Nguồn ghi 11/4.", "Chia tại x=√3 cho kết quả 5/2; đáp số 11/4 trong PDF cần xác nhận."],
    ["Tính diện tích giới hạn bởi y=sinx và Ox trên [0,π].", "2."],
    ["Tính diện tích giới hạn bởi y=1−x và Ox trên [0,1].", "1/2."]
  ]),
  "14.2": exerciseSet("14.2", [35, 36, 37], [
    ["Tính diện tích giới hạn bởi y=x và y=x².", "1/6."],
    ["Tính diện tích giới hạn bởi y=2x và y=x².", "4/3."],
    ["Tính diện tích giới hạn bởi y=1 và y=x².", "4/3."],
    ["Tính diện tích giới hạn bởi y=x+2 và y=2 trên [−1,1].", "1."],
    ["Tính diện tích giới hạn bởi y=4−x² và y=0.", "32/3."],
    ["Tính diện tích giới hạn bởi y=x+1 và y=x² trên [0,1].", "7/6."],
    ["Tính diện tích giới hạn bởi y=2x và y=x² trên [0,2].", "4/3."],
    ["Tính diện tích giới hạn bởi y=sinx và y=cosx trên [0,π/2].", "2√2−2."],
    ["Tính diện tích giới hạn bởi y=x và y=x³ trên [0,1].", "1/4."],
    ["Tính diện tích giới hạn bởi y=4−x² và y=x².", "Nguồn trích xuất ghi 4√2−8/3.", "Tính trực tiếp trên [−√2,√2] cho 16√2/3; cần đối chiếu bản in vì đáp số nguồn có dấu hiệu sai hoặc bị trích xuất lỗi."]
  ]),
  "14.3": exerciseSet("14.3", [37, 38], [
    ["Quay miền 0≤y≤√x, 0≤x≤4 quanh Ox. Tính thể tích.", "8π."],
    ["Quay miền 0≤y≤x², 0≤x≤1 quanh Ox. Tính thể tích.", "π/5."],
    ["Quay hình chữ nhật 0≤y≤3, 0≤x≤5 quanh Ox. Tính thể tích.", "45π."],
    ["Quay miền giữa y=3 và y=1 trên [0,2] quanh Ox. Tính thể tích.", "16π."],
    ["Quay miền 0≤y≤x trên [0,2] quanh Oy bằng phương pháp vỏ trụ. Tính thể tích.", "16π/3."],
    ["Quay miền giới hạn bởi y=x, y=0, x=0, x=2 quanh Ox. Tính thể tích.", "8π/3."],
    ["Quay miền giới hạn bởi y=√x, y=0, x=0, x=4 quanh Ox. Tính thể tích.", "8π."],
    ["Quay miền giới hạn bởi y=1−x, y=0, x=0, x=1 quanh Ox. Tính thể tích.", "π/3."],
    ["Quay miền giới hạn bởi y=sinx, y=0, x=0, x=π quanh Ox. Tính thể tích.", "π²/2."],
    ["Quay miền giới hạn bởi y=2x, y=0, x=0, x=1 quanh Ox. Tính thể tích.", "4π/3."]
  ]),
  "14.4": exerciseSet("14.4", [38, 39, 40], [
    ["Ống trụ có R=5 cm, r=3 cm, dài 10 cm. Tính thể tích vật liệu.", "160π cm³."],
    ["Quay miền giữa y=3 và y=2 trên [0,4] quanh Ox. Tính thể tích.", "20π."],
    ["Quay miền giữa y=√x và y=x trên [0,1] quanh Ox. Tính thể tích.", "π/6."],
    ["Hình trụ bán kính 3 m, dài 2 m bị khoan lỗ trụ bán kính 1 m. Tính phần còn lại.", "16π m³."],
    ["Vành khăn có tiết diện 15π cm², bán kính trong 1 cm. Tìm bán kính ngoài.", "R=4 cm."],
    ["Quay miền giữa y=2 và y=x trên [0,2] quanh Ox. Tính thể tích phần rỗng.", "Nguồn ghi 8π/3.", "Cụm 'phần rỗng' chưa xác định rõ phần cần lấy; thể tích vành khăn của miền giữa hai đồ thị là 16π/3. Giữ trạng thái cần rà soát."],
    ["Quay miền giữa y=3 và y=x+1 trên [0,2] quanh Ox. Tính thể tích.", "Nguồn ghi 32π/3.", "Tính π∫₀²[9−(x+1)²]dx cho 28π/3; đáp số nguồn cần xác nhận."],
    ["Quay miền giữa y=√x+1 và y=1 trên [0,4] quanh Ox. Tính thể tích.", "56π/3."],
    ["Quay miền giữa y=2x và y=x trên [0,1] quanh Ox. Tính thể tích.", "π."],
    ["Quay miền giữa y=4 và y=4−x² trên [0,2] quanh Ox. Tính thể tích.", "Nguồn ghi 256π/15.", "Tính π∫₀²[16−(4−x²)²]dx cho 224π/15; đáp số nguồn cần xác nhận."]
  ]),
  "14.5": exerciseSet("14.5", [40, 41], [
    ["v(t)=3t trên 0≤t≤2. Tính độ dời.", "6."],
    ["v(t)=t−1 trên 0≤t≤3. Tính quãng đường.", "5/2."],
    ["v(t)=4−2t trên 0≤t≤4. Tính độ dời và quãng đường.", "Δx=0, S=8."],
    ["v(t)=−5 trên 0≤t≤3. Tính độ dời và quãng đường.", "Δx=−15, S=15."],
    ["v(t)=t²−1 trên 0≤t≤2. Tính quãng đường.", "2."],
    ["Vật có v(t)=t+1 m/s trên 0≤t≤3. Tính quãng đường.", "9/2."],
    ["Với v(t)=2t² trên [0,2], tính quãng đường.", "16/3."],
    ["Với v(t)=3cost trên [0,π/2], tính quãng đường.", "3."],
    ["Với v(t)=2−t trên [0,2], tính quãng đường.", "2."],
    ["Với v(t)=t−1 trên [0,3], tính tổng quãng đường.", "5/2."]
  ]),
  "14.6": exerciseSet("14.6", [42, 43], [
    ["F′(t)=2t, F(0)=5. Tìm F(3).", "14."],
    ["M′(t)=4 kg/phút, M(0)=10 kg. Tìm M(5).", "30 kg."],
    ["T′(t)=3−t, T(0)=15. Tìm T(4).", "19."],
    ["N′(t)=100+20t người/năm, N(0)=1000. Tìm N(5).", "1750 người."],
    ["F′(t)=−2t, F(1)=8. Tìm F(3).", "0."],
    ["Lưu lượng q(t)=2t+1 m³/h trong 0≤t≤3. Tính lượng nước vào bể.", "12 m³."],
    ["Tốc độ sản xuất p(t)=5e^(−t) trên [0,2]. Tính tổng sản lượng tạo thêm.", "5(1−e^(−2))."],
    ["Cường độ mưa r(t)=3t² trên [0,2]. Tính lượng mưa tích lũy.", "8 đơn vị."],
    ["Chi phí biên C′(x)=2x+1 trên [0,5]. Tính mức tăng chi phí.", "30."],
    ["Tốc độ tăng dân số n′(t)=4t+2 trên [0,2]. Tính lượng tăng dân số.", "12."]
  ]),
  "14.7": exerciseSet("14.7", [43, 44, 45], [
    ["Thiết bị P=500 W dùng trong 2 giờ. Tính điện năng theo kWh.", "1 kWh."],
    ["P(t)=3t kW, t∈[0,2] giờ. Tính năng lượng.", "6 kWh."],
    ["Thiết bị P=100 W hoạt động 30 giây. Tính năng lượng.", "3000 J."],
    ["P(t)=4−t kW, t∈[0,3] giờ. Tính năng lượng.", "7,5 kWh."],
    ["Máy dùng 2 kW trong 3 giờ và 0,5 kW trong 4 giờ. Tính tổng điện năng.", "8 kWh."],
    ["P(t)=100 W trong 0≤t≤3 giờ. Tính năng lượng tiêu thụ.", "300 Wh."],
    ["P(t)=50t W trên [0,2] giờ. Tính năng lượng tiêu thụ.", "100 Wh."],
    ["P(t)=200−20t W trên [0,5] giờ. Tính năng lượng tiêu thụ.", "750 Wh."],
    ["P(t)=100sin(πt/2) W trên [0,2] giờ. Tính năng lượng tiêu thụ.", "400/π Wh."],
    ["P(t)=120e^(−t) W trên [0,1] giờ. Tính năng lượng tiêu thụ.", "120(1−e^(−1)) Wh."]
  ]),
  "14.8": exerciseSet("14.8", [45, 46], [
    ["q(t)=5 L/phút trên 0≤t≤8 phút. Tính thể tích.", "40 L."],
    ["q(t)=2t m³/h trên 0≤t≤3 giờ. Tính thể tích.", "9 m³."],
    ["Bể có 20 m³ nước, lưu lượng vào 3 m³/h trong 4 giờ, không có dòng ra. Tìm thể tích cuối.", "32 m³."],
    ["q_vào(t)=10+t, q_ra(t)=4 L/phút trong [0,2]. Tính mức tăng thể tích.", "14 L."],
    ["q(t)=6−2t L/phút trên [0,3]. Tính lượng nước chảy qua.", "9 L."],
    ["q(t)=3 lít/phút trong 0≤t≤4. Tính thể tích thu được.", "12 lít."],
    ["q(t)=2t lít/phút trên [0,3]. Tính thể tích.", "9 lít."],
    ["q(t)=6−t lít/phút trên [0,4]. Tính thể tích.", "16 lít."],
    ["q(t)=4sint trên [0,π]. Tính thể tích.", "8 đơn vị thể tích."],
    ["q(t)=t²+1 trên [0,2]. Tính thể tích.", "14/3 đơn vị thể tích."]
  ]),
  "14.9": exerciseSet("14.9", [46, 47, 48], [
    ["Xe đi với v=2t m/s trong 0–3 s, rồi v=6 m/s trong 3–5 s. Tính quãng đường.", "21 m."],
    ["Máy chạy P=1 kW trong 2 giờ; P(t)=t kW trên [2,4]. Tính tổng điện năng.", "8 kWh."],
    ["Bơm có q=3 L/phút trong [0,2], sau đó q=2t trong [2,4]. Tính tổng thể tích.", "18 L."],
    ["Vận tốc v=4 trên [0,2] s và v=−3 trên [2,5] s. Tính độ dời và quãng đường.", "Δx=−1 m, S=17 m."],
    ["Bể có 10 m³ lúc t=0; lưu lượng ròng 2t trên [0,2] giờ và −1 trên [2,5]. Tìm thể tích cuối.", "11 m³."],
    ["Bể được bơm q(t)=2t trên [0,2], sau đó q=4 trên [2,5]. Tính tổng lượng nước.", "16."],
    ["Xe có v(t)=t trên [0,2] và v(t)=2 trên [2,4]. Tính quãng đường.", "6."],
    ["Thiết bị dùng 100 W trên [0,1] và 50 W trên [1,3]. Tính năng lượng.", "200 Wh."],
    ["Doanh thu biên R′(t)=3t trên [0,2] và R′(t)=6 trên [2,4]. Tính mức tăng doanh thu.", "18."],
    ["Lưu lượng ròng q(t)=5−t trên [0,3]. Tính lượng chất lỏng tăng thêm.", "21/2."]
  ])
});

export function getCalculusSourcePractice(code) {
  return calculusSourcePractice[code] ?? Object.freeze([]);
}
