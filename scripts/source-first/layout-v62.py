"""Bounded glyph/vector layout reconstruction; an adapter to V5.7, not OCR.

Only owned glyphs are consumed. Every structural node retains its source bounds.
No expression is inferred from mathematical plausibility or a raster image.
"""
import importlib.util
from collections import Counter
from pathlib import Path
import json
import re
import sys
import pymupdf

_spec = importlib.util.spec_from_file_location('source_v61', Path(__file__).with_name('content-v61.py'))
basic = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(basic)
TRACE = []
CONVERSIONS = []


def bounds(chars):
    return [min(c['x'] for c in chars), min(c['y']-c['size'] for c in chars),
            max(c['right'] for c in chars), max(c['y']+c['size']*.2 for c in chars)]


def atom(children, latex, kind, baseline, size, geometry=None):
    box = bounds(children)
    tree = {'kind': kind, 'bounds': box, 'latex': latex, 'page': children[0].get('page',0),
            'children': [c.get('tree', {'kind': 'MathSymbol', 'value': c['c'], 'font': c['font'],
                                      'size': c['size'], 'origin': [c['x'], c['y']],
                                      'right': c['right']}) for c in children]}
    if geometry is not None:
        tree['geometry'] = geometry
    TRACE.append(tree)
    return {'c': latex, 'x': box[0], 'right': box[2], 'y': baseline, 'size': size,
            'font': 'CM-STRUCTURE', 'latex': latex, 'tree': tree, 'page': children[0].get('page', 0)}


def symbol(c):
    if 'latex' in c:
        return c['latex']
    if c['c'] in ('̸', '\ufffd', '\x00'):
        raise ValueError('MISSING_OR_COMBINING_GLYPH: requires independently bounded accent')
    if c['font'].startswith('CMEX'):
        # Integral/delimiter placement must be handled before the ordinary row.
        raise ValueError('EXTENSIBLE_OPERATOR_SCOPE_UNRESOLVED:'+c['c'])
    return basic.glyph(c)


def row_math(chars, depth=0):
    if depth > 12 or len(chars) > 1800:
        raise ValueError('LAYOUT_COMPLEXITY_LIMIT')
    chars = sorted((c for c in chars if not c['c'].isspace()), key=lambda c:(c['x'], c['y']))
    if not chars:
        raise ValueError('EMPTY_MATH_GROUP')
    size = max(c['size'] for c in chars)
    body = [c for c in chars if abs(c['size']-size)<.45]
    frequencies = Counter(round(c['y'], 1) for c in body)
    base = frequencies.most_common(1)[0][0]
    if any(abs(c['y']-base) > .8 for c in body):
        raise ValueError('COMPETING_BASELINES: no unique EquationRow')
    result, i, last_right = '', 0, None
    while i < len(chars):
        c = chars[i]
        if c['size'] < size*.87:
            if last_right is None or c['x'] < last_right-1:
                raise ValueError('SCRIPT_OWNER_UNRESOLVED')
            direction = '^' if c['y'] < base-.65 else '_' if c['y'] > base+.65 else None
            if direction is None:
                raise ValueError('SCRIPT_BASELINE_UNRESOLVED')
            if abs(c['y']-base)>size*(.55 if direction=='_' else .85):
                raise ValueError('SCRIPT_VERTICAL_SCOPE_UNRESOLVED')
            script_size, script_base = c['size'], c['y']
            group = []
            while i < len(chars) and chars[i]['size'] < size*.87:
                n = chars[i]
                if n['size'] >= script_size*.9 and abs(n['y']-script_base) > .8:
                    break
                group.append(n); i += 1
            expression = row_math(group, depth+1)
            TRACE.append({'kind':'Superscript' if direction=='^' else 'Subscript',
                          'bounds':bounds(group),'latex':expression,'baseline':base})
            result += direction+'{'+expression+'}'
            continue
        operator = next((name for name in ['arcsin','arccos','arctan','sin','cos','tan','cot','ln','log','lim','exp']
                         if ''.join(t['c'] for t in chars[i:i+len(name)])==name
                         and all(t['font'].startswith('CMR') and abs(t['size']-size)<.45
                                 for t in chars[i:i+len(name)])), None)
        if operator:
            result += '\\'+operator+' '
            last_right=chars[i+len(operator)-1]['right']; i+=len(operator)
        else:
            result+=symbol(c); last_right=c['right']; i+=1
    return result.strip()


