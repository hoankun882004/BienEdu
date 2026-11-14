// Canonical Math Format v1. Formatting is not source verification.
// No Unicode/operator/fraction guessing: only explicit mathematical boundaries.
import { validateLatexExpression } from './markdown-math-renderer.js';

export const CANONICAL_VERSION = 'bienedu.canonical-math.v1';
export const MATH_POLICY = Object.freeze({ trust: false, output: 'htmlAndMathml', maxLength: 20000, maxExpansion: 100 });
const unsafe = /\\(?:href|url|includegraphics|html\w*|def|gdef|edef|xdef|let|newcommand|renewcommand|input|include|write|openout|catcode)\b/u;
const environments = new Set(['equation', 'equation*', 'align', 'align*', 'gather', 'gather*']);
const escaped = (text, index) => { let count = 0; while (index > 0 && text[--index] === '\\') count++; return count % 2 === 1; };

// A TeX comment consumes its newline. Keep escaped percent signs untouched.
function stripMathComments(text) {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '%' && !escaped(text, i)) {
      while (i < text.length && text[i] !== '\n') i++;
    } else result += text[i];
  }
  return result;
}

function group(text, start) {
  if (text[start] !== '{') throw new Error('Expected braced macro argument');
  let depth = 1;
  for (let i = start + 1; i < text.length; i++) {
    if (escaped(text, i)) continue;
    if (text[i] === '{') depth++;
    if (text[i] === '}' && --depth === 0) return { value: text.slice(start + 1, i), end: i + 1 };
  }
  throw new Error('Unbalanced braces');
}

export function expandMathMacros(latex, macros = {}) {
  let result = String(latex), expansions = 0;
  for (;;) {
    let changed = false, output = '';
    for (let i = 0; i < result.length;) {
      const token = !escaped(result, i) && result.slice(i).match(/^\\[A-Za-z]+/u)?.[0];
      const definition = token && Object.hasOwn(macros, token) ? macros[token] : null;
      if (!definition) { output += result[i++]; continue; }
      if (++expansions > MATH_POLICY.maxExpansion) throw new Error('Macro expansion limit');
      if (!Number.isInteger(definition.args) || definition.args < 0 || definition.args > 3 || typeof definition.body !== 'string' || unsafe.test(definition.body)) throw new Error('Unsupported macro definition');
      i += token.length;
      const args = [];
      for (let a = 0; a < definition.args; a++) {
        while (/\s/u.test(result[i] ?? '')) i++;
        const argument = group(result, i); args.push(argument.value); i = argument.end;
      }
      const body = definition.body.replace(/#([1-9])/gu, (_, n) => {
        if (!args[Number(n) - 1]) throw new Error('Missing macro argument');
        return args[Number(n) - 1];
      });
      // TeX control words must remain separated from following letters.
      output += body + (/\\[A-Za-z]+$/u.test(body) && /^[A-Za-z]/u.test(result.slice(i)) ? ' ' : '');
      changed = true;
    }
    if (output.length > MATH_POLICY.maxLength) throw new Error('Math length limit');
    result = output;
    if (!changed) return result;
  }
}

export function normalizeMath(latex, { macros = {} } = {}) {
  if (typeof latex !== 'string' || !latex.trim() || latex.length > MATH_POLICY.maxLength) throw new Error('Missing or oversized expression');
  let result = stripMathComments(latex.replace(/\r\n?/gu, '\n')).replaceAll('\n', ' ').trim();
  if (/(?<!\\)\$|\\[()[\]]/u.test(result)) throw new Error('Canonical math must not contain delimiters');
  if (unsafe.test(result)) throw new Error('Unsafe or document-level command');
  result = expandMathMacros(result, macros);
  // Validate required operands explicitly: KaTeX accepts some empty arguments.
  for (const match of result.matchAll(/\\(frac|dfrac|tfrac|sqrt)\b/gu)) {
    if (escaped(result, match.index)) continue;
    let cursor = match.index + match[0].length;
    while (/\s/u.test(result[cursor] ?? '')) cursor++;
    if (match[1] === 'sqrt' && result[cursor] === '[') {
      const end = result.indexOf(']', cursor + 1);
      if (end < 0 || !result.slice(cursor + 1, end).trim()) throw new Error('Invalid root index');
      cursor = end + 1;
    }
    for (let operand = 0; operand < (match[1] === 'sqrt' ? 1 : 2); operand++) {
      while (/\s/u.test(result[cursor] ?? '')) cursor++;
      const argument = group(result, cursor);
      if (!argument.value.trim()) throw new Error('Empty fraction or radical argument');
      cursor = argument.end;
    }
  }
  for (let i = 0; i < result.length; i++) {
    if (escaped(result, i)) continue;
    if (result[i] === '{') i = group(result, i).end - 1;
    else if (result[i] === '}') throw new Error('Unbalanced braces');
  }
  return result;
}

