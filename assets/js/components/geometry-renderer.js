import {validateGeometrySpec,geometryModel,sub,scale,add,cross,magnitude} from './geometry-spec.js';
import {loadGraphLibrary} from './graph-renderer.js';
import {compileExpression} from './graph-expression.js';
import {renderMath} from './canonical-math-renderer.js';

const instances=new Map();let sequence=0;
const palette={blue:'#2e5ce6',amber:'#aa741b',muted:'#71819b',teal:'#167d78'};
const element=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls;if(text)e.textContent=text;return e;};
const controlLabels=spatial=>['+','−','Đặt lại',...(spatial?['←','→','↑','↓','Kéo để xoay']:[])];
export function reserveGeometry(spec,host){
  host.classList.add('native-geometry');host.replaceChildren(element('p','native-geometry__notice',spec.realization.notice),element('p','native-geometry__description',spec.description));
  const views=element('div','native-geometry__views');if(spec.views.length>1)views.classList.add('native-geometry__views--paired');host.append(views);
  const slots=spec.views.map(config=>{
    const slot=element('section','native-geometry__view'),controls=element('div','native-geometry__controls');
    for(const label of controlLabels(spec.dimension===3)){const button=element('button','',label);button.type='button';button.disabled=true;controls.append(button);}
    slot.append(element('h4','native-geometry__view-title',config.title),controls,element('div','native-geometry__board'));views.append(slot);
    const legend=spec.objects.filter(o=>o.view===config.id&&o.type==='function').map(o=>o.label).join(' · ');if(legend)slot.append(element('p','native-geometry__legend',legend));return slot;
  });
  const formulae=element('div','native-geometry__formulae');for(const latex of spec.formulae){const formula=element('span','');renderMath(latex,formula);formulae.append(formula);}if(spec.formulae.length)host.append(formulae);
  return slots;
}
export const getGeometryInstance=host=>instances.get(host);
export const activeGeometryCount=()=>instances.size;
export function disposeGeometry(host){
  const state=instances.get(host);if(!state)return;
  state.cancelled=true;for(const scene of state.scenes)scene.releasePointer?.();state.events.abort();state.observer?.disconnect();
  for(const scene of state.scenes)state.JXG.JSXGraph.freeBoard(scene.board);
  instances.delete(host);host.replaceChildren();delete host.dataset.geometryReady;
}
export function disposeDetachedGeometry(){for(const host of instances.keys())if(!host.isConnected)disposeGeometry(host);}
export function resizeGeometry(host){const state=instances.get(host);if(!state||state.cancelled)return;
  for(const {board,plot}of state.scenes)if(plot.clientWidth>0&&plot.clientHeight>0)board.resizeContainer(plot.clientWidth,plot.clientHeight,true);
}

