"""Isolated diagnostic/regression: partial crop visibility vs atomic replacement."""
import hashlib
import json
import tempfile
from pathlib import Path
from unittest.mock import patch
import os
import time
import subprocess
import sys
from collections import Counter
import pymupdf
from artifact_io import atomic_write_bytes

ROOT = Path(__file__).resolve().parents[2]
snapshot = json.loads((ROOT / ".content-work/source-first-v5/snapshot.json").read_text(encoding="utf-8"))
item = next(item for item in snapshot["items"] if item["source"]["kind"] == "pdf")
original = (ROOT / item["assetReferences"][0]["path"]).read_bytes()
expected = hashlib.sha256(original).hexdigest().upper()
assert expected == item["assetReferences"][0]["sha256"]
with tempfile.TemporaryDirectory(prefix="bienedu-crop-race-") as directory:
    target = Path(directory) / "crop.png"
    target.write_bytes(original)
    # Model the open/truncate/write window of a path-based PNG save exactly.
    with target.open("wb") as stream:
        during_old_write = hashlib.sha256(target.read_bytes()).hexdigest().upper()
        stream.write(original)
    assert during_old_write != expected
    # The actual PyMuPDF save path is also observed by a concurrent reader.
    observations = []
    pixmap = pymupdf.Pixmap(original)
    complete = pixmap.tobytes("png")
    source_copy = Path(directory) / "source.png"
    source_copy.write_bytes(original)
    # Separate processes reproduce the Node-reader/Python-writer architecture;
    # threads would introduce Python GIL/file-handle scheduling artifacts.
    worker = """import pymupdf,sys,time,json
from pathlib import Path
pixmap=pymupdf.Pixmap(Path(sys.argv[1]).read_bytes())
failures=0
for _ in range(100):
    try: pixmap.save(sys.argv[2])
    except Exception: failures+=1
    time.sleep(.001)
print(json.dumps({'writerFailures':failures}))
"""
    writer = subprocess.Popen([sys.executable, "-c", worker, str(source_copy), str(target)], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    while writer.poll() is None:
        try:
            if target.read_bytes() not in (original, complete):
                observations.append("partial-png-visible")
        except FileNotFoundError:
            observations.append("crop-temporarily-missing")
        except PermissionError:
            observations.append("crop-read-sharing-violation")
        time.sleep(.0002)
    stdout, stderr = writer.communicate()
    assert writer.returncode == 0, stderr
    writer_errors = json.loads(stdout)["writerFailures"]
    # Re-encoding may differ by PNG metadata, so compare its complete bytes too.
    target.write_bytes(original)
    actual_replace = os.replace
    atomic_observations = []
    def inspect_replace(source, destination):
        atomic_observations.append(Path(destination).read_bytes() == original)
        assert Path(source).read_bytes() == complete + b"\n"
        actual_replace(source, destination)
    with patch("artifact_io.os.replace", inspect_replace):
        atomic_write_bytes(target, complete + b"\n")
    assert atomic_observations == [True]
    assert target.read_bytes() == complete + b"\n"
    stamp = target.stat().st_mtime_ns
    atomic_write_bytes(target, complete + b"\n")
    assert target.stat().st_mtime_ns == stamp
    assert list(Path(directory).glob("*.tmp")) == []
    print(json.dumps({"isolated": True, "crop": item["id"], "historicalFailedItem": "not recorded in original failure log",
                      "oldWriteWindowInvalidHash": during_old_write != expected,
                      "actualPixmapSaveInvalidObservations": len(observations),
                      "actualReadFailuresByType": dict(Counter(observations)),
                      "actualPixmapSaveWriterFailures": writer_errors,
                      "atomicDestinationIntactUntilReplace": True, "unchangedReplayDoesNotRewrite": True,
                      "realEvidenceWrites": 0}))
