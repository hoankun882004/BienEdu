// This manifest records only mappings that were checked against the actual PDF
// headings and page boundaries. A filename is never treated as proof of scope.
export const documentSources = Object.freeze([
  {
    id: "cd01-cd07-functions",
    filePath: "assets/documents/bienedu-ham-so-dao-ham-cd01-cd07.pdf",
    fileName: "Hàm số – Đạo hàm CD01–CD07",
    mimeType: "application/pdf",
    pageCount: 98,
    sourceSha256: "2EBC6F3ABB4558E84237FC2C45DBBC20353B0A6C435E193D6B4A264A17433CA0",
    availabilityStatus: "available",
    verification: {
      status: "verified",
      auditedAt: "2026-10-27",
      note: "All 98 pages were inspected. Curriculum lessons CD01–CD07 occupy pages 4–65; source solutions occupy pages 66–98. The 71 lesson headings match the curriculum catalog."
    },
    topics: {
      CD01: {
        pageStart: 4,
        pageEnd: 8,
        printedPageStart: 4,
        printedPageEnd: 8,
        exercisePages: {
          "1.1": 4, "1.2": 5, "1.3": 5, "1.4": 5, "1.5": 6,
          "1.6": 6, "1.7": 6, "1.8": 7, "1.9": 7, "1.10": 8
        }
      },
      CD02: {
        pageStart: 9,
        pageEnd: 19,
        printedPageStart: 9,
        printedPageEnd: 19,
        exercisePages: {
          "2.1": 9, "2.2": 9, "2.3": 10, "2.4": 11, "2.5": 14,
          "2.6": 18, "2.7": 18, "2.8": 19, "2.9": 19
        }
      },
      CD03: {
        pageStart: 20,
        pageEnd: 31,
        printedPageStart: 20,
        printedPageEnd: 31,
        exercisePages: {
          "3.1": 20, "3.2": 20, "3.3": 21, "3.4": 22, "3.5": 26,
          "3.6": 29, "3.7": 30, "3.8": 30, "3.9": 30, "3.10": 31
        }
      },
      CD04: {
        pageStart: 32,
        pageEnd: 40,
        printedPageStart: 32,
        printedPageEnd: 40,
        exercisePages: {
          "4.1": 32, "4.2": 32, "4.3": 33, "4.4": 34, "4.5": 37,
          "4.6": 38, "4.7": 38, "4.8": 39, "4.9": 39, "4.10": 40, "4.11": 40
        }
      },
      CD05: {
        pageStart: 41,
        pageEnd: 48,
        printedPageStart: 41,
        printedPageEnd: 48,
        exercisePages: {
          "5.1": 41, "5.2": 41, "5.3": 42, "5.4": 42, "5.5": 43,
          "5.6": 44, "5.7": 47, "5.8": 48, "5.9": 48
        }
      },
      CD06: {
        pageStart: 49,
        pageEnd: 61,
        printedPageStart: 49,
        printedPageEnd: 61,
        exercisePages: {
          "6.1": 49, "6.2": 52, "6.3": 54, "6.4": 57, "6.5": 58,
          "6.6": 58, "6.7": 59, "6.8": 59, "6.9": 59, "6.10": 60,
          "6.11": 60, "6.12": 61, "6.13": 61
        }
      },
      CD07: {
        pageStart: 62,
        pageEnd: 65,
        printedPageStart: 62,
        printedPageEnd: 65,
        exercisePages: {
          "7.1": 62, "7.2": 62, "7.3": 63, "7.4": 63, "7.5": 64,
          "7.6": 64, "7.7": 64, "7.8": 65, "7.9": 65
        }
      }
    }
  },
  {
    id: "cd08-cd11-exponential-logarithm",
    filePath: "assets/documents/bienedu-mu-logarit-cd08-cd11.pdf",
    fileName: "Mũ – Logarit CD08–CD11",
    mimeType: "application/pdf",
    pageCount: 78,
    sourceSha256: "27508DB2AA3E2C691E723D70BD2A05BCD1C0F892D42D4CA13F96E855FCA7A6E7",
    availabilityStatus: "available",
    verification: {
      status: "verified",
      auditedAt: "2026-10-27",
      note: "All 78 pages were inspected. This mapping publishes the 36 headings present in the curriculum catalog. Fourteen additional source headings outside the 347-type catalog remain excluded pending a catalog revision."
    },
    topics: {
      CD08: {
        pageStart: 9,
        pageEnd: 17,
        printedPageStart: 9,
        printedPageEnd: 17,
        exercisePages: {
          "8.1": 9, "8.2": 10, "8.3": 11, "8.4": 12, "8.5": 13,
          "8.6": 14, "8.7": 15, "8.8": 16, "8.9": 17
        }
      },
      CD09: {
        pageStart: 23,
        pageEnd: 30,
        printedPageStart: 23,
        printedPageEnd: 30,
        exercisePages: {
          "9.1": 23, "9.2": 24, "9.3": 25, "9.4": 26,
          "9.5": 27, "9.6": 28, "9.7": 29, "9.8": 30
        }
      },
      CD10: {
        pageStart: 34,
        pageEnd: 41,
        printedPageStart: 34,
        printedPageEnd: 41,
        exercisePages: {
          "10.1": 34, "10.2": 35, "10.3": 36, "10.4": 37,
          "10.5": 38, "10.6": 39, "10.7": 40, "10.8": 41
        }
      },
      CD11: {
        pageStart: 44,
        pageEnd: 54,
        printedPageStart: 44,
        printedPageEnd: 54,
        exercisePages: {
          "11.1": 44, "11.2": 45, "11.3": 46, "11.4": 47, "11.5": 48,
          "11.6": 49, "11.7": 50, "11.8": 51, "11.9": 52, "11.10": 53,
          "11.11": 54
        }
      }
    }
  },
  {
    id: "cd20-cd21-theory",
    filePath: "assets/documents/ly-thuyet-to-hop-xac-suat-thong-ke-cd20-cd23.pdf",
    fileName: "Lý thuyết Tổ hợp – Xác suất – Thống kê CD20–CD23",
    mimeType: "application/pdf",
    pageCount: 18,
    sourceSha256: "66B1D93392F834CA8659902CE7F1020F7CB3220C758DF1D697837340840E9293",
    availabilityStatus: "available",
    verification: {
      status: "verified",
      auditedAt: "2026-10-21",
      note: "The 18-page file ends at 21.8. Despite the filename and cover mentioning CD20-CD23, no CD22 or CD23 lesson pages are present."
    },
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
  },
  {
    id: "cd12-cd14-calculus",
    filePath: "assets/documents/bienedu-nguyen-ham-tich-phan-cd12-cd14.pdf",
    fileName: "Nguyên hàm – Tích phân CD12–CD14",
    mimeType: "application/pdf",
    pageCount: 49,
    sourceSha256: "4E65F476DA0A1B817A05B6E829737100B753A2E5219236F719ACAB016F221E59",
    availabilityStatus: "available",
    verification: {
      status: "verified",
      auditedAt: "2026-10-21",
      note: "All 49 pages were inspected. The document contains CD12-01 through CD14-09 in the same order as the curriculum."
    },
    topics: {
      CD12: {
        pageStart: 3,
        pageEnd: 18,
        printedPageStart: 2,
        printedPageEnd: 17,
        exercisePages: {
          "12.1": 3,
          "12.2": 5,
          "12.3": 7,
          "12.4": 8,
          "12.5": 10,
          "12.6": 12,
          "12.7": 13,
          "12.8": 15,
          "12.9": 17
        }
      },
      CD13: {
        pageStart: 19,
        pageEnd: 33,
        printedPageStart: 18,
        printedPageEnd: 32,
        exercisePages: {
          "13.1": 19,
          "13.2": 20,
          "13.3": 22,
          "13.4": 24,
          "13.5": 25,
          "13.6": 27,
          "13.7": 29,
          "13.8": 31
        }
      },
      CD14: {
        pageStart: 34,
        pageEnd: 49,
        printedPageStart: 33,
        printedPageEnd: 48,
        exercisePages: {
          "14.1": 34,
          "14.2": 35,
          "14.3": 37,
          "14.4": 38,
          "14.5": 40,
          "14.6": 42,
          "14.7": 43,
          "14.8": 45,
          "14.9": 46
        }
      }
    }
  }
]);

export const documentMappings = Object.freeze(documentSources.flatMap((source) =>
  Object.entries(source.topics).map(([topicId, metadata]) => ({
    topicId,
    documentId: source.id,
    filePath: source.filePath,
    fileName: source.fileName,
    mimeType: source.mimeType,
    pageCount: source.pageCount,
    sourceSha256: source.sourceSha256,
    availabilityStatus: source.availabilityStatus,
    verification: { ...source.verification },
    ...metadata
  }))
));

export function getDocumentForTopic(topicId) {
  const mapping = documentMappings.find((item) => item.topicId === topicId);
  return mapping ? { ...mapping, exercisePages: { ...mapping.exercisePages } } : null;
}

export function getDocumentSource(documentId) {
  return documentSources.find((item) => item.id === documentId) ?? null;
}
