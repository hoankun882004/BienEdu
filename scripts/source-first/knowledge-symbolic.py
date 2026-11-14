"""Independent algebraic checks for the inspected CD01 derivative collection.
These verify identities on their stated differentiability domains, not a new
claim that all extracted source expressions or limit definitions were proved.
"""
import json
import sympy as s
x=s.symbols('x',positive=True)
a=s.symbols('a',positive=True)
b,c,d,n,alpha=s.symbols('b c d n alpha',real=True)
u=s.Function('u',positive=True)(x)
v=s.Function('v',positive=True)(x)
f=s.Function('f')
du,dv=s.diff(u,x),s.diff(v,x)
checks=[
 ('constant',s.diff(c,x),0),
 ('power',s.diff(x**n,x),n*x**(n-1)),
 ('sum',s.diff(u+v,x),du+dv),
 ('product',s.diff(u*v,x),du*v+u*dv),
 ('quotient',s.diff(u/v,x),(du*v-u*dv)/v**2),
 ('chain',s.diff(f(u),x),s.Subs(s.Derivative(f(s.Symbol('t')),s.Symbol('t')),s.Symbol('t'),u)*du),
 ('radical-positive-domain',s.diff(s.sqrt(u),x),du/(2*s.sqrt(u))),
 ('sin',s.diff(s.sin(u),x),du*s.cos(u)),
 ('cos',s.diff(s.cos(u),x),-du*s.sin(u)),
 ('tan',s.diff(s.tan(u),x),du/s.cos(u)**2),
 ('cot',s.diff(s.cot(u),x),-du/s.sin(u)**2),
 ('exp',s.diff(s.exp(u),x),du*s.exp(u)),
 ('exponential-base-positive-not-one',s.diff(a**u,x),du*a**u*s.log(a)),
 ('log-positive-domain',s.diff(s.log(u),x),du/u),
 ('log-base-positive-not-one',s.diff(s.log(u)/s.log(a),x),du/(u*s.log(a))),
 ('real-power-positive-domain',s.diff(u**alpha,x),alpha*u**(alpha-1)*du),
 ('rational-nonzero-denominator',s.diff((a*x+b)/(c*x+d),x),(a*d-b*c)/(c*x+d)**2)
]
results=[{'name':name,'passed':s.simplify(s.trigsimp(left-right))==0}for name,left,right in checks]
assert all(c['passed']for c in results)
print(json.dumps({'engine':'SymPy '+s.__version__,'passed':len(results),'failed':0,'source':'cd01-cd07-functions, page 4',
    'conditions':'On source-stated differentiability domains; u>0 for sqrt/log/real powers, denominators nonzero, a>0 and a!=1 for log base.',
    'checks':results,'limitDefinitionProved':False,'editorialApproval':False}))
