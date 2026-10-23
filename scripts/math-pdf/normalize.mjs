import { createHash } from "node:crypto";
import katex from "katex";

const SECTION_PATTERNS = [
  { section: "practice", pattern: /^(?:\d+[.)]\s*)?(?:bài tập tự luyện|bài tập luyện tập|luyện tập|thực hành)\b/i },
  { section: "worked_examples", pattern: /^(?:\d+[.)]\s*)?(?:ví dụ(?: nhanh)?|bài toán mẫu|ví dụ có lời giải)\b/i },
  { section: "knowledge", pattern: /^(?:\d+[.)]\s*)?(?:kiến thức trọng tâm|lý thuyết|phương pháp giải|mẹo nhận dạng|sai lầm hay gặp|ghi nhớ)\b/i }
];

const BLOCK_TYPES = new Set(["Text", "TextInlineMath", "SectionHeader", "Heading", "Equation", "Table", "Picture", "Figure", "ListItem", "Code"]);

function stableId(value) {
  return createHash("sha1").update(value).digest("hex").slice(0, 12);
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function nodeText(node) {
  let html = node.html;
  if (typeof html === "string") {
    html = html.replace(/<math([^>]*)>([\s\S]*?)<\/math>/gi, (_match, attributes, formula) => /display\s*=\s*["']block/i.test(attributes) ? `\n$$\n${formula}\n$$\n` : `$${formula}$`);
  }
  const candidate = node.markdown ?? node.text ?? node.content ?? html ?? node.raw_text ?? "";
  return typeof candidate === "string" ? decodeHtml(candidate) : "";
}

function polygonBox(polygon) {
  if (!Array.isArray(polygon) || !polygon.length) return null;
  if (polygon.length === 4 && polygon.every(Number.isFinite)) {
    return { x1: polygon[0], y1: polygon[1], x2: polygon[2], y2: polygon[3] };
  }
  const points = polygon.filter((point) => Array.isArray(point) && point.length >= 2);
  if (!points.length) return null;
  const xs = points.map((point) => Number(point[0]));
  const ys = points.map((point) => Number(point[1]));
  return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
}

function pageNumber(node, inheritedPage, startPage) {
  if (Number.isInteger(node.page_id)) return node.page_id + 1;
  if ((node.block_type ?? node.type) === "Page") {
    const match = String(node.id ?? "").match(/\/page\/(\d+)/i);
    if (match) return Number(match[1]) + 1;
  }
  const raw = node.page ?? node.page_number;
  if (Number.isInteger(raw)) return raw;
  return inheritedPage;
}

function flattenMarker(node, context, output = []) {
  if (!node || typeof node !== "object") return output;
  const type = node.block_type ?? node.type ?? "Unknown";
  const page = pageNumber(node, context.page, context.startPage);
  const box = polygonBox(node.polygon ?? node.bbox);
  const nextContext = { ...context, page, pageBox: type === "Page" && box ? box : context.pageBox };
  const children = Array.isArray(node.children) ? node.children : [];
  const text = nodeText(node);
  const isSemanticLeaf = BLOCK_TYPES.has(type) && (text || ["Picture", "Figure"].includes(type));
  if (isSemanticLeaf) output.push({ node, type, page, box, pageBox: nextContext.pageBox, text });
  for (const child of children) flattenMarker(child, nextContext, output);
  return output;
}

function normalizeBox(box, pageBox) {
  if (!box || !pageBox) return null;
  const width = pageBox.x2 - pageBox.x1;
  const height = pageBox.y2 - pageBox.y1;
  if (!(width > 0 && height > 0)) return null;
  return {
    x: (box.x1 - pageBox.x1) / width,
    y: (box.y1 - pageBox.y1) / height,
    width: (box.x2 - box.x1) / width,
    height: (box.y2 - box.y1) / height
  };
}

function geometryRelation(blockBox, region) {
  if (!blockBox) return { include: true, boundary: true, reason: "missing-geometry" };
  const centerX = blockBox.x + blockBox.width / 2;
  const centerY = blockBox.y + blockBox.height / 2;
  const include = centerX >= region.x && centerX <= region.x + region.width && centerY >= region.y && centerY <= region.y + region.height;
  const intersects = blockBox.x < region.x + region.width && blockBox.x + blockBox.width > region.x && blockBox.y < region.y + region.height && blockBox.y + blockBox.height > region.y;
  const contained = blockBox.x >= region.x && blockBox.x + blockBox.width <= region.x + region.width && blockBox.y >= region.y && blockBox.y + blockBox.height <= region.y + region.height;
  return { include, boundary: intersects && !contained, reason: intersects && !contained ? "crosses-region-edge" : null };
}

function classifyHeading(text) {
  const compact = text.replace(/\s+/g, " ").trim();
  return SECTION_PATTERNS.find(({ pattern }) => pattern.test(compact))?.section ?? null;
}

export function extractLatex(text) {
  const matches = [];
  for (const pattern of [/\$\$([\s\S]+?)\$\$/g, /\$([^$\n]+?)\$/g, /\\\[([\s\S]+?)\\\]/g, /\\\((.+?)\\\)/g]) {
    for (const match of text.matchAll(pattern)) matches.push(match[1].trim());
  }
  return [...new Set(matches)];
}

function formulaFlags(latex, blockId, page) {
  const flags = [];
  for (const formula of latex) {
    const opens = (formula.match(/{/g) ?? []).length;
    const closes = (formula.match(/}/g) ?? []).length;
    if (opens !== closes || /(?:�|\?{2,}|\\text\{\?|\\\^[A-Za-z]|\\rm\b)/.test(formula)) {
      flags.push({ severity: "error", code: "uncertain-formula", blockId, page, message: `Công thức cần đối chiếu nguồn: ${formula}` });
    }
  }
  return flags;
}

function blockMarkdown(block) {
  const value = block.text.trim();
  if (block.type === "Equation" && value && !/^\s*(?:\$\$|\\\[)/.test(value)) return `$$\n${value}\n$$`;
  if (["SectionHeader", "Heading"].includes(block.type)) return `### ${value.replace(/^#+\s*/, "")}`;
  if (block.type === "ListItem" && value && !/^[-*+]\s/.test(value)) return `- ${value}`;
  if (["Picture", "Figure"].includes(block.type) && !value) return `_[Hình ảnh nguồn tại trang ${block.page}]_`;
  return value;
}

function markerBlocks(raw, mapping) {
  const flattened = flattenMarker(raw, { page: mapping.startPage, pageBox: null, startPage: mapping.startPage });
  const blocks = [];
  const flags = [];
  const assets = [];
  for (const candidate of flattened) {
    const region = mapping.regions.find((item) => item.page === candidate.page);
    if (!region) continue;
    const normalized = normalizeBox(candidate.box, candidate.pageBox);
    const relation = geometryRelation(normalized, region);
    if (!relation.include) continue;
    let markdown = blockMarkdown(candidate);
    const embeddedImages = candidate.node.images && typeof candidate.node.images === "object" ? Object.entries(candidate.node.images) : [];
    for (const [imageKey, data] of embeddedImages) {
      if (typeof data !== "string" || !data) continue;
      const assetId = `${mapping.subtopicId}-asset-${stableId(`${candidate.page}:${imageKey}`)}`;
      const fileName = `${assetId}.jpg`;
      assets.push({ id: assetId, fileName: `assets/${fileName}`, page: candidate.page, sourceBlockKey: imageKey, mimeType: "image/jpeg", data });
      markdown = `${markdown}${markdown ? "\n\n" : ""}![Hình nguồn trang ${candidate.page}](assets/${fileName})`;
    }
    if (!markdown) continue;
    const providerId = candidate.node.id ?? candidate.node.block_id ?? null;
    const id = `${mapping.subtopicId}-b-${stableId(`${candidate.page}:${providerId ?? markdown}`)}`;
    const latex = extractLatex(markdown);
    const block = {
      id,
      providerBlockId: providerId,
      page: candidate.page,
      type: candidate.type,
      polygon: normalized,
      regionId: region.id,
      boundaryStatus: relation.boundary ? "needs-review" : "inside",
      section: "knowledge",
      sourceHeading: null,
      markdown,
      latex
    };
    if (/\$[^$]+\$\s*x\s*\$[^$]+\$/.test(markdown)) {
      flags.push({ severity: "error", code: "uncertain-formula", blockId: id, page: candidate.page, message: "Ký hiệu nhân OCR thành chữ x giữa các biểu thức; phải đối chiếu nguồn." });
    }
    if (relation.boundary) flags.push({ severity: "warning", code: "boundary-overlap", blockId: id, page: candidate.page, message: relation.reason });
    flags.push(...formulaFlags(latex, id, candidate.page));
    blocks.push(block);
  }
  return { blocks, flags, assets };
}

function mathpixBlocks(raw, markdown, mapping) {
  const lines = Array.isArray(raw) ? raw : raw.lines ?? raw.pages?.flatMap((page) => page.lines ?? []) ?? [];
  if (!lines.length && markdown) {
    return {
      blocks: [{ id: `${mapping.subtopicId}-b-${stableId(markdown)}`, providerBlockId: null, page: mapping.startPage, type: "Text", polygon: null, regionId: mapping.regions[0].id, boundaryStatus: "needs-review", section: "knowledge", sourceHeading: null, markdown: markdown.trim(), latex: extractLatex(markdown) }],
      flags: [{ severity: "warning", code: "boundary-geometry-missing", page: mapping.startPage, message: "Mathpix không trả line geometry; phải đối chiếu ranh giới thủ công." }],
      assets: []
    };
  }
  const blocks = [];
  const flags = [];
  for (const [index, line] of lines.entries()) {
    const page = Number(line.page ?? line.page_number ?? mapping.startPage);
    const region = mapping.regions.find((item) => item.page === page);
    if (!region) continue;
    const value = String(line.text ?? line.value ?? line.latex_styled ?? "").trim();
    if (!value) continue;
    const id = `${mapping.subtopicId}-b-${stableId(`${page}:${index}:${value}`)}`;
    const latex = extractLatex(value);
    blocks.push({ id, providerBlockId: line.id ?? index, page, type: line.type ?? "Line", polygon: line.region ?? null, regionId: region.id, boundaryStatus: "needs-review", section: "knowledge", sourceHeading: null, markdown: value, latex });
    flags.push(...formulaFlags(latex, id, page));
  }
  return { blocks, flags, assets: [] };
}

export function assignSections(blocks) {
  let section = "knowledge";
  const headings = [];
  for (const block of blocks) {
    const detected = classifyHeading(block.markdown.replace(/^#+\s*/, ""));
    if (detected) {
      section = detected;
      block.sourceHeading = block.markdown.replace(/^#+\s*/, "").trim();
      headings.push({ blockId: block.id, page: block.page, section, text: block.sourceHeading });
    }
    block.section = section;
  }
  return headings;
}

export function renderReviewMarkdown(record) {
  const lines = [
    "---",
    `schemaVersion: ${record.schemaVersion}`,
    `subtopic: ${record.subtopic.code}`,
    `title: ${record.subtopic.title}`,
    `sourceSha256: ${record.source.sha256}`,
    `provider: ${record.extraction.provider}`,
    `verification: ${record.verification.status}`,
    "---",
    "",
    `# ${record.subtopic.code} ${record.subtopic.title}`,
    "",
    `> Nguồn: ${record.source.fileName}, trang PDF ${record.source.pages.join(", ")}. Nội dung máy trích xuất; phải đối chiếu PDF trước khi xuất bản.`,
    ""
  ];
  let current = null;
  const labels = { knowledge: "Kiến thức", worked_examples: "Ví dụ có lời giải", practice: "Bài tập" };
  for (const block of record.blocks) {
    if (block.section !== current) {
      current = block.section;
      lines.push(`## ${labels[current]}`, "");
    }
    lines.push(`<!-- source-block:${block.id} page:${block.page} region:${block.regionId} -->`, block.markdown, "");
  }
  return `${lines.join("\n").trim()}\n`;
}

export function normalizeExtraction({ extraction, subtopic }) {
  const { mapping, document, topic, exercise } = subtopic;
  const normalized = extraction.provider === "marker"
    ? markerBlocks(extraction.raw, mapping)
    : mathpixBlocks(extraction.raw, extraction.markdown, mapping);
  const headings = assignSections(normalized.blocks);
  const flags = [...normalized.flags];
  if (!normalized.blocks.length) flags.push({ severity: "error", code: "missing-content", message: "Không có block nào nằm trong vùng subtopic." });
  if (!headings.length) flags.push({ severity: "warning", code: "section-heading-missing", message: "Không nhận ra heading nguồn để kiểm tra ranh giới phần." });
  const expectedPages = mapping.regions.map((region) => region.page);
  for (const page of expectedPages) {
    if (!normalized.blocks.some((block) => block.page === page)) flags.push({ severity: "error", code: "missing-page-content", page, message: `Không trích được nội dung thuộc vùng trang ${page}.` });
  }
  const sections = {
    knowledge: normalized.blocks.filter((block) => block.section === "knowledge").map((block) => block.id),
    workedExamples: normalized.blocks.filter((block) => block.section === "worked_examples").map((block) => block.id),
    practice: normalized.blocks.filter((block) => block.section === "practice").map((block) => block.id)
  };
  const record = {
    schemaVersion: "bienedu.math-pdf.v1",
    subtopic: { code: exercise.code, id: exercise.id, title: exercise.title, topicId: topic.id, topicTitle: topic.title },
    source: { documentId: document.documentId, fileName: document.sourceFileName, relativeDirectory: "39 chuyên đề", sha256: document.sourceSha256, pageCount: document.pageCount, pages: expectedPages, regions: mapping.regions },
    extraction: { provider: extraction.provider, startedAt: extraction.startedAt ?? null, finishedAt: extraction.finishedAt ?? null, providerJobId: extraction.pdfId ?? null, command: extraction.command ?? null },
    blocks: normalized.blocks,
    headings,
    sections,
    assets: normalized.assets ?? [],
    flags,
    verification: { status: "needs-source-review", reviewer: null, reviewedAt: null, sourceHash: document.sourceSha256, formulasChecked: false, boundariesChecked: false, notes: [] }
  };
  record.markdown = renderReviewMarkdown(record);
  return record;
}

export function validateRecord(record) {
  const issues = [];
  if (record.schemaVersion !== "bienedu.math-pdf.v1") issues.push({ severity: "error", code: "schema-version" });
  if (!record.blocks?.length) issues.push({ severity: "error", code: "empty-blocks" });
  const blockIds = new Set(record.blocks?.map((block) => block.id));
  if (blockIds.size !== record.blocks?.length) issues.push({ severity: "error", code: "duplicate-block-id" });
  for (const block of record.blocks ?? []) {
    if (!record.source.pages.includes(block.page)) issues.push({ severity: "error", code: "page-outside-source", blockId: block.id });
    if (!block.markdown?.trim()) issues.push({ severity: "error", code: "empty-block", blockId: block.id });
    for (const formula of block.latex ?? []) {
      try { katex.renderToString(formula, { throwOnError: true, strict: "error" }); }
      catch (error) { issues.push({ severity: "error", code: "unsupported-formula", blockId: block.id, formula, message: error.message }); }
    }
  }
  issues.push(...(record.flags ?? []).filter((flag) => flag.severity === "error"));
  return { valid: !issues.length, issues };
}
