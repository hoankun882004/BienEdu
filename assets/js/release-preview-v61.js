import {mathContentMarkup} from './components/canonical-math-renderer.js';
const url=new URL('../../.audit/source-first-v5/release-v61/',import.meta.url);
const report=await fetch(new URL('inventory.json',url)).then((r)=>r.json()),content=await fetch(new URL('content.json',url)).then((r)=>r.json());
const root=document.querySelector('[data-release-v61]'),el=(tag,text)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;return n;};
root.append(el('h1','Biển Edu · V6.1'),el('p','Bản xem thử chỉ đọc. V6.0 đang hoạt động; V6.1 chưa được áp dụng. Không phải phê duyệt xuất bản.'),el('pre',JSON.stringify(report.counts,null,2)),el('h2','Áp dụng / hoàn tác theo đúng hash'),el('pre',report.applyCommand+'\n\n'+report.rollbackCommand));
for(const g of content.groups){const article=el('article');article.append(el('h2',`${g.code} · ${g.method.title}`),el('p',`${g.source.sourceId} · ${g.examples.length} ví dụ có lời giải; chưa phải toàn bộ dạng bài.`));
  const link=el('a','Mở trang học thực tế — preview');link.href=`/documents.html?grade=12&topic=${g.topicId}&type=${g.code}&section=knowledge&item=1&releasePreview=off`;article.append(link);
  const details=el('details');details.append(el('summary','Đọc kiến thức và đối chiếu các ví dụ'));
  details.addEventListener('toggle',()=>{if(!details.open||details.dataset.mounted)return;details.dataset.mounted='true';const lead=el('div');lead.innerHTML=mathContentMarkup(g.knowledge.lead);details.append(lead);for(const e of g.examples){const q=el('div'),s=el('div');q.innerHTML=mathContentMarkup(e.prompt);s.innerHTML=mathContentMarkup(e.steps[0].expression);details.append(el('h3',e.title),q,s);}});article.append(details);root.append(article);
}
const gaps=el('details');gaps.append(el('summary','Các ca bị chặn — giữ nguyên lý do và nguồn'));for(const d of content.decisions.filter((d)=>!['PREPARED','ALREADY_AVAILABLE'].includes(d.status)))gaps.append(el('p',`${d.id} · ${d.status}: ${d.reasons.join('; ')}`));root.append(gaps);
const table=el('table');table.append(el('caption','Độ phủ 39 chuyên đề — chuẩn bị không đồng nghĩa đã xuất bản'));for(const r of report.matrix){const row=el('tr');for(const value of [r.topicId,r.status,r.preparedExamples])row.append(el('td',String(value)));table.append(row);}const scroll=el('div');scroll.className='native-variation';scroll.append(table);root.append(scroll);
