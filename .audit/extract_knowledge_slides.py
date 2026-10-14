"""Build source-faithful knowledge and worked-example slides for CD20/CD21.

The verified PDF is read-only. Topic headings define outer boundaries. Inside
each topic, VÍ DỤ NHANH begins an example and MẸO/SAI LẦM/LƯU Ý switches back
to knowledge. Page fragments are stitched without PDF chrome, then split at
text-block gaps when a slide would be too tall for the desktop workspace.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import pymupdf
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/documents/ly-thuyet-to-hop-xac-suat-thong-ke-cd20-cd23.pdf"
OUTPUT = ROOT / "assets/lesson-slides"
MANIFEST = ROOT / ".audit/knowledge-slide-manifest.json"
TOPIC_IDS = [f"20.{i}" for i in range(1, 18)] + [f"21.{i}" for i in range(1, 9)]
PAGE_TOP, PAGE_BOTTOM = 45.0, 790.0
X_MIN, X_MAX = 43.0, 552.0
HEADING_PADDING, SCALE, PAGE_GAP = 11.0, 2.5, 18
MIN_HEIGHT, TARGET_HEIGHT, MAX_HEIGHT = 220, 720, 900
KNOWLEDGE_LABELS = ("SAI LẦM", "MẸO NHẬN DẠNG", "LƯU Ý")


def clean(text: str) -> str:
    return " ".join(text.split())


def headings(document):
    found = {}
    for page_index in range(3, document.page_count):
        for block in document[page_index].get_text("blocks"):
            text = clean(block[4])
            match = re.match(r"((?:20|21)\.\d+)\s", text)
            if match and match.group(1) in TOPIC_IDS and match.group(1) not in found:
                found[match.group(1)] = {"page": page_index, "y": float(block[1]), "heading": text}
    if missing := [topic for topic in TOPIC_IDS if topic not in found]:
        raise RuntimeError(f"Missing headings: {', '.join(missing)}")
    return found


def find_heading(document, prefix):
    for page_index in range(3, document.page_count):
        for block in document[page_index].get_text("blocks"):
            if clean(block[4]).startswith(prefix):
                return page_index, float(block[1])
    raise RuntimeError(f"Missing heading: {prefix}")


def last_content_y(page):
    values = [float(b[3]) for b in page.get_text("blocks") if PAGE_TOP < b[1] < PAGE_BOTTOM and not clean(b[4]).startswith("Trang ")]
    return min(PAGE_BOTTOM, max(values, default=PAGE_BOTTOM) + 11)


def topic_bounds(document, positions, topic_id):
    start = positions[topic_id]
    start_point = (int(start["page"]), max(PAGE_TOP, float(start["y"]) - HEADING_PADDING))
    index = TOPIC_IDS.index(topic_id)
    if topic_id == "20.17":
        page, y = find_heading(document, "CD21 CÁC QUY TẮC XÁC SUẤT")
        end_point = (page, y - HEADING_PADDING)
    elif index + 1 < len(TOPIC_IDS):
        following = positions[TOPIC_IDS[index + 1]]
        end_point = (int(following["page"]), float(following["y"]) - HEADING_PADDING)
    else:
        end_point = (document.page_count - 1, last_content_y(document[-1]))
    return start_point, end_point


def point_key(point):
    return point[0] * 1000 + point[1]


def ranges_between(start, end):
    ranges = []
    for page in range(start[0], end[0] + 1):
        top = start[1] if page == start[0] else PAGE_TOP
        bottom = end[1] if page == end[0] else PAGE_BOTTOM
        if bottom - top >= 20:
            ranges.append((page, top, bottom))
    return ranges


def semantic_intervals(document, start, end):
    boundaries = []
    for page in range(start[0], end[0] + 1):
        for block in document[page].get_text("blocks"):
            point = (page, float(block[1]) - 7)
            if not (point_key(start) < point_key(point) < point_key(end)):
                continue
            text = clean(block[4])
            if text.startswith("VÍ DỤ"):
                boundaries.append((point, "example"))
            elif text.startswith(KNOWLEDGE_LABELS):
                boundaries.append((point, "knowledge"))
    boundaries.sort(key=lambda item: point_key(item[0]))
    intervals, cursor, mode, example_index = [], start, "knowledge", 0
    for point, next_mode in boundaries:
        if point_key(point) > point_key(cursor) + 3:
            intervals.append({"kind": mode, "exampleIndex": example_index or None, "ranges": ranges_between(cursor, point)})
        cursor, mode = point, next_mode
        if next_mode == "example":
            example_index += 1
    if point_key(end) > point_key(cursor) + 3:
        intervals.append({"kind": mode, "exampleIndex": example_index or None, "ranges": ranges_between(cursor, end)})
    return intervals


def candidates(page, top, bottom, offset):
    blocks = sorted((max(float(b[1]), top), min(float(b[3]), bottom)) for b in page.get_text("blocks") if b[3] > top and b[1] < bottom)
    gaps = [round(offset + (((a[1] + b[0]) / 2) - top) * SCALE) for a, b in zip(blocks, blocks[1:]) if b[0] - a[1] >= 1.5]
    return gaps


def split_canvas(total, preferred, maximum=MAX_HEIGHT):
    cuts, cursor = [0], 0
    while total - cursor > maximum:
        lower = cursor + MIN_HEIGHT
        upper = min(cursor + maximum, total - MIN_HEIGHT)
        choices = [value for value in preferred if lower <= value <= upper]
        cut = min(choices, key=lambda value: abs(value - (cursor + TARGET_HEIGHT))) if choices else upper
        cuts.append(cut)
        cursor = cut
    cuts.append(total)
    return list(zip(cuts, cuts[1:]))


def crop_provenance(top, bottom, segments):
    output = []
    for segment in segments:
        overlap_top = max(top, segment["canvasTop"])
        overlap_bottom = min(bottom, segment["canvasBottom"])
        if overlap_bottom <= overlap_top:
            continue
        source_top = segment["sourceTop"] + (overlap_top - segment["canvasTop"]) / SCALE
        source_bottom = segment["sourceTop"] + (overlap_bottom - segment["canvasTop"]) / SCALE
        output.append({"page": segment["page"], "x": X_MIN, "y": round(source_top, 1), "width": X_MAX - X_MIN, "height": round(source_bottom - source_top, 1)})
    return output


def render_ranges(document, topic_id, kind, ranges, serial_start=1):
    width, cursor, pieces, segments, cuts = round((X_MAX - X_MIN) * SCALE), 0, [], [], []
    for range_index, (page_index, top, bottom) in enumerate(ranges):
        text_blocks = [block for block in document[page_index].get_text("blocks") if block[3] > top and block[1] < bottom and clean(block[4])]
        has_text = bool(text_blocks)
        if not has_text and bottom - top < 40:
            continue
        if text_blocks:
            top = max(top, min(float(block[1]) for block in text_blocks) - 7)
            bottom = min(bottom, max(float(block[3]) for block in text_blocks) + 10)
        if pieces:
            cuts.append(cursor)
            cursor += PAGE_GAP
        pixmap = document[page_index].get_pixmap(matrix=pymupdf.Matrix(SCALE, SCALE), clip=pymupdf.Rect(X_MIN, top, X_MAX, bottom), alpha=False)
        image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
        if image.width != width:
            image = image.resize((width, image.height), Image.Resampling.LANCZOS)
        pieces.append(image)
        segment_top = cursor
        segment_bottom = cursor + image.height
        segments.append({"page": page_index + 1, "sourceTop": top, "canvasTop": segment_top, "canvasBottom": segment_bottom})
        cuts.extend(candidates(document[page_index], top, bottom, segment_top))
        cursor = segment_bottom
    canvas = Image.new("RGB", (width, cursor), "white")
    y = 0
    for index, image in enumerate(pieces):
        if index: y += PAGE_GAP
        canvas.paste(image, (0, y)); y += image.height
    directory = OUTPUT / ("cd20" if topic_id.startswith("20.") else "cd21")
    directory.mkdir(parents=True, exist_ok=True)
    output = []
    prefix = "k" if kind == "knowledge" else "e"
    for number, (top, bottom) in enumerate(split_canvas(canvas.height, sorted(set(cuts)), MAX_HEIGHT), start=serial_start):
        image = canvas.crop((0, top, canvas.width, bottom))
        path = directory / f"{topic_id.replace('.', '-')}-{prefix}{number:02d}.webp"
        image.save(path, "WEBP", quality=92, method=6)
        provenance = crop_provenance(top, bottom, segments)
        output.append({"src": path.relative_to(ROOT).as_posix(), "sourcePages": sorted({item["page"] for item in provenance}), "crops": provenance, "width": image.width, "height": image.height})
    return output


def render_topic(document, positions, topic_id):
    start, end = topic_bounds(document, positions, topic_id)
    intervals = semantic_intervals(document, start, end)
    knowledge_ranges = [item for interval in intervals if interval["kind"] == "knowledge" for item in interval["ranges"]]
    knowledge = render_ranges(document, topic_id, "knowledge", knowledge_ranges)
    examples = []
    for interval in (item for item in intervals if item["kind"] == "example"):
        examples.extend(render_ranges(document, topic_id, "example", interval["ranges"], len(examples) + 1))
    return {
        "source": "cd20-cd21-theory",
        "startsAt": positions[topic_id]["heading"],
        "endsBefore": "CD21" if topic_id == "20.17" else (TOPIC_IDS[TOPIC_IDS.index(topic_id) + 1] if topic_id != TOPIC_IDS[-1] else "END_CD21"),
        "knowledgeSlides": knowledge,
        "exampleSlides": examples,
    }


def render(selected):
    document = pymupdf.open(SOURCE)
    positions = headings(document)
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {}
    for topic_id in selected:
        directory = OUTPUT / ("cd20" if topic_id.startswith("20.") else "cd21")
        for old in directory.glob(f"{topic_id.replace('.', '-')}-*.webp"):
            old.unlink()
        manifest[topic_id] = render_topic(document, positions, topic_id)
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {topic: manifest[topic] for topic in selected}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--topic", action="append", choices=TOPIC_IDS)
    arguments = parser.parse_args()
    result = render(arguments.topic or TOPIC_IDS)
    for topic_id, item in result.items():
        print(f"{topic_id}: {len(item['knowledgeSlides'])} knowledge, {len(item['exampleSlides'])} example")
