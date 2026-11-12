// Literal transcriptions of difficult source layouts, NOT mathematical edits.
// Each entry is bound to original positioned glyph evidence AND the PDF hash
// checked by the importer. Source pages were inspected at original-page scale.
import {parseRichText} from '../../assets/js/components/canonical-math.js';

const entries = new Map();
const paragraph = (id,glyphHash,value)=>entries.set(id,{glyphHash,kind:'paragraph',content:parseRichText(value)});
const table = (id,glyphHash,rows)=>entries.set(id,{glyphHash,kind:'table',rows:rows.map(row=>row.map(value=>parseRichText(value)))});
const old = 'cd12-cd14-calculus:';
paragraph(old+'12.1:knowledge:block:5','CD1335940E8951A9A5BE5D94BFF00C2761F545FBE62818AD15FA4D9D8DF42A6B',String.raw`Các công thức mở rộng rất hay dùng
\[\int f'(x)[f(x)]^n\,dx=\frac{[f(x)]^{n+1}}{n+1}+C\quad(n\ne-1)\]
\[\int\frac{f'(x)}{f(x)}\,dx=\ln|f(x)|+C\]
\[\int f'(x)e^{f(x)}\,dx=e^{f(x)}+C\]
\[\int f'(x)\cos(f(x))\,dx=\sin(f(x))+C,\]
\[\int f'(x)\sin(f(x))\,dx=-\cos(f(x))+C.\]`);
table(old+'12.1:knowledge:block:4','0EB3EBF88DB2CDDBE19C0E533CE75A95D5BB03FCA17B2A039C7BA3EA95C369D6',[
  [String.raw`\(f(x)\)`,String.raw`\(\int f(x)\,dx\)`,String.raw`\(f(x)\)`,String.raw`\(\int f(x)\,dx\)`],
  [String.raw`\(0\)`,String.raw`\(C\)`,String.raw`\(1\)`,String.raw`\(x+C\)`],
  [String.raw`\(k\)`,String.raw`\(kx+C\)`,String.raw`\(x^n\ (n\ne-1)\)`,String.raw`\(\frac{x^{n+1}}{n+1}+C\)`],
  [String.raw`\(\frac{1}{x}\)`,String.raw`\(\ln|x|+C\)`,String.raw`\(e^x\)`,String.raw`\(e^x+C\)`],
  [String.raw`\(a^x\ (a>0,a\ne1)\)`,String.raw`\(\frac{a^x}{\ln a}+C\)`,String.raw`\(\sin x\)`,String.raw`\(-\cos x+C\)`],
  [String.raw`\(\cos x\)`,String.raw`\(\sin x+C\)`,String.raw`\(\frac{1}{\cos^2x}\)`,String.raw`\(\tan x+C\)`],
  [String.raw`\(\frac{1}{\sin^2x}\)`,String.raw`\(-\cot x+C\)`,String.raw`\(\tan x\)`,String.raw`\(-\ln|\cos x|+C\)`],
  [String.raw`\(\cot x\)`,String.raw`\(\ln|\sin x|+C\)`,String.raw`\(\frac{1}{1+x^2}\)`,String.raw`\(\arctan x+C\)`],
  [String.raw`\(\frac{1}{\sqrt{1-x^2}}\)`,String.raw`\(\arcsin x+C\)`,String.raw`\(\frac{1}{a^2+x^2}\)`,String.raw`\(\frac{1}{a}\arctan\frac{x}{a}+C\ (a>0)\)`]
]);
paragraph(old+'12.3:knowledge:block:1','4FB8CAEC60380BF18A069A34542A43588F9183E208A4DD875358B9460E4A8476',String.raw`Một số dạng thường gặp (trên từng khoảng xác định):
\[\int\frac{u'(x)}{u(x)}\,dx=\ln|u(x)|+C,\]
\[\int\frac{1}{x^2+a^2}\,dx=\frac{1}{a}\arctan\frac{x}{a}+C\ (a>0).\]`);
paragraph(old+'12.4:knowledge:block:1','80275E8F2A5E2D58E7D0C71B0A068B29DF8A58C965C69A4DB6B707B235AA84E3',String.raw`\[\int\sin x\,dx=-\cos x+C,\]
\[\int\cos x\,dx=\sin x+C,\]
\[\int\frac{1}{\cos^2x}\,dx=\tan x+C,\]
\[\int\frac{1}{\sin^2x}\,dx=-\cot x+C,\]
\[\int\tan x\,dx=-\ln|\cos x|+C,\]
\[\int\cot x\,dx=\ln|\sin x|+C.\]`);
paragraph(old+'12.5:knowledge:block:1','A7304A682745E42602FE90ACEE036385E0593B9C0FADE832D22FFF5C06B0D212',String.raw`\[\int e^{ax+b}\,dx=\frac{1}{a}e^{ax+b}+C\quad(a\ne0),\]
\[\int q^{ax+b}\,dx=\frac{q^{ax+b}}{a\ln q}+C\quad(q>0,q\ne1,a\ne0),\]
\[\int\frac{u'(x)}{u(x)}\,dx=\ln|u(x)|+C,\]
\[\int\ln x\,dx=x\ln x-x+C\quad(x>0),\]
\[\int\frac{1}{x\ln x}\,dx=\ln|\ln x|+C\quad(x>0,x\ne1).\]`);
paragraph(old+'12.6:knowledge:block:2','3816DCBE064B8BFB37C6DA92DAFF688143EE5F7B1014770338F6206D8FEF0C3A',String.raw`Các mẫu quan trọng:
\[\int u'u^n\,dx=\frac{u^{n+1}}{n+1}+C\ (n\ne-1),\]
\[\int\frac{u'}{u}\,dx=\ln|u|+C.\]`);
paragraph(old+'13.1:knowledge:block:4','200E3C42AE4B00F23F4419F7C883E446D200B26EAE522057667DD6F933FE2AB3',String.raw`\[\int_a^b x^n\,dx=\left[\frac{x^{n+1}}{n+1}\right]_a^b\quad(n\ne-1),\]
\[\int_a^b\frac{1}{x}\,dx=[\ln|x|]_a^b,\]
\[\int_a^b e^x\,dx=[e^x]_a^b,\]
\[\int_a^b\cos x\,dx=[\sin x]_a^b,\]
\[\int_a^b\sin x\,dx=[-\cos x]_a^b,\]
\[\int_a^b\frac{1}{1+x^2}\,dx=[\arctan x]_a^b.\]`);
paragraph(old+'13.5:knowledge:block:1','F169033A182AA4FC3E0432EE32CE58AA54DE769E6F46E707139E50A00901FFAD',String.raw`Quy tắc \(|h(x)|=\begin{cases}h(x),&h(x)\ge0,\\-h(x),&h(x)<0.\end{cases}\)
Để tính \(\int_a^b|h(x)|\,dx\), tìm các nghiệm \(h(x)=0\) bên trong \([a,b]\), xét dấu trên từng khoảng rồi bỏ dấu trị tuyệt đối đúng theo dấu.`);
paragraph(old+'13.5:knowledge:block:2','00E1115661FB9294433466F4AA287468F7884C6C7C8F27906E835F069BEE650D',String.raw`\[\int_a^b|h(x)|\,dx=\sum_k\int_{x_k}^{x_{k+1}}\pm h(x)\,dx,\]`);
paragraph(old+'14.9:knowledge:block:2','17EC0601C49EE91FB7EF023F3950469B4EE2A492949CE42D758B71C12C9157BB',String.raw`\[r(t)=\begin{cases}r_1(t),&t_0\le t<t_1,\\r_2(t),&t_1\le t<t_2,\\\cdots&\cdots\\r_n(t),&t_{n-1}\le t\le t_n.\end{cases}\]`);
paragraph(old+'14.9:knowledge:block:4','86742C987D529ECF38139124ECA1749C41DD47FBCA614449BA6352D282F39C1E',String.raw`\[\Delta F=\sum_{k=1}^n\int_{t_{k-1}}^{t_k}r_k(t)\,dt.\]`);
paragraph(old+'CD12-CD14:knowledge:block:1','3F647B1AE2AAC994374082C14F7EE88450AE857E1C692759F5D810555F7A7F33',String.raw`\[\int x^n\,dx=\frac{x^{n+1}}{n+1}+C\quad(n\ne-1),\]
\[\int\frac{1}{x}\,dx=\ln|x|+C,\]
\[\int e^{ax+b}\,dx=\frac{e^{ax+b}}{a}+C\quad(a\ne0),\]
\[\int\cos(ax+b)\,dx=\frac{\sin(ax+b)}{a}+C,\]
\[\int\sin(ax+b)\,dx=-\frac{\cos(ax+b)}{a}+C,\]
\[\int u\,dv=uv-\int v\,du,\]
\[\int_a^b f(x)\,dx=F(b)-F(a),\]
\[\int_a^b|f(x)|\,dx=\text{tổng diện tích},\]`);
paragraph(old+'CD12-CD14:knowledge:block:3','A0746D3EFE84F00DBE54DEE1F920259469F99C4B37BCB83C8E7D99B76B26CA42',String.raw`\[V_{\text{quay }Ox}=\pi\int_a^b(R^2-r^2)\,dx,\]
\[\Delta F=\int_a^b F'(t)\,dt,\]`);
table('cd01-cd07-functions:CD06:knowledge:block:2','12BD6E3AFAAC1163EEC696A2EA50EA963FFBB7B3F0B30C59A62871288FC4773D',[
 ['Hàm mới',String.raw`Biến đổi từ điểm \((x;y)\)`],
 [String.raw`\(f(x)+a\)`,String.raw`\((x;y+a)\)`],
 [String.raw`\(f(x-a)\)`,String.raw`\((x+a;y)\)`],
 [String.raw`\(-f(x)\)`,String.raw`\((x;-y)\)`],
 [String.raw`\(f(-x)\)`,String.raw`\((-x;y)\)`]
]);
const trig='cd15-cd16-trigonometry-2026:';
table(trig+'15.1:knowledge:block:2','DC94B461B8D005CE0CB7548C70B785655BDDC1ADD0E6D0477EF18766CC25AB87',[
 [String.raw`\(\alpha\)`,'0',String.raw`\(\pi/6\)`,String.raw`\(\pi/4\)`,String.raw`\(\pi/3\)`,String.raw`\(\pi/2\)`],
 [String.raw`\(\sin\alpha\)`,'0',String.raw`\(1/2\)`,String.raw`\(\sqrt{2}/2\)`,String.raw`\(\sqrt{3}/2\)`,'1'],
 [String.raw`\(\cos\alpha\)`,'1',String.raw`\(\sqrt{3}/2\)`,String.raw`\(\sqrt{2}/2\)`,String.raw`\(1/2\)`,'0'],
 [String.raw`\(\tan\alpha\)`,'0',String.raw`\(\sqrt{3}/3\)`,'1',String.raw`\(\sqrt{3}\)`,'KXĐ'],
 [String.raw`\(\cot\alpha\)`,'KXĐ',String.raw`\(\sqrt{3}\)`,'1',String.raw`\(\sqrt{3}/3\)`,'0']
]);
entries.set(trig+'15.1:knowledge:block:3',{glyphHash:'A7A0C69D291420BE855F7B15EEF15C0F12C9EA8CC2A5F6DAFCA731B068B01F47',kind:'continuation',absorbedBy:trig+'15.1:knowledge:block:2'});
paragraph(trig+'15.3:knowledge:block:1','B827B204898CDAAB233CBC6026DB0672EA027DD26F5B9E365F6B49D73717CA7E',String.raw`\[\sin(a\pm b)=\sin a\cos b\pm\cos a\sin b;\]
\[\cos(a\pm b)=\cos a\cos b\mp\sin a\sin b;\]
\[\tan(a\pm b)=\frac{\tan a\pm\tan b}{1\mp\tan a\tan b}\] khi các biểu thức xác định.`);
paragraph(trig+'15.6:knowledge:block:1','F9347AEF5EA4CEE735092183C8D6782358A47A061A19B1A67C73E5E38C0A70A9',String.raw`\[\sin a+\sin b=2\sin\frac{a+b}{2}\cos\frac{a-b}{2};\]
\[\sin a-\sin b=2\cos\frac{a+b}{2}\sin\frac{a-b}{2};\]
\[\cos a+\cos b=2\cos\frac{a+b}{2}\cos\frac{a-b}{2};\]
\[\cos a-\cos b=-2\sin\frac{a+b}{2}\sin\frac{a-b}{2}.\]
Cách làm. Tính nửa tổng và nửa hiệu của hai góc. Đặc biệt giữ dấu âm trong hiệu hai cos; nhóm cặp đối xứng nếu có nhiều hạng tử.`);
const exp='cd08-cd11-exponential-logarithm:';
paragraph(exp+'CD08-CD11:knowledge:block:38','31C9503DAFA5F8ACFC33634EC50DBA4EC7D0CD663DA6F6D11B71586F3DEC4F86',String.raw`\[(\sqrt[n]{a})^m=\sqrt[n]{a^m},\]
\[\sqrt[n]{\sqrt[k]{a}}=\sqrt[nk]{a}.\]`);
paragraph(exp+'CD08-CD11:knowledge:block:39','4AA65385B08DB691C9458AA2B8CE547ED731D35BE31CCFC61BC9D5C27FD82943',String.raw`\[\sqrt[n]{a^n}=\begin{cases}a,&n\text{ lẻ},\\|a|,&n\text{ chẵn}.\end{cases}\]`);
paragraph(exp+'CD08-CD11:knowledge:block:41','4C7C84F2D2E35B0F22FC6242BF76AC8CF49F4BF0A7FC7CB42796E02D1E61A6C8',String.raw`\[e=\lim_{x\to+\infty}\left(1+\frac{1}{x}\right)^x\approx2{,}71828.\]`);
paragraph(exp+'8.12:method:block:1','3290DA3D166FBCE8B156456D5A094B9FC3ECEEBB3AE9946D15FF7E94BF988332',String.raw`Đổi về một cơ số để rút gọn. Với \(a,b,c>0,a,b\ne1\), \(\log_a b\log_b c=\log_a c\). Với \(\alpha\ne0\), \(\log_{a^\alpha}M=\log_a M/\alpha\).`);

export function applySourceTranscriptions(evidence) {
  const found = new Set();
  for(const source of evidence.sources)for(const record of source.records)for(const block of record.blocks){
    const entry=entries.get(block.id);
    if(entry){
      if(entry.glyphHash!==block.glyphHash)throw new Error('Source transcription evidence changed: '+block.id);
      Object.assign(block,entry,{errors:[],conversion:'literal-original-page-transcription'});found.add(block.id);
    }
    // Actual source plots remain separate, never published as numeric prose.
    if((source.source.sourceId==='cd08-cd11-exponential-logarithm'&&record.key==='CD08-CD11'&&block.page===6&&block.original.includes('y = 2x'))||
       (source.source.sourceId==='cd12-cd14-calculus'&&record.key==='13.6'&&block.original==='x\ny\n2 5\n3')){
      block.kind='figure';block.errors=['NATIVE_DIAGRAM_SPEC_REQUIRED'];
    }
  }
  for(const id of entries.keys())if(!found.has(id))throw new Error('Source transcription target not found: '+id);
  return found.size;
}
