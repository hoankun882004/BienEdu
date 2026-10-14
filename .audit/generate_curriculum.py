"""Generate browser-ready curriculum metadata from the source XLSX using only Python stdlib."""

from __future__ import annotations

import hashlib
import json
import re
import sys
from collections import OrderedDict
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
NS = {"m": MAIN_NS, "r": REL_NS, "pr": PACKAGE_REL_NS}
EXPECTED_HEADERS = ["Mã phần", "Phần kiến thức", "Mã chuyên đề", "Chuyên đề", "Mã dạng", "Dạng bài", "Mã ngắn"]


def column_index(cell_ref: str) -> int:
    letters = re.match(r"[A-Z]+", cell_ref).group(0)
    value = 0
    for letter in letters:
        value = value * 26 + ord(letter) - 64
    return value - 1


def load_rows(source: Path) -> tuple[list[str], list[list[str]]]:
    with ZipFile(source) as archive:
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        sheets = workbook.findall("m:sheets/m:sheet", NS)
        sheet_names = [sheet.attrib["name"] for sheet in sheets]
        if sheet_names != ["Sheet1"]:
            raise ValueError(f"Expected one worksheet named Sheet1, found {sheet_names}")

        relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        targets = {item.attrib["Id"]: item.attrib["Target"] for item in relationships}
        relationship_id = sheets[0].attrib[f"{{{REL_NS}}}id"]
        worksheet_target = targets[relationship_id].lstrip("/")
        if not worksheet_target.startswith("xl/"):
            worksheet_target = f"xl/{worksheet_target}"

        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in root.findall("m:si", NS):
                shared_strings.append("".join(node.text or "" for node in item.iter(f"{{{MAIN_NS}}}t")))

        worksheet = ET.fromstring(archive.read(worksheet_target))
        rows: list[list[str]] = []
        for row in worksheet.findall(".//m:sheetData/m:row", NS):
            values = [""] * 7
            for cell in row.findall("m:c", NS):
                index = column_index(cell.attrib["r"])
                if index >= len(values):
                    continue
                value_node = cell.find("m:v", NS)
                value = "" if value_node is None else value_node.text or ""
                cell_type = cell.attrib.get("t")
                if cell_type == "s" and value:
                    value = shared_strings[int(value)]
                elif cell_type == "inlineStr":
                    value = "".join(node.text or "" for node in cell.iter(f"{{{MAIN_NS}}}t"))
                values[index] = value.strip()
            rows.append(values)
    return sheet_names, rows


def build_curriculum(rows: list[list[str]]) -> tuple[list[dict], dict]:
    if len(rows) < 3 or rows[1] != EXPECTED_HEADERS:
        raise ValueError(f"Unexpected header row: {rows[1] if len(rows) > 1 else 'missing'}")

    records = rows[2:]
    groups: OrderedDict[str, dict] = OrderedDict()
    topics: OrderedDict[str, dict] = OrderedDict()
    short_codes: set[str] = set()

    for source_order, record in enumerate(records, start=1):
        group_id, group_name, topic_id, topic_title, exercise_code, exercise_title, short_code = record
        if any(not value for value in record):
            raise ValueError(f"Missing value on source data row {source_order + 2}: {record}")
        if short_code in short_codes:
            raise ValueError(f"Duplicated short code: {short_code}")
        short_codes.add(short_code)

        if group_id not in groups:
            groups[group_id] = {"id": group_id, "name": group_name, "order": len(groups) + 1, "topics": []}
        elif groups[group_id]["name"] != group_name:
            raise ValueError(f"Conflicting name for group {group_id}")

        if topic_id not in topics:
            topic = {
                "id": topic_id,
                "title": topic_title,
                "groupId": group_id,
                "order": len(topics) + 1,
                "documentStatus": "not_uploaded",
                "exerciseTypes": [],
            }
            topics[topic_id] = topic
            groups[group_id]["topics"].append(topic)
        else:
            topic = topics[topic_id]
            if topic["title"] != topic_title or topic["groupId"] != group_id:
                raise ValueError(f"Conflicting metadata for topic {topic_id}")

        topic["exerciseTypes"].append({
            "id": short_code,
            "code": exercise_code,
            "title": exercise_title,
            "order": len(topic["exerciseTypes"]) + 1,
        })

    expected_topic_ids = [f"CD{number:02d}" for number in range(1, 40)]
    actual_topic_ids = list(topics)
    exercise_count = sum(len(topic["exerciseTypes"]) for topic in topics.values())
    validations = {
        "worksheet": "Sheet1",
        "groupCount": len(groups),
        "topicCount": len(topics),
        "exerciseTypeCount": exercise_count,
        "topicIdsComplete": actual_topic_ids == expected_topic_ids,
        "duplicateShortCodes": len(records) - len(short_codes),
        "missingValues": 0,
        "sourceOrderPreserved": True,
    }
    if validations["groupCount"] != 13:
        raise ValueError(f"Expected 13 groups, found {validations['groupCount']}")
    if validations["topicCount"] != 39:
        raise ValueError(f"Expected 39 topics, found {validations['topicCount']}")
    if validations["exerciseTypeCount"] != 347:
        raise ValueError(f"Expected 347 exercise types, found {validations['exerciseTypeCount']}")
    if not validations["topicIdsComplete"]:
        raise ValueError("Topic IDs are not the complete ordered range CD01–CD39")
    return list(groups.values()), validations


def render_module(groups: list[dict], validations: dict, source_hash: str) -> str:
    payload = json.dumps(groups, ensure_ascii=False, indent=2)
    meta = json.dumps({**validations, "sourceSha256": source_hash}, ensure_ascii=False, indent=2)
    return (
        "// Generated from the supplied Excel workbook. Do not edit curriculum records by hand.\n"
        f"export const curriculumMeta = Object.freeze({meta});\n\n"
        f"export const curriculumGroups = {payload};\n\n"
        "export const curriculumTopics = curriculumGroups.flatMap((group) => group.topics);\n"
        "export const exerciseTypes = curriculumTopics.flatMap((topic) => topic.exerciseTypes);\n"
    )


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: generate_curriculum.py <source.xlsx> <output.js>")
    source = Path(sys.argv[1]).resolve()
    output = Path(sys.argv[2]).resolve()
    _, rows = load_rows(source)
    groups, validations = build_curriculum(rows)
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest().upper()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(render_module(groups, validations, source_hash), encoding="utf-8", newline="\n")
    print(json.dumps({**validations, "sourceSha256": source_hash}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
