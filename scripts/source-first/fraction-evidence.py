"""Read-only, bounded source geometry for the EXISTING fraction flags.

Never interprets a drawing as a fraction or guesses a missing math group.
The old source section/number locator is reused; raw spans remain evidence,
not independent proof of fidelity (the same extractor can repeat its errors).
"""
import hashlib
import importlib.util
import json
import sys
from pathlib import Path
import pymupdf

ROOT = Path(__file__).resolve().parents[2]
sys.stdout.reconfigure(encoding="utf-8")
spec = importlib.util.spec_from_file_location("foundation", ROOT / "scripts/import-foundation-documents.py")
foundation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(foundation)


def extract(request):
    documents, sections = {}, {}
    for source in request["sources"]:
        path = ROOT / source["filePath"]
        document = pymupdf.open(path)
        actual = hashlib.sha256(path.read_bytes()).hexdigest().upper()
        if actual != source["sourceSha256"]:
            raise ValueError("Authoritative source hash mismatch: " + source["filePath"])
        documents[source["id"]] = document
        configuration = next((entry for entry in foundation.DOCUMENTS if entry["id"] == source["id"]), None)
        if configuration:
            allowed = foundation.expected_codes(configuration["allowed_topics"])
            sections[source["id"]] = {
                "statement": foundation.split_sections(foundation.page_blocks(document, configuration["lesson_start"], configuration["lesson_end"]), allowed),
                "solution": foundation.split_sections(foundation.page_blocks(document, configuration["solution_start"], len(document)), allowed),
            }
    results = []
    for row in request["rows"]:
        result = {"reference": row["reference"], "regions": [], "locator": "unresolved"}
        document = documents.get(row.get("documentId"))
        if document is None:
            results.append(result)
            continue
        located = sections.get(row["documentId"])
        if located and row.get("number"):
            for role in ["statement", "solution"]:
                section = located[role].get(row["code"], [])
                item = foundation.numbered_items(section).get(row["number"])
                if item and item["page"] == item["lastPage"]:
                    page = document[item["page"] - 1]
                    # Include adjacent math spans, but never swallow the next
                    # numbered item. Context locator and actual bbox retained.
                    bbox = pymupdf.Rect(35, max(0, item["y0"]-2), page.rect.width-35, min(page.rect.height, item["y1"]+2))
                    data = page.get_text("dict", clip=bbox)
                    spans = [span for block in data["blocks"] for line in block.get("lines", []) for span in line["spans"]]
                    result["regions"].append({"role": role, "page": item["page"], "bbox": list(bbox), "extractedText": item["text"], "rawText": page.get_text(clip=bbox), "spans": spans,
                        "drawings": [{"rect": list(drawing["rect"]), "type": drawing["type"]} for drawing in page.get_drawings() if bbox.intersects(drawing["rect"])]})
            if len(result["regions"]) == 2:
                result["locator"] = "section-and-original-example-number"
        if not result["regions"]:
            for number in row.get("pages", []):
                if isinstance(number, int) and 1 <= number <= len(document):
                    page = document[number-1]
                    result["regions"].append({"role": "page-context-only", "page": number, "bbox": list(page.rect), "rawText": page.get_text()})
            result["locator"] = "page-context-only" if result["regions"] else "unresolved"
        results.append(result)
    return results


if __name__ == "__main__":
    print(json.dumps(extract(json.load(sys.stdin)), ensure_ascii=False))
