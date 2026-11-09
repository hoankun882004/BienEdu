"""Read original PDF text/spans only. Never rasterize, crop, or extract SVG."""
import json
import hashlib
import sys
from pathlib import Path
import pymupdf

ROOT = Path(__file__).resolve().parents[2]
sys.stdout.reconfigure(encoding="utf-8")
rows = []
for item in json.load(sys.stdin):
    path = (ROOT / item["sourceFile"]).resolve()
    path.relative_to(ROOT)
    if hashlib.sha256(path.read_bytes()).hexdigest().upper() != item["sourceHash"]:
        raise ValueError("Original source hash changed")
    with pymupdf.open(path) as doc:
        page = doc[item["sourcePage"] - 1]
        region = pymupdf.Rect(item["sourceRegion"])
        spans = [{"text": s["text"], "bbox": s["bbox"], "size": s["size"]}
                 for b in page.get_text("dict", clip=region)["blocks"] if "lines" in b
                 for line in b["lines"] for s in line["spans"]]
        rows.append({"figureId": item["id"], "sourcePage": item["sourcePage"],
                     "statement": page.get_text(clip=region), "spans": spans,
                     "solutionPage": item.get("solutionPage"),
                     "solution": doc[item["solutionPage"] - 1].get_text() if item.get("solutionPage") else ""})
print(json.dumps(rows, ensure_ascii=False))
