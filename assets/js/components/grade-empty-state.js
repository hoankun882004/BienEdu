import { buildGradeAwareUrl } from "../domain/grade-context.js?v=8.2";
import { getGrade } from "../data/grade-catalog.js?v=8.2";

const PAGE_COPY = Object.freeze({
  course: {
    eyebrow: "Khóa học",
    title: "Khóa học Toán",
    statusTitle: "Nội dung khóa học đang được cập nhật",
    description: "BienEdu đang biên soạn bài học, ví dụ và phần luyện tập đúng với chương trình của khối lớp này."
  },
  documents: {
    eyebrow: "Lộ trình",
    title: "Lộ trình Toán",
    statusTitle: "Các chuyên đề đang được cập nhật",
    description: "Lộ trình sẽ hiển thị theo từng chuyên đề và dạng bài khi nguồn nội dung đã được kiểm tra đầy đủ."
  },
  quiz: {
    eyebrow: "Kiểm tra",
    title: "Kiểm tra Toán",
    statusTitle: "Bộ câu hỏi đang được cập nhật",
    description: "Bài kiểm tra sẽ được mở khi câu hỏi và lời giải của khối lớp này đã được kiểm tra đầy đủ."
  }
});

export function renderGradeEmptyState(page, gradeId) {
  const grade = getGrade(gradeId);
  const copy = PAGE_COPY[page] ?? PAGE_COPY.course;
  return `<section class="grade-empty-state grade-foundation grade-foundation--${page}" aria-labelledby="grade-empty-title">
    <header class="grade-foundation__header">
      <p class="section-eyebrow">${copy.eyebrow} · ${grade?.label ?? "Khối lớp"}</p>
      <h1 id="grade-empty-title">${copy.title} ${grade?.id ?? ""}</h1>
      <p>${copy.description}</p>
    </header>
    <div class="grade-foundation__status">
      <div class="grade-foundation__number" aria-hidden="true"><span>${grade?.id ?? "–"}</span><small>Khối lớp</small></div>
      <div>
        <p>Đang cập nhật</p>
        <h2>${copy.statusTitle}</h2>
        <span>Chúng tôi chỉ hiển thị nội dung sau khi đã đối chiếu và kiểm tra.</span>
      </div>
    </div>
    <footer class="grade-empty-state__actions">
      <button class="button" type="button" data-grade-open>Đổi khối lớp</button>
      <a class="text-link" href="${buildGradeAwareUrl("./", grade?.id)}">Về trang chủ</a>
    </footer>
  </section>`;
}
