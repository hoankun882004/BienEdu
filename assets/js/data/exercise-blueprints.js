const CALCULUS_DOCUMENT = "cd12-cd14-calculus";
const PROBABILITY_DOCUMENT = "cd20-cd21-theory";

function freezeBlueprint(specification) {
  return Object.freeze({
    version: "15.0",
    generationAllowed: true,
    allowedOrigins: Object.freeze(["generated"]),
    constraints: Object.freeze(["Giữ đúng dạng bài đã chọn", "Không đổi phương pháp giải"],),
    sourceExamples: Object.freeze([]),
    ...specification,
    allowedSkills: Object.freeze(specification.allowedSkills ?? []),
    problemPatterns: Object.freeze(specification.problemPatterns ?? []),
    requiredMethods: Object.freeze(specification.requiredMethods ?? []),
    allowedCalculationKinds: Object.freeze(specification.allowedCalculationKinds ?? []),
    allowedParameters: Object.freeze(specification.allowedParameters ?? {}),
    constraints: Object.freeze(specification.constraints ?? ["Giữ đúng dạng bài đã chọn", "Không đổi phương pháp giải"]),
    excludedSkills: Object.freeze(specification.excludedSkills ?? []),
    sourceExamples: Object.freeze(specification.sourceExamples ?? [])
  });
}

const pendingCalculus = {
  "12.2": "Nguyên hàm đa thức", "12.3": "Nguyên hàm phân thức", "12.4": "Nguyên hàm lượng giác",
  "12.5": "Nguyên hàm mũ – logarit", "12.6": "Đổi biến số", "12.7": "Từng phần",
  "12.8": "Tìm hàm số khi biết đạo hàm", "12.9": "Tìm nguyên hàm với điều kiện ban đầu",
  "13.1": "Tính tích phân cơ bản", "13.2": "Tính chất của tích phân", "13.3": "Đổi biến",
  "13.4": "Tích phân từng phần", "13.5": "Tích phân chứa trị tuyệt đối", "13.6": "Tích phân dựa vào đồ thị",
  "13.7": "Tích phân có tham số", "13.8": "Tích phân kết hợp tính đối xứng",
  "14.1": "Diện tích với trục Ox", "14.2": "Diện tích giữa hai đồ thị", "14.3": "Thể tích khối tròn xoay",
  "14.4": "Vật thể bị khoét/rỗng", "14.5": "Quãng đường từ vận tốc", "14.6": "Đại lượng tích lũy",
  "14.7": "Công suất thành năng lượng", "14.8": "Lưu lượng thành thể tích", "14.9": "Bài toán nhiều giai đoạn"
};

