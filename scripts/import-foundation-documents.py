"""Generate native BienEdu lesson data from the verified CD01-CD11 PDFs.

This importer is intentionally source-bound: it only emits curriculum codes that
already exist in assets/js/data/curriculum.js, keeps source page provenance and
never creates a mathematical answer that is not present in the PDF solution
section. The generated module is checked in; the browser never opens the PDF.
"""

from __future__ import annotations

import json
import hashlib
import os
import re
import sys
from pathlib import Path

import pymupdf


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "39 chuyên đề"
OUTPUT = ROOT / "assets" / "js" / "data" / "foundation-lessons.generated.js"
FIGURE_ROOT = ROOT / "assets" / "content" / "final-pdf"

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
        "lesson_end": 58,
        "allowed_topics": set(range(8, 12)),
    },
)

# The finalized tutor PDFs are authoritative for CD01-CD11. Document B adds
# fourteen real problem types that were absent from the original Excel catalog.
CATALOG_CODES = {
    1: 10, 2: 9, 3: 10, 4: 11, 5: 9, 6: 13, 7: 9,
    8: 14, 9: 11, 10: 10, 11: 15,
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


def normalize_nested_span_marker(value: str, marker: str, replacement: str) -> str:
    """Resolve balanced PDF span markers left behind by nested parentheses."""
    cursor = 0
    while True:
        start = value.find(marker, cursor)
        if start < 0:
            return value
        depth = 0
        end = None
        for index in range(start + len(marker) - 1, len(value)):
            if value[index] == "(":
                depth += 1
            elif value[index] == ")":
                depth -= 1
                if depth == 0:
                    end = index
                    break
        if end is None:
            return value
        inner = value[start + len(marker):end]
        value = value[:start] + replacement.format(inner=inner) + value[end + 1:]
        cursor = start + 1


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
    value = value.replace("−ˣ⁻² ₂", "−(x−2)/2").replace("⁻ˣ⁻² ₂", "−(x−2)/2")
    value = value.replace("8 √ ²", "8^(√2)").replace("4 √ ³", "4^(√3)")
    value = value.replace("2³ √ ²", "2^(3√2)").replace("2² √ ³", "2^(2√3)")
    value = value.replace("A = P(1 + r)N", r"\(A=P(1+r)^N\)")
    value = value.replace("N(t) = N₀qᵗ⁄T", r"\(N(t)=N_0q^{t/T}\)")
    value = value.replace("M(t) = M₀ 2⁻ᵗ⁄T", r"\(M(t)=M_0 2^{-t/T}\)")
    value = value.replace("C = y₁e⁻ᵏᵗ¹", r"\(C=y_1e^{-kt_1}\)")
    value = value.replace("sau đó Thử", "sau đó thử").replace("hai Dữ kiện", "hai dữ kiện")
    value = normalize_nested_span_marker(value, "_(", "/({inner})")
    value = re.sub(r"√\s+([⁰¹²³⁴⁵⁶⁷⁸⁹])", r"√\1", value)
    value = value.replace("²ˣ⁺¹", "^(2x+1)").replace("−ˣ⁻²", "^(−x−2)")
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
            output.append({
                "page": page_number,
                "x0": bbox[0], "y0": bbox[1], "x1": bbox[2], "y1": bbox[3],
                "y": bbox[1],
                "text": text,
            })
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
            if current is not None and block["page"] == items[current]["page"]:
                items[current]["y1"] = max(items[current]["y1"], block["y0"] - 4)
            current = int(match.group(1))
            items[current] = {
                "page": block["page"],
                "lastPage": block["page"],
                "x0": block["x0"], "y0": block["y0"],
                "x1": block["x1"], "y1": block["y1"],
                "parts": [match.group(2).strip()],
            }
        elif current is not None and not heading_code(text):
            if text.startswith(("Chú ý.", "Lưu ý.", "Cách làm.")):
                current = None
                continue
            items[current]["parts"].append(text)
            items[current]["lastPage"] = block["page"]
            items[current]["x0"] = min(items[current]["x0"], block["x0"])
            items[current]["x1"] = max(items[current]["x1"], block["x1"])
            if block["page"] == items[current]["page"]:
                items[current]["y1"] = max(items[current]["y1"], block["y1"])
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


def source_region_asset(
    document: pymupdf.Document,
    document_id: str,
    code: str,
    number: int,
    item: dict,
) -> dict:
    """Extract the exact source region for examples whose meaning depends on a figure."""
    page = document[item["page"] - 1]
    clip = pymupdf.Rect(
        max(18, item["x0"] - 18),
        max(18, item["y0"] - 10),
        min(page.rect.width - 18, max(item["x1"] + 18, page.rect.width - 36)),
        min(page.rect.height - 18, item["y1"] + 12),
    )
    output_dir = FIGURE_ROOT / document_id / code
    output_dir.mkdir(parents=True, exist_ok=True)
    file_name = f"example-{number}-figure-1.png"
    output_path = output_dir / file_name
    page.get_pixmap(matrix=pymupdf.Matrix(2.4, 2.4), clip=clip, alpha=False).save(output_path)
    return {
        "id": f"{code}-example-{number}-figure-1",
        "src": "/" + output_path.relative_to(ROOT).as_posix(),
        "alt": f"Hình gốc của Ví dụ {number}, dạng {code}",
        "sourcePage": item["page"],
        "sourceRegion": [round(value, 2) for value in (clip.x0, clip.y0, clip.x1, clip.y1)],
        "reviewStatus": "source-extracted-needs-visual-review",
    }


def problem_type_title(section: list[dict], code: str) -> str:
    heading = section[0]["text"]
    title = re.sub(rf"^(?:Dạng\s+)?{re.escape(code)}\s*(?:[.–-])?\s*", "", heading).strip()
    title = title.split("Cách làm.", 1)[0].strip()
    return title or f"Dạng {code}"


def extract_topic_knowledge(blocks: list[dict], topic: int, document_id: str) -> dict:
    topic_pattern = re.compile(rf"^CD0?{topic}\s*[.–-]")
    start = next((index for index, block in enumerate(blocks) if topic_pattern.match(block["text"])), None)
    first_code = f"{topic}.1"
    end = next((index for index, block in enumerate(blocks) if heading_code(block["text"]) == first_code), None)
    if start is None or end is None or end <= start:
        return {
            "lead": "Nội dung kiến thức nguồn chưa thể tách chắc chắn.",
            "formulae": [], "points": [], "layout": "article",
            "sourcePages": [], "reviewStatus": "needs-review",
        }
    selected = blocks[start:end]
    heading_text = selected[0]["text"]
    topic_title = heading_text.split("Kiến thức cần nhớ", 1)[0]
    topic_title = re.sub(rf"^CD0?{topic}\s*[.–-]\s*", "", topic_title).strip()
    text = clean_text(" ".join(block["text"] for block in selected))
    text = re.sub(rf"^CD0?{topic}\s*[.–-]\s*", "", text)
    text = re.sub(r"^.*?Kiến thức cần nhớ\s*", "", text, count=1)
    return {
        "title": topic_title or f"Kiến thức CD{topic:02d}",
        "lead": text,
        "formulae": [],
        "points": [],
        "layout": "article",
        "sourcePages": sorted({block["page"] for block in selected}),
        "sourceDocumentId": document_id,
        "topicId": f"CD{topic:02d}",
        "contentType": "source-transcription",
        "reviewStatus": "needs-review",
        "contentVersion": "final-pdf-v2",
    }


SHARED_KNOWLEDGE_REFS = {
    "CD08": ["shared-1", "shared-2", "shared-3", "shared-5", "shared-7"],
    "CD09": ["shared-1", "shared-2", "shared-4"],
    "CD10": ["shared-1", "shared-2", "shared-3", "shared-4", "shared-6"],
    "CD11": ["shared-1", "shared-2", "shared-5", "shared-7"],
}


def extract_shared_knowledge(blocks: list[dict], document_id: str) -> dict[str, dict]:
    titles = {
        1: "Lũy thừa", 2: "Lôgarit", 3: "Hàm số mũ và lôgarit",
        4: "Phương trình và bất phương trình", 5: "Căn bậc n, số e và điều kiện",
        6: "Bảng giải nhanh bất phương trình", 7: "Đạo hàm và nguyên hàm mũ – lôgarit",
    }
    starts: list[tuple[int, int]] = []
    for index, block in enumerate(blocks):
        match = re.match(r"([1-7])\.\s+", block["text"])
        if match and int(match.group(1)) not in {number for _, number in starts}:
            starts.append((index, int(match.group(1))))
    modules: dict[str, dict] = {}
    for position, (start, number) in enumerate(starts):
        end = starts[position + 1][0] if position + 1 < len(starts) else len(blocks)
        selected = blocks[start:end]
        text = clean_text(" ".join(block["text"] for block in selected))
        text = re.sub(rf"^{number}\.\s*", "", text)
        title = titles[number]
        text = re.sub(rf"^{re.escape(title)}\s*", "", text, count=1)
        modules[f"shared-{number}"] = {
            "id": f"shared-{number}",
            "title": title,
            "lead": text,
            "formulae": [], "points": [], "layout": "article",
            "sourcePages": sorted({block["page"] for block in selected}),
            "sourceDocumentId": document_id,
            "contentType": "shared-source-transcription",
            "reviewStatus": "needs-review",
            "contentVersion": "final-pdf-v2",
        }
    return modules


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


def cd01_source_overview() -> dict:
    """Reviewed transcription of the CD01 “Kiến thức cần nhớ” block on page 4."""
    return {
        "title": "Đạo hàm và ứng dụng cơ bản",
        "lead": (
            r"Đạo hàm tại \(x_0\) là "
            r"\(f'(x_0)=\lim_{h\to0}\frac{f(x_0+h)-f(x_0)}{h}\) khi giới hạn hữu hạn tồn tại. "
            "Có đạo hàm tại một điểm thì liên tục tại điểm đó; chiều ngược lại không đúng."
        ),
        "formulae": [
            {
                "label": "Quy tắc đại số",
                "value": r"(c)'=0",
                "expressions": [
                    r"(c)'=0", r"(x^n)'=nx^{n-1}", r"(u+v)'=u'+v'",
                    r"(uv)'=u'v+uv'", r"\left(\frac{u}{v}\right)'=\frac{u'v-uv'}{v^2}",
                ],
                "detail": "Các công thức được dùng trên miền có nghĩa và có đạo hàm; quy tắc thương cần mẫu khác 0.",
            },
            {
                "label": "Hàm hợp và căn thức",
                "value": r"[f(u)]'=f'(u)u'",
                "expressions": [r"[f(u)]'=f'(u)u'", r"(\sqrt{u})'=\frac{u'}{2\sqrt{u}},\quad u>0"],
                "detail": "Công thức đạo hàm căn chỉ áp dụng khi biểu thức dưới căn dương.",
            },
            {
                "label": "Lượng giác",
                "value": r"(\sin u)'=u'\cos u",
                "expressions": [
                    r"(\sin u)'=u'\cos u", r"(\cos u)'=-u'\sin u",
                    r"(\tan u)'=\frac{u'}{\cos^2u}", r"(\cot u)'=-\frac{u'}{\sin^2u}",
                ],
                "detail": "Các công thức lượng giác dùng đơn vị radian.",
            },
            {
                "label": "Mũ và lôgarit",
                "value": r"(e^u)'=u'e^u",
                "expressions": [
                    r"(e^u)'=u'e^u", r"(a^u)'=u'a^u\ln a",
                    r"(\ln u)'=\frac{u'}{u}", r"(\log_a u)'=\frac{u'}{u\ln a}",
                ],
                "detail": "Với hàm mũ và lôgarit: a > 0, a ≠ 1; lôgarit yêu cầu u > 0.",
            },
            {
                "label": "Đạo hàm cấp hai và chuyển động",
                "value": r"y''=(y')'",
                "expressions": [r"y''=(y')'", r"v(t)=s'(t)", r"a(t)=v'(t)=s''(t)"],
                "detail": "Tốc độ bằng |v(t)|, không phải lúc nào cũng bằng v(t); đơn vị phải nhất quán.",
            },
            {
                "label": "Công thức mở rộng",
                "value": r"(u^n)'=nu^{n-1}u'",
                "expressions": [
                    r"(u^n)'=nu^{n-1}u'", r"(u^\alpha)'=\alpha u^{\alpha-1}u'",
                    r"\left(\frac{ax+b}{cx+d}\right)'=\frac{ad-bc}{(cx+d)^2}",
                ],
                "detail": "Lũy thừa mũ thực dùng trên u > 0; phân thức được xét tại các điểm mẫu khác 0.",
            },
        ],
        "points": [
            {
                "label": "Miền áp dụng",
                "text": "Luôn giữ miền có nghĩa; căn thức có thể xác định ở biên u = 0 nhưng công thức đạo hàm căn chỉ dùng với u > 0.",
            },
            {
                "label": "Biên và giá trị tuyệt đối",
                "text": "Muốn xét đạo hàm ở biên phải dùng định nghĩa phù hợp; ln|u| có đạo hàm u′/u trên u ≠ 0.",
            },
            {
                "label": "Đạo hàm cấp hai",
                "text": "Khi tính đạo hàm cấp hai, vẫn phải áp dụng lại quy tắc hàm hợp và quy tắc tích.",
            },
        ],
        "note": {
            "label": "Lưu ý từ tài liệu",
            "text": "Trong chuyển động thẳng, tốc độ là |v(t)|; không được mặc định tốc độ luôn bằng v(t).",
            "tone": "warning",
        },
        "layout": "formula-grid",
        "sourcePages": [4],
    }


def make_lesson(
    code: str,
    theory: list[dict],
    solutions: list[dict],
    document_id: str,
    document: pymupdf.Document,
) -> tuple[dict, list[dict]]:
    method, note = method_from(theory)
    source_page = theory[0]["page"]
    method_sentences = [part.strip() for part in re.split(r";|(?<=[.!?])\s+", method) if part.strip()]
    if not method_sentences:
        method_sentences = ["Đọc kỹ điều kiện và thực hiện theo đúng quy trình của dạng bài trong tài liệu nguồn."]
    source_note = {
        "label": "Lưu ý từ tài liệu",
        "text": note,
        "tone": "warning",
    } if note else None
    reading = {
        "lead": method,
        "formulae": source_formulae(code, method_sentences),
        "points": [
            {"label": f"Bước {index + 1:02d}", "text": sentence}
            for index, sentence in enumerate(method_sentences[:4])
        ],
        "note": source_note,
        "layout": "principles-split",
        "sourcePages": [source_page],
        "sourceDocumentId": document_id,
        "topicId": f"CD{code.split('.')[0].zfill(2)}",
        "lessonId": code,
        "sectionId": f"{code}-knowledge",
        "contentType": "markdown-latex",
        "sourcePdf": document_id,
        "conversionStatus": "imported",
        "reviewStatus": "needs-review",
        "contentVersion": "foundation-import-v2",
    }
    if code == "1.1":
        overview = cd01_source_overview()
        method_page = {
            "lead": method,
            "formulae": reading["formulae"],
            "points": reading["points"],
            "note": source_note,
            "layout": "principles-split",
            "sourcePages": [source_page],
        }
        reading["lead"] = overview["lead"]
        reading["formulae"] = [*overview["formulae"], *reading["formulae"]]
        reading["points"] = [*overview["points"], *reading["points"]]
        reading["note"] = overview["note"]
        reading["pages"] = [overview, method_page]

    prompts = numbered_items(theory)
    answers = numbered_items(solutions)
    examples: list[dict] = []
    for number, prompt in sorted(prompts.items()):
        answer = answers.get(number)
        prompt_text = prompt["text"]
        answer_text = answer["text"] if answer else ""
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
        visual = any(
            token.replace(" ", "") in prompt_text.lower().replace(" ", "")
            for token in VISUAL_DEPENDENCIES
        )
        asset_references = [source_region_asset(document, document_id, code, number, prompt)] if visual else []
        examples.append({
            "id": f"{code}-source-example-{number}",
            "title": title,
            "prompt": prompt_text,
            "analysis": [],
            "steps": [{
                "label": "Lời giải từ tài liệu",
                "expression": answer_text,
                "text": f"Lời giải Ví dụ {number}, trang {answer['page']} của PDF nguồn.",
            }] if answer else [],
            "answer": answer_text or None,
            "takeaway": None,
            "sourcePages": sorted({prompt["page"], *([answer["page"]] if answer else [])}),
            "statementSourcePage": prompt["page"],
            "solutionSourcePage": answer["page"] if answer else None,
            "originalExampleNumber": number,
            "problemTypeId": code,
            "assetReferences": asset_references,
            "solutionStatus": "available" if answer else "unavailable",
            "sourceBlockId": f"{code}-worked-example-{number}",
            "origin": "finalized-tutor-pdf",
            "verification": "source-extracted-needs-review",
            "topicId": f"CD{code.split('.')[0].zfill(2)}",
            "lessonId": code,
            "sectionId": f"{code}-example-{number}",
            "contentType": "markdown-latex",
            "sourcePdf": document_id,
            "conversionStatus": "imported",
            "reviewStatus": "needs-review",
            "contentVersion": "final-pdf-v2",
        })
    return reading, examples


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    knowledge: dict[str, dict] = {}
    examples: dict[str, list[dict]] = {}
    topic_knowledge: dict[str, dict] = {}
    shared_knowledge: dict[str, dict] = {}
    problem_types: dict[str, list[dict]] = {}
    audit: dict[str, dict] = {}

    names = os.listdir(SOURCE_DIR)
    for spec in DOCUMENTS:
        file_name = next(name for name in names if spec["name_token"] in name)
        path = SOURCE_DIR / file_name
        document = pymupdf.open(path)
        allowed = expected_codes(spec["allowed_topics"])
        lesson_blocks = page_blocks(document, spec["lesson_start"], spec["lesson_end"])
        theory = split_sections(lesson_blocks, allowed)
        solutions = split_sections(page_blocks(document, spec["solution_start"], len(document)), allowed)
        missing_theory = sorted(allowed - theory.keys())
        missing_solutions = sorted(allowed - solutions.keys())
        if missing_theory or missing_solutions:
            raise RuntimeError(f"{file_name}: missing theory={missing_theory}, solutions={missing_solutions}")
        source_prompt_count = 0
        source_answer_count = 0
        text_complete_candidate_count = 0
        diagram_dependent_count = 0
        mapped_solution_count = 0
        source_figure_count = 0
        if spec["id"] == "cd01-cd07-functions":
            for topic in sorted(spec["allowed_topics"]):
                topic_id = f"CD{topic:02d}"
                topic_knowledge[topic_id] = (
                    {**cd01_source_overview(), "sourceDocumentId": spec["id"], "topicId": topic_id,
                     "contentVersion": "final-pdf-v2", "reviewStatus": "needs-review"}
                    if topic == 1 else extract_topic_knowledge(lesson_blocks, topic, spec["id"])
                )
        else:
            shared_knowledge.update(extract_shared_knowledge(page_blocks(document, 5, 8), spec["id"]))
        for code in sorted(allowed, key=lambda item: tuple(map(int, item.split(".")))):
            source_prompts = numbered_items(theory[code])
            source_answers = numbered_items(solutions[code])
            source_prompt_count += len(source_prompts)
            source_answer_count += len(source_answers)
            for number, prompt in source_prompts.items():
                visual = any(
                    token.replace(" ", "") in prompt["text"].lower().replace(" ", "")
                    for token in VISUAL_DEPENDENCIES
                )
                if visual:
                    diagram_dependent_count += 1
                    source_figure_count += 1
                elif number in source_answers:
                    text_complete_candidate_count += 1
                if number in source_answers:
                    mapped_solution_count += 1
            reading, worked = make_lesson(code, theory[code], solutions[code], spec["id"], document)
            if not reading["lead"]:
                raise RuntimeError(f"{file_name}: incomplete native lesson {code}")
            knowledge[code] = reading
            examples[code] = worked
            topic_id = f"CD{int(code.split('.')[0]):02d}"
            method, note = method_from(theory[code])
            problem_types.setdefault(topic_id, []).append({
                "id": code,
                "code": code,
                "title": problem_type_title(theory[code], code),
                "order": int(code.split(".")[1]),
                "methodology": method,
                "note": note,
                "sourcePages": sorted({block["page"] for block in theory[code]}),
                "exampleCount": len(worked),
                "solutionCount": sum(1 for item in worked if item["solutionStatus"] == "available"),
                "figureCount": sum(len(item["assetReferences"]) for item in worked),
                "reviewStatus": "needs-review",
                "contentVersion": "final-pdf-v2",
            })
        audit[spec["id"]] = {
            "fileName": file_name,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest().upper(),
            "lessonCount": len(allowed),
            "knowledgeCount": sum(1 for code in allowed if code in knowledge),
            "workedExampleCount": sum(len(examples.get(code, [])) for code in allowed),
            "sourcePromptCount": source_prompt_count,
            "sourceAnswerCount": source_answer_count,
            "mappedSolutionCount": mapped_solution_count,
            "sourceFigureCount": source_figure_count,
            "textCompleteCandidateCount": text_complete_candidate_count,
            "diagramDependentCount": diagram_dependent_count,
            "pendingReviewExampleCount": sum(len(examples.get(code, [])) for code in allowed),
        }

    payload = (
        "// Generated by scripts/import-foundation-documents.py from the verified source PDFs.\n"
        "// Do not hand-edit; rerun the importer after replacing a registered source document.\n"
        f"const knowledge = {json.dumps(knowledge, ensure_ascii=False, indent=2)};\n\n"
        f"const examples = {json.dumps(examples, ensure_ascii=False, indent=2)};\n\n"
        f"const topicKnowledge = {json.dumps(topic_knowledge, ensure_ascii=False, indent=2)};\n\n"
        f"const sharedKnowledge = {json.dumps(shared_knowledge, ensure_ascii=False, indent=2)};\n\n"
        f"const topicKnowledgeReferences = {json.dumps(SHARED_KNOWLEDGE_REFS, ensure_ascii=False, indent=2)};\n\n"
        f"const problemTypes = {json.dumps(problem_types, ensure_ascii=False, indent=2)};\n\n"
        f"export const foundationImportAudit = Object.freeze({json.dumps(audit, ensure_ascii=False, indent=2)});\n"
        "export const foundationKnowledgeContent = Object.freeze(knowledge);\n"
        "export const foundationExampleContent = Object.freeze(examples);\n"
        "export const foundationTopicKnowledgeContent = Object.freeze(topicKnowledge);\n"
        "export const foundationSharedKnowledgeModules = Object.freeze(sharedKnowledge);\n"
        "export const foundationTopicKnowledgeReferences = Object.freeze(topicKnowledgeReferences);\n"
        "export const foundationProblemTypes = Object.freeze(problemTypes);\n"
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
