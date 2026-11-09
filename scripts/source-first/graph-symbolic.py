"""Offline symbolic checks consume a bounded AST, never eval/sympify imported strings."""
import json
import sys
import sympy as s
from sympy.calculus.util import continuous_domain

x = s.Symbol('x', real=True)
functions = {"sqrt": s.sqrt, "ln": s.log, "exp": s.exp, "sin": s.sin, "cos": s.cos, "tan": s.tan, "abs": s.Abs}
def expr(n):
    op = n['op']
    if op == 'number': return s.Rational(str(n['value']))
    if op == 'variable': return x
    if op == 'positive': return expr(n['arg'])
    if op == 'negate': return -expr(n['arg'])
    if op in functions: return functions[op](expr(n['arg']))
    a, b = expr(n['left']), expr(n['right'])
    return {'+': lambda: a+b, '-': lambda: a-b, '*': lambda: a*b, '/': lambda: a/b, '^': lambda: a**b}[op]()

def check(job):
    f, d = expr(job['ast']), expr(job['derivativeAST'])
    expected_domain = s.S.Reals if job['domainCheck'] == 'Reals' else s.S.Reals - s.FiniteSet(0) if job['domainCheck'] == 'nonzero' else s.Interval(-2, 2)
    domain = continuous_domain(f, x, s.S.Reals)
    checks = {'derivative': s.simplify(s.diff(f, x)-d) == 0, 'domain': domain == expected_domain,
              'roots': s.solveset(f, x, domain=domain) == s.FiniteSet(*[expr(a) for a in job['rootASTs']]),
              'stationary': s.solveset(s.diff(f, x), x, domain=domain) == s.FiniteSet(*[expr(a) for a in job['stationaryASTs']]),
              'samples': all(s.simplify(f.subs(x, s.Rational(str(a)))-s.Rational(str(b))) == 0 for a, b in job['samples'])}
    properties = {'function': str(f), 'domain': str(domain), 'derivative': str(s.diff(f,x)), 'roots': str(s.solveset(f,x,domain=domain))}
    for index, a in enumerate(job.get('asymptotes', [])):
        if a['type'] == 'vertical':
            left, right = s.limit(f,x,a['value'],dir='-'), s.limit(f,x,a['value'],dir='+')
            checks[f'asymptote-{index}'] = left in [s.oo,-s.oo] or right in [s.oo,-s.oo]
            properties[f'limit-{index}'] = [str(left),str(right)]
        else:
            line = a['value'] if a['type'] == 'horizontal' else a['slope']*x+a['intercept']
            limits = [s.limit(f-line,x,direction) for direction in ([-s.oo] if a.get('direction') == '-inf' else [-s.oo,s.oo])]
            checks[f'asymptote-{index}'] = all(value == 0 for value in limits)
            properties[f'limit-{index}'] = [str(v) for v in limits]
    return {'id':job['id'], 'passed':all(checks.values()), 'checks':checks, 'properties':properties}

result = {'engine':'sympy', 'version':s.__version__, 'checks':[check(job) for job in json.load(sys.stdin)]}
print(json.dumps(result))
if not all(row['passed'] for row in result['checks']): sys.exit(1)
