import * as katex from "../../vendor/katex/katex.mjs";

const SUBSCRIPT_CHARACTERS = Object.freeze({
  "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9", "₊": "+", "₋": "-",
  "ₐ": "a", "ₑ": "e", "ₕ": "h", "ᵢ": "i", "ⱼ": "j", "ₖ": "k", "ₗ": "l", "ₘ": "m", "ₙ": "n", "ₒ": "o", "ₚ": "p", "ᵣ": "r", "ₛ": "s", "ₜ": "t", "ₓ": "x"
});
const SUPERSCRIPT_CHARACTERS = Object.freeze({
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
  "⁺": "+", "⁻": "-", "⁽": "(", "⁾": ")", "ᵃ": "a", "ᵇ": "b", "ᶜ": "c", "ᵈ": "d", "ᵉ": "e", "ᶠ": "f", "ᵍ": "g", "ⁱ": "i", "ʲ": "j", "ⁿ": "n", "ᵏ": "k", "ᵐ": "m", "ʳ": "r", "ᵗ": "t", "ᵘ": "u", "ᵛ": "v", "ʷ": "w", "ˣ": "x", "ʸ": "y", "ᶻ": "z"
});
const SUBSCRIPT_PATTERN = new RegExp(`[${Object.keys(SUBSCRIPT_CHARACTERS).join("")}]+`, "g");
const SUPERSCRIPT_PATTERN = new RegExp(`[${Object.keys(SUPERSCRIPT_CHARACTERS).join("")}]+`, "g");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function convertUnicodeRun(run, table) {
  return [...run].map((character) => table[character] ?? character).join("");
}

