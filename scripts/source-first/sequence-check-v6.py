"""Independent exact arithmetic for the ten source-linked sequence examples."""
import json
import sympy as s
n=s.Symbol('n',integer=True,positive=True)
cases=[(2*n+1,5,s.Integer(11)),(n*(n-3),4,s.Integer(4)),((n+1)/(2*n-1),3,s.Rational(4,5)),
       ((-1)**n/n,6,s.Rational(1,6)),(2**(n-1),8,s.Integer(128)),(-s.sqrt(n)+s.sqrt(n+1),3,2-s.sqrt(3)),
       ((n+1)/n,10,s.Rational(11,10)),(n*(n+1)/2,7,s.Integer(28))]
checks=[{'recordId':f'17.1-source-example-{i+1}','passed':s.simplify(f.subs(n,k)-expected)==0,'value':str(expected),'index':k}for i,(f,k,expected)in enumerate(cases)]
u=s.Integer(2);values=[]
for _ in range(3):u=3*u-1;values.append(u)
checks.append({'recordId':'17.1-source-example-9','passed':values==[5,14,41],'values':[str(v)for v in values]})
checks.append({'recordId':'17.1-source-example-10','passed':s.solve(3*n-2-25,n)==[9],'index':9})
print(json.dumps({'engine':'sympy','version':s.__version__,'checks':checks,'humanApproval':False}))
if not all(c['passed'] for c in checks):raise SystemExit(1)
