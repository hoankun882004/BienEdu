"""Read-only source verification for the EXISTING 30 knowledge figure IDs."""
import hashlib
import json
import sys
from pathlib import Path
import pymupdf

ROOT = Path(__file__).resolve().parents[2]
sys.stdout.reconfigure(encoding='utf-8')
pages, result = {}, []
for request in json.load(sys.stdin):
    source = request['source']
    path = (ROOT / source['file']).resolve()
    if not path.is_relative_to(ROOT / '39 chuyên đề') or hashlib.sha256(path.read_bytes()).hexdigest().upper() != source['sha256']:
        raise ValueError('Source PDF changed')
    identity = (str(path), request['page'])
    if identity not in pages:
        pdf = pymupdf.open(path)
        page = pdf[request['page'] - 1]
        glyphs = [(c['c'], span['font'], c['origin'][0], c['origin'][1], span['size'])
                  for b in page.get_text('rawdict')['blocks'] for line in b.get('lines', [])
                  for span in line['spans'] for c in span['chars']]
        pages[identity] = (glyphs, page.get_text())
    glyphs, context = pages[identity]
    count = 0
    for line in request['lines']:
        for c in line:
            if not any(value == c['c'] and font == c['font'] and abs(x-c['x']) < .001
                       and abs(y-c['y']) < .001 and abs(size-c['size']) < .001 for value,font,x,y,size in glyphs):
                raise ValueError('Figure glyph not present at its original location: ' + request['blockId'])
            count += 1
    result.append({'blockId': request['blockId'], 'sourceId': source['sourceId'], 'sourceHash': source['sha256'],
                   'page': request['page'], 'glyphsMatched': count, 'sourceContext': context,
                   'policy': 'PDF vector/glyph structure is evidence, not a measurement of unspecified coordinates.'})
print(json.dumps(result, ensure_ascii=False))
