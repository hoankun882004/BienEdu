"""Read-only, conservative conversion of all four new independent PDF sources.

This is an adapter to Canonical Math Format, not OCR and not symbolic proof.
Only linear Computer Modern math with unambiguous positioned scripts is accepted.
Bars, radicals, extensible operators, accents and unknown glyphs fail closed.
Every candidate retains exact source glyph evidence, including rejected records.
"""
import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[2]
SOURCES = {
    'Day-so-Cap-so-CD17-CD19.pdf': ('cd17-cd19-sequences-2026', '46ECFCD53189EAD5F9964FB4F8943E09EAC7FF667322221698F2CC47E5546E5E'),
    'Luong-giac-CD15-CD16.pdf': ('cd15-cd16-trigonometry-2026', 'AF0BE0528550ECC43B2000809F8F50C2A0E2C41326D71F57A9FBBCBB02C7A154'),
    'Nguyen-ham-Tich-phan-CD12-CD14.pdf': ('cd12-cd14-calculus-2026', 'AF0D521E8C595C7879E1D272784BAD6F2907198126B0D9A1E37D892238669C22'),
    'Vecto-Oxyz-CD28-CD33 (1).pdf': ('cd28-cd33-vector-2026', '98C0C21CC5D42D246938AADB4A0AE48C7DF488B113BF6B2551414C965CBA2114'),
}
SYMBOLS = {'−': '-', '·': r'\cdot ', '×': r'\times ', '÷': r'\div ', '≥': r'\ge ', '≤': r'\le ',
           '∈': r'\in ', '∞': r'\infty ', 'π': r'\pi ', 'α': r'\alpha ', 'β': r'\beta ',
           'γ': r'\gamma ', 'θ': r'\theta ', '∆': r'\Delta ', 'δ': r'\delta ', 'ℓ': r'\ell ',
           '∗': '*', '′': "'", '→': r'\to ', '⇒': r'\Rightarrow ', '⇔': r'\Leftrightarrow ',
           '∅': r'\varnothing ', '∪': r'\cup ', '∩': r'\cap ', '±': r'\pm ', '≠': r'\ne ',
           '≈': r'\approx ', '⊂': r'\subset ', '∥': r'\parallel ', '⊥': r'\perp ', '∣': '|',
           '{': r'\{', '}': r'\}', '◦': r'\circ ', 'ω': r'\omega ', 'φ': r'\varphi ', 'τ': r'\tau ', 'λ': r'\lambda '}
MATH = re.compile(r'^(?:CM|MSBM)')
HASH = lambda value: hashlib.sha256(value.encode('utf-8') if isinstance(value, str) else value).hexdigest().upper()


def prose(chars):
    """Recover explicit PDF word gaps, not a Vietnamese dictionary/rewriter."""
    text = ''
    previous = None
    for char in chars:
        if previous and not previous['c'].isspace() and not char['c'].isspace():
            gap = char['x'] - previous['right']
            if abs(char['y'] - previous['y']) < 0.5 and gap > char['size'] * 0.19:
                text += ' '
        text += char['c']
        previous = char
    return text


def math(chars, bars):
    chars = [c for c in chars if not c['c'].isspace()]
    if not chars:
        return ''
    if any(c['font'].startswith('CMEX') or c['c'] in '√∫∑̸⃗̂' for c in chars):
        raise ValueError('NONLINEAR_OR_ACCENTED_MATH: source scope needs explicit structural verification')
    left, right = min(c['x'] for c in chars), max(c['right'] for c in chars)
    top, bottom = min(c['y'] - c['size'] for c in chars), max(c['y'] + 2 for c in chars)
    if any(x1 > left and x0 < right and top < y < bottom for x0, x1, y in bars):
        raise ValueError('FRACTION_OR_OVERBAR: do not infer numerator/denominator or vector scope')
    # Body 10.9091 pt; superscripts/subscripts are 7.9701 / 5.9776 pt.
    full = [c for c in chars if c['size'] > 9]
    if not full:
        raise ValueError('NO_BASELINE: isolated script or fraction component')
    base = Counter(round(c['y'], 1) for c in full).most_common(1)[0][0]
    if any(abs(c['y'] - base) > 0.65 for c in full):
        raise ValueError('MULTIPLE_MATH_BASELINES: multiline math needs structural verification')
    output = ''
    i = 0
    last_base_right = None
    while i < len(chars):
        char = chars[i]
        script = char['size'] < 9
        if script:
            if last_base_right is None or char['x'] < last_base_right - 1.0:
                raise ValueError('AMBIGUOUS_SCRIPT_ATTACHMENT')
            kind = '^' if char['y'] < base - 0.7 else '_' if char['y'] > base + 0.7 else None
            if not kind:
                raise ValueError('AMBIGUOUS_SCRIPT_BASELINE')
            group = []
            y = char['y']
            while i < len(chars) and chars[i]['size'] < 9 and abs(chars[i]['y'] - y) < 0.5:
                group.append(chars[i]); i += 1
            # Nested script levels and spatially overlapping independent glyphs fail closed.
            if any(abs(c['size'] - group[0]['size']) > 0.4 for c in group):
                raise ValueError('NESTED_SCRIPT_UNSUPPORTED')
            output += kind + '{' + ''.join(glyph(c) for c in group) + '}'
        else:
            operator = next((name for name in ['arcsin', 'arccos', 'arctan', 'sin', 'cos', 'tan', 'cot', 'ln', 'log', 'lim', 'exp']
                             if ''.join(c['c'] for c in chars[i:i + len(name)]) == name
                             and all(c['font'].startswith('CMR') and c['size'] > 9 for c in chars[i:i + len(name)])), None)
            if operator:
                output += '\\' + operator + ' '
                last_base_right = chars[i + len(operator) - 1]['right']
                i += len(operator)
                continue
            output += glyph(char)
            last_base_right = char['right']
            i += 1
    return output.strip()


