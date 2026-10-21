const COURSE_BY_GRADE = Object.freeze({
  "9": Object.freeze({
    heroDescription: "Củng cố nền tảng, luyện theo từng dạng và chuẩn bị vững vàng cho kỳ thi tuyển sinh vào lớp 10.",
    audience: "Dành cho học sinh lớp 9 muốn hệ thống lại kiến thức, luyện đúng trọng tâm và chủ động chuẩn bị cho kỳ thi vào lớp 10.",
    audienceItems: Object.freeze([
      "Đang củng cố kiến thức trọng tâm của chương trình Toán 9.",
      "Cần lộ trình ôn tập rõ ràng cho kỳ thi tuyển sinh vào lớp 10.",
      "Muốn luyện tập đều và nhận ra phần kiến thức còn yếu."
    ]),
    goals: Object.freeze({
      understand: "Nắm chắc kiến thức nền và điều kiện áp dụng của từng dạng toán.",
      practice: "Luyện theo từng dạng từ cơ bản đến vận dụng, bám sát mục tiêu lớp 9.",
      assess: "Luyện đề để nhận diện phần còn yếu và điều chỉnh kế hoạch ôn thi vào lớp 10."
    })
  }),
  "10": Object.freeze({
    heroDescription: "Xây chắc nền tảng Toán THPT, làm quen phương pháp học mới và luyện tập theo từng chủ đề.",
    audience: "Dành cho học sinh lớp 10 muốn thích nghi với cách học Toán THPT, hiểu chắc kiến thức nền và học đều ngay từ đầu cấp.",
    audienceItems: Object.freeze([
      "Muốn hệ thống kiến thức Toán 10 theo từng chủ đề rõ ràng.",
      "Cần rèn cách đọc đề, trình bày và vận dụng công thức.",
      "Muốn tự kiểm tra để không tích lũy lỗ hổng kiến thức."
    ]),
    goals: Object.freeze({
      understand: "Hiểu bản chất khái niệm, ký hiệu và điều kiện áp dụng trong Toán 10.",
      practice: "Luyện từng dạng bài để hình thành phương pháp giải chắc chắn.",
      assess: "Làm quen với nhịp luyện đề và phát hiện phần chưa vững trước chủ đề mới."
    })
  }),
  "11": Object.freeze({
    heroDescription: "Nắm chắc kiến thức Toán 11, tăng khả năng vận dụng và tạo đà vững vàng trước khi vào lớp 12.",
    audience: "Dành cho học sinh lớp 11 muốn củng cố kiến thức, rèn kỹ năng giải bài và chuẩn bị nền tảng cho chương trình lớp 12.",
    audienceItems: Object.freeze([
      "Muốn học chắc các chủ đề trọng tâm của Toán 11.",
      "Cần luyện nhiều dạng bài để tăng tốc độ và độ chính xác.",
      "Muốn lấp lỗ hổng trước khi bước vào năm học lớp 12."
    ]),
    goals: Object.freeze({
      understand: "Nắm mối liên hệ giữa công thức, điều kiện và cách lựa chọn phương pháp.",
      practice: "Luyện bài theo mức độ để tăng khả năng phân tích và vận dụng.",
      assess: "Luyện đề để xác định phần cần ôn thêm trước khi chuyển tiếp lên lớp 12."
    })
  }),
  "12": Object.freeze({
    heroDescription: "Ôn phần còn hổng, luyện theo từng chuyên đề rồi kiểm tra lại sau mỗi chặng.",
    audience: "Dành cho học sinh lớp 12 muốn ôn lại kiến thức, luyện từng dạng bài và biết phần nào mình còn chưa chắc.",
    audienceItems: Object.freeze([
      "Đang chuẩn bị cho kỳ thi tốt nghiệp THPT.",
      "Cần một lộ trình học rõ thay vì tài liệu rời rạc.",
      "Muốn tự kiểm tra và xem lời giải ngay sau khi làm."
    ]),
    goals: Object.freeze({
      understand: "Nắm công thức, điều kiện áp dụng và cách đọc bài toán.",
      practice: "Thực hành theo từng chủ đề với phản hồi đủ rõ để tự sửa.",
      assess: "Luyện đề để nhận diện phần vững và phần cần ôn lại sau mỗi chặng."
    })
  })
});

export function getCourseForGrade(gradeId) {
  return COURSE_BY_GRADE[String(gradeId)] ?? null;
}
