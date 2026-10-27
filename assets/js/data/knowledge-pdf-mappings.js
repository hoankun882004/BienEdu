import { getDocumentSource } from "./document-mappings.js?v=12.1";

// Coordinates are normalized against the unrotated PDF page, with the origin at
// the top-left. Every heading anchor below was checked against the source PDF's
// text layer and a rendered page image on 2026-10-22. The small outer crop keeps
// the original page furniture while removing unused paper margins.
const PAGE_CROP = Object.freeze({ x: 0.055, top: 0.055, width: 0.89, bottom: 0.965 });

const DOCUMENT_SECTIONS = Object.freeze({
  "cd01-cd07-functions": Object.freeze({
    topicEnds: Object.freeze({ CD01: 8, CD02: 19, CD03: 31, CD04: 40, CD05: 48, CD06: 61, CD07: 65 }),
    anchors: Object.freeze([
      ["CD01", "1.1", 4, 0.6295],
      ["CD01", "1.2", 5, 0.1115],
      ["CD01", "1.3", 5, 0.4432],
      ["CD01", "1.4", 5, 0.7508],
      ["CD01", "1.5", 6, 0.2261],
      ["CD01", "1.6", 6, 0.5412],
      ["CD01", "1.7", 6, 0.8515],
      ["CD01", "1.8", 7, 0.3375],
      ["CD01", "1.9", 7, 0.6450],
      ["CD01", "1.10", 8, 0.1297],
      ["CD02", "2.1", 9, 0.5151],
      ["CD02", "2.2", 9, 0.8226],
      ["CD02", "2.3", 10, 0.2949],
      ["CD02", "2.4", 11, 0.5924],
      ["CD02", "2.5", 14, 0.7510],
      ["CD02", "2.6", 18, 0.3201],
      ["CD02", "2.7", 18, 0.6294],
      ["CD02", "2.8", 19, 0.0663],
      ["CD02", "2.9", 19, 0.3920],
      ["CD03", "3.1", 20, 0.5506],
      ["CD03", "3.2", 20, 0.8581],
      ["CD03", "3.3", 21, 0.3178],
      ["CD03", "3.4", 22, 0.6978],
      ["CD03", "3.5", 26, 0.3205],
      ["CD03", "3.6", 29, 0.5622],
      ["CD03", "3.7", 30, 0.0663],
      ["CD03", "3.8", 30, 0.3738],
      ["CD03", "3.9", 30, 0.6813],
      ["CD03", "3.10", 31, 0.1573],
      ["CD04", "4.1", 32, 0.3699],
      ["CD04", "4.2", 32, 0.6801],
      ["CD04", "4.3", 33, 0.1573],
      ["CD04", "4.4", 34, 0.4888],
      ["CD04", "4.5", 37, 0.8056],
      ["CD04", "4.6", 38, 0.2719],
      ["CD04", "4.7", 38, 0.6522],
      ["CD04", "4.8", 39, 0.1985],
      ["CD04", "4.9", 39, 0.5060],
      ["CD04", "4.10", 40, 0.0663],
      ["CD04", "4.11", 40, 0.4284],
      ["CD05", "5.1", 41, 0.4984],
      ["CD05", "5.2", 41, 0.8060],
      ["CD05", "5.3", 42, 0.2719],
      ["CD05", "5.4", 42, 0.5795],
      ["CD05", "5.5", 43, 0.0663],
      ["CD05", "5.6", 44, 0.4941],
      ["CD05", "5.7", 47, 0.7951],
      ["CD05", "5.8", 48, 0.2719],
      ["CD05", "5.9", 48, 0.5795],
      ["CD06", "6.1", 49, 0.4677],
      ["CD06", "6.2", 52, 0.8056],
      ["CD06", "6.3", 54, 0.5220],
      ["CD06", "6.4", 57, 0.7866],
      ["CD06", "6.5", 58, 0.2854],
      ["CD06", "6.6", 58, 0.7384],
      ["CD06", "6.7", 59, 0.2214],
      ["CD06", "6.8", 59, 0.5653],
      ["CD06", "6.9", 59, 0.8728],
      ["CD06", "6.10", 60, 0.3360],
      ["CD06", "6.11", 60, 0.6617],
      ["CD06", "6.12", 61, 0.1344],
      ["CD06", "6.13", 61, 0.4419],
      ["CD07", "7.1", 62, 0.3701],
      ["CD07", "7.2", 62, 0.6958],
      ["CD07", "7.3", 63, 0.1573],
      ["CD07", "7.4", 63, 0.4649],
      ["CD07", "7.5", 64, 0.0668],
      ["CD07", "7.6", 64, 0.3925],
      ["CD07", "7.7", 64, 0.7000],
      ["CD07", "7.8", 65, 0.1573],
      ["CD07", "7.9", 65, 0.4831]
    ])
  }),
  "cd08-cd11-exponential-logarithm": Object.freeze({
    topicEnds: Object.freeze({ CD08: 17, CD09: 30, CD10: 41, CD11: 54 }),
    anchors: Object.freeze([
      ["CD08", "8.1", 9, 0.1117],
      ["CD08", "8.2", 10, 0.0663],
      ["CD08", "8.3", 11, 0.0663],
      ["CD08", "8.4", 12, 0.0663],
      ["CD08", "8.5", 13, 0.0663],
      ["CD08", "8.6", 14, 0.0663],
      ["CD08", "8.7", 15, 0.0663],
      ["CD08", "8.8", 16, 0.0663],
      ["CD08", "8.9", 17, 0.0663],
      ["CD09", "9.1", 23, 0.1117],
      ["CD09", "9.2", 24, 0.0663],
      ["CD09", "9.3", 25, 0.0663],
      ["CD09", "9.4", 26, 0.0663],
      ["CD09", "9.5", 27, 0.0663],
      ["CD09", "9.6", 28, 0.0663],
      ["CD09", "9.7", 29, 0.0663],
      ["CD09", "9.8", 30, 0.0663],
      ["CD10", "10.1", 34, 0.1117],
      ["CD10", "10.2", 35, 0.0663],
      ["CD10", "10.3", 36, 0.0663],
      ["CD10", "10.4", 37, 0.0663],
      ["CD10", "10.5", 38, 0.0663],
      ["CD10", "10.6", 39, 0.0663],
      ["CD10", "10.7", 40, 0.0663],
      ["CD10", "10.8", 41, 0.0663],
      ["CD11", "11.1", 44, 0.1117],
      ["CD11", "11.2", 45, 0.0663],
      ["CD11", "11.3", 46, 0.0663],
      ["CD11", "11.4", 47, 0.0663],
      ["CD11", "11.5", 48, 0.0663],
      ["CD11", "11.6", 49, 0.0663],
      ["CD11", "11.7", 50, 0.0663],
      ["CD11", "11.8", 51, 0.0654],
      ["CD11", "11.9", 52, 0.0657],
      ["CD11", "11.10", 53, 0.0663],
      ["CD11", "11.11", 54, 0.0663]
    ])
  }),
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
