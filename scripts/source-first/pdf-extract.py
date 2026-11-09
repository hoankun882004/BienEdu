"""Read-only PDF geometry extraction. Produces local crops and metadata, never LaTeX guesses."""
import hashlib
import importlib.util
import importlib.metadata
import json
import sys
from pathlib import Path

import pymupdf
from artifact_io import atomic_write_bytes

ROOT = Path(__file__).resolve().parents[2]
sys.stdout.reconfigure(encoding="utf-8")
request = json.load(sys.stdin)
output = ROOT / ".content-work" / "source-first-v5" / "crops"
output.mkdir(parents=True, exist_ok=True)
spec = importlib.util.spec_from_file_location("existing_pdf_importer", ROOT / "scripts/import-foundation-documents.py")
legacy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(legacy)


def compact(value):
    return "".join(value.split())


documents = {}
coverage = []
for source in request["documents"]:
    document = pymupdf.open(ROOT / source["filePath"])
    documents[source["id"]] = document
    pages = []
    for number, page in enumerate(document, 1):
        spans = [span for block in page.get_text("dict")["blocks"] for line in block.get("lines", []) for span in line["spans"]]
        pages.append({"page": number, "textCharacters": len(page.get_text()), "spanCount": len(spans), "imageCount": len(page.get_images()), "drawingCount": len(page.get_drawings())})
    coverage.append({"documentId": source["id"], "pageCount": len(document), "pages": pages})

items = []
for fixture in request["fixtures"]:
    page = documents[fixture["documentId"]][fixture["page"] - 1]
    blocks = [block for block in page.get_text("dict")["blocks"] if block.get("lines")]
    for block in blocks:
        block["sourceText"] = "\n".join("".join(span["text"] for span in line["spans"]) for line in block["lines"])
    selected = [block for block in blocks if compact(fixture["anchor"]) in compact(block["sourceText"])]
    matched = bool(selected)
    # If an anchor fails, keep the full page as evidence and flag it. Do not guess a region.
    selected = selected[:1] if matched else blocks
    bounds = pymupdf.Rect(selected[0]["bbox"])
    for block in selected[1:]:
        bounds |= pymupdf.Rect(block["bbox"])
    # Math glyphs in adjacent PDF blocks can belong to one stacked expression.
    # Show a full-width context band, never pretend the matched text block alone
    # is the complete formula (e.g. quotient numerator and denominator).
    bounds = pymupdf.Rect(35, max(0, bounds.y0 - 55), page.rect.width - 35, min(page.rect.height, bounds.y1 + 55))
    crop = output / (fixture["id"] + ".png")
    atomic_write_bytes(crop, page.get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5), clip=bounds, alpha=False).tobytes("png"))
    raw = "\n\n".join(block["sourceText"] for block in selected)
    items.append({
        "id": fixture["id"], "anchorMatched": matched, "rawSource": raw,
        "layoutBlocks": [{"bbox": block["bbox"], "lines": block["lines"]} for block in selected],
        "location": {"page": fixture["page"], "bbox": list(bounds), "pageSize": [page.rect.width, page.rect.height]},
        "cropPath": crop.relative_to(ROOT).as_posix(),
        "cropSha256": hashlib.sha256(crop.read_bytes()).hexdigest().upper(),
        "existingPipelineCandidate": "\n\n".join(legacy.block_text(block) for block in selected)
    })

print(json.dumps({"coverage": coverage, "items": items, "tools": {"pymupdfVersion": importlib.metadata.version("PyMuPDF"), "mineruInstalled": importlib.util.find_spec("mineru") is not None, "doclingInstalled": importlib.util.find_spec("docling") is not None}}, ensure_ascii=False))
