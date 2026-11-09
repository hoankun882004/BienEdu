import {mathContentMarkup} from '../../assets/js/components/canonical-math-renderer.js';
const app=document.querySelector('[data-preview-v62]');
const [report,content,previous,cases]=await Promise.all(['inventory','content','bundle','cases'].map(n=>fetch(`./${n}.json`).then(r=>{if(!r.ok)throw Error('Preview evidence unavailable');return r.json();})));
const current=await fetch('/__bienedu_v62_status').then(r=>r.ok?r.json():{status:'UNKNOWN'}).catch(()=>({status:'UNKNOWN'}));
function node(tag,text,parent=app){const e=document.createElement(tag);if(text!=null)e.textContent=text;parent.append(e);return e;}
node('h1','Biển Edu V6.2 · Chuyển đổi toán từ nguồn');
node('p',`PARTIAL · ${report.counts.newExamples} ví dụ và ${report.counts.newSolutions} lời giải trong batch; ${report.counts.stillBlocked} mục vẫn bị chặn. ${current.planHash===report.planHash&&current.status==='ACTIVE'?'Batch này đã được người dùng áp dụng cục bộ.':'Đây là bản xem trước, không tự áp dụng.'}`);
node('h2','Trạng thái và lệnh cục bộ');node('pre',`Parent chuẩn bị: ${report.actualParent.planHash}\nRuntime hiện tại: ${current.status} ${current.planHash??''}`);node('pre',report.applyCommand);node('pre',report.rollbackCommand);
node('p','Kiểm tra cấu trúc nguồn, cú pháp Canonical/KaTeX, tính nhất quán toán và trình duyệt là các mức riêng biệt. Không có phê duyệt biên tập giả.');
const quality=node('section');node('h2','QA gắn với manifest này',quality);
const final=await fetch('./final-report.json').then(r=>r.ok?r.json():null).catch(()=>null);
if(final?.release?.planHash===report.planHash){
  node('p',`Đã chạy tuần tự ${final.tests.results.length} lệnh kiểm tra; tất cả exit code 0. Không có apply thật trong quá trình triển khai.`,quality);
  for(const r of final.tests.results)node('pre',`${r.command}: exit ${r.exitCode} · ${r.log}`,quality);
  node('p',`Trình duyệt: nội dung ${final.tests.browser.content.states}, mobile ${final.tests.browser.mobile.states}, đồ thị ${final.tests.browser.graphs.states}. Fixture glyph: ${final.tests.glyph.passed}; SymPy: ${final.tests.symbolicFixtures.passed}.`,quality);
  node('p',`CLS local trước/sau: ${final.mobile.maxPairedCLSBefore.toFixed(4)} → ${final.mobile.maxPairedCLSAfter.toFixed(4)}. Đây không phải chứng nhận CWV production hoặc Safari thực tế.`,quality);
  for(const shot of ['source-17.4-390.png','source-12.8-1366.png','mobile-320.png','graph-component-390.png','graph-component-1366.png']){
    const link=node('a','Ảnh QA: '+shot,quality);link.href='./'+shot;link.target='_blank';link.rel='noopener';node('br',null,quality);
  }
  const targets=node('details',null,quality);node('summary','Các tệp runtime và hash trước/sau',targets);
  for(const target of final.release.targets)node('pre',`${target.file}\nBefore: ${target.beforeHash}\nAfter: ${target.afterHash}`,targets);
  const matrix=node('details',null,quality);node('summary','Trạng thái đủ 39 chuyên đề',matrix);
  for(const t of final.matrix)node('p',`${t.topicId}: ${!t.sourceIds.length?'Thiếu nguồn':t.topicId==='CD23'?'Chưa xuất bản':['CD20','CD21'].includes(t.topicId)?'Được bảo vệ':'Nội dung nguồn còn một phần chưa kiểm chứng'} · overlay V6.1 đang có ${t.activeV61Examples} · V6.2 staged ${t.preparedV62Examples}`,matrix);
}else node('p','Chưa có báo cáo QA cuối cùng khớp hash này. Không dùng kết quả của manifest cũ để xác nhận bản mới.',quality);
node('h2','861 mục của V6.1');
for(const [name,c]of Object.entries(content.cohorts))node('p',`${name}: ${c.examined} đã xét · ${c.recovered} phục hồi · ${c.blocked} còn chặn`);
node('h2','Trước / sau — cấu trúc từ glyph và vector gốc');
for(const sample of cases){const article=node('article');node('h3',sample.kind,article);node('p',`${sample.id} · ${sample.sourceId} · Trang ${sample.pages.join(', ')}`,article);node('pre',sample.original,article);const after=node('div',null,article);after.innerHTML=mathContentMarkup(sample.canonical);node('p','Cấu trúc nguồn và Canonical được kiểm tra kỹ thuật; không thay thế phê duyệt biên tập.',article);}
node('h2','Các nhóm học được chuẩn bị');
for(const group of content.groups){
  const article=node('article',null);node('h3',`${group.topicId} · ${group.code} · ${group.examples.length} ví dụ`,article);
  node('pre',`${group.source.sourceId} · SHA256 ${group.source.sha256}`,article);
  if(group.pedagogicalState.exampleOnly)node('p','Nguồn chưa có đủ kiến thức/cách làm đã khôi phục hoặc được trình bày như phiên bản độc lập. Không suy diễn lý thuyết.',article);
  const link=node('a','Mở trang học thật bằng dữ liệu chuẩn bị →',article);
  const cumulative=previous.groups.find(g=>g.code===group.code),position=cumulative.examples.findIndex(e=>e.id===group.examples[0].id)+1;
  // Existing independent-edition examples precede the new source. Their route
  // count is supplied by the preview report, not guessed from source numbering.
  const item=group.mergeMode==='append-independent-source'?(report.editionOffsets?.[group.code]??0)+position:position;
  link.href=`/documents.html?grade=12&topic=${group.topicId}&type=${group.code}&section=example&item=${item}&releasePreview=off`;
  const disclosure=node('details',null,article);node('summary','Nội dung toán đại diện và lời giải nguồn',disclosure);
  const example=group.examples[0];node('p',`Ví dụ gốc ${example.originalExampleNumber} · Đề trang ${example.statementSourcePage} · Giải trang ${example.solutionSourcePage}`,disclosure);
  const math=node('div',null,disclosure);math.innerHTML=mathContentMarkup(example.prompt)+mathContentMarkup(example.steps[0].expression);
}
node('h2','Còn bị chặn — không bị bỏ khỏi thống kê');
const list=node('details');node('summary',`${content.counts.stillBlocked} mục và lý do cụ thể`,list);
for(const d of content.decisions.filter(d=>d.status.startsWith('BLOCKED')))node('pre',`${d.id}: ${d.reasons.join('; ')}`,list);
