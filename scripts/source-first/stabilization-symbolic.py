"""Source-pinned high-risk identities; positive radicands and nonzero denominators.
No claim of source fidelity follows from these algebraic checks alone.
"""
import sympy as s,json
a,b=s.symbols('a b',positive=True)
n=s.symbols('n',positive=True,integer=True)
x=s.symbols('x',positive=True)
checks={
 'indexed-root-vs-rational-power':s.real_root(s.Integer(64),3)==s.Integer(64)**s.Rational(1,3),
 'product-indexed-root':s.simplify((a*b)**(1/n)-a**(1/n)*b**(1/n))==0,
 'quotient-indexed-root':s.simplify((a/b)**(1/n)-a**(1/n)/b**(1/n))==0,
 'nested-root':s.simplify((a**(1/n))**(s.Rational(1,3))-a**(1/(3*n)))==0,
 'old-square-root-power-is-wrong':s.sqrt(64)**3!=s.real_root(64,3),
 'sequence-source-example':2*5+1==11,
 'trigonometry-table':s.simplify(s.sin(s.pi/4)-s.sqrt(2)/2)==0,
 'logarithmic-change-of-base':s.simplify(s.log(x,b)-s.log(x)/s.log(b))==0,
 'source-antiderivative':s.simplify(s.diff(s.log(x),x)-1/x)==0}
assert all(checks.values()),checks
print(json.dumps({'engine':'SymPy '+s.__version__,'passed':len(checks),'failed':0,'checks':checks,'conditions':'a,b,x>0; b!=1 for log; n positive integer; source conditions remain in text'}))