const verifiedSpecs = {
  "12.1": {
    title: "Nguyên hàm cơ bản",
    sourceDocumentId: CALCULUS_DOCUMENT,
    allowedOrigins: ["pdf"],
    allowedSkills: ["đọc bảng nguyên hàm", "lấy nguyên hàm từng hạng tử", "kiểm tra bằng đạo hàm"],
    problemPatterns: Array.from({ length: 10 }, (_item, index) => `12.1.source.${index + 1}`),
    requiredMethods: ["tuyến tính của nguyên hàm", "đạo hàm kiểm chứng"],
    allowedCalculationKinds: ["verified-antiderivative"],
    allowedParameters: { sourceOnly: true, variationAllowed: false },
    excludedSkills: ["đổi biến", "tích phân từng phần", "phân tích phân thức", "tích phân xác định"],
    answerFormat: "Tự luận hoặc trả lời ngắn; tự đối chiếu sau khi làm",
    verificationStrategy: "differentiate-canonical-antiderivative",
    generationAllowed: false,
    sourceExamples: ["12.1-self-practice-01", "12.1-self-practice-10"]
  },
  "20.1": { title: "Quy tắc cộng", skills: ["cộng số cách của các phương án loại trừ nhau"], methods: ["quy tắc cộng"], kinds: ["sum"], excluded: ["quy tắc nhân", "hoán vị", "tổ hợp"] },
  "20.2": { title: "Quy tắc nhân", skills: ["nhân số lựa chọn qua các công đoạn", "cộng các phương án tách biệt"], methods: ["quy tắc nhân theo giai đoạn"], kinds: ["product", "sum"], excluded: ["hoán vị", "tổ hợp", "xác suất"] },
  "20.3": { title: "Hoán vị", skills: ["xếp toàn bộ phần tử", "hoán vị lặp", "hoán vị vòng tròn"], methods: ["giai thừa"], kinds: ["factorial", "repeatedPermutation", "roundPermutation"], excluded: ["chỉnh hợp", "tổ hợp"] },
  "20.4": { title: "Chỉnh hợp", skills: ["chọn có thứ tự", "mã cho phép lặp"], methods: ["chỉnh hợp", "quy tắc nhân"], kinds: ["arrangement", "power"], excluded: ["tổ hợp không thứ tự"] },
  "20.5": { title: "Tổ hợp", skills: ["chọn không phân thứ tự"], methods: ["tổ hợp"], kinds: ["combination"], excluded: ["chỉnh hợp", "hoán vị"] },
  "20.6": { title: "Sắp xếp có điều kiện", skills: ["ghép khối", "phần bù", "xếp vào khe"], methods: ["hoán vị có điều kiện"], kinds: ["adjacent", "notAdjacent", "gapArrange"], excluded: ["chọn nhóm không thứ tự"] },
  "20.7": { title: "Chọn người/chọn vật", skills: ["chọn theo thành phần", "ít nhất", "có đủ hai loại"], methods: ["tổ hợp theo trường hợp"], kinds: ["combinationProduct", "combinationRangeSum", "bothTypes"], excluded: ["sắp xếp thứ tự"] },
  "20.8": { title: "Phân phối vật vào hộp/ngăn", skills: ["phân phối vật phân biệt", "chia vật giống nhau"], methods: ["quy tắc nhân", "chia kẹo Euler"], kinds: ["power", "starsBarsZero", "starsBarsPositive"], excluded: ["chia nhóm người"] },
  "20.9": { title: "Chia nhóm", skills: ["chia nhóm có nhãn", "chia nhóm không nhãn", "ghép cặp"], methods: ["hệ số đa thức", "loại hoán vị nhóm"], kinds: ["labeledGroups", "unlabeledEqualGroups", "pairings"], excluded: ["phân phối vật giống nhau"] },
  "20.10": { title: "Đếm gián tiếp", skills: ["dùng biến cố bù trong đếm"], methods: ["toàn bộ trừ trường hợp không thỏa"], kinds: ["complementPower", "subsetSpecial"], excluded: ["nguyên lý bù trừ nhiều tập"] },
  "20.11": { title: "Nguyên lý bù trừ", skills: ["đếm hợp hai hoặc ba tập"], methods: ["nguyên lý bao hàm – loại trừ"], kinds: ["unionDivisible", "unionCount2", "unionCount3"], excluded: ["xác suất hợp"] },
  "20.12": { title: "Bài toán hàng – cột", skills: ["chọn ô khác hàng khác cột", "đếm hình chữ nhật"], methods: ["chọn hàng, chọn cột, ghép"], kinds: ["cellSelection", "rectangles"], excluded: ["hình học xác suất"] },
  "20.13": { title: "Bố trí trên đa giác", skills: ["đếm đường chéo", "chọn đỉnh tạo hình"], methods: ["tổ hợp đỉnh"], kinds: ["diagonals", "combination"], excluded: ["hình học tọa độ"] },
  "20.14": { title: "Phân lớp theo phần dư", skills: ["phân loại theo modulo", "nguyên lý Dirichlet"], methods: ["đếm lớp dư"], kinds: ["complementResidue", "residueCount", "sum"], excluded: ["lũy thừa modulo"] },
  "20.15": { title: "Bài toán modulo", skills: ["tính phần dư", "chữ số tận cùng"], methods: ["lũy thừa modulo"], kinds: ["modPower", "modExpression"], excluded: ["phân lớp Dirichlet"] },
  "20.16": { title: "Bài toán nhiều giai đoạn", skills: ["chọn có vai trò qua nhiều bước", "cộng các nhánh"], methods: ["kết hợp quy tắc cộng và nhân"], kinds: ["teamLeader", "sum"], excluded: ["xác suất nhiều giai đoạn"] },
  "20.17": { title: "Tổ hợp kết hợp hình học", skills: ["chọn điểm tạo đường hoặc tam giác", "loại bộ thẳng hàng"], methods: ["tổ hợp và phần bù"], kinds: ["combination", "trianglesExcluding"], excluded: ["hình học giải tích"] },
  "21.1": { title: "Biến cố", skills: ["lập không gian mẫu", "đếm kết quả thuận lợi"], methods: ["xác suất cổ điển"], kinds: ["probability", "power"], excluded: ["biến cố đối", "xác suất có điều kiện"] },
  "21.2": { title: "Biến cố đối", skills: ["tính xác suất phần bù", "ít nhất một lần"], methods: ["P(Aᶜ)=1−P(A)"], kinds: ["probabilityComplement", "probabilityAtLeastOne"], excluded: ["công thức cộng", "xác suất có điều kiện"] },
  "21.3": { title: "Biến cố hợp", skills: ["nhận diện A∪B", "De Morgan cho hợp"], methods: ["hợp biến cố"], kinds: ["identity"], excluded: ["công thức cộng xác suất"] },
  "21.4": { title: "Biến cố giao", skills: ["nhận diện A∩B", "đếm giao"], methods: ["giao biến cố"], kinds: ["identity", "probability"], excluded: ["công thức nhân tổng quát"] },
  "21.5": { title: "Biến cố xung khắc", skills: ["nhận diện giao rỗng"], methods: ["P(A∩B)=0"], kinds: ["identity"], excluded: ["biến cố độc lập"] },
  "21.6": { title: "Biến cố độc lập", skills: ["kiểm tra P(A∩B)=P(A)P(B)"], methods: ["định nghĩa độc lập"], kinds: ["identity", "probabilityProduct"], excluded: ["xung khắc"] },
  "21.7": { title: "Công thức cộng xác suất", skills: ["tính P(A∪B)", "đúng một biến cố"], methods: ["công thức cộng"], kinds: ["percentUnion", "percentExactlyOne"], excluded: ["công thức nhân"] },
  "21.8": { title: "Công thức nhân xác suất", skills: ["xác suất có điều kiện", "nhân biến cố độc lập"], methods: ["P(A∩B)=P(A)P(B|A)"], kinds: ["probabilityProduct"], excluded: ["công thức cộng"] }
};

