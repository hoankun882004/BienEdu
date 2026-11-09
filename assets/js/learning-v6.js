// Small behavioral refinements around the existing renderer, not a new router.
export function initializeLearningAccessibility(){
  const style=document.createElement('link');style.rel='stylesheet';style.href='assets/learning-v6.css?v=6.0';document.head.append(style);
  const toggle=document.querySelector('.menu-toggle'),nav=document.querySelector('.site-nav'),small=matchMedia('(max-width:47.5rem)');
  if(toggle&&nav){
    const sync=()=>{nav.inert=small.matches&&toggle.getAttribute('aria-expanded')!=='true';};sync();small.addEventListener('change',sync);
    new MutationObserver(sync).observe(toggle,{attributes:true,attributeFilter:['aria-expanded']});
    document.addEventListener('keydown',(event)=>{
      if(!small.matches||toggle.getAttribute('aria-expanded')!=='true'||document.querySelector('dialog[open]'))return;
      if(event.key==='Escape'){queueMicrotask(()=>toggle.focus());return;}
      if(event.key!=='Tab')return;
      const controls=[toggle,...nav.querySelectorAll('a[href]')].filter((n)=>n.getClientRects().length);
      const i=controls.indexOf(document.activeElement);
      if(event.shiftKey&&i<=0){event.preventDefault();controls.at(-1).focus();}
      else if(!event.shiftKey&&(i===controls.length-1||i<0)){event.preventDefault();controls[0].focus();}
    },true);
    document.addEventListener('click',(event)=>{if(toggle.getAttribute('aria-expanded')==='true'&&!event.target.closest('.site-header'))toggle.click();});
  }
  const app=document.querySelector('[data-curriculum-app]');if(!app)return;
  app.addEventListener('keydown',(event)=>{
    if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
    const scroll=event.target.closest('.native-variation,.math-markdown__display,.canonical-math--display');
    if(!scroll||scroll.scrollWidth<=scroll.clientWidth+1)return;
    event.preventDefault();event.stopPropagation();scroll.scrollLeft+=event.key==='ArrowRight'?72:-72;
  },true);
  const positionedExamples=new WeakSet();
  function refine(){
    // Keep the active example visible by scrolling only its horizontal strip.
    for(const current of app.querySelectorAll('.example-index a[aria-current="page"]')){
      if(positionedExamples.has(current))continue;positionedExamples.add(current);
      requestAnimationFrame(()=>{if(!current.isConnected)return;const list=current.closest('ol');if(!list)return;const a=current.getBoundingClientRect(),b=list.getBoundingClientRect();if(a.left<b.left)list.scrollLeft+=a.left-b.left-4;else if(a.right>b.right)list.scrollLeft+=a.right-b.right+4;});
    }
    // Existing renderer nested a <main> inside the page's <main>. Keep attributes
    // and children (including mounted math/graphs), replacing only the landmark.
    for(const old of app.querySelectorAll('main[data-lesson-content]')){
      const section=document.createElement('section');for(const a of old.attributes)section.setAttribute(a.name,a.value);
      section.setAttribute('aria-label','Nội dung bài học');section.append(...old.childNodes);old.replaceWith(section);
    }
    for(const feedback of app.querySelectorAll('.practice-feedback:not([aria-atomic])'))feedback.setAttribute('aria-atomic','true');
    for(const label of app.querySelectorAll('.example-reader__review-status>b'))if(label.textContent==='NEEDS_REVIEW')label.textContent='Đang đối chiếu';
    for(const heading of app.querySelectorAll('.math-lesson__heading')){const title=heading.querySelector('h2'),subtitle=heading.querySelector('p');if(title&&subtitle&&title.textContent.trim()===subtitle.textContent.trim())subtitle.hidden=true;}
    for(const list of app.querySelectorAll('.example-index ol:not([aria-label])')){list.setAttribute('aria-label','Chọn ví dụ');list.tabIndex=0;}
  }
  let queued=false;
  new MutationObserver((changes)=>{if(changes.every((c)=>c.target.closest?.('.canonical-math,.katex,.native-graph')))return;if(!queued){queued=true;queueMicrotask(()=>{queued=false;refine();});}}).observe(app,{childList:true,subtree:true});
  refine();
}
