import {overlayGroups} from '../../../assets/js/data/learning-overlay.js';
import {getExampleContent} from '../../../assets/js/data/examples-v6.js';
import {mathContentMarkup} from '../../../assets/js/components/canonical-math-renderer.js?v=5.7';
export function refineSourceContext(app){
  const route=new URL(location.href).searchParams,code=route.get('type'),section=route.get('section');
  const group=overlayGroups.find(g=>g.code===code);if(!group)return;
  const examples=getExampleContent(code),example=section==='example'?examples?.[Number(route.get('item')??1)-1]:null;
  const index=app.querySelector('.example-index');
  if(index&&group.mergeMode==='append-independent-source'&&!index.querySelector('.source-edition-nav')){
    const nav=document.createElement('nav');nav.className='source-edition-nav';nav.setAttribute('aria-label','Phiên bản tài liệu');
    for(const [label,position]of [['Nguồn trước',0],['Nguồn bổ sung',examples.findIndex(e=>e.origin==='source-first-v6.2')]]){
      if(position<0)continue;const link=document.createElement('a'),url=new URL(location.href);url.searchParams.set('item',String(position+1));
      link.href=url.pathname+url.search;link.dataset.route='';link.textContent=label;nav.append(link);
    }
    index.querySelector('header').after(nav);
    for(const [i,link]of [...index.querySelectorAll('ol a')].entries())if(examples[i]?.origin==='source-first-v6.2'){link.setAttribute('aria-label',link.getAttribute('aria-label')+', nguồn bổ sung');link.title=group.source.file.split('/').at(-1);}
  }
  const target=app.querySelector('.example-card,.math-lesson,.problem-types-stage');
  if(!target||target.querySelector('[data-source-v62]'))return;
  if(example&&example.origin!=='source-first-v6.2')return;
  if(!example&&group.contentVersion!=='source-first-v6.2')return;
  const note=document.createElement('aside');note.dataset.sourceV62='';note.className='source-edition-note';
  const fileName=group.source.file.split('/').at(-1);note.title=fileName;note.dataset.sourceDocument=fileName;
  const labels={'cd17-cd19-sequences-2026':'Dãy số CD17–19','cd15-cd16-trigonometry-2026':'Lượng giác CD15–16','cd12-cd14-calculus-2026':'Nguyên hàm – Tích phân (PDF bổ sung)','cd28-cd33-vector-2026':'Vectơ – Oxyz CD28–33'};
  const title=document.createElement('b');title.textContent='Nguồn: '+(labels[group.source.sourceId]??fileName);note.append(title);
  const detail=document.createElement('p');
  const state=group.pedagogicalState;
  detail.textContent=(example?(group.source.sourceKind==='tex'?`Ví dụ nguồn ${example.sourceExampleNumber} · Đề dòng ${example.sourceLineRanges.statement.join('–')} · Giải dòng ${example.sourceLineRanges.solution.join('–')}. `:`Đề trang ${example.statementSourcePage} · Lời giải trang ${example.solutionSourcePage}. `):'')+
    (state?.exampleOnly&&group.mergeMode!=='append-independent-source'?`${state.knowledge==='source-unresolved'?'Kiến thức chưa khôi phục đủ. ':''}${state.method==='source-unresolved'?'Cách làm chưa khôi phục đủ. ':''}`:'')+
    'Chờ biên tập.';
  if(group.source.sourceKind==='tex')note.dataset.nativeSource='tex';
  note.append(detail);target.prepend(note);
  for(const [key,label]of [['knowledge','Kiến thức của nguồn này'],['method','Cách làm của nguồn này']]){
    const content=group.sourceContext?.[key];if(!content)continue;
    const disclosure=document.createElement('details'),summary=document.createElement('summary'),body=document.createElement('div');
    summary.textContent=label;body.innerHTML=mathContentMarkup(content);disclosure.append(summary,body);note.append(disclosure);
  }
}
