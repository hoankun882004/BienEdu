import { createHash } from "node:crypto";

import { mathTextToLatex, validateLatexExpression } from "../../assets/js/components/markdown-math-renderer.js";

export const EXCLUDED_TOPIC_IDS = Object.freeze(new Set(["CD20", "CD21"]));
export const PILOT_TOPIC_ID = "CD22";
export const SOURCE_DOCUMENT_ID = "cd20-cd23-native-latex";
export const SOURCE_RELATIVE_PATH = "file tài liệu latex/Ly_thuyet_To_hop_Xac_suat_Thong_ke_CD20_CD23.tex";

const SUPPORTED_ENVIRONMENTS = Object.freeze(new Set([
  "leadbox",
  "formulabox",
  "examplebox",
  "tipbox",
  "warningbox",
  "notebox",
  "keypoints"
]));

const NOTE_ENVIRONMENTS = Object.freeze({
  warningbox: Object.freeze({ label: "Sai lầm hay gặp", tone: "warning" }),
  tipbox: Object.freeze({ label: "Mẹo nhận dạng", tone: "tip" }),
  notebox: Object.freeze({ label: "Lưu ý", tone: "tip" })
});

function lineNumberAt(source, index) {
  return source.slice(0, Math.max(0, index)).split("\n").length;
}

function readBalancedGroup(source, openIndex) {
  if (source[openIndex] !== "{") throw new Error(`Expected a group at offset ${openIndex}`);
  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    const character = source[index];
    const escaped = index > 0 && source[index - 1] === "\\";
    if (!escaped && character === "{") depth += 1;
    if (!escaped && character === "}") {
      depth -= 1;
      if (depth === 0) {
        return Object.freeze({
          value: source.slice(openIndex + 1, index),
          start: openIndex,
          end: index + 1
        });
      }
    }
  }
  throw new Error(`Unclosed group at offset ${openIndex}`);
}

function commandCalls(source, commandName, offset = 0) {
  const marker = `\\${commandName}`;
  const calls = [];
  let cursor = 0;
  while (cursor < source.length) {
    const commandStart = source.indexOf(marker, cursor);
    if (commandStart < 0) break;
    let groupStart = commandStart + marker.length;
    while (/\s/u.test(source[groupStart] ?? "")) groupStart += 1;
    if (source[groupStart] !== "{") {
      cursor = commandStart + marker.length;
      continue;
    }
    const args = [];
    let commandEnd = groupStart;
    while (source[groupStart] === "{") {
      const group = readBalancedGroup(source, groupStart);
      args.push(group.value);
      commandEnd = group.end;
      groupStart = group.end;
      while (/\s/u.test(source[groupStart] ?? "")) groupStart += 1;
    }
    calls.push(Object.freeze({
      name: commandName,
      args: Object.freeze(args),
      start: offset + commandStart,
      end: offset + commandEnd,
      lineStart: lineNumberAt(source, commandStart),
      lineEnd: lineNumberAt(source, groupStart)
    }));
    cursor = groupStart;
  }
  return Object.freeze(calls);
}

function environmentBlocks(source, offset = 0) {
  const blocks = [];
  const beginPattern = /\\begin\{([A-Za-z*]+)\}/gu;
  for (const match of source.matchAll(beginPattern)) {
    const name = match[1];
    if (!SUPPORTED_ENVIRONMENTS.has(name)) continue;
    const contentStart = match.index + match[0].length;
    const endMarker = `\\end{${name}}`;
    const contentEnd = source.indexOf(endMarker, contentStart);
    if (contentEnd < 0) throw new Error(`Missing ${endMarker}`);
    const absoluteStart = offset + match.index;
    const absoluteEnd = offset + contentEnd + endMarker.length;
    blocks.push(Object.freeze({
      name,
      content: source.slice(contentStart, contentEnd).trim(),
      start: absoluteStart,
      end: absoluteEnd,
      lineStart: lineNumberAt(source, match.index),
      lineEnd: lineNumberAt(source, contentEnd + endMarker.length)
    }));
  }
  return Object.freeze(blocks.sort((left, right) => left.start - right.start));
}

