"""V5.6 extension; leave the hash-bound V5.5 adapter unchanged for rollback.
Reuse its bounded, non-evaluating parser and domain checks. Add only ln and
three source-printed half-lines. Simplify rational exponent *nodes*, not domains.
"""
import importlib.util
import json
import sys
from pathlib import Path
import sympy as s

spec = importlib.util.spec_from_file_location("v55", Path(__file__).with_name("symbolic-check.py"))
v55 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v55)
Base = v55.Parser
original_domain = v55.declared_domain


class Parser(Base):
    def atom(self, depth):
        if self.take(r"\ln"):
            self.nodes += 1
            if depth > 32 or self.nodes > 256 or not self.take("("):
                raise v55.Unsupported("Expected bounded parenthesized logarithm")
            value = self.add(depth+1)
            if not self.take(")"):
                raise v55.Unsupported("Unclosed logarithm")
            return s.log(value, evaluate=False)
        # Base builds fractions unevaluated to preserve denominators. Powers
        # with fractional exponents need their exponent node evaluated only.
        start = self.i
        try:
            return super().atom(depth)
        except v55.Unsupported as error:
            if str(error) != "Only small rational powers supported":
                raise
            self.i = start
            # Whitelist only the two exact source powers; no generic inference.
            for text, exponent in [("(2x+3)^{-1/2}", s.Rational(-1,2)), ("(2x+3)^{-3/2}", s.Rational(-3,2))]:
                if self.take(text):
                    return s.Pow(2*v55.X+3, exponent, evaluate=False)
            raise


def domain(text):
    return {"x<=3/2": s.Interval(-s.oo,s.Rational(3,2)), "x<3/2": s.Interval.open(-s.oo,s.Rational(3,2)),
            "x>-3/2": s.Interval.open(s.Rational(-3,2),s.oo), "x>-1/2":s.Interval.open(s.Rational(-1,2),s.oo)}.get(text) or original_domain(text)


v55.Parser, v55.declared_domain = Parser, domain


def check(job):
    if job.get("kind") != "derivative":
        return v55.check(job)
    result = {"id":job.get("id"), "status":"unsupported", "humanApproval":False}
    try:
        first, second = Parser(job["expression"]), Parser(job["expected"])
        expression, expected = first.parse(), second.parse()
        function_domain = first.domain(expression)
        actual = s.diff(expression,v55.X)
        # A derivative of ln is a rational expression, but remains defined only
        # on the original function's real domain. Never broaden that domain.
        actual_domain = s.calculus.util.continuous_domain(actual,v55.X,s.S.Reals) & function_domain
        expected_domain = second.domain(expected) & function_domain
        difference = s.simplify(actual-expected)
        domains_match = function_domain == domain(job["functionDomain"]) and actual_domain == expected_domain == domain(job["derivativeDomain"])
        value_match = True
        if job.get("valueAt") is not None:
            argument, value = s.Integer(job["valueAt"]), Parser(job["value"]).parse()
            value_match = argument in actual_domain and s.simplify(actual.subs(v55.X,argument)-value)==0
        result.update(status="passed" if difference==0 and domains_match and value_match else "conflict", difference=str(difference),
            functionDomain=str(function_domain), derivativeDomain=str(actual_domain), expectedDomain=str(expected_domain),
            domainsMatch=bool(domains_match), valueMatch=bool(value_match), symbolicIdentity=difference==0)
    except (v55.Unsupported,KeyError,NotImplementedError,ValueError,TypeError) as error:
        result["reason"]=str(error)
    return result

if __name__ == "__main__":
    jobs = json.load(sys.stdin)["jobs"]
    if not isinstance(jobs,list) or len(jobs)>64:
        raise SystemExit("Invalid bounded symbolic batch")
    print(json.dumps({"engine":"sympy", "version":s.__version__, "checks":[check(job) for job in jobs], "humanApproval":False}))
