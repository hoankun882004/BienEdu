"""Atomic replacement for reproducible generated evidence, never original sources."""
import os
import tempfile
from pathlib import Path


def atomic_write_bytes(path: Path, data: bytes):
    path = Path(path)
    # A deterministic replay should not reopen a valid crop for truncation.
    if path.exists() and path.read_bytes() == data:
        return
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, prefix=path.name + ".", suffix=".tmp", delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()
