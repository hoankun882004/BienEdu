// Synthetic engineering cases, never sourced/published as BienEdu lessons.
const interval=(min,max,minIncluded=false,maxIncluded=false)=>({min,max,minIncluded,maxIncluded});
const full=[interval('-inf','inf')];
const b=(expression,domain=full,exclusions=[])=>({expression,latex:'f(x)',domain,exclusions});
export const graphFixtures = [
  {id:'reciprocal',branches:[b('1/x',full,[0])],invalid:[0],values:[[1,1],[-1,-1]],curveCount:2},
  {id:'shifted-pole',branches:[b('1/(x-1)',full,[1])],invalid:[1],values:[[0,-1],[2,1]],curveCount:2},
  {id:'radical',branches:[b('sqrt(4-x^2)',[interval(-2,2,true,true)])],invalid:[-2.01,2.01],values:[[-2,0],[0,2],[2,0]],curveCount:1},
  {id:'logarithm',branches:[b('ln(x)',[interval(0,'inf')])],invalid:[-1,0],values:[[1,0]],curveCount:1},
  {id:'polynomial',branches:[b('x^3-3*x')],invalid:[],values:[[-1,2],[1,-2]],curveCount:1},
  {id:'piecewise',branches:[b('x',[interval('-inf',0)]),b('x+1',[interval(0,'inf',true,false)])],invalid:[],values:[[0,1]],curveCount:2,
    points:[{x:0,y:0,closed:false,label:'(0;0)'},{x:0,y:1,closed:true,label:'(0;1)'}]},
  {id:'removable-hole',branches:[b('(x^2-1)/(x-1)',full,[1])],invalid:[1],values:[[0,1],[2,3]],curveCount:2,
    points:[{x:1,y:2,closed:false,label:'(1;2)'}]},
  {id:'trigonometric',branches:[b('sin(x)')],invalid:[],values:[[0,0]],curveCount:1}
].map((fixture)=>({...fixture,spec:{schemaVersion:'bienedu.graph.v1',type:'function-2d',id:fixture.id,description:`Technical fixture: ${fixture.id}`,
  source:{sourceId:'technical-fixture',recordId:fixture.id,sha256:'0'.repeat(64),page:1},verification:{status:'technical-fixture'},
  viewport:{xMin:-3,xMax:3,yMin:-4,yMax:4},parameters:{},branches:fixture.branches,points:fixture.points??[],asymptotes:[]}}));