const records = {};
for (const [subtopicId, title] of Object.entries(pendingCalculus)) {
  records[subtopicId] = freezeBlueprint({
    subtopicId,
    title,
    sourceDocumentId: CALCULUS_DOCUMENT,
    status: "needs-review",
    generationAllowed: false,
    allowedOrigins: [],
    allowedSkills: [],
    problemPatterns: [],
    requiredMethods: [],
    allowedCalculationKinds: [],
    allowedParameters: {},
    excludedSkills: [],
    answerFormat: "Chưa phát hành",
    verificationStrategy: "not-implemented",
    constraints: ["Không phát hành cho tới khi có verifier độc lập"],
    sourceExamples: []
  });
}

for (const [subtopicId, specification] of Object.entries(verifiedSpecs)) {
  const isCalculus = subtopicId === "12.1";
  records[subtopicId] = freezeBlueprint({
    subtopicId,
    title: specification.title,
    sourceDocumentId: specification.sourceDocumentId ?? PROBABILITY_DOCUMENT,
    status: "verified",
    allowedOrigins: specification.allowedOrigins ?? ["generated"],
    allowedSkills: specification.allowedSkills ?? specification.skills,
    problemPatterns: specification.problemPatterns ?? Array.from({ length: 3 }, (_item, index) => `${subtopicId}.generated.${index + 1}`),
    requiredMethods: specification.requiredMethods ?? specification.methods,
    allowedCalculationKinds: specification.allowedCalculationKinds ?? specification.kinds,
    allowedParameters: specification.allowedParameters ?? {
      domain: "bounded-integer-generator-input",
      validator: "validateCalculationParameters",
      maximumAbsoluteValue: 100000
    },
    constraints: specification.constraints ?? ["Tham số nguyên trong miền generator", "Một đáp án đúng duy nhất"],
    excludedSkills: specification.excludedSkills ?? specification.excluded,
    answerFormat: specification.answerFormat ?? "Trắc nghiệm bốn lựa chọn",
    verificationStrategy: specification.verificationStrategy ?? (specification.kinds?.includes("identity") ? "reviewed-identity-or-independent-enumeration" : "independent-enumeration-or-exact-arithmetic"),
    generationAllowed: specification.generationAllowed ?? !isCalculus,
    sourceExamples: specification.sourceExamples ?? []
  });
}

export const exerciseBlueprints = Object.freeze(records);

export function getExerciseBlueprint(subtopicId) {
  return exerciseBlueprints[subtopicId] ?? null;
}

export const verifiedPracticeBlueprints = Object.freeze(
  Object.values(exerciseBlueprints).filter((blueprint) => blueprint.status === "verified")
);
