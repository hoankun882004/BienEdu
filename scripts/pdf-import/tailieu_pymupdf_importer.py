#!/usr/bin/env python3
r"""
scripts/pdf-import/tailieu_pymupdf_importer.py
===============================================
AI-assisted batch importer dung PyMuPDF (khong can Marker).

Workflow:
  1. Quet C:\NINHHN\BienEDU\TaiLieu cho moi PDF
  2. Moi PDF: trich text, nhan dien headings CD-XX, tinh SHA-256
  3. Tao content/review/<documentId>/<code>.json + .md theo schema bienedu.math-pdf.v1
  4. Xuat bao cao import-report.json

Chay:
  python scripts/pdf-import/tailieu_pymupdf_importer.py
  python scripts/pdf-import/tailieu_pymupdf_importer.py --dry-run
  python scripts/pdf-import/tailieu_pymupdf_importer.py --doc cd15-cd16-trigonometry
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

try:
    import pymupdf
except ImportError:
    print("ERROR: pymupdf chưa được cài. Chạy: pip install pymupdf")
    sys.exit(1)

# ─── Paths ────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parents[2]
TAILIEU_DIR = Path("C:/NINHHN/BienEDU/TaiLieu")
SOURCE_39CD = ROOT / "39 chuyên đề"
REVIEW_DIR = ROOT / "content" / "review"
ASSETS_CONTENT = ROOT / "assets" / "content" / "approved"
JS_DATA = ROOT / "assets" / "js" / "data"
DOCUMENT_MAPPINGS_FILE = JS_DATA / "document-mappings.js"
REPORT_PATH = ROOT / ".content-work" / "import-report.json"

# ─── Catalog: TaiLieu file → document info ────────────────────────────────────
# Mỗi entry: pattern, documentId, topicIds, description, copyTo (tên file đích trong 39 chuyên đề)
TAILIEU_CATALOG = [
    {
        "patterns": [r"ham-so", r"dao-ham", r"cd01"],
        "documentId": "cd01-cd07-functions",
        "topicIds": ["CD01","CD02","CD03","CD04","CD05","CD06","CD07"],
        "description": "Hàm số và Đạo hàm (CD01–CD07) — bộ bài khó 2023–2026",
        "copyAs": None,  # Đã có trong 39 chuyên đề — bộ gốc; file TaiLieu là bổ sung
    },
    {
        "patterns": [r"mu-logarit", r"cd08"],
        "documentId": "cd08-cd11-exponential-logarithm",
        "topicIds": ["CD08","CD09","CD10","CD11"],
        "description": "Mũ và Lôgarit (CD08–CD11)",
        "copyAs": None,
    },
    {
        "patterns": [r"nguyen-ham", r"tich-phan", r"cd12"],
        "documentId": "cd12-cd14-calculus",
        "topicIds": ["CD12","CD13","CD14"],
        "description": "Nguyên hàm và Tích phân (CD12–CD14)",
        "copyAs": None,
    },
    {
        "patterns": [r"luong-giac", r"cd15"],
        "documentId": "cd15-cd16-trigonometry",
        "topicIds": ["CD15","CD16"],
        "description": "Lượng giác (CD15–CD16)",
        "copyAs": "Luong-giac-CD15-CD16-merged.pdf",
    },
    {
        "patterns": [r"day-so", r"cap-so", r"cd17"],
        "documentId": "cd17-cd19-sequences",
        "topicIds": ["CD17","CD18","CD19"],
        "description": "Dãy số và Cấp số (CD17–CD19)",
        "copyAs": "Day-so-Cap-so-CD17-CD19-merged.pdf",
    },
    {
        "patterns": [r"oxyz", r"vecto", r"cd28"],
        "documentId": "cd28-cd33-oxyz",
        "topicIds": ["CD28","CD29","CD30","CD31","CD32","CD33"],
        "description": "Hệ toạ độ Oxyz và Vectơ (CD28–CD33)",
        "copyAs": "Vecto-Oxyz-CD28-CD33-merged.pdf",
    },
]

# ─── Helpers ──────────────────────────────────────────────────────────────────

def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def stable_id(value: str) -> str:
    return hashlib.sha1(value.encode()).hexdigest()[:12]


def detect_catalog(filename: str) -> Optional[dict]:
    lower = filename.lower().replace("_", "-").replace(" ", "-")
    for entry in TAILIEU_CATALOG:
        if any(re.search(p, lower) for p in entry["patterns"]):
            return entry
    return None


# ─── PDF text extraction & block building ─────────────────────────────────────

SECTION_PATTERNS = [
    ("practice",        re.compile(r"^(?:\d+[.)]\s*)?(?:bài tập tự luyện|luyện tập|thực hành)\b", re.I)),
    ("worked_examples", re.compile(r"^(?:\d+[.)]\s*)?(?:ví dụ(?: nhanh| có lời giải)?|bài toán mẫu)\b", re.I)),
    ("knowledge",       re.compile(r"^(?:\d+[.)]\s*)?(?:kiến thức trọng tâm|lý thuyết|phương pháp giải|ghi nhớ|mẹo)\b", re.I)),
]

LATEX_PATTERNS = [
    re.compile(r"\$\$([\s\S]+?)\$\$"),
    re.compile(r"\$([^$\n]+?)\$"),
    re.compile(r"\\\[([\s\S]+?)\\\]"),
    re.compile(r"\\\((.+?)\\\)"),
]

HEADING_RE = re.compile(r"^(?:Dạng\s+)?((?:[1-9]|1[0-9]|2[0-9]|3[0-9])\.(?:\d+))\s*(?:[.–\-]|$)")


def extract_latex(text: str) -> list[str]:
    found = []
    for pat in LATEX_PATTERNS:
        for m in pat.finditer(text):
            s = m.group(1).strip()
            if s:
                found.append(s)
    return list(dict.fromkeys(found))


def classify_section(text: str) -> Optional[str]:
    t = re.sub(r"\s+", " ", text.replace("#", "")).strip()
    for name, pat in SECTION_PATTERNS:
        if pat.match(t):
            return name
    return None


def clean_text(value: str) -> str:
    value = value.replace("\u00ad", "").replace("\ufb00", "ff")
    value = re.sub(r"\s+", " ", value).strip()
    return value


def extract_blocks_from_pdf(pdf_path: Path, start_page: int = 1, end_page: Optional[int] = None) -> list[dict]:
    """
    Trích xuất blocks từ PDF dùng PyMuPDF text-layer.
    start_page, end_page: 1-indexed, inclusive.
    """
    doc = pymupdf.open(str(pdf_path))
    total_pages = doc.page_count
    end_page = end_page or total_pages
    end_page = min(end_page, total_pages)

    blocks: list[dict] = []
    PAGE_CROP = dict(x=0.055, top=0.055, width=0.89, bottom=0.965)

    for page_no in range(start_page, end_page + 1):
        page = doc[page_no - 1]
        pw, ph = page.rect.width, page.rect.height
        raw_blocks = page.get_text("dict")["blocks"]

        for rb_idx, rb in enumerate(raw_blocks):
            if rb.get("type") != 0:  # 0 = text block
                continue
            bbox = rb.get("bbox", [0, 0, 0, 0])
            # Normalize to [0,1]
            nx = bbox[0] / pw
            ny = bbox[1] / ph
            nw = (bbox[2] - bbox[0]) / pw
            nh = (bbox[3] - bbox[1]) / ph

            # Filter by page crop region
            cx = nx + nw / 2
            cy = ny + nh / 2
            if not (PAGE_CROP["x"] <= cx <= PAGE_CROP["x"] + PAGE_CROP["width"]
                    and PAGE_CROP["top"] <= cy <= PAGE_CROP["bottom"]):
                continue

            lines_text: list[str] = []
            for line in rb.get("lines", []):
                spans = line.get("spans", [])
                chunk = " ".join(s.get("text", "") for s in spans)
                chunk = chunk.strip()
                if chunk:
                    lines_text.append(chunk)

            text = clean_text(" ".join(lines_text))
            if not text:
                continue
            # Skip pure page numbers
            if text.strip() == str(page_no):
                continue

            block_id = f"b-p{page_no}-i{rb_idx:03d}-{stable_id(f'{page_no}:{rb_idx}:{text[:30]}')[:6]}"
            blocks.append({
                "_page": page_no,
                "_bbox": {"x": round(nx, 4), "y": round(ny, 4),
                          "width": round(nw, 4), "height": round(nh, 4)},
                "text": text,
                "id": block_id,
            })

    doc.close()
    return blocks


def assign_sections(blocks: list[dict]) -> list[dict]:
    """Phân loại mỗi block vào section: knowledge / worked_examples / practice."""
    section = "knowledge"
    for block in blocks:
        detected = classify_section(block["text"])
        if detected:
            section = detected
            block["_is_heading"] = True
            block["sourceHeading"] = re.sub(r"^#+\s*", "", block["text"]).strip()
        else:
            block.setdefault("_is_heading", False)
            block["sourceHeading"] = None
        block["section"] = section
    return blocks


def build_review_record(
    *,
    code: str,
    topic_id: str,
    topic_title: str,
    document_id: str,
    file_name: str,
    sha256: str,
    page_count: int,
    start_page: int,
    end_page: int,
    blocks_raw: list[dict],
    provider: str = "pymupdf",
) -> dict:
    """Xây record JSON theo schema bienedu.math-pdf.v1."""
    # Build region list
    PAGE_CROP = dict(x=0.055, top=0.055, width=0.89, bottom=0.965)
    regions = []
    for p in range(start_page, end_page + 1):
        is_boundary = (p == start_page or p == end_page)
        regions.append({
            "id": f"{code}-pdf-{p - start_page + 1}",
            "x": PAGE_CROP["x"],
            "y": 0.11 if p == start_page else PAGE_CROP["top"],
            "width": PAGE_CROP["width"],
            "height": 0.6 if p == end_page else PAGE_CROP["bottom"] - PAGE_CROP["top"],
            "page": p,
            "isBoundaryPage": is_boundary,
        })

    # Build blocks in schema format
    blocks_out = []
    flags = []
    for b in blocks_raw:
        region = next((r for r in regions if r["page"] == b["_page"]), None)
        if not region:
            continue
        markdown = b["text"]
        latex = extract_latex(markdown)
        block = {
            "id": f"{code}-{b['id']}",
            "providerBlockId": None,
            "page": b["_page"],
            "type": "SectionHeader" if b.get("_is_heading") else "Text",
            "polygon": b["_bbox"],
            "regionId": region["id"],
            "boundaryStatus": "inside",
            "section": b.get("section", "knowledge"),
            "sourceHeading": b.get("sourceHeading"),
            "markdown": markdown,
            "latex": latex,
        }
        # Flag broken latex
        for formula in latex:
            opens = formula.count("{")
            closes = formula.count("}")
            if opens != closes:
                flags.append({
                    "severity": "error",
                    "code": "uncertain-formula",
                    "blockId": block["id"],
                    "page": b["_page"],
                    "message": f"Công thức cần đối chiếu: {formula[:60]}",
                })
        blocks_out.append(block)

    if not blocks_out:
        flags.append({"severity": "error", "code": "missing-content", "message": "Không có block nào trong vùng subtopic."})

    headings = [
        {"blockId": b["id"], "page": b["page"], "section": b["section"], "text": b["sourceHeading"]}
        for b in blocks_out if b.get("sourceHeading")
    ]
    sections = {
        "knowledge":      [b["id"] for b in blocks_out if b["section"] == "knowledge"],
        "workedExamples": [b["id"] for b in blocks_out if b["section"] == "worked_examples"],
        "practice":       [b["id"] for b in blocks_out if b["section"] == "practice"],
    }

    record = {
        "schemaVersion": "bienedu.math-pdf.v1",
        "subtopic": {
            "code": code,
            "id": f"CD{int(code.split('.')[0]):02d}-{int(code.split('.')[1]):02d}",
            "title": topic_title,
            "topicId": topic_id,
            "topicTitle": topic_title,
        },
        "source": {
            "documentId": document_id,
            "fileName": file_name,
            "relativeDirectory": "TaiLieu",
            "sha256": sha256,
            "pageCount": page_count,
            "pages": list(range(start_page, end_page + 1)),
            "regions": regions,
        },
        "extraction": {
            "provider": provider,
            "startedAt": now_iso(),
            "finishedAt": now_iso(),
            "providerJobId": None,
            "command": f"pymupdf page_range={start_page}-{end_page}",
        },
        "blocks": blocks_out,
        "headings": headings,
        "sections": sections,
        "assets": [],
        "flags": flags,
        "corrections": [],
        "resolvedFlags": [],
        "verification": {
            "status": "needs-source-review",
            "reviewer": None,
            "reviewedAt": None,
            "sourceHash": sha256,
            "formulasChecked": False,
            "boundariesChecked": False,
            "notes": ["Auto-imported từ TaiLieu bằng pymupdf importer — cần đối chiếu PDF trước khi publish."],
        },
    }

    # Build markdown preview
    record["markdown"] = render_markdown(record)
    return record


def render_markdown(record: dict) -> str:
    code = record["subtopic"]["code"]
    title = record["subtopic"]["title"]
    sha = record["source"]["sha256"]
    provider = record["extraction"]["provider"]
    pages = record["source"]["pages"]
    fname = record["source"]["fileName"]
    lines = [
        "---",
        f"schemaVersion: {record['schemaVersion']}",
        f"subtopic: {code}",
        f"title: {title}",
        f"sourceSha256: {sha}",
        f"provider: {provider}",
        f"verification: {record['verification']['status']}",
        "---",
        "",
        f"# {code} {title}",
        "",
        f"> Nguồn: {fname}, trang PDF {', '.join(str(p) for p in pages)}. Nội dung auto-import bằng PyMuPDF; phải đối chiếu PDF gốc trước khi publish.",
        "",
    ]
    current_section = None
    labels = {"knowledge": "Kiến thức", "worked_examples": "Ví dụ có lời giải", "practice": "Bài tập"}
    for block in record["blocks"]:
        if block["section"] != current_section:
            current_section = block["section"]
            lines.append(f"## {labels.get(current_section, current_section)}")
            lines.append("")
        lines.append(f"<!-- source-block:{block['id']} page:{block['page']} region:{block['regionId']} -->")
        lines.append(block["markdown"])
        lines.append("")
    return "\n".join(lines).strip() + "\n"


# ─── Curriculum helper ────────────────────────────────────────────────────────

def load_curriculum_topics() -> dict[str, dict]:
    """Trích topic info từ curriculum.js (read as text, regex parse)."""
    curriculum_file = JS_DATA / "curriculum.js"
    text = curriculum_file.read_text(encoding="utf-8")
    topics = {}
    # Match each topic block
    for m in re.finditer(r'"id":\s*"(CD\d+)".*?"title":\s*"([^"]+)"', text, re.S):
        tid, title = m.group(1), m.group(2)
        topics[tid] = {"id": tid, "title": title}
    return topics


def load_existing_document_ids() -> set[str]:
    """Lấy danh sách document IDs đã có trong document-mappings.js."""
    text = DOCUMENT_MAPPINGS_FILE.read_text(encoding="utf-8")
    return set(re.findall(r'id:\s*"([^"]+)"', text))


# ─── Page range detection: auto-detect topic pages bằng heading scan ──────────

def detect_topic_pages(blocks: list[dict], topic_id: str) -> tuple[int, int]:
    """
    Tìm trang bắt đầu và kết thúc của topic_id dựa trên pattern heading.
    Ví dụ: CD15 bắt đầu khi gặp "CD15" hoặc "15.1", kết thúc khi gặp CD16.
    """
    topic_num = int(topic_id[2:])
    start = None
    end = None

    start_patterns = [
        re.compile(rf"\bCD0*{topic_num}\b", re.I),
        re.compile(rf"\b{topic_num}\.1\b"),
    ]
    # Topic kế tiếp
    next_num = topic_num + 1
    end_patterns = [
        re.compile(rf"\bCD0*{next_num}\b", re.I),
        re.compile(rf"\b{next_num}\.1\b"),
    ]

    for b in blocks:
        t = b["text"]
        if start is None:
            if any(p.search(t) for p in start_patterns):
                start = b["_page"]
        elif end is None:
            if any(p.search(t) for p in end_patterns):
                end = b["_page"] - 1
                break

    if start is None:
        start = 1
    if end is None:
        end = blocks[-1]["_page"] if blocks else 1
    return start, max(start, end)


# ─── Main import logic ─────────────────────────────────────────────────────────

def import_pdf(pdf_path: Path, catalog_entry: dict, curriculum_topics: dict, dry_run: bool) -> dict:
    """
    Import một file PDF: scan tất cả topics trong catalog_entry.
    Trả về report dict với kết quả từng topic.
    """
    document_id = catalog_entry["documentId"]
    topic_ids = catalog_entry["topicIds"]
    sha256 = sha256_file(pdf_path)
    file_name = pdf_path.name

    print(f"\n  📄 {file_name}")
    print(f"     Document ID : {document_id}")
    print(f"     SHA-256     : {sha256[:20]}...")

    # Mở PDF đọc toàn bộ blocks
    doc = pymupdf.open(str(pdf_path))
    page_count = doc.page_count
    doc.close()
    print(f"     Trang       : {page_count}")

    # Extract all blocks (toàn bộ file)
    all_blocks = extract_blocks_from_pdf(pdf_path, 1, page_count)
    all_blocks = assign_sections(all_blocks)

    results = []
    for topic_id in topic_ids:
        topic_info = curriculum_topics.get(topic_id, {"title": topic_id})
        topic_title = topic_info.get("title", topic_id)

        # Detect page range cho topic này
        start_page, end_page = detect_topic_pages(all_blocks, topic_id)
        topic_num = int(topic_id[2:])

        # Lấy blocks trong range này
        topic_blocks = [b for b in all_blocks if start_page <= b["_page"] <= end_page]

        # Với mỗi subtopic (Dạng X.Y), scan headings
        subtopic_headings = {}
        for b in topic_blocks:
            m = HEADING_RE.match(b["text"])
            if m:
                code = m.group(1)
                parts = code.split(".")
                if int(parts[0]) == topic_num:
                    if code not in subtopic_headings:
                        subtopic_headings[code] = b["_page"]

        # Nếu không detect được subtopic headings, tạo 1 record chung cho topic
        if not subtopic_headings:
            code = f"{topic_num}.1"
            subtopic_headings = {code: start_page}

        # Import từng subtopic
        sorted_codes = sorted(subtopic_headings.keys(),
                              key=lambda c: (int(c.split(".")[0]), int(c.split(".")[1])))

        for idx, code in enumerate(sorted_codes):
            sub_start = subtopic_headings[code]
            # Kết thúc subtopic = trang trước subtopic tiếp theo
            if idx + 1 < len(sorted_codes):
                next_code = sorted_codes[idx + 1]
                sub_end = subtopic_headings[next_code] - 1
                if sub_end < sub_start:
                    sub_end = sub_start
            else:
                sub_end = end_page

            sub_blocks = [b for b in topic_blocks if sub_start <= b["_page"] <= sub_end]

            # Check tồn tại
            review_json = REVIEW_DIR / document_id / f"{code}.json"
            if review_json.exists() and not dry_run:
                existing = json.loads(review_json.read_text(encoding="utf-8"))
                if existing.get("verification", {}).get("status") == "verified":
                    print(f"     ⏭️  {code} — đã verified, bỏ qua.")
                    results.append({"code": code, "status": "skip-verified"})
                    continue

            if dry_run:
                print(f"     🔍 {code} — trang {sub_start}–{sub_end} ({len(sub_blocks)} blocks) [DRY RUN]")
                results.append({"code": code, "status": "dry-run", "startPage": sub_start, "endPage": sub_end, "blocks": len(sub_blocks)})
                continue

            # Build record
            record = build_review_record(
                code=code,
                topic_id=topic_id,
                topic_title=topic_title,
                document_id=document_id,
                file_name=file_name,
                sha256=sha256,
                page_count=page_count,
                start_page=sub_start,
                end_page=sub_end,
                blocks_raw=sub_blocks,
            )

            # Save
            review_json.parent.mkdir(parents=True, exist_ok=True)
            review_md = REVIEW_DIR / document_id / f"{code}.md"
            review_json.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            review_md.write_text(record["markdown"], encoding="utf-8")

            n_errors = sum(1 for f in record["flags"] if f["severity"] == "error")
            icon = "✅" if n_errors == 0 else "⚠️ "
            print(f"     {icon} {code} — trang {sub_start}–{sub_end} ({len(record['blocks'])} blocks, {n_errors} lỗi) → {review_json.relative_to(ROOT)}")
            results.append({
                "code": code,
                "status": "ok" if n_errors == 0 else "ok-with-flags",
                "startPage": sub_start,
                "endPage": sub_end,
                "blocks": len(record["blocks"]),
                "errors": n_errors,
                "reviewJson": str(review_json.relative_to(ROOT)),
            })

    return {"file": file_name, "documentId": document_id, "sha256": sha256, "subtopics": results}


# ─── Entry point ──────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="BienEdu TaiLieu PyMuPDF Importer")
    parser.add_argument("--dry-run", action="store_true", help="Chỉ in kế hoạch, không ghi file")
    parser.add_argument("--doc", default=None, help="Chỉ import document ID cụ thể")
    parser.add_argument("--dir", default=str(TAILIEU_DIR), help="Thư mục chứa PDF")
    args = parser.parse_args()

    source_dir = Path(args.dir)
    dry_run = args.dry_run
    filter_doc = args.doc

    print("\n╔══════════════════════════════════════════════════════╗")
    print("║   BienEdu TaiLieu AI Import (PyMuPDF engine)        ║")
    print("╚══════════════════════════════════════════════════════╝")
    print(f"  Nguồn    : {source_dir}")
    print(f"  Dry run  : {dry_run}")
    if filter_doc:
        print(f"  Filter   : {filter_doc}")

    # Load curriculum
    curriculum_topics = load_curriculum_topics()
    print(f"  Curriculum: {len(curriculum_topics)} topics loaded")

    # Scan PDF files
    pdf_files = sorted(source_dir.glob("*.pdf"))
    print(f"  PDF files : {len(pdf_files)} tìm thấy\n")

    all_reports = []
    for pdf_path in pdf_files:
        entry = detect_catalog(pdf_path.name)
        if not entry:
            print(f"  ❓ {pdf_path.name} — chưa nhận dạng (thêm vào TAILIEU_CATALOG)")
            continue
        if filter_doc and entry["documentId"] != filter_doc:
            continue
        report = import_pdf(pdf_path, entry, curriculum_topics, dry_run)
        all_reports.append(report)

    # Summary
    total_ok = sum(
        sum(1 for s in r["subtopics"] if s["status"].startswith("ok"))
        for r in all_reports
    )
    total_skip = sum(
        sum(1 for s in r["subtopics"] if s["status"].startswith("skip"))
        for r in all_reports
    )
    total_err = sum(
        sum(1 for s in r["subtopics"] if s["status"] == "error")
        for r in all_reports
    )

    print("\n──────────────────────────────────────────────────────")
    print(f"  ✅ OK: {total_ok}  ⏭️  Bỏ qua: {total_skip}  ❌ Lỗi: {total_err}")

    if not dry_run:
        REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
        report_data = {
            "importedAt": now_iso(),
            "dryRun": dry_run,
            "totalOk": total_ok,
            "totalSkipped": total_skip,
            "totalErrors": total_err,
            "files": all_reports,
        }
        REPORT_PATH.write_text(json.dumps(report_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"  📋 Báo cáo: {REPORT_PATH.relative_to(ROOT)}")

        if total_ok > 0:
            print("\n  💡 Bước tiếp theo:")
            print("     1. Review từng file trong content/review/<documentId>/")
            print("     2. node scripts/math-pdf/cli.mjs validate --subtopic CODE")
            print("     3. node scripts/math-pdf/cli.mjs approve  --subtopic CODE --reviewer TEN \\")
            print("            --source-verified --formulas-verified --boundaries-verified")
            print("     4. node scripts/math-pdf/cli.mjs publish  --subtopic CODE")
    print()


if __name__ == "__main__":
    main()
