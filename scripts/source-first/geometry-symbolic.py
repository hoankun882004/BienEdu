"""Exact, offline SymPy validation of constrained realizations; no string eval."""
import json
import sys
import sympy as s
from sympy.calculus.util import continuous_domain
x=s.Symbol('x',real=True)

def scalar(n):
    if not isinstance(n,(int,float)) or isinstance(n,bool) or abs(n)>10**6:
        raise ValueError('Unsupported scalar')
    return s.Rational(str(n))

def ast(n):
    op=n['op']
    if op=='number':return scalar(n['value'])
    if op=='variable':return x
    if op=='positive':return ast(n['arg'])
    if op=='negate':return -ast(n['arg'])
    funcs={'sqrt':s.sqrt,'ln':s.log,'exp':s.exp,'sin':s.sin,'cos':s.cos,'tan':s.tan,'abs':s.Abs}
    if op in funcs:return funcs[op](ast(n['arg']))
    a,b=ast(n['left']),ast(n['right'])
    if op=='+':return a+b
    if op=='-':return a-b
    if op=='*':return a*b
    if op=='/':return a/b
    if op=='^':return a**b
    raise ValueError('Unsupported AST')

def verify(job):
    spec=job['spec'];objects={o['id']:o for o in spec['objects']}
    def point(k):
        c=objects[k]['coords'];return s.Matrix([scalar(n) for n in c]+[s.Integer(0)]*(3-len(c)))
    def direction(k):
        o=objects[k];return point(o['to'])-point(o['from'])
    def plane(k):
        o=objects[k];return point(o['origin']),s.Matrix([scalar(v) for v in o['u']]).cross(s.Matrix([scalar(v) for v in o['v']]))
    def zero(v):return all(s.simplify(n)==0 for n in v) if isinstance(v,s.MatrixBase) else s.simplify(v)==0
    checks=[]
    for index,r in enumerate(spec['relationships']):
        t=r['type'];ok=False
        if t=='vectorSum':ok=zero(direction(r['first'])+direction(r['second'])-direction(r['result']))
        elif t=='midpoint':ok=zero(2*point(r['point'])-point(r['a'])-point(r['b']))
        elif t=='centroid':ok=zero(len(r['vertices'])*point(r['point'])-sum((point(k) for k in r['vertices']),s.zeros(3,1)))
        elif t=='parallel':ok=zero(direction(r['a']).cross(direction(r['b'])))
        elif t=='perpendicular':ok=zero(direction(r['a']).dot(direction(r['b'])))
        elif t=='pointOnLine':ok=zero((point(r['point'])-point(objects[r['line']]['from'])).cross(direction(r['line'])))
        elif t=='pointOnPlane':
            origin,normal=plane(r['plane']);ok=zero((point(r['point'])-origin).dot(normal))
        elif t=='planeNormal':ok=zero(plane(r['plane'])[1].cross(direction(r['vector'])))
        elif t=='pointOnRound':
            round=objects[r['round']];v=point(r['point'])-point(round['center']);ok=zero(v.dot(v)-scalar(round['radius'])**2)
            if round['type']=='circle' and spec['dimension']==3:ok=ok and zero(v.dot(s.Matrix(round['normal'])))
        elif t=='reflection':
            origin,normal=plane(r['plane']);v=point(r['point'])-origin;ok=zero(point(r['image'])-point(r['point'])+2*normal*v.dot(normal)/normal.dot(normal))
        elif t=='length':
            v=point(r['a'])-point(r['b']);ok=zero(v.dot(v)-scalar(r['value'])**2)
        elif t=='ratio':
            a,b=direction(r['first']),direction(r['second']);ok=zero(a.dot(a)-scalar(r['value'])**2*b.dot(b))
        elif t=='linearPoint':ok=zero(point(r['point'])-point(r['origin'])-scalar(r['parameter'])*direction(r['direction']))
        elif t=='power':
            v=point(r['point'])-point(r['center']);ok=zero((point(r['a'])-point(r['point'])).dot(point(r['b'])-point(r['point']))-v.dot(v)+scalar(r['radius'])**2)
        elif t=='tangent':
            round=objects[r['round']];v=point(r['contact'])-point(round['center']);ok=zero(v.dot(v)-scalar(round['radius'])**2) and zero(v.dot(point(r['external'])-point(r['contact'])))
        elif t=='area':
            vertices=[point(k) for k in objects[r['polygon']]['vertices']];area=sum(((vertices[i]-vertices[0]).cross(vertices[i+1]-vertices[0]) for i in range(1,len(vertices)-1)),s.zeros(3,1));ok=zero(area.dot(area)-4*scalar(r['value'])**2)
        elif t=='minimum':
            f=ast(job['asts'][r['curve']]);value=scalar(r['x']);ok=zero(s.diff(f,x).subs(x,value)) and s.diff(f,x,2)>0 and zero(f.subs(x,value)-scalar(r['value']))
        elif t=='coneRightSection':
            cone=objects[r['cone']];v=point(cone['apex'])-point(cone['center']);height=s.sqrt(v.dot(v));radius=scalar(cone['radius']);ok=height>0 and radius>0 and zero(height*s.tan(s.atan(radius/height))-radius)
        elif t=='linePlaneIntersection':
            origin,normal=plane(r['plane']);ok=zero((point(r['point'])-origin).dot(normal)) and zero((point(r['point'])-point(objects[r['line']]['from'])).cross(direction(r['line']))) and not zero(direction(r['line']).dot(normal))
        checks.append({'index':index,'type':t,'passed':bool(ok)})
    for o in spec['objects']:
        if o['type']=='polygon':
            vertices=[point(k) for k in o['vertices']];normal=(vertices[1]-vertices[0]).cross(vertices[2]-vertices[0]);checks.append({'type':'polygon-planarity','id':o['id'],'passed':not zero(normal) and all(zero((p-vertices[0]).dot(normal)) for p in vertices)})
        if o['type']=='function':
            expression=ast(job['asts'][o['id']]);domain=continuous_domain(expression,x,s.S.Reals)
            expected=s.Interval.open(0,s.oo) if o['domain']['min']==0 else s.S.Reals
            checks.append({'type':'function-domain','id':o['id'],'passed':domain==expected,'actual':str(domain)})
            if o['id'] in ['expRise','expFall','logRise','logFall']:
                sample=0 if o['id'].startswith('exp') else 1
                expected_value=1 if sample==0 else 0
                checks.append({'type':'declared-function-value','id':o['id'],'passed':zero(expression.subs(x,sample)-expected_value)})
    return {'id':spec['id'],'inputHash':job['inputHash'],'passed':all(c['passed'] for c in checks),'checks':checks,
            'scope':'Exact validation of source-determined geometry or explicitly free constrained realization; not recovery of unspecified numerical measurements.'}

results=[verify(job) for job in json.load(sys.stdin)]
print(json.dumps({'engine':'sympy','version':s.__version__,'results':results}))
if not all(r['passed'] for r in results):sys.exit(1)
