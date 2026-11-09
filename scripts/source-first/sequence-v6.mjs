// Complete semantic group transcribed from the independent CD17–19 source.
// Ordinary PDF math is reconstructed ONLY where statement and solution agree.
import {parseRichText,mathNode} from '../../assets/js/components/canonical-math.js';
export const sequenceSource={sourceId:'cd17-cd19-sequences-2026',file:'39 chuyên đề/Day-so-Cap-so-CD17-CD19.pdf',sha256:'46ECFCD53189EAD5F9964FB4F8943E09EAC7FF667322221698F2CC47E5546E5E',page:2,solutionPage:13};
const rich=(value)=>parseRichText(value);
const statements=[
  String.raw`Cho \(u_n=2n+1\), \(n\ge1\). Tính \(u_5\).`,
  String.raw`Cho \(u_n=n(n-3)\), \(n\ge1\). Tính \(u_4\).`,
  String.raw`Cho \(u_n=\frac{n+1}{2n-1}\), \(n\ge1\). Tính \(u_3\).`,
  String.raw`Cho \(u_n=\frac{(-1)^n}{n}\), \(n\ge1\). Tính \(u_6\).`,
  String.raw`Cho \(u_n=2^{n-1}\), \(n\ge1\). Tính \(u_8\).`,
  String.raw`Cho \(u_n=-\sqrt n+\sqrt{n+1}\), \(n\ge1\). Tính \(u_3\).`,
  String.raw`Cho \(u_n=\frac{n+1}{n}\), \(n\ge1\). Tính \(u_{10}\).`,
  String.raw`Cho \(u_n=\frac{n(n+1)}{2}\), \(n\ge1\). Tính \(u_7\).`,
  String.raw`Cho \(u_1=2\), \(u_{n+1}=3u_n-1\). Tính \(u_2,u_3,u_4\).`,
  String.raw`Cho \(u_n=3n-2\). Số \(25\) có phải một số hạng của dãy không? Nếu có, tìm chỉ số.`
];
const solutions=[
  String.raw`Thay đúng chỉ số \(n=5\) vào công thức: \(u_5=11\).`,
  String.raw`Thay đúng chỉ số \(n=4\) vào công thức: \(u_4=4\).`,
  String.raw`Mẫu khác \(0\) với mọi \(n\ge1\). Thay đúng chỉ số \(n=3\) vào công thức: \(u_3=\frac45\).`,
  String.raw`Chỉ số chẵn cho \((-1)^n=1\). Thay đúng chỉ số \(n=6\) vào công thức: \(u_6=\frac16\).`,
  String.raw`Số mũ là \(n-1\), không phải \(n\). Thay đúng chỉ số \(n=8\) vào công thức: \(u_8=128\).`,
  String.raw`Không thay hiệu hai căn bằng căn của hiệu. Thay đúng chỉ số \(n=3\) vào công thức: \(u_3=2-\sqrt3\).`,
  String.raw`Thay đúng chỉ số \(n=10\) vào công thức: \(u_{10}=\frac{11}{10}\).`,
  String.raw`Đây là công thức số tam giác. Thay đúng chỉ số \(n=7\) vào công thức: \(u_7=28\).`,
  String.raw`Tính nối tiếp: \(u_2=3\times2-1=5\); \(u_3=3\times5-1=14\); \(u_4=3\times14-1=41\). Không thay trực tiếp \(n=4\) vào vế phải mà bỏ các số hạng trước.`,
  String.raw`Giải \(3n-2=25\) được \(n=9\in\mathbb{N}^{*}\). Vậy \(25=u_9\). Bài này tìm chỉ số từ giá trị, khác với tính \(u_{25}\).`
];
// Canonical v1 intentionally requires braced fraction/radical arguments.
const normalize=(text)=>text.replaceAll(String.raw`\sqrt n`,String.raw`\sqrt{n}`).replaceAll(String.raw`\sqrt3`,String.raw`\sqrt{3}`).replaceAll(String.raw`\frac45`,String.raw`\frac{4}{5}`).replaceAll(String.raw`\frac16`,String.raw`\frac{1}{6}`);
export const sequenceGroup={
  code:'17.1',topicId:'CD17',source:sequenceSource,
  knowledge:{id:'17.1-knowledge-1',title:'Xác định số hạng',lead:rich(String.raw`Dãy \((u_n)\) thường được đánh chỉ số từ \(n=1\). \(u_j\) là giá trị tại chỉ số \(j\), khác với \(u_n=j\). Với dãy truy hồi, cần giá trị đầu và quy tắc để đi tiếp.`),
    formulae:[{label:'Chỉ số',value:mathNode(String.raw`n\ge1`),detail:'Trừ khi đề ghi khác, chỉ số của dãy bắt đầu từ n = 1 theo quy ước của tài liệu.'}],
    points:[{label:'Cách làm',text:rich('Đọc đúng chỉ số bắt đầu; thay n bằng chỉ số được hỏi. Nếu truy hồi, tính tuần tự và ghi rõ từng bước; với số hạng âm hoặc lũy thừa, giữ ngoặc.')}],sourcePages:[2]},
  method:{id:'17.1',code:'17.1',title:'Xác định số hạng',order:1,methodology:'Đọc đúng chỉ số bắt đầu; thay n bằng chỉ số được hỏi. Nếu truy hồi, tính tuần tự và ghi rõ từng bước; với số hạng âm hoặc lũy thừa, giữ ngoặc.',exampleCount:10,solutionCount:10,figureCount:0,sourcePages:[2,13],reviewStatus:'needs-review'},
  examples:statements.map((prompt,i)=>({id:`17.1-source-example-${i+1}`,title:`Ví dụ ${i+1}`,prompt:rich(normalize(prompt)),steps:[{label:'Lời giải từ tài liệu',expression:rich(normalize(solutions[i])),text:null}],answer:rich(normalize(solutions[i])),originalExampleNumber:i+1,problemTypeId:'17.1',lessonId:'17.1',topicId:'CD17',sourceBlockId:`17.1-worked-example-${i+1}`,sourcePages:[2,13],statementSourcePage:2,solutionSourcePage:13,assetReferences:[],sourcePdf:sequenceSource.sourceId,origin:'source-first-v6',contentVersion:'source-first-v6.0',reviewStatus:'needs-review',verification:'machine-source-checked',contentType:'canonical-math-v1'})),
  practice:[],verification:{status:'machine-source-checked',humanApproval:false,sourceHash:sequenceSource.sha256}
};
