import { getKnowledgeSection } from "../data/knowledge-slides.js";

export function factorial(value) {
  let result = 1;
  for (let number = 2; number <= value; number += 1) result *= number;
  return result;
}

export function combination(total, selected) {
  if (selected < 0 || selected > total) return 0;
  const k = Math.min(selected, total - selected);
  let result = 1;
  for (let index = 1; index <= k; index += 1) {
    result = (result * (total - k + index)) / index;
  }
  return Math.round(result);
}

export function arrangement(total, selected) {
  return factorial(total) / factorial(total - selected);
}

function greatestCommonDivisor(a, b) {
  let left = Math.abs(a);
  let right = Math.abs(b);
  while (right) [left, right] = [right, left % right];
  return left || 1;
}

function leastCommonMultiple(a, b) {
  return Math.abs(a * b) / greatestCommonDivisor(a, b);
}

function fraction(numerator, denominator) {
  const divisor = greatestCommonDivisor(numerator, denominator);
  const reducedNumerator = numerator / divisor;
  const reducedDenominator = denominator / divisor;
  return reducedDenominator === 1 ? String(reducedNumerator) : `${reducedNumerator}/${reducedDenominator}`;
}

function modularPower(base, exponent, modulus) {
  let result = 1;
  let factor = ((base % modulus) + modulus) % modulus;
  let power = exponent;
  while (power > 0) {
    if (power % 2 === 1) result = (result * factor) % modulus;
    factor = (factor * factor) % modulus;
    power = Math.floor(power / 2);
  }
  return result;
}

export function evaluateCalculation(calculation) {
  const input = calculation.input ?? {};
  switch (calculation.kind) {
    case "sum": return String(input.values.reduce((total, value) => total + value, 0));
    case "product": return String(input.values.reduce((total, value) => total * value, 1));
    case "factorial": return String(factorial(input.n));
    case "repeatedPermutation": return String(factorial(input.n) / input.repeats.reduce((value, repeat) => value * factorial(repeat), 1));
    case "roundPermutation": return String(factorial(input.n - 1));
    case "arrangement": return String(arrangement(input.n, input.k));
    case "power": return String(input.base ** input.exponent);
    case "combination": return String(combination(input.n, input.k));
    case "adjacent": return String(2 * factorial(input.n - 1));
    case "notAdjacent": return String(factorial(input.n) - 2 * factorial(input.n - 1));
    case "gapArrange": return String(factorial(input.first) * combination(input.first + 1, input.second) * factorial(input.second));
    case "combinationProduct": return String(combination(input.a, input.i) * combination(input.b, input.k - input.i));
    case "combinationRangeSum": return String(input.values.reduce((total, i) => total + combination(input.a, i) * combination(input.b, input.k - i), 0));
    case "bothTypes": return String(combination(input.a + input.b, input.k) - combination(input.a, input.k) - combination(input.b, input.k));
    case "starsBarsZero": return String(combination(input.n + input.m - 1, input.m - 1));
    case "starsBarsPositive": return String(combination(input.n - 1, input.m - 1));
    case "labeledGroups": return String(factorial(input.n) / input.sizes.reduce((value, size) => value * factorial(size), 1));
    case "unlabeledEqualGroups": return String(combination(input.n, input.n / 2) / 2);
    case "pairings": return String(factorial(2 * input.m) / ((2 ** input.m) * factorial(input.m)));
    case "complementPower": return String((input.totalBase ** input.n) - (input.excludedBase ** input.n));
    case "subsetSpecial": return String((2 ** input.n) - (2 ** (input.n - input.special)));
    case "unionCount2": return String(input.a + input.b - input.intersection);
    case "unionCount3": return String(input.a + input.b + input.c - input.ab - input.ac - input.bc + input.abc);
    case "unionDivisible": return String(Math.floor(input.limit / input.a) + Math.floor(input.limit / input.b) - Math.floor(input.limit / leastCommonMultiple(input.a, input.b)));
    case "cellSelection": return String(combination(input.rows, input.k) * combination(input.columns, input.k) * factorial(input.k));
    case "rectangles": return String(combination(input.horizontal, 2) * combination(input.vertical, 2));
    case "diagonals": return String((input.n * (input.n - 3)) / 2);
    case "trianglesExcluding": return String(combination(input.n, 3) - combination(input.m, 3));
    case "residueCount": {
      let count = 0;
      for (let value = 1; value <= input.limit; value += 1) if (value % input.modulus === input.residue) count += 1;
      return String(count);
    }
    case "complementResidue": return String((input.modulus - input.residue) % input.modulus);
    case "modPower": return String(modularPower(input.base, input.exponent, input.modulus));
    case "modExpression": return String(((input.a % input.modulus) * (input.b % input.modulus) + input.c) % input.modulus);
    case "teamLeader": return String(input.n * combination(input.n - 1, input.members));
    case "probability": return fraction(input.favorable, input.total);
    case "probabilityComplement": return fraction(input.total - input.favorable, input.total);
    case "probabilityAtLeastOne": return fraction((input.total ** input.n) - (input.excluded ** input.n), input.total ** input.n);
    case "probabilityProduct": return fraction(input.numerators.reduce((value, item) => value * item, 1), input.denominators.reduce((value, item) => value * item, 1));
    case "percentUnion": return `${input.a + input.b - input.intersection}%`;
    case "percentExactlyOne": return `${input.a + input.b - 2 * input.intersection}%`;
    case "identity": return String(input.value);
    default: throw new Error(`Unknown calculation kind: ${calculation.kind}`);
  }
}

