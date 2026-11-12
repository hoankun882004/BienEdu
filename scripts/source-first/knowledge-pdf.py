"""Read-only theory import from independent PDFs, using the V6.2 glyph adapter.

This is not an OCR or an editorial correction pass. Unowned mathematical glyphs
fail closed. Theory extraction is independent of example/solution eligibility.
"""
import hashlib
import importlib.util
import json
import re
import sys
from collections import Counter
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('knowledge_layout', Path(__file__).with_name('layout-v62.py'))
layout = importlib.util.module_from_spec(spec)
spec.loader.exec_module(layout)
basic = layout.basic
# These are literal source glyph mappings, not inferred mathematical identities.
basic.SYMBOLS.update({'∓': r'\mp ', 'ε': r'\varepsilon ', 'µ': r'\mu ', 'σ': r'\sigma ',
                      '∂': r'\partial ', '≡': r'\equiv ', '∉': r'\notin ', '∝': r'\propto ',
                      '⊆': r'\subseteq ', '⋅': r'\cdot ', '…': r'\ldots ', 'ℝ': r'\mathbb{R}',
                      '⇐': r'\Leftarrow ', '⌊': r'\lfloor ', '⌋': r'\rfloor ',
                      '⌈': r'\lceil ', '⌉': r'\rceil '})

def owned_row_math(chars, depth=0):
    """Own opposite scripts as groups, not interleaved x-sorted characters.

    Original glyph bounding boxes include italic overhang. Script ownership uses
    the preceding glyph origin and the next full-size origin, not that overhang.
    Lower limits under upright lim are supported only within its original span.
    """
    if depth > 12 or len(chars) > 1800:
        raise ValueError('LAYOUT_COMPLEXITY_LIMIT')
    chars = sorted((c for c in chars if not c['c'].isspace()), key=lambda c: (c['x'], c['y']))
    if not chars:
        raise ValueError('EMPTY_MATH_GROUP')
    size = max(c['size'] for c in chars)
    body = [c for c in chars if c['size'] >= size * .87]
    base = Counter(round(c['y'], 1) for c in body).most_common(1)[0][0]
    if any(abs(c['y'] - base) > .8 for c in body):
        raise ValueError('COMPETING_BASELINES: no unique EquationRow')
    anchors = []
    index = 0
    while index < len(body):
        operator = next((name for name in ['arcsin', 'arccos', 'arctan', 'sin', 'cos', 'tan', 'cot', 'ln', 'log', 'lim', 'exp']
                         if ''.join(c['c'] for c in body[index:index + len(name)]) == name
                         and all(c['font'].startswith('CMR') for c in body[index:index + len(name)])), None)
        count = len(operator) if operator else 1
        run = body[index:index + count]
        anchors.append({'chars': run, 'value': '\\' + operator + ' ' if operator else layout.symbol(run[0]),
                        'lower': [], 'upper': [], 'operator': operator})
        index += count
    for char in [c for c in chars if c not in body]:
        direction = 'upper' if char['y'] < base - .65 else 'lower' if char['y'] > base + .65 else None
        if direction is None or abs(char['y'] - base) > size * 1.5:
            raise ValueError('SCRIPT_BASELINE_UNRESOLVED')
        limit = [a for a in anchors if a['operator'] == 'lim' and direction == 'lower'
                 and a['chars'][0]['x'] - size * .45 <= char['x'] <= a['chars'][-1]['right'] + size * .5]
        owners = [a for a in anchors if a['chars'][0]['x'] <= char['x'] + .35]
        owner = limit[0] if len(limit) == 1 else owners[-1] if owners else None
        if owner is None:
            raise ValueError('SCRIPT_OWNER_UNRESOLVED')
        owner[direction].append(char)
    result = ''
    for anchor in anchors:
        if anchor['value'] in [',', '.', ';', '=', '<', '>', '+', '-'] and (anchor['lower'] or anchor['upper']):
            raise ValueError('SCRIPT_ATTACHED_TO_PUNCTUATION_OR_RELATION')
        result += anchor['value']
        for name, prefix in [('lower', '_'), ('upper', '^')]:
            if anchor[name]:
                result += prefix + '{' + owned_row_math(anchor[name], depth + 1) + '}'
    return result.strip()