const COMPACT_FUNCTION_PATTERN = /(?<!\\)(arctan|arcsin|arccos|sinh|cosh|tanh|sin|cos|tan|cot|sec|csc|ln|log)(?=[A-Za-z0-9(])/g;

function command(name) {
  // TeX control words consume every following ASCII letter. The trailing space
  // is therefore semantic here: `\\int P`, never the unsupported `\\intP`.
  return `\\${name} `;
}

function convertSquareRoots(value) {
  return value
    .replace(/√\(([^()]*)\)/g, (_match, body) => `\\sqrt{${body}}`)
    .replace(/√\[([^\[\]]*)\]/g, (_match, body) => `\\sqrt{${body}}`)
    .replace(/√([A-Za-z0-9]+)/g, (_match, body) => `\\sqrt{${body}}`)
    .replaceAll("√", command("sqrt"));
}

function convertSimpleFractions(value) {
  // Source files use compact textbook notation (x²/2, n!/[k!(n-k)!]).
  // Convert only balanced, unambiguous factors; leave genuinely complex
  // quotients untouched rather than guessing their mathematical grouping.
  const grouped = String.raw`(?:\([^()]+\)|\[[^\[\]]+\])`;
  const symbol = String.raw`[A-Za-z0-9]+(?:(?:_\{[^{}]+\}|\^\{[^{}]+\}|[!']))*(?:\([^()]*\))?`;
  const factor = `(?:${grouped}|${symbol})`;
  const fraction = new RegExp(`(${factor})\\s*\\/\\s*(${factor})`, "g");
  let converted = value;
  for (let pass = 0; pass < 3; pass += 1) {
    const next = converted.replace(fraction, (match, numerator, denominator, offset, source) => {
      const prefix = source.slice(0, offset);
      if (numerator.startsWith("(") && /\\(?:arctan|arcsin|arccos|sin|cos|tan|cot|sec|csc|ln|log)\s*$/.test(prefix)) return match;
      if (numerator.startsWith("(") && /[A-Za-z0-9'_^}]\s*$/.test(prefix)) return match;
      return `\\frac{${numerator}}{${denominator}}`;
    });
    if (next === converted) break;
    converted = next;
  }
  return converted;
}

export function mathTextToLatex(value) {
  const normalized = convertSquareRoots(String(value)
    .normalize("NFC")
    .replace(/∫([₀₁₂₃₄₅₆₇₈₉₊₋ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜₓ]*)([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁽⁾ᵃᵇᶜᵈᵉᶠᵍⁱʲⁿᵏᵐʳᵗᵘᵛʷˣʸᶻ]*)/g, (_match, lower, upper) => {
      const bounds = `${lower ? `_{${convertUnicodeRun(lower, SUBSCRIPT_CHARACTERS)}}` : ""}${upper ? `^{${convertUnicodeRun(upper, SUPERSCRIPT_CHARACTERS)}}` : ""}`;
      return bounds ? `\\int${bounds}` : command("int");
    })
    .replace(SUBSCRIPT_PATTERN, (run) => `_{${convertUnicodeRun(run, SUBSCRIPT_CHARACTERS)}}`)
    .replace(SUPERSCRIPT_PATTERN, (run) => `^{${convertUnicodeRun(run, SUPERSCRIPT_CHARACTERS)}}`)
    .replace(/\^\(([^()]*)\)/g, "^{$1}")
    .replace(/[∑Σ]/g, command("sum"))
    .replaceAll("π", command("pi"))
    .replaceAll("α", command("alpha"))
    .replaceAll("β", command("beta"))
    .replaceAll("Ω", command("Omega"))
    .replaceAll("Δ", command("Delta"))
    .replaceAll("∅", command("varnothing"))
    .replaceAll("∈", command("in"))
    .replaceAll("∪", command("cup"))
    .replaceAll("∩", command("cap"))
    .replaceAll("⇒", command("Rightarrow"))
    .replaceAll("⇔", command("Leftrightarrow"))
    .replaceAll("≤", command("le"))
    .replaceAll("≥", command("ge"))
    .replaceAll("≠", command("ne"))
    .replaceAll("≡", command("equiv"))
    .replaceAll("±", command("pm"))
    .replaceAll("∞", command("infty"))
    .replaceAll("×", command("times"))
    .replaceAll("·", command("cdot"))
    .replaceAll("⋯", command("cdots"))
    .replaceAll("…", command("ldots"))
    .replaceAll("♥", command("heartsuit"))
    .replaceAll("♦", command("diamondsuit"))
    .replaceAll("♣", command("clubsuit"))
    .replaceAll("♠", command("spadesuit"))
    .replaceAll("−", "-")
    .replaceAll("′", "'")
    .replace(COMPACT_FUNCTION_PATTERN, (_match, name) => command(name))
    .replace(/(?<!\\)\b(arctan|arcsin|arccos|sinh|cosh|tanh|sin|cos|tan|cot|sec|csc|ln|log)\b/g, (_match, name) => command(name))
    .replace(/\(mod\s+([^()]+)\)/g, "\\pmod{$1}")
    .replace(/(?<!\\mathrm\{)\b([CPA])\(([^()]*)\)/g, "\\mathrm{$1}($2)")
    .replace(/[ \t]+/g, " ")
    .trim());
  return convertSimpleFractions(normalized);
}

export function validateLatexExpression(formula) {
  const source = String(formula ?? "").trim();
  try {
    katex.renderToString(source, {
      displayMode: false,
      throwOnError: true,
      strict: "error",
      trust: false,
      output: "htmlAndMathml"
    });
    return Object.freeze({ valid: true, error: null });
  } catch (error) {
    return Object.freeze({ valid: false, error: error instanceof Error ? error.message : String(error) });
  }
}

function renderFormula(formula, displayMode) {
  const source = String(formula ?? "").trim();
  const validation = validateLatexExpression(source);
  if (!validation.valid) {
    return `<span class="math-render-error" role="note" data-math-error="${escapeHtml(validation.error)}">Biểu thức cần được hiệu đính</span>`;
  }
  return katex.renderToString(source, {
    displayMode,
    throwOnError: true,
    strict: "error",
    trust: false,
    output: "htmlAndMathml"
  });
}

function looksLikeStandaloneMath(value) {
  const text = String(value).trim();
  if (!text || /\p{M}/u.test(text.normalize("NFD")) || /[đĐ]/u.test(text)) return false;
  return /[=∫∑∪∩≡≤≥≠⇒⇔₀-₉⁰-⁹²³πΩΔ]|\b[CPA]\([^)]*\)/u.test(text);
}

export function renderMarkdownInline(value) {
  const tokens = [];
  const protectedText = String(value).replace(/\\\((.+?)\\\)|\$([^$\n]+?)\$/g, (_match, paren, dollar) => {
    const token = `MATH_TOKEN_${tokens.length}_END`;
    tokens.push(renderFormula(paren ?? dollar, false));
    return token;
  });
  let html = escapeHtml(protectedText)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
  tokens.forEach((token, index) => { html = html.replace(`MATH_TOKEN_${index}_END`, token); });
  return html;
}

export function renderMathText(value, { display = false } = {}) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/\$|\\\(/.test(text)) return renderMarkdownInline(text);
  if (!looksLikeStandaloneMath(text)) return renderMarkdownInline(text);
  return `<span class="math-expression${display ? " math-expression--display" : ""}">${renderFormula(mathTextToLatex(text), display)}</span>`;
}

function tableMarkup(lines) {
  const rows = lines.map((line) => line.replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()));
  const hasSeparator = rows[1]?.every((cell) => /^:?-{3,}:?$/.test(cell));
  const body = hasSeparator ? rows.slice(2) : rows.slice(1);
  return `<div class="math-markdown__table-wrap" tabindex="0"><table><thead><tr>${rows[0].map((cell) => `<th>${renderMarkdownInline(cell)}</th>`).join("")}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${renderMarkdownInline(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

export function renderMarkdownMath(markdown) {
  const lines = String(markdown ?? "").replace(/\r\n?/g, "\n").split("\n");
  const output = [];
  let index = 0;
  if (lines[0]?.trim() === "---") {
    index = 1;
    while (index < lines.length && lines[index].trim() !== "---") index += 1;
    index += 1;
  }
  while (index < lines.length) {
    const line = lines[index].trimEnd();
    if (!line.trim() || /^<!--.*-->$/.test(line.trim())) { index += 1; continue; }
    if (line.trim().startsWith("$$")) {
      const formula = [];
      const opening = line.trim().slice(2);
      if (opening.endsWith("$$") && opening.length > 2) {
        output.push(`<div class="math-markdown__display" tabindex="0">${renderFormula(opening.slice(0, -2), true)}</div>`);
        index += 1;
        continue;
      }
      if (opening) formula.push(opening);
      index += 1;
      while (index < lines.length && !lines[index].trim().endsWith("$$")) { formula.push(lines[index]); index += 1; }
      if (index < lines.length) formula.push(lines[index].trim().slice(0, -2));
      output.push(`<div class="math-markdown__display" tabindex="0">${renderFormula(formula.join("\n"), true)}</div>`);
      index += 1;
      continue;
    }
    const image = line.trim().match(/^!\[([^\]]*)\]\((assets\/[^\s)]+)\)$/);
    if (image) {
      output.push(`<figure class="math-markdown__figure"><img src="${escapeHtml(image[2])}" alt="${escapeHtml(image[1])}" loading="lazy"><figcaption>${renderMarkdownInline(image[1])}</figcaption></figure>`);
      index += 1;
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = Math.min(4, heading[1].length + 1);
      output.push(`<h${level}>${renderMarkdownInline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) { quote.push(lines[index].replace(/^>\s?/, "")); index += 1; }
      output.push(`<aside class="math-markdown__note">${quote.map((item) => `<p>${renderMarkdownInline(item)}</p>`).join("")}</aside>`);
      continue;
    }
    if (/^[-*+]\s+/.test(line.trim())) {
      const items = [];
      while (index < lines.length && /^[-*+]\s+/.test(lines[index].trim())) { items.push(lines[index].trim().replace(/^[-*+]\s+/, "")); index += 1; }
      output.push(`<ul>${items.map((item) => `<li>${renderMarkdownInline(item)}</li>`).join("")}</ul>`);
      continue;
    }
    if (/^\d+[.)]\s+/.test(line.trim())) {
      const items = [];
      while (index < lines.length && /^\d+[.)]\s+/.test(lines[index].trim())) { items.push(lines[index].trim().replace(/^\d+[.)]\s+/, "")); index += 1; }
      output.push(`<ol>${items.map((item) => `<li>${renderMarkdownInline(item)}</li>`).join("")}</ol>`);
      continue;
    }
    if (/^\|?.+\|.+\|?$/.test(line) && /^\|?\s*:?-{3,}/.test(lines[index + 1]?.trim() ?? "")) {
      const table = [line];
      index += 1;
      while (index < lines.length && lines[index].includes("|")) { table.push(lines[index]); index += 1; }
      output.push(tableMarkup(table));
      continue;
    }
    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim() && !/^(?:#{1,4}\s|>|[-*+]\s|\d+[.)]\s|\$\$|<!--)/.test(lines[index].trim())) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    output.push(`<p>${renderMarkdownInline(paragraph.join(" "))}</p>`);
  }
  return output.join("\n");
}