export function validateMath(latex, options = {}) {
  try {
    const normalized = normalizeMath(latex, options), validation = validateLatexExpression(normalized);
    return { ...validation, latex: normalized, sourceId: options.sourceId ?? null, sourceVerified: false };
  } catch (error) { return { valid: false, error: error.message, sourceId: options.sourceId ?? null, sourceVerified: false }; }
}

export function mathNode(latex, display = false, options = {}) {
  const check = validateMath(latex, options);
  return check.valid ? { type: 'math', latex: check.latex, display: Boolean(display) }
    : { type: 'unresolved', original: String(latex), reason: check.error };
}

export function parseRichText(value, options = {}) {
  const text = String(value ?? ''), segments = [];
  let start = 0, i = 0;
  const prose = (end) => { if (end > start) segments.push({ type: 'text', value: text.slice(start, end) }); };
  while (i < text.length) {
    if (escaped(text, i)) { i++; continue; }
    const env = text.slice(i).match(/^\\begin\{([^}]+)\}/u);
    const opening = ['\\(', '\\[', '$$', '$'].find((token) => text.startsWith(token, i));
    if (!opening && !(env && environments.has(env[1]))) {
      if (text.startsWith('\\)', i) || text.startsWith('\\]', i)) {
        prose(i); segments.push({ type: 'unresolved', original: text.slice(i, i + 2), reason: 'Unexpected closing delimiter' }); i += 2; start = i;
      } else i++;
      continue;
    }
    prose(i);
    const begin = env?.[0] ?? opening;
    const close = env ? `\\end{${env[1]}}` : { '\\(': '\\)', '\\[': '\\]', '$$': '$$', '$': '$' }[opening];
    let end = i + begin.length;
    while (end < text.length && !(text.startsWith(close, end) && !escaped(text, end))) {
      if (text[end] === '%' && !escaped(text,end)) {
        while (end < text.length && text[end] !== '\n') end++;
      } else end++;
    }
    if (end === text.length) { segments.push({ type: 'unresolved', original: text.slice(i), reason: 'Unclosed mathematical delimiter' }); start = text.length; break; }
    let body = text.slice(i + begin.length, end);
    if (env && /^align/u.test(env[1])) body = `\\begin{aligned}${body}\\end{aligned}`;
    if (env && /^gather/u.test(env[1])) body = `\\begin{gathered}${body}\\end{gathered}`;
    segments.push(mathNode(body, Boolean(env) || opening === '$$' || opening === '\\[', options));
    i = end + close.length; start = i;
  }
  prose(text.length);
  return { type: 'rich-text', segments };
}

export function validateContent(content) {
  const errors = [];
  const visit = (node) => {
    if (!node || typeof node !== 'object') { errors.push('Invalid node'); return; }
    if (node.type === 'text') { if (typeof node.value !== 'string') errors.push('Invalid text'); }
    else if (node.type === 'math') { const check = validateMath(node.latex); if (!check.valid) errors.push(check.error); if (typeof node.display !== 'boolean') errors.push('Missing display flag'); }
    else if (node.type === 'unresolved') { if (typeof node.original !== 'string' || !node.reason) errors.push('Invalid unresolved node'); }
    else if (node.type === 'rich-text' && Array.isArray(node.segments)) node.segments.forEach(visit);
    else errors.push('Unsupported node type');
  };
  visit(content); return { valid: !errors.length, errors };
}

export function canonicalRecord({ id, sourceId, sourceHash, location, content, ...metadata }) {
  if (!id || !sourceId || !/^[A-Fa-f0-9]{64}$/u.test(sourceHash ?? '') || !location) throw new Error('Missing source identity/hash/location');
  const check = validateContent(content); if (!check.valid) throw new Error(check.errors.join('; '));
  return { ...metadata, schemaVersion: CANONICAL_VERSION, id: `${sourceId}:${id}`, legacyId: id, sourceId, sourceHash, location, content };
}

export function serializeCanonical(value) {
  const sort = (item) => Array.isArray(item) ? item.map(sort) : item && typeof item === 'object'
    ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, sort(item[key])])) : item;
  return JSON.stringify(sort(value));
}