function replaceTextCommands(value) {
  let output = String(value ?? "");
  for (const commandName of ["textbf", "emph", "textrm", "textsf", "ensuremath"]) {
    for (let pass = 0; pass < 8; pass += 1) {
      const calls = commandCalls(output, commandName);
      if (!calls.length) break;
      const call = calls.at(-1);
      const start = call.start;
      output = `${output.slice(0, start)}${call.args[0] ?? ""}${output.slice(call.end)}`;
    }
  }
  return output;
}

function unicodeSubscript(value) {
  const table = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉", i: "ᵢ", j: "ⱼ", k: "ₖ", n: "ₙ", x: "ₓ" };
  return [...value].map((character) => table[character] ?? character).join("");
}

function unicodeSuperscript(value) {
  const table = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", n: "ⁿ", x: "ˣ" };
  return [...value].map((character) => table[character] ?? character).join("");
}

export function latexTextToMarkdown(value, { inlineProbabilityMath = true } = {}) {
  let output = String(value ?? "").normalize("NFC");
  const replaceStructuredCommand = (commandName, transform) => {
    for (let pass = 0; pass < 16; pass += 1) {
      const calls = commandCalls(output, commandName);
      if (!calls.length) break;
      const call = calls.at(-1);
      output = `${output.slice(0, call.start)}${transform(call.args[0] ?? "")}${output.slice(call.end)}`;
    }
  };
  replaceStructuredCommand("textsubscript", unicodeSubscript);
  replaceStructuredCommand("textsuperscript", unicodeSuperscript);
  replaceStructuredCommand("textbf", (text) => `**${text}**`);
  replaceStructuredCommand("emph", (text) => `*${text}*`);
  output = output
    .replace(/\\%/gu, "%")
    .replace(/\\,/gu, " ")
    .replace(/\\(?:quad|qquad)\b/gu, " ")
    .replace(/\\\\/gu, "\n")
    .replace(/\s*\n\s*/gu, " ")
    .replace(/[ \t]+/gu, " ")
    .trim();
  return inlineProbabilityMath ? probabilityCallsToInlineMath(output) : output;
}

function latexTextToPlain(value) {
  return latexTextToMarkdown(value, { inlineProbabilityMath: false }).replace(/\*\*/gu, "").replace(/\*/gu, "").trim();
}

function mathMacroText(value) {
  let output = replaceTextCommands(value);
  const replaceStructuredCommand = (commandName, transform) => {
    for (let pass = 0; pass < 16; pass += 1) {
      const calls = commandCalls(output, commandName);
      if (!calls.length) break;
      const call = calls.at(-1);
      output = `${output.slice(0, call.start)}${transform(call.args[0] ?? "")}${output.slice(call.end)}`;
    }
  };
  replaceStructuredCommand("textsubscript", (text) => `_{${text}}`);
  replaceStructuredCommand("textsuperscript", (text) => `^{${text}}`);
  return output.replace(/\\%/gu, "%").replace(/[ \t]+/gu, " ").trim();
}

function protectVietnameseProbabilityLabels(value) {
  return value.replace(/P\(([^()]*)\)/gu, (_match, body) => {
    const normalized = body
      .split("|")
      .map((part) => {
        const trimmed = part.trim();
        const symbolicRemainder = trimmed
          .replace(/[_^]\{[A-Za-z0-9 +\-]+\}/gu, "")
          .replace(/\\(?:cap|cup|mid)\s*/gu, "")
          .replace(/\.\.\./gu, "")
          .replace(/[A-Zijkn0-9+_\-[\]{}\s∩∪ΩΣ₀-₉ᵢⱼₖₙₓ⁰-⁹ⁿˣ]/gu, "");
        if (!symbolicRemainder) return trimmed;
        return `\\text{${trimmed}}`;
      })
      .join(String.raw`\mid `);
    return `P(${normalized})`;
  });
}

