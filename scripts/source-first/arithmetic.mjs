// A deliberately small arithmetic grammar for regression checks, not a CAS.
// Unsupported notation fails closed and remains a human-review item.
export function evaluateArithmeticLatex(source, variables) {
  let cursor = 0;
  const skip = () => { while (/\s/u.test(source[cursor] ?? "")) cursor += 1; };
  const take = (token) => { skip(); if (!source.startsWith(token, cursor)) return false; cursor += token.length; return true; };
  const group = () => {
    if (!take("{")) throw new Error("Expected fraction group");
    const value = addition();
    if (!take("}")) throw new Error("Unclosed fraction group");
    return value;
  };
  const atom = () => {
    skip();
    let value;
    if (take("\\frac")) { const numerator = group(); const denominator = group(); if (!denominator) throw new Error("Zero denominator"); value = numerator / denominator; }
    else if (take("(")) { value = addition(); if (!take(")")) throw new Error("Unclosed arithmetic group"); }
    else if (take("-")) value = -atom();
    else if (/[0-9]/u.test(source[cursor] ?? "")) { let digits = ""; while (/[0-9]/u.test(source[cursor] ?? "")) digits += source[cursor++]; value = Number(digits); }
    else if (Object.hasOwn(variables, source[cursor])) value = variables[source[cursor++]];
    else throw new Error(`Unsupported arithmetic at ${cursor}`);
    while (take("!")) {
      if (!Number.isInteger(value) || value < 0 || value > 170) throw new Error("Unsupported factorial domain");
      let factorial = 1; for (let n = 2; n <= value; n += 1) factorial *= n;
      value = factorial;
    }
    return value;
  };
  const product = () => {
    let value = atom();
    while (true) {
      if (take("*") || take("\\cdot")) value *= atom();
      else if (take("/")) value /= atom();
      else { skip(); if (/[0-9nk(]/u.test(source[cursor] ?? "") || source.startsWith("\\frac", cursor)) value *= atom(); else break; }
    }
    return value;
  };
  const addition = () => {
    let value = product();
    while (true) { if (take("+")) value += product(); else if (take("-")) value -= product(); else break; }
    return value;
  };
  const value = addition(); skip();
  if (cursor !== source.length || !Number.isFinite(value)) throw new Error("Unsupported trailing arithmetic");
  return value;
}

export function countingConsistency(item) {
  if (item.id !== "tex-20.4" || !item.normalizedLatex) return null;
  const expression = item.normalizedLatex.split("=")[1]?.trim();
  const cases = [[0, 0], [3, 1], [5, 2], [6, 3], [5, 5]];
  const checks = [];
  try {
    for (const [n, k] of cases) {
      let expected = 1; for (let index = 0; index < k; index += 1) expected *= n - index;
      checks.push({ n, k, expected, actual: evaluateArithmeticLatex(expression, { n, k }) });
    }
    return { status: checks.every((check) => check.expected === check.actual) ? "sample-checked" : "failed", checks, issues: ["Five integer substitutions are regression evidence, not a mathematical proof or source approval"] };
  } catch (error) { return { status: "failed", checks, issues: [error.message] }; }
}
