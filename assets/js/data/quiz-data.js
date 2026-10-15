export const quizQuestions = [
  {
    id: "q1",
    topic: "Ứng dụng đạo hàm",
    prompt: "Hàm số y = x³ − 3x đồng biến trên tập hợp nào?",
    options: [
      "(−∞; −1) và (1; +∞)",
      "(−1; 1)",
      "(−∞; 1)",
      "(−1; +∞)"
    ],
    correctIndex: 0,
    hint: "Hãy tính đạo hàm rồi xét dấu trên các khoảng được tạo bởi các nghiệm của đạo hàm.",
    explanation: "y′ = 3x² − 3 = 3(x − 1)(x + 1). Đạo hàm dương khi x < −1 hoặc x > 1."
  },
  {
    id: "q2",
    topic: "Ứng dụng đạo hàm",
    prompt: "Giá trị nhỏ nhất của f(x) = x² − 6x + 10 trên ℝ là bao nhiêu?",
    options: ["−1", "0", "1", "3"],
    correctIndex: 2,
    hint: "Thử hoàn thành bình phương để đưa biểu thức về dạng một bình phương cộng với hằng số.",
    explanation: "f(x) = (x − 3)² + 1 ≥ 1, dấu bằng xảy ra tại x = 3."
  },
  {
    id: "q3",
    topic: "Nguyên hàm và tích phân",
    prompt: "Giá trị của ∫₀¹ 2x dx bằng bao nhiêu?",
    options: ["0", "1/2", "1", "2"],
    correctIndex: 2,
    hint: "Tìm một nguyên hàm của 2x trước, rồi thay lần lượt hai cận 0 và 1.",
    explanation: "Một nguyên hàm của 2x là x². Do đó ∫₀¹ 2x dx = 1² − 0² = 1."
  },
  {
    id: "q4",
    topic: "Mũ và lôgarit",
    prompt: "Giá trị của log₂8 là bao nhiêu?",
    options: ["2", "3", "4", "8"],
    correctIndex: 1,
    hint: "Hãy tìm số mũ của 2 để được 8.",
    explanation: "Vì 2³ = 8 nên log₂8 = 3."
  },
  {
    id: "q5",
    topic: "Mũ và lôgarit",
    prompt: "Nghiệm của phương trình 2^(x − 1) = 32 là gì?",
    options: ["x = 4", "x = 5", "x = 6", "x = 7"],
    correctIndex: 2,
    hint: "Đưa 32 về cùng cơ số 2 rồi so sánh số mũ ở hai vế.",
    explanation: "32 = 2⁵ nên x − 1 = 5, suy ra x = 6."
  },
  {
    id: "q6",
    topic: "Vectơ và tọa độ Oxyz",
    prompt: "Cho a⃗ = (2; −1; 3) và b⃗ = (1; 4; −2). Tích vô hướng a⃗ × b⃗ bằng bao nhiêu?",
    options: ["−10", "−8", "0", "8"],
    correctIndex: 1,
    hint: "Nhân từng tọa độ tương ứng của hai vectơ, sau đó cộng ba kết quả lại.",
    explanation: "a⃗ × b⃗ = 2 × 1 + (−1) × 4 + 3 × (−2) = 2 − 4 − 6 = −8."
  },
  {
    id: "q7",
    topic: "Vectơ và tọa độ Oxyz",
    prompt: "Một vectơ pháp tuyến của mặt phẳng 2x − y + 3z − 1 = 0 là vectơ nào?",
    options: ["(2; −1; 3)", "(2; 1; −3)", "(1; 2; 3)", "(−1; 3; 2)"],
    correctIndex: 0,
    hint: "Với mặt phẳng dạng ax + by + cz + d = 0, hãy nhìn vào ba hệ số của x, y và z.",
    explanation: "Các hệ số của x, y, z lần lượt là 2, −1, 3 nên n⃗ = (2; −1; 3) là một vectơ pháp tuyến."
  },
  {
    id: "q8",
    topic: "Thống kê",
    prompt: "Phương sai của mẫu số liệu 1, 3, tính theo công thức chia cho n, bằng bao nhiêu?",
    options: ["0", "1", "2", "4"],
    correctIndex: 1,
    hint: "Tính số trung bình trước, rồi lấy trung bình của bình phương các độ lệch so với số đó.",
    explanation: "Số trung bình là 2. Phương sai bằng [(1 − 2)² + (3 − 2)²] / 2 = 1."
  },
  {
    id: "q9",
    topic: "Xác suất",
    prompt: "Gieo một xúc xắc cân đối. Xác suất xuất hiện số chẵn bằng bao nhiêu?",
    options: ["1/6", "1/3", "1/2", "2/3"],
    correctIndex: 2,
    hint: "Liệt kê các mặt chẵn của xúc xắc và so sánh số trường hợp thuận lợi với tổng số mặt.",
    explanation: "Có 3 kết quả chẵn là 2, 4, 6 trong 6 kết quả đồng khả năng. Xác suất là 3/6 = 1/2."
  },
  {
    id: "q10",
    topic: "Hình học không gian",
    prompt: "Khối chóp có diện tích đáy 12 cm² và chiều cao 5 cm. Thể tích bằng bao nhiêu?",
    options: ["12 cm³", "20 cm³", "30 cm³", "60 cm³"],
    correctIndex: 1,
    hint: "Nhớ công thức thể tích khối chóp bằng một phần ba diện tích đáy nhân chiều cao.",
    explanation: "V = (1/3)Sđáy × h = (1/3) × 12 × 5 = 20 cm³."
  }
];
