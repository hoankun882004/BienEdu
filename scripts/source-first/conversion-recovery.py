"""Read-only PDF glyph replay. No old audit, source, or runtime writes."""
import importlib.util
import json
import hashlib
from pathlib import Path
from collections import Counter
import sys
import pymupdf

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('knowledge_recovery',Path(__file__).with_name('knowledge-pdf.py'))
knowledge=importlib.util.module_from_spec(spec)
spec.loader.exec_module(knowledge)
HASH=lambda b:hashlib.sha256(b).hexdigest().upper()

def replay():
    evidence=json.loads((ROOT/'.audit/pdf-knowledge/evidence.json').read_text('utf8'))
    candidates=[]
    sources=[]
    for entry in evidence['sources']:
        source=entry['source']
        path=ROOT/source['file']
        if HASH(path.read_bytes())!=source['sha256']:
            raise ValueError('Stale original PDF: '+source['sourceId'])
        sources.append(source)
        with pymupdf.open(path) as pdf:
            glyphs={}
            for page in pdf:
                glyphs[page.number+1]=Counter((c['c'],tuple(c['origin']),c['bbox'][2],span['size'],span['font'])
                    for b in page.get_text('rawdict')['blocks'] for line in b.get('lines',[])
                    for span in line['spans'] for c in span['chars'])
            for record in entry['records']:
                for block in record['blocks']:
                    if block['kind']!='paragraph' or block.get('conversion') or block['errors']:
                        continue
                    chars=[c for item in block['evidence'] for line in item['lines'] for c in line]
                    # Replay only evidenced differential or radical ownership.
                    if not any(c['c']=='√' or c['c']=='d' and not knowledge.basic.MATH.match(c['font']) for c in chars):
                        continue
                    expected=Counter((c['c'],(c['x'],c['y']),c['right'],c['size'],c['font']) for c in chars)
                    if expected-glyphs[block['page']]:
                        raise ValueError('Source glyph identity mismatch: '+block['id'])
                    chunks=[line for item in block['evidence'] for line in item['lines']]
                    trace=knowledge.layout.TRACE
                    start=len(trace)
                    content,errors=knowledge.conversion(chunks,knowledge.page_bars(pdf[block['page']-1]))
                    changes=[n for n in trace[start:] if n['kind']=='Differential' or n['kind']=='Radical' and n['latex'].startswith('\\sqrt[')]
                    if changes and not errors:
                        candidates.append({'recordId':record['id'],'blockId':block['id'],'source':source,
                            'page':block['page'],'glyphHash':block['glyphHash'],'original':block['original'],
                            'glyphCount':len(chars),'before':block['content'],'after':content,
                            'category':'RADICAL_SCOPE' if any(n['kind']=='Radical' for n in changes) else 'MATH_PROSE_BOUNDARY','evidence':changes,
                            'status':'SOURCE_MATCHED','scope':'Literal differential/indexed-radical glyph ownership only; not blanket certification of the original transcription.'})
    return {'sources':sources,'candidates':candidates}

if __name__=='__main__':
    sys.stdout.reconfigure(encoding='utf8')
    print(json.dumps(replay(),ensure_ascii=False))
