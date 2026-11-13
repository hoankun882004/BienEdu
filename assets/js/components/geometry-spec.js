// Geometry is a separate versioned contract, not executable imported content.
import {parseExpression,compileExpression} from './graph-expression.js';
import {validateMath} from './canonical-math.js';
export const GEOMETRY_VERSION='bienedu.geometry.v1';
export const add=(a,b)=>a.map((v,i)=>v+b[i]);
export const sub=(a,b)=>a.map((v,i)=>v-b[i]);
export const scale=(a,t)=>a.map(v=>v*t);
export const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const magnitude=a=>Math.sqrt(dot(a,a));
const near=(a,b)=>Math.abs(a-b)<1e-8;
const vec3=a=>[...a,...Array(3-a.length).fill(0)];
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1e6;
const id=x=>typeof x==='string'&&/^[A-Za-z][A-Za-z0-9_.-]{0,140}$/u.test(x);
const text=x=>typeof x==='string'&&x.length>0&&x.length<=2000&&!/[\u0000]/u.test(x)&&!/<[A-Za-z!/]/u.test(x);
function keys(value,allowed){if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)throw Error('Plain geometry object required');for(const key of Object.keys(value))if(!allowed.includes(key))throw Error('Unknown geometry field: '+key);}
export const OBJECT_FIELDS=Object.freeze({
  point:['coords','visible'],vector:['from','to'],segment:['from','to'],line:['from','to'],ray:['from','to'],
  plane:['origin','u','v','extent'],polygon:['vertices'],circle:['center','radius','normal'],sphere:['center','radius'],
  cone:['apex','center','radius'],function:['expression','domain','parameters'],annotation:['at']
});
const RELATIONS=Object.freeze({
  vectorSum:['first','second','result'],midpoint:['point','a','b'],centroid:['point','vertices'],
  parallel:['a','b'],perpendicular:['a','b'],pointOnLine:['point','line'],pointOnPlane:['point','plane'],
  pointOnRound:['point','round'],planeNormal:['plane','vector'],reflection:['point','image','plane'],
  length:['a','b','value'],ratio:['first','second','value'],linearPoint:['origin','direction','point','parameter'],
  power:['point','a','b','center','radius'],tangent:['round','external','contact'],
  area:['polygon','value'],minimum:['curve','x','value'],coneRightSection:['cone'],
  linePlaneIntersection:['line','plane','point']
});

export function geometryModel(spec){
  const objects=new Map(spec.objects.map(o=>[o.id,o]));
  const object=key=>{const o=objects.get(key);if(!o)throw Error('Unknown geometry reference: '+key);return o;};
  const point=key=>{const o=object(key);if(o.type!=='point')throw Error('Point reference required');return vec3(o.coords);};
  const direction=key=>{const o=object(key);if(!['line','ray','segment','vector'].includes(o.type))throw Error('Direction reference required');return sub(point(o.to),point(o.from));};
  const plane=key=>{const o=object(key);if(o.type!=='plane')throw Error('Plane reference required');return {origin:point(o.origin),normal:cross(vec3(o.u),vec3(o.v))};};
  return {objects,object,point,direction,plane};
}

