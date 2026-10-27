"""Generate native BienEdu lesson data from the verified CD01-CD11 PDFs.

This importer is intentionally source-bound: it only emits curriculum codes that
already exist in assets/js/data/curriculum.js, keeps source page provenance and
never creates a mathematical answer that is not present in the PDF solution
section. The generated module is checked in; the browser never opens the PDF.
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

import pymupdf


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "39 chuyên đề"
OUTPUT = ROOT / "assets" / "js" / "data" / "foundation-lessons.generated.js"

DOCUMENTS = (
    {
        "id": "cd01-cd07-functions",
        "name_token": "CD01-CD07",
        "solution_start": 66,
        "lesson_start": 4,
        "lesson_end": 65,
        "allowed_topics": set(range(1, 8)),
    },
    {
        "id": "cd08-cd11-exponential-logarithm",
        "name_token": "CD08-CD11",
        "solution_start": 60,
        "lesson_start": 9,
        "lesson_end": 54,
        "allowed_topics": set(range(8, 12)),
    },
)

# The Excel-backed catalog remains the authority. The second PDF contains 14
# additional headings that are deliberately not emitted until that catalog is
# revised by the content owner.
CATALOG_CODES = {
    1: 10, 2: 9, 3: 10, 4: 11, 5: 9, 6: 13, 7: 9,
    8: 9, 9: 8, 10: 8, 11: 11,
}

VISUAL_DEPENDENCIES = (
    "đồ thị", "bảng biến thiên", "hình vẽ", "hình bên", "hình sau",
    "graph", "parabol trong hình",
)

SPACE_FIXES = {
    "sốmũ": "số mũ", "sốnghiệm": "số nghiệm", "sốđiểm": "số điểm",
    "sốđường": "số đường", "sốcực": "số cực", "sốlần": "số lần",
    "đồthị": "đồ thị", "đểhàm": "để hàm", "đểcó": "để có",
    "đểđạo": "để đạo", "đểtính": "để tính", "đểphương": "để phương",
    "đạohàm": "đạo hàm", "giátrị": "giá trị", "cựcđại": "cực đại",
    "cựctiểu": "cực tiểu", "tậpxácđịnh": "tập xác định",
    "tiếpđiểm": "tiếp điểm", "tiếptuyến": "tiếp tuyến",
    "phânthức": "phân thức", "lôgarit": "lôgarit", "khônggian": "không gian",
    "thựctế": "thực tế", "thểtích": "thể tích", "diệntích": "diện tích",
    "vịtrí": "vị trí", "hệsố": "hệ số", "tửsố": "tử số", "mẫusố": "mẫu số",
    "điềukiện": "điều kiện", "biếnthiên": "biến thiên", "đơnđiệu": "đơn điệu",
    "mỗix": "mỗi x", "mọix": "mọi x", "vớix": "với x", "khix": "khi x",
    "tạix": "tại x", "trênR": "trên R", "trongR": "trong R",
    "hằngsố": "hằng số", "giảthiết": "giả thiết", "tốcđộ": "tốc độ",
    "tỷlệ": "tỷ lệ", "trởthành": "trở thành", "đượctính": "được tính",
    "đượcxác": "được xác", "đượcdùng": "được dùng", "đượcphép": "được phép",
    "đượcchọn": "được chọn", "trừhoặc": "trừ hoặc", "vềcùng": "về cùng",
    "ởbiên": "ở biên", "ởnhững": "ở những", "ởmỗi": "ở mỗi",
    "nàocũng": "nào cũng", "từdữ": "từ dữ", "bịloại": "bị loại",
    "chỉra": "chỉ ra", "phảixét": "phải xét", "phảigiữ": "phải giữ",
    "sốmất": "số mất", "căn về": "căn về ", "độbiến": "độ biến",
    "lệvới": "lệ với", "thếy": "thế y", "thếf": "thế f",
    "theomô": "theo mô", "đạohàm": "đạo hàm", "hàmsố": "hàm số",
    "cơ sốe": "cơ số e", "cơ sốa": "cơ số a", "hệa": "hệ a",
    "tốc độlà": "tốc độ là", "trịtuyệt": "trị tuyệt", "sốđể": "số để",
    "trịnhỏ": "trị nhỏ", "độtrước": "độ trước", "trịcực": "trị cực",
    "sốmốc": "số mốc", "trịcó": "trị có", "thểtối": "thể tối",
    "thửcác": "thử các", "sốnguyên": "số nguyên", "đểtìm": "để tìm",
    "Giữtập": "Giữ tập", "bậc tửhơn": "bậc tử hơn", "đơn vịđể": "đơn vị để",
    "trịtại": "trị tại", "đểghép": "để ghép", "Kẻđường": "Kẻ đường",
    "trịcó": "trị có", "sốgiao": "số giao", "sốgóc": "số góc",
    "sốđối": "số đối", "vềphương": "về phương", "sốrồi": "số rồi",
    "mẫu sốthì": "mẫu số thì", "Đối sốphải": "Đối số phải",
    "sốlớn": "số lớn", "Chỉbình": "Chỉ bình", "sốcó": "số có",
    "vềhai": "về hai", "sốhàm": "số hàm", "trịđặc": "trị đặc",
    "dụđủ": "dụ đủ", "bỏmột": "bỏ một", "đềsai": "đề sai",
    "Thửmột": "Thử một", "trịchỉ": "trị chỉ", "hai vếthành": "hai vế thành",
    "sốdương": "số dương", "sốchưa": "số chưa", "thếđược": "thế được",
    "vếdương": "vế dương", "sốthích": "số thích", "sốcần": "số cần",
    "ẩn phụvà": "ẩn phụ và", "sốgiá": "số giá", "lớn hơn 1 giữchiều": "lớn hơn 1 giữ chiều",
    "thểnhỏ": "thể nhỏ", "sốởvế": "số ở vế", "vếphải": "vế phải",
    "sốhoặc": "số hoặc", "đối sốbằng": "đối số bằng", "sốkỳ": "số kỳ",
    "mỗi kỳbằng": "mỗi kỳ bằng", "mô hình đềcho": "mô hình đề cho",
    "vềtốc": "về tốc", "động giống": "động giống", "sốkỳnguyên": "số kỳ nguyên",
    "đểkhông": "để không", "sốa": "số a", "trịvà": "trị và",
    "độcủa": "độ của", "giữnguyên": "giữ nguyên", "thểtiếp": "thể tiếp",
    "sốtại": "số tại", "giữcác": "giữ các", "cơ sốvà": "cơ số và",
    "đểso": "để so", "cơ sốthì": "cơ số thì", "vếkhông": "vế không",
    "hai vếhoặc": "hai vế hoặc", "vếtăng": "vế tăng", "vếgiảm": "vế giảm",
    "nghiệm cụthể": "nghiệm cụ thể", "giá trịcủa": "giá trị của",
    "ẩn phụcòn": "ẩn phụ còn", "cơ sốgiữa": "cơ số giữa",
    "mẫu sốbằng": "mẫu số bằng", "kỳchỉ": "kỳ chỉ", "kỳkhông": "kỳ không",
    "từtổng": "từ tổng", "kỳtháng": "kỳ tháng", "đềcho": "đề cho",
    "kỳnguyên": "kỳ nguyên", "chu kỳbán": "chu kỳ bán", "chu kỳlà": "chu kỳ là",
    "trừmột": "trừ một", "giá trịcòn": "giá trị còn", "sốtiền": "số tiền",
    "sốk": "số k", "đơn vịthời": "đơn vị thời", "xửlý": "xử lý",
    "nguyên kếtiếp": "nguyên kế tiếp", "đểchọn": "để chọn",
    "độx₀": "độ x₀", "đểf": "để f", "đểx": "để x", "cực trịtừ": "cực trị từ",
    "ởvô": "ở vô", "tỉsố": "tỉ số", "Chỉcó": "Chỉ có",
    "hệ sốtự": "hệ số tự", "đối sốđều": "đối số đều",
    "nhỏnhất": "nhỏ nhất", "giá trịdương": "giá trị dương",
    "Dữkiện": "Dữ kiện", "sốngười": "số người", "cứ2": "cứ 2",
    "giờsố": "giờ số", "sốlượng": "số lượng",
    "độvà": "độ và", "tỉ sốhệ": "tỉ số hệ", "hệ sốđầu": "hệ số đầu",
    "đểy": "để y", "đểtiếp": "để tiếp", "trịy": "trị y",
    "kỳnhỏ": "kỳ nhỏ", "cơ sốnhỏ": "cơ số nhỏ", "giá trịlớn": "giá trị lớn",
    "giá trịlà": "giá trị là", "đểcòn": "để còn",
    "trịcủa": "trị của", "trịtương": "trị tương",
    "thứnhất": "thứ nhất", "thứhai": "thứ hai", "lẻlàm": "lẻ làm",
    "thịđạo": "thị đạo", "độdốc": "độ dốc", "từtrái": "từ trái",
    "độtăng": "độ tăng", "cảu′": "cả u′", "vềđạo": "về đạo",
    "Chỉđọc": "Chỉ đọc", "Chỉlấy": "Chỉ lấy", "Giữnghiệm": "Giữ nghiệm",
    "tất cảgiá": "tất cả giá", "độcao": "độ cao", "kềvà": "kề và",
    "khảthi": "khả thi", "ngờtừ": "ngờ từ", "tửtử": "tử tử",
    "Giữmiền": "Giữ miền", "thịtheo": "thị theo", "Chỉsử": "Chỉ sử",
    "tung độtiếp": "tung độ tiếp", "thểđổi": "thể đổi", "Chỉrút": "Chỉ rút",
    "đủbác": "đủ bác", "tửchung": "tử chung", "vềx": "về x",
    "vềđiều": "về điều", "thịnằm": "thị nằm", "bỏsót": "bỏ sót",
    "độkhông": "độ không", "tựđộng": "tự động", "lệqua": "lệ qua",
    "hoành độtiếp": "hoành độ tiếp", "tựthay": "tự thay", "đềkhông": "đề không",
    "giờtrước": "giờ trước", "tỷ lệkhông": "tỷ lệ không", "không ởt": "không ở t",
}

SUPERSCRIPT_MAP = str.maketrans({
    "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵",
    "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻", "−": "⁻",
    "/": "⁄", ",": "˒", "(": "⁽", ")": "⁾", "a": "ᵃ", "b": "ᵇ", "c": "ᶜ",
    "d": "ᵈ", "e": "ᵉ", "f": "ᶠ", "g": "ᵍ", "h": "ʰ", "i": "ⁱ", "j": "ʲ",
    "k": "ᵏ", "m": "ᵐ", "n": "ⁿ", "p": "ᵖ", "r": "ʳ", "s": "ˢ", "t": "ᵗ",
    "u": "ᵘ", "v": "ᵛ", "w": "ʷ", "x": "ˣ", "y": "ʸ", "z": "ᶻ",
})
SUBSCRIPT_MAP = str.maketrans({
    "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅",
    "6": "₆", "7": "₇", "8": "₈", "9": "₉", "+": "₊", "-": "₋", "−": "₋",
    "a": "ₐ", "e": "ₑ", "h": "ₕ", "i": "ᵢ", "j": "ⱼ", "k": "ₖ", "l": "ₗ",
    "m": "ₘ", "n": "ₙ", "o": "ₒ", "p": "ₚ", "r": "ᵣ", "s": "ₛ", "t": "ₜ", "x": "ₓ",
})


def clean_text(value: str) -> str:
    value = value.replace("\u00ad", "").replace("\ufb00", "ff")
    value = re.sub(r"\s+", " ", value).strip()
    value = re.sub(r"Ví dụ\s*(\d+)\s*\.", r"Ví dụ \1.", value)
    value = value.replace("̸ =", "≠").replace("̸=", "≠")
    # PyMuPDF exposes stacked fraction denominators as lowered spans. Recover
    # the two recurring rational forms before ordinary subscript conversion.
    value = re.sub(r"(\d+)\s+_\(\(([^()]+)\)2\)", r"\1/(\2)²", value)
    value = re.sub(r"(\d+)\s+_\(\(([^()]+)\)\)2", r"\1/(\2)²", value)
    value = value.replace("log_(a(x))", "logₐ₍ₓ₎")
    for _ in range(2):
        for old, new in SPACE_FIXES.items():
            def preserve_case(match: re.Match[str]) -> str:
                replacement = new
                if match.group(0)[:1].isupper():
                    replacement = replacement[:1].upper() + replacement[1:]
                return replacement
            value = re.sub(re.escape(old), preserve_case, value, flags=re.IGNORECASE)
    value = re.sub(r"\^\(([^()]*)\)", lambda match: match.group(1).translate(SUPERSCRIPT_MAP), value)
    value = re.sub(r"_\(([^()]*)\)", lambda match: match.group(1).translate(SUBSCRIPT_MAP), value)
    # A few two-dimensional expressions are split into separate PDF spans.
    # These substitutions restore the exact expression visible in the source.
    value = value.replace("²ˣ⁺¹ ₓ₋₁", "(2x+1)/(x−1)")
    value = value.replace("−ˣ⁻² ₂", "−(x−2)/2")
    value = value.replace("8 √ ²", "8^(√2)").replace("4 √ ³", "4^(√3)")
    value = value.replace("2³ √ ²", "2^(3√2)").replace("2² √ ³", "2^(2√3)")
    value = value.replace("A = P(1 + r)N", r"\(A=P(1+r)^N\)")
    value = value.replace("N(t) = N₀qᵗ⁄T", r"\(N(t)=N_0q^{t/T}\)")
    value = value.replace("M(t) = M₀ 2⁻ᵗ⁄T", r"\(M(t)=M_0 2^{-t/T}\)")
    value = value.replace("C = y₁e⁻ᵏᵗ¹", r"\(C=y_1e^{-kt_1}\)")
    value = value.replace("sau đó Thử", "sau đó thử").replace("hai Dữ kiện", "hai dữ kiện")
    return re.sub(r"\s+", " ", value).strip()


def block_text(block: dict) -> str:
    chunks: list[str] = []
    for line in block.get("lines", []):
        line_chunks: list[str] = []
        spans = line.get("spans", [])
        regular_sizes = [span.get("size", 0) for span in spans if span.get("text", "").strip()]
        base_size = max(regular_sizes, default=0)
        base_origins = [
            span.get("origin", (0, 0))[1]
            for span in spans
            if span.get("text", "").strip() and span.get("size", base_size) >= base_size * 0.86
        ]
        baseline = sum(base_origins) / len(base_origins) if base_origins else 0
        superscript = ""
        subscript = ""
        for span in spans:
            text = span.get("text", "")
            if not text:
                continue
            is_small = span.get("size", base_size) < base_size * 0.86 and text not in {"′", "″"}
            vertical_offset = span.get("origin", (0, baseline))[1] - baseline
            is_superscript = is_small and vertical_offset < -0.8
            is_subscript = is_small and vertical_offset > 0.8
            if is_superscript and text.strip():
                superscript += text.strip()
                continue
            if is_subscript and text.strip():
                subscript += text.strip()
                continue
            if superscript:
                line_chunks.append(f"^({superscript})")
                superscript = ""
            if subscript:
                line_chunks.append(f"_({subscript})")
                subscript = ""
            line_chunks.append(text)
        if superscript:
            line_chunks.append(f"^({superscript})")
        if subscript:
            line_chunks.append(f"_({subscript})")
        chunks.append("".join(line_chunks))
    return clean_text(" ".join(chunks))


def page_blocks(document: pymupdf.Document, start: int, end: int) -> list[dict]:
    output: list[dict] = []
    for page_number in range(start, end + 1):
        page = document[page_number - 1]
        blocks = page.get_text("dict").get("blocks", [])
        for block in blocks:
            text = block_text(block)
            compact = text.replace(" ", "").upper()
            if (
                not text
                or text == str(page_number)
                or compact in {"HÀMSỐVÀĐẠOHÀM", "MŨVÀLÔGARIT", "BIENNOBIENGIOI"}
                or compact.startswith("HÀMSỐVÀĐẠOHÀMBIENNOBIENGIOI")
                or compact.startswith("MŨVÀLÔGARITBIENNOBIENGIOI")
            ):
                continue
            bbox = block.get("bbox", [0, 0, 0, 0])
            output.append({"page": page_number, "y": bbox[1], "text": text})
    # Keep the PDF text-layer reading order. Sorting by y would place a
    # fraction's numerator before the sentence that introduces it.
    return output


def heading_code(text: str) -> str | None:
    match = re.match(r"(?:Dạng\s+)?((?:[1-9]|10|11)\.\d+)\s*(?:[.–-])", text)
    return match.group(1) if match else None


def expected_codes(topics: set[int]) -> set[str]:
    return {
        f"{topic}.{index}"
        for topic in topics
        for index in range(1, CATALOG_CODES[topic] + 1)
    }


def split_sections(blocks: list[dict], allowed: set[str]) -> dict[str, list[dict]]:
    starts: list[tuple[int, str]] = []
    seen: set[str] = set()
    for index, block in enumerate(blocks):
        code = heading_code(block["text"])
        if code in allowed and code not in seen:
            starts.append((index, code))
            seen.add(code)
    sections: dict[str, list[dict]] = {}
    for position, (start, code) in enumerate(starts):
        end = starts[position + 1][0] if position + 1 < len(starts) else len(blocks)
        sections[code] = blocks[start:end]
    return sections


def numbered_items(blocks: list[dict]) -> dict[int, dict]:
    items: dict[int, dict] = {}
    current: int | None = None
    for block in blocks:
        text = block["text"]
        match = re.match(r"Ví dụ\s*(\d+)\.\s*(.*)", text)
        if match:
            current = int(match.group(1))
            items[current] = {"page": block["page"], "parts": [match.group(2).strip()]}
        elif current is not None and not heading_code(text):
            items[current]["parts"].append(text)
    for item in items.values():
        item["text"] = clean_text(" ".join(item.pop("parts")))
    return items


def method_from(section: list[dict]) -> tuple[str, str | None]:
    method_parts: list[str] = []
    note: str | None = None
    collecting = False
    for block in section[1:]:
        text = block["text"]
        if re.match(r"Ví dụ\s*1\.", text):
            break
        if text.startswith("Cách làm."):
            collecting = True
            method_parts.append(text.removeprefix("Cách làm.").strip())
        elif collecting:
            method_parts.append(text)
    for block in section:
        text = block["text"]
        if text.startswith(("Chú ý.", "Lưu ý.")):
            note = text.split(".", 1)[1].strip() if "." in text else text
            break
    return clean_text(" ".join(method_parts)), note


def concise_title(prompt: str, number: int) -> str:
    plain = re.sub(r"\s+", " ", prompt).strip()
    first = re.split(r"(?<=[.!?])\s+", plain, maxsplit=1)[0]
    if len(first) > 72:
        first = first[:69].rsplit(" ", 1)[0] + "…"
    return first or f"Ví dụ {number}"


FOUNDATION_FORMULA_SPECS: dict[str, list[dict]] = {
    "1.7": [
        {"match": "Tích:", "expressions": [r"(uv)'=u'v+uv'"]},
        {"match": "Thương:", "expressions": [r"\left(\frac{u}{v}\right)'=\frac{u'v-uv'}{v^2},\quad v\ne0"]},
    ],
    "3.6": [{"match": "f′=0", "expressions": [r"f'(x)=0"]}],
    "3.8": [{"match": "f=0", "expressions": [r"f(x)=0"]}],
    "3.9": [
        {"match": "f′(t)=0", "expressions": [r"f'(t)=0,\quad t>0"]},
        {"match": "x=0", "expressions": [r"x=0"]},
    ],
    "7.1": [{"match": "f(x0)", "expressions": [r"f(x_0)", r"f'(x_0)"]}],
    "7.3": [{"match": "f′(x0)=k", "expressions": [r"f'(x_0)=k"]}],
    "8.3": [{
        "match": "logₐ₍ₓ₎",
        "expressions": [r"\log_{a(x)}u(x)", r"a(x)>0,\quad a(x)\ne1,\quad u(x)>0"],
    }],
    "8.6": [{"match": "y = aˣ", "expressions": [r"y=a^x"]}],
    "8.7": [{"match": "x > 0", "expressions": [r"x>0"]}],
    "9.3": [
        {"match": "t = aˣ > 0", "expressions": [r"t=a^x>0"]},
        {"match": "t = logₐ x", "expressions": [r"t=\log_a x"]},
    ],
    "9.4": [{"match": "ln(aᵘ) = u ln a", "expressions": [r"\ln(a^u)=u\ln a"]}],
    "9.7": [{"match": "t > 0", "expressions": [r"t>0"]}],
    "9.8": [{"match": "t = aˣ", "expressions": [r"t=a^x,\quad t>0"]}],
    "10.2": [{
        "match": "f(x) > f(x₀)",
        "expressions": [r"f(x)>f(x_0)", r"f(x)\le f(x_0)"],
    }],
    "10.3": [{
        "match": "t = aˣ > 0",
        "expressions": [r"t=a^x>0", r"t=\log_a x"],
    }],
    "10.5": [{"match": "aᵘ > 0", "expressions": [r"a^u>0"]}],
    "11.1": [{
        "match": "A = P(1 + nr)",
        "expressions": [r"A=P(1+nr)", r"I=Pnr"],
    }],
    "11.2": [
        {"match": "A=P(1+r)^N", "expressions": [r"A=P(1+r)^N"]},
        {"match": "A = P(1 + r/m)ᵐᵗ", "expressions": [r"A=P\left(1+\frac{r}{m}\right)^{mt}"]},
    ],
    "11.3": [
        {"match": "Pₙ = P₀(1+r)ⁿ", "expressions": [r"P_n=P_0(1+r)^n"]},
        {"match": "P(t) = P₀eʳᵗ", "expressions": [r"P(t)=P_0e^{rt}"]},
    ],
    "11.4": [
        {"match": "N(t) = N₀eᵏᵗ", "expressions": [r"N(t)=N_0e^{kt}"]},
        {"match": "N(t)=N_0q^{t/T}", "expressions": [r"N(t)=N_0q^{t/T}"]},
    ],
    "11.5": [
        {"match": "M(t) = M₀e⁻ᵏᵗ", "expressions": [r"M(t)=M_0e^{-kt},\quad k>0"]},
        {"match": "M(t)=M_0 2^{-t/T}", "expressions": [r"M(t)=M_0 2^{-t/T}", r"k=\frac{\ln 2}{T}"]},
    ],
    "11.6": [{
        "match": "Vₙ = V₀(1 −r)ⁿ",
        "expressions": [r"V_n=V_0(1-r)^n,\quad 0<r<1"],
    }],
    "11.8": [
        {"match": "C = y(0) > 0", "expressions": [r"C=y(0)>0"]},
        {"match": "k > 0 tăng", "expressions": [r"k>0", r"k<0", r"k=0"]},
        {"match": "y = L + Ceᵏᵗ", "expressions": [r"y=L+Ce^{kt}", r"y(0)=L+C"]},
    ],
    "11.9": [
        {"match": "y′(t) = ky(t)", "expressions": [r"y'(t)=ky(t)"]},
        {"match": "y(t) = y₀eᵏᵗ", "expressions": [r"y(t)=y_0e^{kt}"]},
        {"match": "g(t) = ln y(t)", "expressions": [r"g(t)=\ln y(t)", r"g'(t)=k", r"g(t)=kt+\ln y_0"]},
    ],
    "11.10": [
        {
            "match": "k = ln(y₂/y₁)/(t₂ −t₁)",
            "expressions": [
                r"y(t)=Ce^{kt}>0",
                r"k=\frac{\ln\left(\frac{y_2}{y_1}\right)}{t_2-t_1}",
            ],
        },
        {"match": "C=y_1e^{-kt_1}", "expressions": [r"C=y_1e^{-kt_1}"]},
    ],
}


def source_formulae(code: str, method_sentences: list[str]) -> list[dict]:
    """Build verified KaTeX cards from exact formulae in the source method."""
    formulae: list[dict] = []
    for spec in FOUNDATION_FORMULA_SPECS.get(code, []):
        source = next((sentence for sentence in method_sentences if spec["match"] in sentence), None)
        if source is None:
            raise ValueError(f"{code}: source formula fragment not found: {spec['match']}")
        expressions = spec["expressions"]
        formulae.append({
            "label": "Công thức & điều kiện",
            "value": expressions[0],
            "expressions": expressions,
            "detail": source,
        })
    return formulae


def make_lesson(code: str, theory: list[dict], solutions: list[dict], document_id: str) -> tuple[dict, list[dict]]:
    method, note = method_from(theory)
    source_page = theory[0]["page"]
    method_sentences = [part.strip() for part in re.split(r";|(?<=[.!?])\s+", method) if part.strip()]
    if not method_sentences:
        method_sentences = ["Đọc kỹ điều kiện và thực hiện theo đúng quy trình của dạng bài trong tài liệu nguồn."]
    reading = {
        "lead": method,
        "formulae": source_formulae(code, method_sentences),
        "points": [
            {"label": f"Bước {index + 1:02d}", "text": sentence}
            for index, sentence in enumerate(method_sentences[:4])
        ],
        "note": {
            "label": "Lưu ý từ tài liệu",
            "text": note or "Giữ đầy đủ điều kiện xác định và kiểm tra lại kết quả theo yêu cầu của đề bài.",
            "tone": "warning" if note else "tip",
        },
        "layout": "principles-split",
        "sourcePages": [source_page],
        "sourceDocumentId": document_id,
    }

    prompts = numbered_items(theory)
    answers = numbered_items(solutions)
    examples: list[dict] = []
    candidates = [
        number for number, prompt in prompts.items()
        if number in answers
        and not any(token.replace(" ", "") in prompt["text"].lower().replace(" ", "") for token in VISUAL_DEPENDENCIES)
    ]
    # One complete worked example per form matches the established CD12-CD14
    # lesson density and avoids publishing examples whose source diagram is not
    # representable as native text.
    if candidates:
        number = candidates[0]
        prompt = prompts[number]
        answer = answers[number]
        prompt_text = prompt["text"]
        answer_text = answer["text"]
        title = concise_title(prompt_text, number)
        if code == "8.4" and number == 1:
            # The radical is the exponent in the source, but the PDF text layer
            # separates it from its base. Keep an explicit, renderable formula.
            title = "So sánh hai lũy thừa"
            prompt_text = r"So sánh \(A=8^{\sqrt{2}}\) và \(B=4^{\sqrt{3}}\)."
            answer_text = (
                r"\(A=2^{3\sqrt{2}},\ B=2^{2\sqrt{3}}\). Hai số mũ dương và "
                r"\((3\sqrt{2})^2=18>12=(2\sqrt{3})^2\), nên "
                r"\(3\sqrt{2}>2\sqrt{3}\). Vì \(2>1\), suy ra \(A>B\)."
            )
        examples.append({
            "id": f"{code}-source-example-{number}",
            "title": title,
            "prompt": prompt_text,
            "analysis": [method_sentences[0], "Đối chiếu điều kiện trước khi kết luận."],
            "steps": [{
                "label": "Lời giải từ tài liệu",
                "expression": answer_text,
                "text": "Nội dung được chuyển đổi từ phần lời giải của đúng ví dụ trong PDF nguồn.",
            }],
            "answer": answer_text,
            "takeaway": method_sentences[0],
            "sourcePages": sorted({prompt["page"], answer["page"]}),
            "sourceBlockId": f"{code}-worked-example-{number}",
            "origin": "verified-source",
            "verification": "source-transcribed",
        })
    return reading, examples


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    knowledge: dict[str, dict] = {}
    examples: dict[str, list[dict]] = {}
    audit: dict[str, dict] = {}

    names = os.listdir(SOURCE_DIR)
    for spec in DOCUMENTS:
        file_name = next(name for name in names if spec["name_token"] in name)
        path = SOURCE_DIR / file_name
        document = pymupdf.open(path)
        allowed = expected_codes(spec["allowed_topics"])
        theory = split_sections(page_blocks(document, spec["lesson_start"], spec["lesson_end"]), allowed)
        solutions = split_sections(page_blocks(document, spec["solution_start"], len(document)), allowed)
        missing_theory = sorted(allowed - theory.keys())
        missing_solutions = sorted(allowed - solutions.keys())
        if missing_theory or missing_solutions:
            raise RuntimeError(f"{file_name}: missing theory={missing_theory}, solutions={missing_solutions}")
        for code in sorted(allowed, key=lambda item: tuple(map(int, item.split(".")))):
            reading, worked = make_lesson(code, theory[code], solutions[code], spec["id"])
            if not reading["lead"]:
                raise RuntimeError(f"{file_name}: incomplete native lesson {code}")
            knowledge[code] = reading
            examples[code] = worked
        audit[spec["id"]] = {
            "fileName": file_name,
            "lessonCount": len(allowed),
            "knowledgeCount": sum(1 for code in allowed if code in knowledge),
            "workedExampleCount": sum(len(examples.get(code, [])) for code in allowed),
        }

    payload = (
        "// Generated by scripts/import-foundation-documents.py from the verified source PDFs.\n"
        "// Do not hand-edit; rerun the importer after replacing a registered source document.\n"
        f"const knowledge = {json.dumps(knowledge, ensure_ascii=False, indent=2)};\n\n"
        f"const examples = {json.dumps(examples, ensure_ascii=False, indent=2)};\n\n"
        f"export const foundationImportAudit = Object.freeze({json.dumps(audit, ensure_ascii=False, indent=2)});\n"
        "export const foundationKnowledgeContent = Object.freeze(knowledge);\n"
        "export const foundationExampleContent = Object.freeze(examples);\n"
        "const foundationCodes = Object.keys(knowledge);\n"
        "export const foundationKnowledgeSections = Object.freeze(Object.fromEntries(foundationCodes.map((code, index) => {\n"
        "  const topicNumber = code.split('.')[0];\n"
        "  const next = foundationCodes[index + 1];\n"
        "  const endsBefore = next?.startsWith(`${topicNumber}.`) ? next : `END_CD${topicNumber.padStart(2, '0')}`;\n"
        "  const sourceId = knowledge[code].sourceDocumentId;\n"
        "  const sourcePages = knowledge[code].sourcePages;\n"
        "  return [code, { sourceId, startsAt: code, endsBefore, knowledgeSlides: [{ id: `${code}-knowledge-1`, src: null, sourcePages, crops: [] }], exampleSlides: examples[code].map((example) => ({ id: example.id, src: null, sourcePages: example.sourcePages, crops: [] })), slides: [{ id: `${code}-knowledge-1`, src: null, sourcePages, crops: [] }] }];\n"
        "})));\n"
    )
    OUTPUT.write_text(payload, encoding="utf-8")
    print(json.dumps({"output": str(OUTPUT.relative_to(ROOT)), "documents": audit}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
