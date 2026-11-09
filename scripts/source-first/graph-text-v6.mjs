// Complete statement/solution formatting groups from the already-reviewed
// graph source pages 51–52 / 87–88. No change to the immutable V5.6 registry.
export const graphTextCorrections=[
  {recordId:'6.1-source-example-7',page:51,solutionPage:87,
    prompt:String.raw`Chọn công thức ứng với đồ thị sau: \(A(x)=\frac{1}{x}\); \(B(x)=-\frac{1}{x}\); \(C(x)=\frac{x+1}{x}\). Giải thích bằng chiều biến thiên, giao trục hoặc cực trị.`,
    solution:String.raw`Chọn \(A(x)=\frac{1}{x}\). \(f'(x)=-\frac{1}{x^2}\). Đồng biến: không có; nghịch biến: \((-\infty;0)\), \((0;+\infty)\). Đạo hàm không đổi dấu tại các điểm dừng trong miền; hàm không có cực trị. Kiểm tra thêm tung độ tại \(x=\frac{1}{2}\): \(A(\frac{1}{2})=2\); \(B(\frac{1}{2})=-2\); \(C(\frac{1}{2})=3\).`},
  {recordId:'6.1-source-example-8',page:52,solutionPage:88,
    prompt:String.raw`Chọn công thức ứng với đồ thị sau: \(A(x)=-x-\frac{1}{x}\); \(B(x)=x+1+\frac{1}{x}\); \(C(x)=x+\frac{1}{x}\). Giải thích bằng chiều biến thiên, giao trục hoặc cực trị.`,
    solution:String.raw`Chọn \(C(x)=x+\frac{1}{x}\). \(f'(x)=1-\frac{1}{x^2}\). Đồng biến: \((-\infty;-1)\), \((1;+\infty)\); nghịch biến: \((-1;0)\), \((0;1)\). Cực đại tại \(x=-1\), giá trị \(-2\); cực tiểu tại \(x=1\), giá trị \(2\). Các điểm bị loại khỏi miền không phải điểm cực trị. Kiểm tra thêm tung độ tại \(x=\frac{1}{2}\): \(A(\frac{1}{2})=-\frac{5}{2}\); \(B(\frac{1}{2})=\frac{7}{2}\); \(C(\frac{1}{2})=\frac{5}{2}\).`},
  {recordId:'6.1-source-example-9',page:52,solutionPage:88,
    prompt:String.raw`Chọn công thức ứng với đồ thị sau: \(A(x)=e^x+1\); \(B(x)=e^x\); \(C(x)=-e^x\). Giải thích bằng chiều biến thiên, giao trục hoặc cực trị.`,
    solution:String.raw`Chọn \(B(x)=e^x\). \(f'(x)=e^x\). Đồng biến: \((-\infty;+\infty)\); nghịch biến: không có. Đạo hàm không đổi dấu tại các điểm dừng trong miền; hàm không có cực trị. Kiểm tra thêm tung độ tại \(x=\frac{1}{2}\): \(A(\frac{1}{2})=1+e^{1/2}\); \(B(\frac{1}{2})=e^{1/2}\); \(C(\frac{1}{2})=-e^{1/2}\).`}
];