def glyph(char):
    value = char['c']
    if char['font'].startswith('MSBM') and value in 'RNZQC':
        return r'\mathbb{' + value + '}'
    if value in SYMBOLS:
        return SYMBOLS[value]
    if re.fullmatch(r'[A-Za-z0-9+\-=(),.;:!|/<>\[\]*]', value):
        return value
    raise ValueError('UNSUPPORTED_GLYPH:' + value + ':' + char['font'])


def convert(chunks, bars):
    segments, errors, buffer, kind = [], [], [], None

    def flush():
        nonlocal buffer
        if not buffer:
            return
        if kind == 'math':
            try:
                value = math(buffer, bars)
                if value:
                    if buffer[0]['c'].isspace():
                        segments.append({'type': 'text', 'value': ' '})
                    segments.append({'type': 'math', 'latex': value, 'display': False})
                    if buffer[-1]['c'].isspace():
                        segments.append({'type': 'text', 'value': ' '})
            except ValueError as error:
                errors.append(str(error))
        else:
            value = prose(buffer)
            if value:
                segments.append({'type': 'text', 'value': value})
        buffer = []

    for line in chunks:
        for char in line:
            next_kind = 'math' if MATH.match(char['font']) else 'text'
            if char['c'].isspace():
                # A PDF-inferred space has no reliable font identity. It must
                # not split 12=8+8 cos(theta) into a false 12=8+8 assertion.
                if kind is not None:
                    buffer.append(char)
                continue
            if kind != next_kind:
                flush(); kind = next_kind
            buffer.append(char)
        if line and kind is not None:
            buffer.append({**line[-1], 'c': ' ', 'x': line[-1]['right']})
    flush()
    compact = []
    for node in segments:
        if compact and node['type'] == compact[-1]['type'] == 'text':
            compact[-1]['value'] += node['value']
        else:
            compact.append(node)
    # Never return a partly converted formula as publishable content.
    return {'type': 'rich-text', 'segments': compact}, sorted(set(errors))


