import {geometryPointer,loadGeometryBundle} from './geometry-loader.js';
import {renderGeometry,disposeDetachedGeometry} from './components/geometry-renderer.js';
const text=(tag,value)=>{const e=document.createElement(tag);e.textContent=value;return e;};
try{
  const bundle=await loadGeometryBundle(await geometryPointer()),s=bundle.summary;
  const sourcePayload=await fetch('/'+bundle.knowledgeParent.bundle).then(r=>r.json()),sources=new Map(sourcePayload.articles.map(a=>[a.source.sourceId,a.source.file]));
  document.querySelector('#geometry-summary').textContent=`${s.examined} hình · ${s.dimensions[2]} hình 2D · ${s.dimensions[3]} hình 3D · ${s.sourceDetermined} hình theo dữ kiện xác định · ${s.constrainedSchematics} sơ đồ ràng buộc · ${s.symbolicChecks} kiểm tra SymPy đạt.`;
  const mounts=new Map(),observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){const spec=mounts.get(entry.target);if(spec){observer.unobserve(entry.target);renderGeometry(spec,entry.target).catch(error=>entry.target.append(text('p',error.message)));}}},{rootMargin:'100px'});
  for(const candidate of bundle.candidates){
    const {spec,target}=candidate,article=text('article','');article.id=spec.id;article.append(text('h2',target.key+' · '+spec.classification));
    const link=text('a','Mở đúng bài học →');link.href='/'+target.route;article.append(link);
    const reference=text('a',' · Đối chiếu PDF gốc (chỉ đọc)');reference.href='/'+sources.get(spec.source.sourceId)+'#page='+spec.source.page;reference.target='_blank';reference.rel='noopener';article.append(reference);
    const dl=document.createElement('dl');for(const [name,value]of [['Record',spec.recordId],['Nguồn',spec.source.sourceId],['SHA-256',spec.source.sha256],['Vị trí',`Trang ${spec.source.page} · ${spec.source.rect.join(', ')}`],['Cách dựng',spec.realization.kind],['Dữ kiện tự chọn',spec.realization.freeChoices.join(' ')||'Không'],['Kiểm tra',`${spec.relationships.length} quan hệ · ${spec.validation.status}`],['Đích thay thế',target.blockId],['Tích hợp','PREPARED — chưa kích hoạt']])dl.append(text('dt',name),text('dd',value));article.append(dl);
    const host=document.createElement('figure');host.className='native-geometry__pending';host.textContent=spec.description;article.append(host);document.querySelector('#geometry-candidates').append(article);mounts.set(host,spec);observer.observe(host);
  }
  document.querySelector('#geometry-blocked').textContent=s.blocked+' hình. Chỉ các quan hệ được nguồn nêu rõ mới được dựng; tọa độ minh họa không phải số đo lấy từ PDF.';
  window.addEventListener('pagehide',()=>{observer.disconnect();disposeDetachedGeometry();},{once:true});
}catch(error){document.querySelector('#geometry-summary').textContent='Không thể mở bản chuẩn bị: '+error.message;}
