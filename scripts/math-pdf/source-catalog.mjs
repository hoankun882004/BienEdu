import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { curriculumTopics } from "../../assets/js/data/curriculum.js";
import { documentMappings } from "../../assets/js/data/document-mappings.js";
import { knowledgePdfMappings } from "../../assets/js/data/knowledge-pdf-mappings.js";

export const projectRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
export const sourceDirectory = join(projectRoot, "39 chuyên đề");
export const workDirectory = join(projectRoot, ".content-work");
export const reviewDirectory = join(projectRoot, "content", "review");
export const approvedDirectory = join(projectRoot, "assets", "content", "approved");

export function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase();
}

export function sourcePdfs() {
  return readdirSync(sourceDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLocaleLowerCase("vi").endsWith(".pdf"))
    .map((entry) => {
      const path = join(sourceDirectory, entry.name);
      return { path, fileName: entry.name, sha256: sha256(path) };
    });
}

export function uniqueDocuments() {
  const byId = new Map();
  for (const mapping of documentMappings) {
    if (!byId.has(mapping.documentId)) byId.set(mapping.documentId, mapping);
  }
  const sources = sourcePdfs();
  return [...byId.values()].map((document) => {
    const source = sources.find((candidate) => candidate.sha256 === document.sourceSha256);
    return {
      ...document,
      sourcePath: source?.path ?? null,
      sourceFileName: source?.fileName ?? null,
      sourceHashMatches: Boolean(source)
    };
  });
}

export function getSubtopic(code) {
  const mapping = knowledgePdfMappings[code];
  if (!mapping) throw new Error(`Không có vùng PDF đã kiểm chứng cho ${code}.`);
  const topic = curriculumTopics.find((candidate) => candidate.id === mapping.topicId);
  const exercise = topic?.exerciseTypes.find((candidate) => candidate.code === code);
  const document = uniqueDocuments().find((candidate) => candidate.documentId === mapping.documentId);
  if (!topic || !exercise || !document) throw new Error(`Catalog không nhất quán tại ${code}.`);
  if (!document.sourcePath) throw new Error(`Không tìm thấy PDF nguồn trong "39 chuyên đề" cho ${document.documentId}.`);
  return { topic, exercise, mapping, document };
}

export function catalogSummary() {
  const documents = uniqueDocuments();
  return {
    curriculum: { topicCount: curriculumTopics.length, subtopicCount: curriculumTopics.reduce((sum, topic) => sum + topic.exerciseTypes.length, 0) },
    pdfSourceCount: sourcePdfs().length,
    mappedSubtopicCount: Object.keys(knowledgePdfMappings).length,
    documents: documents.map((document) => ({
      id: document.documentId,
      file: document.sourceFileName ?? basename(document.filePath),
      pageCount: document.pageCount,
      sha256: document.sourceSha256,
      sourceHashMatches: document.sourceHashMatches
    }))
  };
}

