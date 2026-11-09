import { mountGraph } from './components/graph-renderer.js';
const base = new URL('../../.audit/source-first-v5/graphs-v5.8/', import.meta.url);
const [candidates, inventory] = await Promise.all(['candidates.json', 'inventory.json'].map(async (file) => { const response=await fetch(new URL(file,base)); if(!response.ok)throw new Error('Preview unavailable');return response.json(); }));
const root = document.querySelector('[data-graph-preview]');
const el = (tag, text) => { const node=document.createElement(tag);if(text)node.textContent=text;return node; };
root.append(el('p', `${inventory.total} hồ sơ figure · ${inventory.counts.FUNCTION_GRAPH} đồ thị hàm · ${inventory.counts.VARIATION_TABLE} bảng biến thiên · ${candidates.length} pilot đủ điều kiện xem thử.`));
root.append(el('h2','Sẵn sàng thử cục bộ'));
for (const candidate of candidates) {
  const article=el('article'), {spec,target}=candidate;
  article.append(el('h3',`${target.recordId} · ${spec.type}`),el('p',candidate.properties));
  const graph=el('div');article.append(graph);
  const details=el('details'), summary=el('summary','Nguồn, miền xác định và kiểm chứng');details.append(summary);
  details.append(el('pre',JSON.stringify({source:spec.source,domain:spec.branches?.map((b)=>({intervals:b.domain,exclusions:b.exclusions}))??spec.columns,checks:candidate.checks,target:target.figureId,status:candidate.integrationStatus,humanApproval:false},null,2)));
  const source=el('a','Đọc nguồn PDF gốc');source.href=new URL('../../'+spec.source.file,import.meta.url).href+`#page=${spec.source.page}`;source.target='_blank';source.rel='noopener';details.append(source);
  const learner=el('a','Mở trong trang học (preview)');learner.href=`/documents.html?grade=12&topic=${target.topic}&type=${target.code}&section=example&item=${target.item}&graphPreview=v58`;article.append(details,learner);
  root.append(article);await mountGraph(spec,graph);
}
for(const [title,filter] of [['Nguồn chưa rõ',(r)=>r.eligibility==='SOURCE_AMBIGUOUS'],['Ánh xạ chưa rõ',(r)=>r.eligibility==='RUNTIME_MAPPING_AMBIGUOUS'],['Loại chưa hỗ trợ',(r)=>r.category==='GEOMETRIC_DIAGRAM'],['Không phải đồ thị',(r)=>r.eligibility==='NON_GRAPH']]){
  const list=inventory.rows.filter(filter),details=el('details');details.append(el('summary',`${title} (${list.length})`));
  for(const row of list)details.append(el('p',`${row.figureId} · ${row.category} · ${row.reason}`));root.append(details);
}
