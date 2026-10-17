const HOME_BY_GRADE = Object.freeze({
  "9": Object.freeze({
    subtitle: "vững nền để vào 10",
    description: "Củng cố kiến thức trọng tâm, luyện theo từng dạng và chuẩn bị có kế hoạch cho kỳ thi tuyển sinh vào lớp 10.",
    overviewTitle: "Học chắc nền tảng, ôn đúng trọng tâm",
    overviewDescription: "Tập trung vào phần kiến thức cần nắm, duy trì nhịp luyện tập đều và nhận ra nội dung cần ôn thêm."
  }),
  "10": Object.freeze({
    subtitle: "xây nền tảng THPT",
    description: "Làm quen phương pháp học Toán THPT, hiểu chắc kiến thức nền và luyện tập đều ngay từ đầu cấp.",
    overviewTitle: "Bắt nhịp cách học Toán THPT",
    overviewDescription: "Học theo từng chủ đề, rèn cách đọc đề và hình thành phương pháp giải bài rõ ràng."
  }),
  "11": Object.freeze({
    subtitle: "tăng tốc trước lớp 12",
    description: "Củng cố kiến thức Toán 11, tăng khả năng vận dụng và chuẩn bị nền tảng vững vàng cho năm cuối cấp.",
    overviewTitle: "Củng cố kiến thức, tăng khả năng vận dụng",
    overviewDescription: "Luyện bài theo mức độ, lấp phần còn hổng và tạo đà thuận lợi trước khi bước vào lớp 12."
  })
});

export function getHomeForGrade(gradeId) {
  return HOME_BY_GRADE[String(gradeId)] ?? null;
}