function fractionOnEquationRight(value) {
  const equalsAt = value.indexOf("=");
  if (equalsAt < 0) return value;
  const left = value.slice(0, equalsAt + 1);
  const right = value.slice(equalsAt + 1).trim();
  let round = 0;
  let square = 0;
  let curly = 0;
  for (let index = 0; index < right.length; index += 1) {
    const character = right[index];
    if (character === "(") round += 1;
    else if (character === ")") round -= 1;
    else if (character === "[") square += 1;
    else if (character === "]") square -= 1;
    else if (character === "{") curly += 1;
    else if (character === "}") curly -= 1;
    else if (character === "/" && round === 0 && square === 0 && curly === 0) {
      const numerator = right.slice(0, index).trim();
      // A following equality belongs to the derivation, not the denominator.
      // Keep postfix factorials inside the denominator's balanced factor.
      let denominatorEnd = right.length;
      let denominatorDepth = 0;
      for (let cursor = index + 1; cursor < right.length; cursor += 1) {
        if ('([{'.includes(right[cursor])) denominatorDepth += 1;
        else if (")]}".includes(right[cursor])) denominatorDepth -= 1;
        else if (right[cursor] === "=" && denominatorDepth === 0) { denominatorEnd = cursor; break; }
      }
      const denominator = right.slice(index + 1, denominatorEnd).trim().replace(/^\[|\]$/gu, "");
      const continuation = right.slice(denominatorEnd);
      return `${left} \\frac{${numerator}}{${denominator}}${continuation ? ` ${continuation}` : ""}`;
    }
  }
  return value;
}

export function sourceFormulaToLatex(value) {
  // Only conditional-probability bars inside P(...) become \mid. Bars outside
  // the probability call may denote cardinality or absolute value.
  const source = protectVietnameseProbabilityLabels(mathMacroText(value));
  const converted = mathTextToLatex(fractionOnEquationRight(source))
    .replace(/_([A-Za-z0-9])/gu, "_{$1}")
    .replace(/\s+/gu, " ")
    .trim();
  return converted;
}

function probabilityCallsToInlineMath(value) {
  return String(value).replace(/(?<![\\\w])P\(([^()]*)\)/gu, (expression) => `\\(${sourceFormulaToLatex(expression)}\\)`);
}

function parseFormula(block, index) {
  const boldParts = commandCalls(block.content, "textbf").map((call) => call.args[0]).filter(Boolean);
  const values = boldParts.length ? boldParts : [block.content];
  const convertedValues = values.map(sourceFormulaToLatex);
  const symbolic = convertedValues.every((value) => validateLatexExpression(value).valid);
  const expressions = symbolic ? convertedValues : [];
  const detailSource = boldParts.reduce((text, bold) => text.replace(`\\textbf{${bold}}`, ""), block.content);
  const detail = latexTextToMarkdown(detailSource).replace(/^[,.;:\s]+|[,.;:\s]+$/gu, "");
  const result = {
    label: values.length > 1 ? `Nguyên tắc ${index + 1}` : "Công thức",
    value: symbolic ? expressions[0] : latexTextToPlain(values.join(" ")),
    detail,
    renderAsMath: symbolic
  };
  if (expressions.length > 1) result.expressions = expressions;
  return Object.freeze(result);
}

function parseKeypoints(block) {
  const itemPattern = /\\item\s+([\s\S]*?)(?=\\item|$)/gu;
  return Object.freeze([...block.content.matchAll(itemPattern)].map((match, index) => {
    const markdown = latexTextToMarkdown(match[1]);
    const labeled = markdown.match(/^\*\*([^*]+)\*\*\s*[:.]?\s*(.*)$/u);
    return Object.freeze({
      label: labeled?.[1]?.trim() || "",
      text: labeled?.[2]?.trim() || markdown
    });
  }));
}

function parseNote(block) {
  const presentation = NOTE_ENVIRONMENTS[block.name];
  return presentation ? Object.freeze({
    ...presentation,
    text: latexTextToMarkdown(block.content)
  }) : null;
}

function topicLead(blockSource, blocks) {
  const firstEnvironment = blocks[0];
  const raw = firstEnvironment ? blockSource.slice(0, firstEnvironment.start) : blockSource;
  return latexTextToMarkdown(raw.replace(/^\s*%.*$/gmu, ""));
}