export function checkGeometryProperties(spec){
  const m=geometryModel(spec),p=m.point,d=m.direction;
  const same=(a,b)=>magnitude(sub(a,b))<1e-8;
  return spec.relationships.map((r,index)=>{
    let valid=false,detail='';
    try{
      if(r.type==='vectorSum')valid=same(add(d(r.first),d(r.second)),d(r.result));
      if(r.type==='midpoint')valid=same(p(r.point),scale(add(p(r.a),p(r.b)),.5));
      if(r.type==='centroid')valid=same(p(r.point),scale(r.vertices.map(p).reduce(add,[0,0,0]),1/r.vertices.length));
      if(r.type==='parallel')valid=magnitude(cross(d(r.a),d(r.b)))<1e-8;
      if(r.type==='perpendicular')valid=near(dot(d(r.a),d(r.b)),0);
      if(r.type==='pointOnLine')valid=magnitude(cross(sub(p(r.point),p(m.object(r.line).from)),d(r.line)))<1e-8;
      if(r.type==='pointOnPlane'){const plane=m.plane(r.plane);valid=near(dot(sub(p(r.point),plane.origin),plane.normal),0);}
      if(r.type==='planeNormal')valid=magnitude(cross(m.plane(r.plane).normal,d(r.vector)))<1e-8;
      if(r.type==='pointOnRound'){const round=m.object(r.round),delta=sub(p(r.point),p(round.center));valid=near(magnitude(delta),round.radius)&&!(round.type==='circle'&&spec.dimension===3&&!near(dot(delta,round.normal),0));}
      if(r.type==='reflection'){const plane=m.plane(r.plane),v=sub(p(r.point),plane.origin);valid=same(p(r.image),sub(p(r.point),scale(plane.normal,2*dot(v,plane.normal)/dot(plane.normal,plane.normal))));}
      if(r.type==='length')valid=near(magnitude(sub(p(r.a),p(r.b))),r.value);
      if(r.type==='ratio')valid=near(magnitude(d(r.first)),r.value*magnitude(d(r.second)));
      if(r.type==='linearPoint')valid=same(p(r.point),add(p(r.origin),scale(d(r.direction),r.parameter)));
      if(r.type==='power')valid=near(dot(sub(p(r.a),p(r.point)),sub(p(r.b),p(r.point))),dot(sub(p(r.point),p(r.center)),sub(p(r.point),p(r.center)))-r.radius**2);
      if(r.type==='tangent'){const round=m.object(r.round),radial=sub(p(r.contact),p(round.center));valid=near(magnitude(radial),round.radius)&&near(dot(radial,sub(p(r.external),p(r.contact))),0);}
      if(r.type==='area'){const vertices=m.object(r.polygon).vertices.map(p);let area=[0,0,0];for(let i=1;i<vertices.length-1;i++)area=add(area,cross(sub(vertices[i],vertices[0]),sub(vertices[i+1],vertices[0])));valid=near(magnitude(area)/2,r.value);}
      if(r.type==='minimum'){const f=m.object(r.curve),fn=compileExpression(f.expression,f.parameters);valid=near(fn(r.x),r.value)&&fn(r.x-.01)>r.value&&fn(r.x+.01)>r.value;detail='Numeric runtime sanity check; exact minimum is proved offline in SymPy';}
      if(r.type==='coneRightSection'){const cone=m.object(r.cone);valid=magnitude(sub(p(cone.apex),p(cone.center)))>0&&cone.radius>0;detail='Axis and base normal define an exact right circular cone; no measured source angle is inferred';}
      if(r.type==='linePlaneIntersection'){const plane=m.plane(r.plane),line=m.object(r.line);valid=near(dot(sub(p(r.point),plane.origin),plane.normal),0)&&magnitude(cross(sub(p(r.point),p(line.from)),d(r.line)))<1e-8&&Math.abs(dot(d(r.line),plane.normal))>1e-8;}
    }catch(error){detail=error.message;}
    return {index,type:r.type,valid,detail};
  });
}

