"""Reuse the existing bounded non-evaluating SymPy grammar.

Source structure, algebraic consistency and editorial approval stay distinct.
An equation need not be an identity: a failed equality is contextual evidence,
never permission to rewrite the source.
"""
import importlib.util
from pathlib import Path
import json
import sys
import re
import sympy as s

spec=importlib.util.spec_from_file_location('existing_symbolic',Path(__file__).with_name('symbolic-check.py'))
old=importlib.util.module_from_spec(spec);spec.loader.exec_module(old)

def run(jobs):
    checks=[];unsupported=0
    for job in jobs:
        integral=re.fullmatch(r'\\int\s+(.+)dx=(.+)\+C[.]?',job['latex'])
        if integral:
            try:
                f,F=old.Parser(integral[1]),old.Parser(integral[2]);integrand,primitive=f.parse(),F.parse()
                if s.count_ops(integrand)+s.count_ops(primitive)>80:raise old.Unsupported('Operation bound')
                difference=s.simplify(s.diff(primitive,old.X)-integrand)
                checks.append({'id':job['id'],'latex':job['latex'],'scope':'antiderivative derivative identity only; source intervals retained, domains reported',
                    'status':'passed' if difference==0 else 'context-review','difference':str(difference),
                    'integrandDomain':str(f.domain(integrand)),'primitiveDomain':str(F.domain(primitive)),
                    'humanApproval':False})
                continue
            except (old.Unsupported,ValueError,TypeError,NotImplementedError,s.PolynomialError):
                unsupported+=1
                continue
        terms=job['latex'].split('=')
        for left,right in zip(terms,terms[1:]):
            try:
                a,b=old.Parser(left).parse(),old.Parser(right).parse()
                if s.count_ops(a)+s.count_ops(b)>80:
                    raise old.Unsupported('Bounded operation count')
                if a.free_symbols or b.free_symbols:
                    # Polynomial identities only; x=2 is a constraint, not an
                    # assertion that x and 2 are equal for all real numbers.
                    if not (a.is_polynomial(old.X) and b.is_polynomial(old.X)):
                        raise old.Unsupported('Non-polynomial identity context')
                    if a==old.X or b==old.X:
                        raise old.Unsupported('Equation/assignment context')
                    difference=s.Poly(s.expand(a-b),old.X)
                    if difference.degree()>6:
                        raise old.Unsupported('Degree bound')
                    passed=difference.is_zero
                    scope='polynomial identity or equation context; source domain conditions retained separately'
                else:
                    passed=s.simplify(a-b)==0
                    scope='exact numeric equality, including supported fractions/roots'
                checks.append({'id':job['id'],'latex':job['latex'],'scope':scope,
                               'status':'passed' if passed else 'equation-context' if a.free_symbols or b.free_symbols else 'context-review',
                               'left':str(a),'right':str(b),'humanApproval':False})
            except (old.Unsupported,ValueError,TypeError,NotImplementedError,ZeroDivisionError,s.PolynomialError):
                unsupported+=1
    return {'engine':'sympy','version':s.__version__,'checks':checks,
            'unsupportedPairs':unsupported,'humanApproval':False,
            'limitation':'Not a proof of every source solution; contextual equalities never auto-corrected.'}

if __name__=='__main__':
    print(json.dumps(run(json.load(sys.stdin)),ensure_ascii=False))