layout.row_math = owned_row_math


def conversion(chunks, bars):
    """Keep literal upright math operators attached to their source scripts.

    Some PDFs typeset sin/log in the Vietnamese prose font, while their powers
    and arguments use Computer Modern. Font-only segmentation orphaned scripts.
    Only whole, explicitly present operator words are reclassified here.
    """
    chars = [dict(c) for line in chunks for c in line]
    for i, char in enumerate(chars):
        if basic.MATH.match(char['font']) or not char['c'].isalpha():
            continue
        if i and chars[i - 1]['c'].isalpha() and abs(chars[i - 1]['y'] - char['y']) < .5:
            continue
        end = i
        while end < len(chars) and chars[end]['c'].isascii() and chars[end]['c'].isalpha() and abs(chars[end]['y'] - char['y']) < .5:
            end += 1
        word = ''.join(c['c'] for c in chars[i:end])
        following = next((c for c in chars[end:] if not c['c'].isspace()), None)
        if word not in ['sin', 'cos', 'tan', 'cot', 'ln', 'log', 'lim', 'arcsin', 'arccos', 'arctan', 'exp']:
            # A printed unit with a mathematical power is a genuine script owner.
            if word not in ['m', 'cm', 'dm'] or not following or following['size'] >= char['size'] * .87 or following['y'] >= char['y']:
                continue
        if following and basic.MATH.match(following['font']):
            for token in chars[i:end]:
                token['font'] = 'CMR-SOURCE-UPRIGHT'
    # Textual indices (e.g. q_vào, V_còn lại) retain their vertical attachment.
    # Merely rendering these letters as ordinary prose loses mathematical scope
    # even though the surrounding two fragments both pass KaTeX parsing.
    index = 0
    while index < len(chars):
        char = chars[index]
        if basic.MATH.match(char['font']) or not char['c'].isalpha():
            index += 1
            continue
        end = index + 1
        while end < len(chars) and chars[end]['font'] == char['font'] and abs(chars[end]['size'] - char['size']) < .2 and abs(chars[end]['y'] - char['y']) < .4 and (chars[end]['c'].isalpha() or chars[end]['c'].isspace()):
            end += 1
        run = chars[index:end]
        owners = [c for c in chars if basic.MATH.match(c['font']) and not c['font'].startswith('CMEX')
                  and char['size'] < c['size'] * .87 and -.8 <= char['x'] - c['right'] <= c['size'] * .8
                  and .65 < abs(char['y'] - c['y']) < c['size'] * .9]
        if owners:
            owner = min(owners, key=lambda c: abs(char['x'] - c['right']) + abs(char['y'] - c['y']))
            word = basic.prose(run).strip()
            replacement = layout.atom(run, r'\text{' + word + '}', 'SourceTextScript', char['y'], char['size'])
            chars[index:end] = [replacement]
        index += 1
    # Limits are centered BELOW the whole upright operator, so their leftmost
    # glyph may precede the 'l'. Collapse the original lower-limit baseline as
    # one owned operator before ordinary left-to-right script assignment.
    for _ in range(32):
        changed = False
        for index in range(len(chars) - 2):
            run = chars[index:index + 3]
            if ''.join(c['c'] for c in run) != 'lim' or not all(c['font'].startswith('CMR') for c in run):
                continue
            size, baseline = run[0]['size'], run[0]['y']
            candidates = [c for c in chars if c not in run and basic.MATH.match(c['font']) and c['size'] < size * .87
                          and size * .45 < c['y'] - baseline < size * 1.6
                          and run[0]['x'] - size * 1.5 < c['x'] < run[-1]['right'] + size * 1.5]
            if candidates and len({round(c['y'], 1) for c in candidates}) == 1:
                try:
                    value = r'\lim_{' + owned_row_math(candidates) + '}'
                except ValueError:
                    continue
                owned = [*run, *candidates]
                chars = [c for c in chars if c not in owned] + [layout.atom(owned, value, 'LimitWithOwnedScope', baseline, size)]
                changed = True
                break
        if not changed:
            break
    # CMEX font encoding in the older calculus PDF uses the original TeX slots
    # Z/R for display/inline integral and X for sum. No letter in a prose font
    # is ever rewritten by this font-specific mapping.
    for char in chars:
        if char['font'].startswith('CMEX'):
            original = char['c']
            char['c'] = {'Z': '∫', 'R': '∫', 'X': '∑', '\x14': '[', '\x15': ']', '\x00': '(', '\x01': ')'}.get(original, original)
            if original in ['Z', 'R', 'X']:
                char['texSlot'] = original
    for operator in [c for c in chars if c.get('texSlot') in ['Z', 'R', 'X']]:
        candidates = [c for c in chars if c is not operator and basic.MATH.match(c['font'])
                      and not c['font'].startswith('CMEX') and c['size'] >= operator['size'] * .95
                      and c['x'] >= operator['right'] and 3 < c['y'] - operator['y'] < operator['size'] * 2]
        if not candidates:
            continue
        anchor = min(candidates, key=lambda c: (c['x'] - operator['right']) + abs(c['y'] - operator['y'] - operator['size']) * .5)
        baseline = anchor['y']
        limits = [c for c in chars if c is not operator and c['size'] < anchor['size'] * .87
                  and operator['x'] - 1 <= c['x'] < anchor['x'] and abs(c['y'] - baseline) < anchor['size'] * 1.5]
        upper = [c for c in limits if c['y'] < baseline - .65]
        lower = [c for c in limits if c['y'] > baseline + .65]
        if len(upper) + len(lower) != len(limits):
            continue
        try:
            value = {'∫': r'\int ', '∑': r'\sum '}[operator['c']]
            if lower:
                value += '_{' + owned_row_math(lower) + '}'
            if upper:
                value += '^{' + owned_row_math(upper) + '}'
        except ValueError:
            continue
        owned = [operator, *limits]
        chars = [c for c in chars if c not in owned] + [layout.atom(owned, value, 'MathOperatorWithLimits', baseline, anchor['size'])]
    for slash in [c for c in chars if c['c'] == '̸']:
        owners = [c for c in chars if c['c'] == '=' and abs(c['y'] - slash['y']) < slash['size'] * .3
                  and -.5 < c['x'] - slash['x'] < slash['size'] * .55]
        if len(owners) == 1:
            owner = owners[0]
            chars = [c for c in chars if c is not slash and c is not owner] + [
                layout.atom([slash, owner], r'\ne ', 'MathOperator', owner['y'], owner['size'])]
    relevant = []
    for x0, x1, y in bars:
        inside = [c for c in chars if basic.MATH.match(c['font']) and c['x'] >= x0 - .35 and c['right'] <= x1 + .35]
        root = any(c['c'] == '√' and abs(c['right'] - x0) < .8 and abs(c['y'] - y) < .8 for c in chars)
        above = any(not c['font'].startswith('CMEX') and .35 < y - c['y'] < c['size'] * 1.1 for c in inside)
        below = any(not c['font'].startswith('CMEX') and .65 < c['y'] - y < c['size'] * 1.2 for c in inside)
        if root or (above and below):
            relevant.append((x0, x1, y))
    return layout._convert([chars], relevant)