function approvedKnowledgeMarkdown(record) {
  return record.blocks
    .filter((block) => block.section === "knowledge")
    .map((block) => block.markdown)
    .join("\n\n");
}

function formulaExpressionMarkup(value) {
  return looksLikeStandaloneMath(value)
    ? `<div class="math-markdown__display math-markdown__display--compact" tabindex="0">${renderFormula(mathTextToLatex(value), true)}</div>`
    : `<strong>${renderMarkdownInline(value)}</strong>`;
}

function renderFormulaItem(item) {
  if (Array.isArray(item.aligned) && item.aligned.length) {
    const aligned = String.raw`\begin{aligned}${item.aligned.join(String.raw`\\`)}\end{aligned}`;
    return `<div class="math-lesson__formula-card math-lesson__formula-card--wide" data-expression-count="1" data-multiline="true">
      <dt>${renderMarkdownInline(item.label)}</dt>
      <dd><div class="math-lesson__expressions"><div class="math-lesson__equation math-lesson__equation--aligned"><div class="math-markdown__display math-markdown__display--compact" tabindex="0">${renderFormula(aligned, true)}</div></div></div><p>${renderMarkdownInline(item.detail)}</p></dd>
    </div>`;
  }
  const expressions = Array.isArray(item.expressions) && item.expressions.length
    ? item.expressions
    : [item.value];
  const expressionClass = expressions.length > 1 ? " math-lesson__expressions--group" : "";
  const cardClass = item.cardLayout === "wide" ? " math-lesson__formula-card--wide" : "";
  return `<div class="math-lesson__formula-card${cardClass}" data-expression-count="${expressions.length}">
    <dt>${renderMarkdownInline(item.label)}</dt>
    <dd><div class="math-lesson__expressions${expressionClass}">${expressions.map((value) => `<div class="math-lesson__equation">${formulaExpressionMarkup(value)}</div>`).join("")}</div><p>${renderMarkdownInline(item.detail)}</p></dd>
  </div>`;
}

