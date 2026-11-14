// Versioned compatibility facade. The hash-bound legacy module remains the ONE
// KaTeX engine, preserving V5.5/V5.6 rollback. No DOM rescans or second dependency.
import * as legacy from './markdown-math-renderer.js';
import { mathNode, parseRichText, validateContent, normalizeMath } from './canonical-math.js';
export * from './markdown-math-renderer.js';
export { validateMath, MATH_POLICY } from './canonical-math.js';
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const markupCache = new Map();

export function mathContentMarkup(node, { scrollable = false } = {}) {
  const key = JSON.stringify([node,Boolean(scrollable)]);
  if (markupCache.has(key)) return markupCache.get(key);
  const validation = validateContent(node);
  if (!validation.valid) return '<span class="math-render-error" role="note">Nội dung toán cần được hiệu đính</span>';
  const html = emitNode(node, scrollable);
  if (markupCache.size >= 256) markupCache.delete(markupCache.keys().next().value);
  markupCache.set(key, html);
  return html;
}

function emitNode(node, scrollable = false) {
  if (node.type === 'text') return escape(node.value);
  if (node.type === 'unresolved') return `<span class="math-render-error" role="note" title="${escape(node.reason)}">Biểu thức cần được hiệu đính: <code>${escape(node.original)}</code></span>`;
  if (node.type === 'rich-text') return node.segments.map(child=>emitNode(child,scrollable)).join('');
  // Reuse the existing strict, trust:false, HTML+MathML configuration verbatim.
  const latex = normalizeMath(node.latex);
  const html = node.display ? legacy.renderMarkdownMath(`$$\n${latex}\n$$`) : legacy.renderMarkdownInline(`\\(${latex}\\)`);
  return `<span class="canonical-math${node.display ? ' canonical-math--display' : ''}" data-canonical-math="v1"${scrollable?' tabindex="0" role="region" data-math-scroll aria-label="Công thức, cuộn ngang khi cần"':''}>${html}</span>`;
}

export function renderMathContent(content, container) {
  const html = mathContentMarkup(content);
  if (container.innerHTML !== html) container.innerHTML = html;
  return container;
}
export const renderMath = (latex, element, options = {}) => renderMathContent(mathNode(latex, options.display, options), element);
export const renderRichText = (segments, container) => renderMathContent({ type: 'rich-text', segments }, container);

export function renderMathText(value, options = {}) {
  if (value && typeof value === 'object') return mathContentMarkup(value.content ?? value);
  const text = String(value ?? '');
  // Preserve curated legacy plain-text conversion; never use it as PDF evidence.
  if (!/\$|\\[([]|\\begin\{/u.test(text)) return legacy.renderMathText(value, options);
  return parseRichText(text).segments.map((node) => node.type === 'text' ? legacy.renderMarkdownInline(node.value) : mathContentMarkup(node)).join('');
}