function drawObjects(spec,config,scene){
  const {board,view}=scene,spatial=spec.dimension===3,model=geometryModel(spec),points=new Map(),objects=new Map();
  const create=(type,args,attrs)=>spatial?view.create(type+'3d',args,attrs):board.create(type,args,attrs);
  const fixed={fixed:true,highlight:false};
  const style=o=>({...fixed,strokeColor:palette[o.color],strokeWidth:2,fillColor:palette[o.color],fillOpacity:.07,dash:o.dashed?2:0,name:'',withLabel:false});
  for(const o of spec.objects.filter(o=>o.view===config.id&&o.type==='point')){
    const point=create('point',o.coords,{...style(o),visible:o.visible,size:2.5,name:o.label,withLabel:!!o.label&&o.visible,
      label:{fontSize:14,display:'internal',parse:false,useMathJax:false,offset:[7,9],strokeColor:'#183559'}});
    points.set(o.id,point);objects.set(o.id,point);
  }
  const label=(o,position)=>{if(!o.label)return;
    // Plain source labels only: never let JSXGraph parse imported JessieCode/HTML.
    if(spatial){const projected=()=>view.project3DTo2D(position);board.create('text',[()=>projected()[1]+.12,()=>projected()[2]+.16,o.label],{...fixed,parse:false,display:'internal',fontSize:14,strokeColor:palette[o.color]});}
    else board.create('text',[position[0]+.06,position[1]+.12,o.label],{...fixed,parse:false,display:'internal',fontSize:14,strokeColor:palette[o.color]});
  };
  for(const o of spec.objects.filter(o=>o.view===config.id&&o.type!=='point')){
    let drawn;const attrs=style(o);
    if(['vector','segment','line','ray'].includes(o.type)){
      const type=spatial?'line':o.type==='vector'?'arrow':o.type==='ray'?'line':o.type;
      drawn=create(type,[points.get(o.from),points.get(o.to)],{...attrs,straightFirst:o.type==='line',straightLast:['line','ray'].includes(o.type),lastArrow:o.type==='vector'?{type:2,size:6}:false});
      label(o,scale(add(model.point(o.from),model.point(o.to)),.5));
    }else if(o.type==='polygon'){
      drawn=create('polygon',o.vertices.map(id=>points.get(id)),{...attrs,vertices:{visible:false},borders:{strokeColor:palette[o.color],strokeWidth:1.5,highlight:false}});
    }else if(o.type==='plane'){
      drawn=create('plane',[points.get(o.origin),o.u,o.v,o.extent.slice(0,2),o.extent.slice(2)],{...attrs,type:'wireframe',mesh3d:{visible:false},gradient:'none',strokeWidth:1,fillOpacity:.06});
      label(o,add(model.point(o.origin),add(scale(o.u,o.extent[1]*.65),scale(o.v,o.extent[3]*.65))));
    }else if(o.type==='circle'){
      drawn=create('circle',spatial?[points.get(o.center),[...o.normal],o.radius]:[points.get(o.center),o.radius],{...attrs,fillOpacity:0});
    }else if(o.type==='sphere'){
      drawn=create('sphere',[points.get(o.center),o.radius],{...attrs,fillOpacity:.035,mesh:{visible:false}});
    }else if(o.type==='cone'){
      const center=model.point(o.center),apex=model.point(o.apex),axis=sub(apex,center),unit=scale(axis,1/magnitude(axis));
      const first=cross(unit,Math.abs(unit[0])<.8?[1,0,0]:[0,1,0]),u=scale(first,1/magnitude(first)),v=cross(unit,u);
      create('circle',[points.get(o.center),[...unit],o.radius],{...attrs,fillOpacity:0});
      // Exact parametric right circular cone. Sampling is solely the native
      // display mesh, not an extracted picture or guessed mathematical surface.
      const coordinate=i=>(angle,t)=>apex[i]*(1-t)+t*(center[i]+o.radius*(u[i]*Math.cos(angle)+v[i]*Math.sin(angle)));
      drawn=view.create('parametricsurface3d',[coordinate(0),coordinate(1),coordinate(2),[0,2*Math.PI],[0,1]],{...attrs,stepsU:18,stepsV:2,strokeWidth:1,strokeOpacity:.45});
    }else if(o.type==='annotation'){
      label(o,model.point(o.at));
    }else if(o.type==='function'){
      const fn=compileExpression(o.expression,o.parameters),number=n=>n==='-inf'?-Infinity:n==='inf'?Infinity:n;
      const start=()=>Math.max(number(o.domain.min)+(o.domain.minIncluded?0:1e-8),board.getBoundingBox()[0]);
      const end=()=>Math.min(number(o.domain.max)-(o.domain.maxIncluded?0:1e-8),board.getBoundingBox()[2]);
      const evaluate=x=>x>=start()&&x<=end()?fn(x):NaN;
      drawn=board.create('functiongraph',[evaluate,start,end],{...attrs,strokeWidth:2.5,numberPointsHigh:300,numberPointsLow:100});
      scene.curves.push({id:o.id,evaluate,domain:o.domain});
    }
    objects.set(o.id,drawn);
  }
  scene.objects=objects;
}

