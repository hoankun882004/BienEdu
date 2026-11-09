// Agent transcriptions of the original PDF, not human review decisions.
// Before-values are sealed separately against the recovered V5.5 baseline.
export const sourceHash = "2EBC6F3ABB4558E84237FC2C45DBBC20353B0A6C435E193D6B4A264A17433CA0";
export const definitions = [
  { code: "1.3", number: 2, prompt: String.raw`Tính đạo hàm của \(y=\sqrt{3-2x}\).`, answer: String.raw`\(D=(-\infty;\frac{3}{2}]\); \(y'=-\frac{1}{\sqrt{3-2x}}\) với \(x<\frac{3}{2}\).`, expression: String.raw`\sqrt{3-2x}`, derivative: String.raw`-\frac{1}{\sqrt{3-2x}}`, functionDomain: "x<=3/2", derivativeDomain: "x<3/2", reason: "Lost radicand and denominator grouping" },
  { code: "1.3", number: 3, prompt: String.raw`Tính đạo hàm của \(y=\sqrt{x^2+1}\) tại \(x=1\).`, answer: String.raw`\(y'=\frac{x}{\sqrt{x^2+1}}\) trên \(\mathbb{R}\); \(y'(1)=\frac{1}{\sqrt{2}}=\frac{\sqrt{2}}{2}\).`, expression: String.raw`\sqrt{x^2+1}`, derivative: String.raw`\frac{x}{\sqrt{x^2+1}}`, functionDomain: "real", derivativeDomain: "real", valueAt: 1, value: String.raw`\frac{\sqrt{2}}{2}`, reason: "Lost radical boundary inside derivative denominator" },
  { code: "1.3", number: 5, prompt: String.raw`Tính đạo hàm của \(y=\frac{1}{\sqrt{2x+3}}\).`, answer: String.raw`\(D=(-\frac{3}{2};+\infty)\). Viết \(y=(2x+3)^{-1/2}\), được \(y'=-(2x+3)^{-3/2}\).`, expression: String.raw`\frac{1}{\sqrt{2x+3}}`, derivative: String.raw`-(2x+3)^{-3/2}`, functionDomain: "x>-3/2", derivativeDomain: "x>-3/2", reason: "Lost denominator radical boundary; preserve negative fractional exponents" },
  { code: "1.5", number: 2, answer: String.raw`\(f'(x)=\frac{2}{2x+1}\) trên \(x>-\frac{1}{2}\).`, expression: String.raw`\ln(2x+1)`, derivative: String.raw`\frac{2}{2x+1}`, functionDomain: "x>-1/2", derivativeDomain: "x>-1/2", reason: "Fraction denominator became a detached subscript" },
  ...[
    [1, ["x(x-2)", "-x(x-2)", "(x-1)^2"], [String.raw`-\frac{3}{4}`, String.raw`\frac{3}{4}`, String.raw`\frac{1}{4}`], ["−³ ₄", "³ ₄", "¹ ₄"]],
    [2, ["x^2-2x-2", "-(x-3)(x+1)", "-x^2+2x+2"], [String.raw`-\frac{11}{4}`, String.raw`\frac{15}{4}`, String.raw`\frac{11}{4}`], ["−¹¹ ₄", "¹⁵ ₄", "¹¹ ₄"]],
    [3, ["x^3-3x+1", "x(x^2-3)", "-x(x^2-3)"], [String.raw`-\frac{3}{8}`, String.raw`-\frac{11}{8}`, String.raw`\frac{11}{8}`], ["−³ ₈", "−¹¹ ₈", "¹¹ ₈"]],
    [4, ["x^3", "-x^3", "(x+1)(x^2-x+1)"], [String.raw`\frac{1}{8}`, String.raw`-\frac{1}{8}`, String.raw`\frac{9}{8}`], ["¹ ₈", "−¹ ₈", "⁹ ₈"]],
    [5, ["-(x-1)^2(x+1)^2", "x^4-2x^2+2", "(x-1)^2(x+1)^2"], [String.raw`-\frac{9}{16}`, String.raw`\frac{25}{16}`, String.raw`\frac{9}{16}`], ["−⁹ ₁₆", "²⁵ ₁₆", "9 ₁₆"]],
    [6, ["-x^4+2x^2+2", "-x^4+2x^2+1", "x^4-2x^2-1"], [String.raw`\frac{39}{16}`, String.raw`\frac{23}{16}`, String.raw`-\frac{23}{16}`], ["³⁹ ₁₆", "²³ ₁₆", "−²³ ₁₆"]],
  ].map(([number, polynomials, values, fragments]) => ({ code:"6.1", number, polynomials, values, fragments, reason:"Stacked source fractions flattened into disconnected superscripts/subscripts" })),
];

export function correctedAnswer(definition, before) {
  if (definition.answer) return definition.answer;
  // Exact, record-scoped fragments, never a broad slash/subscript rewrite.
  let result = before;
  for (const [index, fragment] of definition.fragments.entries()) {
    const suffix = `${String.fromCharCode(65+index)}(1/2) = ${fragment}`;
    if (result.split(suffix).length !== 2) throw new Error("Non-unique source-bound numeric fraction");
    result = result.replace(suffix, `${String.fromCharCode(65+index)}(1/2) = \\(${definition.values[index]}\\)`);
  }
  return result;
}