function hashSeed(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = hashSeed(seed);
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(values, random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function fallbackOptions(answer) {
  if (/^-?\d+$/.test(answer)) {
    const number = Number(answer);
    return [String(number + 1), String(Math.max(0, number - 1)), String(number * 2 || 2), String(number + 3)];
  }
  if (answer.endsWith("%")) {
    const number = Number(answer.slice(0, -1));
    return [`${Math.max(0, number - 10)}%`, `${Math.min(100, number + 10)}%`, `${Math.max(0, 100 - number)}%`, `${Math.min(100, number + 5)}%`];
  }
  return ["0", "1/2", "1", "2"];
}

function buildQuestion({ sourceTopic, index, prompt, calculation, distractors, solution }, random, seed) {
  const correctAnswer = evaluateCalculation(calculation);
  const alternatives = [...new Set([...distractors.map(String), ...fallbackOptions(correctAnswer)])]
    .filter((option) => option !== correctAnswer)
    .slice(0, 3);
  if (alternatives.length !== 3) throw new Error(`Not enough unique options for ${sourceTopic} question ${index}`);
  const options = shuffle([correctAnswer, ...alternatives], random);
  const section = getKnowledgeSection(sourceTopic);
  return {
    id: `${sourceTopic.replace(".", "-")}-${hashSeed(`${seed}:${index}`).toString(36)}`,
    type: "multiple-choice",
    prompt,
    options,
    correctIndex: options.indexOf(correctAnswer),
    correctAnswer,
    solution: typeof solution === "function" ? solution(correctAnswer) : solution,
    sourceTopic,
    sourcePages: section ? [...new Set([...section.knowledgeSlides, ...section.exampleSlides].flatMap((slide) => slide.sourcePages))] : [],
    calculation
  };
}

function context(sourceTopic, seed) {
  const random = seededRandom(`${sourceTopic}:${seed}`);
  return {
    random,
    int(minimum, maximum) {
      return minimum + Math.floor(random() * (maximum - minimum + 1));
    },
    question(index, details) {
      return buildQuestion({ sourceTopic, index, ...details }, random, seed);
    }
  };
}

function generate201(ctx) {
  const a = ctx.int(3, 6); const b = ctx.int(4, 8); const c = ctx.int(2, 5);
  return [
    ctx.question(1, { prompt: `Một thư viện có ${a} sách khoa học và ${b} sách lịch sử. Một học sinh chọn đúng một cuốn. Có bao nhiêu cách chọn?`, calculation: { kind: "sum", input: { values: [a, b] } }, distractors: [a * b, Math.max(a, b), a + b + 1], solution: (answer) => `Hai nhóm sách riêng biệt và mỗi lần chỉ chọn một cuốn nên dùng quy tắc cộng: ${a} + ${b} = ${answer}. Vậy có ${answer} cách chọn.` }),
    ctx.question(2, { prompt: `Một câu lạc bộ cho phép đăng ký đúng một hoạt động: ${a} môn thể thao, ${b} nhóm nghệ thuật hoặc ${c} lớp kỹ năng. Có bao nhiêu lựa chọn?`, calculation: { kind: "sum", input: { values: [a, b, c] } }, distractors: [a * b * c, a + b, b + c], solution: (answer) => `Ba nhóm hoạt động không đồng thời và chỉ chọn một hoạt động. Theo quy tắc cộng: ${a} + ${b} + ${c} = ${answer}.` }),
    ctx.question(3, { prompt: `Để đến trường, An chọn một trong ${a} tuyến xe buýt hoặc ${c} tuyến tàu điện. An có bao nhiêu cách chọn tuyến?`, calculation: { kind: "sum", input: { values: [a, c] } }, distractors: [a * c, a + c - 1, Math.max(a, c)], solution: (answer) => `Đi xe buýt và đi tàu điện là hai phương án rời nhau. Theo quy tắc cộng, số cách là ${a} + ${c} = ${answer}.` })
  ];
}

function generate202(ctx) {
  const a = ctx.int(3, 6); const b = ctx.int(2, 5); const c = ctx.int(2, 4); const direct = ctx.int(1, 3);
  return [
    ctx.question(1, { prompt: `Có ${a} áo, ${b} quần và ${c} đôi giày. Mỗi bộ gồm một món mỗi loại. Có bao nhiêu bộ khác nhau?`, calculation: { kind: "product", input: { values: [a, b, c] } }, distractors: [a + b + c, a * b + c, a + b * c], solution: (answer) => `Một bộ phải qua ba bước chọn liên tiếp. Theo quy tắc nhân: ${a} × ${b} × ${c} = ${answer} bộ.` }),
    ctx.question(2, { prompt: `Một thực đơn có ${a} món chính và ${b} món tráng miệng. Chọn một món mỗi loại có bao nhiêu cách?`, calculation: { kind: "product", input: { values: [a, b] } }, distractors: [a + b, a * b + 1, Math.max(a, b)], solution: (answer) => `Mỗi món chính ghép được với ${b} món tráng miệng. Theo quy tắc nhân: ${a} × ${b} = ${answer}.` }),
    ctx.question(3, { prompt: `Có ${direct} đường đi thẳng và một phương án qua trạm trung chuyển gồm ${a} đường đến trạm, ${b} đường từ trạm tới đích. Có tất cả bao nhiêu đường đi?`, calculation: { kind: "sum", input: { values: [direct, a * b] } }, distractors: [direct + a + b, direct * a * b, a * b], solution: (answer) => `Qua trạm có ${a} × ${b} = ${a * b} cách. Hai phương án đi thẳng hoặc qua trạm rời nhau nên tổng là ${direct} + ${a * b} = ${answer}.` })
  ];
}

function generate203(ctx) {
  const n = ctx.int(5, 7); const repeated = ctx.int(5, 7); const round = ctx.int(5, 7);
  return [
    ctx.question(1, { prompt: `Xếp ${n} học sinh phân biệt thành một hàng. Có bao nhiêu cách?`, calculation: { kind: "factorial", input: { n } }, distractors: [n ** 2, factorial(n - 1), n * (n - 1)], solution: (answer) => `Sắp xếp toàn bộ ${n} phần tử phân biệt là một hoán vị: P(${n}) = ${n}! = ${answer}.` }),
    ctx.question(2, { prompt: `Sắp xếp ${repeated} chữ cái, trong đó có đúng hai chữ A giống nhau và các chữ còn lại khác nhau. Có bao nhiêu dãy?`, calculation: { kind: "repeatedPermutation", input: { n: repeated, repeats: [2] } }, distractors: [factorial(repeated), factorial(repeated - 1), factorial(repeated) / 4], solution: (answer) => `Có ${repeated}! hoán vị nếu coi mọi chữ khác nhau. Hai chữ A đổi chỗ không tạo dãy mới nên chia cho 2!: ${repeated}!/2! = ${answer}.` }),
    ctx.question(3, { prompt: `Xếp ${round} người quanh một bàn tròn, chỉ coi các phép quay là giống nhau. Có bao nhiêu cách?`, calculation: { kind: "roundPermutation", input: { n: round } }, distractors: [factorial(round), factorial(round - 2), round ** 2], solution: (answer) => `Cố định một người làm mốc rồi xếp ${round - 1} người còn lại: (${round} - 1)! = ${answer}.` })
  ];
}

function generate204(ctx) {
  const n = ctx.int(7, 10); const k = ctx.int(2, 4); const symbols = ctx.int(4, 7); const length = ctx.int(3, 4);
  return [
    ctx.question(1, { prompt: `Chọn và phân công ${k} chức vụ khác nhau cho ${n} học sinh. Có bao nhiêu cách?`, calculation: { kind: "arrangement", input: { n, k } }, distractors: [combination(n, k), n ** k, factorial(k)], solution: (answer) => `Các chức vụ là vị trí phân biệt nên thứ tự quan trọng. Số cách là A(${n},${k}) = ${n}!/(${n}-${k})! = ${answer}.` }),
    ctx.question(2, { prompt: `Trao huy chương nhất, nhì, ba cho ${n} vận động viên, mỗi người nhận nhiều nhất một huy chương. Có bao nhiêu kết quả?`, calculation: { kind: "arrangement", input: { n, k: 3 } }, distractors: [combination(n, 3), factorial(n), n ** 3], solution: (answer) => `Ba hạng là ba vị trí khác nhau. Chọn có thứ tự 3 người từ ${n} người: A(${n},3) = ${answer}.` }),
    ctx.question(3, { prompt: `Một mã gồm ${length} vị trí; mỗi vị trí chọn một trong ${symbols} ký hiệu và được phép lặp. Có bao nhiêu mã?`, calculation: { kind: "power", input: { base: symbols, exponent: length } }, distractors: [arrangement(symbols, length), combination(symbols, length), symbols * length], solution: (answer) => `Mỗi vị trí đều có ${symbols} lựa chọn độc lập và được lặp. Theo quy tắc nhân: ${symbols}^${length} = ${answer}.` })
  ];
}

function generate205(ctx) {
  const n = ctx.int(8, 12); const k = ctx.int(3, 5);
  return [1, 2, 3].map((index) => {
    const total = n + index - 1;
    const selected = Math.min(k, total - 2);
    return ctx.question(index, { prompt: `Chọn ${selected} học sinh từ ${total} học sinh vào một đội, không phân chức vụ. Có bao nhiêu cách?`, calculation: { kind: "combination", input: { n: total, k: selected } }, distractors: [arrangement(total, selected), factorial(selected), total ** selected], solution: (answer) => `Chỉ chọn một tập ${selected} người, không xét thứ tự nên dùng tổ hợp: C(${total},${selected}) = ${answer}.` });
  });
}

function generate206(ctx) {
  const n = ctx.int(5, 7); const boys = ctx.int(3, 5); const girls = Math.min(ctx.int(2, 3), boys + 1);
  return [
    ctx.question(1, { prompt: `Xếp ${n} người thành hàng, trong đó A và B phải đứng cạnh nhau. Có bao nhiêu cách?`, calculation: { kind: "adjacent", input: { n } }, distractors: [factorial(n - 1), factorial(n), 2 * factorial(n - 2)], solution: (answer) => `Ghép A, B thành một khối. Có (${n} - 1)! cách xếp khối với những người còn lại và 2 cách đổi chỗ A, B: 2×${n - 1}! = ${answer}.` }),
    ctx.question(2, { prompt: `Xếp ${n} người thành hàng sao cho A và B không đứng cạnh nhau. Có bao nhiêu cách?`, calculation: { kind: "notAdjacent", input: { n } }, distractors: [2 * factorial(n - 1), factorial(n - 1), factorial(n)], solution: (answer) => `Tổng có ${n}! cách. Trường hợp A, B cạnh nhau có 2×${n - 1}! cách. Lấy phần bù: ${n}! - 2×${n - 1}! = ${answer}.` }),
    ctx.question(3, { prompt: `Xếp ${boys} bạn nam và ${girls} bạn nữ phân biệt thành hàng sao cho không có hai bạn nữ đứng cạnh nhau. Có bao nhiêu cách?`, calculation: { kind: "gapArrange", input: { first: boys, second: girls } }, distractors: [factorial(boys + girls), factorial(boys) * combination(boys + 1, girls), combination(boys + 1, girls)], solution: (answer) => `Xếp ${boys} bạn nam trước: ${boys}! cách, tạo ${boys + 1} khe. Chọn ${girls} khe và xếp ${girls} bạn nữ: C(${boys + 1},${girls})×${girls}!. Tổng là ${answer}.` })
  ];
}

function generate207(ctx) {
  const a = ctx.int(5, 7); const b = ctx.int(4, 6); const k = 4;
  return [
    ctx.question(1, { prompt: `Từ ${a} học sinh nhóm A và ${b} học sinh nhóm B, chọn ${k} người có đúng 2 người nhóm A. Có bao nhiêu cách?`, calculation: { kind: "combinationProduct", input: { a, b, k, i: 2 } }, distractors: [combination(a + b, k), combination(a, 2) + combination(b, 2), arrangement(a + b, k)], solution: (answer) => `Chọn 2 người nhóm A và ${k - 2} người nhóm B độc lập: C(${a},2)×C(${b},${k - 2}) = ${answer}.` }),
    ctx.question(2, { prompt: `Từ ${a} nam và ${b} nữ, chọn ${k} người có ít nhất 2 nữ. Có bao nhiêu cách?`, calculation: { kind: "combinationRangeSum", input: { a, b, k, values: [2, 3, 4] } }, distractors: [combination(a + b, k), combination(b, 2) * combination(a, 2), combination(a, k) + combination(b, k)], solution: (answer) => `Chia thành các trường hợp rời nhau có 2, 3 hoặc 4 nữ: C(${b},2)C(${a},2) + C(${b},3)C(${a},1) + C(${b},4)C(${a},0) = ${answer}.` }),
    ctx.question(3, { prompt: `Từ ${a} sách Toán và ${b} sách Văn, chọn ${k} cuốn sao cho có cả hai loại. Có bao nhiêu cách?`, calculation: { kind: "bothTypes", input: { a, b, k } }, distractors: [combination(a + b, k), combination(a, k) + combination(b, k), a * b], solution: (answer) => `Lấy tổng số cách chọn ${k} cuốn rồi loại hai trường hợp chỉ có một loại: C(${a + b},${k}) - C(${a},${k}) - C(${b},${k}) = ${answer}.` })
  ];
}

function generate208(ctx) {
  const n = ctx.int(6, 9); const m = ctx.int(3, 4);
  return [
    ctx.question(1, { prompt: `Phân ${n} vật phân biệt vào ${m} hộp có nhãn, không hạn chế số vật mỗi hộp. Có bao nhiêu cách?`, calculation: { kind: "power", input: { base: m, exponent: n } }, distractors: [combination(n + m - 1, m - 1), m * n, arrangement(n, m)], solution: (answer) => `Mỗi vật phân biệt có ${m} lựa chọn hộp độc lập. Theo quy tắc nhân có ${m}^${n} = ${answer} cách.` }),
    ctx.question(2, { prompt: `Chia ${n} viên kẹo giống nhau vào ${m} hộp có nhãn, mỗi hộp có thể rỗng. Có bao nhiêu cách?`, calculation: { kind: "starsBarsZero", input: { n, m } }, distractors: [m ** n, combination(n - 1, m - 1), combination(n, m)], solution: (answer) => `Số nghiệm nguyên không âm của x₁+...+x${m}=${n} là C(${n + m - 1},${m - 1}) = ${answer}.` }),
    ctx.question(3, { prompt: `Chia ${n} viên kẹo giống nhau cho ${m} bạn, mỗi bạn nhận ít nhất một viên. Có bao nhiêu cách?`, calculation: { kind: "starsBarsPositive", input: { n, m } }, distractors: [combination(n + m - 1, m - 1), m ** n, combination(n, m)], solution: (answer) => `Đặt mỗi bạn một viên trước. Số nghiệm nguyên dương của x₁+...+x${m}=${n} là C(${n - 1},${m - 1}) = ${answer}.` })
  ];
}

function generate209(ctx) {
  const half = ctx.int(3, 5); const n = half * 2; const m = ctx.int(3, 5);
  return [
    ctx.question(1, { prompt: `Chia ${n} người vào hai nhóm có tên A và B, mỗi nhóm ${half} người. Có bao nhiêu cách?`, calculation: { kind: "labeledGroups", input: { n, sizes: [half, half] } }, distractors: [combination(n, half) / 2, factorial(n), combination(n, 2)], solution: (answer) => `Hai nhóm có tên nên phân biệt. Chọn ${half} người cho A, phần còn lại vào B: C(${n},${half}) = ${answer}.` }),
    ctx.question(2, { prompt: `Chia ${n} người thành hai nhóm bằng nhau không đặt tên. Có bao nhiêu cách?`, calculation: { kind: "unlabeledEqualGroups", input: { n } }, distractors: [combination(n, half), factorial(n), combination(n, 2)], solution: (answer) => `Chọn ${half} người cho một nhóm được C(${n},${half}) cách, nhưng đổi tên hai nhóm không tạo kết quả mới nên chia 2: ${answer}.` }),
    ctx.question(3, { prompt: `Ghép ${2 * m} người thành ${m} cặp không phân biệt. Có bao nhiêu cách?`, calculation: { kind: "pairings", input: { m } }, distractors: [factorial(2 * m) / factorial(m), combination(2 * m, 2), factorial(m)], solution: (answer) => `Sắp ${2 * m} người rồi chia theo cặp; chia cho 2^${m} do đổi chỗ trong mỗi cặp và chia cho ${m}! do các cặp không có tên: (${2 * m})!/(2^${m}·${m}!) = ${answer}.` })
  ];
}

function generate2010(ctx) {
  const n = ctx.int(4, 6); const special = ctx.int(2, 3);
  return [
    ctx.question(1, { prompt: `Có bao nhiêu dãy ${n} chữ số (cho phép chữ số đầu là 0) chứa ít nhất một chữ số 0?`, calculation: { kind: "complementPower", input: { totalBase: 10, excludedBase: 9, n } }, distractors: [9 ** n, 10 ** n, (10 ** n) - 1], solution: (answer) => `Tổng có 10^${n} dãy. Dãy không có số 0 có 9^${n} cách. Lấy phần bù: 10^${n} - 9^${n} = ${answer}.` }),
    ctx.question(2, { prompt: `Có bao nhiêu xâu nhị phân độ dài ${n} có ít nhất một chữ số 1?`, calculation: { kind: "complementPower", input: { totalBase: 2, excludedBase: 1, n } }, distractors: [2 ** n, n, (2 ** n) - 2], solution: (answer) => `Có 2^${n} xâu tất cả. Chỉ có một xâu không chứa số 1 là xâu toàn 0. Vậy có 2^${n} - 1 = ${answer}.` }),
    ctx.question(3, { prompt: `Một tập có ${n + 3} phần tử, trong đó ${special} phần tử được đánh dấu. Có bao nhiêu tập con chứa ít nhất một phần tử được đánh dấu?`, calculation: { kind: "subsetSpecial", input: { n: n + 3, special } }, distractors: [2 ** (n + 3), 2 ** n, special * (2 ** n)], solution: (answer) => `Tổng có 2^${n + 3} tập con. Không chọn phần tử đánh dấu có 2^${n + 3 - special} tập. Lấy phần bù được ${answer}.` })
  ];
}

function generate2011(ctx) {
  const limit = ctx.int(60, 100); const a = 2; const b = ctx.int(3, 5);
  const clubA = ctx.int(18, 25); const clubB = ctx.int(14, 20); const common = ctx.int(4, 8);
  return [
    ctx.question(1, { prompt: `Trong các số từ 1 đến ${limit}, có bao nhiêu số chia hết cho ${a} hoặc ${b}?`, calculation: { kind: "unionDivisible", input: { limit, a, b } }, distractors: [Math.floor(limit / a) + Math.floor(limit / b), Math.floor(limit / leastCommonMultiple(a, b)), Math.floor(limit / a)], solution: (answer) => `Cộng số bội của ${a} và ${b}, rồi trừ phần giao là bội của BCNN(${a},${b})=${leastCommonMultiple(a, b)}: ⌊${limit}/${a}⌋ + ⌊${limit}/${b}⌋ - ⌊${limit}/${leastCommonMultiple(a, b)}⌋ = ${answer}.` }),
    ctx.question(2, { prompt: `Lớp có ${clubA} bạn học CLB A, ${clubB} bạn học CLB B và ${common} bạn học cả hai. Có bao nhiêu bạn học ít nhất một CLB?`, calculation: { kind: "unionCount2", input: { a: clubA, b: clubB, intersection: common } }, distractors: [clubA + clubB, common, clubA + clubB - 2 * common], solution: (answer) => `Các bạn học cả hai bị cộng hai lần nên phải trừ một lần: ${clubA} + ${clubB} - ${common} = ${answer}.` }),
    ctx.question(3, { prompt: "Ba nhóm A, B, C lần lượt có 18, 16, 14 phần tử; các giao đôi có 5, 4, 3 phần tử và giao ba có 2 phần tử. Hợp của ba nhóm có bao nhiêu phần tử?", calculation: { kind: "unionCount3", input: { a: 18, b: 16, c: 14, ab: 5, ac: 4, bc: 3, abc: 2 } }, distractors: [48, 36, 34], solution: (answer) => `Theo bù trừ ba tập: 18 + 16 + 14 - 5 - 4 - 3 + 2 = ${answer}. Giao ba được cộng lại vì đã bị trừ ba lần sau khi cộng ban đầu.` })
  ];
}

function generate2012(ctx) {
  const rows = ctx.int(4, 6); const columns = ctx.int(5, 7); const k = 3;
  return [
    ctx.question(1, { prompt: `Trong bảng ${rows} hàng, ${columns} cột, chọn ${k} ô sao cho không hai ô cùng hàng hoặc cùng cột. Có bao nhiêu cách?`, calculation: { kind: "cellSelection", input: { rows, columns, k } }, distractors: [combination(rows, k) * combination(columns, k), rows * columns, combination(rows * columns, k)], solution: (answer) => `Chọn ${k} hàng, chọn ${k} cột rồi ghép hàng với cột theo ${k}! cách: C(${rows},${k})C(${columns},${k})${k}! = ${answer}.` }),
    ctx.question(2, { prompt: `${rows} đường ngang và ${columns} đường dọc tạo được bao nhiêu hình chữ nhật có cạnh nằm trên các đường đó?`, calculation: { kind: "rectangles", input: { horizontal: rows, vertical: columns } }, distractors: [rows * columns, combination(rows * columns, 2), combination(rows, 2) + combination(columns, 2)], solution: (answer) => `Mỗi hình chữ nhật được xác định bởi 2 đường ngang và 2 đường dọc: C(${rows},2)C(${columns},2) = ${answer}.` }),
    ctx.question(3, { prompt: `Một bảng có ${rows} hàng ô và ${columns} cột ô. Có bao nhiêu hình chữ nhật theo lưới?`, calculation: { kind: "rectangles", input: { horizontal: rows + 1, vertical: columns + 1 } }, distractors: [combination(rows, 2) * combination(columns, 2), rows * columns, combination(rows + columns, 2)], solution: (answer) => `Bảng ${rows}×${columns} ô có ${rows + 1} đường ngang và ${columns + 1} đường dọc. Chọn hai đường mỗi chiều: C(${rows + 1},2)C(${columns + 1},2) = ${answer}.` })
  ];
}

function generate2013(ctx) {
  const n = ctx.int(7, 11);
  return [
    ctx.question(1, { prompt: `Một đa giác lồi ${n} đỉnh có bao nhiêu đường chéo?`, calculation: { kind: "diagonals", input: { n } }, distractors: [combination(n, 2), n * (n - 1), combination(n, 3)], solution: (answer) => `Có C(${n},2) đoạn nối hai đỉnh, trong đó ${n} cạnh. Số đường chéo là C(${n},2)-${n} = ${n}(${n}-3)/2 = ${answer}.` }),
    ctx.question(2, { prompt: `Có bao nhiêu tam giác có các đỉnh là đỉnh của đa giác lồi ${n} đỉnh?`, calculation: { kind: "combination", input: { n, k: 3 } }, distractors: [n * (n - 3) / 2, arrangement(n, 3), combination(n, 4)], solution: (answer) => `Mỗi bộ 3 đỉnh của đa giác lồi xác định đúng một tam giác. Số tam giác là C(${n},3) = ${answer}.` }),
    ctx.question(3, { prompt: `Đa giác lồi ${n} đỉnh không có ba đường chéo đồng quy trong miền trong. Có bao nhiêu giao điểm trong của các đường chéo?`, calculation: { kind: "combination", input: { n, k: 4 } }, distractors: [combination(n, 2), combination(n, 3), n * (n - 3) / 2], solution: (answer) => `Mỗi giao điểm trong được xác định duy nhất bởi 4 đỉnh của một tứ giác. Vì không có ba đường chéo đồng quy, số giao điểm là C(${n},4) = ${answer}.` })
  ];
}

function generate2014(ctx) {
  const modulus = ctx.int(4, 8); const residue = ctx.int(1, modulus - 1); const limit = ctx.int(30, 60);
  return [
    ctx.question(1, { prompt: `Theo modulo ${modulus}, phần dư nào cần ghép với phần dư ${residue} để tổng chia hết cho ${modulus}?`, calculation: { kind: "complementResidue", input: { modulus, residue } }, distractors: [residue, modulus, Math.max(0, modulus - residue - 1)], solution: (answer) => `Cần r sao cho ${residue} + r ≡ 0 (mod ${modulus}). Vì vậy r ≡ ${modulus} - ${residue} = ${answer} (mod ${modulus}).` }),
    ctx.question(2, { prompt: `Trong các số từ 1 đến ${limit}, có bao nhiêu số có phần dư ${residue} khi chia cho ${modulus}?`, calculation: { kind: "residueCount", input: { limit, modulus, residue } }, distractors: [Math.floor(limit / modulus), Math.ceil(limit / modulus) + 1, residue], solution: (answer) => `Các số cần tìm tạo thành cấp ${residue}, ${residue + modulus}, ${residue + 2 * modulus}, ... không vượt quá ${limit}. Đếm dãy này được ${answer} số.` }),
    ctx.question(3, { prompt: `Cần ít nhất bao nhiêu số nguyên bất kỳ để chắc chắn có hai số cùng lớp dư modulo ${modulus}?`, calculation: { kind: "sum", input: { values: [modulus, 1] } }, distractors: [modulus, modulus - 1, 2 * modulus], solution: (answer) => `Có ${modulus} lớp dư. Theo nguyên lý Dirichlet, đặt ${modulus + 1} số vào ${modulus} lớp thì chắc chắn có hai số cùng lớp dư. Đáp án là ${answer}.` })
  ];
}

function generate2015(ctx) {
  const base = ctx.int(2, 9); const exponent = ctx.int(7, 20); const modulus = ctx.int(4, 9);
  return [
    ctx.question(1, { prompt: `Phần dư của ${base}^${exponent} khi chia cho ${modulus} là bao nhiêu?`, calculation: { kind: "modPower", input: { base, exponent, modulus } }, distractors: [(base * exponent) % modulus, base % modulus, exponent % modulus], solution: (answer) => `Rút gọn lũy thừa theo modulo ${modulus} và dùng chu kỳ phần dư. Tính bằng lũy thừa modulo cho ${base}^${exponent} ≡ ${answer} (mod ${modulus}).` }),
    ctx.question(2, { prompt: `Chữ số tận cùng của ${base}^${exponent} là bao nhiêu?`, calculation: { kind: "modPower", input: { base, exponent, modulus: 10 } }, distractors: [(base * exponent) % 10, base % 10, exponent % 10], solution: (answer) => `Chữ số tận cùng là phần dư modulo 10. Dãy phần dư của các lũy thừa có chu kỳ; ${base}^${exponent} ≡ ${answer} (mod 10).` }),
    ctx.question(3, { prompt: `Phần dư của ${base}×${exponent}+3 khi chia cho ${modulus} là bao nhiêu?`, calculation: { kind: "modExpression", input: { a: base, b: exponent, c: 3, modulus } }, distractors: [(base + exponent + 3) % modulus, (base * exponent) % modulus, 3], solution: (answer) => `Rút gọn từng số theo modulo ${modulus}: (${base} mod ${modulus})×(${exponent} mod ${modulus})+3. Kết quả có phần dư ${answer}.` })
  ];
}

function generate2016(ctx) {
  const n = ctx.int(7, 10); const members = 3; const a = ctx.int(2, 4); const b = ctx.int(2, 4); const c = ctx.int(1, 3);
  return [
    ctx.question(1, { prompt: `Lập đội gồm 1 đội trưởng và ${members} thành viên từ ${n} người. Có bao nhiêu cách?`, calculation: { kind: "teamLeader", input: { n, members } }, distractors: [combination(n, members + 1), arrangement(n, members + 1), n * members], solution: (answer) => `Chọn đội trưởng có ${n} cách, rồi chọn ${members} thành viên từ ${n - 1} người còn lại: ${n}×C(${n - 1},${members}) = ${answer}.` }),
    ctx.question(2, { prompt: `Một hành trình có hai nhánh: nhánh 1 gồm ${a} lựa chọn ở bước đầu và ${b} ở bước sau; nhánh 2 có ${c} cách đi thẳng. Có bao nhiêu hành trình?`, calculation: { kind: "sum", input: { values: [a * b, c] } }, distractors: [a + b + c, a * b * c, a * b], solution: (answer) => `Nhánh 1 có ${a}×${b}=${a * b} cách theo quy tắc nhân. Hai nhánh rời nhau nên cộng thêm ${c}: ${a * b}+${c}=${answer}.` }),
    ctx.question(3, { prompt: `Chọn một trưởng nhóm rồi chọn 2 thành viên từ ${n} người. Có bao nhiêu cách lập nhóm có phân vai?`, calculation: { kind: "teamLeader", input: { n, members: 2 } }, distractors: [combination(n, 3), arrangement(n, 3), n * (n - 1)], solution: (answer) => `Quyết định theo hai giai đoạn: chọn trưởng nhóm ${n} cách, sau đó chọn 2 người từ ${n - 1} người còn lại. Số cách là ${n}×C(${n - 1},2) = ${answer}.` })
  ];
}

function generate2017(ctx) {
  const n = ctx.int(8, 12); const m = ctx.int(3, Math.min(5, n - 2)); const lines = ctx.int(6, 10);
  return [
    ctx.question(1, { prompt: `Có ${n} điểm, không có ba điểm thẳng hàng. Có bao nhiêu đường thẳng đi qua hai điểm?`, calculation: { kind: "combination", input: { n, k: 2 } }, distractors: [arrangement(n, 2), combination(n, 3), n], solution: (answer) => `Mỗi đường thẳng được xác định bởi một cặp điểm và không có ba điểm thẳng hàng, nên số đường là C(${n},2) = ${answer}.` }),
    ctx.question(2, { prompt: `Có ${n} điểm, trong đó đúng ${m} điểm thẳng hàng và ngoài ra không có ba điểm nào thẳng hàng. Có bao nhiêu tam giác?`, calculation: { kind: "trianglesExcluding", input: { n, m } }, distractors: [combination(n, 3), combination(n, 3) - m, combination(n - m, 3)], solution: (answer) => `Tổng có C(${n},3) bộ ba. C(${m},3) bộ ba nằm trên đường đặc biệt không tạo tam giác. Vậy số tam giác là C(${n},3)-C(${m},3)=${answer}.` }),
    ctx.question(3, { prompt: `Có ${lines} đường thẳng, không đôi nào song song và không ba đường đồng quy. Có bao nhiêu giao điểm?`, calculation: { kind: "combination", input: { n: lines, k: 2 } }, distractors: [arrangement(lines, 2), combination(lines, 3), lines ** 2], solution: (answer) => `Mỗi cặp đường thẳng tạo đúng một giao điểm và không có giao điểm bị đếm bởi ba đường. Số giao điểm là C(${lines},2) = ${answer}.` })
  ];
}

function generate211(ctx) {
  const n = ctx.int(10, 20); const divisor = ctx.int(2, 5); const favorable = Math.floor(n / divisor);
  return [
    ctx.question(1, { prompt: "Gieo một xúc xắc cân đối. Xác suất xuất hiện số chẵn là bao nhiêu?", calculation: { kind: "probability", input: { favorable: 3, total: 6 } }, distractors: ["1/3", "2/3", "1/6"], solution: (answer) => `Không gian mẫu có 6 kết quả đồng khả năng; biến cố số chẵn có {2,4,6}, gồm 3 kết quả. P(A)=3/6=${answer}.` }),
    ctx.question(2, { prompt: "Tung 3 đồng xu phân biệt một lần. Không gian mẫu có bao nhiêu kết quả?", calculation: { kind: "power", input: { base: 2, exponent: 3 } }, distractors: [6, 3, 9], solution: (answer) => `Mỗi đồng xu có 2 kết quả và ba phép tung độc lập về mặt liệt kê. Không gian mẫu có 2³ = ${answer} kết quả.` }),
    ctx.question(3, { prompt: `Chọn ngẫu nhiên một số từ 1 đến ${n}. Xác suất chọn được số chia hết cho ${divisor} là bao nhiêu?`, calculation: { kind: "probability", input: { favorable, total: n } }, distractors: [fraction(divisor, n), fraction(favorable + 1, n), fraction(favorable, n + 1)], solution: (answer) => `Có ${favorable} số chia hết cho ${divisor} trong ${n} kết quả đồng khả năng. Vì vậy P(A)=${favorable}/${n}=${answer}.` })
  ];
}

function generate212(ctx) {
  const n = ctx.int(3, 6); const numerator = ctx.int(2, 7); const denominator = numerator + ctx.int(2, 5);
  return [
    ctx.question(1, { prompt: `Biết P(A) = ${numerator}/${denominator}. Xác suất của biến cố đối Aᶜ là bao nhiêu?`, calculation: { kind: "probabilityComplement", input: { favorable: numerator, total: denominator } }, distractors: [fraction(numerator, denominator), fraction(1, denominator), fraction(denominator - numerator + 1, denominator)], solution: (answer) => `Biến cố A và Aᶜ bù nhau trong không gian mẫu. P(Aᶜ)=1-P(A)=1-${numerator}/${denominator}=${answer}.` }),
    ctx.question(2, { prompt: `Tung đồng xu cân đối ${n} lần. Xác suất có ít nhất một lần ngửa là bao nhiêu?`, calculation: { kind: "probabilityAtLeastOne", input: { total: 2, excluded: 1, n } }, distractors: [fraction(1, 2 ** n), fraction(n, 2 ** n), fraction((2 ** n) - 2, 2 ** n)], solution: (answer) => `Biến cố đối là không có lần ngửa, tức toàn sấp, xác suất (1/2)^${n}. Do đó xác suất cần tìm là 1-(1/2)^${n}=${answer}.` }),
    ctx.question(3, { prompt: `Gieo xúc xắc cân đối ${n} lần. Xác suất xuất hiện ít nhất một mặt 6 là bao nhiêu?`, calculation: { kind: "probabilityAtLeastOne", input: { total: 6, excluded: 5, n } }, distractors: [fraction(5 ** n, 6 ** n), fraction(n, 6 ** n), fraction(1, 6 ** n)], solution: (answer) => `Biến cố đối là cả ${n} lần đều không ra 6, xác suất (5/6)^${n}. Vì vậy xác suất ít nhất một lần ra 6 là 1-(5/6)^${n}=${answer}.` })
  ];
}

function generate213(ctx) {
  const limit = ctx.int(18, 30);
  return [
    ctx.question(1, { prompt: "Mệnh đề nào mô tả đúng A ∪ B?", calculation: { kind: "identity", input: { value: "A xảy ra hoặc B xảy ra, kể cả khi cả hai cùng xảy ra" } }, distractors: ["Chỉ A xảy ra", "A và B cùng xảy ra", "Không biến cố nào xảy ra"], solution: (answer) => `Hợp A ∪ B chứa mọi kết quả thuộc A hoặc thuộc B và cho phép phần giao. Vì vậy đáp án đúng là: “${answer}”.` }),
    ctx.question(2, { prompt: "Biến cố đối của A ∪ B là biểu thức nào?", calculation: { kind: "identity", input: { value: "Aᶜ ∩ Bᶜ" } }, distractors: ["Aᶜ ∪ Bᶜ", "A ∩ B", "Aᶜ ∩ B"], solution: (answer) => `Theo định luật De Morgan, không xảy ra A hoặc B nghĩa là đồng thời không A và không B: (A ∪ B)ᶜ = ${answer}.` }),
    ctx.question(3, { prompt: `Chọn một số từ 1 đến ${limit}. A là biến cố “số chẵn”, B là “số chia hết cho 3”. A ∪ B gồm các số như thế nào?`, calculation: { kind: "identity", input: { value: "Chia hết cho 2 hoặc 3, kể cả chia hết cho 6" } }, distractors: ["Chỉ chia hết cho 6", "Chia hết cho 2 nhưng không chia hết cho 3", "Không chia hết cho 2 và 3"], solution: (answer) => `Từ “hoặc” trong hợp là hoặc bao hàm, nên các số thuộc cả A và B vẫn được giữ. Do đó A ∪ B là các số ${answer.toLowerCase()}.` })
  ];
}

function generate214(ctx) {
  return [
    ctx.question(1, { prompt: "Mệnh đề nào mô tả đúng A ∩ B?", calculation: { kind: "identity", input: { value: "A và B cùng xảy ra" } }, distractors: ["A hoặc B xảy ra", "Chỉ A xảy ra", "Cả A và B đều không xảy ra"], solution: (answer) => `Giao A ∩ B gồm các kết quả đồng thời thuộc cả A và B, tức “${answer}”.` }),
    ctx.question(2, { prompt: "Rút một lá từ bộ 52 lá. A: lá cơ; B: lá J, Q hoặc K. Xác suất A ∩ B là bao nhiêu?", calculation: { kind: "probability", input: { favorable: 3, total: 52 } }, distractors: ["13/52", "12/52", "1/52"], solution: (answer) => `A ∩ B gồm đúng J cơ, Q cơ, K cơ: 3 kết quả trên 52 lá đồng khả năng. P(A ∩ B)=${answer}.` }),
    ctx.question(3, { prompt: "Biến cố đối của A ∩ B là biểu thức nào?", calculation: { kind: "identity", input: { value: "Aᶜ ∪ Bᶜ" } }, distractors: ["Aᶜ ∩ Bᶜ", "A ∪ B", "Aᶜ ∩ B"], solution: (answer) => `Theo định luật De Morgan, không đồng thời xảy ra A và B nghĩa là ít nhất một biến cố không xảy ra: (A ∩ B)ᶜ = ${answer}.` })
  ];
}

function generate215(ctx) {
  return [
    ctx.question(1, { prompt: "Gieo một xúc xắc một lần. Cặp biến cố nào xung khắc?", calculation: { kind: "identity", input: { value: "Ra số chẵn và ra số lẻ" } }, distractors: ["Ra số chẵn và ra số lớn hơn 3", "Ra số chia hết cho 2 và ra số 6", "Ra số nhỏ hơn 5 và ra số chẵn"], solution: (answer) => `Một kết quả không thể vừa chẵn vừa lẻ, nên hai biến cố “${answer}” có giao rỗng và xung khắc.` }),
    ctx.question(2, { prompt: "Nếu A và B xung khắc thì P(A ∩ B) bằng bao nhiêu?", calculation: { kind: "identity", input: { value: "0" } }, distractors: ["1", "P(A)P(B)", "P(A)+P(B)"], solution: (answer) => `Hai biến cố xung khắc không thể cùng xảy ra nên A ∩ B = ∅. Vì vậy P(A ∩ B) = ${answer}.` }),
    ctx.question(3, { prompt: "Với P(A)>0 và P(B)>0, hai biến cố A, B xung khắc có độc lập không?", calculation: { kind: "identity", input: { value: "Không, vì P(A ∩ B)=0 khác P(A)P(B)" } }, distractors: ["Có, vì chúng không cùng xảy ra", "Luôn độc lập từng đôi", "Không thể kết luận vì thiếu P(A ∪ B)"], solution: (answer) => `Xung khắc cho P(A ∩ B)=0, còn P(A)P(B)>0. Điều kiện độc lập không thỏa, nên ${answer.toLowerCase()}.` })
  ];
}

function generate216(ctx) {
  return [
    ctx.question(1, { prompt: "Cho P(A)=1/2, P(B)=2/5 và P(A ∩ B)=1/5. A và B có độc lập không?", calculation: { kind: "identity", input: { value: "Có, vì P(A ∩ B)=P(A)P(B)" } }, distractors: ["Không, vì A và B xung khắc", "Không, vì 1/2+2/5≠1", "Có, vì P(A ∩ B)=0"], solution: (answer) => `P(A)P(B)=(1/2)(2/5)=1/5, đúng bằng P(A ∩ B). Vì vậy ${answer.toLowerCase()}.` }),
    ctx.question(2, { prompt: "Gieo hai đồng xu cân đối. Xác suất đồng thứ nhất ngửa và đồng thứ hai ngửa là bao nhiêu?", calculation: { kind: "probabilityProduct", input: { numerators: [1, 1], denominators: [2, 2] } }, distractors: ["1/2", "3/4", "1/8"], solution: (answer) => `Hai kết quả ở hai đồng xu độc lập. Xác suất cả hai cùng ngửa là (1/2)(1/2)=${answer}.` }),
    ctx.question(3, { prompt: "Nếu A và B độc lập, P(B)>0, đẳng thức nào đúng?", calculation: { kind: "identity", input: { value: "P(A|B)=P(A)" } }, distractors: ["P(A|B)=P(B)", "P(A ∩ B)=0", "P(A ∪ B)=1"], solution: (answer) => `Độc lập nghĩa là biết B xảy ra không làm thay đổi xác suất của A. Vì vậy ${answer}.` })
  ];
}

function generate217(ctx) {
  const a = ctx.int(35, 60); const b = ctx.int(25, 50); const intersection = ctx.int(10, Math.min(a, b) - 5);
  return [
    ctx.question(1, { prompt: `Biết P(A)=${a}%, P(B)=${b}% và P(A ∩ B)=${intersection}%. P(A ∪ B) bằng bao nhiêu?`, calculation: { kind: "percentUnion", input: { a, b, intersection } }, distractors: [`${a + b}%`, `${intersection}%`, `${a + b - 2 * intersection}%`], solution: (answer) => `Phần giao bị cộng hai lần nên trừ một lần: P(A ∪ B)=${a}%+${b}%-${intersection}%=${answer}.` }),
    ctx.question(2, { prompt: `A và B xung khắc với P(A)=${a}% và P(B)=${b}%. P(A ∪ B) bằng bao nhiêu?`, calculation: { kind: "percentUnion", input: { a, b, intersection: 0 } }, distractors: [`${Math.abs(a - b)}%`, `${Math.round((a * b) / 100)}%`, `${Math.max(a, b)}%`], solution: (answer) => `Vì A, B xung khắc nên P(A ∩ B)=0. Công thức cộng rút gọn thành ${a}%+${b}%=${answer}.` }),
    ctx.question(3, { prompt: `Biết P(A)=${a}%, P(B)=${b}% và P(A ∩ B)=${intersection}%. Xác suất đúng một trong hai biến cố xảy ra là bao nhiêu?`, calculation: { kind: "percentExactlyOne", input: { a, b, intersection } }, distractors: [`${a + b - intersection}%`, `${a + b}%`, `${intersection}%`], solution: (answer) => `Đúng một trong hai loại bỏ phần giao khỏi cả hai phía: P(A)+P(B)-2P(A ∩ B)=${a}%+${b}%-2×${intersection}%=${answer}.` })
  ];
}

function generate218(ctx) {
  const red = ctx.int(3, 6); const blue = ctx.int(2, 5); const total = red + blue;
  return [
    ctx.question(1, { prompt: `Hộp có ${red} bi đỏ và ${blue} bi xanh. Rút 2 bi liên tiếp không hoàn lại. Xác suất cả hai bi đỏ là bao nhiêu?`, calculation: { kind: "probabilityProduct", input: { numerators: [red, red - 1], denominators: [total, total - 1] } }, distractors: [fraction(red * red, total * total), fraction(red, total), fraction(red * blue, total * (total - 1))], solution: (answer) => `Lần đầu đỏ có xác suất ${red}/${total}. Không hoàn lại nên lần hai còn ${red - 1} bi đỏ trên ${total - 1} bi. Nhân xác suất có điều kiện: (${red}/${total})((${red - 1})/${total - 1})=${answer}.` }),
    ctx.question(2, { prompt: "Biết P(A)=3/5 và P(B|A)=1/2. P(A ∩ B) bằng bao nhiêu?", calculation: { kind: "probabilityProduct", input: { numerators: [3, 1], denominators: [5, 2] } }, distractors: ["4/7", "3/5", "1/2"], solution: (answer) => `Dùng công thức nhân tổng quát, không giả sử độc lập: P(A ∩ B)=P(A)P(B|A)=(3/5)(1/2)=${answer}.` }),
    ctx.question(3, { prompt: "A và B độc lập với P(A)=2/3, P(B)=3/5. P(A ∩ B) bằng bao nhiêu?", calculation: { kind: "probabilityProduct", input: { numerators: [2, 3], denominators: [3, 5] } }, distractors: ["1", "5/8", "2/3"], solution: (answer) => `Chỉ vì đề cho A, B độc lập nên được nhân trực tiếp: P(A ∩ B)=P(A)P(B)=(2/3)(3/5)=${answer}.` })
  ];
}

export const exerciseGeneratorRegistry = {
  "20.1": generate201, "20.2": generate202, "20.3": generate203, "20.4": generate204,
  "20.5": generate205, "20.6": generate206, "20.7": generate207, "20.8": generate208,
  "20.9": generate209, "20.10": generate2010, "20.11": generate2011, "20.12": generate2012,
  "20.13": generate2013, "20.14": generate2014, "20.15": generate2015, "20.16": generate2016,
  "20.17": generate2017, "21.1": generate211, "21.2": generate212, "21.3": generate213,
  "21.4": generate214, "21.5": generate215, "21.6": generate216, "21.7": generate217,
  "21.8": generate218
};

export const supportedPracticeTopics = Object.keys(exerciseGeneratorRegistry);

export function generatePracticeSet(sourceTopic, seed = "PRACTICE_V1") {
  const generator = exerciseGeneratorRegistry[sourceTopic];
  if (!generator) return [];
  return generator(context(sourceTopic, seed));
}

export function validateGeneratedQuestion(question) {
  return question.type === "multiple-choice"
    && question.options.length === 4
    && new Set(question.options).size === 4
    && question.correctIndex >= 0
    && question.correctIndex < 4
    && question.options[question.correctIndex] === question.correctAnswer
    && question.correctAnswer === evaluateCalculation(question.calculation)
    && Boolean(question.solution?.trim())
    && Boolean(question.sourceTopic);
}