def normalize_operators(items, strict):
    for operator in [c for c in items if c['font'].startswith('CMEX')]:
        if operator['c'] not in ['∫','∑','∏','(',')','[',']']:
            continue
        anchors=[c for c in items if c is not operator and c['size']>=operator['size']*.95
                 and not c['font'].startswith('CMEX') and
                 5<c['y']-operator['y']<operator['size']*1.8 and
                 abs(c['x']-operator['right'])<operator['size']*5]
        baselines=set(round(c['y'],1) for c in anchors)
        if len(baselines)!=1:
            if strict:raise ValueError('EXTENSIBLE_OPERATOR_BASELINE_AMBIGUOUS:'+operator['c'])
            continue
        value={'∫':r'\int ','∑':r'\sum ','∏':r'\prod '}.get(operator['c'],operator['c'])
        items=[c for c in items if c is not operator]+[
            atom([operator],value,'MathOperator',next(iter(baselines)),operator['size'])]
    return items


def structures(chars, bars):
    """Collapse smallest supported geometry first; reject competing ownership."""
    items = [c for c in chars if not c['c'].isspace()]
    for slash in [c for c in items if c['c']=='̸']:
        owners=[c for c in items if c['c']=='=' and abs(c['y']-slash['y'])<.5
                and -.5<c['x']-slash['x']<slash['size']*.55]
        if len(owners)!=1:
            raise ValueError('NEGATION_OWNER_UNRESOLVED')
        owner=owners[0]
        items=[c for c in items if c is not slash and c is not owner]+[
            atom([slash,owner],r'\ne ','MathOperator',owner['y'],owner['size'])]
    for head in [c for c in items if c['c']=='→']:
        stems=sorted([c for c in items if c['c'] in ['−','-'] and
                      abs(c['y']-head['y'])<.4 and head['x']-head['size']*2<c['x']<head['x']],key=lambda c:c['x'])
        if not stems:continue
        chain=[];following=head
        for stem in reversed(stems):
            if 0<following['x']-stem['x']<head['size']*.65 and stem['right']>=following['x']:
                chain.insert(0,stem);following=stem
            else:break
        stems=chain
        if not stems:continue
        arrow=[*stems,head]
        x0,x1=min(c['x'] for c in arrow),max(c['right'] for c in arrow)
        owners=[c for c in items if c not in arrow and c['font'].startswith('CMMI') and
                c['x']>=x0-.8 and c['right']<=x1+.8 and head['size']*.5<c['y']-head['y']<head['size']]
        if not owners:continue  # A normal implication is not a vector accent.
        if len(set(round(c['y'],1) for c in owners))!=1 or not all(re.fullmatch('[A-Za-z]',c['c']) for c in owners):
            raise ValueError('VECTOR_ACCENT_SCOPE_AMBIGUOUS')
        owner_left,owner_right=min(c['x'] for c in owners),max(c['right'] for c in owners)
        if len(owners)>1 and (abs(owner_left-x0)>1.2 or abs(owner_right-x1)>1.2):
            raise ValueError('VECTOR_ACCENT_PARTIAL_OWNER')
        if len(owners)==1 and abs(owner_left+owner_right-x0-x1)>1.6:
            raise ValueError('VECTOR_ACCENT_SINGLE_OWNER_AMBIGUOUS')
        latex=r'\overrightarrow{'+row_math(owners)+'}'
        replacement=atom([*arrow,*owners],latex,'MathGroup',owners[0]['y'],owners[0]['size'])
        items=[c for c in items if c not in arrow and c not in owners]+[replacement]
    items=normalize_operators(items,False)
    unique = sorted(set(tuple(round(v, 3) for v in b) for b in bars), key=lambda b:(b[1]-b[0],-b[2]))
    relevant=[]
    for x0,x1,y in unique:
        near=[c for c in items if basic.MATH.match(c['font']) and c['right']>x0-.3 and c['x']<x1+.3
              and abs(c['y']-y)<c['size']*.95 and
              ((c['x']>=x0-.35 and c['right']<=x1+.35) or abs(c['y']-y)<c['size']*.55)]
        if near:
            relevant.append((x0,x1,y))
    unresolved=[]
    for x0,x1,y in relevant:
        # Exact square-root glyph + contiguous original vector overbar owns its
        # radicand; a following +b outside x1 can never enter the radical.
        roots=[c for c in items if c['c']=='√' and abs(c['right']-x0)<.8 and abs(c['y']-y)<.8]
        if len(roots)>1:
            raise ValueError('COMPETING_RADICAL_OWNERS')
        if roots:
            root=roots[0]
            inside=[c for c in items if c is not root and c['x']>=x0-.35 and c['right']<=x1+.35
                    and y+.4<c['y']<y+root['size']*1.7]
            if not inside or any(not basic.MATH.match(c['font']) for c in inside):
                unresolved.append('RADICAL_RADICAND_BOUNDARY_UNRESOLVED'); continue
            index=[c for c in items if c['size']<root['size']*.75 and root['x']-3<c['x']<x0
                   and y-4<c['y']<y+2]
            if len(index)>1:
                unresolved.append('RADICAL_INDEX_AMBIGUOUS'); continue
            if index and any(c not in index and c is not root and c['right']<=index[0]['x']+.5
                             and index[0]['x']-c['right']<root['size']*.8 and c['size']>=root['size']*.9
                             and abs(c['y']-max(inside,key=lambda n:n['size'])['y'])<.8 for c in items):
                unresolved.append('RADICAL_INDEX_COMPETING_SCRIPT_OWNER');continue
            expression=row_math(inside)
            latex='\\sqrt'+('['+row_math(index)+']' if index else '')+'{'+expression+'}'
            owned=[root,*inside,*index]
            replacement=atom(owned,latex,'Radical',max(inside,key=lambda c:c['size'])['y'],root['size'],[x0,x1,y])
        else:
            nearby=[c for c in items if c['x']>=x0-.35 and c['right']<=x1+.35
                    and basic.MATH.match(c['font']) and abs(c['y']-y)<c['size']*2.5]
            scope_size=max((c['size'] for c in nearby),default=0)
            owned=[c for c in nearby if y-scope_size*1.5<c['y']<y+scope_size*1.6]
            above=[c for c in owned if c['y']<y-.35]
            below=[c for c in owned if c['y']>y+.65]
            if not above or not below or len(above)+len(below)!=len(owned):
                unresolved.append('BAR_ROLE_UNRESOLVED'); continue
            try:
                numerator,denominator=row_math(above),row_math(below)
            except ValueError as error:
                unresolved.append('FRACTION_BOUNDARY_AMBIGUOUS:'+str(error)); continue
            # A neighboring glyph partially crossing the bar is competing scope.
            if any(c not in owned and c['c']!='√' and basic.MATH.match(c['font']) and
                   ((c['x']<x0-.35<c['right']) or (c['x']<x1+.35<c['right'])) and
                   abs(c['y']-y)<c['size']*.7 for c in items):
                unresolved.append('FRACTION_EDGE_CROSSING'); continue
            latex='\\frac{'+numerator+'}{'+denominator+'}'
            surrounding=[c for c in items if c not in owned and abs(c['y']-y)<4 and c['size']>9]
            own_size=max(c['size'] for c in owned)
            body_size=Counter(round(c['size'],2) for c in surrounding).most_common(1)[0][0] if surrounding else own_size if own_size>9 else own_size*1.368
            replacement=atom(owned,latex,'Fraction',y+body_size*.25,body_size,[x0,x1,y])
        items=[c for c in items if c not in owned]+[replacement]
    if unresolved:
        raise ValueError(';'.join(sorted(set(unresolved))))
    if any(c['c']=='√' for c in items):
        raise ValueError('RADICAL_WITHOUT_BOUND_OVERBAR')
    return normalize_operators(items,True)