function blockWithRelativeLines(block, topicStartLine) {
  return Object.freeze({
    ...block,
    lineStart: topicStartLine + block.lineStart - 1,
    lineEnd: topicStartLine + block.lineEnd - 1
  });
}

function parseTopic(source, call, end) {
  const blockStart = call.end;
  const blockSource = source.slice(blockStart, end);
  const topicStartLine = lineNumberAt(source, blockStart);
  const blocks = environmentBlocks(blockSource).map((block) => blockWithRelativeLines(block, topicStartLine));
  const formulaBlocks = blocks.filter((block) => block.name === "formulabox");
  const keypointBlock = blocks.find((block) => block.name === "keypoints");
  const noteBlock = blocks.find((block) => NOTE_ENVIRONMENTS[block.name]);
  const exampleBlocks = blocks.filter((block) => block.name === "examplebox");
  const sourceLineStart = lineNumberAt(source, call.start);
  const sourceLineEnd = Math.max(sourceLineStart, lineNumberAt(source, end) - 1);
  return Object.freeze({
    code: call.args[0],
    title: latexTextToPlain(call.args[1]),
    lead: topicLead(blockSource, environmentBlocks(blockSource)),
    formulae: Object.freeze(formulaBlocks.map(parseFormula)),
    points: keypointBlock ? parseKeypoints(keypointBlock) : Object.freeze([]),
    note: noteBlock ? parseNote(noteBlock) : null,
    examples: Object.freeze(exampleBlocks.map((block, index) => Object.freeze({
      id: `${call.args[0]}-native-example-${index + 1}`,
      originalExampleNumber: index + 1,
      prompt: latexTextToMarkdown(block.content),
      analysis: Object.freeze([]),
      steps: Object.freeze([]),
      answer: null,
      takeaway: null,
      sourcePages: Object.freeze([]),
      sourceLines: Object.freeze([block.lineStart, block.lineEnd]),
      sourceBlockId: `${call.args[0]}-tex-example-${index + 1}`,
      origin: "native-latex-source",
      verification: "source-verified",
      reviewStatus: "needs-math-review",
      verificationGates: Object.freeze({
        import: "completed",
        rendering: "validated",
        sourceFidelity: "verified",
        mathematicalReview: "needs-review",
        publication: "published"
      })
    }))),
    sourceLineStart,
    sourceLineEnd,
    rawSource: blockSource
  });
}

export function parseLatexDocument(sourceText) {
  const rawSource = String(sourceText ?? "");
  const source = rawSource.replace(/\r\n?/gu, "\n").normalize("NFC");
  const chapters = commandCalls(source, "chaptertitle").map((call) => Object.freeze({
    id: call.args[0],
    title: latexTextToPlain(call.args[1]),
    sourceLine: lineNumberAt(source, call.start),
    start: call.start
  }));
  const topicCalls = commandCalls(source, "topic");
  const topics = topicCalls.map((call, index) => {
    const nextTopic = topicCalls[index + 1]?.start ?? source.length;
    const nextChapter = chapters.find((chapter) => chapter.start > call.start)?.start ?? source.length;
    return parseTopic(source, call, Math.min(nextTopic, nextChapter));
  });
  const packages = [...source.matchAll(/\\usepackage(?:\[[^\]]*\])?\{([^}]+)\}/gu)]
    .flatMap((match) => match[1].split(",").map((name) => name.trim()));
  const customCommands = Object.freeze([
    ...commandCalls(source, "newcommand").map((call) => call.args[0]),
    ...commandCalls(source, "renewcommand").map((call) => call.args[0])
  ].filter(Boolean));
  return Object.freeze({
    sourceSha256: createHash("sha256").update(rawSource).digest("hex").toUpperCase(),
    lineCount: source.split("\n").length - (source.endsWith("\n") ? 1 : 0),
    documentClass: source.match(/\\documentclass(?:\[[^\]]*\])?\{([^}]+)\}/u)?.[1] ?? null,
    title: source.match(/pdftitle=\{([^}]+)\}/u)?.[1] ?? null,
    packages: Object.freeze(packages),
    customCommands,
    chapters: Object.freeze(chapters),
    topics: Object.freeze(topics)
  });
}

