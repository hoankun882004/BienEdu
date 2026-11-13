import {renderGeometry,reserveGeometry,disposeDetachedGeometry,disposeGeometry,activeGeometryCount} from './components/geometry-renderer.js';

export function attachGeometry(bundle,root=document.querySelector('[data-curriculum-app]')){
  if(!root)throw Error('Learning workspace is missing');
  const pending=new Map(),owned=new Set();let stopped=false,scheduled=false;
  const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){
    const candidate=pending.get(entry.target);if(!candidate)continue;pending.delete(entry.target);observer.unobserve(entry.target);
    renderGeometry(candidate.spec,entry.target).then(state=>{if(!state)return;
      const edition=entry.target.closest('[data-pdf-knowledge]');
      if(edition&&Array.from(edition.querySelectorAll('[data-source-geometry]')).every(e=>e.dataset.geometryReady==='true'))edition.querySelector('.pdf-theory__figure-note')?.setAttribute('hidden','');
    }).catch(error=>{entry.target.dataset.geometryError=error.message;});
  }},{rootMargin:'200px'});
  const scan=()=>{
    scheduled=false;if(stopped)return;disposeDetachedGeometry();
    for(const host of owned)if(!host.isConnected){pending.delete(host);observer.unobserve(host);owned.delete(host);}
    if(new URL(location.href).searchParams.get('section')!=='knowledge')return;
    for(const candidate of bundle.candidates){
      const edition=Array.from(root.querySelectorAll('[data-pdf-knowledge]')).find(e=>e.dataset.pdfKnowledge===candidate.target.recordId);
      if(!edition||edition.querySelector(`[data-source-geometry="${CSS.escape(candidate.target.blockId)}"]`))continue;
      const host=document.createElement('figure');host.className='native-geometry';host.dataset.sourceGeometry=candidate.target.blockId;
      reserveGeometry(candidate.spec,host);
      const blocks=Array.from(edition.querySelectorAll('[data-source-block]'));
      const following=blocks.find(e=>e.dataset.sourceBlock===candidate.target.followingBlockId),preceding=blocks.find(e=>e.dataset.sourceBlock===candidate.target.precedingBlockId);
      if(following)following.before(host);else if(preceding)preceding.after(host);else{const note=edition.querySelector('.pdf-theory__figure-note');if(note)note.before(host);else edition.append(host);}
      owned.add(host);pending.set(host,candidate);observer.observe(host);
      // Only an explicit source-edition link opens an older PDF edition.
      if(new URL(location.href).searchParams.get('geometryRecord')===candidate.target.recordId){
        const details=edition.closest('details');if(details)details.open=true;
      }
    }
  };
  const mutations=new MutationObserver(records=>{
    if(records.every(r=>r.target.closest?.('.native-geometry')))return;
    if(!scheduled){scheduled=true;queueMicrotask(scan);}
  });mutations.observe(root,{childList:true,subtree:true});scan();
  const stop=()=>{stopped=true;mutations.disconnect();observer.disconnect();for(const host of owned){host.closest('[data-pdf-knowledge]')?.querySelector('.pdf-theory__figure-note')?.removeAttribute('hidden');disposeGeometry(host);host.remove();}pending.clear();owned.clear();};
  window.addEventListener('pagehide',stop,{once:true});
  // Diagnostic API is read-only except explicit disposal, useful for lifecycle QA.
  return {stop,scan,get active(){return activeGeometryCount();}};
}