def extract(filename, identity):
    source_id, expected = identity
    path = ROOT / '39 chuyên đề' / filename
    if HASH(path.read_bytes()) != expected:
        raise ValueError('Original source changed: ' + filename)
    source = {'sourceId': source_id, 'file': path.relative_to(ROOT).as_posix(), 'sha256': expected}
    doc = pymupdf.open(path)
    source['pageCount'] = len(doc)
    sections, records, current, phase, section = {}, {}, None, 'statement', None
    started = False
    page_bars, page_figures = {}, {}
    for page in doc:
        number = page.number + 1
        bars, figures = [], []
        for drawing in page.get_drawings():
            rect = drawing['rect']
            if drawing.get('color') is not None and rect.height > 20 and rect.width > 20 and not (rect.x0 < 60 and rect.x1 > 530) and any(item[0] == 'c' or (item[0] == 'l' and abs(item[1].y - item[2].y) > 5) for item in drawing['items']):
                figures.append(list(rect))
            if rect.height < 0.8 and 1 < rect.width < 200:
                bars.append([rect.x0, rect.x1, (rect.y0 + rect.y1) / 2])
            for item in drawing['items']:
                if item[0] == 'l' and abs(item[1].y - item[2].y) < 0.25:
                    x0, x1 = sorted([item[1].x, item[2].x])
                    if 1 < x1 - x0 < 200:
                        bars.append([x0, x1, item[1].y])
        page_bars[number] = bars
        page_figures[number] = figures
        text = page.get_text()
        if 'Mục lục' in text:
            continue
        if not started:
            if 'Kiến thức' not in text:
                continue
            started = True
        for block in page.get_text('rawdict')['blocks']:
            for line in block.get('lines', []):
                chars = [{'c': c['c'], 'x': c['origin'][0], 'y': c['origin'][1], 'right': c['bbox'][2],
                          'size': span['size'], 'font': span['font'], 'page': number}
                         for span in line['spans'] for c in span['chars']]
                if not chars or chars[0]['y'] < 44 or chars[0]['y'] > page.rect.height - 42:
                    continue
                raw = ''.join(c['c'] for c in chars)
                if re.match(r'^(?:LỜI GIẢI|HƯỚNG DẪN GIẢI)', raw):
                    phase, current = 'solution', None
                    continue
                heading = re.match(r'^Dạng\s*(\d+\.\d+)\s*[·–-]\s*(.+)', raw)
                if heading:
                    section = heading[1]
                    sections.setdefault(section, {'code': section, 'title': prose(chars).split('·', 1)[-1].strip(), 'knowledge': [], 'method': []})
                    current = None
                    continue
                if section is None or re.match(r'^CD\d+\s*[·–-]', raw):
                    current = None
                    continue
                marker = re.match(r'^Ví dụ\s*(\d+\.\d+)\.(\d+)\b\s*', raw)
                label = re.match(r'^(Kiến thức và cách làm|Kiến thức|Cách làm)\.', raw)
                if marker:
                    code, index = marker[1], int(marker[2])
                    if code != section:
                        raise ValueError('Explicit example/section mismatch')
                    key = f'{source_id}:{code}:example:{index}'
                    entry = records.setdefault(key, {'id': key, 'code': code, 'number': index, 'statement': [], 'solution': []})
                    current = entry[phase]
                    chars = chars[marker.end():]
                elif label and phase == 'statement':
                    current = sections[section]['method' if label[1] == 'Cách làm' else 'knowledge']
                    if label[1] == 'Kiến thức và cách làm':
                        sections[section]['method'] = current
                    chars = chars[label.end():]
                if current is not None and chars:
                    current.append(chars)
    result = []
    for record in records.values():
        row = {k: v for k, v in record.items() if k not in ['statement', 'solution']}
        row['source'] = source
        row['fields'] = {}
        for kind in ['statement', 'solution']:
            chunks = record[kind]
            pages = sorted(set(c['page'] for line in chunks for c in line))
            # Per-page evaluation prevents coincident coordinates from different pages.
            nodes, issues = [], []
            for number in pages:
                local = [line for line in chunks if line[0]['page'] == number]
                node, errors = convert(local, page_bars[number])
                nodes.extend(node['segments']); issues.extend(errors)
                lower, upper = min(c['y'] - c['size'] for line in local for c in line), max(c['y'] + 3 for line in local for c in line)
                if any(rect[3] > lower and rect[1] < upper for rect in page_figures[number]):
                    issues.append('NON_TEXT_SOURCE_FIGURE: native specification required separately')
            if not chunks:
                issues.append('MISSING_' + kind.upper())
            evidence = json.dumps(chunks, ensure_ascii=False, separators=(',', ':'))
            row['fields'][kind] = {'content': {'type': 'rich-text', 'segments': nodes}, 'errors': sorted(set(issues)),
                                   'pages': pages, 'glyphHash': HASH(evidence), 'original': '\n'.join(prose(line) for line in chunks), 'glyphCount': sum(len(line) for line in chunks)}
        row['errors'] = sorted(set(e for f in row['fields'].values() for e in f['errors']))
        row['status'] = 'SOURCE_STRUCTURE_SUPPORTED' if not row['errors'] else 'SOURCE_AMBIGUOUS'
        result.append(row)
    groups = []
    for entry in sections.values():
        group = {k: entry[k] for k in ['code', 'title']}
        group['source'] = source
        for kind in ['knowledge', 'method']:
            chunks = entry[kind]
            pages = sorted(set(c['page'] for line in chunks for c in line))
            nodes, issues = [], []
            for number in pages:
                node, errors = convert([line for line in chunks if line[0]['page'] == number], page_bars[number])
                nodes.extend(node['segments']); issues.extend(errors)
            if not chunks:
                issues.append('MISSING_' + kind.upper())
            if 'Sơ đồ' in '\n'.join(prose(line) for line in chunks):
                issues.append('SOURCE_DIAGRAM_REQUIRES_INDEPENDENT_VERIFICATION')
            group[kind] = {'content': {'type': 'rich-text', 'segments': nodes}, 'errors': sorted(set(issues)), 'pages': pages,
                           'glyphHash': HASH(json.dumps(chunks, ensure_ascii=False, separators=(',', ':'))), 'original': '\n'.join(prose(line) for line in chunks)}
        groups.append(group)
    return {'source': source, 'groups': groups, 'records': result}


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    print(json.dumps({'schemaVersion': 'bienedu.source-content.v6.1', 'sources': [extract(f, identity) for f, identity in SOURCES.items()],
                      'policy': 'Conservative positioned-glyph structure; not independent symbolic proof or human editorial approval.'}, ensure_ascii=False))