def digest(value):
    return hashlib.sha256(value if isinstance(value, bytes) else json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest().upper()


def page_items(page):
    items = []
    for index, block in enumerate(page.get_text('rawdict')['blocks']):
        lines = [[{'c': c['c'], 'x': c['origin'][0], 'y': c['origin'][1], 'right': c['bbox'][2],
                   'size': span['size'], 'font': span['font'], 'page': page.number + 1}
                  for span in line['spans'] for c in span['chars']] for line in block.get('lines', [])]
        lines = [line for line in lines if line and 44 < line[0]['y'] < page.rect.height - 42]
        if lines:
            items.append({'index': index, 'lines': lines, 'bbox': layout.bounds([c for line in lines for c in line]),
                          'text': ' '.join(basic.prose(line) for line in lines).strip()})
    return items


def page_bars(page):
    bars = set()
    for drawing in page.get_drawings():
        rect = drawing['rect']
        if rect.height < .8 and 1 < rect.width < 200:
            bars.add((rect.x0, rect.x1, (rect.y0 + rect.y1) / 2))
        for item in drawing['items']:
            if item[0] == 'l' and abs(item[1].y - item[2].y) < .25:
                x0, x1 = sorted([item[1].x, item[2].x])
                if 1 < x1 - x0 < 200:
                    bars.add((x0, x1, item[1].y))
    return sorted(bars)


def trim_label(item, label):
    """Remove a literal prose heading without slicing mathematical glyphs."""
    lines = [list(line) for line in item['lines']]
    if lines and ''.join(c['c'] for c in lines[0]).startswith(label):
        lines[0] = lines[0][len(label):]
        lines = [line for line in lines if any(not c['c'].isspace() for c in line)]
    return {**item, 'lines': lines, 'text': ' '.join(basic.prose(line) for line in lines).strip()}


def extract_source(request):
    path = (ROOT / request['file']).resolve()
    if not path.is_relative_to(ROOT / '39 chuyên đề') or digest(path.read_bytes()) != request['sha256']:
        raise ValueError('Source identity mismatch: ' + request['file'])
    pdf = pymupdf.open(path)
    source = {**request, 'pageCount': len(pdf), 'sourceKind': 'pdf'}
    records, current, topic, code, active = {}, None, None, None, None
    solution_phase = False
    old_calculus = path.name == 'C12-CD13-CD14.pdf'
    probability = 'cd20-cd21' in request['sourceId'] or 'Lý_thuyết' in path.name

    def record(key, title, scope, kind='knowledge'):
        nonlocal current, active
        identity = f"{source['sourceId']}:{key}:{kind}"
        current = records.setdefault(identity, {'id': identity, 'key': key, 'topicId': topic, 'code': code,
                                                'title': title, 'scope': scope, 'kind': kind, 'source': source, 'items': []})
        active = kind

    for page in pdf:
        text = page.get_text()
        if 'Mục lục' in text or 'MỤC LỤC' in text:
            continue
        items = page_items(page)
        for item in items:
            raw = item['text']
            if re.match(r'^(?:LỜI GIẢI|HƯỚNG DẪN GIẢI|PHẦN LỜI GIẢI)', raw):
                solution_phase, current, active = True, None, None
                continue
            if solution_phase:
                continue
            heading = re.match(r'^(?:\d+\s+)?CD(\d{1,2})\s*[.·–-]?\s+(.+)', raw)
            if heading:
                topic, code, active, current = 'CD' + heading[1].zfill(2), None, None, None
                if probability:
                    record(topic, heading[2], 'topic')
                continue
            section = re.match(r'^(?:Dạng\s*)?(\d+\.\d+)\s*[.·–-]\s*(.+)', raw)
            old_section = re.match(r'^CD(1[234])-(\d+)\s+(.+)', raw) if old_calculus else None
            if old_section:
                code, title = f'{int(old_section[1])}.{int(old_section[2])}', old_section[3]
                topic, current, active = 'CD' + old_section[1], None, None
                record(code, title, 'type')
                active = None
                continue
            if section:
                code, title = section[1], section[2]
                topic, current, active = 'CD' + code.split('.')[0].zfill(2), None, None
                continue
            if probability:
                section = re.match(r'^((?:20|21)\.\d+)\s+(.+)', raw)
                if section:
                    code, title = section[1], section[2]
                    topic = 'CD' + code.split('.')[0]
                    record(code, title, 'type')
                    continue
                if raw.startswith('VÍ DỤ'):
                    active = None
                    continue
                if raw.startswith(('SAI LẦM HAY GẶP', 'MẸO NHẬN DẠNG', 'LƯU Ý', 'GHI NHỚ')) and current:
                    active = 'knowledge'
            if re.match(r'^Ví dụ\s*\d|^\d+\.\s*(?:Ví dụ|Bài tập|Luyện tập)|^BÀI TẬP', raw):
                active = None
                continue
            if code and raw.startswith(('Chú ý.', 'Lưu ý.', 'Nhận xét.', 'Ghi nhớ.')):
                record(code, title, 'type', 'notes')
                current['items'].append({**item, 'page':page.number + 1})
                continue
            if raw == 'Kiến thức cần nhớ':
                if not topic:
                    raise ValueError('Topic knowledge without a topic')
                record(topic, raw, 'topic')
                continue
            if raw == 'Công thức cần nhớ':
                record('CD08-CD11', raw, 'shared')
                continue
            label = re.match(r'^(Kiến thức và cách làm|Kiến thức|Cách làm)\.', raw)
            if label and code:
                kind = 'method' if label[1] == 'Cách làm' else 'knowledge'
                record(code, title, 'type', kind)
                item = trim_label(item, label[0])
                if item['lines']:
                    current['items'].append({**item, 'page': page.number + 1})
                continue
            if old_calculus and re.match(r'^\d+\.\s*(?:Kiến thức trọng tâm|Phương pháp giải)', raw) and code:
                kind = 'method' if 'Phương pháp' in raw else 'knowledge'
                record(code, title, 'type', kind)
                # PyMuPDF may put the following tall integral in the heading
                # block. Discard the heading LINE, never its mathematical tail.
                tail = item['lines'][1:]
                if tail:
                    current['items'].append({**item, 'lines':tail, 'text':' '.join(basic.prose(line) for line in tail),
                                             'bbox':layout.bounds([c for line in tail for c in line]), 'page':page.number + 1})
                continue
            if old_calculus and re.match(r'^\d+\.\s*(?:Sai lầm|Lưu ý)', raw) and code:
                record(code, title, 'type')
            if old_calculus and re.match(r'^Bảng công thức|^BẢNG CÔNG THỨC|^TỔNG HỢP', raw) and page.number > len(pdf) - 4:
                record('CD12-CD14', 'Bảng công thức', 'shared')
                continue
            if active and current and item['lines']:
                current['items'].append({**item, 'page': page.number + 1})

    table_cache, bar_cache = {}, {}
    for record in records.values():
        record['blocks'] = []
        for number in sorted({i['page'] for i in record['items']}):
            local = [i for i in record['items'] if i['page'] == number]
            page = pdf[number - 1]
            if number not in bar_cache:
                bar_cache[number] = page_bars(page)
            bars = bar_cache[number]
            # Schematic diagrams are NOT prose/math and cannot contaminate the
            # theory around them. Their exact source bounds remain in the audit.
            diagrams = []
            for index, item in enumerate(local):
                if item['text'].startswith('Sơ đồ'):
                    prior = index
                    while prior > 0 and local[prior - 1]['bbox'][0] > 130:
                        prior -= 1
                    # A detached radical belongs to the prose above it, not to
                    # the subsequent schematic. Never swallow it as a figure.
                    if prior < index and any(c['c'] == '√' for l in local[prior]['lines'] for c in l):
                        bottom = local[prior]['bbox'][3] + 12
                        while prior < index and local[prior]['bbox'][1] < bottom:
                            prior += 1
                    diagrams.append((prior, index))
            skipped = set()
            for start, end in diagrams:
                skipped.update(range(start, end + 1))
            # Keep native table cells separate from unrelated equation rows.
            if number not in table_cache:
                # Only knowledge pages with genuine tabular prose are searched;
                # drawings in exercises must not be mistaken for a theory table.
                table_cache[number] = list(page.find_tables().tables) if (
                    ('Bảng' in page.get_text() or 'bảng' in page.get_text()) and
                    (old_calculus or path.name.startswith('Mũ'))
                ) else []
            tables = [t for t in table_cache[number] if t.col_count > 1 and t.row_count > 1
                      and any(t.bbox[1] <= i['bbox'][1] <= t.bbox[3] for i in local)]
            table_items, replacements = set(), {}
            for table in tables:
                selected = [idx for idx, i in enumerate(local) if
                            i['bbox'][1] >= table.bbox[1] - 20 and i['bbox'][3] <= table.bbox[3] + 4
                            and i['bbox'][0] >= table.bbox[0] - 1 and i['bbox'][2] <= table.bbox[2] + 1]
                if not selected:
                    continue
                # Tables with artificial empty separator columns are not safe
                # to flatten. Keep the evidence unresolved until cells are owned.
                all_chars = [c for idx in selected for line in local[idx]['lines'] for c in line]
                owned, rows, issues = [], [], []
                for row in table.rows:
                    cells = []
                    for cell in row.cells:
                        if cell is None:
                            issues.append('MERGED_TABLE_CELL_UNRESOLVED')
                            cells.append(None)
                            continue
                        chars = [c for c in all_chars if not c['c'].isspace() and cell[0] - .3 <= (c['x'] + c['right']) / 2 <= cell[2] + .3
                                 and cell[1] - 20 <= c['y'] <= cell[3] + 2]
                        # A cell boundary must not consume another row's glyph.
                        chars = [c for c in chars if cell[1] - 1 <= c['y'] - c['size'] * .7 <= cell[3] + 1]
                        owned.extend(id(c) for c in chars)
                        node, errors = conversion([chars], bars)
                        cells.append(node)
                        issues.extend(errors)
                    rows.append(cells)
                if Counter(owned) != Counter(id(c) for c in all_chars if not c['c'].isspace()):
                    issues.append('TABLE_GLYPH_OWNERSHIP_UNRESOLVED')
                evidence = [local[i] for i in selected]
                replacements[min(selected)] = {'kind': 'table', 'rows': rows, 'errors': sorted(set(issues)),
                                                'page': number, 'bbox': list(table.bbox), 'evidence': evidence}
                table_items.update(selected)
            pending = []

            def flush():
                if not pending:
                    return
                chunks = [line for i in pending for line in i['lines']]
                content, errors = conversion(chunks, bars)
                record['blocks'].append({'kind': 'paragraph', 'content': content, 'errors': errors,
                                         'page': number, 'bbox': layout.bounds([c for l in chunks for c in l]),
                                         'evidence': list(pending)})
                pending.clear()

            for index, item in enumerate(local):
                if index in skipped:
                    flush()
                    if any(index == start for start, end in diagrams):
                        start, end = next((a, b) for a, b in diagrams if a == index)
                        record['blocks'].append({'kind': 'figure', 'page': number, 'errors': ['NATIVE_DIAGRAM_SPEC_REQUIRED'],
                                                 'evidence': local[start:end + 1]})
                    continue
                if index in table_items:
                    flush()
                    if index in replacements:
                        record['blocks'].append(replacements[index])
                    continue
                pending_chars = [c for i in pending for line in i['lines'] for c in line if not c['c'].isspace()]
                detached_operator = len(pending_chars) < 12 and any(c['font'].startswith('CMEX') for c in pending_chars)
                # A tall operator may be emitted at the end of the previous
                # PDF block while its limits/integrand start the next block.
                if pending_chars and item['lines']:
                    next_y = min(c['y'] for line in item['lines'] for c in line)
                    detached_operator = detached_operator or any(c['font'].startswith('CMEX') and
                        0 < next_y - c['y'] < c['size'] * 2.5 for c in pending_chars[-6:])
                if pending and item['bbox'][1] > max(i['bbox'][3] for i in pending) + (25 if detached_operator else 3):
                    flush()
                pending.append(item)
            flush()
        record['sourcePages'] = sorted({i['page'] for i in record['items']})
        record['glyphHash'] = digest(record['items'])
        del record['items']
        for index, block in enumerate(record['blocks']):
            block['id'] = record['id'] + ':block:' + str(index + 1)
            block['glyphHash'] = digest(block['evidence'])
            block['original'] = '\n'.join(i['text'] for i in block['evidence'])
        record['complete'] = bool(record['blocks']) and all(not b['errors'] for b in record['blocks'])
    return {'source': source, 'records': list(records.values())}


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    requests = json.load(sys.stdin)
    print(json.dumps({'schemaVersion': 'bienedu.pdf-knowledge.evidence.v1',
                      'sources': [extract_source(request) for request in requests]}, ensure_ascii=False))
