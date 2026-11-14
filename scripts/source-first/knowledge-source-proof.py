"""Read-only independent source glyph identity check, not blanket math proof."""
from pathlib import Path
from collections import Counter
import hashlib
import json
import pymupdf

ROOT=Path(__file__).resolve().parents[2]
HASH=lambda b:hashlib.sha256(b).hexdigest().upper()
evidence=json.loads((ROOT/'.audit/pdf-knowledge/evidence.json').read_text('utf8'))
results=[]
for entry in evidence['sources']:
    source=entry['source']
    assert HASH((ROOT/source['file']).read_bytes())==source['sha256'],source['file']
    matched=0
    with pymupdf.open(ROOT/source['file']) as pdf:
        pages={}
        for p in pdf:
            pages[p.number+1]=Counter((c['c'],tuple(c['origin']),c['bbox'][2],span['size'],span['font'])
                for b in p.get_text('rawdict')['blocks'] for line in b.get('lines',[]) for span in line['spans'] for c in span['chars'])
        for record in entry['records']:
            for block in record['blocks']:
                glyphs=[c for item in block['evidence'] for line in item['lines'] for c in line]
                required=Counter((c['c'],(c['x'],c['y']),c['right'],c['size'],c['font']) for c in glyphs)
                assert not required-pages[block['page']],block['id']
                matched+=len(glyphs)
    results.append({'sourceId':source['sourceId'],'sha256':source['sha256'],'pages':len(pages),'records':len(entry['records']),'glyphOccurrencesMatched':matched})
print(json.dumps({'passed':True,'sources':results,'scope':'Positioned original glyph identity for cached source blocks; mathematical interpretation is NOT certified by glyph presence alone.'}))
