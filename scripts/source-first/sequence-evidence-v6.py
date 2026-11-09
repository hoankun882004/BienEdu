import json,hashlib,re,sys
from pathlib import Path
import pymupdf
ROOT=Path(__file__).resolve().parents[2]
file=ROOT/'39 chuyên đề/Day-so-Cap-so-CD17-CD19.pdf'
sha=hashlib.sha256(file.read_bytes()).hexdigest().upper()
if sha!='46ECFCD53189EAD5F9964FB4F8943E09EAC7FF667322221698F2CC47E5546E5E':raise ValueError('New sequence source changed')
doc=pymupdf.open(file);result=[]
for number,kind in [(2,'statement'),(13,'solution')]:
    page=doc[number-1];text=page.get_text()
    for i in range(1,11):
        marker=rf'Ví dụ\s*17\.1\.{i}\b'
        found=list(re.finditer(marker,text))
        if len(found)!=1:raise ValueError('Ambiguous sequence example identity')
        start=found[0].end();end=re.search(r'Ví dụ\s*17\.|Dạng\s*17\.2',text[start:])
        excerpt=text[start:start+end.start()] if end else text[start:]
        result.append({'recordId':f'17.1-source-example-{i}','kind':kind,'page':number,'sourceHash':sha,'excerpt':excerpt.strip(),'excerptHash':hashlib.sha256(excerpt.encode()).hexdigest().upper()})
sys.stdout.reconfigure(encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
