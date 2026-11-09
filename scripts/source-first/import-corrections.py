"""Source-hash/record/page/field-bound V5.6 overrides shared by the importer.
Does not authorize publication or mutate PDF/TeX files.
"""
import hashlib
import json
from pathlib import Path


def apply_corrections(example, document_id, document, root):
    path = root / "scripts/source-first/corrections-v56.json"
    if not path.exists():
        return example
    records = json.loads(path.read_text(encoding="utf-8"))["corrections"]
    matches = [entry for entry in records if entry["recordId"] == example["id"]]
    if not matches:
        return example
    if len(matches) != 1:
        raise ValueError("Duplicate correction identity")
    correction = matches[0]
    actual_hash = hashlib.sha256(Path(document.name).read_bytes()).hexdigest().upper()
    pages = {entry["role"]:entry["page"] for entry in correction["regions"]}
    if (actual_hash != correction["sourceHash"] or correction["sourceDocumentId"] != document_id
            or correction["sourceBlockId"] != example["sourceBlockId"]
            or pages.get("statement") != example["statementSourcePage"]
            or pages.get("solution") != example["solutionSourcePage"]):
        raise ValueError("Source/record/block/page-bound correction mismatch")
    changes = []
    for field in correction["fields"]:
        container, key = example, field["field"]
        if key == "source-solution.expression":
            steps = [step for step in example["steps"] if step["label"] == "Lời giải từ tài liệu"]
            if len(steps) != 1:
                raise ValueError("Non-unique named solution")
            container, key = steps[0], "expression"
        if container.get(key) not in (field["before"], field["after"]):
            raise ValueError("Unexpected exact source extraction; refuse broad replacement")
        changes.append((container,key,field["after"]))
    # Validate every member before changing any field of this correction group.
    for container,key,value in changes:
        container[key] = value
    return example
