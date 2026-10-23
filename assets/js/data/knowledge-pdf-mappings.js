import { getDocumentSource } from "./document-mappings.js?v=12.1";

// Coordinates are normalized against the unrotated PDF page, with the origin at
// the top-left. Every heading anchor below was checked against the source PDF's
// text layer and a rendered page image on 2026-10-22. The small outer crop keeps
// the original page furniture while removing unused paper margins.
const PAGE_CROP = Object.freeze({ x: 0.055, top: 0.055, width: 0.89, bottom: 0.965 });

const DOCUMENT_SECTIONS = Object.freeze({
  "cd12-cd14-calculus": Object.freeze({
    topicEnds: Object.freeze({ CD12: 18, CD13: 33, CD14: 48 }),
    anchors: Object.freeze([
      ["CD12", "12.1", 3, 0.1126],
      ["CD12", "12.2", 5, 0.3082],
      ["CD12", "12.3", 7, 0.0607],
      ["CD12", "12.4", 8, 0.7177],
      ["CD12", "12.5", 10, 0.5281],
      ["CD12", "12.6", 12, 0.3007],
      ["CD12", "12.7", 13, 0.8812],
      ["CD12", "12.8", 15, 0.5605],
      ["CD12", "12.9", 17, 0.1865],
      ["CD13", "13.1", 19, 0.1129],
      ["CD13", "13.2", 20, 0.8870],
      ["CD13", "13.3", 22, 0.4816],
      ["CD13", "13.4", 24, 0.2178],
      ["CD13", "13.5", 25, 0.7850],
      ["CD13", "13.6", 27, 0.6008],
      ["CD13", "13.7", 29, 0.6395],
      ["CD13", "13.8", 31, 0.3177],
      ["CD14", "14.1", 34, 0.1134],
      ["CD14", "14.2", 35, 0.5734],
      ["CD14", "14.3", 37, 0.1768],
      ["CD14", "14.4", 38, 0.6895],
      ["CD14", "14.5", 40, 0.3992],
      ["CD14", "14.6", 42, 0.1088],
      ["CD14", "14.7", 43, 0.5031],
      ["CD14", "14.8", 45, 0.0977],
      ["CD14", "14.9", 46, 0.5418]
    ])
  }),
  "cd20-cd21-theory": Object.freeze({
    topicEnds: Object.freeze({ CD20: 14, CD21: 18 }),
    anchors: Object.freeze([
      ["CD20", "20.1", 4, 0.2162],
      ["CD20", "20.2", 5, 0.4390],
      ["CD20", "20.3", 7, 0.1914],
      ["CD20", "20.4", 7, 0.6667],
      ["CD20", "20.5", 8, 0.1530],
      ["CD20", "20.6", 8, 0.5756],
      ["CD20", "20.7", 9, 0.1560],
      ["CD20", "20.8", 9, 0.5976],
      ["CD20", "20.9", 10, 0.3368],
      ["CD20", "20.10", 10, 0.7549],
      ["CD20", "20.11", 11, 0.2874],
      ["CD20", "20.12", 11, 0.7117],
      ["CD20", "20.13", 12, 0.3257],
      ["CD20", "20.14", 12, 0.8242],
      ["CD20", "20.15", 13, 0.4173],
      ["CD20", "20.16", 13, 0.8408],
      ["CD20", "20.17", 14, 0.3964],
      ["CD21", "21.1", 15, 0.2107],
      ["CD21", "21.2", 15, 0.6375],
      ["CD21", "21.3", 16, 0.1561],
      ["CD21", "21.4", 16, 0.4069],
      ["CD21", "21.5", 16, 0.6397],
      ["CD21", "21.6", 17, 0.0568],
      ["CD21", "21.7", 17, 0.4805],
      ["CD21", "21.8", 17, 0.7959]
    ])
  })
});

function regionForPage(page, start, next, finalPage) {
  const top = page === start.page ? start.top : PAGE_CROP.top;
  const bottom = next && page === next.page ? next.top : PAGE_CROP.bottom;
  return Object.freeze({
    x: PAGE_CROP.x,
    y: Number(top.toFixed(4)),
    width: PAGE_CROP.width,
    height: Number(Math.max(0, bottom - top).toFixed(4)),
    page,
    isBoundaryPage: page === start.page || page === next?.page || page === finalPage
  });
}

function createMapping(documentId, topicId, code, start, next, finalPage) {
  const source = getDocumentSource(documentId);
  const endPage = next?.page ?? finalPage;
  const regions = [];
  for (let page = start.page; page <= endPage; page += 1) {
    const region = regionForPage(page, start, next, finalPage);
    if (region.height > 0.001) {
      regions.push(Object.freeze({
        id: `${code}-pdf-${regions.length + 1}`,
        ...region
      }));
    }
  }

  return Object.freeze({
    topicId,
    subtopicId: code,
    documentId,
    filePath: source.filePath,
    fileName: source.fileName,
    pageCount: source.pageCount,
    sourceSha256: source.sourceSha256,
    startPage: start.page,
    endPage,
    regions: Object.freeze(regions),
    verified: true,
    precision: "exact-region",
    auditedAt: "2026-10-22",
    auditMethod: "Offline text-layer heading coordinates plus independent rendered-page review"
  });
}

function buildMappings() {
  const mappings = {};
  for (const [documentId, section] of Object.entries(DOCUMENT_SECTIONS)) {
    section.anchors.forEach(([topicId, code, page, top], index) => {
      const nextTuple = section.anchors[index + 1];
      const next = nextTuple?.[0] === topicId
        ? { page: nextTuple[2], top: nextTuple[3] }
        : null;
      mappings[code] = createMapping(
        documentId,
        topicId,
        code,
        { page, top },
        next,
        section.topicEnds[topicId]
      );
    });
  }
  return Object.freeze(mappings);
}

export const knowledgePdfMappings = buildMappings();

export function getKnowledgePdfMapping(subtopicId) {
  return knowledgePdfMappings[subtopicId] ?? null;
}

export function getKnowledgePdfMappingsForTopic(topicId) {
  return Object.values(knowledgePdfMappings).filter((mapping) => mapping.topicId === topicId);
}