function initializeScene(state,spec,config,slot){
  const spatial=spec.dimension===3,controls=element('div','native-geometry__controls'),plot=element('div','native-geometry__board');
  plot.id='bienedu-geometry-'+(++sequence);plot.tabIndex=0;plot.setAttribute('role','group');plot.setAttribute('aria-label',config.title+'. Phím mũi tên để xoay hoặc di chuyển; Home để đặt lại.');
  slot.append(element('h4','native-geometry__view-title',config.title),controls,plot);
  let box=spatial?[-5,4.5,5,-4.5]:[config.bounds[0][0],config.bounds[1][1],config.bounds[0][1],config.bounds[1][0]];
  const board=state.JXG.JSXGraph.initBoard(plot.id,{boundingbox:box,axis:false,grid:false,keepaspectratio:!spatial,showCopyright:false,showNavigation:false,renderer:'svg',resize:{enabled:false},
    pan:{enabled:!spatial,needShift:false,needTwoFingers:true},zoom:{enabled:!spatial,wheel:false,pinch:true},keyboard:{enabled:false}});
  // Record immediately so even a constructor error frees the board.
  const scene={board,plot,view:null,curves:[],camera:config.camera?{...config.camera}:null};state.scenes.push(scene);
  if(spatial){
    const camera=config.camera;
    scene.view=board.create('view3d',[[-4,-3.5],[8,7],config.bounds],{projection:camera.projection,axesPosition:'center',
      axes3d:{visible:config.axes},xAxis:{visible:config.axes,name:'x',withLabel:config.axes,label:{fontSize:14,display:'internal',parse:false}},yAxis:{visible:config.axes,name:'y',withLabel:config.axes,label:{fontSize:14,display:'internal',parse:false}},zAxis:{visible:config.axes,name:'z',withLabel:config.axes,label:{fontSize:14,display:'internal',parse:false}},
      xPlaneRear:{visible:false},yPlaneRear:{visible:false},zPlaneRear:{visible:false},trackball:{enabled:false},
      az:{slider:{start:camera.azimuth,visible:false},pointer:{enabled:false},keyboard:{enabled:false}},el:{slider:{start:camera.elevation,min:-1.3,max:1.3,visible:false},pointer:{enabled:false},keyboard:{enabled:false}},bank:{slider:{visible:false},pointer:{enabled:false},keyboard:{enabled:false}}});
    scene.view.setView(camera.azimuth,camera.elevation);
  }else if(config.axes){
    const axes={strokeColor:'#71819b',strokeWidth:1,highlight:false,fixed:true,ticks:{minorTicks:0,minTicksDistance:60,drawLabels:true,label:{fontSize:13,display:'internal',parse:false}}};
    board.create('axis',[[0,0],[1,0]],axes);board.create('axis',[[0,0],[0,1]],axes);
  }
  board.suspendUpdate();drawObjects(spec,config,scene);board.unsuspendUpdate();
  const fitSpatial=()=>{
    // Fit mathematical object extents, not PDF pixels or empty 3D padding.
    const model=geometryModel(spec),support=spec.objects.filter(o=>o.view===config.id&&o.type==='point').map(o=>o.coords);
    if(config.axes){support.push([0,0,0]);for(let axis=0;axis<3;axis++){const end=[0,0,0];end[axis]=config.bounds[axis][1];support.push(end);}}
    for(const object of spec.objects.filter(o=>o.view===config.id)){
      if(object.type==='plane')for(const u of object.extent.slice(0,2))for(const v of object.extent.slice(2))support.push(add(model.point(object.origin),add(scale(object.u,u),scale(object.v,v))));
      if(['circle','sphere','cone'].includes(object.type)){const c=model.point(object.center),r=object.radius;for(const x of [-r,r])for(const y of [-r,r])for(const z of [-r,r])support.push(add(c,[x,y,z]));}
    }
    const projected=support.map(point=>scene.view.project3DTo2D(point)),xs=projected.map(p=>p[1]),ys=projected.map(p=>p[2]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),px=Math.max(.3,(x1-x0)*.15),py=Math.max(.3,(y1-y0)*.13);
    box=[x0-px,y1+py,x1+px,y0-py];board.setBoundingBox(box,false);
  };
  if(spatial)fitSpatial();
  const reset=()=>{if(spatial){scene.camera={...config.camera};scene.view.setView(config.camera.azimuth,config.camera.elevation);fitSpatial();}else board.setBoundingBox(box,true);scene.zoom=1;};
  const move=(dx,dy)=>{
    if(spatial){const turn=2*Math.PI;scene.camera.azimuth=((scene.camera.azimuth+dx)%turn+turn)%turn;scene.camera.elevation=Math.max(-1.3,Math.min(1.3,scene.camera.elevation+dy));scene.view.setView(scene.camera.azimuth,scene.camera.elevation);fitSpatial();}
    else{const b=board.getBoundingBox(),x=(b[2]-b[0])*dx,y=(b[1]-b[3])*dy;board.setBoundingBox([b[0]+x,b[1]+y,b[2]+x,b[3]+y],true);}
  };
  const zoom=inside=>{scene.zoom=Math.max(.5,Math.min(2.5,(scene.zoom??1)*(inside?1.15:1/1.15)));if(inside)board.zoomIn();else board.zoomOut();};
  const button=(text,name,action)=>{const b=element('button','',text);b.type='button';b.setAttribute('aria-label',name);b.addEventListener('click',action,{signal:state.events.signal});controls.append(b);return b;};
  button('+','Phóng to',()=>zoom(true));button('−','Thu nhỏ',()=>zoom(false));button('Đặt lại','Đặt lại góc nhìn',reset);
  if(spatial){button('←','Xoay trái',()=>move(-.15,0));button('→','Xoay phải',()=>move(.15,0));button('↑','Xoay lên',()=>move(0,.12));button('↓','Xoay xuống',()=>move(0,-.12));
    // Touch rotation is explicit opt-in. Default board remains vertically scrollable.
    let drag=null;
    const finishDrag=()=>{const previous=drag;drag=null;if(previous&&plot.hasPointerCapture(previous.id))plot.releasePointerCapture(previous.id);};
    scene.releasePointer=finishDrag;
    const toggle=button('Kéo để xoay','Bật kéo để xoay hình',()=>{
      const enabled=toggle.getAttribute('aria-pressed')!=='true';toggle.setAttribute('aria-pressed',String(enabled));plot.classList.toggle('is-rotating',enabled);
      if(!enabled)finishDrag();
    });toggle.setAttribute('aria-pressed','false');
    // The board's hit-testing can claim a pointer before View3D receives it.
    // Opt-in capture therefore drives the public camera API directly, while
    // all native az/el pointer handlers stay disabled (no competing rotation).
    plot.addEventListener('pointerdown',event=>{
      if(toggle.getAttribute('aria-pressed')!=='true'||event.button>0||event.isPrimary===false||drag)return;
      event.preventDefault();event.stopImmediatePropagation();drag={id:event.pointerId,x:event.clientX,y:event.clientY};plot.setPointerCapture(event.pointerId);
    },{capture:true,signal:state.events.signal});
    plot.addEventListener('pointermove',event=>{
      if(!drag||drag.id!==event.pointerId)return;event.preventDefault();event.stopImmediatePropagation();
      const dx=(event.clientX-drag.x)/plot.clientWidth*3,dy=(event.clientY-drag.y)/plot.clientHeight*2;
      drag.x=event.clientX;drag.y=event.clientY;move(dx,-dy);
    },{capture:true,signal:state.events.signal});
    const finish=event=>{if(drag?.id===event.pointerId)finishDrag();};
    for(const name of ['pointerup','pointercancel','lostpointercapture'])plot.addEventListener(name,finish,{capture:true,signal:state.events.signal});
  }
  plot.addEventListener('keydown',event=>{const actions={ArrowLeft:()=>move(-.15,0),ArrowRight:()=>move(.15,0),ArrowUp:()=>move(0,.12),ArrowDown:()=>move(0,-.12),Home:reset,'+':()=>zoom(true),'=':()=>zoom(true),'-':()=>zoom(false)};
    if(actions[event.key]){event.preventDefault();event.stopPropagation();actions[event.key]();}
  },{signal:state.events.signal});
  // JSXGraph sets touch-action:none by default; override AFTER initialization.
  plot.style.touchAction='pan-y';
  const legend=spec.objects.filter(o=>o.view===config.id&&o.type==='function').map(o=>o.label).join(' · ');
  if(legend)slot.append(element('p','native-geometry__legend',legend));
  scene.reset=reset;scene.move=move;
}

