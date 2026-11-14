"""Independent supported identity checks, NOT a full-source approval claim."""
import json
import sympy as s

x=s.symbols('x',real=True)
a,b=s.symbols('a b',real=True)
F=s.Function('F')(x)
G=s.Function('G')(x)
u=s.Function('u')(x)
checks={
    'source-linearity-differentiation':s.simplify(s.diff(a*F+b*G,x)-a*s.diff(F,x)-b*s.diff(G,x))==0,
    'source-logarithmic-differential-positive-argument':s.simplify(s.diff(s.log(u),x)-s.diff(u,x)/u)==0,
    'source-exponential-chain-differential':s.simplify(s.diff(s.exp(u),x)-s.diff(u,x)*s.exp(u))==0,
    'source-trigonometric-chain-differential':s.simplify(s.diff(s.sin(u),x)-s.diff(u,x)*s.cos(u))==0,
}
assert all(checks.values())
print(json.dumps({'engine':'SymPy '+s.__version__,'passed':sum(checks.values()),'failed':0,'checks':checks,
    'scope':'Four supported identities in source calculus material; does not verify every imported formula, domain, or transcript.'}))
