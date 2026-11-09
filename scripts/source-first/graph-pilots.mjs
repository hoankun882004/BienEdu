// Transcribed from the named original statements/solutions, not curve pixels.
// These definitions augment existing figure IDs; they are not a review database.
const all = [{ min: '-inf', max: 'inf', minIncluded: false, maxIncluded: false }];
const interval = (min, max) => [{ min, max, minIncluded: true, maxIncluded: true }];
const point = (x, y, label) => ({ x, y, label, closed: true, provenance: 'symbolically-derived' });
const branch = (expression, latex, domain = all, exclusions = []) => ({ expression, latex, domain, exclusions });
export const pilotDefinitions = [
  { figureId: '6.1-example-1-figure-1', description: 'Đồ thị trong ví dụ nhận dạng hàm số 1, Dạng 6.1.',
    statementNeedle: 'A(x) = x (x −2)', solutionNeedle: 'Chọn A(x) = x (x −2)', solutionPage: 87,
    branches: [branch('x*(x-2)', 'y=x(x-2)')], derivative: '2*(x-1)', domainCheck: 'Reals', roots: ['0', '2'], stationary: ['1'],
    points: [point(1, -1, '(1;-1)')], samples: [[0, 0], [1, -1], [2, 0]],
    properties: 'Hai nghiệm 0 và 2; cực tiểu tại (1; −1).', viewport: { xMin: -3.3, xMax: 3.3, yMin: -6.6, yMax: 6.6 } },
  { figureId: '6.1-example-7-figure-1', description: 'Đồ thị hai nhánh trong ví dụ nhận dạng hàm số 7, Dạng 6.1.',
    statementNeedle: 'A(x) = 1 x', solutionNeedle: 'Chọn A(x) = 1 x', solutionPage: 87,
    branches: [branch('1/x', String.raw`y=\frac{1}{x}`, all, [0])], derivative: '-1/x^2', domainCheck: 'nonzero', roots: [], stationary: [],
    asymptotes: [{ type: 'vertical', value: 0, label: 'x=0' }, { type: 'horizontal', value: 0, label: 'y=0' }],
    samples: [[-1, -1], [1, 1], [.5, 2]], properties: 'Miền x ≠ 0; tiệm cận x = 0, y = 0; hai nhánh không nối qua 0.', viewport: { xMin: -3.3, xMax: 3.3, yMin: -6.6, yMax: 6.6 } },
  { figureId: '6.1-example-8-figure-1', description: 'Đồ thị hai nhánh trong ví dụ nhận dạng hàm số 8, Dạng 6.1.',
    statementNeedle: 'C(x) = x + 1 x', solutionNeedle: 'Chọn C(x) = x+ 1 x', solutionPage: 88,
    branches: [branch('x+1/x', String.raw`y=x+\frac{1}{x}`, all, [0])], derivative: '1-1/x^2', domainCheck: 'nonzero', roots: [], stationary: ['-1', '1'],
    points: [point(-1, -2, '(-1;-2)'), point(1, 2, '(1;2)')],
    asymptotes: [{ type: 'vertical', value: 0, label: 'x=0' }, { type: 'oblique', slope: 1, intercept: 0, label: 'y=x' }],
    samples: [[-1, -2], [1, 2], [.5, 2.5]], properties: 'Miền x ≠ 0; tiệm cận x = 0, y = x; cực trị tại (−1; −2) và (1; 2).', viewport: { xMin: -3.3, xMax: 3.3, yMin: -6.6, yMax: 6.6 } },
  { figureId: '6.1-example-9-figure-1', description: 'Đồ thị trong ví dụ nhận dạng hàm số 9, Dạng 6.1.',
    statementNeedle: 'B(x) = ex', solutionNeedle: 'Chọn B(x) = ex', solutionPage: 88,
    branches: [branch('exp(x)', 'y=e^x')], derivative: 'exp(x)', domainCheck: 'Reals', roots: [], stationary: [],
    points: [point(0, 1, '(0;1)')], asymptotes: [{ type: 'horizontal', value: 0, label: 'y=0', direction: '-inf' }],
    samples: [[0, 1]], properties: 'Miền ℝ; tăng trên ℝ; đi qua (0; 1); tiến về 0 khi x → −∞.', viewport: { xMin: -3.3, xMax: 3.3, yMin: -6.6, yMax: 6.6 } },
  { figureId: '4.4-example-7-figure-1', description: 'Đồ thị hàm căn trên đoạn [−2; 2], gồm cả hai đầu mút.',
    statementNeedle: '√ 4 −x2', solutionNeedle: null, solutionPage: 79,
    branches: [branch('sqrt(4-x^2)', String.raw`y=\sqrt{4-x^2}`, interval(-2, 2))], derivative: '-x/sqrt(4-x^2)', domainCheck: 'closed:-2:2', roots: ['-2', '2'], stationary: ['0'],
    points: [point(-2, 0, '(-2;0)'), point(0, 2, '(0;2)'), point(2, 0, '(2;0)')],
    samples: [[-2, 0], [0, 2], [2, 0]], properties: 'Miền [−2; 2]; hai đầu mút đóng; giá trị lớn nhất 2 tại x = 0.', viewport: { xMin: -2.7, xMax: 2.7, yMin: -.6, yMax: 2.7, equalUnits: true } },
  { figureId: '2.3-example-1-figure-1', type: 'variation-table', description: 'Bảng biến thiên: giảm đến giá trị −1 tại x = 1, sau đó tăng.',
    statementNeedle: 'x −∞ 1 ∞ f′ − 0 + f ∞ ↘ −1 ↗ ∞',
    columns: [{ kind: 'point', latex: '-\\infty' }, { kind: 'interval', latex: '' }, { kind: 'point', latex: '1' }, { kind: 'interval', latex: '' }, { kind: 'point', latex: '+\\infty' }],
    rows: [{ label: "f'", cells: ['', '-', '0', '+', ''] }, { label: 'f', cells: ['+\\infty', '\\searrow', '-1', '\\nearrow', '+\\infty'] }],
    properties: 'Giữ đúng bảng nguồn; không gán một công thức cụ thể cho bảng biến thiên.' }
];
