"""Read-only V5.7 adapter around the existing PDF block extractor; no math guesses."""
import hashlib
import importlib.util
import json
import re
import sys
from pathlib import Path
import pymupdf

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("foundation", ROOT / "scripts/import-foundation-documents.py")
legacy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(legacy)
sys.stdout.reconfigure(encoding="utf-8")
result = []
for request in json.load(sys.stdin):
    path = (ROOT / request["path"]).resolve()
    if not path.is_relative_to(ROOT):
        raise ValueError("Source outside workspace")
    sha = hashlib.sha256(path.read_bytes()).hexdigest().upper()
    if sha != request["sha256"]:
        raise ValueError("Source hash changed")
    with pymupdf.open(path) as document:
        blocks = legacy.page_blocks(document, 1, len(document))
        headings = []
        examples = []
        exercises = []
        solutions = []
        for index, block in enumerate(blocks):
            text = block["text"]
            # Heading candidates only, not a claim that extracted math is correct.
            match = re.match(r"^(?:Dạng\s+)?((?:[1-9]|[12]\d|3[0-9])\.\d+)\s+[.–-]?\s*([^\d].*)", text)
            calculus = re.match(r"^CD(1[234])-(\d+)\s+(?:[–-]\s*)?(.+)", text)
            if calculus and not re.search(r"(?:\.\s*){3,}", text):
                headings.append({"sectionId": f"{calculus[1]}.{int(calculus[2])}", "title": calculus[3], "page": block["page"], "block": index})
            if match and not re.search(r"(?:\.\s*){3,}", text):
                headings.append({"sectionId": match[1], "title": match[2], "page": block["page"], "block": index})
            location = {"page": block["page"], "bbox": [block[k] for k in ["x0", "y0", "x1", "y1"]]}
            item = {"id": f"{request['sourceId']}:block:{index}", "original": text, "location": location}
            if re.match(r"Ví dụ\s*\d+", text):
                examples.append(item)
            if re.match(r"(?:Bài|Câu)\s*\d+[.:)]", text):
                exercises.append(item)
            if re.search(r"LỜI GIẢI|HƯỚNG DẪN GIẢI|Lời giải|Đáp án", text):
                solutions.append(item)
        result.append({**request, "pageCount": len(document), "headings": headings,
                       "examples": examples, "exercises": exercises, "solutions": solutions,
                       "blocks": blocks, "limitation": "Text/layout extraction only; mathematical grouping unresolved unless separately evidenced."})
print(json.dumps(result, ensure_ascii=False))