function knowledgeLayout(reading) {
  const formulae = reading.formulae ?? [];
  const points = reading.points ?? [];
  const expressionCount = formulae.reduce((total, item) => total + (item.expressions?.length ?? 1), 0);
  if (reading.layout === "formula-grid" || formulae.length >= 4 || expressionCount >= 7) return "formula-heavy";
  if (reading.layout === "principles-split" || (formulae.length <= 2 && points.length <= 2)) return "compact";
  return "balanced";
}

function renderStructuredKnowledge(reading) {
  const formulae = reading.formulae ?? [];
  const points = reading.points ?? [];
  const formulaMarkup = formulae.length ? `<section class="math-lesson__formula-section" aria-labelledby="formula-title">
    <h3 id="formula-title">Công thức &amp; nguyên tắc</h3>
    <dl>${formulae.map(renderFormulaItem).join("")}</dl>
  </section>` : "";
  const quickMarkup = points.length ? `<aside class="math-lesson__quick" aria-labelledby="quick-title"><h3 id="quick-title">Cách hiểu nhanh</h3><ol>${points.map((item) => `<li><span>${renderMarkdownInline(item.label)}</span><p>${renderMarkdownInline(item.text)}</p></li>`).join("")}</ol></aside>` : "";
  const noteMarkup = reading.note ? `<aside class="math-lesson__callout math-lesson__callout--${reading.note.tone === "warning" ? "warning" : "tip"}"><span aria-hidden="true">${reading.note.tone === "warning" ? "!" : "✓"}</span><div><h3>${renderMarkdownInline(reading.note.label)}</h3><p>${renderMarkdownInline(reading.note.text)}</p></div></aside>` : "";
  return `<div class="math-lesson__intro">${renderMarkdownMath(reading.lead)}</div><div class="math-lesson__study-grid"><div class="math-lesson__primary">${formulaMarkup}${noteMarkup}</div>${quickMarkup}</div>`;
}

export function renderKnowledgeMarkdown({ slide, position, exercise }) {
  const record = slide.approvedMathContent ?? null;
  const reading = slide.reading ?? null;
  const verification = reading?.reviewStatus === "verified" || record?.verification?.status === "verified"
    ? "verified"
    : "needs-review";
  const verificationLabel = verification === "verified" ? "Đã kiểm duyệt" : "Chờ kiểm duyệt";
  const body = reading
    ? renderStructuredKnowledge(reading)
    : `<div class="math-markdown__body math-markdown__body--source">${renderMarkdownMath(approvedKnowledgeMarkdown(record))}</div>`;
  const layout = reading ? knowledgeLayout(reading) : "article";
  return `<article class="math-lesson math-lesson--${layout}" data-markdown-lesson data-knowledge-layout="${layout}" data-verification="${verification}" aria-labelledby="lesson-content-title">
    <header class="math-lesson__bar"><p><span aria-hidden="true">${String(position.current).padStart(2, "0")}</span><span>${escapeHtml(exercise.code)} · Kiến thức ${position.current}/${position.total}</span></p><small>${verificationLabel}</small></header>
    <div class="math-lesson__content"><header class="math-lesson__heading"><h2 id="lesson-content-title">Kiến thức trọng tâm</h2><p>${escapeHtml(exercise.title)}</p></header>${body}</div>
  </article>`;
}
