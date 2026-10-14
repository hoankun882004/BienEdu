export const documentSources = [
  {
    id: "cd20-cd21-theory",
    filePath: "assets/documents/ly-thuyet-to-hop-xac-suat-thong-ke-cd20-cd23.pdf",
    fileName: "Lý thuyết Tổ hợp – Xác suất – Thống kê CD20–CD23",
    mimeType: "application/pdf",
    pageCount: 18,
    sourceSha256: "66B1D93392F834CA8659902CE7F1020F7CB3220C758DF1D697837340840E9293",
    availabilityStatus: "available",
    topics: {
      CD20: {
        pageStart: 4,
        pageEnd: 14,
        printedPageStart: 3,
        printedPageEnd: 13,
        exercisePages: {
          "20.1": 4,
          "20.2": 5,
          "20.3": 7,
          "20.4": 7,
          "20.5": 8,
          "20.6": 8,
          "20.7": 9,
          "20.8": 9,
          "20.9": 10,
          "20.10": 10,
          "20.11": 11,
          "20.12": 11,
          "20.13": 12,
          "20.14": 12,
          "20.15": 13,
          "20.16": 13,
          "20.17": 14
        }
      },
      CD21: {
        pageStart: 15,
        pageEnd: 18,
        printedPageStart: 14,
        printedPageEnd: 17,
        exercisePages: {
          "21.1": 15,
          "21.2": 15,
          "21.3": 16,
          "21.4": 16,
          "21.5": 16,
          "21.6": 17,
          "21.7": 17,
          "21.8": 18
        }
      }
    }
  }
];

export const documentMappings = documentSources.flatMap((source) =>
  Object.entries(source.topics).map(([topicId, metadata]) => ({
    topicId,
    documentId: source.id,
    filePath: source.filePath,
    fileName: source.fileName,
    mimeType: source.mimeType,
    sourceSha256: source.sourceSha256,
    availabilityStatus: source.availabilityStatus,
    ...metadata
  }))
);

export function getDocumentForTopic(topicId) {
  const mapping = documentMappings.find((item) => item.topicId === topicId);
  return mapping ? { ...mapping, exercisePages: { ...mapping.exercisePages } } : null;
}

export function getDocumentForExercise(topicId, exerciseCode) {
  const mapping = getDocumentForTopic(topicId);
  if (!mapping) return null;
  const page = mapping.exercisePages[exerciseCode] ?? mapping.pageStart;
  return { ...mapping, page };
}