export function assertWritablePilotTopic(topicId, { existingKnowledge = false, existingExamples = false } = {}) {
  if (EXCLUDED_TOPIC_IDS.has(topicId)) throw new Error(`${topicId} is protected: existing knowledge must not be overwritten.`);
  if (topicId !== PILOT_TOPIC_ID) throw new Error(`Pilot import is restricted to ${PILOT_TOPIC_ID}; received ${topicId}.`);
  if (existingKnowledge || existingExamples) throw new Error(`${topicId} already has learning content; refusing a destructive import.`);
  return true;
}

export function validateConvertedTopic(topic) {
  const issues = [];
  const expressions = topic.formulae.flatMap((formula) => formula.renderAsMath
    ? (formula.expressions ?? [formula.value])
    : []);
  for (const expression of expressions) {
    const validation = validateLatexExpression(expression);
    if (!validation.valid) issues.push(Object.freeze({ expression, error: validation.error }));
  }
  return Object.freeze({
    expressionCount: expressions.length,
    validExpressionCount: expressions.length - issues.length,
    issues: Object.freeze(issues)
  });
}

export function buildPilotTopic(document, topicId = PILOT_TOPIC_ID) {
  const sourceTopic = document.topics.filter((topic) => topic.code.startsWith(`${topicId.slice(2)}.`));
  if (!sourceTopic.length) throw new Error(`No source sections found for ${topicId}.`);
  const knowledge = Object.freeze(Object.fromEntries(sourceTopic.map((topic) => [topic.code, Object.freeze({
    title: topic.title,
    lead: topic.lead,
    formulae: topic.formulae,
    points: topic.points,
    note: topic.note,
    layout: "principles-split",
    sourceDocumentId: SOURCE_DOCUMENT_ID,
    sourcePages: Object.freeze([]),
    sourceLines: Object.freeze([topic.sourceLineStart, topic.sourceLineEnd]),
    sourceSection: `\\topic{${topic.code}}{${topic.title}}`,
    reviewStatus: "source-verified",
    verificationGates: Object.freeze({
      import: "completed",
      rendering: "validated",
      sourceFidelity: "verified",
      mathematicalReview: "needs-review",
      publication: "published"
    }),
    conversionStatus: "native-latex-pilot",
    contentVersion: "latex-pilot-v5"
  })])));
  const examples = Object.freeze(Object.fromEntries(sourceTopic.map((topic) => [topic.code, topic.examples])));
  const validations = Object.freeze(Object.fromEntries(sourceTopic.map((topic) => [topic.code, validateConvertedTopic(topic)])));
  return Object.freeze({
    topicId,
    sourceDocumentId: SOURCE_DOCUMENT_ID,
    sourceSha256: document.sourceSha256,
    knowledge,
    examples,
    validations
  });
}

export function pilotToMarkdown(pilot) {
  const lines = [`# ${pilot.topicId} — Native LaTeX pilot`, ""];
  for (const [code, reading] of Object.entries(pilot.knowledge)) {
    lines.push(`## ${code} ${reading.title}`, "", reading.lead, "");
    if (reading.formulae.length) {
      lines.push("### Công thức và nguyên tắc", "");
      for (const formula of reading.formulae) {
        if (formula.renderAsMath) {
          for (const expression of formula.expressions ?? [formula.value]) lines.push("$$", expression, "$$", "");
        } else {
          lines.push(formula.value, "");
        }
        if (formula.detail) lines.push(formula.detail, "");
      }
    }
    if (reading.points.length) {
      lines.push("### Cách hiểu nhanh", "", ...reading.points.map((point) => point.label ? `- **${point.label}:** ${point.text}` : `- ${point.text}`), "");
    }
    if (reading.note) lines.push(`> **${reading.note.label}:** ${reading.note.text}`, "");
    for (const example of pilot.examples[code] ?? []) lines.push("### Ví dụ nguồn", "", example.prompt, "");
  }
  return `${lines.join("\n").trim()}\n`;
}
