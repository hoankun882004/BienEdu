export const GRADE_CATALOG = Object.freeze([
  Object.freeze({
    id: "9",
    label: "Lớp 9",
    status: "updating",
    statusLabel: "Nội dung đang cập nhật",
    content: Object.freeze({ course: true, curriculum: false, quiz: false })
  }),
  Object.freeze({
    id: "10",
    label: "Lớp 10",
    status: "updating",
    statusLabel: "Nội dung đang cập nhật",
    content: Object.freeze({ course: true, curriculum: false, quiz: false })
  }),
  Object.freeze({
    id: "11",
    label: "Lớp 11",
    status: "updating",
    statusLabel: "Nội dung đang cập nhật",
    content: Object.freeze({ course: true, curriculum: false, quiz: false })
  }),
  Object.freeze({
    id: "12",
    label: "Lớp 12",
    status: "active",
    statusLabel: "Đã có lộ trình học",
    content: Object.freeze({ course: true, curriculum: true, quiz: true })
  })
]);

export function getGrade(gradeId) {
  return GRADE_CATALOG.find((grade) => grade.id === String(gradeId)) ?? null;
}

export function hasGradeContent(gradeId, contentType) {
  return Boolean(getGrade(gradeId)?.content[contentType]);
}