def _convert(chunks, bars):
    """Retain physical equation rows, prose and exact source example boundaries."""
    flat=[c for line in chunks for c in line if not c['c'].isspace()]
    if not flat:
        return {'type':'rich-text','segments':[]}, []
    try:
        items=structures(flat,bars)
        # Stable source body size, not a global fixed superscript threshold.
        body=Counter(round(c['size'],2) for c in items if c['size']>9 and not c['font'].startswith('CMEX')).most_common(1)
        size=body[0][0] if body else max(c['size'] for c in items)
        anchors=sorted(set(round(c['y'],1) for c in items if c['size']>=size*.9 and not c['font'].startswith('CMEX')))
        rows=[]
        for y in anchors:
            if not rows or y-rows[-1]>.85:
                rows.append(y)
        if any(b-a<size*.9 for a,b in zip(rows,rows[1:])):
            raise ValueError('UNRESOLVED_OVERLAY: close body baselines are not independent equation rows')
        grouped={y:[] for y in rows}
        for c in items:
            if not rows:
                raise ValueError('NO_EQUATION_ROW_ANCHOR')
            closest=min(rows,key=lambda y:abs(c['y']-y))
            if abs(c['y']-closest)>size*.9:
                raise ValueError('UNOWNED_LAYOUT_GLYPH')
            grouped[closest].append(c)
        nodes=[]
        for y in rows:
            line=sorted(grouped[y],key=lambda c:c['x'])
            buffer=[]; kind=None
            def flush():
                if not buffer:return
                if kind=='math':
                    nodes.append({'type':'math','latex':row_math(buffer),'display':False})
                else:
                    nodes.append({'type':'text','value':basic.prose(buffer)})
                buffer.clear()
            previous=None
            for c in line:
                current='math' if basic.MATH.match(c['font']) else 'text'
                if current!=kind:
                    flush()
                    if nodes and previous is not None and c['x']-previous['right']>.15:
                        nodes.append({'type':'text','value':' '})
                    kind=current
                # Preserve original word spacing via the glyph-gap evidence.
                buffer.append(c);previous=c
            flush()
            nodes.append({'type':'text','value':'\n'})
        return {'type':'rich-text','segments':nodes}, []
    except ValueError as error:
        return {'type':'rich-text','segments':[]}, [str(error)]


