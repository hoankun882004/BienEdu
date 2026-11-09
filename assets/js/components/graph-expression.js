// Small, bounded arithmetic grammar. Imported content is never executable code.
const functions = Object.freeze({ sqrt: Math.sqrt, ln: Math.log, exp: Math.exp, sin: Math.sin, cos: Math.cos, tan: Math.tan, abs: Math.abs });
const constants = Object.freeze({ pi: Math.PI, e: Math.E });
export function parseExpression(source, parameters = {}) {
  if (typeof source !== 'string' || !source.length || source.length > 512) throw new Error('Invalid expression length');
  const names = Object.keys(parameters);
  if (names.length > 12 || names.some((key) => !/^[a-z][a-z0-9_]{0,15}$/u.test(key) || key === 'x' || key in functions || key in constants || !Number.isFinite(parameters[key]))) throw new Error('Invalid parameters');
  const tokens = source.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[a-z][a-z0-9_]*|[()+*/^−-]|\S/gu) ?? [];
  let index = 0, count = 0;
  function expression(min = 0, depth = 0) {
    if (depth > 32 || ++count > 128) throw new Error('Expression complexity exceeded');
    const token = tokens[index++]; let left;
    if (token === '-' || token === '−' || token === '+') left = { op: token === '+' ? 'positive' : 'negate', arg: expression(25, depth + 1) };
    else if (token === '(') { left = expression(0, depth + 1); if (tokens[index++] !== ')') throw new Error('Missing closing parenthesis'); }
    else if (/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/u.test(token ?? '') && Number.isFinite(Number(token))) left = { op: 'number', value: Number(token) };
    else if (token === 'x') left = { op: 'variable' };
    else if (Object.hasOwn(constants, token)) left = { op: 'number', value: constants[token] };
    else if (Object.hasOwn(parameters, token)) left = { op: 'number', value: parameters[token] };
    else if (Object.hasOwn(functions, token)) {
      if (tokens[index++] !== '(') throw new Error('Function arguments must be parenthesized');
      left = { op: token, arg: expression(0, depth + 1) };
      if (tokens[index++] !== ')') throw new Error('Missing function closing parenthesis');
    } else throw new Error(`Unsupported token: ${token}`);
    while (index < tokens.length) {
      const op = tokens[index], precedence = ({ '+': 10, '-': 10, '−': 10, '*': 20, '/': 20, '^': 30 })[op];
      if (precedence === undefined || precedence < min) break;
      index++; left = { op: op === '−' ? '-' : op, left, right: expression(precedence + (op === '^' ? 0 : 1), depth + 1) };
    }
    return left;
  }
  const ast = expression();
  if (index !== tokens.length) throw new Error(`Unexpected token: ${tokens[index]}`);
  return ast;
}
export function evaluateAST(node, x) {
  if (node.op === 'number') return node.value;
  if (node.op === 'variable') return x;
  if (node.arg) { const a = evaluateAST(node.arg, x); return node.op === 'negate' ? -a : node.op === 'positive' ? a : functions[node.op](a); }
  const a = evaluateAST(node.left, x), b = evaluateAST(node.right, x);
  if (node.op === '+') return a + b;
  if (node.op === '-') return a - b;
  if (node.op === '*') return a * b;
  if (node.op === '/') return b === 0 ? NaN : a / b;
  return a ** b;
}
export function compileExpression(source, parameters) {
  const ast = parseExpression(source, parameters);
  return (x) => { const y = evaluateAST(ast, x); return Number.isFinite(y) ? y : NaN; };
}