export function renderGeometry(spec,host){
  const check=validateGeometrySpec(spec);if(!check.valid)return Promise.reject(Error(check.errors.join('; ')));
  const signature=JSON.stringify(spec),previous=instances.get(host);if(previous?.signature===signature)return previous.ready;
  disposeGeometry(host);
  const state={spec,signature,scenes:[],events:new AbortController(),cancelled:false,ready:null};instances.set(host,state);
  host.classList.add('native-geometry');host.dataset.geometryId=spec.id;host.dataset.geometryReady='loading';
  const slots=reserveGeometry(spec,host);
  state.ready=(async()=>{try{
    state.JXG=await loadGraphLibrary();if(state.cancelled)return null;
    for(const [index,config]of spec.views.entries()){slots[index].replaceChildren();initializeScene(state,spec,config,slots[index]);}
    state.observer=new ResizeObserver(()=>resizeGeometry(host));state.observer.observe(host);resizeGeometry(host);host.dataset.geometryReady='true';return state;
  }catch(error){disposeGeometry(host);host.dataset.geometryReady='error';host.append(element('p','native-geometry__error','Hình chưa thể hiển thị. Nội dung bài đọc được giữ nguyên.'));throw error;}})();
  return state.ready;
}
export const mountGeometry=renderGeometry;