def convert(chunks,bars):
    start=len(TRACE)
    node,errors=_convert(chunks,bars)
    CONVERSIONS.append({'glyphs':chunks,'vectorBars':bars,'layoutTree':TRACE[start:],'errors':errors})
    return node,errors


def extract_all():
    # Reuse the exact V6.1 heading/identity/source-hash reader. Its historical
    # code is immutable; override its conversion hook in this process only.
    old=basic.convert
    basic.convert=convert
    try:
        sources=[]
        for filename, identity in basic.SOURCES.items():
            start=len(CONVERSIONS)
            boxes={}
            with pymupdf.open(basic.ROOT/'39 chuyên đề'/filename) as pdf:
                for page in pdf:
                    for block in page.get_text('rawdict')['blocks']:
                        for line in block.get('lines',[]):
                            for span in line['spans']:
                                for c in span['chars']:
                                    key=(page.number+1,round(c['origin'][0],4),round(c['origin'][1],4),c['c'],span['font'])
                                    if key in boxes and boxes[key]!=list(c['bbox']):raise ValueError('Ambiguous original glyph bounding box')
                                    boxes[key]=list(c['bbox'])
            source=basic.extract(filename,identity)
            conversions=iter(CONVERSIONS[start:])
            for fields in [*(r['fields'] for r in source['records']),
                           *({k:g[k] for k in ['knowledge','method']} for g in source['groups'])]:
                for field in fields.values():
                    evidence=[next(conversions) for _ in field['pages']]
                    original=[line for item in evidence for line in item['glyphs']]
                    actual=basic.HASH(json.dumps(original,ensure_ascii=False,separators=(',',':')))
                    if actual!=field['glyphHash']:
                        raise ValueError('Source glyph ownership/provenance mismatch')
                    field['layoutEvidence']={'glyphHash':actual,'pages':field['pages'],
                        'rows':original,'tree':[n for item in evidence for n in item['layoutTree']],
                        'glyphBoundingBoxes':[[boxes[(c['page'],round(c['x'],4),round(c['y'],4),c['c'],c['font'])] for c in line] for line in original],
                        'vectorBars':[{'page':item['glyphs'][0][0]['page'],'bars':item['vectorBars']} for item in evidence],
                        'sourceStructure':'supported' if not field['errors'] else 'unresolved',
                        'editorialReview':False}
            sources.append(source)
        return {'schemaVersion':'bienedu.source-content.v6.2','sources':sources,
                'policy':'Source glyphs and vector bars only; bounded layout reconstruction; no OCR or editorial approval.'}
    finally:
        basic.convert=old


if __name__=='__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    print(json.dumps(extract_all(),ensure_ascii=False))
