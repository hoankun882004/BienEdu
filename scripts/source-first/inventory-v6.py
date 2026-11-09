"""Read-only semantic heading inventory, not a count of raw PDF blocks."""
import hashlib,json,re,sys
from pathlib import Path
import pymupdf
ROOT=Path(__file__).resolve().parents[2]
sys.stdout.reconfigure(encoding='utf-8')
result=[]
for file in sorted((ROOT/'39 chuyên đề').glob('*.pdf')):
    doc=pymupdf.open(file); sections={}; phase='statement'; code=None; texts=[]; started=False
    for page in doc:
        text=page.get_text();texts.append(text)
        if not started:
            if re.search(r'Kiến thức|Cách làm',text,re.I) and 'Mục lục' not in text: started=True
            else: continue
        for line in text.splitlines():
            if re.match(r'^(?:LỜI GIẢI|HƯỚNG DẪN GIẢI)',line.strip()):phase='solution'
            heading=re.match(r'^Dạng\s*(\d+\.\d+)\s*[·–-]\s*(.+)',line)
            old=re.match(r'^CD(1[234])-(\d+)\s*$',line)
            title=None
            if heading and not re.search(r'(?:\.\s*){3,}',line):
                code=heading[1]
                title=heading[2]
            elif old:
                code=f'{old[1]}.{int(old[2])}'
                title=code
            if title:
                sections.setdefault(code,{'code':code,'title':title,'knowledgePages':[],'statementIds':{},'solutionIds':{},'pages':[]})
                if page.number+1 not in sections[code]['pages']:sections[code]['pages'].append(page.number+1)
            if code not in sections:continue
            row=sections[code]
            if re.search(r'Kiến thức',line,re.I) and phase=='statement':row['knowledgePages'].append(page.number+1)
            example=re.match(r'^Ví dụ\s*(?:(\d+\.\d+)\.)?(\d+)(?:\.|\s|$)',line)
            if example:
                section=example[1] or code
                if section not in sections:continue
                key=f'{section}-source-example-{int(example[2])}'
                sections[section]['solutionIds' if phase=='solution' else 'statementIds'].setdefault(key,[]).append(page.number+1)
    rows=[]
    for row in sections.values():
        a,b=set(row['statementIds']),set(row['solutionIds'])
        rows.append({**row,'knowledgePages':sorted(set(row['knowledgePages'])),'uniqueStatements':len(a),'uniqueSolutions':len(b),'paired':len(a&b),'ambiguousIds':[k for k in a|b if len(row['statementIds'].get(k,[]))>1 or len(row['solutionIds'].get(k,[]))>1]})
    result.append({'file':file.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(file.read_bytes()).hexdigest().upper(),'pages':len(doc),'sections':rows,'topics':sorted(set('CD'+r['code'].split('.')[0].zfill(2) for r in rows)),
                   'limitation':'Heading-based candidate pairing; not mathematical approval. Split or nonstandard headings remain unresolved.'})
print(json.dumps(result,ensure_ascii=False))
