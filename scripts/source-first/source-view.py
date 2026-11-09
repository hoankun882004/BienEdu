"""Original PDF evidence only: in-memory context for HTTP or figure metadata for CLI."""
import hashlib
import json
import sys
from pathlib import Path
import pymupdf

ROOT = Path(__file__).resolve().parents[2]
request = json.load(sys.stdin)
if request["mode"] == "context":
    path = (ROOT / request["file"]).resolve()
    path.relative_to(ROOT)
    if hashlib.sha256(path.read_bytes()).hexdigest().upper() != request["sha256"]:
        raise ValueError("Source checksum mismatch")
    doc = pymupdf.open(path)
    image = doc[request["page"] - 1].get_pixmap(matrix=pymupdf.Matrix(1.6, 1.6), alpha=False)
    sys.stdout.buffer.write(image.tobytes("png"))
else:
    sys.stdout.reconfigure(encoding="utf-8")
    documents = {}
    rows = []
    for figure in request["figures"]:
        path = (ROOT / figure["sourceFile"]).resolve()
        path.relative_to(ROOT)
        if str(path) not in documents:
            documents[str(path)] = (pymupdf.open(path), hashlib.sha256(path.read_bytes()).hexdigest().upper())
        doc, actual_hash = documents[str(path)]
        region = figure["sourceRegion"]
        valid_page = isinstance(figure["sourcePage"], int) and 1 <= figure["sourcePage"] <= len(doc)
        page = doc[figure["sourcePage"] - 1] if valid_page else None
        valid_region = page is not None and len(region) == 4 and 0 <= region[0] < region[2] <= page.rect.width and 0 <= region[1] < region[3] <= page.rect.height
        text = page.get_text(clip=pymupdf.Rect(region)) if valid_region else ""
        expected = "Ví dụ" + str(figure["originalExampleNumber"]) + "."
        association = "".join(expected.split()) in "".join(text.split())
        crop = pymupdf.Rect(region) if valid_region else None
        drawing_count = sum(drawing["rect"].intersects(crop) for drawing in page.get_drawings()) if crop else 0
        image_count = sum(pymupdf.Rect(image["bbox"]).intersects(crop) for image in page.get_image_info()) if crop else 0
        rows.append({"id": figure["id"], "sourceHashMatches": actual_hash == figure["sourceHash"], "validPage": valid_page, "validRegion": valid_region, "exampleNumberFoundInRegion": association,
                     "sourceRegionText": text, "drawingCount": len(page.get_drawings()) if page else 0,
                     "regionDrawingCount": drawing_count, "regionImageCount": image_count,
                     "humanFigureReview": "pending", "labelsAxesCurvesConditions": "requires-human-source-comparison"})
    print(json.dumps(rows, ensure_ascii=False))