export function validateGeometrySpec(spec,{requireVerified=true}={}){
  const errors=[];
  try{
    keys(spec,['schemaVersion','id','recordId','classification','dimension','source','realization','description','views','objects','relationships','formulae','validation','unresolvedConditions','renderer','units']);
    if(spec.schemaVersion!==GEOMETRY_VERSION||!id(spec.id)||!text(spec.recordId))throw Error('Invalid geometry identity/version');
    if(spec.renderer!=='jsxgraph'||spec.units!==null)throw Error('This cohort requires JSXGraph and has no source-declared measurement unit');
    if(!['GEOMETRY_2D','GEOMETRY_3D','FUNCTION_GRAPH','VECTOR_DIAGRAM','COORDINATE_SYSTEM','SPATIAL_FIGURE'].includes(spec.classification)||![2,3].includes(spec.dimension))throw Error('Unsupported geometry classification');
    keys(spec.source,['sourceId','sha256','page','rect','blockId','glyphHash']);
    if(!id(spec.source.sourceId)||!/^([A-F0-9]{64})$/u.test(spec.source.sha256)||!/^([A-F0-9]{64})$/u.test(spec.source.glyphHash)||!Number.isInteger(spec.source.page)||spec.source.page<1||spec.source.page>2000||!text(spec.source.blockId))throw Error('Missing exact PDF evidence');
    if(!Array.isArray(spec.source.rect)||spec.source.rect.length!==4||!spec.source.rect.every(finite)||spec.source.rect[0]>=spec.source.rect[2]||spec.source.rect[1]>=spec.source.rect[3])throw Error('Invalid source rectangle');
    keys(spec.realization,['kind','freeChoices','notice']);
    if(!['source-determined','constrained-schematic'].includes(spec.realization.kind)||!Array.isArray(spec.realization.freeChoices)||!spec.realization.freeChoices.every(text)||!text(spec.realization.notice)||!text(spec.description))throw Error('Missing honest realization/text alternative');
    if(spec.realization.kind==='constrained-schematic'&&!spec.realization.freeChoices.length)throw Error('Undeclared schematic coordinates');
    if(!Array.isArray(spec.unresolvedConditions)||spec.unresolvedConditions.length)throw Error('Unresolved geometric conditions');
    if(!Array.isArray(spec.views)||!spec.views.length||spec.views.length>2)throw Error('Invalid views');
    const views=new Set();
    for(const view of spec.views){keys(view,['id','bounds','camera','axes','title']);if(!id(view.id)||views.has(view.id)||!text(view.title))throw Error('Invalid view ID');views.add(view.id);
      if(!Array.isArray(view.bounds)||view.bounds.length!==spec.dimension||view.bounds.some(b=>!Array.isArray(b)||b.length!==2||!b.every(finite)||b[0]>=b[1]))throw Error('Invalid coordinate bounds');
      if(typeof view.axes!=='boolean')throw Error('Axes setting required');
      if(spec.dimension===3){keys(view.camera,['azimuth','elevation','projection']);if(!finite(view.camera.azimuth)||!finite(view.camera.elevation)||Math.abs(view.camera.elevation)>1.5||view.camera.projection!=='parallel')throw Error('Invalid camera');}
    }
    if(!Array.isArray(spec.objects)||!spec.objects.length||spec.objects.length>160)throw Error('Invalid object count');
    const identities=new Set();
    for(const o of spec.objects){if(!Object.hasOwn(OBJECT_FIELDS,o.type))throw Error('Unsupported geometry object');keys(o,['id','type','label','view','color','dashed',...OBJECT_FIELDS[o.type]]);
      if(!id(o.id)||identities.has(o.id)||!views.has(o.view)||!['blue','amber','muted','teal'].includes(o.color)||!text(o.label||' ')||o.label?.includes('\\'))throw Error('Unsafe object metadata');identities.add(o.id);
      if(o.dashed!==undefined&&typeof o.dashed!=='boolean')throw Error('Invalid line style');
      const coords=v=>Array.isArray(v)&&v.length===spec.dimension&&v.every(finite);
      if(o.type==='point'&&(!coords(o.coords)||typeof o.visible!=='boolean'))throw Error('Invalid point coordinates');
      if(o.type==='plane'&&(!coords(o.u)||!coords(o.v)||magnitude(cross(vec3(o.u),vec3(o.v)))<1e-8||!Array.isArray(o.extent)||o.extent.length!==4||!o.extent.every(finite)||o.extent[0]>=o.extent[1]||o.extent[2]>=o.extent[3]))throw Error('Degenerate plane');
      if(['circle','sphere','cone'].includes(o.type)&&(!finite(o.radius)||o.radius<=0))throw Error('Invalid radius');
      if(o.type==='circle'&&spec.dimension===3&&(!coords(o.normal)||magnitude(o.normal)<1e-8))throw Error('Circle normal required');
      if(o.type==='polygon'&&(!Array.isArray(o.vertices)||o.vertices.length<3||o.vertices.length>24))throw Error('Invalid polygon');
      if(o.type==='function'){parseExpression(o.expression,o.parameters??{});const dom=o.domain;keys(dom,['min','max','minIncluded','maxIncluded']);const number=n=>n==='-inf'?-Infinity:n==='inf'?Infinity:n;
        if(spec.dimension!==2||!['min','max'].every(k=>finite(dom[k])||['-inf','inf'].includes(dom[k]))||number(dom.min)>=number(dom.max)||typeof dom.minIncluded!=='boolean'||typeof dom.maxIncluded!=='boolean'||(!finite(dom.min)&&dom.minIncluded)||(!finite(dom.max)&&dom.maxIncluded))throw Error('Invalid function domain');}
      if(['sphere','cone','plane'].includes(o.type)&&spec.dimension!==3)throw Error('Spatial object in a 2D spec');
    }
    const m=geometryModel(spec);
    for(const o of spec.objects){
      const references=['from','to','center','apex','origin','at'].filter(k=>o[k]).map(k=>o[k]).concat(o.vertices??[]);
      for(const reference of references){m.point(reference);if(m.object(reference).view!==o.view)throw Error('Cross-view object reference');}
      if(['segment','line','ray','vector'].includes(o.type)){if(magnitude(m.direction(o.id))<1e-8)throw Error('Degenerate line/vector');}
      if(o.type==='plane')m.point(o.origin);
      if(o.type==='polygon'){const p=o.vertices.map(m.point);if(magnitude(cross(sub(p[1],p[0]),sub(p[2],p[0])))<1e-8)throw Error('Degenerate polygon');const n=cross(sub(p[1],p[0]),sub(p[2],p[0]));if(p.some(v=>Math.abs(dot(sub(v,p[0]),n))>1e-8))throw Error('Nonplanar polygon');}
      if(['sphere','circle','cone'].includes(o.type))m.point(o.center);
      if(o.type==='cone'&&magnitude(sub(m.point(o.apex),m.point(o.center)))<1e-8)throw Error('Degenerate cone');
    }
    if(!Array.isArray(spec.relationships)||!spec.relationships.length||spec.relationships.length>100)throw Error('Missing mathematical constraints');
    for(const r of spec.relationships){if(!Object.hasOwn(RELATIONS,r.type))throw Error('Unsupported relationship');keys(r,['type',...RELATIONS[r.type]]);for(const key of RELATIONS[r.type]){const value=r[key];if(['value','parameter','radius','x'].includes(key)){if(!finite(value))throw Error('Invalid constraint number');}else if(key==='vertices'){if(!Array.isArray(value)||value.length<2||value.length>24)throw Error('Invalid relation vertices');value.forEach(m.point);}else m.object(value);}}
    const checks=checkGeometryProperties(spec);if(checks.some(c=>!c.valid))throw Error('Geometry constraints failed: '+checks.filter(c=>!c.valid).map(c=>c.type).join(', '));
    if(!Array.isArray(spec.formulae)||spec.formulae.length>12||!spec.formulae.every(x=>text(x)&&validateMath(x).valid))throw Error('Invalid source formula labels');
    keys(spec.validation,['status','evidenceHash']);
    if(requireVerified&&(spec.validation?.status!=='passed'||!/^([A-F0-9]{64})$/u.test(spec.validation?.evidenceHash??'')))throw Error('Offline validation required');
  }catch(error){errors.push(error.message);}
  return {valid:errors.length===0,errors};
}
